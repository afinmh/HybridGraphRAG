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

        // Log status for debugging
        console.log("Warmup check - Mistral:", hasMistralKey, "Supabase:", hasSupabase);

        // Return ready even if some configs are missing (for development)
        // In production, you may want to return error
        if (!hasMistralKey || !hasSupabase) {
            console.warn("⚠️ Missing some environment variables, but continuing...");
        }

        return NextResponse.json({
            status: "ready",
            message: "API is ready. Embedding runs on client-side.",
            architecture: "client-side-embedding",
            config: {
                mistral: hasMistralKey,
                supabase: hasSupabase,
            }
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
