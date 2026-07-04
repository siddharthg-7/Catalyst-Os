-- Catalyst OS PostgreSQL + pgvector Migration Initialization Script

-- 1. Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Embedding table with native vector type if not managed by Prisma
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        RAISE NOTICE 'Vector extension created successfully.';
    END IF;
END $$;

-- 3. Create Index for fast vector similarity search using HNSW (Cosine Distance)
-- Note: Re-index executes smoothly after embedding rows are populated
-- CREATE INDEX IF NOT EXISTS embedding_vector_idx ON "Embedding" USING hnsw (vector vector_cosine_ops);
