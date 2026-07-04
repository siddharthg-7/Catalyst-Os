import { chunkDocument, Chunk } from './chunker';
import { retrieveChunks } from './retriever';
import { rerankChunks } from './reranker';

export class VectorService {
  private chunks: Chunk[] = [];

  public indexDocument(id: string, name: string, content: string): void {
    const docChunks = chunkDocument(id, content, { source: name });
    this.chunks.push(...docChunks);
    console.log(`[VectorService] Indexed document "${name}" into ${docChunks.length} chunks. Total active chunks: ${this.chunks.length}`);
  }

  public clear(): void {
    this.chunks = [];
  }

  public async query(queryString: string, topK: number = 3): Promise<string> {
    if (this.chunks.length === 0) {
      return 'No corporate documentation indexed in RAG.';
    }

    try {
      const retrieved = await retrieveChunks(queryString, this.chunks, topK * 2);
      const reranked = rerankChunks(queryString, retrieved).slice(0, topK);

      return reranked.map(r => `[Source: ${r.chunk.metadata.source}] (Score: ${r.score.toFixed(3)})\n${r.chunk.text}`).join('\n\n');
    } catch (err) {
      console.error('[VectorService] Query failed:', err);
      // Fallback to simple keyword match if anything throws
      const queryLower = queryString.toLowerCase();
      const matches = this.chunks
        .filter(c => c.text.toLowerCase().includes(queryLower))
        .slice(0, topK);
      
      if (matches.length > 0) {
        return matches.map(m => `[Source: ${m.metadata.source}]\n${m.text}`).join('\n\n');
      }
      return 'No matching corporate documents found.';
    }
  }
}

export const vectorService = new VectorService();
