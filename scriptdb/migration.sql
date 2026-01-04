-- ============================================================
-- HYBRID GRAPH RAG DATABASE SCHEMA
-- Supabase PostgreSQL + pgvector
-- Created: January 2, 2026
-- ============================================================

-- ============================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for embedding storage and similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 2. CREATE TABLES
-- ============================================================

-- ----------------------------------------
-- Table: journals
-- Purpose: Store journal metadata and file references
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  year TEXT,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_journals_title ON journals USING gin(to_tsvector('english', title));
CREATE INDEX idx_journals_author ON journals USING gin(to_tsvector('english', author));
CREATE INDEX idx_journals_year ON journals(year);
CREATE INDEX idx_journals_created ON journals(created_at DESC);

-- ----------------------------------------
-- Table: embeddings
-- Purpose: Store text chunks with vector embeddings (Vector Store)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  vector vector(384) NOT NULL, -- bge-small-en-v1.5 dimensi 384
  chunk_index INTEGER NOT NULL, -- Urutan chunk dalam jurnal
  word_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vector similarity search (HNSW algorithm)
-- HNSW (Hierarchical Navigable Small World) - optimal untuk similarity search
CREATE INDEX idx_embeddings_vector_hnsw ON embeddings 
  USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64); -- m=16 untuk balance speed/accuracy

-- Additional indexes
CREATE INDEX idx_embeddings_journal ON embeddings(journal_id);
CREATE INDEX idx_embeddings_chunk_index ON embeddings(journal_id, chunk_index);

-- ----------------------------------------
-- Table: entities
-- Purpose: Store knowledge graph nodes (entities)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- plant, chemical, disease, effect, symptom, method
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_entity UNIQUE(name, type)
);

-- Create indexes for graph queries
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_name_type ON entities(name, type);
CREATE INDEX idx_entities_name_search ON entities USING gin(to_tsvector('english', name));

-- ----------------------------------------
-- Table: relations
-- Purpose: Store knowledge graph edges (relationships)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation TEXT NOT NULL, -- contains, treats, causes, has_effect, symptom_of, etc.
  target_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  confidence FLOAT DEFAULT 1.0, -- LLM extraction confidence (0-1)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_relation UNIQUE(source_id, relation, target_id)
);

-- Create indexes for graph traversal
CREATE INDEX idx_relations_source ON relations(source_id);
CREATE INDEX idx_relations_target ON relations(target_id);
CREATE INDEX idx_relations_relation ON relations(relation);
CREATE INDEX idx_relations_journal ON relations(journal_id);
CREATE INDEX idx_relations_source_relation ON relations(source_id, relation);

-- ============================================================
-- 3. CREATE FUNCTIONS
-- ============================================================

-- ----------------------------------------
-- Function: search_similar_chunks
-- Purpose: Vector similarity search (cosine similarity)
-- Usage: SELECT * FROM search_similar_chunks(query_vector, limit, similarity_threshold);
-- ----------------------------------------
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(384),
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id UUID,
  journal_id UUID,
  journal_title TEXT,
  journal_author TEXT,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS chunk_id,
    j.id AS journal_id,
    j.title AS journal_title,
    j.author AS journal_author,
    e.text AS chunk_text,
    e.chunk_index,
    1 - (e.vector <=> query_embedding) AS similarity
  FROM embeddings e
  INNER JOIN journals j ON e.journal_id = j.id
  WHERE 1 - (e.vector <=> query_embedding) >= similarity_threshold
  ORDER BY e.vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ----------------------------------------
-- Function: search_entities
-- Purpose: Full-text search for entities by name
-- Usage: SELECT * FROM search_entities('batuk', 'symptom');
-- ----------------------------------------
CREATE OR REPLACE FUNCTION search_entities(
  p_search_term TEXT,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  entity_id UUID,
  entity_name TEXT,
  entity_type TEXT,
  entity_description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS entity_id,
    e.name AS entity_name,
    e.type AS entity_type,
    e.description AS entity_description
  FROM entities e
  WHERE 
    e.name ILIKE '%' || p_search_term || '%'
    AND (p_entity_type IS NULL OR e.type = p_entity_type)
  ORDER BY 
    CASE WHEN e.name ILIKE p_search_term THEN 1
         WHEN e.name ILIKE p_search_term || '%' THEN 2
         ELSE 3
    END,
    e.name;
END;
$$;

-- ----------------------------------------
-- Function: get_entity_relations
-- Purpose: Get all relations for a specific entity (outgoing and incoming)
-- Usage: SELECT * FROM get_entity_relations(entity_id);
-- ----------------------------------------
CREATE OR REPLACE FUNCTION get_entity_relations(
  entity_uuid UUID
)
RETURNS TABLE (
  relation_id UUID,
  source_name TEXT,
  source_type TEXT,
  relation_type TEXT,
  target_name TEXT,
  target_type TEXT,
  confidence FLOAT,
  direction TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Outgoing relations (entity is source)
  SELECT 
    r.id AS relation_id,
    e1.name AS source_name,
    e1.type AS source_type,
    r.relation AS relation_type,
    e2.name AS target_name,
    e2.type AS target_type,
    r.confidence,
    'outgoing'::TEXT AS direction
  FROM relations r
  INNER JOIN entities e1 ON r.source_id = e1.id
  INNER JOIN entities e2 ON r.target_id = e2.id
  WHERE r.source_id = entity_uuid
  
  UNION ALL
  
  -- Incoming relations (entity is target)
  SELECT 
    r.id AS relation_id,
    e1.name AS source_name,
    e1.type AS source_type,
    r.relation AS relation_type,
    e2.name AS target_name,
    e2.type AS target_type,
    r.confidence,
    'incoming'::TEXT AS direction
  FROM relations r
  INNER JOIN entities e1 ON r.source_id = e1.id
  INNER JOIN entities e2 ON r.target_id = e2.id
  WHERE r.target_id = entity_uuid
  
  ORDER BY confidence DESC, relation_type;
END;
$$;

-- ----------------------------------------
-- Function: traverse_graph
-- Purpose: Graph traversal with recursive CTE (multi-hop)
-- Usage: SELECT * FROM traverse_graph('batuk', 'symptom', 3);
-- ----------------------------------------
CREATE OR REPLACE FUNCTION traverse_graph(
  start_entity_name TEXT,
  start_entity_type TEXT DEFAULT NULL,
  max_depth INT DEFAULT 2
)
RETURNS TABLE (
  node_id UUID,
  node_name TEXT,
  node_type TEXT,
  depth INT,
  path TEXT,
  relation_chain TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE graph_traverse AS (
    -- Base case: Starting entity
    SELECT 
      e.id AS node_id,
      e.name AS node_name,
      e.type AS node_type,
      0 AS depth,
      e.name::TEXT AS path,
      ''::TEXT AS relation_chain,
      ARRAY[e.id] AS visited_ids
    FROM entities e
    WHERE 
      e.name ILIKE '%' || start_entity_name || '%'
      AND (start_entity_type IS NULL OR e.type = start_entity_type)
    
    UNION ALL
    
    -- Recursive case: Traverse to connected entities
    SELECT 
      e2.id AS node_id,
      e2.name AS node_name,
      e2.type AS node_type,
      gt.depth + 1 AS depth,
      (gt.path || ' → ' || e2.name)::TEXT AS path,
      (CASE 
        WHEN gt.relation_chain = '' THEN r.relation
        ELSE gt.relation_chain || ' → ' || r.relation
      END)::TEXT AS relation_chain,
      gt.visited_ids || e2.id AS visited_ids
    FROM graph_traverse gt
    INNER JOIN relations r ON gt.node_id = r.source_id
    INNER JOIN entities e2 ON r.target_id = e2.id
    WHERE 
      gt.depth < max_depth
      AND NOT (e2.id = ANY(gt.visited_ids)) -- Prevent cycles
  )
  SELECT DISTINCT 
    gt.node_id,
    gt.node_name,
    gt.node_type,
    gt.depth,
    gt.path,
    gt.relation_chain
  FROM graph_traverse gt
  ORDER BY gt.depth, gt.node_type, gt.node_name;
END;
$$;

-- ----------------------------------------
-- Function: find_treatments
-- Purpose: Find all treatments (plants/compounds) for a symptom/disease
-- Usage: SELECT * FROM find_treatments('batuk');
-- ----------------------------------------
CREATE OR REPLACE FUNCTION find_treatments(
  symptom_name TEXT
)
RETURNS TABLE (
  treatment_name TEXT,
  treatment_type TEXT,
  relation_type TEXT,
  compound_name TEXT,
  effect_name TEXT,
  journal_title TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e1.name AS treatment_name,
    e1.type AS treatment_type,
    r1.relation AS relation_type,
    e3.name AS compound_name,
    e4.name AS effect_name,
    j.title AS journal_title
  FROM entities e2
  -- Find treatments that treat the symptom
  INNER JOIN relations r1 ON e2.id = r1.target_id
  INNER JOIN entities e1 ON r1.source_id = e1.id
  -- Find compounds in the treatment
  LEFT JOIN relations r2 ON e1.id = r2.source_id AND r2.relation = 'contains'
  LEFT JOIN entities e3 ON r2.target_id = e3.id
  -- Find effects of compounds
  LEFT JOIN relations r3 ON e3.id = r3.source_id AND r3.relation = 'has_effect'
  LEFT JOIN entities e4 ON r3.target_id = e4.id
  -- Get journal reference
  LEFT JOIN journals j ON r1.journal_id = j.id
  WHERE 
    e2.name ILIKE '%' || symptom_name || '%'
    AND r1.relation IN ('treats', 'prevents', 'reduces')
  ORDER BY treatment_type, treatment_name;
END;
$$;

-- ============================================================
-- 4. CREATE TRIGGERS
-- ============================================================

-- ----------------------------------------
-- Trigger: Update updated_at timestamp automatically
-- ----------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_journals_updated_at
  BEFORE UPDATE ON journals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. PERFORMANCE OPTIMIZATION SETTINGS
-- ============================================================

-- Optimize for vector search
ALTER TABLE embeddings SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE embeddings SET (autovacuum_analyze_scale_factor = 0.01);

-- Optimize for graph queries
ALTER TABLE entities SET (autovacuum_vacuum_scale_factor = 0.02);
ALTER TABLE relations SET (autovacuum_vacuum_scale_factor = 0.02);

-- ============================================================
-- 6. SAMPLE DATA (OPTIONAL - for testing)
-- ============================================================

-- Insert sample journal
-- INSERT INTO journals (title, author, file_url) VALUES
--   ('Anti-inflammatory Effects of Cayratia trifolia', 'Dr. John Doe', 'https://storage.supabase.co/bucket/journals/sample.pdf');

-- ============================================================
-- 7. USEFUL QUERIES
-- ============================================================

/*
-- Vector Search Example:
SELECT * FROM search_similar_chunks(
  query_embedding := '[0.1, 0.2, ...]'::vector(384),
  match_count := 5,
  similarity_threshold := 0.7
);

-- Entity Search Example:
SELECT * FROM search_entities('batuk', 'symptom');

-- Graph Traversal Example:
SELECT * FROM traverse_graph('jahe', 'plant', 2);

-- Find Treatments Example:
SELECT * FROM find_treatments('batuk');

-- Get Entity Relations Example:
SELECT * FROM get_entity_relations('uuid-here');

-- Direct Similarity Search:
SELECT 
  id,
  text,
  1 - (vector <=> '[0.1, 0.2, ...]'::vector(384)) as similarity
FROM embeddings
ORDER BY vector <=> '[0.1, 0.2, ...]'::vector(384)
LIMIT 5;
*/

-- ============================================================
-- END OF MIGRATION SCRIPT
-- ============================================================

-- To run this script in Supabase:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Create new query
-- 3. Copy and paste this entire script
-- 4. Click "Run" button
-- 5. Verify all tables and functions are created

-- Performance Tips:
-- - Use HNSW index for vector search (already configured)
-- - Use GIN index for full-text search (already configured)
-- - Use B-tree index for foreign keys (already configured)
-- - Regularly VACUUM ANALYZE tables
-- - Monitor query performance with EXPLAIN ANALYZE
