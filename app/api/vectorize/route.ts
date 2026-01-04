import { NextRequest, NextResponse } from "next/server";

// Cache the pipeline to avoid reloading
let embeddingPipeline: any = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    // Dynamic import to reduce initial bundle size
    const { pipeline } = await import("@xenova/transformers");
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/bge-small-en-v1.5",
      { quantized: false }
    );
  }
  return embeddingPipeline;
}

export async function POST(request: NextRequest) {
  try {
    const { chunks } = await request.json();

    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json(
        { error: "Invalid chunks data" },
        { status: 400 }
      );
    }

    console.log(`Processing ${chunks.length} chunks for vectorization...`);

    // Get the embedding pipeline
    const extractor = await getEmbeddingPipeline();

    // Generate embeddings for all chunks
    const vectors = [];
    
    for (const chunk of chunks) {
      console.log(`Vectorizing chunk ${chunk.id}...`);
      
      // Generate embedding
      const output = await extractor(chunk.text, {
        pooling: "mean",
        normalize: true,
      });

      // Convert to array
      const embedding = Array.from(output.data);

      vectors.push({
        chunkId: chunk.id,
        vector: embedding,
        dimension: embedding.length,
      });
    }

    console.log(`Successfully vectorized ${vectors.length} chunks`);

    return NextResponse.json({
      success: true,
      vectors,
      model: "Xenova/bge-small-en-v1.5",
    });
  } catch (error) {
    console.error("Error vectorizing chunks:", error);
    return NextResponse.json(
      {
        error: "Failed to vectorize chunks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
