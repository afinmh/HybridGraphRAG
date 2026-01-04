import { NextRequest, NextResponse } from "next/server";
import { extractGraphsInBatches } from "@/services/mistral.service";

const BATCH_SIZE = 5;

export async function POST(request: NextRequest) {
  try {
    const { chunks } = await request.json();

    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json(
        { error: "Invalid chunks data" },
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

    // Extract graphs in batches
    const graphs = await extractGraphsInBatches(chunks, apiKey, BATCH_SIZE);

    return NextResponse.json({
      success: true,
      graphs,
      processed: graphs.length,
      total: chunks.length,
    });
  } catch (error) {
    console.error("Error extracting graph:", error);
    return NextResponse.json(
      {
        error: "Failed to extract graph",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
