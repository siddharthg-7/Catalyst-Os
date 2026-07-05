/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Initiative, AgentRole, AgentMessage, Deliverable } from '../types';
import { Play, Plus, RefreshCw, AlertTriangle, FileText, CheckCircle2, ChevronRight, MessageSquare, ArrowRight } from 'lucide-react';

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
    { role: 'Operations', x: 420, y: 290, name: 'Kaelen Finch', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
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
    { from: 'Operations', to: 'ConflictResolver' },
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
      { agent: 'Operations' as const, msg: 'Kaelen Finch deploying micro-services clusters and reviewing SOC-2 boundaries...' },
      { agent: 'Legal' as const, msg: 'Helena Vance auditing compliance disclosures and contract liabilities...' },
      { agent: 'ConflictResolver' as const, msg: 'Pax-9 Corporate Engine establishing compromise on clashing boundaries...' },
      { agent: 'ApprovalManager' as const, msg: 'Approval Manager compiling high-fidelity markdown deliverables for reviewed queues...' }
    ];

    for (let i = 0; i < steps.length; i++) {
      setSimStep(i);
      setActiveAgent(steps[i].agent);
      setSimProgressMessage(steps[i].msg);
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
    <div id="workflow-canvas-container" className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-sans">
      
      {/* Sidebar: Strategic Initiatives List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#141413]">Strategic Sprints</h4>
          <span className="text-xs text-[#696969] font-mono">{initiatives.length} Logged</span>
        </div>

        <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
          {initiatives.map((init) => (
            <button
              key={init.id}
              onClick={() => setSelectedInitId(init.id)}
              className={`w-full p-4 rounded-[20px] border text-left transition-all cursor-pointer ${
                selectedInitId === init.id
                  ? 'bg-white border-[#141413] shadow-[rgba(0,0,0,0.04)_0px_4px_16px_0px]'
                  : 'bg-[#FCFBFA] border-[#141413]/10 hover:bg-white hover:border-[#141413]/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full uppercase ${
                  init.category === 'funding' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
                  init.category === 'hiring' ? 'bg-pink-500/10 text-pink-700 border-pink-500/20' :
                  'bg-indigo-500/10 text-indigo-700 border-indigo-500/20'
                }`}>
                  {init.category}
                </span>
                
                <span className={`text-[10px] font-bold flex items-center gap-1 ${
                  init.status === 'completed' ? 'text-emerald-700' :
                  init.status === 'active' ? 'text-amber-700 animate-pulse' : 'text-[#696969]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    init.status === 'completed' ? 'bg-emerald-600' :
                    init.status === 'active' ? 'bg-amber-500 animate-ping' : 'bg-[#696969]'
                  }`} />
                  {init.status.toUpperCase()}
                </span>
              </div>
              <h5 className="mt-2 text-xs font-bold text-[#141413] line-clamp-1">{init.title}</h5>
              <p className="mt-1 text-[11px] text-[#696969] line-clamp-2 leading-relaxed">{init.description}</p>
            </button>
          ))}
        </div>

        {/* Start New Initiative Form Card */}
        <div className="p-5 rounded-[20px] border border-[#141413]/10 bg-white shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <h5 className="text-xs font-bold text-[#141413] flex items-center gap-1.5 uppercase font-mono tracking-wider">
            <Plus className="w-4 h-4 text-[#141413]" />
            Initiate Executive Session
          </h5>
          <p className="text-[11px] text-[#696969] mt-1">Deploy an active workflow requiring collaborating AI executive signoffs.</p>

          <form onSubmit={handleLaunchSubmit} className="mt-3.5 space-y-3">
            <div>
              <input
                type="text"
                placeholder="Initiative Title (e.g. Launch ProductHunt)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/15 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413]"
              />
            </div>
            <div>
              <textarea
                placeholder="Details & bounds for the executive council..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                required
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/15 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] resize-none leading-normal"
              />
            </div>
            <div className="flex gap-2 items-center justify-between">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-[8px] bg-[#F3F0EE] border border-[#141413]/15 text-[10px] text-[#141413] focus:outline-none focus:border-[#141413]"
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
                className="px-4 py-2 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-[10px] font-bold text-[#F3F0EE] transition-all disabled:opacity-50 cursor-pointer font-sans"
              >
                {isLaunching ? 'Spawning...' : 'Spawn Sprint'}
              </button>
            </div>
          </form>

          {/* Quick template triggers */}
          <div className="mt-4 pt-3.5 border-t border-[#141413]/10">
            <span className="text-[9px] font-bold text-[#696969] uppercase tracking-wider block mb-2 font-mono">Enterprise templates</span>
            <div className="space-y-1.5">
              {templates.map((tpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="w-full p-2.5 rounded-[10px] text-left text-[10px] bg-[#FCFBFA] border border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white transition-all flex items-center justify-between cursor-pointer font-sans"
                >
                  <span className="text-[#696969] line-clamp-1 font-semibold">{tpl.title}</span>
                  <ChevronRight className="w-3 h-3 text-[#696969] shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Main Workspace: Visual Graph & Interactive Playback */}
      <div className="xl:col-span-2 space-y-6">
        {activeInit ? (
          <div className="p-6 rounded-[20px] border border-[#141413]/10 bg-white space-y-6 relative overflow-hidden shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141413]/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-[#F3F0EE] text-[#696969] border border-[#141413]/10">
                    ID: {activeInit.id}
                  </span>
                  <span className="text-xs text-[#696969] capitalize font-mono font-bold">{activeInit.category} initiative</span>
                </div>
                <h3 className="mt-2 text-base font-bold text-[#141413] leading-snug">{activeInit.title}</h3>
                <p className="mt-1.5 text-xs text-[#696969] leading-relaxed max-w-xl">{activeInit.description}</p>
              </div>

              {/* Action Button */}
              {activeInit.status === 'pending' && (
                <button
                  onClick={() => handleSimulate(activeInit.id)}
                  disabled={simulatingId !== null}
                  className="px-5 py-2.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] transition-all flex items-center gap-2 shrink-0 self-start sm:self-center disabled:opacity-50 group cursor-pointer font-sans"
                >
                  <Play className="w-4 h-4 text-[#F3F0EE]" />
                  Orchestrate AI Council
                </button>
              )}
            </div>

            {/* Live Cinematic Loader State */}
            {simulatingId === activeInit.id && (
              <div className="p-6 rounded-[20px] border border-[#141413]/10 bg-[#F3F0EE] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#141413] flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#141413]" />
                    Multi-Agent Corporate Simulation Playing
                  </span>
                  <span className="text-[10px] font-mono text-[#696969]">Step {simStep + 1} of 8</span>
                </div>
                <p className="text-xs text-[#141413] leading-normal font-mono">{simProgressMessage}</p>
                <div className="w-full h-1.5 bg-[#141413]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#141413] rounded-full transition-all duration-500"
                    style={{ width: `${((simStep + 1) / 8) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Visual Agent Collaboration Map (SVG graph) */}
            <div className="p-3 border border-[#141413]/10 rounded-[20px] bg-[#FCFBFA] relative">
              <span className="absolute top-3 left-3 text-[10px] font-bold text-[#696969] uppercase tracking-wider font-mono">Operational Node Topology</span>
              
              <div className="relative h-[560px] w-full overflow-hidden flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {flowLinks.map((link, idx) => {
                    const fromNode = agentNodes.find(n => n.role === link.from);
                    const toNode = agentNodes.find(n => n.role === link.to);
                    if (!fromNode || !toNode) return null;
                    
                    const isFlowing = activeAgent === fromNode.role || (simStep >= 0 && agentNodes.findIndex(n => n.role === fromNode.role) <= simStep && agentNodes.findIndex(n => n.role === toNode.role) >= simStep);

                    return (
                      <g key={idx}>
                        <path
                          d={`M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`}
                          stroke={isFlowing ? '#141413' : '#141413/10'}
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
                      className={`absolute p-2.5 rounded-[20px] border flex flex-col items-center justify-between w-24 h-24 transition-all duration-300 select-none ${
                        isActive
                          ? 'bg-white border-[#141413] ring-4 ring-[#141413]/05 scale-105 shadow-[rgba(0,0,0,0.06)_0px_8px_24px_0px]'
                          : isVetted
                          ? 'bg-white/80 border-[#141413]/10 opacity-80'
                          : 'bg-[#FCFBFA] border-[#141413]/10'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={node.avatar}
                          alt={node.role}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover filter grayscale"
                        />
                        {isActive && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-600 animate-ping" />
                        )}
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-[#141413] block font-mono">{node.role}</span>
                        <span className="text-[8px] text-[#696969] block truncate max-w-[80px] font-sans font-semibold">{node.name.split(' ')[0]}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Micro operational alert */}
                {simulatingId && (
                  <div className="absolute bottom-4 right-4 p-2.5 rounded-full bg-[#141413]/05 border border-[#141413]/10 text-[9px] font-mono text-[#141413] animate-pulse flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Simulating AI Debate Threads...
                  </div>
                )}
              </div>
            </div>

            {/* Results section */}
            {activeInit.status === 'completed' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Agent Conversations Thread */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#141413]" />
                    <h4 className="text-xs font-bold text-[#141413] uppercase tracking-wider font-mono">AI Debate logs</h4>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {activeInit.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3.5 rounded-[16px] border text-xs relative space-y-1 ${
                          msg.isConflict
                            ? 'bg-amber-50 border-amber-200'
                            : msg.sender === 'ConflictResolver'
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'bg-[#FCFBFA] border-[#141413]/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold uppercase tracking-wider text-[9px] font-mono ${
                            msg.sender === 'CEO' ? 'text-indigo-800' :
                            msg.sender === 'Finance' ? 'text-emerald-800' :
                            msg.sender === 'ConflictResolver' ? 'text-purple-800' : 'text-[#696969]'
                          }`}>
                            {msg.sender} → {msg.receiver}
                          </span>
                          
                          {msg.isConflict && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5 uppercase tracking-wider font-mono">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Conflict
                            </span>
                          )}
                        </div>
                        <p className="text-[#141413] leading-relaxed font-sans">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deliverables Produced */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-bold text-[#141413] uppercase tracking-wider font-mono">Assets Produced</h4>
                  </div>

                  {activeInit.deliverables.length > 0 ? (
                    <div className="space-y-3">
                      {activeInit.deliverables.map((del) => (
                        <div
                          key={del.id}
                          className="p-4 rounded-[20px] border border-[#141413]/10 bg-[#FCFBFA] hover:border-[#141413]/30 hover:bg-white transition-all flex items-start gap-3.5"
                        >
                          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-[#141413]">{del.title}</h5>
                              <span className="px-2 py-0.5 text-[8px] rounded-full uppercase bg-emerald-500/10 text-emerald-700 font-bold tracking-wider font-mono border border-emerald-500/20">
                                Ready
                              </span>
                            </div>
                            <p className="text-[11px] text-[#696969] line-clamp-2 leading-relaxed">{del.description}</p>
                            <button
                              onClick={() => setPreviewDeliverable(del)}
                              className="mt-2 text-[10px] text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer font-sans"
                            >
                              Inspect Asset Draft <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-[20px] border border-dashed border-[#141413]/20 bg-white text-center text-xs text-[#696969]">
                      No deliverables generated yet. Run the simulation.
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        ) : (
          <div className="p-12 rounded-[20px] border border-dashed border-[#141413]/20 bg-white text-center text-[#696969] text-xs">
            No active strategic sprint selected.
          </div>
        )}
      </div>

      {/* Deliverable Document Preview Overlay (Modal) */}
      {previewDeliverable && (
        <div id="deliverable-modal-overlay" className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-[#141413]/10 rounded-[20px] shadow-[rgba(0,0,0,0.12)_0px_24px_48px_0px] flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#141413]/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#141413]/05 text-[#141413] border border-[#141413]/10">
                  {previewDeliverable.type}
                </span>
                <h4 className="text-sm font-bold text-[#141413] mt-2">{previewDeliverable.title}</h4>
              </div>
              <button
                onClick={() => setPreviewDeliverable(null)}
                className="px-3.5 py-1.5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 text-xs text-[#696969] hover:text-[#141413] transition-all cursor-pointer font-sans"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 max-w-none text-xs text-[#141413] leading-relaxed font-mono whitespace-pre-wrap bg-[#FCFBFA]">
              {previewDeliverable.content}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#141413]/10 bg-[#F3F0EE] flex items-center justify-between text-[10px] text-[#696969] font-mono">
              <span>Impact Score: {previewDeliverable.impact}</span>
              <span className="text-[#141413] font-bold">Financial: {previewDeliverable.financialChange ? `${previewDeliverable.financialChange > 0 ? '+' : ''}$${previewDeliverable.financialChange.toLocaleString()}` : 'Neutral'}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
