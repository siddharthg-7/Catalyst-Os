/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Initiative, AgentRole, AgentMessage, Deliverable } from '../types';
import { Play, Plus, RefreshCw, AlertTriangle, FileText, CheckCircle2, ChevronRight, User2, MessageSquare, ArrowRight } from 'lucide-react';

interface WorkflowCanvasProps {
  initiatives: Initiative[];
  onLaunchInitiative: (title: string, description: string, category: 'funding' | 'hiring' | 'growth' | 'operations' | 'legal') => Promise<void>;
  onSimulateInitiative: (id: string) => Promise<void>;
}

export default function WorkflowCanvas({ initiatives, onLaunchInitiative, onSimulateInitiative }: WorkflowCanvasProps) {
  const [selectedInitId, setSelectedInitId] = useState<string>(initiatives[0]?.id || '');
  const [isLaunching, setIsLaunching] = useState(false);
  
  // Custom Initiative Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<'funding' | 'hiring' | 'growth' | 'operations' | 'legal'>('growth');

  // Interactive Live Simulation Tracking
  const [simStep, setSimStep] = useState<number>(-1);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simProgressMessage, setSimProgressMessage] = useState('');

  // Selected Deliverable for visual preview modal
  const [previewDeliverable, setPreviewDeliverable] = useState<Deliverable | null>(null);

  const activeInit = initiatives.find(i => i.id === selectedInitId);

  // Pre-configured executive templates
  const templates = [
    {
      title: 'Formulate Q3 Institutional Seed Funding Pitch & Economics',
      description: 'Prepare strategic financial pitch scripts, model CAC payback terms, audit cap table, and structure accredited investor disclosures.',
      category: 'funding' as const,
    },
    {
      title: 'Founding Infrastructure Engineer Compensation Package',
      description: 'Structure employment agreements, options vesting cliffs, IP transfer covenants, and stress test cash runways against salary.',
      category: 'hiring' as const,
    },
    {
      title: 'SOC-2 Compliance Checklist & Vendor Security Policies',
      description: 'Draft internal data protection guidelines, formulate password compliance, and verify third-party vendor encryption policies.',
      category: 'operations' as const,
    }
  ];

  // Coordinates node positions on our interactive SVG collaboration workspace
  const agentNodes: { role: AgentRole; x: number; y: number; name: string; avatar: string }[] = [
    { role: 'CEO', x: 250, y: 50, name: 'Sophia Vance', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    { role: 'Finance', x: 80, y: 150, name: 'Marcus Sterling', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
    { role: 'Talent', x: 420, y: 150, name: 'Evelyn Brooks', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
    { role: 'Growth', x: 80, y: 290, name: 'Dax Ramirez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },

    { role: 'Legal', x: 250, y: 390, name: 'Helena Vance, Esq.', avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150' },
    { role: 'ConflictResolver', x: 250, y: 220, name: 'Pax-9 Synthesis', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150' },
    { role: 'ApprovalManager', x: 250, y: 490, name: 'Loom-V Director', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
  ];

  // Map dependencies for drawing path lines
  const flowLinks = [
    { from: 'CEO', to: 'Finance' },
    { from: 'CEO', to: 'Talent' },
    { from: 'Finance', to: 'ConflictResolver' },
    { from: 'Talent', to: 'ConflictResolver' },
    { from: 'Growth', to: 'ConflictResolver' },
    { from: 'ConflictResolver', to: 'Legal' },
    { from: 'Legal', to: 'ApprovalManager' },
  ];

  // Run cinematic simulation animation
  const handleSimulate = async (id: string) => {
    setSimulatingId(id);
    setSimStep(0);
    
    const steps = [
      { agent: 'CEO' as const, msg: 'CEO Sophia Vance mapping core objectives and operational tasks...' },
      { agent: 'Finance' as const, msg: 'Marcus Sterling reviewing financial constraints and treasury margins...' },
      { agent: 'Talent' as const, msg: 'Evelyn Brooks modeling recruiting options pool configurations...' },
      { agent: 'Growth' as const, msg: 'Dax Ramirez sketching growth campaign parameters and outreach copies...' },
      { agent: 'Legal' as const, msg: 'Helena Vance auditing compliance disclosures and contract liabilities...' },
      { agent: 'ConflictResolver' as const, msg: 'Pax-9 Corporate Engine establishing compromise on clashing boundaries...' },
      { agent: 'ApprovalManager' as const, msg: 'Approval Manager compiling high-fidelity markdown deliverables for reviewed queues...' }
    ];

    for (let i = 0; i < steps.length; i++) {
      setSimStep(i);
      setActiveAgent(steps[i].agent);
      setSimProgressMessage(steps[i].msg);
      // Wait for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      await onSimulateInitiative(id);
    } catch (err) {
      console.error(err);
    } finally {
      setSimStep(-1);
      setActiveAgent(null);
      setSimulatingId(null);
      setSimProgressMessage('');
    }
  };

  const handleLaunchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription) return;
    setIsLaunching(true);
    try {
      await onLaunchInitiative(newTitle, newDescription, newCategory);
      setNewTitle('');
      setNewDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleApplyTemplate = (tpl: typeof templates[number]) => {
    setNewTitle(tpl.title);
    setNewDescription(tpl.description);
    setNewCategory(tpl.category);
  };

  // Autoselect first initiative if none is selected
  useEffect(() => {
    if (initiatives.length > 0 && !selectedInitId) {
      setSelectedInitId(initiatives[0].id);
    }
  }, [initiatives, selectedInitId]);

  return (
    <div id="workflow-canvas-container" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Sidebar: Strategic Initiatives List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">Strategic Sprints</h4>
          <span className="text-xs text-zinc-500 font-mono">{initiatives.length} Logged</span>
        </div>

        <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
          {initiatives.map((init) => (
            <button
              key={init.id}
              onClick={() => setSelectedInitId(init.id)}
              className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedInitId === init.id
                  ? 'bg-[#18181B] border-[#27272A] shadow-md shadow-[#6366F1]/5'
                  : 'bg-[#18181B]/30 border-[#27272A]/60 hover:bg-[#18181B]/60 hover:border-[#27272A]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full uppercase ${
                  init.category === 'funding' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  init.category === 'hiring' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                  'bg-indigo-500/10 text-[#6366F1] border-indigo-500/20'
                }`}>
                  {init.category}
                </span>
                
                <span className={`text-[10px] font-medium flex items-center gap-1 ${
                  init.status === 'completed' ? 'text-emerald-400' :
                  init.status === 'active' ? 'text-amber-400 animate-pulse' : 'text-zinc-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    init.status === 'completed' ? 'bg-emerald-500' :
                    init.status === 'active' ? 'bg-amber-500 animate-ping' : 'bg-zinc-600'
                  }`} />
                  {init.status.toUpperCase()}
                </span>
              </div>
              <h5 className="mt-2.5 text-xs font-semibold text-zinc-200 line-clamp-1">{init.title}</h5>
              <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{init.description}</p>
            </button>
          ))}
        </div>

        {/* Start New Initiative Form Card */}
        <div className="p-4 rounded-xl border border-[#27272A] bg-[#18181B] shadow-sm">
          <h5 className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#6366F1]" />
            Initiate Executive Session
          </h5>
          <p className="text-[11px] text-zinc-400 mt-1">Deploy an active workflow requiring collaborating AI executive signoffs.</p>

          <form onSubmit={handleLaunchSubmit} className="mt-3.5 space-y-3">
            <div>
              <input
                type="text"
                placeholder="Initiative Title (e.g. Launch ProductHunt)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-[#27272A] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#6366F1]"
              />
            </div>
            <div>
              <textarea
                placeholder="Details & bounds for the executive council..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                required
                rows={2}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-[#27272A] text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#6366F1] resize-none leading-normal"
              />
            </div>
            <div className="flex gap-2 items-center justify-between">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-2.5 py-1 rounded bg-zinc-950 border border-[#27272A] text-[10px] text-zinc-300 focus:outline-none focus:border-[#6366F1]"
              >
                <option value="growth">Growth</option>
                <option value="funding">Funding</option>
                <option value="hiring">Hiring</option>
                <option value="operations">Operations</option>
                <option value="legal">Legal</option>
              </select>
              <button
                type="submit"
                disabled={isLaunching}
                className="px-4 py-1.5 rounded-lg bg-[#6366F1] text-[10px] font-bold text-white hover:bg-[#6366F1]/85 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLaunching ? 'Spawning...' : 'Spawn Sprint'}
              </button>
            </div>
          </form>

          {/* Quick template triggers */}
          <div className="mt-4 pt-3.5 border-t border-[#27272A]">
            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Enterprise-grade Templates</span>
            <div className="space-y-1.5">
              {templates.map((tpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="w-full p-2 rounded text-left text-[10px] bg-zinc-900/60 border border-[#27272A]/60 hover:border-[#27272A] hover:bg-[#18181B]/50 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="text-zinc-300 line-clamp-1 font-medium">{tpl.title}</span>
                  <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Main Workspace: Visual Graph & Interactive Playback */}
      <div className="xl:col-span-2 space-y-6">
        {activeInit ? (
          <div className="p-5 rounded-xl border border-[#27272A] bg-[#18181B] space-y-6 relative overflow-hidden shadow-sm">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-zinc-800 text-zinc-400 border border-[#27272A]">
                    ID: {activeInit.id}
                  </span>
                  <span className="text-xs text-zinc-400 capitalize">{activeInit.category} initiative</span>
                </div>
                <h3 className="mt-2 text-base font-bold text-white leading-snug">{activeInit.title}</h3>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed max-w-xl">{activeInit.description}</p>
              </div>

              {/* Action Button */}
              {activeInit.status === 'pending' && (
                <button
                  onClick={() => handleSimulate(activeInit.id)}
                  disabled={simulatingId !== null}
                  className="px-5 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#6366F1]/85 text-xs font-bold text-white transition-all flex items-center gap-2 shrink-0 self-start sm:self-center disabled:opacity-50 group shadow-lg shadow-[#6366F1]/20 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-white group-hover:scale-110 transition-all" />
                  Orchestrate AI Council
                </button>
              )}
            </div>

            {/* Live Cinematic Loader State */}
            {simulatingId === activeInit.id && (
              <div className="p-6 rounded-xl border border-[#27272A]/60 bg-zinc-950/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#6366F1] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Multi-Agent Corporate Simulation Playing
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">Step {simStep + 1} of 8</span>
                </div>
                <p className="text-xs text-zinc-200 leading-normal font-mono">{simProgressMessage}</p>
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6366F1] to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${((simStep + 1) / 8) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Visual Agent Collaboration Map (SVG graph) */}
            <div className="p-3 border border-[#27272A]/60 rounded-xl bg-zinc-950/50 relative">
              <span className="absolute top-3 left-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Operational Node Topology</span>
              
              <div className="relative h-[560px] w-full overflow-hidden flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Drawing flowing link paths */}
                  {flowLinks.map((link, idx) => {
                    const fromNode = agentNodes.find(n => n.role === link.from);
                    const toNode = agentNodes.find(n => n.role === link.to);
                    if (!fromNode || !toNode) return null;
                    
                    const isFlowing = activeAgent === fromNode.role || (simStep >= 0 && agentNodes.findIndex(n => n.role === fromNode.role) <= simStep && agentNodes.findIndex(n => n.role === toNode.role) >= simStep);

                    return (
                      <g key={idx}>
                        <path
                          d={`M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`}
                          stroke={isFlowing ? '#6366F1' : '#27272A'}
                          strokeWidth={isFlowing ? 2.5 : 1.5}
                          strokeDasharray={isFlowing ? '4,4' : undefined}
                          className={isFlowing ? 'animate-[dash_2s_linear_infinite]' : undefined}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Drawing nodes */}
                {agentNodes.map((node) => {
                  const isActive = activeAgent === node.role;
                  const isVetted = simStep >= 0 && agentNodes.findIndex(n => n.role === node.role) < simStep;

                  return (
                    <div
                      key={node.role}
                      style={{ left: `${node.x - 42}px`, top: `${node.y - 42}px` }}
                      className={`absolute p-1.5 rounded-xl border flex flex-col items-center justify-between w-24 h-24 transition-all duration-300 select-none ${
                        isActive
                          ? 'bg-zinc-900 border-[#6366F1] ring-2 ring-[#6366F1]/20 scale-105'
                          : isVetted
                          ? 'bg-zinc-900/50 border-[#27272A] opacity-80'
                          : 'bg-zinc-900/20 border-[#27272A]'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={node.avatar}
                          alt={node.role}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover filter grayscale"
                        />
                        {isActive && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#6366F1] animate-ping" />
                        )}
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-zinc-100 block">{node.role}</span>
                        <span className="text-[8px] text-zinc-500 block truncate max-w-[80px]">{node.name.split(' ')[0]}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Micro operational alert */}
                {simulatingId && (
                  <div className="absolute bottom-4 right-4 p-2 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/30 text-[9px] font-mono text-[#6366F1] animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Simulating AI Debate Threads...
                  </div>
                )}
              </div>
            </div>

            {/* Results section (Conversations and Deliverables) */}
            {activeInit.status === 'completed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Agent Conversations Thread */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#6366F1]" />
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">AI Debate logs</h4>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {activeInit.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg border text-xs relative space-y-1 ${
                          msg.isConflict
                            ? 'bg-amber-950/15 border-amber-900/30'
                            : msg.sender === 'ConflictResolver'
                            ? 'bg-purple-950/15 border-purple-900/30'
                            : 'bg-zinc-900/50 border-[#27272A]/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold uppercase tracking-wider text-[10px] ${
                            msg.sender === 'CEO' ? 'text-[#6366F1]' :
                            msg.sender === 'Finance' ? 'text-emerald-400' :
                            msg.sender === 'ConflictResolver' ? 'text-purple-400' : 'text-zinc-400'
                          }`}>
                            {msg.sender} → {msg.receiver}
                          </span>
                          
                          {msg.isConflict && (
                            <span className="px-1.5 py-0.5 text-[8px] rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Conflict
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-300 leading-relaxed font-sans">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MCP Tool Calls Telemetry */}
                {activeInit.mcp_tool_calls && activeInit.mcp_tool_calls.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">MCP Tools Executed</h4>
                      </div>
                      <span className="text-[9px] font-mono text-cyan-400/80 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">Model Context Protocol</span>
                    </div>

                    <div className="space-y-2.5">
                      {activeInit.mcp_tool_calls.map((tc, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-zinc-950/80 border border-cyan-900/30 text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between text-cyan-400 font-bold">
                            <span>🛠️ {tc.tool}</span>
                            <span className="text-[9px] text-emerald-400">SUCCESS</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            Output: {JSON.stringify(tc.output)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deliverables Produced */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Assets Produced</h4>
                  </div>

                  {activeInit.deliverables.length > 0 ? (
                    <div className="space-y-3">
                      {activeInit.deliverables.map((del) => (
                        <div
                          key={del.id}
                          className="p-4 rounded-xl border border-[#27272A] bg-zinc-900/30 hover:border-[#6366F1]/50 hover:bg-[#18181B] transition-all flex items-start gap-3.5"
                        >
                          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-semibold text-white">{del.title}</h5>
                              <span className="px-1.5 py-0.5 text-[8px] rounded uppercase bg-emerald-500/10 text-emerald-400">
                                Ready
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 line-clamp-2">{del.description}</p>
                            <button
                              onClick={() => setPreviewDeliverable(del)}
                              className="mt-2 text-[10px] text-[#6366F1] hover:text-[#6366F1]/80 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              Inspect Asset Draft <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border border-dashed border-[#27272A] text-center text-xs text-zinc-500">
                      No deliverables generated yet. Run the simulation.
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        ) : (
          <div className="p-12 rounded-xl border border-dashed border-[#27272A] text-center text-zinc-500 text-xs">
            No active strategic sprint selected.
          </div>
        )}
      </div>

      {/* Deliverable Document Preview Overlay (Modal) */}
      {previewDeliverable && (
        <div id="deliverable-modal-overlay" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-[#27272A] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {previewDeliverable.type}
                </span>
                <h4 className="text-sm font-bold text-white mt-2">{previewDeliverable.title}</h4>
              </div>
              <button
                onClick={() => setPreviewDeliverable(null)}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-[#27272A] text-xs text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 prose prose-invert max-w-none text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap bg-zinc-900/20">
              {previewDeliverable.content}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#27272A] bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Impact Score: {previewDeliverable.impact}</span>
              <span className="text-zinc-400 font-mono">Financial: {previewDeliverable.financialChange ? `${previewDeliverable.financialChange > 0 ? '+' : ''}$${previewDeliverable.financialChange.toLocaleString()}` : 'Neutral'}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
