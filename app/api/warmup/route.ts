import { NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";

let isWarmedUp = false;
let embeddingPipeline: any = null;

/**
 * Warmup endpoint - initializes the embedding model
 * Returns the current status of the system
 */
export async function GET() {
    try {
        if (!isWarmedUp) {
            console.log("Warming up embedding model...");

            // Initialize the embedding pipeline
            embeddingPipeline = await pipeline(
                "feature-extraction",
                "Xenova/all-MiniLM-L6-v2",
                { quantized: true }
            );

            // Test the pipeline with a simple text
            await embeddingPipeline("test", { pooling: "mean", normalize: true });

            isWarmedUp = true;
            console.log("Embedding model warmed up successfully!");
        }

        return NextResponse.json({
            status: "ready",
            message: "System is online and ready",
            model: "Xenova/all-MiniLM-L6-v2",
        });
    } catch (error) {
        console.error("Warmup error:", error);
        return NextResponse.json(
            {
                status: "error",
                message: error instanceof Error ? error.message : "Failed to warmup",
            },
            { status: 500 }
        );
    }
}

// Export the pipeline for reuse
export function getWarmPipeline() {
    return embeddingPipeline;
}
