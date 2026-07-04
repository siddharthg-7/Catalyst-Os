import React from 'react';
import { FileText, Database } from 'lucide-react';

interface SourceCardProps {
  sources: Array<{ title: string; score: number }>;
}

export default function SourceCard({ sources }: SourceCardProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="pt-2 mt-2 border-t border-white/[0.08] space-y-1.5 font-mono text-[10px]">
      <div className="flex items-center gap-1.5 text-white/45 uppercase tracking-wider font-bold">
        <Database className="w-3 h-3 text-white/70" />
        <span>RAG Vector Memory References ({sources.length})</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {sources.map((src, i) => (
          <div 
            key={i} 
            className="px-2.5 py-1 rounded-lg bg-[#060608] border border-white/10 text-white/70 flex items-center gap-1.5 hover:border-white/30 transition-colors"
          >
            <FileText className="w-3 h-3 text-white" />
            <span className="truncate max-w-[140px]">{src.title}</span>
            <span className="text-emerald-400 font-bold">{(src.score * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
