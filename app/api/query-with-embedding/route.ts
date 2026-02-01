/**
 * Query API with Client-side Embedding
 * Receives pre-computed embedding vector from client
 */

import { NextRequest, NextResponse } from "next/server";
import { extractQueryEntities, generateAnswer, translateQueryToEnglish } from "@/services/mistral.service";
import {
    vectorSearch,
    findMatchingEntities,
    findHerbsForCondition,
    getHerbCompoundsAndEffects,
    getJournalsForEmbeddings,
} from "@/repositories/search.repository";

export async function POST(request: NextRequest) {
    try {
        const {
            query,
            embedding,  // Pre-computed embedding from client
            topK = 5,
            language = 'id'
        } = await request.json();

        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return NextResponse.json(
                { error: "Query is required and must be a non-empty string" },
                { status: 400 }
            );
        }

        if (!embedding || !Array.isArray(embedding)) {
            return NextResponse.json(
                { error: "Embedding vector is required" },
                { status: 400 }
            );
        }

        console.log(`\n=== Hybrid Search: "${query}" (Lang: ${language}) ===\n`);
        console.log(`Received embedding with ${embedding.length} dimensions`);

        const apiKey = process.env.MISTRAL_API_KEY!;

        // Step 0: Translate query to English for entity extraction
        console.log("Step 0: Translating query to English...");
        const translatedQuery = await translateQueryToEnglish(query, apiKey);
        console.log(`Original: "${query}" -> Translated: "${translatedQuery}"`);

        // Step 1: Extract entities from query
        console.log("Step 1: Extracting query entities...");
        const queryEntities = await extractQueryEntities(translatedQuery, apiKey);
        console.log("Query entities:", queryEntities);

        // Step 2: Vector search using client-provided embedding
        console.log("\nStep 2: Vector search...");
        const vectorResults = await vectorSearch(embedding, topK);
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
        const herbs: any[] = [];

        for (const entity of queryEntities) {
            const matches = await findMatchingEntities(entity.name, entity.type);
            console.log(`  - Found ${matches.length} entities matching "${entity.name}" (${entity.type})`);

            if (entity.type === "SYMPTOM" || entity.type === "DISEASE") {
                const treatmentHerbs = await findHerbsForCondition(entity.name);
                console.log(`  - Found ${treatmentHerbs.length} herbs for condition "${entity.name}"`);
                herbs.push(...treatmentHerbs);
            } else if (entity.type === "PLANT") {
                const plantMatches = await findMatchingEntities(entity.name, "PLANT");
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
        const relations = await getHerbCompoundsAndEffects(herbIds);

        const compounds = relations.filter((r) => r.target?.type === "COMPOUND");
        const effects = relations.filter((r) => r.target?.type === "EFFECT");

        console.log(`Found ${compounds.length} compounds, ${effects.length} effects`);

        // Step 5: Generate answer using context
        console.log("\nStep 5: Generating answer from context...");
        const answer = await generateAnswer(
            translatedQuery,
            vectorResults,
            {
                herbs: uniqueHerbs,
                relations: relations,
            },
            apiKey,
            language
        );
        console.log(`Answer generated: ${answer.substring(0, 100)}...`);

        // Step 6: Compile results
        const summary = {
            totalChunks: vectorResults.length,
            totalHerbs: uniqueHerbs.length,
            totalCompounds: compounds.length,
            totalEffects: effects.length,
        };

        return NextResponse.json({
            success: true,
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
        });
    } catch (error) {
        console.error("Query API error:", error);
        return NextResponse.json(
            {
                error: "Failed to process query",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
