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
 * Generate answer from query using hybrid search context (vector + graph)
 */
export async function generateAnswer(
  query: string,
  vectorContext: Array<{ text: string; journal?: { title: string; author: string; year: string } }>,
  graphContext: {
    herbs: Array<{ name: string }>;
    relations: Array<{ source: { name: string }; relation: string; target: { name: string; type: string } }>;
  },
  apiKey: string
): Promise<string> {
  try {
    // Construct context from vector chunks
    const chunksText = vectorContext
      .map((chunk, i) => `[Chunk ${i + 1}]: ${chunk.text.substring(0, 500)}`)
      .join("\n\n");

    // Construct context from knowledge graph
    const herbsList = graphContext.herbs.map((h) => h.name).join(", ");
    const relationsList = graphContext.relations
      .slice(0, 15)
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
            content: `You are a herbal medicine expert. Answer the question using ONLY the provided context from research papers and knowledge graph.

Question: ${query}

VECTOR CONTEXT (Research Paper Excerpts):
${chunksText}

KNOWLEDGE GRAPH CONTEXT:
Relevant Herbs: ${herbsList || "None found"}

Therapeutic Relations:
${relationsList || "No relations found"}

INSTRUCTIONS:
1. Answer the question directly and concisely
2. Focus on herbal treatments and their therapeutic effects
3. IMPORTANT: Mention ALL herbs listed in "Relevant Herbs" above, even if their direct relation to the question is unclear
4. For each herb, explain its known effects or compounds if available in the context
5. Include dosage or preparation methods if mentioned in context
6. Keep answer to 5-10 sentences maximum
7. If context is insufficient for some herbs, mention them anyway and note that more research may be needed
8. DO NOT make up information not in the context

Answer:`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    let answer = data.choices[0]?.message?.content?.trim() || "Unable to generate answer.";

    // Append sources
    if (sources.length > 0) {
      answer += "\n\n**Sources:**\n" + sourcesText;
    }

    return answer;
  } catch (error) {
    console.error("Error generating answer:", error);
    return "Unable to generate answer due to an error.";
  }
}
