import { NextRequest, NextResponse } from "next/server";

// Batch size for parallel processing
const BATCH_SIZE = 5; // Process 5 chunks at a time

// Filter out noise entities
function filterEntity(entity: any): boolean {
  const name = entity.name.toLowerCase();
  const type = entity.type.toLowerCase();
  
  // Skip very short names (likely acronyms without context)
  if (name.length < 3) return false;
  
  // Skip generic terms
  const genericTerms = [
    'temperature', 'time', 'conditions', 'controlled conditions',
    'daily cycle', 'experiment', 'study', 'research', 'analysis',
    'test', 'result', 'data', 'group', 'control', 'sample',
    'method', 'procedure', 'process', 'measurement', 'observation'
  ];
  if (genericTerms.includes(name)) return false;
  
  // Skip standalone numbers or measurements without context
  if (/^\d+[\s°]*(minutes?|hours?|days?|°c|ml|mg|g)$/i.test(name)) return false;
  
  // Keep important types regardless
  const importantTypes = ['plant', 'compound', 'disease', 'effect', 'mechanism', 'dosage'];
  if (importantTypes.some(t => type.includes(t))) return true;
  
  return true;
}

// Normalize entity names for better deduplication
function normalizeEntityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // normalize whitespace
    .replace(/[()\[\]]/g, '') // remove parentheses
    .replace(/\.$/, ''); // remove trailing period
}

async function extractGraphFromChunk(chunk: any, apiKey: string) {
  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          {
            role: "user",
            content: `Extract ONLY important entities and relations from this herbal medicine research text. Return ONLY a JSON object.

Text:
${chunk.text}

Extract these entity types:
- PLANT: Herbal/medicinal plant names (scientific or local names)
- COMPOUND: Chemical compounds, active ingredients, biomarkers
- DISEASE: Diseases, medical conditions, disorders
- EFFECT: Therapeutic effects, biological activities, pharmacological actions
- MECHANISM: Biological mechanisms, pathways, processes
- DOSAGE: Dosage information, concentrations
- METHOD: Experimental methods, extraction techniques

RULES:
- SKIP generic terms (temperature, time, conditions, etc.)
- SKIP measurements without context (5 minutes, 25°C)
- FOCUS on medical/scientific significance
- Use standardized names when possible
- Limit to max 15 entities per chunk

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

    // Parse JSON response with robust error handling
    try {
      let jsonContent = content;
      
      // Remove markdown code blocks if present
      if (content.startsWith("```json")) {
        jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (content.startsWith("```")) {
        jsonContent = content.replace(/```\n?/g, "");
      }
      
      // Clean up common JSON issues
      jsonContent = jsonContent
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/\n/g, " ") // Replace newlines with spaces
        .replace(/\r/g, "") // Remove carriage returns
        .trim();
      
      const graphData = JSON.parse(jsonContent);

      // Filter entities to remove noise
      const filteredEntities = (graphData.entities || []).filter(filterEntity);
      
      // Limit entities to prevent explosion
      const limitedEntities = filteredEntities.slice(0, 15);

      // Filter relations to only include those with valid entities
      const entityNames = new Set(limitedEntities.map((e: any) => normalizeEntityName(e.name)));
      const filteredRelations = (graphData.relations || []).filter((rel: any) => {
        const sourceNorm = normalizeEntityName(rel.source);
        const targetNorm = normalizeEntityName(rel.target);
        return entityNames.has(sourceNorm) && entityNames.has(targetNorm);
      });

      return {
        chunkId: chunk.id,
        entities: limitedEntities,
        relations: filteredRelations,
      };
    } catch (parseError) {
      console.error(`JSON parse error for chunk ${chunk.id}:`, parseError);
      console.error("Content (first 500 chars):", content.substring(0, 500));
      
      // Try to extract entities and relations manually as fallback
      try {
        const entities: any[] = [];
        const relations: any[] = [];
        
        // Simple regex fallback extraction
        const entityMatches = content.matchAll(/"name"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"/g);
        for (const match of entityMatches) {
          entities.push({ name: match[1], type: match[2] });
        }
        
        const relationMatches = content.matchAll(/"source"\s*:\s*"([^"]+)"\s*,\s*"relation"\s*:\s*"([^"]+)"\s*,\s*"target"\s*:\s*"([^"]+)"/g);
        for (const match of relationMatches) {
          relations.push({ source: match[1], relation: match[2], target: match[3] });
        }
        
        // Filter extracted entities
        const filteredEntities = entities.filter(filterEntity).slice(0, 15);
        const entityNames = new Set(filteredEntities.map((e: any) => normalizeEntityName(e.name)));
        const filteredRelations = relations.filter((rel: any) => {
          const sourceNorm = normalizeEntityName(rel.source);
          const targetNorm = normalizeEntityName(rel.target);
          return entityNames.has(sourceNorm) && entityNames.has(targetNorm);
        });
        
        if (filteredEntities.length > 0 || filteredRelations.length > 0) {
          return {
            chunkId: chunk.id,
            entities: filteredEntities,
            relations: filteredRelations,
          };
        }
      } catch (fallbackError) {
        console.error(`Fallback extraction failed for chunk ${chunk.id}`);
      }
      
      return null;
    }
  } catch (error) {
    console.error(`Error extracting graph from chunk ${chunk.id}:`, error);
    return null;
  }
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

    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "MISTRAL_API_KEY not configured" },
        { status: 500 }
      );
    }

    console.log(`Processing ${chunks.length} chunks for graph extraction in batches of ${BATCH_SIZE}...`);

    const graphs = [];
    
    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (chunks ${i + 1}-${Math.min(i + BATCH_SIZE, chunks.length)})`);
      
      // Process batch in parallel
      const batchPromises = batch.map(chunk => extractGraphFromChunk(chunk, apiKey));
      const batchResults = await Promise.all(batchPromises);
      
      // Filter out null results (failed extractions)
      const successfulResults = batchResults.filter(result => result !== null);
      graphs.push(...successfulResults);
      
      console.log(`Batch complete: ${successfulResults.length}/${batch.length} successful`);
    }

    console.log(`Successfully extracted ${graphs.length}/${chunks.length} graphs`);

    return NextResponse.json({
      success: true,
      graphs,
      processed: graphs.length,
      total: chunks.length,
    });
  } catch (error) {
    console.error("Error extracting graph:", error);
    return NextResponse.json(
      {
        error: "Failed to extract graph",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
