import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { extractMetadataWithLLM } from "@/services/mistral.service";
import { cleanAcademicText } from "@/lib/text-utils";

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

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "MISTRAL_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Extract text from PDF
    const bytes = await file.arrayBuffer();
    const data = await extractText(bytes);
    
    const rawText = Array.isArray(data.text) 
      ? data.text.join("\n\n") 
      : (data.text || "");
    const totalPages = data.totalPages || 0;

    // Get first 3 pages for metadata extraction
    const pages = Array.isArray(data.text) ? data.text : [data.text];
    const firstPagesText = pages.slice(0, 3).join("\n\n");
    
    // Extract metadata using Mistral LLM
    const metadata = await extractMetadataWithLLM(firstPagesText, apiKey);

    // Clean the text
    const cleanedText = cleanAcademicText(
      rawText,
      metadata.headerPattern,
      metadata.footerPattern
    );
    
    // Format output
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
