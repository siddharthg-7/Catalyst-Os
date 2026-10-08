import React from 'react';
import { Sparkles, Bot, ShieldCheck } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="py-8 px-4 text-center space-y-4 font-sans my-auto">
      <div className="w-14 h-14 rounded-2xl bg-[#111111] border border-white/10 flex items-center justify-center text-white mx-auto shadow-xl">
        <Bot className="w-7 h-7 text-white" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center gap-2 font-sans">
          <span>Hello 👋 How can I help?</span>
        </h3>
        <p className="text-xs text-[#B8B8B8] max-w-xs mx-auto leading-relaxed font-sans">
          I'm here to help you build your startup—one step at a time.
        </p>
      </div>
    </div>
  );
}
