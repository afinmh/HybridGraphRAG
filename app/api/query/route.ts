import { NextRequest, NextResponse } from "next/server";
import { hybridSearch } from "@/services/query.service";

export async function POST(request: NextRequest) {
  try {
    const { query, topK = 5 } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Perform hybrid search
    const results = await hybridSearch(query.trim(), topK);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Query API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process query",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
