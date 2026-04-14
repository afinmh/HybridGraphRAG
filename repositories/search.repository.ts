/**
 * Search Repository - Vector and Graph search operations
 * Aligned with 05_hybrid_retrieval_experiment.py pipeline:
 * MQE → Vector Search → Graph Search → Reranking → Deduplication → Construction
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export interface VectorSearchResult {
  id: string;
  text: string;
  journal_id: string;
  similarity: number;
  journal?: {
    title: string;
    author: string;
    year: string;
    file_url: string;
  };
}

export interface GraphSearchResult {
  id: string;
  name: string;
  type: string;
  relations?: any[];
}

export interface GraphRelation {
  id: string;
  relation: string;
  source: {
    id: string;
    name: string;
    type: string;
  };
  target: {
    id: string;
    name: string;
    type: string;
  };
}

/**
 * Vector similarity search using embeddings
 * Uses actual Supabase RPCs: match_chunk_sentence2 → match_chunk_word2 → match_chunk_character2 (fallback chain)
 * Mirrors 05_hybrid_retrieval_experiment.py:
 *   supabase_client.rpc(v_rpc, {"query_embedding": q_vec, "match_threshold": 0.05, "match_count": 15})
 *
 * Function signature (from DB):
 *   match_chunk_sentence2(query_embedding vector(384), match_threshold float, match_count int)
 * Returns: id uuid, journal_id uuid, text_content text, similarity float
 */
export async function vectorSearch(
  queryVector: number[],
  topK: number = 15
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();

  // supabase-js serializes a number[] as a JSON array which PostgREST
  // accepts for vector(384) parameters — no string conversion needed
  const rpcParams = {
    query_embedding: queryVector,
    match_threshold: 0.05,   // Same as Python experiment
    match_count: topK,
  };

  // Try RPCs in order: sentence → word → character (all have identical signatures)
  const rpcs = ["match_chunk_sentence2", "match_chunk_word2", "match_chunk_character2"];

  for (const rpcName of rpcs) {
    try {
      const { data, error } = await supabase.rpc(rpcName, rpcParams);

      if (!error && data && data.length > 0) {
        console.log(`  ✓ Vector RPC "${rpcName}" returned ${data.length} results`);
        return mapChunkRows(data);
      }

      if (error) {
        console.warn(`  Vector RPC "${rpcName}" failed:`, error.message);
      }
    } catch (e) {
      console.warn(`  Vector RPC "${rpcName}" exception:`, e);
    }
  }

  // Last resort: direct table query on chunk_sentence2
  return await vectorSearchFallback(topK);
}

/** Map chunk_sentence2/word2/character2 rows to VectorSearchResult */
function mapChunkRows(rows: any[]): VectorSearchResult[] {
  return rows.map((row: any) => ({
    id: row.id,
    text: row.text_content ?? row.text ?? "",
    journal_id: row.journal_id,
    similarity: row.similarity ?? 0,
    // journal metadata filled later by getJournalsForEmbeddings
  }));
}

/**
 * Fallback: direct chunk_sentence2 table query (no cosine ranking)
 * Used when all RPCs fail.
 */
async function vectorSearchFallback(topK: number): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();

  const tables = ["chunk_sentence2", "chunk_word2", "chunk_character2", "embeddings"];

  for (const tbl of tables) {
    try {
      // Detect column name: chunk tables use text_content, embeddings uses text
      const textCol = tbl === "embeddings" ? "text" : "text_content";
      const { data, error } = await supabase
        .from(tbl)
        .select(`id, journal_id, ${textCol}`)
        .limit(topK);

      if (!error && data && data.length > 0) {
        console.log(`  ✓ Fallback table "${tbl}" returned ${data.length} rows`);
        return data.map((row: any) => ({
          id: row.id,
          text: row[textCol] ?? "",
          journal_id: row.journal_id,
          similarity: 0.1,  // No real score in fallback
        }));
      }
    } catch { /* try next */ }
  }

  console.warn("  All vector search fallbacks exhausted — returning []");
  return [];
}


/**
 * Graph relations search — queries graph_sentence/graph_word/graph_character tables
 * Mirrors Python: supabase.table(g_table).select('*')
 *   .or(`entity_1.ilike.%{ent}%,entity_2.ilike.%{ent}%`).limit(5)
 * Falls back to entities/relations tables if graph_sentence doesn't exist.
 */
export async function graphRelationsSearch(
  entities: string[],
  graphTable: "graph_sentence" | "graph_word" | "graph_character" = "graph_sentence",
  limitPerEntity: number = 5
): Promise<string[]> {
  const supabase = getSupabaseClient();
  const allRelStrings: string[] = [];

  for (const ent of entities) {
    // Sanitize entity name
    const safe = ent.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    if (safe.length < 3) continue;

    try {
      const { data } = await supabase
        .from(graphTable)
        .select("*")
        .or(`entity_1.ilike.%${safe}%,entity_2.ilike.%${safe}%`)
        .limit(limitPerEntity);

      if (data && data.length > 0) {
        for (const row of data) {
          const rel = `${row.entity_1} ${String(row.relation).replace(/_/g, " ")} ${row.entity_2}.`;
          allRelStrings.push(rel);
        }
        continue; // Found results in graph table, skip fallback
      }
    } catch {
      // Table may not exist, fall through to fallback
    }

    // Fallback: use entities + relations tables (normalized schema)
    try {
      const { data: entData } = await supabase
        .from("entities")
        .select("id, name, type")
        .ilike("name", `%${safe}%`)
        .limit(5);

      if (entData && entData.length > 0) {
        const ids = entData.map((e: any) => e.id);
        const { data: relData } = await supabase
          .from("relations")
          .select(`
            relation,
            source:entities!relations_source_id_fkey(name),
            target:entities!relations_target_id_fkey(name)
          `)
          .or(`source_id.in.(${ids.join(",")}),target_id.in.(${ids.join(",")})`)
          .limit(limitPerEntity);

        if (relData) {
          for (const row of relData as any[]) {
            if (row.source && row.target) {
              allRelStrings.push(`${row.source.name} ${row.relation} ${row.target.name}.`);
            }
          }
        }
      }
    } catch {
      // Silent fail for graph path
    }
  }

  return allRelStrings;
}

/**
 * Find entities matching query entities
 */
export async function findMatchingEntities(
  entityName: string,
  entityType?: string
): Promise<GraphSearchResult[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("entities")
    .select("id, name, type")
    .ilike("name", `%${entityName}%`);

  if (entityType) {
    query = query.eq("type", entityType);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    console.error("Entity search error:", error);
    return [];
  }

  return data || [];
}

/**
 * Find herbs that treat a specific condition/symptom
 */
export async function findHerbsForCondition(
  conditionName: string
): Promise<GraphSearchResult[]> {
  const supabase = getSupabaseClient();
  // Find the condition entity first
  const { data: conditions } = await supabase
    .from("entities")
    .select("id, name, type")
    .ilike("name", `%${conditionName}%`)
    .in("type", ["DISEASE", "SYMPTOM"])
    .limit(5);

  console.log(`    - Conditions found for "${conditionName}": ${conditions?.length || 0}`);
  if (conditions && conditions.length > 0) {
    console.log(`    - Condition names: ${conditions.map(c => c.name).join(', ')}`);
  }

  if (!conditions || conditions.length === 0) {
    return [];
  }

  const conditionIds = conditions.map((c) => c.id);

  // Find plants that have relations to these conditions
  const { data: relations, error: relError } = await supabase
    .from("relations")
    .select(
      `
      id,
      relation,
      source:entities!relations_source_id_fkey(id, name, type)
    `
    )
    .in("target_id", conditionIds)
    .eq("source.type", "PLANT")
    .in("relation", ["treats", "reduces", "alleviates", "prevents", "cures"]);

  console.log(`    - Relations found: ${relations?.length || 0}`);
  if (relError) {
    console.error(`    - Relation query error:`, relError);
  }

  if (!relations) {
    return [];
  }

  // Extract unique plants
  const plantsMap = new Map();
  relations.forEach((rel: any) => {
    if (rel.source) {
      plantsMap.set(rel.source.id, rel.source);
    }
  });

  return Array.from(plantsMap.values());
}

/**
 * Get compounds and effects for given herbs
 */
export async function getHerbCompoundsAndEffects(
  herbIds: string[]
): Promise<GraphRelation[]> {
  if (herbIds.length === 0) return [];

  const supabase = getSupabaseClient();
  // Get ALL relations from herbs first (without type filter)
  const { data: allRelations, error } = await supabase
    .from("relations")
    .select(
      `
      id,
      relation,
      source:entities!relations_source_id_fkey(id, name, type),
      target:entities!relations_target_id_fkey(id, name, type)
    `
    )
    .in("source_id", herbIds);

  if (error) {
    console.error("Error fetching herb relations:", error);
    return [];
  }

  if (!allRelations) return [];

  // Filter compounds and effects manually (case-insensitive)
  const results: GraphRelation[] = [];

  allRelations.forEach((rel: any) => {
    // Skip if source or target is null
    if (!rel.source || !rel.target) {
      console.warn(`Skipping relation ${rel.id}: null entity`);
      return;
    }

    const targetType = (rel.target.type || "").toUpperCase();
    const sourceType = (rel.source.type || "").toUpperCase();

    // Include COMPOUND, EFFECT, DISEASE relations
    if (targetType === "COMPOUND" || targetType === "EFFECT" || targetType === "DISEASE") {
      results.push({
        id: rel.id,
        relation: rel.relation,
        source: {
          id: rel.source.id,
          name: rel.source.name,
          type: sourceType,
        },
        target: {
          id: rel.target.id,
          name: rel.target.name,
          type: targetType,
        },
      });
    }
  });

  console.log(`  - Filtered ${results.length} therapeutic relations from ${allRelations.length} total`);
  return results;
}

/**
 * Traverse graph from entities (multi-hop)
 */
export async function traverseGraph(
  startEntityIds: string[],
  maxHops: number = 2
): Promise<GraphRelation[]> {
  if (startEntityIds.length === 0 || maxHops === 0) return [];

  const supabase = getSupabaseClient();
  const allRelations: GraphRelation[] = [];
  let currentIds = startEntityIds;

  for (let hop = 0; hop < maxHops; hop++) {
    const { data: relations } = await supabase
      .from("relations")
      .select(
        `
        id,
        relation,
        source:entities!relations_source_id_fkey(id, name, type),
        target:entities!relations_target_id_fkey(id, name, type)
      `
      )
      .in("source_id", currentIds);

    if (!relations || relations.length === 0) break;

    const typedRelations = relations as any[] as GraphRelation[];
    allRelations.push(...typedRelations);

    // Get target IDs for next hop
    currentIds = typedRelations.map((r) => r.target.id);
  }

  return allRelations;
}

/**
 * Get journal metadata for chunk IDs from chunk_sentence2/word2/character2 tables.
 * Returns a Map<chunkId, {title, author, year, file_url}>.
 * Tries chunk_sentence2 first (matching the Python experiment's primary table),
 * then falls back to word2/character2/embeddings.
 */
export async function getJournalsForEmbeddings(
  chunkIds: string[]
): Promise<Map<string, any>> {
  if (chunkIds.length === 0) return new Map();

  const supabase = getSupabaseClient();
  const journalMap = new Map<string, any>();

  // Try each chunk table in order — same priority as vectorSearch
  const chunkTables = ["chunk_sentence2", "chunk_word2", "chunk_character2", "embeddings"];

  for (const tbl of chunkTables) {
    try {
      const { data, error } = await supabase
        .from(tbl)
        .select("id, journal_id")
        .in("id", chunkIds);

      if (error || !data || data.length === 0) continue;

      // Collect unique journal_ids from this batch
      const journalIds = [...new Set(data.map((r: any) => r.journal_id).filter(Boolean))];
      if (journalIds.length === 0) continue;

      const { data: journals } = await supabase
        .from("journals")
        .select("id, title, author, year, file_url")
        .in("id", journalIds);

      if (!journals) continue;

      // Build lookup: journal_id → journal metadata
      const jById = new Map(journals.map((j: any) => [j.id, j]));

      // Map chunk id → journal
      for (const row of data) {
        const journal = jById.get(row.journal_id);
        if (journal) {
          journalMap.set(row.id, journal);
        }
      }

      // If we found results in this table, stop (avoid duplicate keys)
      if (journalMap.size > 0) break;
    } catch { /* try next table */ }
  }

  return journalMap;
}

