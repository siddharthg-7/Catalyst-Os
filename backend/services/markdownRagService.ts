import fs from 'fs';
import path from 'path';
import { ai } from './geminiService';

export interface RagSource {
  title: string;
  score: number;
  snippet: string;
}

interface KnowledgeChunk {
  source: string;
  section: string;
  text: string;
  terms: Map<string, number>;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'for',
  'from', 'how', 'i', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'our', 'the',
  'this', 'to', 'was', 'what', 'when', 'where', 'which', 'who', 'with', 'you',
]);

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-z0-9]+/g) || [])
    .map(term => term.replace(/(ing|ed|es|s)$/i, ''))
    .filter(term => term.length > 1 && !STOP_WORDS.has(term));
}

function termFrequency(value: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const term of tokenize(value)) result.set(term, (result.get(term) || 0) + 1);
  return result;
}

function findKnowledgeFiles(root: string): string[] {
  const ignored = new Set(['.git', '.venv', 'node_modules', 'dist', '__pycache__']);
  const found: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(target);
      else {
        const relative = path.relative(root, target).replace(/\\/g, '/');
        const isNamedKnowledgeFile = /^knowledge\.md$/i.test(entry.name);
        const isKnowledgeDirectoryMarkdown = /^knowledge\/.*\.md$/i.test(relative);
        if (isNamedKnowledgeFile || isKnowledgeDirectoryMarkdown) found.push(target);
      }
    }
  };
  visit(root);
  return found.sort();
}

function chunkMarkdown(content: string, source: string): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  let section = 'Overview';
  const headingPath: string[] = [];
  let paragraphs: string[] = [];
  // Text pasted from chat/export tools often flattens `## Heading` markers onto
  // the preceding line. Restore their boundaries before parsing sections.
  const normalizedContent = content.replace(/([^\r\n])\s+(#{1,6}\s+)/g, '$1\n\n$2');

  const flush = () => {
    if (!paragraphs.length) return;
    const body = paragraphs.join('\n\n').trim();
    paragraphs = [];
    if (!body) return;
    const leafTitle = section.split(' > ').at(-1) || section;
    if (body.toLowerCase() === leafTitle.toLowerCase()) return;
    for (let start = 0; start < body.length; start += 900) {
      const text = body.slice(Math.max(0, start - (start ? 120 : 0)), start + 900).trim();
      if (text) chunks.push({ source, section, text, terms: termFrequency(`${section} ${text}`) });
    }
  };

  for (const block of normalizedContent.split(/\r?\n\s*\r?\n/)) {
    const heading = block.trim().match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      const rawHeading = heading[2].trim();
      const boldTitle = rawHeading.match(/^\*\*([^*]+)\*\*/)?.[1];
      const parentheticalTitle = rawHeading.match(/^(.{1,120}?\))\s+/)?.[1];
      const currentTitle = (boldTitle || parentheticalTitle || rawHeading.slice(0, 120)).trim();
      headingPath.length = level - 1;
      headingPath[level - 1] = currentTitle;
      section = headingPath.filter(Boolean).join(' > ');
      // Keep the full flattened heading block as searchable content. In a
      // normal Markdown file this only repeats a short title; in pasted
      // exports it preserves the body text that follows an inline heading.
      paragraphs.push(rawHeading);
    } else if (block.trim() && !/^---+$/.test(block.trim())) {
      paragraphs.push(block.trim());
    }
  }
  flush();
  return chunks;
}

class MarkdownRagService {
  private chunks: KnowledgeChunk[] = [];
  private signature = '';

  private ensureLoaded(): void {
    const files = findKnowledgeFiles(process.cwd());
    const signature = files.map(file => `${file}:${fs.statSync(file).mtimeMs}`).join('|');
    if (signature === this.signature && this.chunks.length) return;
    this.chunks = files.flatMap(file =>
      chunkMarkdown(fs.readFileSync(file, 'utf8'), path.relative(process.cwd(), file).replace(/\\/g, '/')),
    );
    this.signature = signature;
    console.log(`[Markdown RAG] Indexed ${this.chunks.length} chunks from ${files.length} knowledge.md file(s).`);
  }

  search(query: string, topK = 5): RagSource[] {
    this.ensureLoaded();
    const queryTerms = [...new Set(tokenize(query))];
    if (!queryTerms.length) return [];

    const documentFrequency = new Map<string, number>();
    for (const term of queryTerms) {
      documentFrequency.set(term, this.chunks.filter(chunk => chunk.terms.has(term)).length);
    }

    const ranked = this.chunks.map(chunk => {
      let raw = 0;
      let matched = 0;
      const normalizedQuery = ` ${tokenize(query).join(' ')} `;
      const normalizedSection = tokenize(chunk.section).join(' ');
      for (const term of queryTerms) {
        const frequency = chunk.terms.get(term) || 0;
        if (!frequency) continue;
        matched += 1;
        const inverseFrequency = Math.log((this.chunks.length + 1) / ((documentFrequency.get(term) || 0) + 1)) + 1;
        raw += (1 + Math.log(frequency)) * inverseFrequency;
        if (chunk.section.toLowerCase().includes(term)) raw += inverseFrequency * 1.5;
      }
      // A section explicitly named in the question (for example "Pro" or
      // "Startup Memory") is a much stronger signal than generic term overlap.
      if (normalizedSection && normalizedQuery.includes(` ${normalizedSection} `)) raw += 12;
      if (queryTerms.includes('pric') && normalizedSection.startsWith('pric ')) raw += 8;
      const coverage = matched / queryTerms.length;
      return { chunk, raw: raw * (0.5 + coverage), coverage };
    }).filter(item => item.raw > 0).sort((a, b) => b.raw - a.raw);

    const max = ranked[0]?.raw || 1;
    return ranked
      .filter(item => item.raw >= max * 0.2)
      .slice(0, Math.max(1, Math.min(topK, 10))).map(({ chunk, raw, coverage }) => ({
      title: `${chunk.source} — ${chunk.section}`,
      score: Number(Math.min(0.99, (raw / max) * (0.7 + coverage * 0.29)).toFixed(4)),
      snippet: chunk.text,
    }));
  }

  async answer(query: string): Promise<{ reply: string; sources: RagSource[] }> {
    const sources = this.search(query);
    if (!sources.length) {
      return { reply: "I couldn't find that information in the provided knowledge base.", sources: [] };
    }

    if (ai) {
      const context = sources.map((source, index) =>
        `[${index + 1}] ${source.title}\n${source.snippet}`,
      ).join('\n\n');
      try {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: `Answer the question only from the supplied context. If the context is insufficient, say so. Be concise and factual. Cite claims with [1], [2], etc.\n\nContext:\n${context}\n\nQuestion: ${query}`,
          config: { temperature: 0.1 },
        });
        const reply = response.text?.trim();
        if (reply) return { reply, sources };
      } catch (error) {
        console.warn('[Markdown RAG] Gemini generation failed; using grounded local response.', error);
      }
    }

    const best = sources.slice(0, 3);
    const details = best.map((source, index) => {
      const text = source.snippet.replace(/\s+/g, ' ').trim();
      return `${text}${/[.!?]$/.test(text) ? '' : '.'} [${index + 1}]`;
    });
    return { reply: details.join('\n\n'), sources: best };
  }
}

export const markdownRagService = new MarkdownRagService();
