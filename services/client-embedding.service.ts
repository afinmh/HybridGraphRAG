/**
 * Client-side Embedding Service
 * Model: Xenova/bge-small-en-v1.5 (port of BAAI/bge-small-en-v1.5)
 *
 * MUST match the model used in Python experiment (05_hybrid_retrieval_experiment.py):
 *   model_bge = SentenceTransformer("BAAI/bge-small-en-v1.5")
 *   q_vec = model_bge.encode([q], normalize_embeddings=True)[0].tolist()
 *
 * Output: 384-dimensional normalized vector — identical embedding space as the DB.
 * Runs in-browser via @xenova/transformers (WebAssembly ONNX runtime).
 */

let embeddingPipeline: any = null;
let isLoading = false;
let isReady = false;

// ─── Model Config ─────────────────────────────────────────────────────────────
// Xenova/bge-small-en-v1.5 = HuggingFace port of BAAI/bge-small-en-v1.5
// Same model used by Python experiment → embeddings are compatible with DB vectors
const MODEL_NAME = "Xenova/bge-small-en-v1.5";
const MODEL_DIMS = 384;

/**
 * Initialize the embedding pipeline (call this on app load)
 * Downloads ~30MB quantized ONNX model on first run, then cached in browser
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
        console.log(`🔄 Loading embedding model: ${MODEL_NAME}...`);

        // Dynamic import @xenova/transformers
        // Cast to any: @xenova/transformers types don't declare .default,
        // but webpack may wrap ESM as CJS with a .default property at runtime.
        const TransformersModule = await import("@xenova/transformers") as any;
        const pipeline = TransformersModule.pipeline ?? TransformersModule.default?.pipeline;
        const env = TransformersModule.env ?? TransformersModule.default?.env;


        if (!pipeline || !env) {
            console.error("TransformersModule keys:", Object.keys(TransformersModule || {}));
            throw new Error("Could not extract pipeline and env from @xenova/transformers");
        }

        // Configure for browser environment
        env.useBrowserCache = true;
        env.allowLocalModels = false;

        embeddingPipeline = await pipeline(
            "feature-extraction",
            MODEL_NAME,
            {
                quantized: true, // Use quantized ONNX (smaller download, same quality for retrieval)
            }
        );

        // Validate dimensions match DB
        const testOutput = await embeddingPipeline("test query", {
            pooling: "mean",
            normalize: true,
        });

        const dims = testOutput.data.length;
        if (dims !== MODEL_DIMS) {
            console.warn(`⚠️ Embedding dims mismatch: got ${dims}, expected ${MODEL_DIMS}`);
        } else {
            console.log(`✅ ${MODEL_NAME} loaded — ${dims}D vectors (matches DB)`);
        }

        isReady = true;
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
 * Mirrors Python: model_bge.encode([text], normalize_embeddings=True)[0].tolist()
 *
 * BGE-small-en-v1.5 does NOT need a query prefix (unlike BGE-large).
 * pooling=mean + normalize=true → L2-normalized mean pooling = cosine-ready vectors.
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
        normalize: true,   // L2 normalize = cosine similarity ready, same as Python normalize_embeddings=True
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
