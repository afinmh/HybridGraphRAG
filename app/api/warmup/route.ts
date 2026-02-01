import { NextResponse } from "next/server";

/**
 * Warmup endpoint - for client-side embedding architecture
 * The actual embedding is done in the browser, so this just confirms API is ready
 */
export async function GET() {
    try {
        // Check if Mistral API key is configured
        const hasMistralKey = !!process.env.MISTRAL_API_KEY;

        // Check if Supabase is configured
        const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;

        if (!hasMistralKey || !hasSupabase) {
            return NextResponse.json({
                status: "error",
                message: "Missing required environment variables",
                details: {
                    mistral: hasMistralKey,
                    supabase: hasSupabase,
                }
            }, { status: 500 });
        }

        return NextResponse.json({
            status: "ready",
            message: "API is ready. Embedding runs on client-side.",
            architecture: "client-side-embedding",
        });
    } catch (error) {
        console.error("💥 Warmup error:", error);
        return NextResponse.json(
            {
                status: "error",
                message: error instanceof Error ? error.message : "Failed to warmup",
            },
            { status: 500 }
        );
    }
}
