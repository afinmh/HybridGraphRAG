/**
 * Mistral LLM Service for metadata extraction and graph extraction
 */

import { parseJSONResponse } from "@/lib/text-utils";
import { Entity, Relation, filterEntity, normalizeEntityName, filterRelationsByEntities } from "@/lib/graph-utils";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-small-latest";

export interface Metadata {
  title: string;
  authors: string;
  year: string;
  headerPattern: string;
  footerPattern: string;
}

export interface GraphExtractionResult {
  chunkId: number;
  entities: Entity[];
  relations: Relation[];
}

/**
 * Extract metadata from PDF first pages using Mistral LLM
 */
export async function extractMetadataWithLLM(
  firstPagesText: string,
  apiKey: string
): Promise<Metadata> {
  try {
    if (!apiKey) {
      console.warn("MISTRAL_API_KEY not found, using fallback extraction");
      return { title: "", authors: "", year: "", headerPattern: "", footerPattern: "" };
    }

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: `Analyze this academic paper's first pages and extract metadata. Return ONLY a JSON object with no additional text or markdown formatting:

Text:
${firstPagesText.substring(0, 3000)}

Extract:
1. title: The full paper title
2. authors: All author names, comma-separated
3. year: Publication year (4 digits)
4. headerPattern: Text pattern that repeats at top of pages (journal name, ISSN, etc.)
5. footerPattern: Text pattern at bottom of pages (page numbers, copyright, etc.)

Return format (no markdown, no code blocks):
{"title":"...","authors":"...","year":"...","headerPattern":"...","footerPattern":"..."}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    const metadata = parseJSONResponse(content);

    return {
      title: metadata.title || "",
      authors: metadata.authors || "",
      year: metadata.year || "",
      headerPattern: metadata.headerPattern || "",
      footerPattern: metadata.footerPattern || "",
    };
  } catch (error) {
    console.error("Error extracting metadata with LLM:", error);
    return { title: "", authors: "", year: "", headerPattern: "", footerPattern: "" };
  }
}

/**
 * Extract entities and relations from a single chunk
 */
export async function extractGraphFromChunk(
  chunk: { id: number; text: string },
  apiKey: string
): Promise<GraphExtractionResult | null> {
  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: `Extract entities and relations focused on answering "What herb for [condition]" questions. Return ONLY a JSON object.

Text:
${chunk.text}

PRIORITY EXTRACTION:

1. PLANT entities (medicinal herbs):
   - Common names: ginger, turmeric, garlic, etc.
   - Scientific names: Zingiber officinale, Curcuma longa
   - Plant parts: ginger root, turmeric rhizome

2. DISEASE/SYMPTOM entities:
   - Diseases: diabetes, hypertension, fever, rheumatism, heartburn, cancer
   - Symptoms: headache, pain, inflammation, nausea
   
3. THERAPEUTIC RELATIONS (most important):
   - PLANT → treats/alleviates/reduces/prevents/cures → DISEASE/SYMPTOM
   - PLANT → has_effect → EFFECT (antidiabetic, anti-inflammatory, analgesic)
   
4. DOSAGE entities:
   - Dose amounts: 500mg, 2 grams, 1 teaspoon
   - Frequency: twice daily, three times a day
   
5. METHOD entities (preparation/usage):
   - Boiled, extracted, infusion, decoction
   - Oral, topical application

6. COMPOUND entities (only if therapeutically relevant):
   - Active compounds: curcumin, gingerol, allicin
   
7. EFFECT entities (therapeutic effects):
   - antidiabetic, anti-inflammatory, analgesic, antipyretic

SKIP ENTIRELY:
- Generic experimental terms: temperature, time, controlled conditions, experiment
- Laboratory methods unrelated to traditional use: chromatography, spectroscopy, analysis
- Statistical terms: p-value, significance, standard deviation
- Equipment/software names
- Pure numbers without context

RULES:
- Focus on therapeutic relationships
- Prioritize PLANT-DISEASE connections
- Include dosage and preparation methods
- Use standardized entity names
- Limit to max 12 most relevant entities

Return format (no markdown, no code blocks):
{"entities":[{"name":"...","type":"..."}],"relations":[{"source":"...","relation":"...","target":"..."}]}`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to extract graph from chunk ${chunk.id}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    try {
      const graphData = parseJSONResponse(content);

      // Filter and limit entities
      const filteredEntities = (graphData.entities || [])
        .filter(filterEntity)
        .slice(0, 15);

      // Filter relations to only include those with valid entities
      const filteredRelations = filterRelationsByEntities(
        graphData.relations || [],
        filteredEntities
      );

      return {
        chunkId: chunk.id,
        entities: filteredEntities,
        relations: filteredRelations,
      };
    } catch (parseError) {
      console.error(`JSON parse error for chunk ${chunk.id}:`, parseError);

      // Try manual extraction as fallback
      return extractGraphManually(chunk, content);
    }
  } catch (error) {
    console.error(`Error extracting graph from chunk ${chunk.id}:`, error);
    return null;
  }
}

/**
 * Fallback manual extraction using regex
 */
function extractGraphManually(
  chunk: { id: number; text: string },
  content: string
): GraphExtractionResult | null {
  try {
    const entities: Entity[] = [];
    const relations: Relation[] = [];

    // More flexible entity extraction patterns
    // Pattern 1: Standard format
    const entityPattern1 = /["']name["']\s*:\s*["']([^"']+)["']\s*,\s*["']type["']\s*:\s*["']([^"']+)["']/g;
    for (const match of content.matchAll(entityPattern1)) {
      entities.push({ name: match[1], type: match[2] });
    }

    // Pattern 2: Flexible with optional spaces and quotes
    const entityPattern2 = /\{[^}]*["']?name["']?\s*:\s*["']([^"',}]+)["'][^}]*["']?type["']?\s*:\s*["']([^"',}]+)["'][^}]*\}/g;
    for (const match of content.matchAll(entityPattern2)) {
      if (!entities.some(e => e.name === match[1] && e.type === match[2])) {
        entities.push({ name: match[1].trim(), type: match[2].trim() });
      }
    }

    // More flexible relation extraction patterns
    // Pattern 1: Standard format
    const relationPattern1 = /["']source["']\s*:\s*["']([^"']+)["']\s*,\s*["']relation["']\s*:\s*["']([^"']+)["']\s*,\s*["']target["']\s*:\s*["']([^"']+)["']/g;
    for (const match of content.matchAll(relationPattern1)) {
      relations.push({ source: match[1], relation: match[2], target: match[3] });
    }

    // Pattern 2: Flexible format
    const relationPattern2 = /\{[^}]*["']?source["']?\s*:\s*["']([^"',}]+)["'][^}]*["']?relation["']?\s*:\s*["']([^"',}]+)["'][^}]*["']?target["']?\s*:\s*["']([^"',}]+)["'][^}]*\}/g;
    for (const match of content.matchAll(relationPattern2)) {
      const rel = {
        source: match[1].trim(),
        relation: match[2].trim(),
        target: match[3].trim()
      };
      if (!relations.some(r => r.source === rel.source && r.relation === rel.relation && r.target === rel.target)) {
        relations.push(rel);
      }
    }

    // Filter and limit
    const filteredEntities = entities.filter(filterEntity).slice(0, 15);
    const filteredRelations = filterRelationsByEntities(relations, filteredEntities);

    if (filteredEntities.length > 0 || filteredRelations.length > 0) {
      return {
        chunkId: chunk.id,
        entities: filteredEntities,
        relations: filteredRelations,
      };
    }

    return null;
  } catch (error) {
    console.error(`Fallback extraction failed for chunk ${chunk.id}`);
    return null;
  }
}

/**
 * Extract graphs from multiple chunks in batches
 */
export async function extractGraphsInBatches(
  chunks: Array<{ id: number; text: string }>,
  apiKey: string,
  batchSize: number = 5
): Promise<GraphExtractionResult[]> {
  const graphs: GraphExtractionResult[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    // Process batch in parallel
    const batchPromises = batch.map(chunk => extractGraphFromChunk(chunk, apiKey));
    const batchResults = await Promise.all(batchPromises);

    // Filter out null results
    const successfulResults = batchResults.filter(result => result !== null) as GraphExtractionResult[];
    graphs.push(...successfulResults);
  }

  return graphs;
}

export interface QueryEntity {
  name: string;
  type: string;
}

/**
 * Extract entities from user query for graph search
 */
export async function extractQueryEntities(
  query: string,
  apiKey: string
): Promise<QueryEntity[]> {
  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: `Extract medical/herbal entities from this query. Focus on symptoms, diseases, herbs, or compounds mentioned.

Query: "${query}"

Return ONLY a JSON array of entities with no markdown formatting:
[{"name":"entity_name","type":"SYMPTOM|DISEASE|PLANT|COMPOUND|EFFECT"}]

Type classification:
- SYMPTOM: pain, fever, headache, nausea, etc.
- DISEASE: diabetes, hypertension, cancer, etc.
- PLANT: ginger, turmeric, garlic, herbal names
- COMPOUND: curcumin, gingerol, chemical compounds
- EFFECT: anti-inflammatory, analgesic, antioxidant

Examples:
"what herb for headache" → [{"name":"headache","type":"SYMPTOM"}]
"ginger benefits for diabetes" → [{"name":"ginger","type":"PLANT"},{"name":"diabetes","type":"DISEASE"}]

JSON only:`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || "[]";

    try {
      const parsed = parseJSONResponse(content);
      const entities = Array.isArray(parsed) ? parsed : [];
      return entities.filter((e: any) => e.name && e.type);
    } catch (error) {
      console.error("Failed to parse query entities:", error);
      return [];
    }
  } catch (error) {
    console.error("Error extracting query entities:", error);
    return [];
  }
}

/**
 * Translate user query to English using Mistral
 * Enforces strict literal translation.
 */
export async function translateQueryToEnglish(
  query: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: `Translate the following query into English strictly. 
            If it is already in English, return it exactly as is.
            Do not add any explanation, context, or extra words. 
            Just return the translated text.
            
            Query: "${query}"`,
          },
        ],
        temperature: 0.0, // Strict deterministic output
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      // Fallback: return original query if translation fails
      console.error(`Translation API error: ${response.status}`);
      return query;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || query;
  } catch (error) {
    console.error("Error translating query:", error);
    return query; // Fallback
  }
}

/**
 * Multi-Query Expansion (MQE)
 * Mirrors Python: mq_prompt → "Write 3 search queries in English to find research papers about: '{query}'"
 * Returns [originalQuery, ...expandedQueries] (up to 3 total)
 */
export async function expandQueryMQE(
  query: string,
  apiKey: string
): Promise<string[]> {
  const queries: string[] = [query];

  if (!apiKey) return queries;

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: `Write 3 search queries in English to find research papers about: '${query}'. Return ONLY a JSON array of strings, no markdown, no explanation.\nExample: ["query 1", "query 2", "query 3"]`,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) return queries;

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || "[]";
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const expanded: string[] = JSON.parse(cleaned);
      if (Array.isArray(expanded)) {
        queries.push(...expanded.filter((q) => typeof q === "string" && q.length > 0));
      }
    } catch {
      // Fallback: return original
    }
  } catch (error) {
    console.error("MQE expansion error:", error);
  }

  // Return up to 3 distinct queries (original + 2 expansions like the Python)
  return [...new Set(queries)].slice(0, 3);
}

/**
 * Extract entities for graph search from a single query
 * Mirrors Python: ent_prompt → "Identify the primary herb and the disease in: '{q}'"
 * Returns array of entity name strings (not typed)
 */
export async function extractEntitiesForGraphSearch(
  query: string,
  apiKey: string
): Promise<string[]> {
  if (!apiKey) return query.split(" ").filter((w) => w.length >= 3);

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: `Identify the primary herb and the disease/symptom in: '${query}'. Return ONLY a JSON array of strings, no markdown.\nExample: ["ginger", "diabetes"]`,
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
      }),
    });

    if (!response.ok) return query.split(" ").filter((w) => w.length >= 3);

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || "[]";
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const entities: string[] = JSON.parse(cleaned);
      if (Array.isArray(entities) && entities.length > 0) {
        return entities.filter((e) => typeof e === "string" && e.length >= 3);
      }
    } catch {
      // Fallback
    }
  } catch (error) {
    console.error("Graph entity extraction error:", error);
  }

  // Fallback: split query words
  return query.split(" ").filter((w) => w.length >= 3);
}

/**
 * Generate answer from query using hybrid search context (vector + graph)
 * OPTIMIZED: Prioritas pada herbs yang muncul di kedua context, jawaban lebih fokus
 */
export async function generateAnswer(
  query: string,
  vectorContext: Array<{ text: string; journal?: { title: string; author: string; year: string } }>,
  graphContext: {
    herbs: Array<{ name: string }>;
    relations: Array<{ source: { name: string }; relation: string; target: { name: string; type: string } }>;
  },
  apiKey: string,
  targetLanguage: 'id' | 'en' = 'id' // Default to ID if not specified
): Promise<string> {
  try {
    // Construct context from vector chunks - extract herb mentions for cross-referencing
    const chunksText = vectorContext
      .map((chunk, i) => `[Chunk ${i + 1}]: ${chunk.text.substring(0, 600)}`)
      .join("\n\n");

    // Extract herb names mentioned in vector context for cross-referencing
    const vectorText = vectorContext.map(c => c.text.toLowerCase()).join(" ");

    // Separate herbs into two categories: confirmed (in vector) and graph-only
    const graphHerbNames = graphContext.herbs.map((h) => h.name);
    const confirmedHerbs: string[] = [];
    const graphOnlyHerbs: string[] = [];

    graphHerbNames.forEach(herbName => {
      const herbLower = herbName.toLowerCase();
      // Check if herb is mentioned in vector context
      if (vectorText.includes(herbLower) ||
        vectorText.includes(herbLower.split(' ')[0])) {
        confirmedHerbs.push(herbName);
      } else {
        graphOnlyHerbs.push(herbName);
      }
    });

    // Filter relations to prioritize those involving confirmed herbs
    const prioritizedRelations = graphContext.relations
      .filter(r => confirmedHerbs.some(h =>
        r.source.name.toLowerCase().includes(h.toLowerCase()) ||
        h.toLowerCase().includes(r.source.name.toLowerCase())
      ))
      .slice(0, 10);

    const additionalRelations = graphContext.relations
      .filter(r => !prioritizedRelations.includes(r))
      .slice(0, 5);

    const relationsList = [...prioritizedRelations, ...additionalRelations]
      .map((r) => `- ${r.source.name} ${r.relation} ${r.target.name} (${r.target.type})`)
      .join("\n");

    // Get unique journal sources
    const sources = vectorContext
      .filter((c) => c.journal)
      .map((c) => c.journal!)
      .filter((j, i, arr) => arr.findIndex((x) => x.title === j.title) === i)
      .slice(0, 3);

    const sourcesText = sources
      .map((j, i) => `[${i + 1}] ${j.title}. ${j.author}. ${j.year}.`)
      .join("\n");

    // Build optimized prompt
    const confirmedHerbsList = confirmedHerbs.length > 0
      ? confirmedHerbs.join(", ")
      : "None found";
    const additionalHerbsList = graphOnlyHerbs.length > 0
      ? graphOnlyHerbs.slice(0, 3).join(", ")
      : "";

    const languageInstruction = targetLanguage === 'en'
      ? "ANSWER IN ENGLISH."
      : "ANSWER IN INDONESIAN (BAHASA INDONESIA).";

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          {
            role: "user",
            content: `You are a herbal medicine expert. Answer the question using ONLY the provided context.
            
${languageInstruction}

Question: ${query}

=== RESEARCH PAPER EVIDENCE ===
${chunksText}

=== KNOWLEDGE GRAPH DATA ===
PRIMARY HERBS (confirmed in research papers): ${confirmedHerbsList}
${additionalHerbsList ? `ADDITIONAL HERBS (from knowledge graph): ${additionalHerbsList}` : ""}

Therapeutic Relations:
${relationsList || "No relations found"}

=== ANSWER INSTRUCTIONS ===
1. ${languageInstruction}
2. PRIORITIZE herbs that appear in BOTH research papers AND knowledge graph (PRIMARY HERBS)
3. For PRIMARY HERBS: Explain their therapeutic effects, mechanisms, or clinical findings from the research
4. KEEP ANSWER CONCISE: Maximum 3-5 sentences in PARAGRAPH format
5. Include specific compounds, dosages, or study results if mentioned
6. For ADDITIONAL HERBS: Only briefly mention if directly relevant, otherwise skip
7. DO NOT mention herbs without supporting evidence from the context
8. DO NOT make up information not in the context
9. IMPORTANT: Write in flowing PARAGRAPH format, NOT bullet points or numbered lists

Provide a focused, evidence-based answer in paragraph form:`,
          },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    let answer = data.choices[0]?.message?.content?.trim() || "Unable to generate answer.";

    return answer;
  } catch (error) {
    console.error("Error generating answer:", error);
    return "Unable to generate answer due to an error.";
  }
}
