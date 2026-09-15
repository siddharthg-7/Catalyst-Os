import React, { useState, useEffect, useRef } from 'react';
import { Search, Activity, CheckSquare, FileText, Sparkles, Rocket, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: 'dashboard' | 'approvals' | 'knowledge') => void;
  onRunAction: (actionName: string) => void;
}

interface ExecutionStep {
  agent: string;
  action: string;
  status: string;
  summary?: string;
}

export default function CommandPalette({ isOpen, onClose, onNavigate, onRunAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [isFetchingAI, setIsFetchingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleExecuteCommand(userCommand: string) {
    if (!userCommand.trim()) return;
    setIsFetchingAI(true);
    setAiResponse(null);
    setApiError(null);
    setExecutionSteps([
      { agent: 'chief_of_staff', action: 'Decomposing founder intent & consulting startup context', status: 'running' }
    ]);
    
    try {
      const response = await fetch('/api/v1/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: userCommand })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setApiError(`Execution failed: ${data.detail || data.error || 'Unknown error'}`);
        return;
      }
      
      setAiResponse(data.orchestrator_summary || 'Command processed.');
      if (data.steps_processed) {
        setExecutionSteps(data.steps_processed);
      }
      if (data.pending_approvals_count) {
        setPendingApprovalsCount(data.pending_approvals_count);
      }
    } catch (err: any) {
      console.error(err);
      setApiError(`Error reaching AI Executive Team: ${err.message}`);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] p-4 bg-[#141413]/40 backdrop-blur-sm animate-fade-in">
      <div 
        ref={containerRef}
        className="w-full max-w-xl bg-white border border-[#141413]/10 rounded-[20px] shadow-[rgba(0,0,0,0.16)_0px_24px_48px_0px] overflow-hidden flex flex-col max-h-[600px]"
      >
        {/* Search Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#141413]/10 bg-white">
          <Search className="w-5 h-5 text-[#696969] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask AI Chief of Staff (e.g. Can we hire two backend engineers and launch next month?)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim() && !isFetchingAI) {
                handleExecuteCommand(query);
              }
            }}
            className="w-full bg-transparent text-sm text-[#141413] placeholder-[#696969] focus:outline-none font-sans"
          />
          <span className="px-1.5 py-0.5 rounded bg-[#F3F0EE] border border-[#141413]/10 text-[9px] font-mono font-semibold text-[#696969] shrink-0">
            ESC
          </span>
        </div>

        {/* Command list & Execution status */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FCFBFA]">
          {query.trim().length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-[#141413] uppercase tracking-wider font-mono">
                <span>AI Executive Team (Google ADK)</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </span>
              </div>
              <button
                onClick={() => handleExecuteCommand(query)}
                disabled={isFetchingAI}
                className="w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-[12px] text-xs font-semibold text-[#141413] bg-[#F3F0EE] hover:bg-[#F3F0EE]/80 transition-colors border border-[#141413]/10 font-sans"
              >
                <span className="flex items-center gap-2.5">
                  <Rocket className="w-4 h-4 text-gray-900" />
                  Execute via Chief of Staff: "{query}"
                </span>
                <span className="text-[10px] font-mono text-[#696969]">↵ Enter</span>
              </button>

              {/* Execution Steps & Live Progress */}
              {isFetchingAI && (
                <div className="mt-2.5 p-3.5 rounded-[12px] bg-white border border-[#141413]/10 text-xs text-[#141413] font-sans space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-gray-900">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-900" />
                    Chief of Staff Coordinating Executive Specialists...
                  </div>
                  <div className="space-y-1.5 pl-6 text-[11px] text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                      Chief of Staff: Analyzing founder intent & startup context
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      Finance: Checking runway & hiring budget deterministically
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      Operations: Checking launch dependencies & blockers
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      Auditor: Validating claims & risk levels
                    </div>
                  </div>
                </div>
              )}

              {/* Completed Execution Steps */}
              {!isFetchingAI && executionSteps.length > 0 && (
                <div className="mt-2.5 p-3 rounded-[12px] bg-white border border-gray-100 text-xs space-y-1.5">
                  <div className="font-semibold text-[11px] text-gray-500 uppercase tracking-wider">Execution Pathway</div>
                  {executionSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold capitalize">{step.agent.replace('_', ' ')}</span>: {step.action}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Response Card */}
              {aiResponse && (
                <div className="mt-2.5 p-4 rounded-[12px] bg-white border border-[#141413]/10 shadow-[rgba(0,0,0,0.02)_0px_4px_12px_0px] text-xs text-[#141413] font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-gray-900 mb-2 pb-1.5 border-b border-gray-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Unified Recommendation (Audited & Verified)
                  </div>
                  <div className="leading-relaxed whitespace-pre-wrap font-sans text-gray-800">
                    {aiResponse}
                  </div>
                  {pendingApprovalsCount > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/50">
                      <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Requires Founder Approval ({pendingApprovalsCount} item)
                      </span>
                      <button
                        onClick={() => {
                          onNavigate('approvals');
                          onClose();
                        }}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-gray-900 text-white rounded-md hover:bg-black transition-colors"
                      >
                        Review in Approval Center →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {apiError && (
                <div className="mt-2 p-3 rounded-[12px] bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                  {apiError}
                </div>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#696969] font-sans">
              No navigation commands found for "{query}"
            </div>
          ) : (
            <>
              {['Navigation', 'Actions'].map(category => {
                const categoryCmds = filtered.filter(c => c.category === category);
                if (categoryCmds.length === 0) return null;

                return (
                  <div key={category} className="space-y-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-[#696969] uppercase tracking-wider font-mono">
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
          <span>Google ADK Multi-Agent Executive Engine</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
