/**
 * Client-side Embedding Service
 * Runs @xenova/transformers in the browser using WebAssembly
 */

import { pipeline, env } from "@xenova/transformers";

// Configure for browser environment
env.useBrowserCache = true;
env.allowLocalModels = false;

let embeddingPipeline: any = null;
let isLoading = false;
let isReady = false;

/**
 * Initialize the embedding pipeline (call this on app load)
 */
export async function initEmbedding(): Promise<boolean> {
    if (isReady) return true;
    if (isLoading) {
        // Wait for existing initialization
        while (isLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return isReady;
    }

    isLoading = true;

    try {
        console.log("🔄 Loading embedding model in browser...");

        embeddingPipeline = await pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2",
            { quantized: true }
        );

        // Test the pipeline
        await embeddingPipeline("test", { pooling: "mean", normalize: true });

        isReady = true;
        console.log("✅ Embedding model loaded in browser!");
        return true;
    } catch (error) {
        console.error("❌ Failed to load embedding model:", error);
        isReady = false;
        return false;
    } finally {
        isLoading = false;
    }
}

/**
 * Generate embedding for a text query
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!isReady) {
        const success = await initEmbedding();
        if (!success) {
            throw new Error("Embedding model not available");
        }
    }

    const output = await embeddingPipeline(text, {
        pooling: "mean",
        normalize: true
    });

    return Array.from(output.data) as number[];
}

/**
 * Check if embedding is ready
 */
export function isEmbeddingReady(): boolean {
    return isReady;
}

/**
 * Check if embedding is currently loading
 */
export function isEmbeddingLoading(): boolean {
    return isLoading;
}
