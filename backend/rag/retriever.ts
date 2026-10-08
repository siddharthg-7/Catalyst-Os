import { Chunk } from './chunker';
import { generateEmbedding, cosineSimilarity } from './embedder';

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
}

export async function retrieveChunks(
  query: string,
  chunks: Chunk[],
  topK: number = 3
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query);
  const scored: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    // We can pre-calculate or calculate on-the-fly
    const chunkEmbedding = await generateEmbedding(chunk.text);
    const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    scored.push({ chunk, score });
  }

  // Sort by score descending
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
