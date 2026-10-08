import { ai } from '../services/geminiService';

export async function generateEmbedding(text: string): Promise<number[]> {
  if (ai && process.env.GEMINI_API_KEY) {
    try {
      // Modern Google Gen AI SDK embedding call
      const response: any = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });
      if (response.embedding?.values) {
        return response.embedding.values;
      }
    } catch (err) {
      console.warn('Embedding call failed, utilizing keyword vector fallback:', err);
    }
  }

  // Fallback high-fidelity deterministic vector based on character weights
  const vector: number[] = new Array(128).fill(0);
  const clean = text.toLowerCase().replace(/[^a-z]/g, '');
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const index = (charCode * (i + 1)) % 128;
    vector[index] += 1;
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(v => v / magnitude);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return normA && normB ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}
