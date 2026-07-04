export interface Chunk {
  id: string;
  documentId: string;
  text: string;
  metadata: Record<string, any>;
}

export function chunkDocument(documentId: string, content: string, metadata: Record<string, any> = {}): Chunk[] {
  // Split on paragraphs or bullet boundaries
  const lines = content.split(/\n\s*\n/);
  const chunks: Chunk[] = [];

  let sequence = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 30) {
      chunks.push({
        id: `${documentId}_chunk_${sequence++}`,
        documentId,
        text: trimmed,
        metadata: {
          ...metadata,
          index: sequence
        }
      });
    }
  }

  return chunks;
}
