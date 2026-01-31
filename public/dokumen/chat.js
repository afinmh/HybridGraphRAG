// Minimal chat client with persona JSON output and robust VoiceVox flow
// NOTE: Keep API keys server-side; client calls dev proxy endpoints only.

const VOICEVOX_SPEAKER_INDEX = {
  'Chika': 24,
  'Rin': 6,
  'Tatsuya': 13,
  'Hana': 4,
  'Akira': 21,
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function selectedName() {
  const key = localStorage.getItem('model') || 'Chika';
  const map = { hiyori: 'Hana', shizuku: 'Chika', natori: 'Tatsuya', haru: 'Rin', chitose: 'Akira' };
  return map[key] || key;
}

function personaJPName(name) {
  // Basic JP name mapping for phrase usage; fallback to romaji if unknown
  const jp = {
    Chika: 'ちか',
    Rin: 'りん',
    Tatsuya: 'たつや',
    Hana: 'ひより',
    Akira: 'あきら',
  };
  return jp[name] || name;
}

function buildPrompt(userText) {
  const name = selectedName();
  const nameJP = personaJPName(name);
  // Single-string prompt, instruct concise JSON with kanji/reading/indonesia
  const instruction = `Anda adalah karakter ${name}. Jawablah selalu singkat, padat, dan sesuai kepribadian ${name}.
Format jawaban WAJIB JSON ketat, TANPA teks lain, dengan kunci persis: {"kanji":"...","reading":"...","indonesia":"..."}.
- "kanji": kalimat bahasa Jepang ditulis dengan kanji/kana lengkap (ini untuk TTS)
- "reading": bacaan hiragana penuh (tanpa romaji)
- "indonesia": terjemahan Indonesia yang ringkas
Jika pengguna menanyakan identitasmu (mis. "siapa nama kamu"), jawab: {"kanji":"私の名前は${nameJP}です","reading":"わたしのなまえは${nameJP}です","indonesia":"Namaku ${name}."}
Jangan sertakan penjelasan, emoji, atau teks di luar JSON.`;
  return `${instruction}\n\nPertanyaan pengguna: ${userText}`;
}

async function callMistralPersona(userText) {
  const prompt = buildPrompt(userText);
  let attempts = 3;
  while (attempts > 0) {
    const res = await fetch('/api/mistral/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (res.status === 429) {
      attempts -= 1;
      if (attempts <= 0) throw new Error('Mistral API 429');
      await sleep(1500 * (4 - attempts));
      continue;
    }
    if (!res.ok) throw new Error('Mistral API error');
    const data = await res.json();
    return data.reply || '';
  }
  throw new Error('Mistral API failed');
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (_) { /* noop */ }
    }
    return null;
  }
}

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function fetchJson(url, opts={}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function headUrl(url) {
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

// Live2D motion helpers (global scope so any caller can use them)
async function waitForLive2DModel(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // @ts-ignore
      if (window && window.live2dModel && window.playAudioWithMotion) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('Live2D model not ready');
}

async function playWithMotion(src) {
  try {
    // @ts-ignore
    if (window && window.live2dModel && window.playAudioWithMotion) {
      // @ts-ignore
      return window.playAudioWithMotion(window.live2dModel, src);
    }
  } catch {}
  const audio = new Audio(src);
  return audio.play();
}

let lastTtsTime = 0;
async function ttsVoiceVoxRobust(text) {
  // Throttle to avoid 429: ensure 3s between requests
  const since = Date.now() - lastTtsTime;
  if (since < 3000) {
    await sleep(3000 - since);
  }
  const name = selectedName();
  const speaker = VOICEVOX_SPEAKER_INDEX[name] ?? 24;
  const apiUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=${speaker}`;

  const MAX_POLLS = 10;
  const POLL_INTERVAL = 3000; // ms
  const EXTRA_WAIT = 2000; // ms after processing finished
  let attempts = 4; // include extra try for 429

  while (attempts > 0) {
    try {
      let data = await fetchJson(apiUrl);

      let polls = 0;
      while (data && data.isProcessing && polls < MAX_POLLS) {
        await sleep(POLL_INTERVAL);
        data = await fetchJson(apiUrl);
        polls += 1;
      }

      if (data && data.isProcessing) {
        throw new Error('Audio generation timed out after maximum polls');
      }

      await sleep(EXTRA_WAIT);
      const mp3Url = data && data.mp3DownloadUrl;
      if (!mp3Url) throw new Error('MP3 URL tidak tersedia');

      // Verify the file is downloadable; retry on 5xx/404
      try {
        await headUrl(mp3Url);
      } catch (e) {
        if (e.status === 429) { // too many requests
          attempts -= 1;
          if (attempts <= 0) throw e;
          await sleep(4000); // longer backoff for 429
          continue;
        }
        if (e.status >= 500 || e.status === 404) {
          attempts -= 1;
          if (attempts <= 0) throw e;
          await sleep(5000);
          continue;
        }
        throw e;
      }

  lastTtsTime = Date.now();
  return mp3Url;
    } catch (e) {
      if (e.status === 429) {
        attempts -= 1;
        if (attempts <= 0) throw e;
        await sleep(4000);
        continue;
      }
      if (e.status >= 500 || e.status === 404) {
        attempts -= 1;
        if (attempts <= 0) throw e;
        await sleep(5000);
        continue;
      }
      throw e;
    }
  }
  throw new Error('Gagal mendapatkan audio VoiceVox');
}

export async function sendChatAndSpeak(message) {
  // Returns { kanji, reading, indonesia } after audio played
  const raw = await callMistralPersona(message);
  const obj = safeParseJSON(raw) || { kanji: raw, reading: '', indonesia: '' };
  const kanji = obj.kanji || obj.jp || '';
  const reading = obj.reading || '';
  const indonesia = obj.indonesia || obj.indo || '';

  if (!kanji) throw new Error('Jawaban tidak valid');

  const mp3Url = await ttsVoiceVoxRobust(kanji);
  if (mp3Url) {
    try {
      await waitForLive2DModel();
      await playWithMotion(mp3Url);
    } catch (_) {
      const audio = new Audio(mp3Url);
      try { await audio.play(); } catch (_) { /* ignore autoplay errors */ }
    }
  }
  return { kanji, reading, indonesia };
}

// Optional: wire a simple form if present on page
(function bindSimpleUI(){
  const form = document.getElementById('form');
  const input = document.getElementById('message');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const messages = document.getElementById('messages');
  const readyOverlay = document.getElementById('chat-ready-overlay');
  const readyOk = document.getElementById('chat-ready-ok');
  const bgBtn = document.getElementById('change-bg');
  const bgModal = document.getElementById('bg-modal');
  const bgGrid = document.getElementById('bg-grid');
  const bgClose = document.getElementById('bg-close');
  const backBtn = document.getElementById('back-to-index');
  const backgroundImg = document.getElementById('background');
  if (!form || !input || !messages) return;

  function setLoading(loading) {
    if (input) input.disabled = loading;
    if (submitBtn) submitBtn.disabled = loading;
  }

  function scrollToBottom() {
    try { messages.scrollTop = messages.scrollHeight; } catch (_) { /* ignore */ }
  }

  function lowerName() { return (selectedName() || '').toLowerCase(); }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

  const you = document.createElement('div');
  you.className = 'user';
    you.textContent = text;
    messages.appendChild(you);
  scrollToBottom();

    input.value = '';
    setLoading(true);

    const thinking = document.createElement('div');
    thinking.className = 'thinking';
    thinking.textContent = 'Sedang berpikir…';
    messages.appendChild(thinking);
  scrollToBottom();

    try {
      const out = await sendChatAndSpeak(text);
      // Only render after audio ready
      const ai = document.createElement('div');
      ai.className = 'reply';
      // Structure: big Indonesia, small reading
      ai.innerHTML = `
        <div class="msg-indo">${escapeHtml(out.indonesia)}</div>
        <div class="msg-reading">${escapeHtml(out.reading)}</div>
      `;
      messages.appendChild(ai);
  scrollToBottom();
    } catch (err) {
      const ai = document.createElement('div');
      ai.className = 'reply';
      ai.textContent = 'Maaf, terjadi kesalahan saat memproses jawaban.';
      messages.appendChild(ai);
  scrollToBottom();
    } finally {
      if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
      setLoading(false);
    }
  });

  // Background chooser
  async function openBgModal() {
    if (!bgModal || !bgGrid) return;
    bgModal.classList.remove('hidden');
    bgGrid.innerHTML = 'Loading...';
    try {
      const res = await fetch('/api/bg/list');
      const data = await res.json();
      const files = (data.files || []);
      bgGrid.innerHTML = '';
      files.forEach((f) => {
        const btn = document.createElement('button');
        btn.className = 'bg-thumb';
        const img = document.createElement('img');
        img.src = `/assets/bg/${f}`;
        img.alt = f;
        btn.appendChild(img);
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (backgroundImg) backgroundImg.src = `/assets/bg/${f}`;
          localStorage.setItem('chatBackground', f);
          if (bgModal) bgModal.classList.add('hidden');
        });
        bgGrid.appendChild(btn);
      });
    } catch (e) {
      bgGrid.innerHTML = 'Gagal memuat daftar background';
    }
  }
  if (bgBtn) bgBtn.addEventListener('click', openBgModal);
  if (bgClose && bgModal) bgClose.addEventListener('click', () => bgModal.classList.add('hidden'));

  // Apply persisted background
  const savedBg = localStorage.getItem('chatBackground');
  if (savedBg && backgroundImg) backgroundImg.src = `/assets/bg/${savedBg}`;

  // Back button to index
  if (backBtn) backBtn.addEventListener('click', () => {
    sessionStorage.setItem('isReturning', 'true');
    window.location.href = '/';
  });
  
  // After Live2D ready, show overlay first; start greeting after OK.
  (async () => {
    try {
      await waitForLive2DModel();
      if (readyOverlay) readyOverlay.classList.remove('hidden');
    } catch {}
  })();

  if (readyOk && readyOverlay) {
    readyOk.addEventListener('click', async () => {
      try { readyOverlay.classList.add('hidden'); } catch {}
      // show input form now
      try { form.style.display = 'flex'; } catch {}
      // Start greeting
      try {
        const name = selectedName();
        try { messages.innerHTML = ''; } catch {}
        const greet = document.createElement('div');
        greet.className = 'reply';
        greet.innerHTML = `
          <div class="msg-indo">Halo, aku ${escapeHtml(name)}, mohon kerja samanya!</div>
          <div class="msg-reading"></div>`;
        messages.appendChild(greet);
        scrollToBottom();
        const audioPath = `/audio/chat/${lowerName()}.mp3`;
        try {
          await waitForLive2DModel();
          await playWithMotion(audioPath);
        } catch (_) {
          const a = new Audio(audioPath);
          try { await a.play(); } catch {}
        }
      } catch {}
    });
  }
})();
