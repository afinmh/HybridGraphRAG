import { NextResponse } from "next/server";
import { saveToDatabase, type SaveToDbParams } from "@/repositories/journal.repository";

export async function POST(request: Request) {
  try {
    const body = await request.json() as SaveToDbParams;
    const { metadata, fileUrl, chunks, vectors, graphs } = body;

    // Validate input
    if (!metadata) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }
    
    if (!fileUrl) {
      return NextResponse.json({ error: "Missing file URL" }, { status: 400 });
    }
    
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ error: "Missing or empty chunks" }, { status: 400 });
    }
    
    if (!vectors || vectors.length === 0) {
      return NextResponse.json({ error: "Missing or empty vectors" }, { status: 400 });
    }
    
    if (!graphs || graphs.length === 0) {
      return NextResponse.json({ error: "Missing or empty graphs" }, { status: 400 });
    }

    // Save to database
    const result = await saveToDatabase(body);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Save to DB error:", error);
    return NextResponse.json(
      { 
        error: "Failed to save to database", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
