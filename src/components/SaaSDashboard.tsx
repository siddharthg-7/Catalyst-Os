import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  Wallet, Flame, Hourglass, Activity, ShieldCheck, TrendingUp, Cpu, Award,
  CheckCircle2, XCircle, AlertCircle, FileText, Send, Calendar, HardDrive, 
  BookOpen, Sparkles, Terminal, Play, Plus, Search, ChevronRight, HelpCircle,
  Clock, ArrowUpRight, ArrowDownRight, ClipboardList, Shield, User, Landmark, 
  Briefcase, Users, Cog, MessageSquare, ArrowRight, RefreshCw, Layers, Check, CheckSquare
} from 'lucide-react';
import CatalystLogo from './CatalystLogo';

interface SaaSDashboardProps {
  startup: StartupProfile;
  agents: Agent[];
  initiatives: Initiative[];
  approvals: Deliverable[];
  decisions: DecisionRecord[];
  knowledge: KnowledgeFile[];
  onReviewItem: (id: string, action: 'approve' | 'reject', feedback?: string) => Promise<void>;
  onUploadDoc: (name: string, content: string, type: string) => Promise<void>;
  onLaunchInitiative: (title: string, description: string, category: 'funding' | 'hiring' | 'growth' | 'operations' | 'legal') => Promise<void>;
  onSimulateInitiative: (id: string) => Promise<void>;
  onUpdateStartup: (updated: StartupProfile) => void;
}

export default function SaaSDashboard({
  startup,
  agents,
  initiatives,
  approvals,
  decisions,
  knowledge,
  onReviewItem,
  onUploadDoc,
  onLaunchInitiative,
  onSimulateInitiative,
  onUpdateStartup,
}: SaaSDashboardProps) {
  // Command Box State
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandResponse, setCommandResponse] = useState<{
    text: string;
    type: 'success' | 'info' | 'error' | 'rag';
    metadata?: any;
  } | null>(null);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);

  // Approvals Modify State
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>(approvals[0]?.id || '');
  const [feedback, setFeedback] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [modifyInput, setModifyInput] = useState('');
  const [modifiedAssetContent, setModifiedAssetContent] = useState<string | null>(null);
  const [isReSynthesizing, setIsReSynthesizing] = useState(false);

  // Selected Approval details
  const activeApproval = useMemo(() => {
    return approvals.find(a => a.id === selectedApprovalId) || approvals[0] || null;
  }, [approvals, selectedApprovalId]);

  useEffect(() => {
    if (approvals.length > 0 && (!selectedApprovalId || !approvals.find(a => a.id === selectedApprovalId))) {
      setSelectedApprovalId(approvals[0].id);
    }
  }, [approvals, selectedApprovalId]);

  // Executive chat interaction state
  const [consultingAgent, setConsultingAgent] = useState<Agent | null>(null);
  const [agentAnswer, setAgentAnswer] = useState<string | null>(null);
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  // Timeline / Active Sprint State
  const [selectedInitId, setSelectedInitId] = useState<string>(initiatives[0]?.id || '');
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simStep, setSimStep] = useState<number>(-1);
  const [activeSimAgent, setActiveSimAgent] = useState<string | null>(null);
  const [simProgressMessage, setSimProgressMessage] = useState('');

  const activeInitiative = useMemo(() => {
    return initiatives.find(i => i.id === selectedInitId) || initiatives[0] || null;
  }, [initiatives, selectedInitId]);

  useEffect(() => {
    if (initiatives.length > 0 && (!selectedInitId || !initiatives.find(i => i.id === selectedInitId))) {
      setSelectedInitId(initiatives[0].id);
    }
  }, [initiatives, selectedInitId]);

  // Knowledge upload form states
  const [uploadName, setUploadName] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadType, setUploadType] = useState('pitch_deck');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>(knowledge[0]?.id || '');
  
  const activeDoc = useMemo(() => {
    return knowledge.find(k => k.id === selectedDocId) || knowledge[0] || null;
  }, [knowledge, selectedDocId]);

  useEffect(() => {
    if (knowledge.length > 0 && (!selectedDocId || !knowledge.find(k => k.id === selectedDocId))) {
      setSelectedDocId(knowledge[0].id);
    }
  }, [knowledge, selectedDocId]);

  // Startup Memory Query / RAG System State
  const [memoryQuery, setMemoryQuery] = useState('');
  const [isSearchingMemory, setIsSearchingMemory] = useState(false);
  const [memoryResults, setMemoryResults] = useState<any[] | null>(null);
  const [selectedMemoryScopes, setSelectedMemoryScopes] = useState({
    decisions: true,
    commands: true,
    notes: true,
    strategies: true,
    recommendations: true,
  });

  // Feature Blueprint State: Scenario Simulator, Meeting Notes, Reports, Integrations
  const [extraEngineers, setExtraEngineers] = useState<number>(2);
  const [extraGrowthBudget, setExtraGrowthBudget] = useState<number>(5000);
  const [meetingTranscript, setMeetingTranscript] = useState<string>('');
  const [extractedMeetingTasks, setExtractedMeetingTasks] = useState<any[] | null>(null);
  const [isExtractingNotes, setIsExtractingNotes] = useState<boolean>(false);
  const [generatedReport, setGeneratedReport] = useState<{ title: string; type: string; content: string } | null>(null);
  const [emailModal, setEmailModal] = useState<{ recipient: string; subject: string; body: string } | null>(null);

  // KPI calculations
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Radar chart metrics data
  const radarData = useMemo(() => {
    return [
      { subject: 'Velocity', value: startup.metrics.velocity, fullMark: 100 },
      { subject: 'Finance', value: startup.metrics.financialHealth, fullMark: 100 },
      { subject: 'Compliance', value: startup.metrics.legalCompliance, fullMark: 100 },
      { subject: 'Growth', value: startup.metrics.growthRate, fullMark: 100 },
      { subject: 'Efficiency', value: startup.metrics.operationsEfficiency, fullMark: 100 },
    ];
  }, [startup.metrics]);

  // 12-month treasury projections
  const projectionData = useMemo(() => {
    const data = [];
    let cash = startup.cashBalance;
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      data.push({
        name: date.toLocaleString('default', { month: 'short' }),
        'Treasury Balance': Math.round(cash),
      });
      cash = Math.max(0, cash - startup.burnRate);
      date.setMonth(date.getMonth() + 1);
    }
    return data;
  }, [startup.cashBalance, startup.burnRate]);

  // Executive consulting trigger
  const handleConsultAgent = async (agent: Agent) => {
    setConsultingAgent(agent);
    setAgentAnswer(null);
    setIsAgentThinking(true);

    try {
      // Simulate real-time secure advisory
      await new Promise(resolve => setTimeout(resolve, 1200));
      let response = '';
      if (agent.role === 'CEO') {
        response = `As CEO, I'm analyzing our overall SaaS Health score of ${startup.healthScore}%. We need to aggressively address our Engineering velocity (+${startup.metrics.velocity}%) while keeping a runway buffer of at least 15 months. Let's prioritize product sprints.`;
      } else if (agent.role === 'Finance') {
        response = `My audit shows cash reserves at ${formatCurrency(startup.cashBalance)} with a monthly burn rate of ${formatCurrency(startup.burnRate)}. We have approximately ${startup.runwayMonths} months of runaway. I recommend scaling back growth budgets slightly to preserve runway.`;
      } else if (agent.role === 'Legal') {
        response = `Our legal compliance score stands at ${startup.metrics.legalCompliance}%. I've vetted our operational disclosures. I advise keeping precise records of all founder signatures in the Decision Ledger to satisfy future Series-A diligence.`;
      } else if (agent.role === 'Talent') {
        response = `Evelyn here. With engineering velocity at ${startup.metrics.velocity}%, we have space to bring on 1 lead platform architect. I've designed a standard stock option package with a 1-year cliff to protect early cap table allocations.`;
      } else if (agent.role === 'Growth') {
        response = `Growth pipeline is strong but CAC payback remains elevated. I recommend triggering a growth sprint to model custom marketing campaigns. An extra 10% budget could push pipeline growth beyond ${startup.metrics.growthRate}%.`;
      } else {
        response = `System synthesis is active. I'm ensuring all executive guidelines align perfectly. Operational integrity metrics are green. Ready for next sprint deployment.`;
      }
      setAgentAnswer(response);
    } catch (err) {
      console.error(err);
      setAgentAnswer('Consultation offline. Please try again.');
    } finally {
      setIsAgentThinking(false);
    }
  };

  // Feature Blueprint Handler: Meeting Notes -> Tasks Extractor
  const handleExtractMeetingNotes = async () => {
    if (!meetingTranscript.trim()) return;
    setIsExtractingNotes(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const extracted = [
        { task: 'Deploy automated failover node cluster across AWS us-east-1', owner: 'Kaelen Finch (Operations)', deadline: 'In 5 days', priority: 'High' },
        { task: 'Audit cap table equity dilution for 1.3% NSO option pool', owner: 'Marcus Sterling (CFO)', deadline: 'In 3 days', priority: 'High' },
        { task: 'Draft SOC-2 compliance checklist and vendor security disclosures', owner: 'Helena Vance (Legal)', deadline: 'In 7 days', priority: 'Medium' },
        { task: 'Prepare mid-market pilot outreach email sequence', owner: 'Dax Ramirez (Growth)', deadline: 'In 4 days', priority: 'Medium' },
      ];
      setExtractedMeetingTasks(extracted);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtractingNotes(false);
    }
  };

  // Feature Blueprint Handler: Investor Update Generator
  const handleGenerateInvestorUpdate = async () => {
    const text = `# MONTHLY INVESTOR UPDATE — ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
**Company:** ${startup.name} | **Stage:** ${startup.fundingStage}

### 🚀 Key Wins & Milestones
- **SaaS Health Score:** Achieved ${startup.healthScore}% (+4 points MoM).
- **Treasury Reserve:** Cash balance maintained at ${formatCurrency(startup.cashBalance)} with ${startup.runwayMonths} months of safe runway.
- **Product Execution:** Multi-agent LangGraph orchestrator deployed with zero uptime disruption.

### 📊 Financial & Growth Metrics
- **Monthly Burn:** ${formatCurrency(startup.burnRate)} / month
- **User Growth Rate:** +${startup.metrics.growthRate}% MoM
- **Operations Efficiency:** ${startup.metrics.operationsEfficiency}%

### ⚠️ Risks & Key Focus Areas
- **Engineering Bandwidth:** Currently recruiting lead platform architect to accelerate roadmap.
- **SOC-2 Compliance:** Auditing data privacy guarantees before mid-market enterprise pilot launches.

### 💬 Founder Ask
- Introductions to mid-market DevOps leaders and Series-A lead investors.`;

    setGeneratedReport({
      title: 'Monthly Investor Update Briefing',
      type: 'investor_update',
      content: text
    });
  };

  // Feature Blueprint Handler: Board Meeting Report
  const handleGenerateBoardReport = async () => {
    const text = `# BOARD OF DIRECTORS MEETING REPORT
**Entity:** ${startup.name} Inc. | **Date:** ${new Date().toLocaleDateString()}

### 1. Chief Executive Officer Report (Sophia Vance)
- Decomposed strategic objectives into executive sprints.
- Preserved corporate health score at ${startup.healthScore}%.

### 2. Financial & Treasury Report (Marcus Sterling)
- Cash position: ${formatCurrency(startup.cashBalance)} | Burn rate: ${formatCurrency(startup.burnRate)}/mo.
- Cash runway: ${startup.runwayMonths} Months. Audit status: CLEAN.

### 3. Talent & Recruitment Report (Evelyn Brooks)
- 1.3% NSO Option Pool created with standard 4-year vesting and 12-month cliff.

### 4. Growth & Product Report (Dax Ramirez & Kaelen Finch)
- Active user growth rate: +${startup.metrics.growthRate}% MoM.
- System availability: 99.98% uptime across automated node clusters.`;

    setGeneratedReport({
      title: 'Board of Directors Quarterly Report',
      type: 'board_report',
      content: text
    });
  };

  // Ingest corporate materials
  const handleIngestMaterials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !uploadContent) return;
    setIsUploading(true);
    try {
      await onUploadDoc(uploadName, uploadContent, uploadType);
      setUploadName('');
      setUploadContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  // Submit search query for RAG Memory
  const handleMemorySearch = async (customQuery?: string) => {
    const q = customQuery || memoryQuery;
    if (!q) return;
    setIsSearchingMemory(true);
    setMemoryResults(null);

    try {
      const res = await fetch('/api/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      if (res.ok) {
        const data = await res.json();
        // Generate simulated matches based on RAG knowledge base items & history for visual depth
        const simulatedHits = [
          {
            title: `RAG Synthesized Solution`,
            category: 'agent_recommendation',
            content: data.answer,
            score: 0.965,
            date: new Date().toLocaleDateString(),
            actor: 'Loom-V Synthesis Engine',
          },
        ];

        // Seed some relevant matches from our corporate archives to simulate vector database pgvector rankings
        if (knowledge.length > 0) {
          knowledge.forEach((doc, i) => {
            simulatedHits.push({
              title: `Cited Source: ${doc.name}`,
              category: 'strategy_brief',
              content: `AI Summarization: ${doc.summary}\n\nInsights Cited:\n${doc.insights.map((ins, idx) => `${idx + 1}. ${ins}`).join('\n')}`,
              score: Math.max(0.65, parseFloat((0.92 - i * 0.08).toFixed(3))),
              date: new Date(doc.uploadDate).toLocaleDateString(),
              actor: 'Corporate Ingest base',
            });
          });
        }

        // Add matching items from past decisions based on text match
        const matchingDecisions = decisions.filter(dec => 
          dec.title.toLowerCase().includes(q.toLowerCase()) || 
          dec.description.toLowerCase().includes(q.toLowerCase())
        );

        matchingDecisions.forEach(dec => {
          simulatedHits.push({
            title: `Decision Match: ${dec.title}`,
            category: 'decision',
            content: `${dec.description}\n\nOutcome: ${dec.impactText}\nCapital Shift: ${formatCurrency(dec.financialImpact)}`,
            score: 0.884,
            date: new Date(dec.timestamp).toLocaleDateString(),
            actor: 'Human Founder Signoff',
          });
        });

        // Sort by score
        simulatedHits.sort((a, b) => b.score - a.score);
        setMemoryResults(simulatedHits);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMemory(false);
    }
  };

  // Command input submission handler
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const cmdText = command.trim();
    setCommandHistory(prev => [cmdText, ...prev]);
    setCommand('');
    setIsExecutingCommand(true);
    setCommandResponse(null);

    try {
      // Check if command is a memory query or decision lookup
      const isMemoryQuery = /decide|hiring|budget|last month|decided|what did we|memory|RAG|search/i.test(cmdText);
      
      if (isMemoryQuery) {
        // Query memory system
        await new Promise(resolve => setTimeout(resolve, 800));
        const res = await fetch('/api/knowledge/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: cmdText }),
        });

        if (res.ok) {
          const data = await res.json();
          setCommandResponse({
            text: data.answer,
            type: 'rag',
            metadata: {
              query: cmdText,
              score: 0.985,
              timestamp: new Date().toISOString()
            }
          });
          // Also set the memory query input and trigger search
          setMemoryQuery(cmdText);
          handleMemorySearch(cmdText);
        } else {
          setCommandResponse({
            text: "No matching semantic results found inpgvector memory base. Try ingesting files on the Corporate Knowledge Base.",
            type: 'info'
          });
        }
      } else {
        // Check if command matches template initiatives to auto-launch sprint
        const matchedCategory = cmdText.toLowerCase().includes('money') || cmdText.toLowerCase().includes('pitch') || cmdText.toLowerCase().includes('fund') ? 'funding' :
                               cmdText.toLowerCase().includes('hire') || cmdText.toLowerCase().includes('engineer') || cmdText.toLowerCase().includes('recruit') ? 'hiring' :
                               cmdText.toLowerCase().includes('soc-2') || cmdText.toLowerCase().includes('security') || cmdText.toLowerCase().includes('compliance') ? 'operations' : 'growth';

        await new Promise(resolve => setTimeout(resolve, 1000));
        // Auto-launch sprint
        await onLaunchInitiative(
          `Founder Command: ${cmdText.slice(0, 45)}${cmdText.length > 45 ? '...' : ''}`,
          `Strategic session launched automatically via CLI menu command: "${cmdText}"`,
          matchedCategory
        );

        setCommandResponse({
          text: `Success: Strategic sprint spawned successfully inside 'Strategic Sprints' under category: ${matchedCategory.toUpperCase()}.\n\nClick 'Orchestrate AI Council' on the active sprint to simulate multi-agent debates!`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error(err);
      setCommandResponse({
        text: "Failure: Unable to execute command on server console. Verify connection.",
        type: 'error'
      });
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Orchestrate active simulation sprint
  const handleOrchestrateSprint = async (id: string) => {
    setSimulatingId(id);
    setSimStep(0);
    
    const steps = [
      { agent: 'CEO', msg: 'CEO Sophia Vance mapping core objectives and operational tasks...' },
      { agent: 'Finance', msg: 'Marcus Sterling reviewing financial constraints and treasury margins...' },
      { agent: 'Talent', msg: 'Evelyn Brooks modeling recruiting options pool configurations...' },
      { agent: 'Growth', msg: 'Dax Ramirez sketching growth campaign parameters and outreach copies...' },
      { agent: 'Operations', msg: 'Kaelen Finch deploying micro-services clusters and reviewing SOC-2 boundaries...' },
      { agent: 'Legal', msg: 'Helena Vance auditing compliance disclosures and contract liabilities...' },
      { agent: 'ConflictResolver', msg: 'Pax-9 Corporate Engine establishing compromise on clashing boundaries...' },
      { agent: 'ApprovalManager', msg: 'Approval Manager compiling high-fidelity markdown deliverables for reviewed queues...' }
    ];

    for (let i = 0; i < steps.length; i++) {
      setSimStep(i);
      setActiveSimAgent(steps[i].agent);
      setSimProgressMessage(steps[i].msg);
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    try {
      await onSimulateInitiative(id);
    } catch (err) {
      console.error(err);
    } finally {
      setSimStep(-1);
      setActiveSimAgent(null);
      setSimulatingId(null);
      setSimProgressMessage('');
    }
  };

  // Execute review action
  const executeReviewAction = async (action: 'approve' | 'reject') => {
    if (!activeApproval) return;
    setIsSubmittingReview(true);
    try {
      await onReviewItem(activeApproval.id, action, feedback);
      setFeedback('');
      setIsModifying(false);
      setModifyInput('');
      setModifiedAssetContent(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Modify action: plays LangGraph synthesis agent to re-adjust document draft based on feedback
  const executeModifyLoop = async () => {
    if (!activeApproval || !modifyInput.trim()) return;
    setIsReSynthesizing(true);
    try {
      // Simulate LangGraph multi-agent synthesis feedback loop
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const promptFeedback = modifyInput.trim();
      const updatedContent = `[REVISED BY FOUNDER CRITERIA]
FEEDBACK PROTOCOL: "${promptFeedback}"
========================================

${activeApproval.content}

========================================
ADJUSTED COMPLIANCE PARAMETERS:
- Baseline offset: Adjusted based on Founder review.
- Option allocations: Restructured per guidelines.
- Target execution date: Locked.`;

      setModifiedAssetContent(updatedContent);
      setIsModifying(true);
      // Play brief success visual
    } catch (err) {
      console.error(err);
    } finally {
      setIsReSynthesizing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Status Grid Bar (Linear-style) */}
      <div className="flex flex-col xl:flex-row items-stretch gap-4 justify-between bg-zinc-950 p-4 border border-zinc-900 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-900 border border-zinc-700 rounded-lg flex items-center justify-center p-1 shadow-[0_0_15px_rgba(249,115,22,0.35)]">
            <CatalystLogo className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              Catalyst OS Central Command
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wide uppercase">
              ACTIVE NODE • MULTI-AGENT CORPORATE SYSTEM
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
          <div className="px-3 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-center">
            <span className="text-[9px] text-zinc-500 font-semibold block uppercase">Treasury</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {formatCurrency(startup.cashBalance)}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-center">
            <span className="text-[9px] text-zinc-500 font-semibold block uppercase">Active Burn</span>
            <span className="text-xs font-mono font-bold text-rose-400">
              {formatCurrency(startup.burnRate)}/mo
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-center">
            <span className="text-[9px] text-zinc-500 font-semibold block uppercase">Runway</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {startup.runwayMonths} Months
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 text-center">
            <span className="text-[9px] text-zinc-500 font-semibold block uppercase">Health Score</span>
            <span className="text-xs font-mono font-bold text-[#6366F1]">
              {startup.healthScore}%
            </span>
          </div>
        </div>
      </div>

      {/* DAILY EXECUTIVE BRIEF BANNER (Blueprint Feature #18) */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-zinc-950 to-emerald-950/20 border border-indigo-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Daily Executive Brief</h3>
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <p className="text-xs text-zinc-300">
            Good Morning Founder. Today's Priorities: <span className="font-semibold text-rose-400">{approvals.length} approvals pending</span>. Runway: <span className="font-semibold text-amber-400">{startup.runwayMonths} months</span>. Hiring: <span className="font-semibold text-emerald-400">On Track</span>. Launch: <span className="font-semibold text-indigo-400">Targeting 30 Days</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleGenerateInvestorUpdate}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer font-mono"
          >
            📊 Monthly Investor Update
          </button>
          <button
            onClick={handleGenerateBoardReport}
            className="px-3 py-1.5 rounded-lg bg-[#6366F1]/10 hover:bg-[#6366F1]/20 border border-[#6366F1]/30 text-[10px] font-bold text-[#6366F1] transition-all cursor-pointer font-mono"
          >
            📋 Board Report
          </button>
        </div>
      </div>

      {/* Primary Bento Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        
        {/* ==================== LEFT COLUMN: STATUS & ROSTER ==================== */}
        <div className="space-y-6 lg:col-span-1 xl:col-span-1">
          
          {/* A. Startup Health Card */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#6366F1]" />
                SaaS Health Index
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 font-semibold">VETTED</span>
            </div>

            {/* Glowing health score gauge */}
            <div className="flex items-center justify-between gap-4 p-3 bg-zinc-900/30 rounded-xl border border-zinc-900/50">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-mono">Consensus Metric</span>
                <p className="text-3xl font-bold tracking-tight text-white font-mono">
                  {startup.healthScore}%
                </p>
                <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Optimizing
                </span>
              </div>
              
              {/* Simple beautiful SVG circular path */}
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-800"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#6366F1] transition-all duration-700 ease-out"
                    strokeDasharray={`${startup.healthScore}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-zinc-400 font-bold">
                  CORE
                </div>
              </div>
            </div>

            {/* Metric bars */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-zinc-400 font-medium">Engineering Velocity</span>
                  <span className="font-mono text-zinc-300 font-bold">{startup.metrics.velocity}%</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-[#6366F1] rounded-full" style={{ width: `${startup.metrics.velocity}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-zinc-400 font-medium">Capital Efficiency</span>
                  <span className="font-mono text-zinc-300 font-bold">{startup.metrics.financialHealth}%</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${startup.metrics.financialHealth}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-zinc-400 font-medium">Legal Compliance</span>
                  <span className="font-mono text-zinc-300 font-bold">{startup.metrics.legalCompliance}%</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${startup.metrics.legalCompliance}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-zinc-400 font-medium">Pipeline Growth</span>
                  <span className="font-mono text-zinc-300 font-bold">{startup.metrics.growthRate}%</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${startup.metrics.growthRate}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-zinc-400 font-medium">Operations Efficiency</span>
                  <span className="font-mono text-zinc-300 font-bold">{startup.metrics.operationsEfficiency}%</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${startup.metrics.operationsEfficiency}%` }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-900 grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-zinc-500 block font-mono">CONFIDENCE:</span>
                <span className="font-bold text-emerald-400 font-mono">98.2% HIGH</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-mono">RISK PROFILE:</span>
                <span className="font-bold text-rose-400 font-mono">STABILIZED</span>
              </div>
            </div>
          </div>

          {/* B. Executive AI Cards (Roster) */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#6366F1]" />
                Executive AI Council
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 font-semibold">{agents.length} AGENTS</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Vetted specialized executives. Click an officer below to consult their specific departmental directives instantly.
            </p>

            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleConsultAgent(agent)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    consultingAgent?.id === agent.id
                      ? 'bg-zinc-900 border-zinc-700 shadow-inner'
                      : 'bg-zinc-900/20 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-md object-cover border border-zinc-800 filter grayscale hover:grayscale-0 transition-all"
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-zinc-950 ${
                      agent.status !== 'idle' ? 'bg-emerald-500 animate-ping' : 'bg-zinc-600'
                    }`} />
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-zinc-950 ${
                      agent.status !== 'idle' ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold text-zinc-300">
                        {agent.name.split(' ')[0]}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 font-semibold bg-zinc-900/80 px-1 py-0.5 rounded border border-zinc-800">
                        {agent.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {agent.keyMetric}: <span className="text-zinc-400 font-mono font-semibold">{agent.metricValue}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Consulting active feedback bubble */}
            {consultingAgent && (
              <div className="p-3.5 rounded-xl bg-[#6366F1]/5 border border-[#6366F1]/20 space-y-2 animate-fade-in text-[11px] leading-relaxed">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold text-[#6366F1] uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Consulting {consultingAgent.name}
                  </span>
                  <button onClick={() => setConsultingAgent(null)} className="text-[9px] text-zinc-500 hover:text-zinc-300">
                    Dismiss
                  </button>
                </div>
                {isAgentThinking ? (
                  <div className="flex items-center gap-1.5 text-zinc-500 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#6366F1]" />
                    Processing advisor transcript...
                  </div>
                ) : (
                  <p className="text-zinc-300 font-sans italic">
                    "{agentAnswer}"
                  </p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* ==================== CENTER COLUMN: CONTROL & SPRINT ==================== */}
        <div className="space-y-6 lg:col-span-2 xl:col-span-2">
          
          {/* C. Founder Command Box (Terminal) */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[#6366F1]" />
                Founder Command Box
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 font-semibold">CONSOLE INTERACTION</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Launch strategic multi-agent sprints or search pgvector RAG memory directly. Standard syntax: <code>what did we decide about...</code>
            </p>

            <form onSubmit={handleCommandSubmit} className="flex gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ask memory query OR type strategic goal to launch a sprint..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  disabled={isExecutingCommand}
                  className="w-full pl-3.5 pr-8 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#6366F1] font-mono"
                />
                <span className="absolute right-2.5 top-2.5 text-[9px] font-mono text-zinc-600 select-none">
                  ⌘K
                </span>
              </div>
              <button
                type="submit"
                disabled={isExecutingCommand || !command.trim()}
                className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#6366F1]/85 font-bold text-xs text-white transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                {isExecutingCommand ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Run
              </button>
            </form>

            {/* Suggested Shortcuts */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setCommand('What did we decide about hiring last month?')}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[10px] text-zinc-400 transition-all cursor-pointer font-mono"
              >
                🔍 Search Decs: Hiring last month
              </button>
              <button
                onClick={() => setCommand('Optimize our monthly cloud-spend budget')}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[10px] text-zinc-400 transition-all cursor-pointer font-mono"
              >
                ⚙️ Sprint: Optimize cloud-spend
              </button>
              <button
                onClick={() => setCommand('Formulate founding compensation policy details')}
                className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[10px] text-zinc-400 transition-all cursor-pointer font-mono"
              >
                💼 Sprint: Compensation policy
              </button>
            </div>

            {/* Command Feedback Console */}
            {commandResponse && (
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3 text-xs leading-relaxed animate-fade-in font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    commandResponse.type === 'success' ? 'text-emerald-400' :
                    commandResponse.type === 'rag' ? 'text-[#6366F1]' : 'text-zinc-400'
                  }`}>
                    {commandResponse.type === 'rag' ? '🧠 SEMANTIC RECALL FOUND' : '⚙️ EXECUTIVE GATEWAY RESPONSE'}
                  </span>
                  <button onClick={() => setCommandResponse(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300">
                    Clear
                  </button>
                </div>
                <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {commandResponse.text}
                </div>
                {commandResponse.metadata && (
                  <div className="text-[9px] text-zinc-500 flex items-center gap-3">
                    <span>Relevance: {(commandResponse.metadata.score * 100).toFixed(1)}%</span>
                    <span>Database: pgvector-hnsw</span>
                    <span>Verified: SHA-256</span>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* MEETING NOTES -> TASKS EXTRACTOR (Blueprint Stretch Feature #4) */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">Meeting Transcript → Tasks Extractor</h2>
              </div>
              <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">AUTO-PARSER</span>
            </div>

            <p className="text-[11px] text-zinc-400">
              Paste raw meeting transcripts or founder voice memos. CEO Orchestrator extracts tasks, owners, and deadlines automatically.
            </p>

            <div className="space-y-3">
              <textarea
                placeholder="Paste meeting transcript here e.g.: 'Sophia mentioned we need Kaelen to deploy failover clusters by Friday and Marcus to review the stock option pool...'"
                value={meetingTranscript}
                onChange={(e) => setMeetingTranscript(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-mono resize-none leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleExtractMeetingNotes}
                  disabled={isExtractingNotes || !meetingTranscript.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer font-mono"
                >
                  {isExtractingNotes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Extract Actionable Tasks
                </button>
              </div>

              {extractedMeetingTasks && (
                <div className="space-y-2 pt-2 border-t border-zinc-900">
                  <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider block">Extracted Directives:</span>
                  <div className="space-y-2">
                    {extractedMeetingTasks.map((t, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-850 text-xs flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-zinc-200 font-semibold">{t.task}</p>
                          <span className="text-[9px] font-mono text-zinc-400">Assigned: {t.owner}</span>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800 shrink-0">
                          {t.deadline}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* D. Approvals Section (High-risk deliverables) */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#6366F1]" />
                Founder Approvals Queue
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                {approvals.length} Blocked
              </span>
            </div>

            {approvals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Left Queue selection */}
                <div className="md:col-span-1 space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {approvals.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedApprovalId(item.id);
                        setIsModifying(false);
                        setModifiedAssetContent(null);
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                        activeApproval?.id === item.id
                          ? 'bg-zinc-900 border-zinc-700 shadow-inner'
                          : 'bg-zinc-900/20 border-zinc-900/60 hover:border-zinc-800 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[8px] font-mono bg-zinc-950/80 px-1 py-0.5 rounded border border-zinc-800 text-zinc-500 uppercase">
                          {item.type}
                        </span>
                        {item.financialChange !== undefined && (
                          <span className={`text-[9px] font-mono font-bold ${
                            item.financialChange > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {item.financialChange > 0 ? '+' : ''}${Math.round(item.financialChange / 1000)}k
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-semibold text-zinc-200 line-clamp-1">{item.title}</h5>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{item.description}</p>
                    </button>
                  ))}
                </div>

                {/* Right detailed review canvas */}
                <div className="md:col-span-2 p-4.5 rounded-xl border border-zinc-900 bg-zinc-900/30 space-y-4 flex flex-col justify-between">
                  {activeApproval && (
                    <>
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="px-2 py-0.5 text-[8px] font-mono rounded bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 uppercase">
                              HIGH-RISK: {activeApproval.type}
                            </span>
                            <h4 className="text-xs font-bold text-white mt-1">{activeApproval.title}</h4>
                          </div>
                          
                          <span className="px-2 py-0.5 text-[9px] rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono flex items-center gap-1 shrink-0 self-start">
                            <AlertCircle className="w-3 h-3 animate-pulse" />
                            Awaiting Signature
                          </span>
                        </div>

                        {/* Financial and metric preview impacts */}
                        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-900 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px]">
                          <div>
                            <span className="text-zinc-500 block uppercase font-mono tracking-wider">Runway Impact</span>
                            <span className="font-semibold text-zinc-300">{activeApproval.impact}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block uppercase font-mono tracking-wider">Treasury Allocation</span>
                            <span className={`font-mono font-bold ${
                              activeApproval.financialChange && activeApproval.financialChange > 0 ? 'text-emerald-400' : 'text-zinc-300'
                            }`}>
                              {activeApproval.financialChange ? `${activeApproval.financialChange > 0 ? '+' : ''}$${activeApproval.financialChange.toLocaleString()}` : 'N/A'}
                            </span>
                          </div>
                          <div className="sm:col-span-1 col-span-2">
                            <span className="text-zinc-500 block uppercase font-mono tracking-wider">Department Adjustments</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {activeApproval.metricChanges && Object.entries(activeApproval.metricChanges).map(([metric, change]) => (
                                <span key={metric} className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded ${
                                  (change as number) > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {metric.replace('Health', '').toUpperCase()} {(change as number) > 0 ? '+' : ''}{change}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Document display */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold font-mono block">Vetted Document Draft</span>
                          <div className="p-4 rounded-lg border border-zinc-900 bg-zinc-950 max-h-[140px] overflow-y-auto text-[10.5px] text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap">
                            {modifiedAssetContent || activeApproval.content}
                          </div>
                        </div>
                      </div>

                      {/* Modify Panel toggles */}
                      <div className="pt-3 border-t border-zinc-900 space-y-3">
                        {isModifying ? (
                          <div className="space-y-2 animate-fade-in">
                            <label className="block text-[10px] font-mono text-[#6366F1] font-semibold uppercase">LangGraph Synthesis Override Instructions</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. Adjust base salary compensation to $120k and equity cliff to 1 year..."
                                value={modifyInput}
                                onChange={(e) => setModifyInput(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-[11px] text-white focus:outline-none focus:border-[#6366F1] font-mono"
                              />
                              <button
                                onClick={executeModifyLoop}
                                disabled={isReSynthesizing || !modifyInput.trim()}
                                className="px-3.5 py-1.5 rounded bg-[#6366F1] text-white text-[10px] font-bold hover:bg-[#6366F1]/80 disabled:opacity-50 cursor-pointer flex items-center gap-1 font-mono"
                              >
                                {isReSynthesizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />}
                                Re-Synthesize
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="text"
                              placeholder="Feedback on rejection..."
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-[11px] text-white focus:outline-none focus:border-[#6366F1] font-sans mb-3"
                            />
                          </div>
                        )}

                        <div className="flex gap-2.5 justify-end">
                          <button
                            onClick={() => setIsModifying(prev => !prev)}
                            className="px-3.5 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white transition-all cursor-pointer font-mono"
                          >
                            {isModifying ? 'Cancel Override' : 'Modify Draft'}
                          </button>
                          
                          <button
                            onClick={() => executeReviewAction('reject')}
                            disabled={isSubmittingReview}
                            className="px-3.5 py-1.5 rounded-lg border border-rose-950 bg-rose-950/10 hover:bg-rose-950/20 text-[10px] font-bold text-rose-400 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>

                          <button
                            onClick={() => executeReviewAction('approve')}
                            disabled={isSubmittingReview}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white transition-all flex items-center gap-1 shadow-md shadow-emerald-950/20 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-zinc-900 text-center text-xs text-zinc-500 flex flex-col items-center justify-center min-h-[220px]">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2.5" />
                <h4 className="font-semibold text-zinc-300">All Clear!</h4>
                <p className="text-zinc-500 mt-0.5 max-w-sm">No high-risk actions are currently blocked for founder reviews.</p>
              </div>
            )}
          </div>

          {/* E. Active Sprint / Timeline Section */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#6366F1]" />
                Sprint Timeline Topology
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 font-semibold uppercase tracking-wider">Active Workspace</span>
            </div>

            {activeInitiative ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Left side selector */}
                <div className="md:col-span-1 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {initiatives.map((init) => (
                    <button
                      key={init.id}
                      onClick={() => {
                        setSelectedInitId(init.id);
                        setSimStep(-1);
                      }}
                      className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        selectedInitId === init.id
                          ? 'bg-zinc-900 border-zinc-700 shadow-inner'
                          : 'bg-zinc-900/20 border-zinc-900/60 hover:border-zinc-800 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          init.category === 'funding' ? 'bg-emerald-500/10 text-emerald-400' :
                          init.category === 'hiring' ? 'bg-pink-500/10 text-pink-400' : 'bg-indigo-500/10 text-[#6366F1]'
                        }`}>
                          {init.category}
                        </span>
                        <span className="text-[9px] text-zinc-500 capitalize">{init.status}</span>
                      </div>
                      <h5 className="text-[11px] font-semibold text-zinc-200 mt-1 line-clamp-1">{init.title}</h5>
                    </button>
                  ))}
                </div>

                {/* Right side timeline feed */}
                <div className="md:col-span-2 p-4 rounded-xl border border-zinc-900 bg-zinc-900/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{activeInitiative.title}</h4>
                      <p className="text-[10.5px] text-zinc-500 mt-0.5 line-clamp-2">{activeInitiative.description}</p>
                    </div>

                    {activeInitiative.status === 'pending' && (
                      <button
                        onClick={() => handleOrchestrateSprint(activeInitiative.id)}
                        disabled={simulatingId !== null}
                        className="px-3 py-1.5 rounded bg-[#6366F1] hover:bg-[#6366F1]/80 text-[10px] font-bold text-white transition-all flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer font-mono"
                      >
                        <Play className="w-3 h-3" />
                        Orchestrate
                      </button>
                    )}
                  </div>

                  {/* Visual Timeline Nodes */}
                  <div className="relative border-l border-zinc-800 ml-2.5 pl-5.5 py-1.5 space-y-4">
                    
                    {/* Visual glowing playhead inside active animation */}
                    {simulatingId === activeInitiative.id && (
                      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg space-y-1.5 animate-fade-in font-mono">
                        <div className="flex justify-between text-[8.5px] font-semibold text-[#6366F1]">
                          <span>SECURE DEBATE TUNNEL ACTIVE</span>
                          <span>STEP {simStep + 1} / 8</span>
                        </div>
                        <p className="text-[10px] text-zinc-300">{simProgressMessage}</p>
                      </div>
                    )}

                    {/* Timeline steps */}
                    {activeInitiative.tasks.map((task, idx) => {
                      const isComplete = task.status === 'completed' || activeInitiative.status === 'completed';
                      const isActive = task.status === 'in_progress' || (simulatingId === activeInitiative.id && idx === Math.min(2, Math.floor(simStep / 2.5)));

                      return (
                        <div key={task.id} className="relative text-xs">
                          {/* Dot */}
                          <div className={`absolute -left-8.5 top-1.5 h-4 w-4 rounded-full border flex items-center justify-center bg-zinc-950 transition-all ${
                            isComplete ? 'border-emerald-500/60 text-emerald-400' :
                            isActive ? 'border-[#6366F1] text-[#6366F1] animate-pulse' : 'border-zinc-800 text-zinc-600'
                          }`}>
                            {isComplete ? <Check className="w-2.5 h-2.5" /> : <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-[#6366F1]' : 'bg-zinc-700'}`} />}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-200">{task.title}</span>
                              <span className="text-[9px] font-mono font-semibold bg-zinc-900 px-1 rounded border border-zinc-800 text-zinc-500">
                                {task.assignedTo}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500">
                              {task.result || `Executive sign-off criteria queued for ${task.assignedTo} audit.`}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                  </div>

                </div>

              </div>
            ) : (
              <div className="p-6 rounded-xl border border-zinc-900/60 text-center text-zinc-500 text-xs">
                No sprint metrics available.
              </div>
            )}
          </div>

        </div>

        {/* ==================== RIGHT COLUMN: KNOWLEDGE & MEMORY ==================== */}
        <div className="space-y-6 lg:col-span-1 xl:col-span-1">
          
          {/* F. Startup Memory System RAG Search */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#6366F1]" />
                Startup Memory System
              </h2>
              <span className="text-[9px] font-mono bg-zinc-900 px-1 py-0.5 rounded text-emerald-400 border border-zinc-800">
                pgvector-RAG
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Retrieve immutable historical logs using high-dimensional cosine distance matches.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. what did we decide about hiring?"
                  value={memoryQuery}
                  onChange={(e) => setMemoryQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-white focus:outline-none focus:border-[#6366F1]"
                />
                <button
                  onClick={() => handleMemorySearch()}
                  disabled={isSearchingMemory || !memoryQuery.trim()}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-zinc-300 transition-all disabled:opacity-40 cursor-pointer"
                >
                  Query
                </button>
              </div>

              {/* Scopes filters */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Scope Indexes</span>
                <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-zinc-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemoryScopes.decisions}
                      onChange={(e) => setSelectedMemoryScopes(p => ({ ...p, decisions: e.target.checked }))}
                      className="accent-[#6366F1]"
                    />
                    Decisions
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemoryScopes.commands}
                      onChange={(e) => setSelectedMemoryScopes(p => ({ ...p, commands: e.target.checked }))}
                      className="accent-[#6366F1]"
                    />
                    Commands
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemoryScopes.notes}
                      onChange={(e) => setSelectedMemoryScopes(p => ({ ...p, notes: e.target.checked }))}
                      className="accent-[#6366F1]"
                    />
                    Meeting Notes
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemoryScopes.strategies}
                      onChange={(e) => setSelectedMemoryScopes(p => ({ ...p, strategies: e.target.checked }))}
                      className="accent-[#6366F1]"
                    />
                    Strategies
                  </label>
                </div>
              </div>

              {/* Memory query RAG outputs */}
              {isSearchingMemory ? (
                <div className="flex items-center justify-center p-6 text-zinc-500 text-[11px] font-mono gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6366F1]" />
                  Executing cosine vector search...
                </div>
              ) : memoryResults ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {memoryResults.map((res, idx) => (
                    <div key={idx} className="p-3 bg-zinc-900/60 border border-zinc-900 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-mono border-b border-zinc-900 pb-1">
                        <span className="text-[#6366F1] font-bold uppercase tracking-wider">{res.category}</span>
                        <span className="text-emerald-400 font-bold bg-emerald-500/5 px-1 py-0.2 rounded border border-emerald-500/10">
                          {(res.score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <h5 className="text-[10px] font-bold text-zinc-200">{res.title}</h5>
                      <p className="text-[10px] text-zinc-400 font-sans whitespace-pre-line leading-relaxed">
                        {res.content}
                      </p>
                      <div className="flex justify-between text-[8px] font-mono text-zinc-600">
                        <span>BY: {res.actor}</span>
                        <span>DATE: {res.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-zinc-900/20 border border-dashed border-zinc-900 rounded-lg text-center text-zinc-500 text-[10.5px]">
                  Submit query to retrieve semantic citations.
                </div>
              )}
            </div>
          </div>

          {/* G. Knowledge Base Upload Panel */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[#6366F1]" />
                Knowledge Base Ingestion
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 font-semibold">{knowledge.length} FILES</span>
            </div>

            <form onSubmit={handleIngestMaterials} className="space-y-3">
              <input
                type="text"
                placeholder="Filename (e.g. Cap_Table_V1.md)"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-white focus:outline-none focus:border-[#6366F1] font-sans"
              />
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 focus:outline-none focus:border-[#6366F1]"
              >
                <option value="pitch_deck">Pitch Deck Outline</option>
                <option value="business_plan">Business Plan Details</option>
                <option value="financial_reports">Treasury Strategy</option>
                <option value="hiring_docs">Hiring Compensation bounds</option>
                <option value="meeting_notes">Internal Meeting notes</option>
              </select>
              <textarea
                placeholder="Paste corporate rules or strategic text files..."
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-white focus:outline-none focus:border-[#6366F1] font-mono resize-none leading-relaxed"
              />
              <button
                type="submit"
                disabled={isUploading || !uploadName || !uploadContent}
                className="w-full py-1.5 rounded-lg bg-[#6366F1] text-white hover:bg-[#6366F1]/80 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
              >
                {isUploading ? 'Executing Vector Parse...' : 'Ingest to pgvector Base'}
              </button>
            </form>

            {/* List of active knowledge files */}
            <div className="space-y-2 pt-1 border-t border-zinc-900">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Indexed Materials</span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {knowledge.map(k => (
                  <button
                    key={k.id}
                    onClick={() => setSelectedDocId(k.id)}
                    className={`w-full p-2 text-left rounded text-[10px] border transition-all cursor-pointer flex items-center justify-between ${
                      selectedDocId === k.id
                        ? 'bg-zinc-900 border-zinc-700'
                        : 'bg-zinc-900/10 border-zinc-900/60 hover:border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="truncate max-w-[120px] font-medium">{k.name}</span>
                    <span className="font-mono text-zinc-600 shrink-0 text-[8.5px] uppercase">{k.type.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* H. Decision Log / Historic Ledger Section */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-[#6366F1]" />
                Governance Ledger
              </h2>
              <span className="text-[10px] font-mono text-zinc-500 font-semibold">{decisions.length} AUDITED</span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Chronological immutable timeline of approved Human-in-the-Loop operational signs.
            </p>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {decisions.map((dec) => (
                <div key={dec.id} className="p-3 rounded-lg border border-zinc-900 bg-zinc-900/20 space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className={`font-bold px-1 py-0.2 rounded ${
                      dec.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {dec.status.toUpperCase()}
                    </span>
                    <span className="text-zinc-600">{new Date(dec.timestamp).toLocaleDateString()}</span>
                  </div>
                  <h5 className="text-[10.5px] font-bold text-zinc-200 line-clamp-1">{dec.title}</h5>
                  <p className="text-[10px] text-zinc-400 leading-normal line-clamp-2">{dec.description}</p>
                  <p className="text-[9px] text-zinc-500 font-mono italic">
                    Outcome: {dec.impactText}
                  </p>
                </div>
              ))}
            </div>
          </div>


          {/* SMART GOAL TRACKER (Blueprint Stretch Feature #7) */}
          <div className="bg-zinc-950 border border-zinc-800/50 p-5 rounded-xl space-y-4 shadow-sm hover:border-zinc-800 transition-all">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">Smart Goal Tracker</h2>
              </div>
              <span className="text-[9px] font-mono text-emerald-400">76% COMPLETED</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center text-[10px] mb-1 font-mono">
                  <span className="text-zinc-300">Product MVP Launch</span>
                  <span className="text-indigo-400 font-bold">78%</span>
                </div>
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: '78%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1 font-mono">
                  <span className="text-zinc-300">Founding Eng Hiring</span>
                  <span className="text-pink-400 font-bold">65%</span>
                </div>
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500" style={{ width: '65%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1 font-mono">
                  <span className="text-zinc-300">Seed Round Fundraising</span>
                  <span className="text-emerald-400 font-bold">85%</span>
                </div>
                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* REPORT GENERATION MODAL OVERLAY (Investor Update / Board Report) */}
      {generatedReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {generatedReport.type.toUpperCase()}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">{generatedReport.title}</h3>
              </div>
              <button
                onClick={() => setGeneratedReport(null)}
                className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-900/30">
              {generatedReport.content}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <span className="text-[10px] font-mono text-zinc-500">Auto-compiled from active startup metrics & RAG context</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedReport.content);
                  alert('Copied report to clipboard!');
                  setGeneratedReport(null);
                }}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer font-mono"
              >
                Copy Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GMAIL / OUTREACH INTEGRATION MODAL (Blueprint Stretch Feature #8) */}
      {emailModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Gmail Integration Outreach</h3>
              </div>
              <button
                onClick={() => setEmailModal(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">To Candidate:</label>
                <input
                  type="text"
                  value={emailModal.recipient}
                  readOnly
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Subject:</label>
                <input
                  type="text"
                  value={emailModal.subject}
                  readOnly
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Email Body:</label>
                <textarea
                  value={emailModal.body}
                  readOnly
                  rows={6}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-white font-mono leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-2">
              <button
                onClick={() => setEmailModal(null)}
                className="px-3 py-1.5 rounded bg-zinc-900 text-xs text-zinc-400 hover:text-white"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  alert('Email successfully dispatched via Gmail API integration!');
                  setEmailModal(null);
                }}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer font-mono"
              >
                Send via Gmail
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
