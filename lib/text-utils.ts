/**
 * Utility functions for text cleaning and processing
 */

interface TextCleaningPatterns {
  headerPattern: string;
  footerPattern: string;
}

/**
 * Clean academic text by removing headers, footers, and metadata
 */
export function cleanAcademicText(
  text: string,
  headerPattern: string,
  footerPattern: string
): string {
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

  // 2. Remove LLM-detected header pattern
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
  
  // Additional header patterns
  cleaned = cleaned.replace(/^.*?(?:Majalah|Journal|Jurnal|ISSN|Vol\.|Volume).*?$/gmi, '');
  cleaned = cleaned.replace(/^.*?(?:Traditional|Medicine|Obat|Tradisional).*?ISSN.*?$/gmi, '');
  cleaned = cleaned.replace(/^.*?p-ISSN|e-ISSN.*?$/gmi, '');
  
  // 3. Remove LLM-detected footer pattern
  if (footerPattern && footerPattern.length > 5) {
    const escapedFooter = footerPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const footerRegex = new RegExp(escapedFooter, 'gi');
    cleaned = cleaned.replace(footerRegex, '');
  }

  // 4. Remove journal footer patterns
  cleaned = cleaned.replace(/^.*?(?:Majalah|Journal|Jurnal).*?\d+\(\d+\).*?\d{4}\s*\d+\s*$/gmi, '');
  cleaned = cleaned.replace(/^.*?(?:Majalah|Journal|Jurnal).*?\d+.*?\d{4}.*?$/gmi, '');
  
  // 5. Remove common academic metadata
  cleaned = cleaned.replace(/ISSN[- ]*[pe]?\s*:?\s*\d{4}[-\s]*\d{4}/gi, '');
  cleaned = cleaned.replace(/DOI\s*:?\s*[\d.\/a-z-]+/gi, '');
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '');
  cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.[a-z]{2,}/gi, '');
  
  // 6. Remove page numbers
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*-\s*\d+\s*-\s*$/gm, '');
  cleaned = cleaned.replace(/^.*?\d{4}\s+\d{1,4}\s*$/gm, '');
  
  // 7. Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');
  
  // 8. Remove lines with mostly special characters or very short
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
        return true;
      }
      return trimmed.length >= 3;
    }
    return true;
  });
  cleaned = filteredLines.join('\n');
  
  // 9. Find and remove repeated patterns
  const lineFrequency: { [key: string]: number } = {};
  cleaned.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 150) {
      lineFrequency[trimmed] = (lineFrequency[trimmed] || 0) + 1;
    }
  });
  
  const repeatedLines = Object.keys(lineFrequency).filter(line => lineFrequency[line] >= 2);
  repeatedLines.forEach(line => {
    const regex = new RegExp('^\\s*' + line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'gm');
    cleaned = cleaned.replace(regex, '');
  });
  
  // 10. Remove CONFLICTS OF INTEREST section and everything after
  const conflictsIndex = cleaned.search(/\b(CONFLICTS?\s+OF\s+INTEREST|CONFLICT\s+OF\s+INTEREST|COMPETING\s+INTERESTS?|KONFLIK\s+KEPENTINGAN)\b/i);
  if (conflictsIndex > 0) {
    cleaned = cleaned.substring(0, conflictsIndex).trim();
  }

  // 11. Remove ACKNOWLEDGMENTS/ACKNOWLEDGEMENTS section and everything after
  const acknowledgmentsIndex = cleaned.search(/\b(ACKNOWLEDGMENTS?|ACKNOWLEDGEMENTS?|UCAPAN\s+TERIMA\s+KASIH)\b/i);
  if (acknowledgmentsIndex > 0 && acknowledgmentsIndex < cleaned.length * 0.9) {
    cleaned = cleaned.substring(0, acknowledgmentsIndex).trim();
  }

  // 12. Remove REFERENCES section and everything after
  const referencesIndex = cleaned.search(/\b(REFERENCES?|DAFTAR\s+PUSTAKA|BIBLIOGRAPHY|LITERATUR|CITATIONS?)\b/i);
  if (referencesIndex > 0 && referencesIndex < cleaned.length * 0.9) {
    // Double check by looking for numbered references pattern after this point
    const afterSection = cleaned.substring(referencesIndex);
    const hasNumberedRefs = /^\s*\d+\.\s+[A-Z]/m.test(afterSection);
    if (hasNumberedRefs || afterSection.length < cleaned.length * 0.4) {
      cleaned = cleaned.substring(0, referencesIndex).trim();
    }
  }

  // 13. Remove AUTHOR CONTRIBUTIONS and similar sections
  const authorIndex = cleaned.search(/\b(AUTHORS?\s+CONTRIBUTIONS?|KONTRIBUSI\s+PENULIS)\b/i);
  if (authorIndex > 0 && authorIndex < cleaned.length * 0.9) {
    cleaned = cleaned.substring(0, authorIndex).trim();
  }
  
  // 14. Remove figure/table captions
  cleaned = cleaned.replace(/^(Figure|Fig\.|Table|Tabel|Gambar)\s*\d+[:.].{0,200}$/gmi, '');
  
  // 15. Final cleanup
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Parse JSON with robust error handling for markdown code blocks
 */
export function parseJSONResponse(content: string): any {
  let jsonContent = content;
  
  // Remove markdown code blocks if present
  if (content.startsWith("```json")) {
    jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (content.startsWith("```")) {
    jsonContent = content.replace(/```\n?/g, "");
  }
  
  // Clean up common JSON issues
  jsonContent = jsonContent
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
    .replace(/\r/g, "") // Remove carriage returns
    .replace(/\n/g, " ") // Replace newlines with spaces
    .replace(/\t/g, " ") // Replace tabs
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
  
  // Fix common LLM JSON formatting errors
  // 1. Fix unterminated strings by finding unescaped quotes
  jsonContent = jsonContent.replace(/"([^"]*?)\n([^"]*?)"/g, '"$1 $2"');
  
  // 2. Fix single quotes to double quotes
  jsonContent = jsonContent.replace(/'/g, '"');
  
  // 3. Remove trailing commas before closing brackets
  jsonContent = jsonContent.replace(/,\s*([}\]])/g, '$1');
  
  // 4. Try to fix incomplete JSON by closing arrays/objects
  const openBraces = (jsonContent.match(/{/g) || []).length;
  const closeBraces = (jsonContent.match(/}/g) || []).length;
  const openBrackets = (jsonContent.match(/\[/g) || []).length;
  const closeBrackets = (jsonContent.match(/\]/g) || []).length;
  
  if (openBrackets > closeBrackets) {
    jsonContent += ']'.repeat(openBrackets - closeBrackets);
  }
  if (openBraces > closeBraces) {
    jsonContent += '}'.repeat(openBraces - closeBraces);
  }
  
  return JSON.parse(jsonContent);
}
