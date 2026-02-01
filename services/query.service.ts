/**
 * Query Service - Hybrid Graph RAG search logic
 */

import { pipeline, env } from "@xenova/transformers";
import { extractQueryEntities, generateAnswer, translateQueryToEnglish, type QueryEntity } from "./mistral.service";
import {
  vectorSearch,
  findMatchingEntities,
  findHerbsForCondition,
  getHerbCompoundsAndEffects,
  getJournalsForEmbeddings,
  type VectorSearchResult,
  type GraphSearchResult,
  type GraphRelation,
} from "@/repositories/search.repository";

// Configure transformers.js for Edge/Serverless environment
env.useBrowserCache = false;
env.allowLocalModels = false;
env.useCustomCache = false;
env.cacheDir = undefined;

let embeddingPipeline: any = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    try {
      embeddingPipeline = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { quantized: true }
      );
    } catch (e) {
      console.error("Failed loading embedder, trying fallback...", e);
      embeddingPipeline = await pipeline(
        "feature-extraction",
        "sentence-transformers/all-MiniLM-L6-v2",
        { quantized: true }
      );
    }
  }
  return embeddingPipeline;
}

export interface HybridSearchResult {
  query: string;
  queryEntities: QueryEntity[];
  vectorResults: VectorSearchResult[];
  graphResults: {
    herbs: GraphSearchResult[];
    compounds: GraphRelation[];
    effects: GraphRelation[];
    allRelations: GraphRelation[];
  };
  answer: string;
  summary: {
    totalChunks: number;
    totalHerbs: number;
    totalCompounds: number;
    totalEffects: number;
  };
}

/**
 * Main hybrid search function combining vector and graph search
 */
export async function hybridSearch(
  query: string,
  topK: number = 5,
  language: 'id' | 'en' = 'id'
): Promise<HybridSearchResult> {
  console.log(`\n=== Hybrid Search: "${query}" (Lang: ${language}) ===\n`);

  const apiKey = process.env.MISTRAL_API_KEY!;

  // Step 0: Translate query to English
  console.log("Step 0: Translating query to English...");
  const translatedQuery = await translateQueryToEnglish(query, apiKey);
  console.log(`Original: "${query}" -> Translated: "${translatedQuery}"`);

  // Step 1: Extract entities from query (USE TRANSLATED QUERY)
  console.log("Step 1: Extracting query entities...");
  const queryEntities = await extractQueryEntities(translatedQuery, apiKey);
  console.log("Query entities:", queryEntities);

  // Step 2: Vector search (USE TRANSLATED QUERY)
  console.log("\nStep 2: Vector search...");
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(translatedQuery, { pooling: "mean", normalize: true });
  const queryVector = Array.from(output.data) as number[];

  const vectorResults = await vectorSearch(queryVector, topK);
  console.log(`Found ${vectorResults.length} similar chunks`);

  // Enrich vector results with journal metadata
  if (vectorResults.length > 0) {
    const embeddingIds = vectorResults.map((r) => r.id);
    const journalMap = await getJournalsForEmbeddings(embeddingIds);
    vectorResults.forEach((result) => {
      result.journal = journalMap.get(result.id);
    });
  }

  // Step 3: Graph search - find relevant herbs
  console.log("\nStep 3: Graph search for herbs...");
  const herbs: GraphSearchResult[] = [];
  const allMatchedEntities: GraphSearchResult[] = [];

  for (const entity of queryEntities) {
    // Find direct entity matches
    const matches = await findMatchingEntities(entity.name, entity.type);
    console.log(`  - Found ${matches.length} entities matching "${entity.name}" (${entity.type})`);
    allMatchedEntities.push(...matches);

    // If it's a symptom/disease, find herbs that treat it
    if (entity.type === "SYMPTOM" || entity.type === "DISEASE") {
      const treatmentHerbs = await findHerbsForCondition(entity.name);
      console.log(`  - Found ${treatmentHerbs.length} herbs for condition "${entity.name}"`);
      herbs.push(...treatmentHerbs);
    }
    // If it's a plant query, find the plant
    else if (entity.type === "PLANT") {
      const plantMatches = await findMatchingEntities(entity.name, "PLANT");
      console.log(`  - Found ${plantMatches.length} plant matches`);
      herbs.push(...plantMatches);
    }
  }

  // Remove duplicate herbs
  const uniqueHerbs = Array.from(
    new Map(herbs.map((h) => [h.id, h])).values()
  );
  console.log(`Found ${uniqueHerbs.length} herbs`);

  // Step 4: Graph expansion - get compounds and effects
  console.log("\nStep 4: Expanding graph (compounds & effects)...");
  const herbIds = uniqueHerbs.map((h) => h.id);
  console.log(`  - Herb IDs: ${herbIds.length > 0 ? herbIds.join(', ') : 'none'}`);
  const relations = await getHerbCompoundsAndEffects(herbIds);

  const compounds = relations.filter((r) => r.target?.type === "COMPOUND");
  const effects = relations.filter((r) => r.target?.type === "EFFECT");

  console.log(`Found ${compounds.length} compounds, ${effects.length} effects`);

  // Step 5: Generate answer using context
  console.log("\nStep 5: Generating answer from context...");

  // Log herb-vector cross-reference info for debugging
  const vectorText = vectorResults.map(v => v.text.toLowerCase()).join(" ");
  const confirmedHerbsDebug = uniqueHerbs.filter(h =>
    vectorText.includes(h.name.toLowerCase()) ||
    vectorText.includes(h.name.toLowerCase().split(' ')[0])
  );
  console.log(`  - Confirmed herbs (in both vector & graph): ${confirmedHerbsDebug.map(h => h.name).join(", ") || "none"}`);
  console.log(`  - Graph-only herbs: ${uniqueHerbs.filter(h => !confirmedHerbsDebug.includes(h)).map(h => h.name).join(", ") || "none"}`);

  const answer = await generateAnswer(
    translatedQuery, // Use translated query for consistency with context
    vectorResults,
    {
      herbs: uniqueHerbs,
      relations: relations,
    },
    apiKey,
    language // Pass original language preference
  );
  console.log(`Answer generated: ${answer.substring(0, 100)}...`);

  // Step 6: Compile results
  const summary = {
    totalChunks: vectorResults.length,
    totalHerbs: uniqueHerbs.length,
    totalCompounds: compounds.length,
    totalEffects: effects.length,
  };

  return {
    query,
    queryEntities,
    vectorResults,
    graphResults: {
      herbs: uniqueHerbs,
      compounds,
      effects,
      allRelations: relations,
    },
    answer,
    summary,
  };
}
