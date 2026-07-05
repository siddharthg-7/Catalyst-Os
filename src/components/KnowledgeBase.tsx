import React, { useState, useRef } from 'react';
import { KnowledgeFile } from '../types';
import {
  UploadCloud, FileText, Search, Sparkles, Send, Calendar,
  HardDrive, Loader2, CheckCircle2, AlertTriangle, X,
  Globe, Github, Link2, FileUp, BookOpen, ChevronDown,
  Lightbulb, Clock, ArrowRight
} from 'lucide-react';

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

const DOC_TYPES = [
  { value: 'pitch_deck', label: 'Pitch Deck' },
  { value: 'business_plan', label: 'Business Plan' },
  { value: 'financial_reports', label: 'Financial Report' },
  { value: 'hiring_docs', label: 'Hiring Document' },
  { value: 'meeting_notes', label: 'Meeting Notes' },
  { value: 'legal', label: 'Legal Document' },
  { value: 'other', label: 'Other' },
];

const QUICK_PROMPTS = [
  "Summarize my pitch deck",
  "What are our key goals?",
  "How much runway do we have?",
  "What risks did investors mention?",
];

const UPLOAD_CARDS = [
  { id: 'file',    icon: FileUp,       label: 'Documents',   desc: 'PDF, DOCX, PPTX, TXT, CSV',   color: 'text-gray-900', bg: 'bg-gray-50' },
  { id: 'website', icon: Globe,        label: 'Website',     desc: 'Add any website or link',       color: 'text-blue-600',   bg: 'bg-blue-50' },
  { id: 'github',  icon: Github,       label: 'GitHub',      desc: 'Sync a repository',             color: 'text-gray-700',   bg: 'bg-gray-100' },
  { id: 'notion',  icon: BookOpen,     label: 'Notion',      desc: 'Connect your Notion pages',     color: 'text-orange-500', bg: 'bg-orange-50' },
];

const FILE_ICON_COLOR: Record<string, string> = {
  pitch_deck: 'text-gray-700',
  business_plan: 'text-blue-500',
  financial_reports: 'text-emerald-500',
  hiring_docs: 'text-pink-500',
  meeting_notes: 'text-amber-500',
  legal: 'text-red-500',
  other: 'text-gray-400',
};

export default function KnowledgeBase({ documents, onUploadDoc }: KnowledgeBaseProps) {
  const [uploadTab, setUploadTab] = useState<'file' | 'paste' | 'website' | 'github' | 'notion'>('file');
  const [docType, setDocType] = useState('pitch_deck');
  const [isDragging, setIsDragging] = useState(false);
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [successToast, setSuccessToast] = useState(false);

  // Paste text state
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Website / GitHub / Notion inputs
  const [webUrl, setWebUrl] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [notionUrl, setNotionUrl] = useState('');

  // Selected doc for overview
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const activeDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  // Ask Catalyst
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File upload logic ──────────────────────────────────────────────────────
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
          error: 'Unsupported format. Use PDF, DOCX, PPTX, CSV or TXT.'
        }, ...prev]);
        return;
      }

      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
      setActiveUploads(prev => [{ id: uploadId, name: file.name, size: sizeStr, progress: 10, status: 'reading' }, ...prev]);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 30, status: 'uploading' } : u));
          const dataUrl = event.target?.result as string;
          const base64Data = dataUrl.split(',')[1];

          let progressVal = 30;
          const interval = setInterval(() => {
            progressVal += 8;
            if (progressVal > 85) clearInterval(interval);
            else setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: progressVal, status: progressVal > 65 ? 'analyzing' : 'uploading' } : u));
          }, 350);

          await onUploadDoc(file.name, '', docType, base64Data, file.type);
          clearInterval(interval);
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u));
          setSuccessToast(true);
          setTimeout(() => setSuccessToast(false), 5000);
          setTimeout(() => setActiveUploads(prev => prev.filter(u => u.id !== uploadId)), 6000);
        } catch (err: any) {
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'failed', error: err.message || 'Upload failed' } : u));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files) as File[]);
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docContent) return;
    setIsUploading(true);
    try { await onUploadDoc(docName, docContent, docType); setDocName(''); setDocContent(''); }
    catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  const handleQuerySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsQuerying(true); setQueryAnswer(null);
    try {
      const res = await fetch('/api/knowledge/query', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (res.ok) { const data = await res.json(); setQueryAnswer(data.answer); }
    } catch (err) { console.error(err); }
    finally { setIsQuerying(false); }
  };

  const TABS: { id: typeof uploadTab; label: string }[] = [
    { id: 'file', label: 'Upload Files' },
    { id: 'paste', label: 'Paste Text' },
    { id: 'website', label: 'Website URL' },
    { id: 'github', label: 'GitHub Repo' },
    { id: 'notion', label: 'Notion' },
  ];

  return (
    <div className="space-y-6 pb-8 font-sans">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Knowledge Center</h1>
        <p className="text-sm text-gray-400 mt-1">Teach Catalyst everything about your company.</p>
      </div>

      {/* ── Success toast ───────────────────────────────────────────────── */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-white border border-emerald-100 shadow-lg rounded-2xl px-4 py-3 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-sm text-gray-700 font-medium">Document added successfully. Catalyst is ready to answer your questions.</p>
          <button onClick={() => setSuccessToast(false)} className="text-gray-300 hover:text-gray-500 ml-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Main 2-column layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* ════ LEFT COLUMN ════════════════════════════════════════════════ */}
        <div className="space-y-5">

          {/* Add Knowledge card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Add Knowledge</h2>
              <p className="text-xs text-gray-400 mt-0.5">Upload documents, links, and sources so Catalyst can learn about your startup.</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setUploadTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    uploadTab === tab.id
                      ? 'bg-gray-900 text-white shadow-sm shadow-gray-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Doc type selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">What type of document is this?</label>
              <div className="relative">
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100 cursor-pointer pr-8"
                >
                  {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* ── Tab: Upload Files ── */}
            {uploadTab === 'file' && (
              <div className="space-y-4">
                {/* 2x2 source cards */}
                <div className="grid grid-cols-2 gap-3">
                  {UPLOAD_CARDS.map(card => (
                    <button
                      key={card.id}
                      onClick={() => card.id === 'file' ? fileInputRef.current?.click() : undefined}
                      className="flex flex-col items-start gap-2 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-all cursor-pointer text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                        <card.icon className={`w-4 h-4 ${card.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{card.label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{card.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Drag & drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                    isDragging
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-200 hover:bg-gray-50/30'
                  }`}
                >
                  <UploadCloud className={`w-7 h-7 ${isDragging ? 'text-gray-700' : 'text-gray-300'}`} />
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">Drag & drop files here</span>, or{' '}
                    <span className="text-gray-900 font-semibold">browse</span>
                  </p>
                  <p className="text-[11px] text-gray-400">Supports PDF, DOCX, PPTX, CSV (max 10MB)</p>
                </div>
                <input ref={fileInputRef} type="file" multiple onChange={e => { if (e.target.files) processFiles(Array.from(e.target.files) as File[]); }} accept=".pdf,.docx,.pptx,.csv,.txt,.md" className="hidden" />

                {/* Upload progress items */}
                {activeUploads.length > 0 && (
                  <div className="space-y-2">
                    {activeUploads.map(upload => (
                      <div key={upload.id} className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        upload.status === 'failed' ? 'bg-rose-50 border-rose-100' : 'bg-white border-gray-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700 truncate max-w-[70%]">{upload.name}</span>
                          {upload.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                          {upload.status === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />}
                          {['reading', 'uploading', 'analyzing'].includes(upload.status) && <Loader2 className="w-4 h-4 text-gray-700 animate-spin shrink-0" />}
                        </div>

                        {upload.status !== 'failed' && (
                          <>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-500 rounded-full transition-all duration-300" style={{ width: `${upload.progress}%` }} />
                            </div>
                            <p className={`text-[10px] ${upload.status === 'completed' ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {upload.status === 'reading' && 'Reading file...'}
                              {upload.status === 'uploading' && 'Catalyst is learning from your document...'}
                              {upload.status === 'analyzing' && 'Catalyst is learning from your document...'}
                              {upload.status === 'completed' && 'Document ready ✓'}
                            </p>
                          </>
                        )}
                        {upload.status === 'failed' && <p className="text-rose-600">{upload.error}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Paste Text ── */}
            {uploadTab === 'paste' && (
              <form onSubmit={handlePasteSubmit} className="space-y-3">
                <input
                  type="text" placeholder="Document name" value={docName}
                  onChange={e => setDocName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
                />
                <textarea
                  placeholder="Paste your content here..." value={docContent}
                  onChange={e => setDocContent(e.target.value)} rows={6}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 resize-none"
                />
                <button
                  type="submit" disabled={!docName || !docContent || isUploading}
                  className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Saving...' : 'Add to Knowledge'}
                </button>
              </form>
            )}

            {/* ── Tab: Website URL ── */}
            {uploadTab === 'website' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="url" placeholder="https://yourwebsite.com" value={webUrl}
                      onChange={e => setWebUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
                    />
                  </div>
                  <button className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors">Import</button>
                </div>
                <p className="text-xs text-gray-400">Catalyst will read and extract knowledge from the page.</p>
              </div>
            )}

            {/* ── Tab: GitHub Repo ── */}
            {uploadTab === 'github' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="https://github.com/yourorg/yourrepo" value={githubRepo}
                      onChange={e => setGithubRepo(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
                    />
                  </div>
                  <button className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors">Sync</button>
                </div>
                <p className="text-xs text-gray-400">Catalyst will index your repository's README and key files.</p>
              </div>
            )}

            {/* ── Tab: Notion ── */}
            {uploadTab === 'notion' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="url" placeholder="https://notion.so/your-page" value={notionUrl}
                      onChange={e => setNotionUrl(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300"
                    />
                  </div>
                  <button className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">Connect</button>
                </div>
                <p className="text-xs text-gray-400">Connect a public Notion page to bring in your company docs.</p>
              </div>
            )}
          </div>

          {/* ── Your Documents (Document Library) ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Your Documents</h3>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                No documents yet. Upload your first file above.
              </div>
            ) : (
              <div className="space-y-1">
                {documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      selectedDocId === doc.id
                        ? 'bg-gray-50 border border-gray-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <FileText className={`w-4 h-4 shrink-0 ${FILE_ICON_COLOR[doc.type] ?? 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 capitalize">{doc.type.replace('_', ' ')}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-[10px] text-gray-400">{doc.size}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {new Date(doc.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT COLUMN ════════════════════════════════════════════════ */}
        <div className="xl:col-span-2 space-y-4">
          {activeDoc ? (
            <>
              {/* A. Document Overview */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Document Overview</p>
                    <h3 className="text-base font-bold text-gray-900">{activeDoc.name}</h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(activeDoc.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> {activeDoc.size}</span>
                  </div>
                </div>
              </div>

              {/* B. AI Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-700" />
                  <h3 className="text-sm font-bold text-gray-900">AI Summary</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {activeDoc.summary || 'Catalyst is still processing this document. Check back shortly for an AI-generated summary.'}
                </p>
              </div>

              {/* C. What Catalyst Learned */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-gray-700" />
                  <h3 className="text-sm font-bold text-gray-900">What Catalyst Learned</h3>
                </div>
                {activeDoc.insights && activeDoc.insights.length > 0 ? (
                  <ul className="space-y-2.5">
                    {activeDoc.insights.slice(0, 5).map((insight, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-gray-500" />
                        </span>
                        <p className="text-sm text-gray-600 leading-relaxed">{insight}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">No insights extracted yet. Upload a document to see what Catalyst learns.</p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">Select a document to see its summary and insights</p>
              <p className="text-xs text-gray-400 mt-1">Or upload your first document on the left.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Ask Catalyst (full-width bottom) ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Ask Catalyst about your knowledge</h2>
          <p className="text-xs text-gray-400 mt-0.5">Ask any question about your uploaded documents. Catalyst will search, understand, and answer.</p>
        </div>

        <form onSubmit={handleQuerySubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ask anything about your startup, documents, or strategy..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isQuerying}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isQuerying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Ask
          </button>
        </form>

        {/* Quick prompt chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => setQuery(p)}
              className="text-xs text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-50 border border-gray-100 hover:border-gray-200 px-3 py-1.5 rounded-full transition-all"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Answer */}
        {(isQuerying || queryAnswer) && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            {isQuerying && (
              <div className="flex items-center gap-2 text-gray-900 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Catalyst is searching your documents...
              </div>
            )}
            {queryAnswer && (
              <>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Catalyst's Answer
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{queryAnswer}</p>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
