import React, { useState, useEffect, useRef } from 'react';
import { Search, Terminal, Activity, CheckSquare, Settings, FileText, Clipboard, Sparkles, Rocket, Loader2 } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: 'dashboard' | 'agents' | 'workflows' | 'approvals' | 'knowledge' | 'ledger') => void;
  onRunAction: (actionName: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onNavigate, onRunAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [isFetchingAI, setIsFetchingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAskGodmode(userQuestion: string, targetAgent: string | null = null) {
    setIsFetchingAI(true);
    setAiResponse(null);
    setApiError(null);
    
    const finalContent = targetAgent 
      ? `As the ${targetAgent} of Catalyst OS, answer this: ${userQuestion}` 
      : userQuestion;
      
    const url = "https://sathwik2212-backend-api.hf.space/v1/chat/completions";
    const requestData = {
        model: "ultraplinian/fast",
        messages: [{ role: "user", content: finalContent }],
        stream: false
    };
    
    try {
      const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
          setApiError(`Server Error: ${data.error?.message || JSON.stringify(data.error) || 'Unknown error'}`);
          return;
      }
      
      setAiResponse(data.choices?.[0]?.message?.content || "No response generated.");
    } catch (err: any) {
      console.error(err);
      setApiError(`Error: ${err.message || 'Could not reach the G0DM0D3 API.'}`);
    } finally {
      setIsFetchingAI(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { id: 'nav-dash', name: 'Go to SaaS Dashboard', category: 'Navigation', icon: Activity, action: () => onNavigate('dashboard') },
    { id: 'nav-sprint', name: 'Go to Strategic Sprints', category: 'Navigation', icon: Terminal, action: () => onNavigate('workflows') },
    { id: 'nav-appr', name: 'Go to Approval Queue', category: 'Navigation', icon: CheckSquare, action: () => onNavigate('approvals') },
    { id: 'nav-agent', name: 'Go to Agent Configurator', category: 'Navigation', icon: Settings, action: () => onNavigate('agents') },
    { id: 'nav-know', name: 'Go to Knowledge Base', category: 'Navigation', icon: FileText, action: () => onNavigate('knowledge') },
    { id: 'nav-gov', name: 'Go to Governance Ledger', category: 'Navigation', icon: Clipboard, action: () => onNavigate('ledger') },
    { id: 'act-sim', name: 'Simulate Collaboration Cycle', category: 'Actions', icon: Sparkles, action: () => onRunAction('simulate') },
  ];

  const filtered = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  let targetAgent: string | null = null;
  let cleanQuery = query;
  const agentMatch = query.trim().match(/^@(\w+)\s+(.*)/i);
  if (agentMatch) {
    targetAgent = agentMatch[1];
    cleanQuery = agentMatch[2];
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        ref={containerRef}
        className="w-full max-w-lg bg-[#0c0c0e] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[450px]"
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#27272a]">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or ask G0DM0D3..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim() && !isFetchingAI) {
                handleAskGodmode(cleanQuery, targetAgent);
              }
            }}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-mono font-semibold text-zinc-500 shrink-0">
            ESC
          </span>
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {query.trim().length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                G0DM0D3 Engine
              </div>
              <button
                onClick={() => handleAskGodmode(cleanQuery, targetAgent)}
                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
              >
                <span className="flex items-center gap-2.5">
                  <Rocket className="w-4 h-4 text-indigo-400" />
                  Ask {targetAgent ? `@${targetAgent.toUpperCase()}` : 'G0DM0D3'}: "{cleanQuery}"
                </span>
                <span className="text-[10px] font-mono text-indigo-500">↵ Enter</span>
              </button>

              {/* AI Response Card */}
              {(isFetchingAI || aiResponse || apiError) && (
                <div className="mt-2 mx-2 p-4 rounded-lg bg-[#18181b] border border-[#27272a] shadow-inner text-sm text-zinc-300">
                  {isFetchingAI && (
                    <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Racing 12 models to answer your query...
                    </div>
                  )}
                  {aiResponse && (
                    <div className="leading-relaxed whitespace-pre-wrap">{aiResponse}</div>
                  )}
                  {apiError && (
                    <div className="text-red-400">{apiError}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              No results found for "{query}"
            </div>
          ) : (
            <>
              {/* Group by category */}
              {['Navigation', 'Actions'].map(category => {
                const categoryCmds = filtered.filter(c => c.category === category);
                if (categoryCmds.length === 0) return null;

                return (
                  <div key={category} className="space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      {category}
                    </div>
                    {categoryCmds.map(cmd => (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <cmd.icon className="w-4 h-4 text-[#6366f1]" />
                          {cmd.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">↵ Enter</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-zinc-950 border-t border-[#27272a] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Use arrows to navigate</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
