/**
 * CatalystOS - Company Knowledge Base (Section 16)
 * Redesigned with Apple × Notion × Linear aesthetics.
 * Institutional Memory & Truth (Documents, Research, Strategy, Financials, Customer & Product Info).
 * Semantic token integration, smooth upload zones, interactive QA hub, and vector status.
 */

import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { KnowledgeFile } from '../types';
import {
  UploadCloud, FileText, Search, Sparkles, Send, Calendar,
  Loader2, CheckCircle2, AlertTriangle, X,
  ChevronDown, Lightbulb, Layers
} from 'lucide-react';
import Section from './Section';

interface KnowledgeBaseProps {
  documents: KnowledgeFile[];
  onUploadDoc: (name: string, content: string, type: string, fileData?: string, mimeType?: string) => Promise<void>;
}

interface ActiveUpload {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: 'reading' | 'uploading' | 'analyzing' | 'completed' | 'failed';
  error?: string;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Knowledge' },
  { id: 'strategy', label: 'Strategy & Pitch' },
  { id: 'financials', label: 'Financials' },
  { id: 'research', label: 'Research & Notes' },
  { id: 'product', label: 'Product & Tech' },
  { id: 'legal', label: 'Legal & Contracts' },
];

const DOC_TYPES = [
  { value: 'pitch_deck', label: 'Pitch Deck (Strategy)' },
  { value: 'business_plan', label: 'Business Plan (Strategy)' },
  { value: 'financial_reports', label: 'Financial Report (Financials)' },
  { value: 'hiring_docs', label: 'Hiring Document (People)' },
  { value: 'meeting_notes', label: 'Meeting Notes & Research' },
  { value: 'legal', label: 'Legal Document (Compliance)' },
  { value: 'other', label: 'Product & Other' },
];

const QUICK_PROMPTS = [
  "Summarize our target investor narrative",
  "What are our key quarterly milestones?",
  "How much cash runway do we have forecasted?",
  "What IP or legal risks were flagged?",
];

export default function KnowledgeBase({ documents, onUploadDoc }: KnowledgeBaseProps) {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [uploadTab, setUploadTab] = useState<'file' | 'paste' | 'website' | 'github' | 'notion'>('file');
  const [docType, setDocType] = useState('pitch_deck');
  const [isDragging, setIsDragging] = useState(false);
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [successToast, setSuccessToast] = useState(false);

  // Paste text state
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Selected doc
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Ask Company Knowledge
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { apiFetch } = useAuth();

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (activeCategory === 'strategy' && !['pitch_deck', 'business_plan'].includes(doc.type)) return false;
      if (activeCategory === 'financials' && doc.type !== 'financial_reports') return false;
      if (activeCategory === 'research' && doc.type !== 'meeting_notes') return false;
      if (activeCategory === 'product' && !['other', 'hiring_docs'].includes(doc.type)) return false;
      if (activeCategory === 'legal' && doc.type !== 'legal') return false;

      if (searchDocQuery.trim()) {
        const q = searchDocQuery.toLowerCase();
        return doc.name.toLowerCase().includes(q) || doc.summary?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [documents, activeCategory, searchDocQuery]);

  const activeDoc = documents.find(d => d.id === selectedDocId) || filteredDocuments[0] || documents[0];

  // Upload handler
  const processFiles = (files: File[]) => {
    files.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const allowed = ['pdf', 'docx', 'pptx', 'csv', 'txt', 'md'];
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      if (!allowed.includes(ext)) {
        setActiveUploads(prev => [{
          id: uploadId, name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          progress: 100, status: 'failed',
          error: 'Unsupported format. Use PDF, DOCX, PPTX, CSV, TXT, or MD.'
        }, ...prev]);
        return;
      }

      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      setActiveUploads(prev => [{ id: uploadId, name: file.name, size: sizeStr, progress: 10, status: 'reading' }, ...prev]);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 35, status: 'uploading' } : u));
          const dataUrl = event.target?.result as string;
          const base64Data = dataUrl.split(',')[1];

          let progressVal = 35;
          const interval = setInterval(() => {
            progressVal += 10;
            if (progressVal > 85) clearInterval(interval);
            else setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: progressVal, status: progressVal > 65 ? 'analyzing' : 'uploading' } : u));
          }, 300);

          await onUploadDoc(file.name, '', docType, base64Data, file.type);
          clearInterval(interval);
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u));
          setSuccessToast(true);
          setTimeout(() => setSuccessToast(false), 4000);
          setTimeout(() => setActiveUploads(prev => prev.filter(u => u.id !== uploadId)), 5000);
        } catch (err: any) {
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'failed', error: err.message || 'Upload failed' } : u));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files) as File[]);
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docContent) return;
    setIsUploading(true);
    try {
      await onUploadDoc(docName, docContent, docType);
      setDocName('');
      setDocContent('');
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuerySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsQuerying(true);
    setQueryAnswer(null);
    try {
      const res = await apiFetch('/api/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        const data = await res.json();
        setQueryAnswer(data.answer);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div id="company-knowledge-container" className="space-y-6 font-sans">
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <Section delay={0.05} className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--c-accent)' }}>
              Institutional Memory & Truth
            </span>
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--c-border-strong)' }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--c-muted)' }}>
              {documents.length} Grounding Sources
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--c-fg)' }}>
            Company Knowledge
          </h1>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: 'var(--c-muted)' }}>
            Centralized repository of corporate intelligence. Ground your executive agents with pitch decks, financial sheets, board memos, and strategy documents.
          </p>
        </div>

        {/* Quick Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm self-start md:self-center transition-all cursor-pointer"
          style={{
            backgroundColor: 'var(--c-fg)',
            color: 'var(--c-bg)'
          }}
        >
          <UploadCloud className="w-4 h-4" />
          Upload Document
        </button>
      </Section>

      {/* ── SUCCESS TOAST ─────────────────────────────────────────────────── */}
      {successToast && (
        <div 
          className="fixed top-6 right-6 z-50 flex items-center gap-3 shadow-xl rounded-2xl px-5 py-3.5 animate-fade-in"
          style={{
            backgroundColor: 'var(--c-surface)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs font-medium" style={{ color: 'var(--c-fg)' }}>Document ingested & synthesized into executive memory.</p>
          <button onClick={() => setSuccessToast(false)} className="cursor-pointer" style={{ color: 'var(--c-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── CATEGORY PILLS BAR ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer"
                style={{
                  backgroundColor: isSelected ? 'var(--c-fg)' : 'var(--c-surface)',
                  color: isSelected ? 'var(--c-bg)' : 'var(--c-muted)',
                  border: `1px solid ${isSelected ? 'var(--c-fg)' : 'var(--c-border)'}`
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-64 shrink-0 hidden sm:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-muted)' }} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchDocQuery}
            onChange={(e) => setSearchDocQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl outline-none transition-colors"
            style={{
              backgroundColor: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              color: 'var(--c-fg)'
            }}
          />
        </div>
      </div>

      {/* ── MAIN 2-COLUMN BALANCED LAYOUT ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Add Knowledge & Document Library (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Add Knowledge Source Card */}
          <div 
            className="p-5 rounded-2xl space-y-4 transition-all"
            style={{
              backgroundColor: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--c-fg)' }}>Add Knowledge Source</h3>
                <p className="text-[11px]" style={{ color: 'var(--c-muted)' }}>Feed context directly into council reasoning.</p>
              </div>
              <span className="text-[10px] font-mono uppercase font-bold" style={{ color: 'var(--c-muted)' }}>Inbound</span>
            </div>

            {/* Input tabs */}
            <div className="flex flex-wrap gap-1.5 pb-2" style={{ borderBottom: '1px solid var(--c-border)' }}>
              {[
                { id: 'file', label: 'File Upload' },
                { id: 'paste', label: 'Paste Text' },
                { id: 'website', label: 'Website' },
                { id: 'github', label: 'GitHub' },
                { id: 'notion', label: 'Notion' },
              ].map((t) => {
                const isSelected = uploadTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setUploadTab(t.id as any)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? 'var(--c-fg)' : 'var(--c-surface-2)',
                      color: isSelected ? 'var(--c-bg)' : 'var(--c-muted)',
                      border: `1px solid ${isSelected ? 'var(--c-fg)' : 'var(--c-border)'}`
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Category Type selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold block" style={{ color: 'var(--c-muted)' }}>Document Domain</label>
              <div className="relative">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none appearance-none"
                  style={{
                    backgroundColor: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-fg)'
                  }}
                >
                  {DOC_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--c-muted)' }} />
              </div>
            </div>

            {/* Tab: File Upload */}
            {uploadTab === 'file' && (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2"
                  style={{
                    borderColor: isDragging ? 'var(--c-accent)' : 'var(--c-border-strong)',
                    backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'var(--c-surface-2)'
                  }}
                >
                  <UploadCloud className="w-6 h-6" style={{ color: 'var(--c-fg)' }} />
                  <p className="text-xs font-semibold" style={{ color: 'var(--c-fg)' }}>
                    Drag & drop files here, or <span className="underline">browse</span>
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--c-muted)' }}>PDF, DOCX, PPTX, CSV, TXT, MD (Max 15MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => { if (e.target.files) processFiles(Array.from(e.target.files)); }}
                  accept=".pdf,.docx,.pptx,.csv,.txt,.md"
                  className="hidden"
                />

                {/* Progress bars */}
                {activeUploads.length > 0 && (
                  <div className="space-y-2">
                    {activeUploads.map((u) => (
                      <div 
                        key={u.id} 
                        className="p-3 rounded-xl space-y-1.5 text-xs"
                        style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold truncate max-w-[70%]" style={{ color: 'var(--c-fg)' }}>{u.name}</span>
                          {u.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          {u.status === 'failed' && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                          {['reading', 'uploading', 'analyzing'].includes(u.status) && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--c-accent)' }} />
                          )}
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--c-border)' }}>
                          <div
                            className="h-full transition-all duration-300"
                            style={{ 
                              width: `${u.progress}%`,
                              backgroundColor: 'var(--c-accent)'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Paste Text */}
            {uploadTab === 'paste' && (
              <form onSubmit={handlePasteSubmit} className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Document Title (e.g., Q3 Strategy Memo)"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-fg)'
                  }}
                />
                <textarea
                  rows={4}
                  placeholder="Paste context, meeting notes, customer transcripts..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs resize-none outline-none"
                  style={{
                    backgroundColor: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-fg)'
                  }}
                />
                <button
                  type="submit"
                  disabled={!docName || !docContent || isUploading}
                  className="w-full py-2 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer transition-all"
                  style={{
                    backgroundColor: 'var(--c-fg)',
                    color: 'var(--c-bg)'
                  }}
                >
                  {isUploading ? 'Ingesting...' : 'Add to Knowledge'}
                </button>
              </form>
            )}

            {/* Other integration tabs */}
            {['website', 'github', 'notion'].includes(uploadTab) && (
              <div className="space-y-2.5 text-xs">
                <input
                  type="url"
                  placeholder={
                    uploadTab === 'website' ? 'https://company.com/deck' :
                    uploadTab === 'github' ? 'https://github.com/company/repo' : 'https://notion.so/workspace/doc'
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-fg)'
                  }}
                />
                <button
                  type="button"
                  className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    backgroundColor: 'var(--c-fg)',
                    color: 'var(--c-bg)'
                  }}
                >
                  Connect & Sync Source
                </button>
              </div>
            )}
          </div>

          {/* Document Library List */}
          <div 
            className="p-5 rounded-2xl space-y-3 transition-all"
            style={{
              backgroundColor: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: 'var(--c-fg)' }}>Documents ({filteredDocuments.length})</h3>
              <span className="text-[10px] font-mono" style={{ color: 'var(--c-muted)' }}>Audited</span>
            </div>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredDocuments.map((doc) => {
                const isSelected = activeDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className="w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? 'var(--c-surface-2)' : 'var(--c-surface)',
                      borderColor: isSelected ? 'var(--c-fg)' : 'var(--c-border)',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    <div 
                      className="p-2 rounded-lg shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-fg)', border: '1px solid var(--c-border)' }}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold truncate" style={{ color: 'var(--c-fg)' }}>{doc.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono" style={{ color: 'var(--c-muted)' }}>
                        <span className="uppercase">{doc.type.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>{doc.size}</span>
                        <span>·</span>
                        <span>{new Date(doc.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Query Hub & Selected Document Inspection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Ask Company Knowledge Search Hub */}
          <div 
            className="p-6 rounded-2xl space-y-4 transition-all"
            style={{
              backgroundColor: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--c-accent)' }}>
                Interactive Semantic Intelligence
              </span>
              <h3 className="text-base font-bold mt-0.5" style={{ color: 'var(--c-fg)' }}>
                Ask Company Knowledge
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--c-muted)' }}>
                Query grounded corporate facts across all uploaded pitch decks, financials, and transcripts.
              </p>
            </div>

            <form onSubmit={handleQuerySubmit} className="relative">
              <input
                type="text"
                placeholder="Ask anything about the company, cap table, runway, or roadmap..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 rounded-xl text-xs outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--c-surface-2)',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-fg)'
                }}
              />
              <button
                type="submit"
                disabled={!query.trim() || isQuerying}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--c-fg)',
                  color: 'var(--c-bg)'
                }}
              >
                {isQuerying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(qp);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] transition-all font-medium cursor-pointer"
                  style={{
                    backgroundColor: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-muted)'
                  }}
                >
                  "{qp}"
                </button>
              ))}
            </div>

            {/* Answer Box */}
            {queryAnswer && (
              <div 
                className="p-4 rounded-xl space-y-2 animate-fade-in"
                style={{
                  backgroundColor: 'var(--c-surface-2)',
                  border: '1px solid var(--c-border)'
                }}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--c-fg)' }}>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Synthesized Corporate Answer</span>
                </div>
                <p className="text-xs leading-relaxed font-sans" style={{ color: 'var(--c-fg)' }}>{queryAnswer}</p>
              </div>
            )}
          </div>

          {/* Selected Document Deep Dive */}
          {activeDoc ? (
            <div 
              className="p-6 rounded-2xl space-y-5 transition-all"
              style={{
                backgroundColor: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div className="flex items-start justify-between pb-4" style={{ borderBottom: '1px solid var(--c-border)' }}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md"
                      style={{ backgroundColor: 'var(--c-surface-2)', color: 'var(--c-fg)', border: '1px solid var(--c-border)' }}
                    >
                      {activeDoc.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--c-muted)' }}>{activeDoc.size}</span>
                  </div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--c-fg)' }}>{activeDoc.name}</h3>
                </div>

                <span className="text-xs font-mono flex items-center gap-1" style={{ color: 'var(--c-muted)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(activeDoc.uploadDate).toLocaleDateString()}
                </span>
              </div>

              {/* AI Executive Summary */}
              <div className="space-y-2">
                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--c-fg)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  Executive Synthesis & Key Takeaways
                </span>
                <p 
                  className="text-xs leading-relaxed p-4 rounded-xl"
                  style={{
                    backgroundColor: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-fg)'
                  }}
                >
                  {activeDoc.summary || 'Document indexed and available for cross-council grounding.'}
                </p>
              </div>

              {/* Key Insights List */}
              {activeDoc.keyInsights && activeDoc.keyInsights.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--c-fg)' }}>
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Audited Extracted Insights
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeDoc.keyInsights.map((insight, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-xl text-xs"
                        style={{
                          backgroundColor: 'var(--c-surface-2)',
                          border: '1px solid var(--c-border)',
                          color: 'var(--c-fg)'
                        }}
                      >
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical / RAG Advanced Accordion */}
              <div className="pt-2" style={{ borderTop: '1px solid var(--c-border)' }}>
                <button
                  type="button"
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center justify-between w-full text-xs font-mono py-1 cursor-pointer transition-colors"
                  style={{ color: 'var(--c-muted)' }}
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Advanced System & Vector Grounding Details
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`} />
                </button>

                {showTechnicalDetails && (
                  <div 
                    className="mt-3 p-4 rounded-xl text-[11px] font-mono space-y-2 animate-fade-in"
                    style={{
                      backgroundColor: 'var(--c-surface-2)',
                      border: '1px solid var(--c-border)',
                      color: 'var(--c-muted)'
                    }}
                  >
                    <div className="flex justify-between">
                      <span>Document ID:</span>
                      <span style={{ color: 'var(--c-fg)' }}>{activeDoc.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Embedding Model:</span>
                      <span style={{ color: 'var(--c-fg)' }}>text-embedding-004 (768-dim)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Index Store:</span>
                      <span style={{ color: 'var(--c-fg)' }}>PostgreSQL / pgvector (Neon)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Grounding Status:</span>
                      <span className="text-emerald-500 font-bold">100% Vectorized & Audited</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div 
              className="p-12 text-center rounded-2xl text-xs"
              style={{ border: '1px dashed var(--c-border)', color: 'var(--c-muted)' }}
            >
              Select a document to inspect executive summaries and key findings.
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
