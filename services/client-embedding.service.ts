/**
 * Client-side Embedding Service
 * Runs @huggingface/transformers in the browser using WebAssembly
 * This module should ONLY be imported on the client side
 */

let embeddingPipeline: any = null;
let isLoading = false;
let isReady = false;

/**
 * Initialize the embedding pipeline (call this on app load)
 */
export async function initEmbedding(): Promise<boolean> {
    // Only run in browser
    if (typeof window === 'undefined') {
        console.log("Skipping embedding init on server");
        return false;
    }

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

        // Dynamic import @huggingface/transformers (successor to @xenova/transformers)
        const { pipeline, env } = await import("@huggingface/transformers");

        // Configure for browser environment
        env.useBrowserCache = true;
        env.allowLocalModels = false;

        embeddingPipeline = await pipeline(
            "feature-extraction",
            "Xenova/all-MiniLM-L6-v2",
            {
                dtype: "fp32",
            }
        );

        // Test the pipeline
        const testOutput = await embeddingPipeline("test", { pooling: "mean", normalize: true });
        console.log("Test embedding dimensions:", testOutput.data.length);

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
    // Only run in browser
    if (typeof window === 'undefined') {
        throw new Error("Embedding can only be generated in browser");
    }

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
