-- Drop existing versions to avoid overload conflicts
DROP FUNCTION IF EXISTS search_similar_chunks(TEXT, INT);
DROP FUNCTION IF EXISTS search_similar_chunks(vector, INT, FLOAT);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  journal_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.text,
    e.journal_id,
    1 - (e.vector <=> query_embedding::vector) as similarity
  FROM embeddings e
  ORDER BY e.vector <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

-- Search herbs by symptom/disease/effect
CREATE OR REPLACE FUNCTION search_herbs_for_condition(
  condition_name TEXT,
  match_limit INT DEFAULT 10
)
RETURNS TABLE (
  herb_id UUID,
  herb_name TEXT,
  herb_type TEXT,
  relation_type TEXT,
  condition_name_matched TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Search for PLANT -> DISEASE/SYMPTOM relations
  SELECT DISTINCT
    plant.id as herb_id,
    plant.name as herb_name,
    plant.type as herb_type,
    r.relation as relation_type,
    disease.name as condition_name_matched
  FROM entities plant
  JOIN relations r ON plant.id = r.source_id
  JOIN entities disease ON r.target_id = disease.id
  WHERE plant.type = 'PLANT'
    AND disease.type IN ('DISEASE', 'SYMPTOM')
    AND disease.name ILIKE '%' || condition_name || '%'
    AND UPPER(r.relation) IN (
      'TREATS', 'REDUCES', 'ALLEVIATES', 'PREVENTS', 'CURES',
      'INHIBITS', 'SUPPRESSES', 'TARGETS', 'USED_AGAINST', 'USED_FOR',
      'STUDIED_FOR', 'STUDIED_IN', 'HAS_EFFECT', 'HAS EFFECT', 'TESTED_AGAINST'
    )
  
  UNION
  
  -- Search for PLANT -> COMPOUND -> EFFECT (for "antidiabetic", etc.)
  SELECT DISTINCT
    plant.id as herb_id,
    plant.name as herb_name,
    plant.type as herb_type,
    r2.relation as relation_type,
    effect.name as condition_name_matched
  FROM entities plant
  JOIN relations r1 ON plant.id = r1.source_id
  JOIN entities compound ON r1.target_id = compound.id
  JOIN relations r2 ON compound.id = r2.source_id
  JOIN entities effect ON r2.target_id = effect.id
  WHERE plant.type = 'PLANT'
    AND compound.type = 'COMPOUND'
    AND effect.type = 'EFFECT'
    AND (
      effect.name ILIKE '%' || condition_name || '%'
      OR effect.name ILIKE '%anti' || condition_name || '%'
      OR (condition_name ILIKE '%diabetes%' AND effect.name ILIKE '%diabetic%')
      OR (condition_name ILIKE '%cancer%' AND effect.name ILIKE '%cancer%')
      OR (condition_name ILIKE '%inflam%' AND effect.name ILIKE '%inflam%')
    )
  
  LIMIT match_limit;
END;
$$;

-- Get compounds and effects for herbs (2-hop traversal)
CREATE OR REPLACE FUNCTION get_herb_compounds_effects(
  herb_ids UUID[],
  max_results INT DEFAULT 50
)
RETURNS TABLE (
  relation_id UUID,
  relation_type TEXT,
  source_id UUID,
  source_name TEXT,
  source_type TEXT,
  target_id UUID,
  target_name TEXT,
  target_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get compounds from herbs
  RETURN QUERY
  SELECT 
    r1.id as relation_id,
    r1.relation as relation_type,
    herb.id as source_id,
    herb.name as source_name,
    herb.type as source_type,
    compound.id as target_id,
    compound.name as target_name,
    compound.type as target_type
  FROM UNNEST(herb_ids) as herb_id
  JOIN entities herb ON herb.id = herb_id
  JOIN relations r1 ON herb.id = r1.source_id
  JOIN entities compound ON r1.target_id = compound.id
  WHERE compound.type = 'COMPOUND'
    AND r1.relation IN ('contains', 'has_compound', 'produces')
  LIMIT max_results;

  -- Get effects from compounds
  RETURN QUERY
  SELECT 
    r2.id as relation_id,
    r2.relation as relation_type,
    compound.id as source_id,
    compound.name as source_name,
    compound.type as source_type,
    effect.id as target_id,
    effect.name as target_name,
    effect.type as target_type
  FROM UNNEST(herb_ids) as herb_id
  JOIN entities herb ON herb.id = herb_id
  JOIN relations r1 ON herb.id = r1.source_id
  JOIN entities compound ON r1.target_id = compound.id
  JOIN relations r2 ON compound.id = r2.source_id
  JOIN entities effect ON r2.target_id = effect.id
  WHERE compound.type = 'COMPOUND'
    AND effect.type = 'EFFECT'
    AND r1.relation IN ('contains', 'has_compound', 'produces')
    AND r2.relation IN ('has_effect', 'causes', 'produces', 'induces')
  LIMIT max_results;
END;
$$;

-- Traverse graph with BFS (breadth-first search)
CREATE OR REPLACE FUNCTION traverse_graph(
  start_entity_ids UUID[],
  max_hops INT DEFAULT 2,
  max_results INT DEFAULT 100
)
RETURNS TABLE (
  hop_number INT,
  relation_id UUID,
  relation_type TEXT,
  source_id UUID,
  source_name TEXT,
  source_type TEXT,
  target_id UUID,
  target_name TEXT,
  target_type TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_ids UUID[];
  hop INT := 0;
BEGIN
  current_ids := start_entity_ids;
  
  WHILE hop < max_hops AND array_length(current_ids, 1) > 0 LOOP
    hop := hop + 1;
    
    RETURN QUERY
    SELECT 
      hop as hop_number,
      r.id as relation_id,
      r.relation as relation_type,
      source.id as source_id,
      source.name as source_name,
      source.type as source_type,
      target.id as target_id,
      target.name as target_name,
      target.type as target_type
    FROM UNNEST(current_ids) as entity_id
    JOIN relations r ON entity_id = r.source_id
    JOIN entities source ON r.source_id = source.id
    JOIN entities target ON r.target_id = target.id
    LIMIT max_results;
    
    -- Get next hop entity IDs
    SELECT array_agg(DISTINCT r.target_id)
    INTO current_ids
    FROM UNNEST(current_ids) as entity_id
    JOIN relations r ON entity_id = r.source_id;
  END LOOP;
END;
$$;
