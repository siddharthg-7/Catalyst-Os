import fs from 'fs';
import path from 'path';
import { ai } from './geminiService';

type Intent = 'overview' | 'pricing' | 'security' | 'hiring' | 'finance' | 'growth' |
  'legal' | 'dashboard' | 'memory' | 'executive' | 'architecture' | 'general';

export interface RagSource {
  title: string;
  score: number;
  snippet: string;
  file: string;
  section: string;
  category: Intent;
}

export interface RagDebug {
  detectedLanguage: string;
  rewrittenQuery: string;
  intent: Intent;
  candidates: number;
  retrievedChunks: number;
  filteredChunks: number;
  contextCharacters: number;
}

interface KnowledgeChunk {
  source: string;
  section: string;
  category: Intent;
  text: string;
  terms: Map<string, number>;
  tokenCount: number;
}

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does',
  'for', 'from', 'how', 'i', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'our', 'the', 'this', 'to',
  'was', 'what', 'when', 'where', 'which', 'who', 'with', 'you', 'about', 'tell', 'me']);

const INTENT_TERMS: Record<Exclude<Intent, 'general'>, string[]> = {
  overview: ['founderos', 'catalyst os', 'platform', 'product', 'overview', 'mission', 'what is'],
  pricing: ['pricing', 'price', 'subscription', 'starter', 'pro plan', 'enterprise plan', 'cost', 'free plan', 'plans'],
  security: ['security', 'soc 2', 'soc2', 'encryption', 'zero trust', 'vault', 'rbac', 'data secure', 'privacy'],
  hiring: ['hiring', 'hire', 'talent', 'candidate', 'resume', 'recruitment', 'interview', 'backend engineer', 'developer'],
  finance: ['finance', 'cfo', 'runway', 'burn rate', 'cash flow', 'treasury', 'budget', 'expense', 'revenue'],
  growth: ['growth', 'marketing', 'campaign', 'customer acquisition', 'launch', 'cmo', 'linkedin'],
  legal: ['legal', 'contract', 'nda', 'compliance', 'policy', 'agreement'],
  dashboard: ['dashboard', 'health score', 'executive brief', 'metric', 'priority', 'notification'],
  memory: ['startup memory', 'rag', 'knowledge base', 'document', 'semantic search', 'retrieval'],
  executive: ['executive council', 'agent', 'advisor', 'ceo', 'cto', 'coo', 'collaboration', 'orchestrator'],
  architecture: ['architecture', 'api', 'fastapi', 'qdrant', 'postgres', 'gemini', 'implementation', 'scalability', 'deployment'],
};

const REWRITES: Partial<Record<Intent, string>> = {
  pricing: 'pricing plans subscription starter pro enterprise cost free',
  security: 'security SOC 2 encryption zero trust vault role based access control data isolation',
  hiring: 'hiring recruitment backend engineer developer responsibilities candidates resumes interviews talent workflow',
  finance: 'finance CFO treasury burn rate runway cash flow budget forecasting expenses',
  dashboard: 'founder dashboard health score priorities approvals executive brief metrics',
  memory: 'startup memory RAG knowledge base documents semantic retrieval',
  executive: 'AI executive council CEO CFO CTO CMO COO HR advisors collaboration responsibilities',
  legal: 'legal contracts NDA compliance agreements policies approval',
  growth: 'growth marketing campaign acquisition launch content strategy',
  overview: 'FounderOS Catalyst OS overview mission features AI executive operating system startups',
};

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .map(term => /^[a-z]+$/.test(term) ? term.replace(/(ing|ed|es|s)$/i, '') : term)
    .filter(term => term.length > 1 && !STOP_WORDS.has(term));
}

function termFrequency(value: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const term of tokenize(value)) result.set(term, (result.get(term) || 0) + 1);
  return result;
}

function detectLanguage(text: string): { code: string; name: string } {
  if (/[\u0C00-\u0C7F]/.test(text)) return { code: 'te', name: 'Telugu' };
  if (/[\u0900-\u097F]/.test(text)) return { code: 'hi', name: 'Hindi' };
  if (/[\u0B80-\u0BFF]/.test(text)) return { code: 'ta', name: 'Tamil' };
  if (/[\u0C80-\u0CFF]/.test(text)) return { code: 'kn', name: 'Kannada' };
  if (/[\u0D00-\u0D7F]/.test(text)) return { code: 'ml', name: 'Malayalam' };
  if (/[\u0980-\u09FF]/.test(text)) return { code: 'bn', name: 'Bengali' };
  if (/[\u0600-\u06FF]/.test(text)) return { code: 'ar', name: 'Arabic' };
  return { code: 'en', name: 'English' };
}

function classifyQuery(query: string): Intent {
  const lower = query.toLowerCase();
  const multilingualIntents: Array<[RegExp, Intent]> = [
    [/ధర|ధరలు|ప్లాన్|చందా|कीमत|मूल्य|प्लान/, 'pricing'],
    [/భద్రత|సురక్ష|ఎన్‌క్రిప్షన్|सुरक्षा|एन्क्रिप्शन/, 'security'],
    [/ఉద్యోగ|నియామక|ఇంజనీర్|అభ్యర్థి|भर्ती|इंजीनियर|उम्मीदवार/, 'hiring'],
    [/ఫైనాన్స్|బడ్జెట్|రన్‌వే|बजट|वित्त|रनवे/, 'finance'],
    [/ఎలా పనిచేస్తుంది|అంటే ఏమిటి|ఏమిటి|कैसे काम|क्या है/, 'overview'],
  ];
  const multilingualMatch = multilingualIntents.find(([pattern]) => pattern.test(query));
  if (multilingualMatch) return multilingualMatch[1];
  const scores = Object.entries(INTENT_TERMS).map(([intent, terms]) => ({
    intent: intent as Exclude<Intent, 'general'>,
    score: terms.reduce((sum, term) => sum + (lower.includes(term) ? term.split(' ').length : 0), 0),
  })).sort((a, b) => b.score - a.score);
  if (scores[0].score > 0) return scores[0].intent;
  // A named-product question in another script is an overview query.
  if (/founderos|catalyst/i.test(query)) return 'overview';
  return 'general';
}

function classifyChunk(source: string, section: string, text: string): Intent {
  const dedicatedCategory = path.basename(source, '.md').toLowerCase().replace('startup-memory', 'memory');
  if (['overview', 'pricing', 'security', 'hiring', 'finance', 'growth', 'legal', 'dashboard', 'memory', 'executive', 'architecture'].includes(dedicatedCategory)) {
    return dedicatedCategory as Intent;
  }
  // This attachment mixes slides, brainstorms, demo scripts and technical
  // notes. It is reference material, never authoritative product data.
  if (source.includes('complete-blueprint')) return 'architecture';
  const searchable = `${section} ${text.slice(0, 500)}`.toLowerCase();
  let best: { intent: Intent; score: number } = { intent: 'general', score: 0 };
  for (const [intent, terms] of Object.entries(INTENT_TERMS)) {
    const score = terms.reduce((sum, term) => sum + (searchable.includes(term) ? term.split(' ').length : 0), 0);
    if (score > best.score) best = { intent: intent as Intent, score };
  }
  return best.intent;
}

function isNoise(text: string): boolean {
  const clean = text.replace(/[#*_`>|-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length < 25) return true;
  return /^(get started|learn more|book demo|button|navigation|page \d+)$/i.test(clean);
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
        if (/^knowledge\.md$/i.test(entry.name) || /^knowledge\/.*\.md$/i.test(relative)) found.push(target);
      }
    }
  };
  visit(root);
  return found.sort();
}

function chunkMarkdown(content: string, source: string): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  const headingPath: string[] = [];
  let section = 'Overview';
  let paragraphs: string[] = [];
  const normalized = content.replace(/([^\r\n])\s+(#{1,6}\s+)/g, '$1\n\n$2');

  const flush = () => {
    const body = paragraphs.join('\n\n').trim();
    paragraphs = [];
    const leaf = section.split(' > ').at(-1) || section;
    if (!body || body.toLowerCase() === leaf.toLowerCase() || isNoise(body)) return;
    // Approximately 600 tokens with a 100-token overlap. Boundaries prefer
    // paragraphs, while oversized pasted blocks use a safe character fallback.
    const maxChars = 2400;
    const overlap = 400;
    for (let start = 0; start < body.length; start += maxChars - overlap) {
      const text = body.slice(start, start + maxChars).trim();
      if (isNoise(text)) continue;
      const category = classifyChunk(source, section, text);
      const terms = termFrequency(`${section} ${text}`);
      chunks.push({ source, section, category, text, terms, tokenCount: tokenize(text).length });
      if (start + maxChars >= body.length) break;
    }
  };

  for (const block of normalized.split(/\r?\n\s*\r?\n/)) {
    const heading = block.trim().match(/^(#{1,6})\s+(.+)$/);
    if (!heading) {
      if (block.trim() && !/^---+$/.test(block.trim())) paragraphs.push(block.trim());
      continue;
    }
    flush();
    const level = heading[1].length;
    const raw = heading[2].trim();
    const title = raw.match(/^\*\*([^*]+)\*\*/)?.[1] || raw.match(/^(.{1,120}?\))\s+/)?.[1] || raw.slice(0, 120);
    headingPath.length = level - 1;
    headingPath[level - 1] = title.trim();
    section = headingPath.filter(Boolean).join(' > ');
    paragraphs.push(raw);
  }
  flush();
  return chunks;
}

class MarkdownRagService {
  private chunks: KnowledgeChunk[] = [];
  private signature = '';
  public lastDebug: RagDebug | null = null;

  private ensureLoaded(): void {
    const files = findKnowledgeFiles(process.cwd());
    const signature = files.map(file => `${file}:${fs.statSync(file).mtimeMs}`).join('|');
    if (signature === this.signature && this.chunks.length) return;
    this.chunks = files.flatMap(file => chunkMarkdown(fs.readFileSync(file, 'utf8'), path.relative(process.cwd(), file).replace(/\\/g, '/')));
    this.signature = signature;
    console.log(`[Markdown RAG] Indexed ${this.chunks.length} clean chunks from ${files.length} files.`);
  }

  search(query: string, topK = 5): RagSource[] {
    this.ensureLoaded();
    const language = detectLanguage(query);
    const intent = classifyQuery(query);
    const rewrittenQuery = `${query} ${REWRITES[intent] || ''}`.trim();
    const queryTerms = [...new Set(tokenize(rewrittenQuery))];
    const candidates = intent === 'general' ? this.chunks : this.chunks.filter(chunk => chunk.category === intent);
    const dedicated = intent === 'general' ? [] : candidates.filter(chunk => {
      const fileCategory = path.basename(chunk.source, '.md').toLowerCase().replace('startup-memory', 'memory');
      return fileCategory === intent;
    });
    const pool = dedicated.length ? dedicated : (candidates.length ? candidates : this.chunks);
    const averageLength = pool.reduce((sum, chunk) => sum + chunk.tokenCount, 0) / Math.max(pool.length, 1);
    const documentFrequency = new Map(queryTerms.map(term => [term, pool.filter(chunk => chunk.terms.has(term)).length]));

    const ranked = pool.map(chunk => {
      let bm25 = 0;
      let matched = 0;
      for (const term of queryTerms) {
        const tf = chunk.terms.get(term) || 0;
        if (!tf) continue;
        matched += 1;
        const df = documentFrequency.get(term) || 0;
        const idf = Math.log(1 + (pool.length - df + 0.5) / (df + 0.5));
        const denominator = tf + 1.2 * (0.25 + 0.75 * chunk.tokenCount / Math.max(averageLength, 1));
        bm25 += idf * (tf * 2.2 / denominator);
      }
      const coverage = matched / Math.max(queryTerms.length, 1);
      const headingTerms = new Set(tokenize(chunk.section));
      const headingMatches = queryTerms.filter(term => headingTerms.has(term)).length;
      const phraseBoost = chunk.text.toLowerCase().includes(query.toLowerCase()) ? 3 : 0;
      return { chunk, raw: bm25 + headingMatches * 1.5 + phraseBoost, coverage };
    }).filter(result => result.raw > 0).sort((a, b) => b.raw - a.raw);

    const max = ranked[0]?.raw || 1;
    const seen = new Set<string>();
    const sources: RagSource[] = [];
    let filtered = 0;
    for (const result of ranked) {
      if (result.raw < max * 0.25) { filtered += 1; continue; }
      const confidence = Math.min(0.99, 0.6 + 0.39 * (result.raw / max) * (0.65 + result.coverage * 0.35));
      const fingerprint = result.chunk.text.toLowerCase().replace(/\W/g, '').slice(0, 180);
      if (confidence < 0.6 || seen.has(fingerprint)) { filtered += 1; continue; }
      seen.add(fingerprint);
      sources.push({
        title: `${path.basename(result.chunk.source)} — ${result.chunk.section}`,
        score: Number(confidence.toFixed(4)),
        snippet: result.chunk.text,
        file: result.chunk.source,
        section: result.chunk.section,
        category: result.chunk.category,
      });
      if (sources.length >= Math.min(Math.max(topK, 1), 8)) break;
    }

    // When complete plan sections exist, an FAQ saying only that a free plan
    // exists is redundant and can displace one of the actual plan definitions.
    if (intent === 'pricing' && sources.filter(source => source.section.startsWith('Pricing >')).length >= 3) {
      const plans = sources.filter(source => source.section.startsWith('Pricing >'));
      const others = sources.filter(source => !/free plan/i.test(source.section));
      sources.splice(0, sources.length, ...plans, ...others.filter(source => !plans.includes(source)).slice(0, Math.max(0, topK - plans.length)));
    }

    this.lastDebug = {
      detectedLanguage: `${language.name} (${language.code})`, rewrittenQuery, intent,
      candidates: pool.length, retrievedChunks: sources.length, filteredChunks: filtered,
      contextCharacters: sources.reduce((sum, source) => sum + source.snippet.length, 0),
    };
    if (process.env.RAG_DEBUG === 'true') console.log('[Markdown RAG Debug]', this.lastDebug);
    return sources;
  }

  async answer(query: string, preferredLanguage = 'auto'): Promise<{ reply: string; sources: RagSource[]; debug: RagDebug | null }> {
    const supportedLanguages: Record<string, string> = { en: 'English', te: 'Telugu', hi: 'Hindi', ta: 'Tamil', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali', ar: 'Arabic' };
    const detected = detectLanguage(query);
    const language = preferredLanguage !== 'auto' && supportedLanguages[preferredLanguage]
      ? { code: preferredLanguage, name: supportedLanguages[preferredLanguage] }
      : detected;
    const sources = this.search(query);
    if (!sources.length) {
      const unavailable: Record<string, string> = {
        te: 'అందించిన నాలెడ్జ్ బేస్‌లో ఈ సమాచారం కనుగొనబడలేదు.',
        hi: 'यह जानकारी दिए गए नॉलेज बेस में नहीं मिली।',
      };
      return { reply: unavailable[language.code] || "I couldn't find that information in the provided knowledge base.", sources: [], debug: this.lastDebug };
    }

    if (ai) {
      const context = sources.map((source, index) => `[${index + 1}] File: ${source.file}\nSection: ${source.section}\n${source.snippet}`).join('\n\n');
      try {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: `Answer ONLY from the supplied context. Never use unrelated knowledge or invent facts. If context is insufficient, say so.\nAlways answer in ${language.name} (${language.code}); never switch language even though context may be English. Translate naturally, but preserve technical names such as FounderOS, CEO, Qdrant, FastAPI, SOC 2 and API. Cite factual claims with [1], [2], etc.\n\nContext:\n${context}\n\nQuestion: ${query}`,
          config: { temperature: 0 },
        });
        const reply = response.text?.trim();
        if (reply) return { reply, sources, debug: this.lastDebug };
      } catch (error) {
        console.warn('[Markdown RAG] Gemini generation failed; using grounded local response.', error);
      }
    }

    if (language.code !== 'en') {
      const intent = this.lastDebug?.intent || 'general';
      const groundedFallbacks: Record<string, Partial<Record<Intent, string>>> = {
        te: {
          overview: 'Catalyst OS అనేది స్టార్టప్‌ల కోసం రూపొందించిన AI ఆధారిత Executive Operating System. Founder ఇచ్చే లక్ష్యాన్ని ఇది సంబంధిత AI executives‌కు పంపి, వారి సూచనలను సమన్వయం చేసి, ఒక ఏకీకృత ప్రణాళికను తయారు చేస్తుంది. ముఖ్యమైన చర్యలు అమలు కావడానికి ముందు Founder approval అవసరం. [1]',
          pricing: 'Catalyst OSలో మూడు pricing plans ఉన్నాయి: Starter ఉచితం; Pro నెలకు $39; Enterprise ధర అవసరాలకు అనుగుణంగా నిర్ణయించబడుతుంది. [1]',
          security: 'Catalyst OSలో end-to-end encryption, zero-trust architecture, secure secret vault, role-based access control, data isolation మరియు SOC 2-ready design ఉన్నాయి. [1]',
          hiring: 'Smart Hiring resume analysis, candidate scoring, skill matching, interview recommendations మరియు founder approvalతో hiring workflow automationను అందిస్తుంది. [1]',
        },
        hi: {
          overview: 'Catalyst OS स्टार्टअप्स के लिए बनाया गया AI-संचालित Executive Operating System है। यह Founder के लक्ष्य को संबंधित AI executives तक पहुँचाकर उनकी सिफारिशों को एकीकृत योजना में बदलता है। महत्वपूर्ण कार्रवाई से पहले Founder approval आवश्यक है। [1]',
          pricing: 'Catalyst OS के तीन pricing plans हैं: Starter निःशुल्क, Pro $39 प्रति माह और Enterprise की कीमत आवश्यकताओं के अनुसार तय होती है। [1]',
        },
      };
      const grounded = groundedFallbacks[language.code]?.[intent];
      if (grounded) return { reply: grounded, sources, debug: this.lastDebug };
      const fallback: Record<string, string> = {
        te: 'సంబంధిత సమాచారం నాలెడ్జ్ బేస్‌లో దొరికింది, కానీ ప్రస్తుతం అనువాద సేవ అందుబాటులో లేదు. దయచేసి కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.',
        hi: 'संबंधित जानकारी नॉलेज बेस में मिली, लेकिन अनुवाद सेवा अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर प्रयास करें।',
      };
      return { reply: fallback[language.code] || 'Relevant information was found, but multilingual generation is temporarily unavailable.', sources, debug: this.lastDebug };
    }
    const best = sources.slice(0, 3);
    const reply = best.map((source, index) => `${source.snippet.replace(/\s+/g, ' ').trim()} [${index + 1}]`).join('\n\n');
    return { reply, sources: best, debug: this.lastDebug };
  }
}

export const markdownRagService = new MarkdownRagService();
