import React from 'react';
import { Bot } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 my-2 animate-fade-in font-sans">
      <div className="w-8 h-8 rounded-xl bg-[#111111] border border-white/10 flex items-center justify-center text-white shrink-0 shadow-md">
        <Bot className="w-4 h-4" />
      </div>

      <div className="p-3.5 rounded-2xl bg-[#111111] border border-white/[0.08] text-white/70 flex items-center gap-2">
        <span className="text-xs font-mono text-white/50">Catalyst OS AI is thinking</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
