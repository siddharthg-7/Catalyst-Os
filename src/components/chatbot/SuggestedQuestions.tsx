import React from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#777777] uppercase tracking-wider font-bold">
        <Sparkles className="w-3 h-3 text-white" />
        <span>Suggested Questions</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(q)}
            className="p-3 rounded-xl bg-[#111111] border border-white/[0.08] hover:border-white text-left text-xs text-[#B8B8B8] hover:text-white transition-all flex items-center justify-between group cursor-pointer font-sans shadow-sm"
          >
            <span className="truncate pr-2 font-medium">{q}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#777777] group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
