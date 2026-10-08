-- ============================================================================
-- CatalystOS Native pgvector Migration & Performance Indexing (Section 8)
-- ============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Ensure native vector column with appropriate dimensions (768 for gemini-embedding)
ALTER TABLE "Embedding" ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Populate native embedding column from existing float array if needed
UPDATE "Embedding"
SET embedding = vector::text::vector
WHERE embedding IS NULL AND vector IS NOT NULL AND array_length(vector, 1) = 768;

-- 4. Create HNSW Cosine Index for O(log N) scalable vector retrieval
-- HNSW (Hierarchical Navigable Small World) provides superior query throughput and recall
CREATE INDEX IF NOT EXISTS embedding_hnsw_idx 
ON "Embedding" 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Create multi-tenant composite index on documents and chunks
CREATE INDEX IF NOT EXISTS idx_startup_doc_tenant 
ON "StartupDocument" ("startupId", "id");

CREATE INDEX IF NOT EXISTS idx_chunk_doc_lookup 
ON "KnowledgeChunk" ("documentId", "id");

-- 6. Verify native pgvector query plan:
-- EXPLAIN ANALYZE
-- SELECT c.id, c.content, c."documentId", d.name as "documentName",
--        1 - (e.embedding <=> '[0.1, 0.2, ...]'::vector) as similarity_score
-- FROM "KnowledgeChunk" c
-- JOIN "StartupDocument" d ON c."documentId" = d.id
-- JOIN "Embedding" e ON c.id = e."chunkId"
-- WHERE d."startupId" = 'stp_tenant_1'
-- ORDER BY e.embedding <=> '[0.1, 0.2, ...]'::vector ASC
-- LIMIT 5;
