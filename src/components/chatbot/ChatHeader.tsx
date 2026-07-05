import React from 'react';
import { RefreshCw, Minus, X, Download } from 'lucide-react';
import CatalystLogo from '../CatalystLogo';

interface ChatHeaderProps {
  onClear: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onExport?: () => void;
}

export default function ChatHeader({
  onClear,
  onMinimize,
  onClose,
  onExport,
}: ChatHeaderProps) {
  return (
    <div className="px-4 py-3 bg-[#090909] border-b border-white/[0.08] flex items-center justify-between font-sans select-none gap-2">
      {/* Title & Status */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#111111] border border-white/10 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          <CatalystLogo className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-white tracking-tight font-sans">CatalystOS</h3>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-[9px] font-mono text-[#777777] uppercase tracking-wider block">
            Building with you from idea to launch
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1">
        {onExport && (
          <button
            onClick={onExport}
            title="Export Conversation (.md)"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onClear}
          title="Clear Chat History"
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onMinimize}
          title="Minimize Chat"
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onClose}
          title="Close Chat"
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
