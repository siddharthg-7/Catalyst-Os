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
          Ask your Executive AI Council anything about strategy, treasury, hiring, or operations.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-white/[0.08] text-[10px] font-mono text-[#777777]">
        <ShieldCheck className="w-3 h-3 text-white" />
        <span>HashiCorp Vault Encrypted & Zero-Trust Isolated</span>
      </div>
    </div>
  );
}
