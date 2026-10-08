import { RetrievedChunk } from './retriever';

export function rerankChunks(
  query: string,
  results: RetrievedChunk[]
): RetrievedChunk[] {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  return results.map(r => {
    let boost = 1.0;
    const text = r.chunk.text.toLowerCase();
    
    // Simple term-overlap boost
    for (const term of queryTerms) {
      if (text.includes(term)) {
        boost += 0.15;
      }
    }
    
    return {
      ...r,
      score: r.score * boost
    };
  }).sort((a, b) => b.score - a.score);
}
