/**
 * Search Repository - Vector and Graph search operations
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
 */
export async function vectorSearch(
  queryVector: number[],
  topK: number = 5
): Promise<VectorSearchResult[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("search_similar_chunks", {
    query_embedding: `[${queryVector.join(",")}]`,
    match_count: topK,
  });

  if (error) {
    console.error("Vector search error:", error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return data || [];
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
 * Get journal metadata for embeddings
 */
export async function getJournalsForEmbeddings(
  embeddingIds: string[]
): Promise<Map<string, any>> {
  if (embeddingIds.length === 0) return new Map();

  const supabase = getSupabaseClient();
  const { data: embeddings } = await supabase
    .from("embeddings")
    .select(
      `
      id,
      journal:journals(id, title, author, year, file_url)
    `
    )
    .in("id", embeddingIds);

  const journalMap = new Map();
  embeddings?.forEach((emb: any) => {
    if (emb.journal) {
      journalMap.set(emb.id, emb.journal);
    }
  });

  return journalMap;
}
