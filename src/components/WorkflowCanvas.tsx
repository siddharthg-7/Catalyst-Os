/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Initiative, AgentRole, Deliverable } from '../types';
import {
  Play, Plus, RefreshCw, AlertTriangle, FileText, CheckCircle2,
  ChevronRight, MessageSquare, ArrowRight, ArrowLeft, Users,
  Sparkles, Check, Layers, Clock, ShieldCheck, X
} from 'lucide-react';

interface WorkflowCanvasProps {
  initiatives: Initiative[];
  onLaunchInitiative: (title: string, description: string, category: 'funding' | 'hiring' | 'growth' | 'operations' | 'legal') => Promise<void>;
  onSimulateInitiative: (id: string) => Promise<void>;
  onNavigate?: (tab: string) => void;
}

export default function WorkflowCanvas({ initiatives, onLaunchInitiative, onSimulateInitiative, onNavigate }: WorkflowCanvasProps) {
  const [selectedInitId, setSelectedInitId] = useState<string>(initiatives[0]?.id || '');
  const [workflowView, setWorkflowView] = useState<'list' | 'detail'>('detail');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [isLaunching, setIsLaunching] = useState(false);
  
  // Custom Initiative Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<'funding' | 'hiring' | 'growth' | 'operations' | 'legal'>('growth');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['CEO', 'Finance', 'Legal']);
  const [targetMilestone, setTargetMilestone] = useState('30-Day Execution Cycle');

  // Detail View Sub-tabs: 'topology' | 'debate' | 'deliverables'
  const [detailTab, setDetailTab] = useState<'topology' | 'debate' | 'deliverables'>('topology');

  // Interactive Live Simulation Tracking
  const [simStep, setSimStep] = useState<number>(-1);
  const [activeAgent, setActiveAgent] = useState<AgentRole | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simProgressMessage, setSimProgressMessage] = useState('');

  // Selected Deliverable for visual preview modal
  const [previewDeliverable, setPreviewDeliverable] = useState<Deliverable | null>(null);

  const activeInit = initiatives.find(i => i.id === selectedInitId) || initiatives[0];

  // Pre-configured executive templates
  const templates = [
    {
      title: 'Formulate Q3 Institutional Seed Funding Pitch & Economics',
      description: 'Prepare strategic financial pitch scripts, model CAC payback terms, audit cap table, and structure accredited investor disclosures.',
      category: 'funding' as const,
      executives: ['CEO', 'Finance', 'Legal'],
      duration: '4-Week Sprint'
    },
    {
      title: 'Founding Infrastructure Engineer Compensation Package',
      description: 'Structure employment agreements, options vesting cliffs, IP transfer covenants, and stress test cash runways against salary.',
      category: 'hiring' as const,
      executives: ['CEO', 'Talent', 'Finance', 'Legal'],
      duration: '2-Week Sprint'
    },
    {
      title: 'SOC-2 Compliance Checklist & Vendor Security Policies',
      description: 'Draft internal data protection guidelines, formulate password compliance, and verify third-party vendor encryption policies.',
      category: 'operations' as const,
      executives: ['CEO', 'Legal', 'Operations'],
      duration: '3-Week Sprint'
    }
  ];

  // Coordinates node positions on our interactive SVG collaboration workspace
  const agentNodes: { role: AgentRole; x: number; y: number; name: string; avatar: string }[] = [
    { role: 'CEO', x: 300, y: 55, name: 'Atlas (CEO)', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
    { role: 'Finance', x: 100, y: 160, name: 'Marcus (CFO)', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
    { role: 'Talent', x: 500, y: 160, name: 'Evelyn (CPO)', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150' },
    { role: 'Growth', x: 100, y: 300, name: 'Dax (CRO)', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { role: 'Legal', x: 300, y: 390, name: 'Helena (CLO)', avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150' },
    { role: 'ConflictResolver', x: 300, y: 220, name: 'Pax-9 Synthesis', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150' },
    { role: 'ApprovalManager', x: 300, y: 490, name: 'Loom-V Director', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
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

  // Run multi-agent executive council simulation
  const handleSimulate = async (id: string) => {
    setSimulatingId(id);
    setSimStep(0);
    
    const steps = [
      { agent: 'CEO' as const, msg: 'Atlas (CEO / Strategy) decomposing strategic objectives & bottlenecks...' },
      { agent: 'Finance' as const, msg: 'Aura (CFO / Finance) auditing runway impact & monthly burn margins...' },
      { agent: 'Operations' as const, msg: 'Helix (VP / Operations) evaluating engineering capacity & onboarding ramp...' },
      { agent: 'Growth' as const, msg: 'Vector (VP / Growth) analyzing enterprise pilot SLAs & ARR targets...' },
      { agent: 'ConflictResolver' as const, msg: 'Pax-9 Synthesis mediating executive trade-offs & consensus...' },
      { agent: 'ApprovalManager' as const, msg: 'Loom-V Director packaging executive decision charter for founder review...' }
    ];

    // Trigger backend multi-agent orchestration concurrently
    const apiPromise = onSimulateInitiative(id);

    for (let i = 0; i < steps.length; i++) {
      setSimStep(i);
      setActiveAgent(steps[i].agent);
      setSimProgressMessage(steps[i].msg);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      await apiPromise;
      // Auto-switch to deliverables tab so the founder sees the verified recommendation immediately
      setDetailTab('deliverables');
    } catch (err) {
      console.error(err);
    } finally {
      setSimStep(-1);
      setActiveAgent(null);
      setSimulatingId(null);
      setSimProgressMessage('');
    }
  };

  const handleLaunchSubmit = async () => {
    if (!newTitle || !newDescription) return;
    setIsLaunching(true);
    try {
      await onLaunchInitiative(newTitle, newDescription, newCategory);
      setNewTitle('');
      setNewDescription('');
      setIsCreateOpen(false);
      setCreateStep(1);
      setWorkflowView('detail');
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
    setSelectedAgents(tpl.executives);
    setIsCreateOpen(true);
    setCreateStep(2);
  };

  // Autoselect first initiative if none is selected
  useEffect(() => {
    if (initiatives.length > 0 && !selectedInitId) {
      setSelectedInitId(initiatives[0].id);
    }
  }, [initiatives, selectedInitId]);

  return (
    <div id="workflow-canvas-container" className="space-y-8 font-sans">
      
      {/* ── TOP SECTION HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141413]/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#696969]">
              Multi-Agent Orchestration
            </span>
            <span className="w-1 h-1 rounded-full bg-[#141413]/30" />
            <span className="text-[11px] font-mono text-[#696969]">
              {initiatives.length} Strategic Sprints
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
            Workflows & Sprints
          </h1>
          <p className="text-sm text-[#696969] mt-1 max-w-2xl">
            Autonomous multi-agent execution pipelines. Dispatch executive councils, simulate strategic decisions, and track verified deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center p-1 rounded-xl bg-[#141413]/05 border border-[#141413]/10 text-xs font-semibold">
            <button
              onClick={() => setWorkflowView('detail')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                workflowView === 'detail'
                  ? 'bg-white text-[#141413] shadow-sm font-bold'
                  : 'text-[#696969] hover:text-[#141413]'
              }`}
            >
              Workspace
            </button>
            <button
              onClick={() => setWorkflowView('list')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                workflowView === 'list'
                  ? 'bg-white text-[#141413] shadow-sm font-bold'
                  : 'text-[#696969] hover:text-[#141413]'
              }`}
            >
              All Workflows ({initiatives.length})
            </button>
          </div>

          <button
            onClick={() => {
              setIsCreateOpen(true);
              setCreateStep(1);
            }}
            className="interactive-btn px-4 py-2.5 rounded-xl bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#F3F0EE]" />
            New Workflow
          </button>
        </div>
      </div>

      {/* ── CONDITIONAL VIEW 1: WORKFLOW LIST / INDEX ───────────────────────── */}
      {workflowView === 'list' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Active Workflows Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#141413]">Active & In-Flight Sprints</h3>
                <p className="text-xs text-[#696969]">Workflows currently undergoing executive council collaboration or awaiting founder action.</p>
              </div>
              <span className="text-xs font-mono text-[#696969]">
                {initiatives.filter(i => i.status !== 'completed').length} In Flight
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {initiatives.map((init) => (
                <div
                  key={init.id}
                  onClick={() => {
                    setSelectedInitId(init.id);
                    setWorkflowView('detail');
                  }}
                  className="catalyst-card card-hover glow-border p-5 rounded-2xl flex flex-col justify-between cursor-pointer group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase border ${
                        init.category === 'funding' ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' :
                        init.category === 'hiring' ? 'bg-pink-500/10 text-pink-800 border-pink-500/20' :
                        'bg-indigo-500/10 text-indigo-800 border-indigo-500/20'
                      }`}>
                        {init.category}
                      </span>
                      <span className={`text-[10px] font-bold flex items-center gap-1.5 font-mono ${
                        init.status === 'completed' ? 'text-emerald-700' :
                        init.status === 'active' ? 'text-amber-700' : 'text-[#696969]'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          init.status === 'completed' ? 'bg-emerald-600' :
                          init.status === 'active' ? 'bg-amber-500 animate-pulse' : 'bg-[#696969]'
                        }`} />
                        {init.status.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#141413] group-hover:text-black line-clamp-2">
                      {init.title}
                    </h4>
                    <p className="text-xs text-[#696969] line-clamp-3 leading-relaxed">
                      {init.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#141413]/05 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-[#696969] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {init.deliverables.length} Deliverables
                    </span>
                    <span className="text-[11px] font-bold text-[#141413] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Open Canvas <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Curated Enterprise Templates Section */}
          <section className="space-y-4 pt-4 border-t border-[#141413]/10">
            <div>
              <h3 className="text-base font-bold text-[#141413]">Enterprise Sprint Templates</h3>
              <p className="text-xs text-[#696969]">Pre-engineered executive council topologies for common high-impact corporate maneuvers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {templates.map((tpl, idx) => (
                <div
                  key={idx}
                  className="catalyst-card card-hover glow-border p-5 rounded-2xl flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-[#141413]/05 text-[#141413] uppercase">
                        {tpl.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#696969]">{tpl.duration}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#141413]">{tpl.title}</h4>
                    <p className="text-xs text-[#696969] leading-relaxed">{tpl.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#141413]/05 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {tpl.executives.map((role, i) => (
                        <span
                          key={i}
                          className="w-6 h-6 rounded-full bg-[#141413] text-[#F3F0EE] text-[9px] font-bold font-mono flex items-center justify-center border-2 border-white"
                          title={role}
                        >
                          {role[0]}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-3 py-1.5 rounded-lg bg-[#141413]/05 hover:bg-[#141413] hover:text-[#F3F0EE] text-xs font-bold text-[#141413] transition-all cursor-pointer font-sans"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* ── CONDITIONAL VIEW 2: WORKSPACE & DETAILS ──────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* Left Column: Quick Sprint Selector (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-[#141413]">
                Strategic Sprints ({initiatives.length})
              </span>
              <button
                onClick={() => setWorkflowView('list')}
                className="text-[11px] text-[#696969] hover:text-[#141413] underline font-medium"
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {initiatives.map((init) => (
                <button
                  key={init.id}
                  onClick={() => setSelectedInitId(init.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedInitId === init.id
                      ? 'bg-white border-[#141413] shadow-md ring-1 ring-[#141413]/05'
                      : 'bg-white/60 border-[#141413]/10 hover:bg-white hover:border-[#141413]/25'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full uppercase ${
                      init.category === 'funding' ? 'bg-emerald-500/10 text-emerald-800' :
                      init.category === 'hiring' ? 'bg-pink-500/10 text-pink-800' :
                      'bg-indigo-500/10 text-indigo-800'
                    }`}>
                      {init.category}
                    </span>
                    <span className={`text-[10px] font-bold flex items-center gap-1 font-mono ${
                      init.status === 'completed' ? 'text-emerald-700' :
                      init.status === 'active' ? 'text-amber-700' : 'text-[#696969]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        init.status === 'completed' ? 'bg-emerald-600' :
                        init.status === 'active' ? 'bg-amber-500 animate-pulse' : 'bg-[#696969]'
                      }`} />
                      {init.status.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#141413] line-clamp-1">{init.title}</h4>
                  <p className="mt-1 text-[11px] text-[#696969] line-clamp-2 leading-relaxed">
                    {init.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Quick Template Card */}
            <div className="p-4 rounded-2xl border border-dashed border-[#141413]/20 bg-[#141413]/02 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] block">
                Quick Deploy
              </span>
              <p className="text-xs text-[#696969]">
                Deploy an accredited Q3 institutional funding, SOC-2, or compensation round.
              </p>
              <button
                onClick={() => {
                  handleApplyTemplate(templates[0]);
                }}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-white border border-[#141413]/15 text-xs font-bold text-[#141413] hover:border-[#141413] transition-colors"
              >
                Use Funding Template →
              </button>
            </div>
          </div>

          {/* Right Column: Active Workflow Detail Canvas (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            {activeInit ? (
              <div className="catalyst-card rounded-2xl p-6 space-y-6">
                
                {/* Active Workflow Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#141413]/10 pb-5">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#141413]/05 text-[#141413] border border-[#141413]/10">
                        SPRINT-{activeInit.id.slice(0, 8)}
                      </span>
                      <span className="text-xs font-mono uppercase font-bold text-[#696969]">
                        {activeInit.category} Track
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-[#141413] leading-snug">
                      {activeInit.title}
                    </h2>
                    <p className="text-xs text-[#696969] leading-relaxed">
                      {activeInit.description}
                    </p>
                  </div>

                  {/* Primary Simulation CTA */}
                  <div className="shrink-0 self-start sm:self-center">
                    {activeInit.status === 'pending' || activeInit.status === 'active' ? (
                      <button
                        onClick={() => handleSimulate(activeInit.id)}
                        disabled={simulatingId !== null}
                        className="interactive-btn magnetic-btn px-5 py-2.5 rounded-xl bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] flex items-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        <Play className="w-4 h-4 text-[#F3F0EE]" />
                        {simulatingId === activeInit.id ? 'Simulating Debate...' : 'Orchestrate Council'}
                      </button>
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 text-xs font-mono font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Completed & Audited
                      </span>
                    )}
                  </div>
                </div>

                {/* Simulation Progress Alert Bar */}
                {simulatingId === activeInit.id && (
                  <div className="p-5 rounded-2xl border border-[#141413]/15 bg-[#141413]/05 space-y-3 animate-pulse">
                    <div className="flex items-center justify-between text-xs font-bold text-[#141413]">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Live Multi-Agent Synthesis in Progress
                      </span>
                      <span className="font-mono text-[#696969]">Step {simStep + 1} of 7</span>
                    </div>
                    <p className="text-xs font-mono text-[#141413]">{simProgressMessage}</p>
                    <div className="w-full h-2 bg-[#141413]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#141413] rounded-full transition-all duration-500"
                        style={{ width: `${((simStep + 1) / 7) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-2 border-b border-[#141413]/10 pb-2">
                  <button
                    onClick={() => setDetailTab('topology')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      detailTab === 'topology'
                        ? 'bg-[#141413] text-[#F3F0EE]'
                        : 'text-[#696969] hover:text-[#141413]'
                    }`}
                  >
                    Council Topology & Network
                  </button>
                  <button
                    onClick={() => setDetailTab('debate')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      detailTab === 'debate'
                        ? 'bg-[#141413] text-[#F3F0EE]'
                        : 'text-[#696969] hover:text-[#141413]'
                    }`}
                  >
                    Debate Logs
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#141413]/10 text-current">
                      {activeInit.messages.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setDetailTab('deliverables')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      detailTab === 'deliverables'
                        ? 'bg-[#141413] text-[#F3F0EE]'
                        : 'text-[#696969] hover:text-[#141413]'
                    }`}
                  >
                    Verified Assets
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#141413]/10 text-current">
                      {activeInit.deliverables.length}
                    </span>
                  </button>
                </div>

                {/* Sub-tab 1: SVG Multi-Agent Collaboration Topology */}
                {detailTab === 'topology' && (
                  <div className="space-y-4">
                    <div className="p-4 border border-[#141413]/10 rounded-2xl bg-[#FCFBFA] relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969]">
                          Executive Collaboration Graph
                        </span>
                        <span className="text-[10px] font-mono text-[#696969]">
                          7 Connected Council Nodes
                        </span>
                      </div>

                      <div className="relative h-[540px] w-full overflow-hidden flex items-center justify-center">
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
                                  stroke={isFlowing ? '#141413' : '#141413/15'}
                                  strokeWidth={isFlowing ? 2.5 : 1.5}
                                  strokeDasharray={isFlowing ? '4,4' : undefined}
                                />
                              </g>
                            );
                          })}
                        </svg>

                        {/* Agent nodes */}
                        {agentNodes.map((node) => {
                          const isActive = activeAgent === node.role;
                          const isVetted = simStep >= 0 && agentNodes.findIndex(n => n.role === node.role) < simStep;

                          return (
                            <div
                              key={node.role}
                              style={{ left: `${node.x - 45}px`, top: `${node.y - 45}px` }}
                              className={`absolute p-3 rounded-2xl border flex flex-col items-center justify-between w-24 h-24 transition-all duration-300 select-none shadow-sm ${
                                isActive
                                  ? 'bg-white border-[#141413] ring-4 ring-[#141413]/10 scale-105 shadow-lg'
                                  : isVetted
                                  ? 'bg-white border-emerald-500/40 text-[#141413]'
                                  : 'bg-white/90 border-[#141413]/10'
                              }`}
                            >
                              <div className="relative">
                                <img
                                  src={node.avatar}
                                  alt={node.role}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-full object-cover filter grayscale border border-[#141413]/10"
                                />
                                {isActive && (
                                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                                )}
                              </div>
                              <div className="text-center">
                                <span className="text-[10px] font-bold text-[#141413] block font-mono">
                                  {node.role}
                                </span>
                                <span className="text-[9px] text-[#696969] block truncate max-w-[80px]">
                                  {node.name.split(' ')[0]}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Debate Logs */}
                {detailTab === 'debate' && (
                  <div className="space-y-4">
                    {activeInit.messages.length > 0 ? (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {activeInit.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                              msg.isConflict
                                ? 'bg-amber-500/05 border-amber-500/30'
                                : msg.sender === 'ConflictResolver'
                                ? 'bg-indigo-500/05 border-indigo-500/30'
                                : 'bg-[#FCFBFA] border-[#141413]/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-[#141413]">
                                {msg.sender} → {msg.receiver}
                              </span>
                              {msg.isConflict && (
                                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Boundary Conflict
                                </span>
                              )}
                            </div>
                            <p className="text-[#141413] leading-relaxed font-sans">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#141413]/15 rounded-2xl text-xs text-[#696969]">
                        No deliberation logs recorded yet. Launch orchestration to view the multi-agent debate.
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-tab 3: Deliverables & Assets */}
                {detailTab === 'deliverables' && (
                  <div className="space-y-4">
                    {activeInit.deliverables.length > 0 ? (
                      <div className="space-y-4">
                        {onNavigate && (
                          <div className="p-4 rounded-2xl bg-[#141413] text-[#F3F0EE] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                            <div>
                              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                                Executive Council Consensus Reached
                              </span>
                              <h4 className="text-sm font-bold text-white">
                                Decision Charter compiled and queued for Founder Sign-Off
                              </h4>
                            </div>
                            <button
                              onClick={() => onNavigate('approvals')}
                              className="interactive-btn px-4 py-2 rounded-xl bg-white text-[#141413] text-xs font-bold hover:bg-[#F3F0EE] transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                            >
                              Review in Decision Inbox →
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeInit.deliverables.map((del) => (
                          <div
                            key={del.id}
                            className="catalyst-card catalyst-card-hover p-4 rounded-2xl flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md bg-[#141413]/05 text-[#141413]">
                                  {del.type}
                                </span>
                                <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-800">
                                  Score: {del.impact}/10
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-[#141413]">{del.title}</h4>
                              <p className="text-[11px] text-[#696969] line-clamp-2 leading-relaxed">
                                {del.description}
                              </p>
                            </div>

                            <button
                              onClick={() => setPreviewDeliverable(del)}
                              className="w-full mt-2 py-2 px-3 rounded-xl bg-[#141413]/05 hover:bg-[#141413] hover:text-[#F3F0EE] text-xs font-bold text-[#141413] transition-all flex items-center justify-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Inspect Deliverable
                            </button>
                          </div>
                        ))}
                      </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed border-[#141413]/15 rounded-2xl text-xs text-[#696969]">
                        No deliverables compiled yet for this sprint.
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-[#141413]/20 rounded-2xl text-xs text-[#696969]">
                Select a sprint or create a new initiative to begin.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── FOCUSED 6-STEP WORKFLOW CREATION MODAL ─────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-[#141413]/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header & Progress Indicator */}
            <div className="p-6 border-b border-[#141413]/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969]">
                    Step {createStep} of 6
                  </span>
                  <h3 className="text-lg font-bold text-[#141413] mt-0.5">
                    {createStep === 1 && 'Select Initiative Track'}
                    {createStep === 2 && 'Define Scope & Context'}
                    {createStep === 3 && 'Assign Executive Council'}
                    {createStep === 4 && 'Target Objectives & Milestone'}
                    {createStep === 5 && 'Executive Review & Alignment'}
                    {createStep === 6 && 'Ready to Launch'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[#141413]/05 text-[#696969] hover:text-[#141413] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-[#141413]/05 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#141413] transition-all duration-300"
                  style={{ width: `${(createStep / 6) * 100}%` }}
                />
              </div>
            </div>

            {/* Step Content */}
            <div className="p-6 space-y-4 min-h-[260px] flex flex-col justify-center">
              {/* Step 1: Track */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-[#141413] block">
                    Choose Strategic Domain
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {(['growth', 'funding', 'hiring', 'operations', 'legal'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`p-3 rounded-xl border text-left transition-all capitalize font-semibold text-xs ${
                          newCategory === cat
                            ? 'bg-[#141413] text-[#F3F0EE] border-[#141413]'
                            : 'bg-white border-[#141413]/15 text-[#141413] hover:border-[#141413]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#141413] block mb-1.5">Initiative Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Enterprise SOC-2 Audit & Compliance"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413] focus:outline-none focus:border-[#141413]"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Scope & Context */}
              {createStep === 2 && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#141413] block">
                    Directives & Operational Bounds
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Specify constraints, key deliverables expected, budget boundaries, and timelines..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413] focus:outline-none focus:border-[#141413] leading-relaxed resize-none"
                  />
                  <p className="text-[11px] text-[#696969]">
                    The multi-agent debate engine will use these directives to guide disagreement resolution.
                  </p>
                </div>
              )}

              {/* Step 3: Select Executives */}
              {createStep === 3 && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#141413] block">
                    Select Participating AI Executives
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { role: 'CEO', label: 'Atlas (CEO & Orchestrator)' },
                      { role: 'Finance', label: 'Marcus (CFO & Treasury)' },
                      { role: 'Legal', label: 'Helena (CLO & Compliance)' },
                      { role: 'Growth', label: 'Dax (CRO & Marketing)' },
                      { role: 'Talent', label: 'Evelyn (CPO & People)' },
                      { role: 'Operations', label: 'Vector (COO & Ops)' },
                    ].map((agent) => {
                      const isSelected = selectedAgents.includes(agent.role);
                      return (
                        <button
                          key={agent.role}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAgents(selectedAgents.filter(a => a !== agent.role));
                            } else {
                              setSelectedAgents([...selectedAgents, agent.role]);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#141413] text-[#F3F0EE] border-[#141413]'
                              : 'bg-white border-[#141413]/15 text-[#141413]'
                          }`}
                        >
                          <span>{agent.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: Objectives & Targets */}
              {createStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#141413] block mb-1.5">
                      Target Completion Milestone
                    </label>
                    <select
                      value={targetMilestone}
                      onChange={(e) => setTargetMilestone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413] focus:outline-none focus:border-[#141413]"
                    >
                      <option value="2-Week Sprint">2-Week Sprint (Rapid Turnaround)</option>
                      <option value="30-Day Execution Cycle">30-Day Execution Cycle (Standard)</option>
                      <option value="Quarterly Board Cycle">Quarterly Board Cycle (Comprehensive)</option>
                    </select>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FCFBFA] border border-[#141413]/10 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-[#141413] uppercase">
                      Governance Guardrail
                    </span>
                    <p className="text-xs text-[#696969]">
                      Any capital changes above $15k will automatically pause for founder sign-off before committing to the Decision Ledger.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {createStep === 5 && (
                <div className="p-4 rounded-xl bg-[#FCFBFA] border border-[#141413]/10 space-y-3 text-xs">
                  <div className="flex justify-between border-b border-[#141413]/05 pb-2">
                    <span className="text-[#696969]">Track:</span>
                    <span className="font-bold text-[#141413] uppercase font-mono">{newCategory}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#141413]/05 pb-2">
                    <span className="text-[#696969]">Title:</span>
                    <span className="font-bold text-[#141413] text-right line-clamp-1">{newTitle || 'Untitled Sprint'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#141413]/05 pb-2">
                    <span className="text-[#696969]">Council:</span>
                    <span className="font-bold text-[#141413]">{selectedAgents.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#696969]">Milestone:</span>
                    <span className="font-bold text-[#141413]">{targetMilestone}</span>
                  </div>
                </div>
              )}

              {/* Step 6: Launch */}
              {createStep === 6 && (
                <div className="text-center space-y-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-800 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-[#141413]">Council Ready to Deploy</h4>
                  <p className="text-xs text-[#696969] max-w-sm mx-auto">
                    Spawning this workflow will initiate cross-functional agent deliberations and generate deliverables for your review.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 border-t border-[#141413]/10 bg-[#FCFBFA] flex items-center justify-between">
              {createStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCreateStep(createStep - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#696969] hover:text-[#141413] flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {createStep < 6 ? (
                <button
                  type="button"
                  disabled={createStep === 1 && !newTitle.trim()}
                  onClick={() => setCreateStep(createStep + 1)}
                  className="interactive-btn px-5 py-2.5 rounded-xl bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] flex items-center gap-1.5 disabled:opacity-50"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLaunching}
                  onClick={handleLaunchSubmit}
                  className="interactive-btn px-6 py-2.5 rounded-xl bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isLaunching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Spawning...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Deploy Sprint
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── DELIVERABLE PREVIEW MODAL ──────────────────────────────────────── */}
      {previewDeliverable && (
        <div id="deliverable-modal-overlay" className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-[#141413]/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
            
            <div className="p-5 border-b border-[#141413]/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#141413]/05 text-[#141413] border border-[#141413]/10">
                  {previewDeliverable.type}
                </span>
                <h4 className="text-base font-bold text-[#141413] mt-1.5">{previewDeliverable.title}</h4>
              </div>
              <button
                onClick={() => setPreviewDeliverable(null)}
                className="p-1.5 rounded-full hover:bg-[#141413]/05 text-[#696969] hover:text-[#141413] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#141413] leading-relaxed font-mono whitespace-pre-wrap bg-[#FCFBFA]">
              {previewDeliverable.content}
            </div>

            <div className="p-4 border-t border-[#141413]/10 bg-[#FCFBFA] flex items-center justify-between text-xs text-[#696969] font-mono">
              <div className="flex items-center gap-3">
                <span>Impact: {previewDeliverable.impact}</span>
                <span className="text-[#141413] font-bold">
                  Treasury: {previewDeliverable.financialChange ? `${previewDeliverable.financialChange > 0 ? '+' : ''}${(previewDeliverable.financialChange / 1000).toFixed(0)}k` : 'Neutral'}
                </span>
              </div>
              {onNavigate && (
                <button
                  onClick={() => {
                    setPreviewDeliverable(null);
                    onNavigate('approvals');
                  }}
                  className="interactive-btn px-4 py-2 rounded-xl bg-[#141413] text-[#F3F0EE] font-sans font-bold hover:bg-[#262627] transition-all flex items-center gap-1.5"
                >
                  Open in Decision Inbox →
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
