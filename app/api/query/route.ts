/**
 * Legacy Query API - redirects to query-with-embedding
 * This route is kept for backward compatibility but should not be used
 * as embedding is now done client-side
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Please use /api/query-with-embedding with client-side embedding.",
      hint: "Generate embedding on client using @xenova/transformers and send it with your query."
    },
    { status: 410 } // Gone
  );
}
