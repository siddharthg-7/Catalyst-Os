export interface Citation {
  documentId: string;
  sourceName: string;
  excerpt: string;
}

export function generateCitations(text: string, sourceDocs: Array<{ id: string; name: string; content: string }>): Citation[] {
  const citations: Citation[] = [];
  const lowerText = text.toLowerCase();

  for (const doc of sourceDocs) {
    // If the output references keywords unique to specific documents, cite them
    const keywords = doc.name.split('_').map(w => w.replace(/\.[a-z]+$/i, '').toLowerCase());
    const matchesKeyword = keywords.some(k => k.length > 3 && lowerText.includes(k));

    if (matchesKeyword) {
      citations.push({
        documentId: doc.id,
        sourceName: doc.name,
        excerpt: doc.content.substring(0, 180) + '...'
      });
    }
  }

  return citations;
}
