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
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  X
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
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 30, status: 'uploading' } : u));

          const dataUrl = event.target?.result as string;
          const base64Data = dataUrl.split(',')[1];
          const mimeType = file.type;

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

          await onUploadDoc(file.name, '', docType, base64Data, mimeType);

          clearInterval(interval);
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: 'completed' } : u));

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

      reader.readAsDataURL(file);
    });
  };

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
    <div id="knowledge-base-container" className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans">
      
      {/* Left Column: Archive Manager and Uploads */}
      <div className="space-y-4">
        
        {/* Document Ingestion Portal */}
        <div className="p-5 rounded-[20px] border border-[#141413]/10 bg-white shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#141413] flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <UploadCloud className="w-4 h-4 text-[#141413]" />
              Ingest Materials
            </h4>
            <div className="flex bg-[#F3F0EE] p-0.5 rounded-full border border-[#141413]/10">
              <button
                onClick={() => setActiveTab('file')}
                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all cursor-pointer ${
                  activeTab === 'file' ? 'bg-[#141413] text-[#F3F0EE]' : 'text-[#696969] hover:text-[#141413]'
                }`}
              >
                File Upload
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all cursor-pointer ${
                  activeTab === 'paste' ? 'bg-[#141413] text-[#F3F0EE]' : 'text-[#696969] hover:text-[#141413]'
                }`}
              >
                Paste Text
              </button>
            </div>
          </div>
          <p className="text-xs text-[#696969] leading-relaxed">
            {activeTab === 'file' 
              ? 'Upload PDF, DOCX, PPTX, or CSV materials directly to feed deep intelligence into executive agents.' 
              : 'Paste plain text summaries, strategy sheets, or core values to augment agent matrices.'}
          </p>

          {/* Tab 1: Interactive File Drag & Drop */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#696969] font-bold font-mono uppercase tracking-wider">Select target category:</span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="px-2 py-1 rounded-[8px] bg-[#F3F0EE] border border-[#141413]/15 text-[10px] text-[#141413] focus:outline-none focus:border-[#141413]"
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
                className={`relative border-2 border-dashed rounded-[16px] p-6 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-[#141413] bg-[#F3F0EE]' 
                    : 'border-[#141413]/10 bg-[#FCFBFA] hover:bg-white hover:border-[#141413]/30'
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
                  <div className="mx-auto w-10 h-10 rounded-full bg-[#141413]/05 flex items-center justify-center text-[#141413] transition-transform">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#141413]">Drag & drop files here, or <span className="text-emerald-700 hover:underline">browse</span></p>
                    <p className="text-[9px] text-[#696969] mt-1 font-mono uppercase tracking-wider">Supports PDF, DOCX, PPTX, CSV (Max 10MB)</p>
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
                  className="w-full px-3 py-2 rounded-[12px] bg-white border border-[#141413]/15 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-[8px] bg-[#F3F0EE] border border-[#141413]/15 text-[10px] text-[#141413] focus:outline-none focus:border-[#141413]"
                >
                  <option value="pitch_deck">Pitch Deck</option>
                  <option value="business_plan">Business Plan</option>
                  <option value="financial_reports">Financial Plan</option>
                  <option value="hiring_docs">Hiring Rules</option>
                  <option value="meeting_notes">Meeting Notes</option>
                </select>

                <span className="text-[9px] text-[#696969] font-mono uppercase tracking-wider text-right flex items-center justify-end">Plain UTF-8 text</span>
              </div>

              <div>
                <textarea
                  placeholder="Paste strategic text guidelines or markdown charts here..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 rounded-[12px] bg-white border border-[#141413]/15 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-mono resize-none leading-normal"
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] transition-all disabled:opacity-50 cursor-pointer font-sans"
              >
                {isUploading ? 'Ingesting Context...' : 'Ingest Document'}
              </button>
            </form>
          )}

          {/* Active File Ingest Progress Monitors */}
          {activeUploads.length > 0 && (
            <div className="border-t border-[#141413]/10 pt-3 space-y-2">
              <span className="text-[9px] font-bold text-[#696969] uppercase tracking-wider font-mono block">Ingest In Progress</span>
              <div className="space-y-2">
                {activeUploads.map((up) => (
                  <div key={up.id} className="p-2.5 rounded-[12px] bg-[#FCFBFA] border border-[#141413]/10 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {up.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : up.status === 'failed' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 text-[#141413] animate-spin shrink-0" />
                        )}
                        <span className="text-xs font-bold text-[#141413] truncate">{up.name}</span>
                      </div>
                      <span className="text-[9px] text-[#696969] font-mono shrink-0">{up.size}</span>
                    </div>

                    {up.status !== 'failed' && (
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-[#F3F0EE] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#141413] transition-all duration-300 animate-pulse"
                            style={{ width: `${up.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-[#696969] font-mono">
                          <span>
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
                      <div className="flex items-center justify-between text-[9px] text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                        <span className="truncate">{up.error}</span>
                        <button 
                          onClick={() => setActiveUploads(prev => prev.filter(item => item.id !== up.id))}
                          className="hover:text-rose-950 ml-1 cursor-pointer"
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
          <span className="text-[10px] font-bold text-[#696969] uppercase tracking-wider font-mono block">Document Library</span>
          
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full p-3.5 rounded-[20px] border text-left transition-all flex items-start gap-3 ${
                  activeDoc?.id === doc.id
                    ? 'bg-white border-[#141413] shadow-[rgba(0,0,0,0.04)_0px_4px_16px_0px]'
                    : 'bg-[#FCFBFA] border-[#141413]/10 hover:bg-white hover:border-[#141413]/30'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#141413]/05 text-[#141413] shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-[#141413] truncate">{doc.name}</h5>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#696969] font-mono">
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
          <div className="p-6 rounded-[20px] border border-[#141413]/10 bg-white space-y-5 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
            <div className="flex items-start justify-between border-b border-[#141413]/10 pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#696969] uppercase tracking-wider font-bold">Document Metadata Analysis</span>
                <h3 className="text-sm font-bold text-[#141413] mt-1">{activeDoc.name}</h3>
              </div>
              
              <div className="flex gap-4 text-xs text-[#696969] font-mono">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(activeDoc.uploadDate).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> {activeDoc.size}</span>
              </div>
            </div>

            {/* AI Summary */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#696969] uppercase tracking-wider font-mono block">AI Parse Summary</span>
              <p className="text-xs text-[#141413] leading-relaxed font-sans bg-[#F3F0EE] p-3.5 rounded-[12px] border border-[#141413]/10">
                {activeDoc.summary}
              </p>
            </div>

            {/* Key Insights List */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#696969] uppercase tracking-wider font-mono block">Vetted Tactical Insights</span>
              <div className="grid grid-cols-1 gap-2.5">
                {activeDoc.insights.map((ins, idx) => (
                  <div key={idx} className="p-3.5 rounded-[12px] border border-[#141413]/10 bg-[#FCFBFA] flex items-start gap-2.5 text-xs text-[#696969]">
                    <Sparkles className="w-3.5 h-3.5 text-[#141413] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{ins}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 rounded-[20px] border border-dashed border-[#141413]/20 bg-white text-center text-[#696969] text-xs">
            No materials ingested in library. Paste files on the left portal to begin.
          </div>
        )}

        {/* Semantic RAG Question Console */}
        <div className="p-6 rounded-[20px] border border-[#141413]/10 bg-white space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#141413]" />
            <h4 className="text-xs font-bold text-[#141413] uppercase tracking-wider font-mono">Semantic Document Intelligence</h4>
          </div>
          <p className="text-xs text-[#696969]">Ask strategic questions over your ingested documents. The vector engine queries context and outlines answers with real citations.</p>

          <form onSubmit={handleQuerySubmit} className="flex gap-2.5">
            <input
              type="text"
              placeholder="e.g. Highlight our fundraising goals and option vesting rules..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
              className="flex-1 px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/20 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413]"
            />
            <button
              type="submit"
              disabled={isQuerying}
              className="px-5 py-2.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] font-bold text-xs text-[#F3F0EE] transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer font-sans"
            >
              <Send className="w-3.5 h-3.5" />
              {isQuerying ? 'Querying...' : 'Query'}
            </button>
          </form>

          {/* RAG Answer Display */}
          {queryAnswer && (
            <div className="p-4 rounded-[12px] bg-[#F3F0EE] border border-[#141413]/10 space-y-3 animate-fade-in text-xs leading-relaxed">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Semantic Engine Response
                </span>
                <span className="text-[9px] text-[#696969] font-mono">Citing active documents</span>
              </div>
              <div className="text-[#141413] font-sans whitespace-pre-line leading-relaxed">
                {queryAnswer}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
