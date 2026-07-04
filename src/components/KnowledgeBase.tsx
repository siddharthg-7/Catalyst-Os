import React, { useState } from 'react';
import { KnowledgeFile } from '../types';
import { 
  UploadCloud, 
  FileText, 
  Search, 
  Sparkles, 
  Send, 
  Calendar, 
  HardDrive, 
  BookOpen, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  File, 
  Plus
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

export default function KnowledgeBase({ documents, onUploadDoc }: KnowledgeBaseProps) {
  // Mode selection: 'file' for drag/drop, 'paste' for raw text pasting
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');

  // Paste Text Form State
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docType, setDocType] = useState('pitch_deck');
  const [isUploading, setIsUploading] = useState(false);

  // Active Multi-File Upload Queue
  const [activeUploads, setActiveUploads] = useState<ActiveUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Search/Query Console State
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);

  // Selected document to inspect
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const activeDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  // Helper to process multiple file uploads
  const processFiles = (files: File[]) => {
    files.forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'docx', 'pptx', 'csv', 'txt', 'md'];
      
      if (!allowedExtensions.includes(extension || '')) {
        // Show immediate validation error
        const failId = `fail_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        setActiveUploads(prev => [
          {
            id: failId,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            progress: 100,
            status: 'failed',
            error: 'Unsupported format. Use PDF, DOCX, PPTX, or CSV.'
          },
          ...prev
        ]);
        return;
      }

      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;

      // Create upload tracker
      const newUpload: ActiveUpload = {
        id: uploadId,
        name: file.name,
        size: sizeStr,
        progress: 10,
        status: 'reading'
      };

      setActiveUploads(prev => [newUpload, ...prev]);

      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          // File read successfully, update tracker
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 30, status: 'uploading' } : u));

          const dataUrl = event.target?.result as string;
          const base64Data = dataUrl.split(',')[1];
          const mimeType = file.type;

          // Fake incremental progress up to 85% for feedback
          let progressVal = 30;
          const interval = setInterval(() => {
            progressVal += 8;
            if (progressVal > 85) {
              clearInterval(interval);
            } else {
              setActiveUploads(prev => prev.map(u => u.id === uploadId ? { 
                ...u, 
                progress: progressVal, 
                status: progressVal > 65 ? 'analyzing' : 'uploading' 
              } : u));
            }
          }, 350);

          // Upload to server & process
          await onUploadDoc(file.name, '', docType, base64Data, mimeType);

          // Complete
          clearInterval(interval);
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u));

          // Clear completed upload tracker after 5 seconds automatically
          setTimeout(() => {
            setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
          }, 5000);

        } catch (err: any) {
          console.error(err);
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { 
            ...u, 
            status: 'failed', 
            error: err.message || 'Ingestion failed' 
          } : u));
        }
      };

      reader.onerror = () => {
        setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'failed', error: 'Could not read file.' } : u));
      };

      // Read binary files as data URL base64
      reader.readAsDataURL(file);
    });
  };

  // Drag-and-Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files) as File[];
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) as File[] : [];
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docContent) return;
    setIsUploading(true);
    try {
      await onUploadDoc(docName, docContent, docType);
      setDocName('');
      setDocContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setIsQuerying(true);
    setQueryAnswer(null);

    try {
      const res = await fetch('/api/knowledge/query', {
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
    <div id="knowledge-base-container" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Left Column: Archive Manager and Uploads */}
      <div className="space-y-4">
        
        {/* Document Ingestion Portal */}
        <div className="p-4 rounded-xl border border-[#27272A] bg-[#18181B] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <UploadCloud className="w-4 h-4 text-[#6366F1]" />
              Ingest Materials
            </h4>
            <div className="flex bg-zinc-950 p-0.5 rounded border border-[#27272A]">
              <button
                onClick={() => setActiveTab('file')}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${
                  activeTab === 'file' ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                File Upload
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all ${
                  activeTab === 'paste' ? 'bg-[#27272A] text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Paste Text
              </button>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            {activeTab === 'file' 
              ? 'Upload PDF, DOCX, PPTX, or CSV materials directly to feed deep intelligence into executive agents.' 
              : 'Paste plain text summaries, strategy sheets, or core values to augment agent matrices.'}
          </p>

          {/* Tab 1: Interactive File Drag & Drop */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-medium">Select target category:</span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="px-2 py-1 rounded bg-zinc-950 border border-[#27272A] text-[10px] text-zinc-300 focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="pitch_deck">Pitch Deck</option>
                  <option value="business_plan">Business Plan</option>
                  <option value="financial_reports">Financial Plan</option>
                  <option value="hiring_docs">Hiring Rules</option>
                  <option value="meeting_notes">Meeting Notes</option>
                </select>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-[#6366F1] bg-[#6366F1]/5' 
                    : 'border-[#27272A] bg-zinc-950/40 hover:bg-zinc-950/80 hover:border-zinc-700'
                }`}
              >
                <input
                  type="file"
                  id="file-upload-input"
                  multiple
                  accept=".pdf,.docx,.pptx,.csv,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-upload-input" className="cursor-pointer space-y-2 block">
                  <div className="mx-auto w-10 h-10 rounded-full bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1] transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-200">Drag & drop files here, or <span className="text-[#6366F1] hover:underline">browse</span></p>
                    <p className="text-[9px] text-zinc-500 mt-1 font-mono">Supports PDF, DOCX, PPTX, CSV (Max 10MB)</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Tab 2: Standard Text Ingest */}
          {activeTab === 'paste' && (
            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Asset Filename (e.g. Cap_Table.md)"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-[#27272A] text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#6366F1] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-zinc-950 border border-[#27272A] text-[10px] text-zinc-300 focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="pitch_deck">Pitch Deck</option>
                  <option value="business_plan">Business Plan</option>
                  <option value="financial_reports">Financial Plan</option>
                  <option value="hiring_docs">Hiring Rules</option>
                  <option value="meeting_notes">Meeting Notes</option>
                </select>

                <span className="text-[9px] text-zinc-500 font-mono text-right flex items-center justify-end">Plain UTF-8 text</span>
              </div>

              <div>
                <textarea
                  placeholder="Paste strategic text guidelines or markdown charts here..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-[#27272A] text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#6366F1] font-mono resize-none leading-normal"
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#6366F1]/85 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? 'Ingesting Context...' : 'Ingest Document'}
              </button>
            </form>
          )}

          {/* Active File Ingest Progress Monitors */}
          {activeUploads.length > 0 && (
            <div className="border-t border-[#27272A] pt-3 space-y-2">
              <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block">Ingest In Progress</span>
              <div className="space-y-2">
                {activeUploads.map((up) => (
                  <div key={up.id} className="p-2.5 rounded-lg bg-zinc-950 border border-[#27272A] space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {up.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : up.status === 'failed' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 text-[#6366F1] animate-spin shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold text-zinc-200 truncate">{up.name}</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono shrink-0">{up.size}</span>
                    </div>

                    {/* Progress Bar */}
                    {up.status !== 'failed' && (
                      <div className="space-y-1">
                        <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#6366F1] transition-all duration-300"
                            style={{ width: `${up.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                          <span className="capitalize">
                            {up.status === 'reading' && 'Reading local file...'}
                            {up.status === 'uploading' && 'Ingesting vector stream...'}
                            {up.status === 'analyzing' && 'Analyzing (Gemini parsing)...'}
                            {up.status === 'completed' && 'Fully indexed!'}
                          </span>
                          <span>{up.progress}%</span>
                        </div>
                      </div>
                    )}

                    {up.status === 'failed' && (
                      <div className="flex items-center justify-between text-[9px] text-rose-400 bg-rose-950/20 px-2 py-1 rounded border border-rose-950">
                        <span className="truncate">{up.error}</span>
                        <button 
                          onClick={() => setActiveUploads(prev => prev.filter(item => item.id !== up.id))}
                          className="hover:text-rose-200 ml-1 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Corporate Archive list */}
        <div className="space-y-3">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Document Library</span>
          
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  activeDoc?.id === doc.id
                    ? 'bg-[#18181B] border-[#27272A] shadow-sm shadow-[#6366F1]/5'
                    : 'bg-[#18181B]/30 border-[#27272A]/60 hover:bg-[#18181B]/60 hover:border-[#27272A]'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#6366F1]/10 text-[#6366F1] shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-zinc-200 truncate">{doc.name}</h5>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                    <span className="capitalize">{doc.type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main Details and Semantic Search Console */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Document Insights display */}
        {activeDoc ? (
          <div className="p-5 rounded-xl border border-[#27272A] bg-[#18181B] space-y-5 shadow-sm">
            <div className="flex items-start justify-between border-b border-[#27272A] pb-3">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Document Metadata Analysis</span>
                <h3 className="text-sm font-bold text-white mt-1">{activeDoc.name}</h3>
              </div>
              
              <div className="flex gap-4 text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(activeDoc.uploadDate).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> {activeDoc.size}</span>
              </div>
            </div>

            {/* AI Summary */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">AI Parse Summary</span>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-950/40 p-3.5 rounded-lg border border-[#27272A]/50">
                {activeDoc.summary}
              </p>
            </div>

            {/* Key Insights List */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Vetted Tactical Insights</span>
              <div className="grid grid-cols-1 gap-2.5">
                {activeDoc.insights.map((ins, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-[#27272A]/80 bg-zinc-950/20 flex items-start gap-2.5 text-xs text-zinc-400">
                    <Sparkles className="w-3.5 h-3.5 text-[#6366F1] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{ins}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 rounded-xl border border-dashed border-[#27272A] text-center text-zinc-500 text-xs">
            No materials ingested in library. Paste files on the left portal to begin.
          </div>
        )}

        {/* Semantic RAG Question Console */}
        <div className="p-5 rounded-xl border border-[#27272A] bg-[#18181B] space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#6366F1]" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Semantic Document Intelligence</h4>
          </div>
          <p className="text-xs text-zinc-400">Ask strategic questions over your ingested documents. The vector engine queries context and outlines answers with real citations.</p>

          <form onSubmit={handleQuerySubmit} className="flex gap-2.5">
            <input
              type="text"
              placeholder="e.g. Highlight our fundraising goals and option vesting rules..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              className="flex-1 px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#6366F1]"
            />
            <button
              type="submit"
              disabled={isQuerying}
              className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#6366F1]/85 font-bold text-xs text-white transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isQuerying ? 'Querying...' : 'Query'}
            </button>
          </form>

          {/* RAG Answer Display */}
          {queryAnswer && (
            <div className="p-4 rounded-lg bg-zinc-950/60 border border-[#27272A]/80 space-y-3 animate-fade-in text-xs leading-relaxed">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Semantic Engine Response
                </span>
                <span className="text-[9px] text-zinc-500">Citing active documents</span>
              </div>
              <div className="text-zinc-300 font-sans whitespace-pre-line leading-relaxed">
                {queryAnswer}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
