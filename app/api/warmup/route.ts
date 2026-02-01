import { NextResponse } from "next/server";
import { pipeline, env } from "@xenova/transformers";

// Force WASM backend for Edge compatibility
env.backends.onnx.wasm.numThreads = 1;

let isWarmedUp = false;
let embeddingPipeline: any = null;

// Use Edge Runtime which supports WebAssembly
export const runtime = 'edge';

/**
 * Warmup endpoint - initializes the embedding model
 * Returns the current status of the system
 */
export async function GET() {
    try {
        if (!isWarmedUp) {
            console.log("🔄 Warming up embedding model (Xenova/all-MiniLM-L6-v2)...");

            try {
                // Initialize the embedding pipeline with quantized model
                embeddingPipeline = await pipeline(
                    "feature-extraction",
                    "Xenova/all-MiniLM-L6-v2",
                    {
                        quantized: true,
                    }
                );
                console.log("✅ Embedder loaded!");
            } catch (e) {
                console.error("❌ Failed loading embedder, trying fallback...", e);
                embeddingPipeline = await pipeline(
                    "feature-extraction",
                    "sentence-transformers/all-MiniLM-L6-v2",
                    { quantized: true }
                );
                console.log("✅ Fallback embedder loaded!");
            }

            // Test the pipeline with a simple text
            await embeddingPipeline("test", { pooling: "mean", normalize: true });

            isWarmedUp = true;
            console.log("✅ Embedding model warmed up successfully!");
        }

        return NextResponse.json({
            status: "ready",
            message: "System is online and ready",
            model: "Xenova/all-MiniLM-L6-v2",
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
