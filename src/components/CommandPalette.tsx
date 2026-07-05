import React, { useState, useEffect, useRef } from 'react';
import { Search, Activity, CheckSquare, FileText, Sparkles, Rocket, Loader2 } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: 'dashboard' | 'approvals' | 'knowledge') => void;
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
    { id: 'nav-dash',  name: 'Go to Dashboard',    category: 'Navigation', icon: Activity,    action: () => onNavigate('dashboard') },
    { id: 'nav-appr',  name: 'Go to Approvals',    category: 'Navigation', icon: CheckSquare, action: () => onNavigate('approvals') },
    { id: 'nav-know',  name: 'Go to Knowledge',    category: 'Navigation', icon: FileText,    action: () => onNavigate('knowledge') },
    { id: 'act-sim',   name: 'Simulate Collaboration Cycle', category: 'Actions', icon: Sparkles, action: () => onRunAction('simulate') },
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 bg-[#141413]/40 backdrop-blur-sm animate-fade-in">
      <div 
        ref={containerRef}
        className="w-full max-w-lg bg-white border border-[#141413]/10 rounded-[20px] shadow-[rgba(0,0,0,0.12)_0px_24px_48px_0px] overflow-hidden flex flex-col max-h-[450px]"
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#141413]/10">
          <Search className="w-5 h-5 text-[#696969] shrink-0" />
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
            className="w-full bg-transparent text-sm text-[#141413] placeholder-[#696969] focus:outline-none font-sans"
          />
          <span className="px-1.5 py-0.5 rounded bg-[#F3F0EE] border border-[#141413]/10 text-[9px] font-mono font-semibold text-[#696969] shrink-0">
            ESC
          </span>
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#FCFBFA]">
          {query.trim().length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#141413] uppercase tracking-wider font-mono">
                G0DM0D3 Engine
              </div>
              <button
                onClick={() => handleAskGodmode(cleanQuery, targetAgent)}
                className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-[12px] text-xs font-semibold text-[#141413] bg-[#F3F0EE] hover:bg-[#F3F0EE]/80 transition-colors border border-[#141413]/10 font-sans"
              >
                <span className="flex items-center gap-2.5">
                  <Rocket className="w-4 h-4 text-[#141413]" />
                  Ask {targetAgent ? `@${targetAgent.toUpperCase()}` : 'G0DM0D3'}: "{cleanQuery}"
                </span>
                <span className="text-[10px] font-mono text-[#696969]">↵ Enter</span>
              </button>

              {/* AI Response Card */}
              {(isFetchingAI || aiResponse || apiError) && (
                <div className="mt-2 mx-2 p-4 rounded-[12px] bg-white border border-[#141413]/10 shadow-[rgba(0,0,0,0.02)_0px_4px_12px_0px] text-sm text-[#141413] font-sans">
                  {isFetchingAI && (
                    <div className="flex items-center gap-2 text-[#141413] animate-pulse">
                      <Loader2 className="w-4 h-4 animate-spin text-[#141413]" />
                      Racing 12 models to answer your query...
                    </div>
                  )}
                  {aiResponse && (
                    <div className="leading-relaxed whitespace-pre-wrap">{aiResponse}</div>
                  )}
                  {apiError && (
                    <div className="text-rose-700 font-semibold">{apiError}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#696969] font-sans">
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
                    <div className="px-3 py-1.5 text-[10px] font-bold text-[#696969] uppercase tracking-wider font-mono">
                      {category}
                    </div>
                    {categoryCmds.map(cmd => (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        className="w-full text-left flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium text-[#696969] hover:bg-[#F3F0EE] hover:text-[#141413] transition-colors font-sans"
                      >
                        <span className="flex items-center gap-2.5">
                          <cmd.icon className="w-4 h-4 text-[#141413]" />
                          {cmd.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#696969]">↵ Enter</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-[#F3F0EE] border-t border-[#141413]/10 flex items-center justify-between text-[10px] text-[#696969] font-mono">
          <span>Use arrows to navigate</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
