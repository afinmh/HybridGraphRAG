import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

// Tokenizer singleton (using xenova)
let tokenizer: any = null;
async function getTokenizer() {
  if (!tokenizer) {
    const { AutoTokenizer } = await import('@xenova/transformers');
    tokenizer = await AutoTokenizer.from_pretrained('BAAI/bge-small-en-v1.5');
  }
  return tokenizer;
}

// 1. Ekstraksi Metadata & Pola Header/Footer
async function extractMetadataAndPatternsAuto(pagesRaw: string[], apiKey: string) {
  const h1 = pagesRaw[0] ? pagesRaw[0].substring(0, 3000) : "";
  let hEven = "";
  if (pagesRaw.length > 1) hEven += `--- PAGE 2 (GENAP) ---\n${pagesRaw[1].substring(0, 1500)}\n`;
  if (pagesRaw.length > 3) hEven += `--- PAGE 4 (GENAP) ---\n${pagesRaw[3].substring(0, 1500)}\n`;

  let hOdd = "";
  if (pagesRaw.length > 2) hOdd += `--- PAGE 3 (GANJIL) ---\n${pagesRaw[2].substring(0, 1500)}\n`;
  if (pagesRaw.length > 4) hOdd += `--- PAGE 5 (GANJIL) ---\n${pagesRaw[4].substring(0, 1500)}\n`;

  const prompt = `
    Tugas: Ekstrak Metadata Jurnal dan Pola Header/Footer.

    INSTRUKSI METADATA (HANYA DARI PAGE 1):
    1. "title": Ekstrak judul lengkap jurnal. Bersihkan dari baris baru (\n) di tengah judul.
    2. "authors": Ekstrak semua nama penulis. Pisahkan dengan koma.
    3. "year": Cari tahun publikasi (4 digit angka).

    INSTRUKSI POLA (DARI PAGE 2-5):
    Cari teks yang selalu muncul identik di bagian atas (header) atau bawah (footer).
    Bandingkan PAGE 2 & 4 untuk pola GENAP. Bandingkan PAGE 3 & 5 untuk pola GANJIL.

    TEKS DOKUMEN:
    ${h1}
    ${hEven}
    ${hOdd}

    Format output harus JSON murni. WAJIB GUNAKAN KEY INI:
    {
      "title": "Judul Tanpa Baris Baru",
      "authors": "Penulis 1, Penulis 2",
      "year": "202X",
      "header_odd": "...",
      "footer_odd": "...",
      "header_even": "...",
      "footer_even": "..."
    }
    Jika metadata tidak ditemukan, gunakan "Unknown". Jangan berikan teks lain selain JSON.
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 detik timeout

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error("API Error");
    
    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Safety parse just in case
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(content);
  } catch (error) {
    console.error("Mistral metadata extraction failed:", error);
    return {
      title: "Unknown", authors: "Unknown", year: "Unknown",
      header_odd: null, footer_odd: null, header_even: null, footer_even: null
    };
  }
}

// Regex escape util
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 2. Text Cleaning 
function cleanAcademicText(pagesText: string[], metadata: any) {
  let cleanedFullText = "";
  const patterns = [
    metadata.header_even, metadata.footer_even,
    metadata.header_odd, metadata.footer_odd,
    metadata.headerPattern, metadata.footerPattern // Fallbacks
  ];

  const validPatterns = patterns
    .filter(p => !!p && p !== "Unknown" && typeof p === 'string' && p.trim().length > 3)
    .map(p => p.trim());

  pagesText.forEach(pText => {
    let cleanedPage = typeof pText === 'string' ? pText : '';
    
    validPatterns.forEach(pattern => {
      // Ignore figure/table as pattern
      if (/^(Figure|Fig\.|Table|Tabel)\s*\d+/i.test(pattern)) return;
      
      const parts = pattern.split('\n').map((part: string) => part.trim()).filter((part: string) => part.length > 5);
      parts.forEach((part: string) => {
        const regex = new RegExp(`^.*?${escapeRegExp(part)}.*?$`, 'gmi');
        cleanedPage = cleanedPage.replace(regex, "");
      });
    });

    // Standard Regex Cleaning
    cleanedPage = cleanedPage.replace(/^(Figure|Fig\.|Table|Tabel|Gambar)\s*\d+[:.].{0,200}$/gmi, "");
    cleanedPage = cleanedPage.replace(/DOI\s*:?\s*10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/gi, "");
    cleanedPage = cleanedPage.replace(/^\s*\d+\s*$/gm, "");

    cleanedFullText += cleanedPage.trim() + "\n\n";
  });

  // Cutting: Start from Abstract
  const startMatch = cleanedFullText.match(/\b(ABSTRACT|ABSTRAK|INTRODUCTION)\b/i);
  if (startMatch && startMatch.index !== undefined) {
    cleanedFullText = cleanedFullText.substring(startMatch.index);
  }

  // Cut off references (Lebih kejam dan tahan banting)
  // Menangkap kata REFERENCES/DAFTAR PUSTAKA diikuti titik dua atau spasi/newline
  const repRef = cleanedFullText.replace(/(?:\b|\n)(REFERENCES?|DAFTAR\s+PUSTAKA|BIBLIOGRAPHY|DAFTAR\s+REFERENSI)\b(?::|\s*\n)?[\s\S]*$/gi, '');
  if (repRef.length < cleanedFullText.length) {
    cleanedFullText = repRef;
  } else {
    // Coba potong dari angka "1." atau "[1]" yang mengikuti kata referensi
    const hardMatch = cleanedFullText.search(/(?:\n|^)\s*(REFERENCES?|DAFTAR\s+PUSTAKA)[\s\S]{0,100}?(?:1\.|\[1\])/i);
    if (hardMatch !== -1) {
       cleanedFullText = cleanedFullText.substring(0, hardMatch).trim();
    }
  }

  return cleanedFullText;
}

function getNormalizedText(text: string) {
  return text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

async function getRealTokenCount(text: string, t: any) {
  const output = await t(text, { add_special_tokens: false });
  return output.input_ids.data.length;
}

// 3. Splitting / Chunking
async function chunkByCharacters(normalizedText: string, t: any, maxTokens: number = 510) {
  const chunks = [];
  const output = await t(normalizedText, { add_special_tokens: false });
  const tokensArray = Array.from(output.input_ids.data).map(Number);
  
  for (let i = 0; i < tokensArray.length; i += maxTokens) {
    const sliceTokens = tokensArray.slice(i, i + maxTokens);
    const chunkText = t.decode(sliceTokens, { skip_special_tokens: true });
    if (chunkText.trim()) {
      chunks.push({ text: chunkText, tokens: sliceTokens.length });
    }
  }
  return chunks;
}

async function chunkByWords(normalizedText: string, t: any, maxTokens: number = 510) {
  const words = normalizedText.split(/\s+/);
  const chunks = [];
  let currentChunkWords: string[] = [];
  let currentTokens = 0;

  for (const word of words) {
    const wordWithSpace = word + " ";
    const wordTokens = await getRealTokenCount(wordWithSpace, t);

    // Fallback jika satu kata teramat panjang
    if (wordTokens > maxTokens) {
      if (currentChunkWords.length > 0) {
        chunks.push({ text: currentChunkWords.join(" "), tokens: currentTokens });
        currentChunkWords = [];
        currentTokens = 0;
      }
      
      const sOutput = await t(word, { add_special_tokens: false });
      const tokensArray = Array.from(sOutput.input_ids.data).map(Number);
      for (let j = 0; j < tokensArray.length; j += maxTokens) {
        const sliceTokens = tokensArray.slice(j, j + maxTokens);
        const stext = t.decode(sliceTokens, { skip_special_tokens: true });
        chunks.push({ text: stext, tokens: sliceTokens.length });
      }
      continue;
    }

    if (currentTokens + wordTokens <= maxTokens) {
      currentChunkWords.push(word);
      currentTokens += wordTokens;
    } else {
      chunks.push({ text: currentChunkWords.join(" "), tokens: currentTokens });
      currentChunkWords = [word];
      currentTokens = wordTokens;
    }
  }
  
  if (currentChunkWords.length > 0) {
    chunks.push({ text: currentChunkWords.join(" "), tokens: currentTokens });
  }
  return chunks;
}

async function chunkBySentences(normalizedText: string, t: any, maxTokens: number = 510) {
  const sentences = normalizedText.split(/(?<=[.!?])\s+/).map((s: string) => s.trim()).filter((s: string) => s);
  const chunks = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const sent of sentences) {
    const sentTokens = await getRealTokenCount(sent + " ", t);
    if (currentTokens + sentTokens <= maxTokens) {
      currentChunk.push(sent);
      currentTokens += sentTokens;
    } else {
      if (currentChunk.length > 0) {
        chunks.push({ text: currentChunk.join(" "), tokens: currentTokens });
      }
      currentChunk = [sent];
      currentTokens = sentTokens;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push({ text: currentChunk.join(" "), tokens: currentTokens });
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a valid PDF file" }, { status: 400 });
    }

    // Get API Key from DB / Env
    const apiKey = process.env.MISTRAL_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "Missing MISTRAL_API_KEY environment variable" }, { status: 500 });
    }

    // 1. Ekstrak PDF ke text per halaman
    const bytes = await file.arrayBuffer();
    
    // Check what is returned by unpdf
    const data = await extractText(bytes);
    
    let pagesText: string[] = [];
    if (data && Array.isArray(data.text)) {
        pagesText = data.text;
    } else if (data && typeof data.text === "string") {
        pagesText = [data.text];
    } else if (typeof data === "string") {
        pagesText = [data]; // Some unpdf version returns string directly
    }

    let pRaw = pagesText;
    // Jika tidak terbaca sebagai list halaman, kita split tiruan by newline double panjang
    if (pagesText.length === 1) {
        pRaw = pagesText[0].split(/\x0c|\f|\n\s{5,}\n/);
        if (pRaw.length === 1) {
             const manualLen = Math.floor(pagesText[0].length / 4);
             pRaw = [
               pagesText[0].substring(0, manualLen), 
               pagesText[0].substring(manualLen, manualLen*2),
               pagesText[0].substring(manualLen*2, manualLen*3),
               pagesText[0].substring(manualLen*3, manualLen*4),
               pagesText[0].substring(manualLen*4)
             ];
        }
    }


    // 2. Ekstrak Metadata
    const metadata = await extractMetadataAndPatternsAuto(pRaw, apiKey);

    // 3. Text Cleaning
    const originalText = pagesText.join("\n\n");
    const cleanedText = cleanAcademicText(pRaw, metadata);
    const normalizedText = getNormalizedText(cleanedText);

    // 4. Chunking
    const t = await getTokenizer();
    const charChunks = await chunkByCharacters(normalizedText, t);
    const wordChunks = await chunkByWords(normalizedText, t);
    const sentChunks = await chunkBySentences(normalizedText, t);

    return NextResponse.json({
        success: true,
        metadata,
        originalText,
        cleanedText,
        normalizedText,
        chunks: {
            character: charChunks,
            word: wordChunks,
            sentence: sentChunks
        }
    });

  } catch (error) {
    console.error("Preprocessing error:", error);
    return NextResponse.json(
      { error: "Failed to preprocess PDF", details: String(error) },
      { status: 500 }
    );
  }
}
