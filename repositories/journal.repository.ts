/**
 * Journal Repository - Database operations for journals, embeddings, entities, and relations
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeEntityName, deduplicateEntities, deduplicateRelations } from "@/lib/graph-utils";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface Chunk {
  id: number;
  text: string;
  wordCount: number;
}

export interface VectorResult {
  chunkId: number;
  vector: number[];
  dimension: number;
}

export interface Entity {
  name: string;
  type: string;
}

export interface Relation {
  source: string;
  relation: string;
  target: string;
}

export interface GraphResult {
  chunkId: number;
  entities: Entity[];
  relations: Relation[];
}

export interface SaveToDbParams {
  metadata: { title: string; author: string; year: string };
  fileUrl: string;
  chunks: Chunk[];
  vectors: VectorResult[];
  graphs: GraphResult[];
}

export interface SaveToDbResult {
  journalId: string;
  embeddingsCount: number;
  entitiesCount: number;
  relationsCount: number;
}

/**
 * Insert journal record
 */
export async function insertJournal(
  title: string,
  author: string,
  year: string,
  fileUrl: string
) {
  const { data, error } = await supabase
    .from("journals")
    .insert({
      title,
      author,
      year: year || new Date().getFullYear().toString(),
      file_url: fileUrl,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert journal: ${error?.message}`);
  }

  return data;
}

/**
 * Insert embeddings for a journal
 */
export async function insertEmbeddings(
  journalId: string,
  chunks: Chunk[],
  vectors: VectorResult[]
) {
  const embeddingsToInsert = chunks.map((chunk, index) => {
    const vector = vectors.find((v) => v.chunkId === chunk.id);
    if (!vector) {
      throw new Error(`Vector not found for chunk ${chunk.id}`);
    }

    return {
      journal_id: journalId,
      text: chunk.text,
      vector: JSON.stringify(vector.vector),
      chunk_index: index,
      word_count: chunk.wordCount,
    };
  });

  const { data, error } = await supabase
    .from("embeddings")
    .insert(embeddingsToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to insert embeddings: ${error.message}`);
  }

  return data || [];
}

/**
 * Insert entities with deduplication
 */
export async function insertEntities(graphs: GraphResult[]) {
  // Extract and deduplicate entities
  const allEntities: Entity[] = [];
  graphs.forEach((graph) => {
    graph.entities.forEach((entity) => {
      allEntities.push({
        name: entity.name.trim(), // Trim whitespace
        type: entity.type.toUpperCase(),
      });
    });
  });

  const uniqueEntities = deduplicateEntities(allEntities);

  console.log(`Total unique entities to insert: ${uniqueEntities.length}`);

  // Insert with conflict handling
  const entitiesToInsert = uniqueEntities.map((entity) => ({
    name: entity.name,
    type: entity.type,
    description: null,
  }));

  const { data, error } = await supabase
    .from("entities")
    .upsert(entitiesToInsert, { onConflict: "name,type", ignoreDuplicates: true })
    .select();

  if (error) {
    throw new Error(`Failed to insert entities: ${error.message}`);
  }

  console.log(`Successfully inserted/updated ${data?.length || 0} entities`);
  return data || [];
}

/**
 * Fetch all entities and create name->id mapping
 */
export async function fetchEntityIdMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("entities")
    .select("id, name, type");

  if (error || !data) {
    throw new Error(`Failed to fetch entities: ${error?.message}`);
  }

  console.log(`Fetched ${data.length} entities from database`);

  const entityIdMap = new Map<string, string>();
  data.forEach((entity: any) => {
    const normalizedName = normalizeEntityName(entity.name);
    const key = `${normalizedName}|${entity.type.toLowerCase()}`;
    entityIdMap.set(key, entity.id);
  });

  console.log(`Created entity map with ${entityIdMap.size} entries`);
  
  // Log first 5 entities for debugging
  const first5 = Array.from(entityIdMap.entries()).slice(0, 5);
  console.log('Sample entity map entries:', first5.map(([key, id]) => ({ key, id })));

  return entityIdMap;
}

/**
 * Get entity type from graphs
 */
function getEntityTypeFromName(name: string, graphs: GraphResult[]): string {
  for (const graph of graphs) {
    const entity = graph.entities.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (entity) {
      return entity.type.toUpperCase();
    }
  }
  return "UNKNOWN";
}

/**
 * Insert relations with entity validation
 */
export async function insertRelations(
  journalId: string,
  graphs: GraphResult[],
  entityIdMap: Map<string, string>
) {
  // Extract and deduplicate relations
  const allRelations: Relation[] = [];
  graphs.forEach((graph) => {
    graph.relations.forEach((relation) => {
      if (relation.source && relation.relation && relation.target) {
        allRelations.push(relation);
      }
    });
  });

  console.log(`Total raw relations before dedup: ${allRelations.length}`);
  const uniqueRelations = deduplicateRelations(allRelations);
  console.log(`Unique relations after dedup: ${uniqueRelations.length}`);

  // Map relations to entity IDs
  let skippedCount = 0;
  const skippedRelations: Array<{relation: Relation, reason: string}> = [];
  
  const relationsToInsert = uniqueRelations
    .map((relation) => {
      const normalizedSource = normalizeEntityName(relation.source);
      const normalizedTarget = normalizeEntityName(relation.target);

      const sourceType = getEntityTypeFromName(relation.source, graphs);
      const targetType = getEntityTypeFromName(relation.target, graphs);

      const sourceKey = `${normalizedSource}|${sourceType.toLowerCase()}`;
      const targetKey = `${normalizedTarget}|${targetType.toLowerCase()}`;

      let sourceId = entityIdMap.get(sourceKey);
      let targetId = entityIdMap.get(targetKey);

      // Fallback: try to find entity by name only (any type)
      if (!sourceId) {
        for (const [key, id] of entityIdMap.entries()) {
          const [name, ] = key.split('|');
          if (name === normalizedSource) {
            sourceId = id;
            break;
          }
        }
      }
      
      if (!targetId) {
        for (const [key, id] of entityIdMap.entries()) {
          const [name, ] = key.split('|');
          if (name === normalizedTarget) {
            targetId = id;
            break;
          }
        }
      }

      if (!sourceId || !targetId) {
        skippedCount++;
        const reason = !sourceId && !targetId 
          ? `Both entities not found: "${relation.source}" (${sourceType}) and "${relation.target}" (${targetType})`
          : !sourceId 
            ? `Source not found: "${relation.source}" (${sourceType}, normalized: "${normalizedSource}")`
            : `Target not found: "${relation.target}" (${targetType}, normalized: "${normalizedTarget}")`;
        skippedRelations.push({ relation, reason });
        return null;
      }

      return {
        source_id: sourceId,
        relation: relation.relation.trim(),
        target_id: targetId,
        journal_id: journalId,
        confidence: 1.0,
      };
    })
    .filter((r) => r !== null && r.relation && r.relation.length > 0);

  console.log(`Relations to insert: ${relationsToInsert.length}`);
  console.log(`Relations skipped (missing entities): ${skippedCount}`);
  
  if (skippedRelations.length > 0) {
    console.log('\n=== First 10 skipped relations ===');
    skippedRelations.slice(0, 10).forEach(({ relation, reason }) => {
      console.log(`"${relation.source}" --[${relation.relation}]--> "${relation.target}"`);
      console.log(`  Reason: ${reason}`);
    });
  }

  if (relationsToInsert.length === 0) {
    console.warn('No relations to insert!');
    return [];
  }

  const { data, error } = await supabase
    .from("relations")
    .upsert(relationsToInsert, {
      onConflict: "source_id,relation,target_id",
      ignoreDuplicates: true,
    })
    .select();

  if (error) {
    throw new Error(`Failed to insert relations: ${error.message}`);
  }

  console.log(`Successfully inserted ${data?.length || 0} relations`);
  return data || [];
}

/**
 * Main function to save all data to database
 */
export async function saveToDatabase(params: SaveToDbParams): Promise<SaveToDbResult> {
  const { metadata, fileUrl, chunks, vectors, graphs } = params;

  // 1. Insert journal
  const journal = await insertJournal(
    metadata.title,
    metadata.author,
    metadata.year,
    fileUrl
  );

  // 2. Insert embeddings
  const embeddings = await insertEmbeddings(journal.id, chunks, vectors);

  // 3. Insert entities
  const entities = await insertEntities(graphs);

  // 4. Fetch entity ID map
  const entityIdMap = await fetchEntityIdMap();

  // 5. Insert relations
  const relations = await insertRelations(journal.id, graphs, entityIdMap);

  return {
    journalId: journal.id,
    embeddingsCount: embeddings.length,
    entitiesCount: entities.length,
    relationsCount: relations.length,
  };
}
