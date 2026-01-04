import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Chunk {
  id: number;
  text: string;
  wordCount: number;
}

interface VectorResult {
  chunkId: number;
  vector: number[];
  dimension: number;
}

interface Entity {
  name: string;
  type: string;
}

interface Relation {
  source: string;
  relation: string;
  target: string;
}

interface GraphResult {
  chunkId: number;
  entities: Entity[];
  relations: Relation[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { metadata, fileUrl, chunks, vectors, graphs } = body as {
      metadata: { title: string; author: string; year: string };
      fileUrl: string;
      chunks: Chunk[];
      vectors: VectorResult[];
      graphs: GraphResult[];
    };

    // Normalize entity names for deduplication
    function normalizeEntityName(name: string): string {
      return name
        .toLowerCase()
        .trim()
        .replace(/\\s+/g, ' ')
        .replace(/[()\\[\\]]/g, '')
        .replace(/\\.$/, '');
    }

    // Validate input with detailed errors
    if (!metadata) {
      return NextResponse.json(
        { error: "Missing metadata" },
        { status: 400 }
      );
    }
    
    if (!fileUrl) {
      return NextResponse.json(
        { error: "Missing file URL" },
        { status: 400 }
      );
    }
    
    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty chunks" },
        { status: 400 }
      );
    }
    
    if (!vectors || vectors.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty vectors" },
        { status: 400 }
      );
    }
    
    if (!graphs || graphs.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty graphs" },
        { status: 400 }
      );
    }

    // 1. Insert Journal
    const { data: journal, error: journalError } = await supabase
      .from("journals")
      .insert({
        title: metadata.title,
        author: metadata.author,
        year: metadata.year || new Date().getFullYear().toString(),
        file_url: fileUrl, // Use actual file URL from storage
      })
      .select()
      .single();

    if (journalError || !journal) {
      console.error("Journal insert error:", journalError);
      return NextResponse.json(
        { error: "Failed to insert journal", details: journalError },
        { status: 500 }
      );
    }

    // 2. Insert Embeddings (chunks with vectors)
    const embeddingsToInsert = chunks.map((chunk, index) => {
      const vector = vectors.find((v) => v.chunkId === chunk.id);
      if (!vector) {
        throw new Error(`Vector not found for chunk ${chunk.id}`);
      }

      return {
        journal_id: journal.id,
        text: chunk.text,
        vector: JSON.stringify(vector.vector), // pgvector format: array as string
        chunk_index: index,
        word_count: chunk.wordCount,
      };
    });

    const { data: embeddings, error: embeddingsError } = await supabase
      .from("embeddings")
      .insert(embeddingsToInsert)
      .select();

    if (embeddingsError) {
      console.error("Embeddings insert error:", embeddingsError);
      return NextResponse.json(
        { error: "Failed to insert embeddings", details: embeddingsError },
        { status: 500 }
      );
    }

    // 3. Extract all unique entities from all graphs with normalization
    const allEntities: Entity[] = [];
    const entityMap = new Map<string, Entity>(); // key: normalized_name|type

    graphs.forEach((graph) => {
      graph.entities.forEach((entity) => {
        const normalizedName = normalizeEntityName(entity.name);
        const key = `${normalizedName}|${entity.type.toLowerCase()}`;
        
        if (!entityMap.has(key)) {
          // Use original name but deduplicate by normalized version
          entityMap.set(key, {
            name: entity.name,
            type: entity.type.toUpperCase() // Standardize type to uppercase
          });
          allEntities.push({
            name: entity.name,
            type: entity.type.toUpperCase()
          });
        }
      });
    });

    // Insert entities (with conflict handling)
    const entitiesToInsert = allEntities.map((entity) => ({
      name: entity.name,
      type: entity.type,
      description: null, // Can be enhanced later
    }));

    // Use upsert to handle duplicates (ON CONFLICT DO NOTHING)
    const { data: insertedEntities, error: entitiesError } = await supabase
      .from("entities")
      .upsert(entitiesToInsert, { onConflict: "name,type", ignoreDuplicates: true })
      .select();

    if (entitiesError) {
      console.error("Entities insert error:", entitiesError);
      return NextResponse.json(
        { error: "Failed to insert entities", details: entitiesError },
        { status: 500 }
      );
    }

    // 4. Fetch all entities to create a map (normalized_name|type -> id)
    const { data: allEntitiesFromDb, error: fetchEntitiesError } = await supabase
      .from("entities")
      .select("id, name, type");

    if (fetchEntitiesError || !allEntitiesFromDb) {
      console.error("Fetch entities error:", fetchEntitiesError);
      return NextResponse.json(
        { error: "Failed to fetch entities", details: fetchEntitiesError },
        { status: 500 }
      );
    }

    // Create a map using normalized names for matching
    const entityIdMap = new Map<string, string>();
    allEntitiesFromDb.forEach((entity: any) => {
      const normalizedName = normalizeEntityName(entity.name);
      const key = `${normalizedName}|${entity.type.toLowerCase()}`;
      entityIdMap.set(key, entity.id);
    });

    // 5. Insert Relations
    const allRelations: Array<{ source: string; relation: string; target: string }> = [];
    const relationSet = new Set<string>(); // To avoid duplicates

    graphs.forEach((graph) => {
      graph.relations.forEach((relation) => {
        // Skip relations with missing or empty fields
        if (!relation.source || !relation.relation || !relation.target) {
          return;
        }
        
        const key = `${relation.source}|${relation.relation}|${relation.target}`;
        if (!relationSet.has(key)) {
          relationSet.add(key);
          allRelations.push(relation);
        }
      });
    });

    const relationsToInsert = allRelations.map((relation) => {
      // Validate relation has all required fields
      if (!relation.source || !relation.relation || !relation.target) {
        return null;
      }
      
      // Find source entity ID using normalized names
      const normalizedSource = normalizeEntityName(relation.source);
      const normalizedTarget = normalizeEntityName(relation.target);
      
      const sourceType = getEntityTypeFromName(relation.source, graphs);
      const targetType = getEntityTypeFromName(relation.target, graphs);
      
      const sourceKey = `${normalizedSource}|${sourceType.toLowerCase()}`;
      const targetKey = `${normalizedTarget}|${targetType.toLowerCase()}`;

      const sourceId = entityIdMap.get(sourceKey);
      const targetId = entityIdMap.get(targetKey);

      if (!sourceId || !targetId) {
        // Skip relations with missing entities silently
        return null;
      }

      return {
        source_id: sourceId,
        relation: relation.relation.trim(), // Ensure no empty strings
        target_id: targetId,
        journal_id: journal.id,
        confidence: 1.0,
      };
    }).filter(r => r !== null && r.relation && r.relation.length > 0); // Remove nulls and empty relations

    const { data: relations, error: relationsError } = await supabase
      .from("relations")
      .upsert(relationsToInsert, { onConflict: "source_id,relation,target_id", ignoreDuplicates: true })
      .select();

    if (relationsError) {
      console.error("Relations insert error:", relationsError);
      return NextResponse.json(
        { error: "Failed to insert relations", details: relationsError },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      success: true,
      journalId: journal.id,
      embeddingsCount: embeddings?.length || 0,
      entitiesCount: insertedEntities?.length || 0,
      relationsCount: relations?.length || 0,
    });
  } catch (error) {
    console.error("Save to DB error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Helper function to get entity type from name
function getEntityTypeFromName(name: string, graphs: GraphResult[]): string {
  for (const graph of graphs) {
    const entity = graph.entities.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (entity) {
      return entity.type;
    }
  }
  return "unknown"; // Default fallback
}
