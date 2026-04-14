-- ============================================================
-- FIX: search_similar_chunks untuk Hybrid RAG
-- Jalankan SQL ini di Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- Hapus semua versi lama yang mungkin konflik
DROP FUNCTION IF EXISTS search_similar_chunks(TEXT, INT);
DROP FUNCTION IF EXISTS search_similar_chunks(vector, INT);
DROP FUNCTION IF EXISTS search_similar_chunks(vector, INT, FLOAT);
DROP FUNCTION IF EXISTS search_similar_chunks(vector(384), INT, FLOAT);

-- Buat ulang dengan signature yang benar
-- Terima query_embedding sebagai TEXT dan cast ke vector secara internal
-- Ini menyelesaikan masalah "schema cache" di PostgREST
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding TEXT,
  match_count INT DEFAULT 15,
  similarity_threshold FLOAT DEFAULT 0.05
)
RETURNS TABLE (
  id UUID,
  text TEXT,
  journal_id UUID,
  similarity FLOAT,
  journal_title TEXT,
  journal_author TEXT,
  journal_year TEXT,
  journal_file_url TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_embedding vector(384);
BEGIN
  -- Cast TEXT ke vector
  v_embedding := query_embedding::vector(384);
  
  RETURN QUERY
  SELECT 
    e.id,
    e.text,
    e.journal_id,
    1 - (e.vector <=> v_embedding) AS similarity,
    j.title AS journal_title,
    j.author AS journal_author,
    j.year AS journal_year,
    j.file_url AS journal_file_url
  FROM embeddings e
  LEFT JOIN journals j ON e.journal_id = j.id
  WHERE 1 - (e.vector <=> v_embedding) >= similarity_threshold
  ORDER BY e.vector <=> v_embedding
  LIMIT match_count;
END;
$$;

-- Verifikasi fungsi berhasil dibuat
SELECT 'search_similar_chunks created successfully' AS status;
