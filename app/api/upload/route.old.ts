import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

// Function to extract metadata and cleaning patterns using Mistral LLM
async function extractMetadataWithLLM(firstPagesText: string) {
  try {
    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      console.warn("MISTRAL_API_KEY not found, using fallback extraction");
      return { title: "", authors: "", year: "", headerPattern: "", footerPattern: "" };
    }

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "user",
            content: `Analyze this academic paper's first pages and extract metadata. Return ONLY a JSON object with no additional text or markdown formatting:

Text:
${firstPagesText.substring(0, 3000)}

Extract:
1. title: The full paper title
2. authors: All author names, comma-separated
3. year: Publication year (4 digits)
4. headerPattern: Text pattern that repeats at top of pages (journal name, ISSN, etc.)
5. footerPattern: Text pattern at bottom of pages (page numbers, copyright, etc.)

Return format (no markdown, no code blocks):
{"title":"...","authors":"...","year":"...","headerPattern":"...","footerPattern":"..."}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Parse JSON response, handling possible markdown code blocks
    let jsonContent = content;
    if (content.startsWith("```json")) {
      jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (content.startsWith("```")) {
      jsonContent = content.replace(/```\n?/g, "");
    }
    
    const metadata = JSON.parse(jsonContent);
    
    return {
      title: metadata.title || "",
      authors: metadata.authors || "",
      year: metadata.year || "",
      headerPattern: metadata.headerPattern || "",
      footerPattern: metadata.footerPattern || "",
    };
  } catch (error) {
    console.error("Error extracting metadata with LLM:", error);
    return { title: "", authors: "", year: "", headerPattern: "", footerPattern: "" };
  }
}

// Function to clean text using LLM-detected patterns
function cleanAcademicText(text: string, headerPattern: string, footerPattern: string): string {
  let cleaned = text;

  // 1. Find and start from Abstract section
  const abstractPatterns = [
    /\bABSTRACT\b/i,
    /\bAbstract\b/,
    /\bABSTRAK\b/i,
    /\bINTRODUCTION\b/i,
    /\bPENDAHULUAN\b/i
  ];
  
  let startIndex = -1;
  for (const pattern of abstractPatterns) {
    const match = cleaned.search(pattern);
    if (match !== -1 && (startIndex === -1 || match < startIndex)) {
      startIndex = match;
    }
  }
  
  if (startIndex > 0) {
    cleaned = cleaned.substring(startIndex);
  }

  // 2. Remove LLM-detected header pattern (more aggressive)
  if (headerPattern && headerPattern.length > 5) {
    const escapedHeader = headerPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headerRegex = new RegExp(escapedHeader, 'gi');
    cleaned = cleaned.replace(headerRegex, '');
    
    // Also remove partial matches of header
    const headerWords = headerPattern.split(/\s+/).filter(w => w.length > 4);
    headerWords.forEach(word => {
      if (word.length > 5) {
        const wordRegex = new RegExp(`^.*?${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?$`, 'gmi');
        cleaned = cleaned.replace(wordRegex, '');
      }
    });
  }
  
  // Additional header patterns (journal names, ISSN, etc.)
  cleaned = cleaned.replace(/^.*?(?:Majalah|Journal|Jurnal|ISSN|Vol\.|Volume).*?$/gmi, '');
  cleaned = cleaned.replace(/^.*?(?:Traditional|Medicine|Obat|Tradisional).*?ISSN.*?$/gmi, '');
  cleaned = cleaned.replace(/^.*?p-ISSN|e-ISSN.*?$/gmi, '');
  
  // 3. Remove LLM-detected footer pattern
  if (footerPattern && footerPattern.length > 5) {
    const escapedFooter = footerPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const footerRegex = new RegExp(escapedFooter, 'gi');
    cleaned = cleaned.replace(footerRegex, '');
  }

  // 4. Remove journal footer patterns (more aggressive)
  // Pattern: "Majalah/Journal Name, Vol(Issue), Year PageNum"
  cleaned = cleaned.replace(/^.*?(?:Majalah|Journal|Jurnal).*?\d+\(\d+\).*?\d{4}\s*\d+\s*$/gmi, '');
  cleaned = cleaned.replace(/^.*?(?:Majalah|Journal|Jurnal).*?\d+.*?\d{4}.*?$/gmi, '');
  
  // 5. Remove common academic metadata
  cleaned = cleaned.replace(/ISSN[- ]*[pe]?\s*:?\s*\d{4}[-\s]*\d{4}/gi, '');
  cleaned = cleaned.replace(/DOI\s*:?\s*[\d.\/a-z-]+/gi, '');
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '');
  cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.[a-z]{2,}/gi, '');
  
  // 6. Remove page numbers (standalone and with patterns)
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');
  cleaned = cleaned.replace(/^.*?\d{4}\s+\d{1,4}\s*$/gm, ''); // Year followed by page number
  
  // 6. Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  // 7. Remove lines with mostly special characters or very short
  const lines = cleaned.split('\n');
  const filteredLines = lines.filter((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return true;
    
    // Remove lines with pattern: journal name + numbers
    if (trimmed.match(/(?:Majalah|Journal|Jurnal).*?\d+/i)) {
      return false;
    }
    
    // Keep section headers (short but next line is long)
    if (trimmed.length < 15) {
      const nextLine = lines[index + 1];
      if (nextLine && nextLine.trim().length > 40) {
        return true; // Probably a section header
      }
      return trimmed.length >= 3;
    }
    return true;
  });
  cleaned = filteredLines.join('\n');
  
  // 8. Find and remove repeated patterns (headers/footers that appear multiple times)
  const lineFrequency: { [key: string]: number } = {};
  cleaned.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 150) {
      lineFrequency[trimmed] = (lineFrequency[trimmed] || 0) + 1;
    }
  });
  
  // Remove lines that appear 2 or more times (likely headers/footers)
  const repeatedLines = Object.keys(lineFrequency).filter(line => lineFrequency[line] >= 2);
  repeatedLines.forEach(line => {
    const regex = new RegExp('^\\s*' + line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'gm');
    cleaned = cleaned.replace(regex, '');
  });
  
  // 9. Clean up references section
  const referencesIndex = cleaned.search(/\n\s*(REFERENCES|DAFTAR PUSTAKA|Bibliography)\s*\n/i);
  if (referencesIndex > 0 && referencesIndex < cleaned.length * 0.8) {
    const beforeRefs = cleaned.substring(0, referencesIndex);
    const afterRefs = cleaned.substring(referencesIndex);
    if (afterRefs.length < cleaned.length * 0.3) {
      cleaned = beforeRefs + '\n\n[References section removed]';
    }
  }
  
  // 10. Remove figure/table captions
  cleaned = cleaned.replace(/^(Figure|Fig\.|Table|Tabel|Gambar)\s*\d+[:.].{0,200}$/gmi, '');
  
  // 11. Final cleanup
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    
    // Extract text from PDF using unpdf
    const data = await extractText(bytes);
    
    // unpdf returns text as array of pages, join them
    const rawText = Array.isArray(data.text) 
      ? data.text.join("\n\n") 
      : (data.text || "");
    const totalPages = data.totalPages || 0;

    // Get first 3 pages for LLM analysis
    const pages = Array.isArray(data.text) ? data.text : [data.text];
    const firstPagesText = pages.slice(0, 3).join("\n\n");
    
    // Extract metadata using Mistral LLM
    const metadata = await extractMetadataWithLLM(firstPagesText);

    // Clean the text using LLM-detected patterns
    const cleanedText = cleanAcademicText(rawText, metadata.headerPattern, metadata.footerPattern);
    
    // Format output with title, authors, year, and content
    const formattedText = `Judul: ${metadata.title || file.name.replace('.pdf', '')}

Penulis: ${metadata.authors || 'Unknown'}

Tahun: ${metadata.year || 'Unknown'}

Isi:
${cleanedText}`;

    return NextResponse.json({
      success: true,
      rawText,
      cleanedText: formattedText,
      pages: totalPages,
      metadata: {
        title: metadata.title || file.name.replace('.pdf', ''),
        author: metadata.authors || "Unknown",
        year: metadata.year || new Date().getFullYear().toString(),
      },
      info: {
        title: metadata.title || file.name.replace('.pdf', ''),
        author: metadata.authors || "Unknown",
        year: metadata.year || "Unknown",
        pages: totalPages,
      },
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { 
        error: "Failed to process PDF", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
