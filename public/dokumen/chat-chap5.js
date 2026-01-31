document.addEventListener('DOMContentLoaded', () => {
    const messagesContainer = document.getElementById('messages');
    const readyOverlay = document.getElementById('ready-overlay');
    const formEl = document.getElementById('form');
    const inputEl = document.getElementById('message');

    // Fungsi hapus semua chat
    function clearChat() {
        messagesContainer.innerHTML = '';
    }

    // Fungsi menambahkan pesan
    function addMessage(text, className) {
        const div = document.createElement('div');
        div.className = className;
        div.textContent = text;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Fungsi mainkan audio + Live2D motion
    function playAudio(src) {
        if (window.live2dModel) {
            window.playAudioWithMotion(window.live2dModel, src);
        } else {
            const audio = new Audio(src);
            audio.play();
        }
    }


    function playAudio2(src) {
    if (window.live2dModel && window.playAudio2) {
        window.playAudio2(window.live2dModel, src);
    } else {
        // fallback audio biasa jika Live2D belum siap
        if (!window.currentAudio || window.currentAudio.paused) {
            window.currentAudio = new Audio(src);
            window.currentAudio.play().catch(err => console.warn("Audio gagal diputar:", err));
            window.currentAudio.onended = () => { window.currentAudio = null; };
        }
    }
}

// Mainkan audio + motion tap_body_01
function playAudioHappy(src) {
    if (window.live2dModel && window.playAudioHappy) {
        window.playAudioHappy(window.live2dModel, src);
    } else {
        // fallback audio biasa jika Live2D belum siap
        if (!window.currentAudio || window.currentAudio.paused) {
            window.currentAudio = new Audio(src);
            window.currentAudio.play().catch(err => console.warn("Audio gagal diputar:", err));
            window.currentAudio.onended = () => { window.currentAudio = null; };
        }
    }
}

    // Tampilkan pilihan Ya/Tidak
    function showReadyButtons() {
        const container = document.createElement('div');
        container.id = 'ready-buttons';

        const yesBtn = document.createElement('button');
        yesBtn.textContent = 'Ya';
        yesBtn.className = 'btn-choice';
        yesBtn.addEventListener('click', () => startChapter1());

        const noBtn = document.createElement('button');
        noBtn.textContent = 'Tidak';
        noBtn.className = 'btn-choice';
        noBtn.addEventListener('click', () => {
            addMessage('Tidak apa-apa, bisa mulai nanti ya!', 'reply');
            if (readyOverlay) readyOverlay.style.display = 'none';
        });

        container.appendChild(yesBtn);
        container.appendChild(noBtn);
        messagesContainer.appendChild(container);
    }

    // Materi Chapter 5
    const materiList = [
        { id: 1, key: 'kosakata', title: 'Kosakata tentang Kantor', jsonUrl: '/scripts/chapter5/kosakata.json', rootKey: 'kosakata_kantor', audioBase: 'kosakata' },
        { id: 2, key: 'benda', title: 'Benda-benda di Kantor', jsonUrl: '/scripts/chapter5/benda.json', rootKey: 'benda_kantor', audioBase: 'benda' },
        { id: 3, key: 'aktivitas', title: 'Aktivitas di Kantor', jsonUrl: '/scripts/chapter5/aktivitas.json', rootKey: 'aktivitas_kantor', audioBase: 'aktivitas' },
        { id: 4, key: 'formal', title: 'Ungkapan Formal', jsonUrl: '/scripts/chapter5/formal.json', rootKey: 'frasa_kantor', audioBase: 'formal' },
        { id: 5, key: 'rekan', title: 'Rekan Kerja', jsonUrl: '/scripts/chapter5/rekan.json', rootKey: 'rekan_kerja', audioBase: 'rekan' },
    ];

    let progress = 0; 
    const materiProgress = [0, 0, 0, 0, 0]; 
    const materi1Played = new Set(); 
    const materi2Played = new Set(); 
    const materi3Played = new Set(); 
    const materi4Played = new Set(); 
    const materi5Played = new Set();
    const testsPassed = [false, false, false, false, false]; // status tes lulus per materi
    let testState = null; // state ujian materi (jika aktif)

    // Load saved state from localStorage (Chapter 5)
    try {
        const saved = JSON.parse(localStorage.getItem('chap5Progress') || 'null');
        if (saved && typeof saved === 'object') {
            if (Array.isArray(saved.materiProgress) && saved.materiProgress.length === 5) {
                for (let i = 0; i < 5; i++) materiProgress[i] = Math.max(0, Math.min(1, Number(saved.materiProgress[i]) || 0));
            }
            if (typeof saved.progress === 'number') progress = Math.max(progress, saved.progress);
            if (Array.isArray(saved.materi1Played)) saved.materi1Played.forEach(k => materi1Played.add(k));
            if (Array.isArray(saved.materi2Played)) saved.materi2Played.forEach(k => materi2Played.add(k));
            if (Array.isArray(saved.materi3Played)) saved.materi3Played.forEach(k => materi3Played.add(k));
            if (Array.isArray(saved.materi4Played)) saved.materi4Played.forEach(k => materi4Played.add(k));
            if (Array.isArray(saved.materi5Played)) saved.materi5Played.forEach(k => materi5Played.add(k));
            if (Array.isArray(saved.testsPassed) && saved.testsPassed.length === 5) {
                for (let i = 0; i < 5; i++) testsPassed[i] = !!saved.testsPassed[i];
            }
        }
    } catch {}

    function saveState() {
        const payload = {
            materiProgress,
            progress,
            materi1Played: Array.from(materi1Played),
            materi2Played: Array.from(materi2Played),
            materi3Played: Array.from(materi3Played),
            materi4Played: Array.from(materi4Played),
            materi5Played: Array.from(materi5Played),
            testsPassed,
        };
    try { localStorage.setItem('chap5Progress', JSON.stringify(payload)); } catch {}
    }

    function formatPercent(v) { return Math.round(v * 100); }
    function computeOverall() {
        // masing-masing materi bobot 20%
        const sum = materiProgress.reduce((a, b) => a + b, 0);
        return (sum / materiProgress.length);
    }
    // Mapper audio untuk Chapter 5 per materi
    function makeAudioMapper(audioBase) {
        return function(src) {
            const name = String(src || '').trim();
            if (!name) return '';
            if (name.startsWith('/audio/')) return name;
            return `/audio/chapter5/${audioBase}/${name}`;
        };
    }
    // startRumah akan menggunakan renderer generik di bawah

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function normalizeAnswer(s) {
        return String(s || '')
            .toLowerCase()
            .trim()
            .replace(/[.!?…]+$/g, '')
            .replace(/[\-’'‐‑–—]/g, ' ')
            .replace(/\s+/g, ' ');
    }

    function parseMeaningOptions(raw) {
        const parts = String(raw || '')
            .split(/\s*\/\s*|\s+atau\s+/i)
            .map(p => p.trim())
            .filter(Boolean);
        if (parts.length === 0) return [''];
        return parts;
    }

    function startMateriTest(groups, materiIndex) {
        if (!groups || !Array.isArray(groups)) return;
    const words = [];
    groups.forEach(g => (g.words || g.examples || []).forEach(w => words.push(w)));
        if (words.length === 0) return;

        const shuffled = shuffle(words);
        const qMeaning = shuffled.slice(0, Math.min(5, shuffled.length)).map(w => {
            const optsRaw = parseMeaningOptions(w.meaning);
            const optsNorm = optsRaw.map(o => normalizeAnswer(o));
            return {
                type: 'meaning',
                // gunakan reading/romaji
                prompt: `Apa arti "${w.reading}"?`,
                answersId: optsNorm,
                answersRaw: optsRaw,
                readingRaw: w.reading,
                w
            };
        });
        const remaining = shuffle(words.filter(w => !qMeaning.find(q => q.w === w)));
        const qJP = remaining.slice(0, Math.min(5, remaining.length)).map(w => ({
            type: 'jp',
            prompt: `Apa bahasa Jepang untuk "${w.meaning}"? (jawab dengan reading/romaji)`,
            answerRd: normalizeAnswer(w.reading),
            readingRaw: w.reading,
            w
        }));
        const questions = shuffle(qMeaning.concat(qJP));
        const total = questions.length;

        testState = {
            questions,
            total,
            index: 0,
            correct: 0,
            materiIndex,
        };

        clearChat();
    addMessage('Tes dimulai. Jawab 10 soal. Nilai kelulusan 80.', 'reply');
        if (formEl) {
            formEl.style.display = 'flex';
        }
        if (inputEl) {
            inputEl.value = '';
            inputEl.placeholder = 'Ketik jawabanmu di sini...';
            inputEl.focus();
        }
        askNextQuestion();
    }

    function askNextQuestion() {
        if (!testState) return;
        if (testState.index >= testState.total) {
            finishTest();
            return;
        }
        const q = testState.questions[testState.index];
        addMessage(`Soal ${testState.index + 1}/${testState.total}: ${q.prompt}`, 'reply');
    }

    function finishTest() {
    if (!testState) return;
        const percent = Math.round((testState.correct / testState.total) * 100);
        addMessage(`Selesai! Nilai kamu: ${percent}`, 'reply');
        // Sembunyikan input lagi saat kembali ke menu
        if (formEl) formEl.style.display = 'none';

    if (percent >= 80) {
            // Lulus: unlock materi berikutnya
            const mi = Math.max(0, Math.min(4, Number(testState.materiIndex)));
            testsPassed[mi] = true;
            progress = Math.max(progress, mi + 1);
            saveState();
            setTimeout(() => {
                addMessage('Selamat!', 'reply');
                    playAudio('/audio/chapter5/hebat.mp3');
                setTimeout(() => {
                    addMessage('Kamu berhasil menyelesaikan satu materi.', 'reply');
                    setTimeout(() => {
                        addMessage('Ayo teruskan!', 'reply');
                        if (percent === 100) {
                            addMessage('Hebat!', 'reply');
                                playAudioHappy('/audio/chapter5/hebat.mp3');
                        }
                        // Kembali ke menu materi
                        clearChat();
                        addMessage('Pilih materi:', 'reply');
                        showMateriButtons();
                    }, 1200);
                }, 1200);
            }, 800);
        } else {
            setTimeout(() => {
                addMessage('Belum lulus. Coba lagi ya!', 'reply');
                // Kembali ke menu materi
                setTimeout(() => {
                    clearChat();
                    addMessage('Pilih materi:', 'reply');
                    showMateriButtons();
                }, 1000);
            }, 800);
        }

        testState = null;
    }

    function renderOverallProgress() {
        // Hapus elemen lama
        const old = document.getElementById('overall-progress');
        if (old) old.remove();
        const wrap = document.createElement('div');
        wrap.id = 'overall-progress';
        wrap.className = 'overall-progress';
        const pct = computeOverall();
        wrap.innerHTML = `<div class="overall-title">Progress Keseluruhan</div>
            <div class="overall-bar"><div class="overall-fill" style="width:${formatPercent(pct)}%"></div></div>
            <div class="overall-text">${formatPercent(pct)}%</div>`;
        messagesContainer.appendChild(wrap);

        // If all materi 100%, add a congratulatory chat-like message once
        const allComplete = materiProgress.every(p => Math.round(p * 100) >= 100);
        const already = document.getElementById('all-done-note');
        if (allComplete && !already) {
            const note = document.createElement('div');
            note.id = 'all-done-note';
            note.className = 'reply';
            note.textContent = 'Hebat! Kamu sudah menyelesaikan semua chapter! Kerja kerasmu luar biasa, selamat ya!';
            messagesContainer.appendChild(note);
            // Putar audio selesai saat semua materi tuntas
            try {
                if (typeof playAudioHappy === 'function') {
                    playAudioHappy('/audio/chapter4/finish1.mp3');
                } else {
                    playAudio('/audio/chapter4/finish1.mp3');
                }
            } catch {}
        }
    }

    function showMateriButtons() {
        const container = document.createElement('div');
        container.id = 'materi-buttons';

        materiList.forEach((m, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn-materi';
            const pct = Math.max(0, Math.min(1, Number(materiProgress[index]) || 0));
            const pctText = `${formatPercent(pct)}%`;
            const barState = pct >= 1 ? (testsPassed[index] ? 'green' : 'yellow') : 'blue';
            btn.innerHTML = `
                <div class="materi-title">${m.id}. ${m.title}</div>
                <div class="materi-progress-wrap">
                    <div class="materi-progress-bar ${barState}" style="width:${formatPercent(pct)}%"></div>
                </div>
                <div class="materi-progress-text">${pctText}</div>
            `;
            // hanya aktif jika progres sudah sampai materi sebelumnya
            if (index > progress) btn.disabled = true;

            btn.addEventListener('click', () => {
                if (index === 0) return startRumah();
                if (index === 1) return startPerlengkapan();
                if (index === 2) return startKeluarga();
                if (index === 3) return startAktivitas();
                if (index === 4) return startKalimat();
            });

            container.appendChild(btn);
        });

        // hapus button lama jika ada
        const old = document.getElementById('materi-buttons');
        if (old) old.remove();

        messagesContainer.appendChild(container);
        // Tampilkan progress keseluruhan tepat di bawahnya
        renderOverallProgress();
    }

    // Expose minimal hooks for perkenalan.js
    window.showMateriMenu = function() {
        clearChat();
        addMessage('Pilih materi:', 'reply');
        showMateriButtons();
        renderOverallProgress();
    };
    window.reloadChap1State = function() {
        try {
            const saved = JSON.parse(localStorage.getItem('chap5Progress') || 'null');
            if (saved && typeof saved === 'object') {
                if (Array.isArray(saved.materiProgress) && saved.materiProgress.length === 5) {
                    for (let i = 0; i < 5; i++) materiProgress[i] = Math.max(0, Math.min(1, Number(saved.materiProgress[i]) || 0));
                }
                if (typeof saved.progress === 'number') progress = Math.max(0, Math.min(5, Number(saved.progress)));
                if (Array.isArray(saved.testsPassed) && saved.testsPassed.length === 5) {
                    for (let i = 0; i < 5; i++) testsPassed[i] = !!saved.testsPassed[i];
                }
            }
        } catch {}
    };

    // Form submission handler for test answers
    if (formEl) {
        formEl.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!testState) return; // ignore if not in test
            const val = inputEl ? inputEl.value : '';
            const answer = normalizeAnswer(val);
            if (!val.trim()) return;
            // tampilkan jawaban user
            addMessage(val, 'user');
            if (inputEl) inputEl.value = '';

            const q = testState.questions[testState.index];
            let correct = false;
            if (q.type === 'meaning') {
                // benar jika cocok salah satu opsi arti
                correct = Array.isArray(q.answersId) && q.answersId.includes(answer);
            } else {
                // jp: hanya terima reading/romaji
                correct = (answer === q.answerRd);
            }

            if (correct) {
                testState.correct += 1;
                addMessage('Benar!', 'reply');
                playAudioHappy('/audio/chapter5/benar.mp3');
            } else {
                const rightText = q.type === 'meaning'
                    ? (Array.isArray(q.answersRaw) && q.answersRaw.length ? q.answersRaw.join(' / ') : (q.readingRaw || ''))
                    : (q.readingRaw || (q.w && q.w.reading) || '');
                addMessage(`Salah. Jawaban: ${rightText}`, 'reply');
                playAudio('/audio/chapter5/salah.mp3');
            }

            testState.index += 1;
            setTimeout(() => askNextQuestion(), 500);
        });
    }

    // Fungsi mulai Chapter 5
function startChapter1() {
    clearChat();
    if (readyOverlay) readyOverlay.style.display = 'none';

    addMessage('Baik, saya Tatsuya!', 'reply');
    playAudioHappy('/audio/chapter5/intro.mp3');

    // jeda 2 detik
    setTimeout(() => {
        addMessage('Senang berkenalan denganmu!', 'reply');
    playAudio('/audio/chapter5/post-intro.mp3');

        // jeda 2 detik
        setTimeout(() => {
            addMessage('Saya akan membimbing kamu di kantor.', 'reply');
            playAudio2('/audio/chapter5/learn.mp3');

            // jeda 1.5 detik
            setTimeout(() => {
                addMessage('Jadi, Ayo kita mulai!', 'reply');
                playAudioHappy('/audio/chapter5/lets-start.mp3');
                // tampilkan button materi
                setTimeout(() => {
                    showMateriButtons();
                }, 1000);

            }, 3500);

        }, 2500);

    }, 3000);
}

// Generic materi renderer
async function startMateriCommon({ materiIndex, title, jsonUrl, rootKey, playedSet, audioBase }) {
    clearChat();
    if (formEl) formEl.style.display = 'none';

    let data;
    try {
        const res = await fetch(jsonUrl);
        data = await res.json();
    } catch (e) {
        addMessage('Gagal memuat data materi.', 'reply');
        return;
    }

    const groups = (data && data[rootKey]) ? data[rootKey] : [];

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<div><h3>${title}</h3><p>Tekan sebuah kata untuk mendengarkan audio.</p></div>`;
    const backBtn = document.createElement('button');
    backBtn.className = 'btn-back';
    backBtn.textContent = '← Kembali';
    backBtn.addEventListener('click', () => {
        clearChat();
        addMessage('Pilih materi:', 'reply');
        showMateriButtons();
        renderOverallProgress();
    });
    header.appendChild(backBtn);
    messagesContainer.appendChild(header);

    const totalWords = groups.reduce((acc, g) => acc + (g.words?.length || 0), 0);
    const progressRow = document.createElement('div');
    progressRow.className = 'progress-row';
    const progressWrap = document.createElement('div');
    progressWrap.className = 'progress-wrap';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    const progressText = document.createElement('div');
    progressText.className = 'progress-text';
    const testBtn = document.createElement('button');
    testBtn.className = 'btn-test';
    testBtn.textContent = 'Tes';
    testBtn.disabled = true;
    testBtn.addEventListener('click', () => startMateriTest(groups, materiIndex));
    const mapAudioPath = makeAudioMapper(audioBase || '');

    function updateMateriProgress() {
        const pct = playedSet.size / Math.max(1, totalWords);
        materiProgress[materiIndex] = pct;
        progressBar.style.width = `${formatPercent(pct)}%`;
        progressText.textContent = `${playedSet.size}/${totalWords} (${formatPercent(pct)}%)`;
        progressBar.classList.remove('ready');
        progressBar.classList.remove('passed');
        if (pct >= 1) {
            if (testsPassed[materiIndex]) {
                progressBar.classList.add('passed');
            } else {
                progressBar.classList.add('ready');
            }
            testBtn.disabled = false;
        } else {
            testBtn.disabled = true;
        }
        saveState();
    }
    updateMateriProgress();
    progressWrap.appendChild(progressBar);
    progressRow.appendChild(progressWrap);
    progressRow.appendChild(testBtn);
    messagesContainer.appendChild(progressRow);
    messagesContainer.appendChild(progressText);

    groups.forEach(group => {
        const section = document.createElement('section');
        section.className = 'word-group';
        const titleEl = document.createElement('h4');
        titleEl.textContent = group.group || 'Tanpa Nama';
        section.appendChild(titleEl);
        const grid = document.createElement('div');
        grid.className = 'word-grid';
        (group.words || []).forEach(w => {
            const btn = document.createElement('button');
            btn.className = 'btn-word';
            btn.innerHTML = `<span class="jp">${w.japan}</span><span class="rd">${w.reading}</span><span class="mn">${w.meaning}</span>`;
            const key = `${w.japan}|${w.reading}`;
            if (playedSet.has(key)) btn.classList.add('played');
            btn.addEventListener('click', () => {
                const audioSrc = mapAudioPath(w.audio || '');
                playAudio(audioSrc);
                if (!playedSet.has(key)) {
                    playedSet.add(key);
                    btn.classList.add('played');
                    updateMateriProgress();
                }
            });
            grid.appendChild(btn);
        });
        section.appendChild(grid);
        messagesContainer.appendChild(section);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function startRumah() {
    return startMateriCommon({
        materiIndex: 0,
        title: 'Kosakata tentang Kantor',
        jsonUrl: '/scripts/chapter5/kosakata.json',
        rootKey: 'kosakata_kantor',
        playedSet: materi1Played,
        audioBase: 'kosakata',
    });
}

function startPerlengkapan() {
    return startMateriCommon({
        materiIndex: 1,
        title: 'Benda-benda di Kantor',
        jsonUrl: '/scripts/chapter5/benda.json',
        rootKey: 'benda_kantor',
        playedSet: materi2Played,
        audioBase: 'benda',
    });
}

function startKeluarga() {
    return startMateriCommon({
        materiIndex: 2,
        title: 'Aktivitas di Kantor',
        jsonUrl: '/scripts/chapter5/aktivitas.json',
        rootKey: 'aktivitas_kantor',
        playedSet: materi3Played,
        audioBase: 'aktivitas',
    });
}

function startAktivitas() {
    return startMateriCommon({
        materiIndex: 3,
        title: 'Ungkapan Formal',
        jsonUrl: '/scripts/chapter5/formal.json',
        rootKey: 'frasa_kantor',
        playedSet: materi4Played,
        audioBase: 'formal',
    });
}

function startKalimat() {
    return startMateriCommon({
        materiIndex: 4,
        title: 'Rekan Kerja',
        jsonUrl: '/scripts/chapter5/rekan.json',
        rootKey: 'rekan_kerja',
        playedSet: materi5Played,
        audioBase: 'rekan',
    });
}

    // Fungsi salam otomatis sesuai waktu
    function sendGreeting() {
        const hour = new Date().getHours();
        let greetingAudio = '';
        let greetingText = '';

    if (hour >=5 && hour <11) { greetingText='Selamat pagi!'; greetingAudio='/audio/chapter5/pagi.mp3'; }
    else if (hour >=11 && hour <15) { greetingText='Selamat siang!'; greetingAudio='/audio/chapter5/siang.mp3'; }
    else if (hour >=15 && hour <18) { greetingText='Selamat sore!'; greetingAudio='/audio/chapter5/siang.mp3'; }
    else { greetingText='Selamat malam!'; greetingAudio='/audio/chapter5/malam.mp3'; }

        addMessage(greetingText, 'reply');
        playAudio(greetingAudio);

        setTimeout(() => {
            addMessage('Di Chapter 5, kita akan belajar kosakata kantor. Siap?', 'reply');
            playAudio2('/audio/chapter5/ready.mp3');
            showReadyButtons();
        }, 2500);
    }

    // Tombol Oke overlay
    const okeBtn = document.getElementById('btn-oke');
    if (okeBtn) {
        okeBtn.addEventListener('click', () => {
            if (readyOverlay) readyOverlay.style.display = 'none';
            sendGreeting();
        });
    }

    // Tombol Back ke index -> langsung ke Level Select
    const backToIndex = document.getElementById('back-to-index');
    if (backToIndex) {
        backToIndex.addEventListener('click', () => {
            try { sessionStorage.setItem('isReturning', 'true'); } catch {}
            window.location.href = '/index.html';
        });
    }

    // Tombol Reset progres
    const resetBtn = document.getElementById('reset-progress');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            const yakin = confirm('Yakin reset semua progres Chapter 5?');
            if (!yakin) return;
            try { localStorage.removeItem('chap5Progress'); } catch {}
            // reset in-memory
            for (let i = 0; i < 5; i++) materiProgress[i] = 0;
            progress = 0;
            materi1Played.clear();
            materi2Played.clear();
            materi3Played.clear();
            materi4Played.clear();
            materi5Played.clear();
            for (let i = 0; i < 5; i++) testsPassed[i] = false;
            saveState();
            // Kembali ke menu materi
            clearChat();
            addMessage('Progres direset.', 'reply');
                playAudioHappy('/audio/chapter5/intro.mp3');
            showMateriButtons();
        });
    }
});
