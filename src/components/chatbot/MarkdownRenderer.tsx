import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Clean, lightweight, zero-dependency Markdown & Code Block renderer with copy code support.
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split code blocks ```lang ... ```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: Array<{ type: 'text' | 'code'; language?: string; text: string }> = [];

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      text: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }

  return (
    <div className="space-y-3 font-sans leading-relaxed text-sm">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return (
            <div key={idx} className="my-3 rounded-xl bg-[#060608] border border-white/10 overflow-hidden font-mono text-xs shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-[#111111] border-b border-white/[0.08] text-white/50 text-[10px] uppercase font-bold tracking-wider">
                <span>{part.language}</span>
                <button
                  onClick={() => handleCopyCode(part.text, idx)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-purple-200 leading-normal">
                <code>{part.text}</code>
              </pre>
            </div>
          );
        }

        // Render standard Markdown formatting for text blocks
        const lines = part.text.split('\n');
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return <div key={lIdx} className="h-2" />;

              // Headings ### or ## or #
              if (line.startsWith('### ')) {
                return <h3 key={lIdx} className="text-base font-bold text-white pt-2 pb-1 font-sans">{line.replace('### ', '')}</h3>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={lIdx} className="text-lg font-bold text-white pt-2 pb-1 font-sans">{line.replace('## ', '')}</h2>;
              }
              if (line.startsWith('# ')) {
                return <h1 key={lIdx} className="text-xl font-extrabold text-white pt-2 pb-1 font-sans">{line.replace('# ', '')}</h1>;
              }

              // Bullet points - or *
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const bulletText = line.trim().replace(/^[-*]\s+/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 mt-2 shrink-0" />
                    <span>{parseInlineFormatting(bulletText)}</span>
                  </div>
                );
              }

              // Numbered lists 1. 2.
              if (/^\d+\.\s/.test(line.trim())) {
                return (
                  <div key={lIdx} className="pl-2 flex items-start gap-2">
                    <span className="font-mono text-white/50 text-xs mt-0.5">{line.trim().split('.')[0]}.</span>
                    <span>{parseInlineFormatting(line.trim().replace(/^\d+\.\s+/, ''))}</span>
                  </div>
                );
              }

              return <p key={lIdx}>{parseInlineFormatting(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Parses bold **text**, italic *text*, and inline `code`
 */
function parseInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-white/90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-purple-200 font-mono text-xs border border-white/10">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
