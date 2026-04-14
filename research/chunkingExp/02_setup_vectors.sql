-- Mengaktifkan ekstensi vector (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- Menambahkan kolom embedding pada setiap tabel (DImensi 384)
-- BAAI/bge-small-en-v1.5 dan all-MiniLM-L6-v2 keduanya memiliki output dimensi 384.
ALTER TABLE chunk_word ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE chunk_sentence ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE chunk_character ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Membuat index HNSW pada masing-masing tabel untuk pencarian Cosine Similarity yang cepat
CREATE INDEX IF NOT EXISTS idx_chunk_word_embedding ON chunk_word USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunk_sentence_embedding ON chunk_sentence USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunk_character_embedding ON chunk_character USING hnsw (embedding vector_cosine_ops);

-- ==========================================================
-- FUNGSI PENCARIAN COSINE SIMILARITY UNTUK MASING-MASING TABEL
-- ==========================================================

-- 1. Fungsi Pencarian untuk Chunking per Kalimat
CREATE OR REPLACE FUNCTION match_chunk_sentence (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  journal_id uuid,
  text_content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunk_sentence.id,
    chunk_sentence.journal_id,
    chunk_sentence.text_content,
    1 - (chunk_sentence.embedding <=> query_embedding) AS similarity
  FROM chunk_sentence
  WHERE 1 - (chunk_sentence.embedding <=> query_embedding) > match_threshold
  ORDER BY chunk_sentence.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 2. Fungsi Pencarian untuk Chunking per Kata (Token)
CREATE OR REPLACE FUNCTION match_chunk_word (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  journal_id uuid,
  text_content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunk_word.id,
    chunk_word.journal_id,
    chunk_word.text_content,
    1 - (chunk_word.embedding <=> query_embedding) AS similarity
  FROM chunk_word
  WHERE 1 - (chunk_word.embedding <=> query_embedding) > match_threshold
  ORDER BY chunk_word.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 3. Fungsi Pencarian untuk Chunking per Karakter
CREATE OR REPLACE FUNCTION match_chunk_character (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  journal_id uuid,
  text_content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunk_character.id,
    chunk_character.journal_id,
    chunk_character.text_content,
    1 - (chunk_character.embedding <=> query_embedding) AS similarity
  FROM chunk_character
  WHERE 1 - (chunk_character.embedding <=> query_embedding) > match_threshold
  ORDER BY chunk_character.embedding <=> query_embedding
  LIMIT match_count;
$$;
