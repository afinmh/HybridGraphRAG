/**
 * Query API with Client-side Embedding
 * Pipeline (mirrors 05_hybrid_retrieval_experiment.py):
 * 0. Translate query · 1. Entity extraction · 2. MQE
 * 3. Vector + Graph retrieval · 4. Reranking · 5. Graph dedup
 * 6. Context construction · 7. Answer generation
 */

import { NextRequest, NextResponse } from "next/server";
import {
    extractQueryEntities,
    generateAnswer,
    translateQueryToEnglish,
    expandQueryMQE,
    extractEntitiesForGraphSearch,
} from "@/services/mistral.service";
import {
    vectorSearch,
    graphRelationsSearch,
    getJournalsForEmbeddings,
    type VectorSearchResult,
} from "@/repositories/search.repository";

export interface PipelineStep {
    step: number;
    name: string;
    description: string;
    status: "success" | "partial" | "skipped";
    durationMs?: number;
    // Typed payload for frontend display (no raw JSON)
    data: any;
}

export async function POST(request: NextRequest) {
    const globalStart = Date.now();
    const pipelineSteps: PipelineStep[] = [];

    try {
        const { query, embedding, topK = 15, language = "id" } = await request.json();

        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }
        if (!embedding || !Array.isArray(embedding)) {
            return NextResponse.json({ error: "Embedding vector is required" }, { status: 400 });
        }

        console.log(`\n=== Hybrid Search: "${query}" (Lang: ${language}) ===\n`);
        console.log(`Received embedding with ${embedding.length} dimensions`);

        const apiKey = process.env.MISTRAL_API_KEY!;

        // ── STEP 0: Translate ──────────────────────────────────────────────────
        let t0 = Date.now();
        console.log("Step 0: Translating query to English...");
        const translatedQuery = await translateQueryToEnglish(query, apiKey);
        console.log(`Original: "${query}" -> Translated: "${translatedQuery}"`);

        pipelineSteps.push({
            step: 0,
            name: "Query Translation",
            description: "Translate user query to English for consistent retrieval",
            status: "success",
            durationMs: Date.now() - t0,
            data: { original: query, translated: translatedQuery, language },
        });

        // ── STEP 1: Entity Extraction ──────────────────────────────────────────
        t0 = Date.now();
        console.log("Step 1: Extracting query entities...");
        const queryEntities = await extractQueryEntities(translatedQuery, apiKey);
        console.log("Query entities:", queryEntities);

        pipelineSteps.push({
            step: 1,
            name: "Entity Extraction",
            description: "Identify medical/botanical entities (PLANT, DISEASE, SYMPTOM, etc.)",
            status: queryEntities.length > 0 ? "success" : "partial",
            durationMs: Date.now() - t0,
            data: { entities: queryEntities },
        });

        // ── STEP 2: Multi-Query Expansion ─────────────────────────────────────
        t0 = Date.now();
        console.log("Step 2: Multi-Query Expansion (MQE)...");
        const expandedQueries = await expandQueryMQE(translatedQuery, apiKey);
        console.log("Expanded queries:", expandedQueries);

        pipelineSteps.push({
            step: 2,
            name: "Multi-Query Expansion (MQE)",
            description: "Generate 3 alternative search queries to maximize retrieval coverage",
            status: expandedQueries.length > 1 ? "success" : "partial",
            durationMs: Date.now() - t0,
            data: { queries: expandedQueries },
        });

        // ── STEP 3: Vector + Graph Retrieval ──────────────────────────────────
        t0 = Date.now();
        console.log("\nStep 3: Vector + Graph Search (per MQE query)...");

        const allRawDocs: VectorSearchResult[] = [];
        const allRawGraphRels: string[] = [];
        const allGraphEntities: string[] = []; // track semua entitas dari semua query
        const perQueryResults: any[] = [];

        for (const q of expandedQueries.slice(0, 3)) {
            const entry: any = { query: q, chunks: [], graphRels: [], graphEntities: [] };

            // Vector
            try {
                const qVec = await vectorSearch(embedding as number[], topK);
                allRawDocs.push(...qVec);
                entry.chunks = qVec.map((r) => ({
                    id: r.id,
                    text: (r.text ?? "").substring(0, 350),
                    similarity: Number(r.similarity ?? 0),
                    journal: r.journal?.title ?? null,
                }));
                console.log(`  [${q}] Vector: ${qVec.length} chunks`);
            } catch (e) {
                console.warn(`  [${q}] Vector failed:`, e);
            }

            // Graph
            const graphEntities = await extractEntitiesForGraphSearch(q, apiKey);
            entry.graphEntities = graphEntities;
            allGraphEntities.push(...graphEntities); // collect semua entitas
            const qRels = await graphRelationsSearch(graphEntities, "graph_sentence", 5);
            allRawGraphRels.push(...qRels);
            entry.graphRels = qRels;
            console.log(`  [${q}] Graph entities: ${graphEntities.join(", ")} → ${qRels.length} rels`);

            perQueryResults.push(entry);
        }

        const uniqueGraphEntities = [...new Set(allGraphEntities.map(e => e.toLowerCase()))];

        pipelineSteps.push({
            step: 3,
            name: "Parallel Retrieval (Vector + Graph)",
            description: "For each MQE query: vector similarity search + graph entity lookup",
            status: allRawDocs.length > 0 || allRawGraphRels.length > 0 ? "success" : "partial",
            durationMs: Date.now() - t0,
            data: {
                totalRawChunks: allRawDocs.length,
                totalRawGraphRels: allRawGraphRels.length,
                uniqueEntities: uniqueGraphEntities,
                perQuery: perQueryResults,
            },
        });

        // ── STEP 4: Vector Reranking ───────────────────────────────────────────
        t0 = Date.now();
        console.log("\nStep 4: Vector Reranking...");

        const uniqueDocsMap = new Map<string, VectorSearchResult>();
        for (const doc of allRawDocs) {
            if (!uniqueDocsMap.has(doc.id)) uniqueDocsMap.set(doc.id, doc);
        }
        const uniqueDocs = Array.from(uniqueDocsMap.values());

        const rankedDocs = uniqueDocs
            .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
            .slice(0, 12);

        // Enrich with journal metadata
        if (rankedDocs.length > 0) {
            const ids = rankedDocs.map((r) => r.id);
            const journalMap = await getJournalsForEmbeddings(ids);
            rankedDocs.forEach((r) => { r.journal = journalMap.get(r.id); });
        }

        console.log(`Reranking: ${uniqueDocs.length} unique → top ${rankedDocs.length}`);

        pipelineSteps.push({
            step: 4,
            name: "Vector Reranking",
            description: "Deduplicate & sort by similarity score, keep top-12",
            status: rankedDocs.length > 0 ? "success" : "partial",
            durationMs: Date.now() - t0,
            data: {
                inputCount: uniqueDocs.length,
                outputCount: rankedDocs.length,
                rankedChunks: rankedDocs.map((d, i) => ({
                    rank: i + 1,
                    id: d.id,
                    text: (d.text ?? "").substring(0, 350),
                    similarity: Number(d.similarity ?? 0),
                    journal: d.journal?.title ?? null,
                })),
            },
        });

        // ── STEP 5: Graph Deduplication ───────────────────────────────────────
        t0 = Date.now();
        console.log("\nStep 5: Graph Deduplication...");

        const uniqueGraphRels = [...new Set(allRawGraphRels)].slice(0, 15);
        console.log(`Graph dedup: ${allRawGraphRels.length} → ${uniqueGraphRels.length} unique`);

        pipelineSteps.push({
            step: 5,
            name: "Graph Deduplication",
            description: "Remove duplicate relations from MQE expansion, keep top-15",
            status: uniqueGraphRels.length > 0 ? "success" : "partial",
            durationMs: Date.now() - t0,
            data: {
                inputCount: allRawGraphRels.length,
                outputCount: uniqueGraphRels.length,
                relations: uniqueGraphRels,
            },
        });

        // ── STEP 6: Context Construction ──────────────────────────────────────
        t0 = Date.now();
        console.log("\nStep 6: Context Construction...");

        const graphForLLM = {
            herbs: queryEntities
                .filter((e) => e.type === "PLANT" || e.type === "SYMPTOM" || e.type === "DISEASE")
                .map((e) => ({ name: e.name })),
            relations: uniqueGraphRels.map((rel) => {
                const parts = rel.slice(0, -1).split(" ");
                const source = parts[0] || "";
                const relation = parts[1] || "relates_to";
                const target = parts.slice(2).join(" ") || "";
                return {
                    source: { name: source },
                    relation,
                    target: { name: target, type: "ENTITY" },
                };
            }),
        };

        // Build actual context that will be fed to LLM
        const vectorContextLines = rankedDocs.map(
            (d, i) =>
                `[${i + 1}] Score: ${Number(d.similarity ?? 0).toFixed(3)}${d.journal?.title ? ` | ${d.journal.title}` : ""}\n${d.text ?? ""}`
        );
        const contextText = [
            `=== VECTOR EVIDENCE (${rankedDocs.length} chunks) ===`,
            ...vectorContextLines,
            ``,
            `=== GRAPH KNOWLEDGE (${uniqueGraphRels.length} relations) ===`,
            ...uniqueGraphRels,
        ].join("\n\n");

        const uniqueJournals = [
            ...new Set(rankedDocs.filter((d) => d.journal?.title).map((d) => d.journal!.title)),
        ];

        pipelineSteps.push({
            step: 6,
            name: "Context Construction",
            description: "Assemble final LLM context from reranked chunks + deduplicated graph relations",
            status: "success",
            durationMs: Date.now() - t0,
            data: {
                vectorChunks: rankedDocs.length,
                graphRelations: uniqueGraphRels.length,
                journals: uniqueJournals,
                contextText,
            },
        });

        // ── STEP 7: Answer Generation ─────────────────────────────────────────
        t0 = Date.now();
        console.log("\nStep 7: Generating Answer...");

        const answer = await generateAnswer(
            translatedQuery,
            rankedDocs,
            graphForLLM,
            apiKey,
            language as "id" | "en"
        );
        console.log(`Answer generated: ${answer.substring(0, 100)}...`);

        pipelineSteps.push({
            step: 7,
            name: "Answer Generation",
            description: "LLM synthesizes a grounded answer from both vector and graph contexts",
            status: "success",
            durationMs: Date.now() - t0,
            data: { answerLength: answer.length, answerPreview: answer.substring(0, 200) },
        });

        // ── Final Response ────────────────────────────────────────────────────
        const compounds = graphForLLM.relations.filter((r) => r.target?.type === "COMPOUND");
        const effects = graphForLLM.relations.filter((r) => r.target?.type === "EFFECT");

        return NextResponse.json({
            success: true,
            query,
            translatedQuery,
            queryEntities,
            expandedQueries,
            vectorResults: rankedDocs,
            graphResults: {
                herbs: graphForLLM.herbs,
                compounds,
                effects,
                allRelations: graphForLLM.relations,
                rawRelationStrings: uniqueGraphRels,
            },
            contextText,
            answer,
            rawRetrievalData: perQueryResults, // Root-level for easy page access
            summary: {
                totalChunks: rankedDocs.length,
                // Unique journals dari ranked docs, fallback ke jumlah unique journal_id
                totalSources: uniqueJournals.length > 0
                    ? uniqueJournals.length
                    : new Set(rankedDocs.map(d => d.journal_id).filter(Boolean)).size || rankedDocs.length,
                totalGraphRelations: uniqueGraphRels.length,
                // Semua entitas unik yang ditemukan dari semua graph searches
                totalEntities: uniqueGraphEntities.length || queryEntities.length,
                // Legacy fields
                totalHerbs: queryEntities.filter((e) => e.type === "PLANT").length,
                totalCompounds: compounds.length,
                totalEffects: effects.length,
            },
            pipeline: pipelineSteps,
            totalDurationMs: Date.now() - globalStart,
        });
    } catch (error) {
        console.error("Query API error:", error);
        return NextResponse.json(
            {
                error: "Failed to process query",
                details: error instanceof Error ? error.message : "Unknown error",
                pipeline: pipelineSteps,
            },
            { status: 500 }
        );
    }
}
