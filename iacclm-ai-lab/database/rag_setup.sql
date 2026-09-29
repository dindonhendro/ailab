-- ================================================================
--  IACCLM AI Lab — Tahap 2: RAG Setup
--  Platform: Supabase Cloud (PostgreSQL)
-- ================================================================

-- 1. Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create reference_documents table
CREATE TABLE IF NOT EXISTS reference_documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL, -- e.g. 'kreatinin', 'glukosa', 'pedoman-umum'
  content     TEXT NOT NULL, -- paragraph content
  embedding   vector(1536),  -- vector representation (using text-embedding-3-small)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create match_documents similarity function
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_category text DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  title text,
  category text,
  content text,
  similarity float
) AS $$
  SELECT
    id,
    title,
    category,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM reference_documents
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
    AND (filter_category IS NULL OR category = filter_category)
  ORDER BY embedding <=> query_embedding LIMIT match_count;
$$ LANGUAGE sql;
