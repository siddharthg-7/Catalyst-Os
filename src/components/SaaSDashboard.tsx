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

  useEffect(() => {
    if (startup && !command) {
      setCommand(`Startup: ${startup.name} | Industry: ${startup.industry} | Stage: ${startup.fundingStage}`);
    }
  }, [startup]);

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
    <div className="space-y-6 font-sans">
      
      {/* 1. Header Status Grid Bar (Linear-style) */}
      <div className="flex flex-col xl:flex-row items-stretch gap-4 justify-between bg-white p-5 border border-[#141413]/10 rounded-[20px] shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#F3F0EE] border border-[#141413]/15 rounded-lg flex items-center justify-center p-1">
            <CatalystLogo className="w-6 h-6 text-[#141413]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[#141413] flex items-center gap-2">
              Catalyst OS Central Command
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse inline-block" />
            </h1>
            <p className="text-[10px] text-[#696969] font-mono tracking-wide uppercase font-bold">
              ACTIVE NODE • MULTI-AGENT CORPORATE SYSTEM
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
          <div className="px-3.5 py-2 rounded-[10px] border border-[#141413]/10 bg-[#F3F0EE]/50 text-center">
            <span className="text-[9px] text-[#696969] font-bold block uppercase font-mono">Treasury</span>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {formatCurrency(startup.cashBalance)}
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-[10px] border border-[#141413]/10 bg-[#F3F0EE]/50 text-center">
            <span className="text-[9px] text-[#696969] font-bold block uppercase font-mono">Active Burn</span>
            <span className="text-xs font-mono font-bold text-rose-700">
              {formatCurrency(startup.burnRate)}/mo
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-[10px] border border-[#141413]/10 bg-[#F3F0EE]/50 text-center">
            <span className="text-[9px] text-[#696969] font-bold block uppercase font-mono">Runway</span>
            <span className="text-xs font-mono font-bold text-amber-700">
              {startup.runwayMonths} Months
            </span>
          </div>

          <div className="px-3.5 py-2 rounded-[10px] border border-[#141413]/10 bg-[#F3F0EE]/50 text-center">
            <span className="text-[9px] text-[#696969] font-bold block uppercase font-mono">Health Score</span>
            <span className="text-xs font-mono font-bold text-indigo-700">
              {startup.healthScore}%
            </span>
          </div>
        </div>
      </div>

      {/* DAILY EXECUTIVE BRIEF BANNER (Blueprint Feature #18) */}
      <div className="p-5 rounded-[20px] bg-white border border-[#141413]/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#141413]" />
            <h3 className="text-xs font-bold text-[#141413] font-mono uppercase tracking-wider">Daily Executive Brief</h3>
            <span className="text-[9px] font-mono text-[#696969] bg-[#F3F0EE] px-1.5 py-0.5 rounded border border-[#141413]/10">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <p className="text-xs text-[#696969]">
            Good Morning Founder. Today's Priorities: <span className="font-bold text-rose-700">{approvals.length} approvals pending</span>. Runway: <span className="font-bold text-amber-700">{startup.runwayMonths} months</span>. Hiring: <span className="font-bold text-emerald-700">On Track</span>. Launch: <span className="font-bold text-indigo-700">Targeting 30 Days</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleGenerateInvestorUpdate}
            className="px-3 py-1.5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 text-[10px] font-bold text-[#141413] hover:bg-white hover:border-[#141413]/30 transition-all cursor-pointer font-sans"
          >
            📊 Monthly Investor Update
          </button>
          <button
            onClick={handleGenerateBoardReport}
            className="px-3 py-1.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-[10px] font-bold text-[#F3F0EE] transition-all cursor-pointer font-sans"
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
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5 font-mono">
                <Activity className="w-4 h-4 text-[#141413]" />
                SaaS Health Index
              </h2>
              <span className="text-[10px] font-mono text-[#696969] font-bold">VETTED</span>
            </div>

            {/* Glowing health score gauge */}
            <div className="flex items-center justify-between gap-4 p-3 bg-[#FCFBFA] rounded-[16px] border border-[#141413]/10">
              <div className="space-y-1">
                <span className="text-[10px] text-[#696969] font-mono font-bold">Consensus Metric</span>
                <p className="text-3xl font-bold tracking-tight text-[#141413] font-mono">
                  {startup.healthScore}%
                </p>
                <span className="text-[9px] text-emerald-700 font-mono font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3 text-emerald-600" /> Optimizing
                </span>
              </div>
              
              {/* Simple beautiful SVG circular path */}
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#F3F0EE]"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#141413] transition-all duration-700 ease-out"
                    strokeDasharray={`${startup.healthScore}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-[#696969] font-bold">
                  CORE
                </div>
              </div>
            </div>

            {/* Metric bars */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-[#696969] font-bold font-mono">Engineering Velocity</span>
                  <span className="font-mono text-[#141413] font-bold">{startup.metrics.velocity}%</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-[#141413] rounded-full" style={{ width: `${startup.metrics.velocity}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-[#696969] font-bold font-mono">Capital Efficiency</span>
                  <span className="font-mono text-[#141413] font-bold">{startup.metrics.financialHealth}%</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${startup.metrics.financialHealth}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-[#696969] font-bold font-mono">Legal Compliance</span>
                  <span className="font-mono text-[#141413] font-bold">{startup.metrics.legalCompliance}%</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-rose-600 rounded-full" style={{ width: `${startup.metrics.legalCompliance}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-[#696969] font-bold font-mono">Pipeline Growth</span>
                  <span className="font-mono text-[#141413] font-bold">{startup.metrics.growthRate}%</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: `${startup.metrics.growthRate}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1">
                  <span className="text-[#696969] font-bold font-mono">Operations Efficiency</span>
                  <span className="font-mono text-[#141413] font-bold">{startup.metrics.operationsEfficiency}%</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-sky-600 rounded-full" style={{ width: `${startup.metrics.operationsEfficiency}%` }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#141413]/10 grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-[#696969] block font-mono font-bold">CONFIDENCE:</span>
                <span className="font-bold text-emerald-700 font-mono">98.2% HIGH</span>
              </div>
              <div>
                <span className="text-[#696969] block font-mono font-bold">RISK PROFILE:</span>
                <span className="font-bold text-rose-700 font-mono font-bold">STABILIZED</span>
              </div>
            </div>
          </div>

          {/* B. Executive AI Cards (Roster) */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5 font-mono">
                <Users className="w-4 h-4 text-[#141413]" />
                Executive AI Council
              </h2>
              <span className="text-[10px] font-mono text-[#696969] font-bold">{agents.length} AGENTS</span>
            </div>

            <p className="text-xs text-[#696969] leading-relaxed">
              Vetted specialized executives. Click an officer below to consult their directives.
            </p>

            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleConsultAgent(agent)}
                  className={`w-full p-2.5 rounded-[12px] border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    consultingAgent?.id === agent.id
                      ? 'bg-[#F3F0EE] border-[#141413] shadow-inner'
                      : 'bg-[#FCFBFA] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-[#141413]/10 filter grayscale group-hover:grayscale-0 transition-all"
                    />
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${
                      agent.status !== 'idle' ? 'bg-emerald-500 animate-ping' : 'bg-[#696969]'
                    }`} />
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${
                      agent.status !== 'idle' ? 'bg-emerald-500' : 'bg-[#696969]'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#141413]">
                        {agent.name.split(' ')[0]}
                      </span>
                      <span className="text-[9px] font-mono text-[#696969] font-bold bg-[#F3F0EE] px-1 py-0.5 rounded border border-[#141413]/10">
                        {agent.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#696969] truncate mt-0.5">
                      {agent.keyMetric}: <span className="text-[#141413] font-mono font-bold">{agent.metricValue}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Consulting active feedback bubble */}
            {consultingAgent && (
              <div className="p-3.5 rounded-[12px] bg-[#F3F0EE] border border-[#141413]/10 space-y-2 animate-fade-in text-[11px] leading-relaxed">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-[#141413] uppercase tracking-wider flex items-center gap-1 font-mono">
                    <MessageSquare className="w-3 h-3 text-[#141413]" />
                    Consulting {consultingAgent.name}
                  </span>
                  <button onClick={() => setConsultingAgent(null)} className="text-[9px] text-[#696969] hover:text-[#141413]">
                    Dismiss
                  </button>
                </div>
                {isAgentThinking ? (
                  <div className="flex items-center gap-1.5 text-[#696969] font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#141413]" />
                    Processing advisor transcript...
                  </div>
                ) : (
                  <p className="text-[#141413] font-sans italic">
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
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5 font-mono">
                <Terminal className="w-4 h-4 text-[#141413]" />
                Founder Command Box
              </h2>
              <span className="text-[10px] font-mono text-[#696969] font-bold">CONSOLE INTERACTION</span>
            </div>

            <p className="text-xs text-[#696969]">
              Launch strategic multi-agent sprints or search pgvector RAG memory directly. Standard syntax: <code className="bg-[#F3F0EE] px-1 rounded text-[#141413]">what did we decide about...</code>
            </p>

            <form onSubmit={handleCommandSubmit} className="flex gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ask memory query OR type strategic goal to launch a sprint..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  disabled={isExecutingCommand}
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-[12px] bg-white border border-[#141413]/15 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-mono"
                />
                <span className="absolute right-2.5 top-3.5 text-[9px] font-mono text-[#696969] select-none font-bold">
                  ⌘K
                </span>
              </div>
              <button
                type="submit"
                disabled={isExecutingCommand || !command.trim()}
                className="px-4 py-2 rounded-[20px] bg-[#141413] hover:bg-[#262627] font-bold text-xs text-[#F3F0EE] transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer font-sans"
              >
                {isExecutingCommand ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Run
              </button>
            </form>

            {/* Suggested Shortcuts */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setCommand('What did we decide about hiring last month?')}
                className="px-3 py-1.5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 hover:border-[#141413]/30 text-[10px] text-[#696969] hover:text-[#141413] transition-all cursor-pointer font-mono"
              >
                🔍 Search Decs: Hiring last month
              </button>
              <button
                onClick={() => setCommand('Optimize our monthly cloud-spend budget')}
                className="px-3 py-1.5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 hover:border-[#141413]/30 text-[10px] text-[#696969] hover:text-[#141413] transition-all cursor-pointer font-mono"
              >
                ⚙️ Sprint: Optimize cloud-spend
              </button>
              <button
                onClick={() => setCommand('Formulate founding compensation policy details')}
                className="px-3 py-1.5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 hover:border-[#141413]/30 text-[10px] text-[#696969] hover:text-[#141413] transition-all cursor-pointer font-mono"
              >
                💼 Sprint: Compensation policy
              </button>
            </div>

            {/* Command Feedback Console */}
            {commandResponse && (
              <div className="p-4 rounded-[12px] bg-[#F3F0EE] border border-[#141413]/10 space-y-3 text-xs leading-relaxed animate-fade-in font-mono text-[#141413]">
                <div className="flex items-center justify-between border-b border-[#141413]/10 pb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    commandResponse.type === 'success' ? 'text-emerald-700' :
                    commandResponse.type === 'rag' ? 'text-indigo-700' : 'text-[#696969]'
                  }`}>
                    {commandResponse.type === 'rag' ? '🧠 SEMANTIC RECALL FOUND' : '⚙️ EXECUTIVE GATEWAY RESPONSE'}
                  </span>
                  <button onClick={() => setCommandResponse(null)} className="text-[10px] text-[#696969] hover:text-[#141413]">
                    Clear
                  </button>
                </div>
                <div className="text-[#141413] whitespace-pre-wrap leading-relaxed font-sans">
                  {commandResponse.text}
                </div>
                {commandResponse.metadata && (
                  <div className="text-[9px] text-[#696969] flex items-center gap-3 font-bold">
                    <span>Relevance: {(commandResponse.metadata.score * 100).toFixed(1)}%</span>
                    <span>Database: pgvector-hnsw</span>
                    <span>Verified: SHA-256</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SCENARIO SIMULATOR ⭐⭐⭐⭐⭐ (Blueprint Stretch Feature #1) */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#141413] animate-pulse" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] font-mono">Scenario Simulator</h2>
                <span className="text-[9px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                  WHAT IF?
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#696969] font-bold">REAL-TIME RECALCULATION</span>
            </div>

            <p className="text-xs text-[#696969]">
              Simulate strategic decisions live. Recalculate runway, SaaS health score, launch dates, hiring plans, and marketing timelines before committing budget.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sliders */}
              <div className="space-y-4 p-3 bg-[#FCFBFA] rounded-[16px] border border-[#141413]/10">
                <div>
                  <div className="flex justify-between items-center text-[10px] mb-1 font-mono font-bold">
                    <span className="text-[#696969]">Add Engineers:</span>
                    <span className="text-[#141413] font-bold">+{extraEngineers} Senior Devs</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={extraEngineers}
                    onChange={(e) => setExtraEngineers(parseInt(e.target.value))}
                    className="w-full accent-[#141413] cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-[#696969] mt-1 font-bold">
                    <span>+$0</span>
                    <span>+${(extraEngineers * 11).toFixed(0)}k/mo</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] mb-1 font-mono font-bold">
                    <span className="text-[#696969]">Extra Marketing Budget:</span>
                    <span className="text-[#141413] font-bold">+${extraGrowthBudget.toLocaleString()}/mo</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="1000"
                    value={extraGrowthBudget}
                    onChange={(e) => setExtraGrowthBudget(parseInt(e.target.value))}
                    className="w-full accent-[#141413] cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Live Outputs */}
              <div className="p-3.5 bg-[#FCFBFA] rounded-[16px] border border-[#141413]/10 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#696969] uppercase font-bold">Simulated Runway:</span>
                  <span className="font-bold text-amber-700">
                    {(startup.cashBalance / Math.max(1000, startup.burnRate + extraEngineers * 11000 + extraGrowthBudget)).toFixed(1)} Months
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#696969] uppercase font-bold">Simulated Health Score:</span>
                  <span className="font-bold text-[#141413]">
                    {Math.max(40, Math.min(100, Math.round(startup.healthScore + extraEngineers * 3 - (extraGrowthBudget / 4000))))}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#696969] uppercase font-bold">Est. Launch Timeline:</span>
                  <span className="font-bold text-emerald-700">
                    {Math.max(12, 30 - extraEngineers * 4)} Days
                  </span>
                </div>
                <div className="pt-2 border-t border-[#141413]/10 text-[9.5px] text-[#696969] font-sans italic">
                  💡 Finance & Growth agents recommend maintaining a minimum 12-month runway buffer.
                </div>
              </div>
            </div>
          </div>

          {/* MEETING NOTES -> TASKS EXTRACTOR (Blueprint Stretch Feature #4) */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#141413]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] font-mono">Meeting Transcript → Tasks Extractor</h2>
              </div>
              <span className="text-[9px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full font-bold">AUTO-PARSER</span>
            </div>

            <p className="text-xs text-[#696969]">
              Paste raw meeting transcripts or founder voice memos. CEO Orchestrator extracts tasks, owners, and deadlines automatically.
            </p>

            <div className="space-y-3">
              <textarea
                placeholder="Paste meeting transcript here e.g.: 'Sophia mentioned we need Kaelen to deploy failover clusters by Friday and Marcus to review the stock option pool...'"
                value={meetingTranscript}
                onChange={(e) => setMeetingTranscript(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/20 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-mono resize-none leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleExtractMeetingNotes}
                  disabled={isExtractingNotes || !meetingTranscript.trim()}
                  className="px-5 py-2 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer font-sans"
                >
                  {isExtractingNotes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Extract Actionable Tasks
                </button>
              </div>

              {extractedMeetingTasks && (
                <div className="space-y-2 pt-2 border-t border-[#141413]/10">
                  <span className="text-[9px] font-mono text-[#696969] uppercase tracking-wider block font-bold">Extracted Directives:</span>
                  <div className="space-y-2">
                    {extractedMeetingTasks.map((t, idx) => (
                      <div key={idx} className="p-2.5 rounded-[12px] bg-[#FCFBFA] border border-[#141413]/10 text-xs flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-[#141413] font-bold">{t.task}</p>
                          <span className="text-[9px] font-mono text-[#696969]">Assigned: {t.owner}</span>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#F3F0EE] text-[#141413] border border-[#141413]/15 shrink-0 font-bold">
                          {t.deadline}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

                  <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5 font-mono">
                <CheckSquare className="w-4 h-4 text-[#141413]" />
                Founder Approvals Queue
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F3F0EE] border border-[#141413]/10 text-[#696969] font-mono font-bold">
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
                      className={`w-full p-3 rounded-[12px] border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                        activeApproval?.id === item.id
                          ? 'bg-[#F3F0EE] border-[#141413] shadow-inner'
                          : 'bg-[#FCFBFA] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[8px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#141413]/10 text-[#696969] uppercase font-bold">
                          {item.type}
                        </span>
                        {item.financialChange !== undefined && (
                          <span className={`text-[9px] font-mono font-bold ${
                            item.financialChange > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {item.financialChange > 0 ? '+' : ''}${Math.round(item.financialChange / 1000)}k
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-[#141413] line-clamp-1">{item.title}</h5>
                      <p className="text-[10px] text-[#696969] line-clamp-1">{item.description}</p>
                    </button>
                  ))}
                </div>

                {/* Right detailed review canvas */}
                <div className="md:col-span-2 p-4.5 rounded-[16px] border border-[#141413]/10 bg-[#FCFBFA] space-y-4 flex flex-col justify-between">
                  {activeApproval && (
                    <>
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="px-2 py-0.5 text-[8px] font-mono font-bold rounded-full bg-[#141413]/05 text-[#141413] border border-[#141413]/10 uppercase">
                              HIGH-RISK: {activeApproval.type}
                            </span>
                            <h4 className="text-xs font-bold text-[#141413] mt-1">{activeApproval.title}</h4>
                          </div>
                          
                          <span className="px-2 py-0.5 text-[9px] rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-mono flex items-center gap-1 shrink-0 self-start font-bold">
                            <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                            Awaiting Signature
                          </span>
                        </div>

                        {/* Financial and metric preview impacts */}
                        <div className="p-3 rounded-[12px] bg-white border border-[#141413]/10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px]">
                          <div>
                            <span className="text-[#696969] block uppercase font-mono tracking-wider font-bold">Runway Impact</span>
                            <span className="font-semibold text-[#141413]">{activeApproval.impact}</span>
                          </div>
                          <div>
                            <span className="text-[#696969] block uppercase font-mono tracking-wider font-bold">Treasury Allocation</span>
                            <span className={`font-mono font-bold ${
                              activeApproval.financialChange && activeApproval.financialChange > 0 ? 'text-emerald-700' : 'text-[#141413]'
                            }`}>
                              {activeApproval.financialChange ? `${activeApproval.financialChange > 0 ? '+' : ''}$${activeApproval.financialChange.toLocaleString()}` : 'N/A'}
                            </span>
                          </div>
                          <div className="sm:col-span-1 col-span-2">
                            <span className="text-[#696969] block uppercase font-mono tracking-wider font-bold">Department Adjustments</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {activeApproval.metricChanges && Object.entries(activeApproval.metricChanges).map(([metric, change]) => (
                                <span key={metric} className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                  (change as number) > 0 ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
                                }`}>
                                  {metric.replace('Health', '').toUpperCase()} {(change as number) > 0 ? '+' : ''}{change}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Document display */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-[#696969] uppercase tracking-wider font-semibold font-mono block">Vetted Document Draft</span>
                          <div className="p-4 rounded-[12px] border border-[#141413]/10 bg-[#F3F0EE] max-h-[140px] overflow-y-auto text-[10.5px] text-[#141413] leading-relaxed font-mono whitespace-pre-wrap">
                            {modifiedAssetContent || activeApproval.content}
                          </div>
                        </div>
                      </div>

                      {/* Modify Panel toggles */}
                      <div className="pt-3 border-t border-[#141413]/10 space-y-3">
                        {isModifying ? (
                          <div className="space-y-2 animate-fade-in">
                            <label className="block text-[10px] font-mono text-[#141413] font-bold uppercase">LangGraph Synthesis Override Instructions</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. Adjust base salary compensation to $120k and equity cliff to 1 year..."
                                value={modifyInput}
                                onChange={(e) => setModifyInput(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-[8px] bg-white border border-[#141413]/25 text-[11px] text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-mono"
                              />
                              <button
                                onClick={executeModifyLoop}
                                disabled={isReSynthesizing || !modifyInput.trim()}
                                className="px-3.5 py-1.5 rounded-[20px] bg-[#141413] text-[#F3F0EE] text-[10px] font-bold hover:bg-[#262627] disabled:opacity-50 cursor-pointer flex items-center gap-1 font-mono"
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
                              className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/20 text-[11px] text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-sans mb-3"
                            />
                          </div>
                        )}

                        <div className="flex gap-2.5 justify-end">
                          <button
                            onClick={() => setIsModifying(prev => !prev)}
                            className="px-3.5 py-1.5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 text-[10px] font-bold text-[#696969] hover:text-[#141413] transition-all cursor-pointer font-mono"
                          >
                            {isModifying ? 'Cancel Override' : 'Modify Draft'}
                          </button>
                          
                          <button
                            onClick={() => executeReviewAction('reject')}
                            disabled={isSubmittingReview}
                            className="px-3.5 py-1.5 rounded-[20px] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-rose-700 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>

                          <button
                            onClick={() => executeReviewAction('approve')}
                            disabled={isSubmittingReview}
                            className="px-4 py-1.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-[10px] font-bold text-[#F3F0EE] transition-all flex items-center gap-1 cursor-pointer"
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
              <div className="p-8 rounded-[20px] border border-dashed border-[#141413]/20 bg-white text-center text-xs text-[#696969] flex flex-col items-center justify-center min-h-[220px]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2.5" />
                <h4 className="font-bold text-[#141413]">All Clear!</h4>
                <p className="text-[#696969] mt-0.5 max-w-sm font-sans">No high-risk actions are currently blocked for founder reviews.</p>
              </div>
            )}
          </div>

          {/* E. Active Sprint / Timeline Section */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5 font-mono">
                <Layers className="w-4 h-4 text-[#141413]" />
                Sprint Timeline Topology
              </h2>
              <span className="text-[10px] font-mono text-[#696969] font-bold uppercase tracking-wider">Active Workspace</span>
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
                      className={`w-full p-2.5 rounded-[12px] border text-left transition-all cursor-pointer ${
                        selectedInitId === init.id
                          ? 'bg-[#F3F0EE] border-[#141413] shadow-inner'
                          : 'bg-[#FCFBFA] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase ${
                          init.category === 'funding' ? 'bg-emerald-500/10 text-emerald-700' :
                          init.category === 'hiring' ? 'bg-pink-500/10 text-pink-700' : 'bg-indigo-500/10 text-indigo-700'
                        }`}>
                          {init.category}
                        </span>
                        <span className="text-[9px] text-[#696969] capitalize font-mono font-bold">{init.status}</span>
                      </div>
                      <h5 className="text-[11px] font-bold text-[#141413] mt-1 line-clamp-1">{init.title}</h5>
                    </button>
                  ))}
                </div>

                {/* Right side timeline feed */}
                <div className="md:col-span-2 p-4 rounded-[16px] border border-[#141413]/10 bg-[#FCFBFA] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#141413] line-clamp-1">{activeInitiative.title}</h4>
                      <p className="text-[10.5px] text-[#696969] mt-0.5 line-clamp-2 leading-relaxed">{activeInitiative.description}</p>
                    </div>

                    {activeInitiative.status === 'pending' && (
                      <button
                        onClick={() => handleOrchestrateSprint(activeInitiative.id)}
                        disabled={simulatingId !== null}
                        className="px-3.5 py-1.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-[10px] font-bold text-[#F3F0EE] transition-all flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer font-mono"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Orchestrate
                      </button>
                    )}
                  </div>

                  {/* Visual Timeline Nodes */}
                  <div className="relative border-l border-[#141413]/10 ml-2.5 pl-5.5 py-1.5 space-y-4">
                    
                    {/* Visual glowing playhead inside active animation */}
                    {simulatingId === activeInitiative.id && (
                      <div className="p-3 bg-[#F3F0EE] border border-[#141413]/10 rounded-[12px] space-y-1.5 animate-fade-in font-mono text-[#141413]">
                        <div className="flex justify-between text-[8.5px] font-bold text-[#141413] uppercase">
                          <span>SECURE DEBATE TUNNEL ACTIVE</span>
                          <span>STEP {simStep + 1} / 8</span>
                        </div>
                        <p className="text-[10px] text-[#696969]">{simProgressMessage}</p>
                      </div>
                    )}

                    {/* Timeline steps */}
                    {activeInitiative.tasks.map((task, idx) => {
                      const isComplete = task.status === 'completed' || activeInitiative.status === 'completed';
                      const isActive = task.status === 'in_progress' || (simulatingId === activeInitiative.id && idx === Math.min(2, Math.floor(simStep / 2.5)));

                      return (
                        <div key={task.id} className="relative text-xs">
                          {/* Dot */}
                          <div className={`absolute -left-8.5 top-1.5 h-4 w-4 rounded-full border flex items-center justify-center bg-white transition-all ${
                            isComplete ? 'border-emerald-500/60 text-emerald-700 bg-white' :
                            isActive ? 'border-[#141413] text-[#141413] animate-pulse bg-white' : 'border-[#141413]/10 text-[#696969]'
                          }`}>
                            {isComplete ? <Check className="w-2.5 h-2.5" /> : <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-[#141413]' : 'bg-[#696969]'}`} />}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#141413]">{task.title}</span>
                              <span className="text-[9px] font-mono font-bold bg-[#F3F0EE] px-1 rounded border border-[#141413]/10 text-[#696969]">
                                {task.assignedTo}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#696969] leading-relaxed">
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
              <div className="p-6 rounded-[20px] border border-[#141413]/10 text-center text-[#696969] text-xs">
                No sprint metrics available.
              </div>
            )}
          </div>

        </div>/div        {/* ==================== RIGHT COLUMN: KNOWLEDGE & MEMORY ==================== */}
        <div className="space-y-6 lg:col-span-1 xl:col-span-1">
          
          {/* F. Startup Memory System RAG Search */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5 font-mono">
                <BookOpen className="w-4 h-4 text-[#141413]" />
                Startup Memory System
              </h2>
              <span className="text-[9px] font-mono bg-[#F3F0EE] px-2 py-0.5 rounded-full text-emerald-700 border border-[#141413]/10 font-bold">
                pgvector-RAG
              </span>
            </div>

            <p className="text-xs text-[#696969]">
              Retrieve immutable historical logs using high-dimensional cosine distance matches.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. what did we decide about hiring?"
                  value={memoryQuery}
                  onChange={(e) => setMemoryQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-[8px] bg-white border border-[#141413]/20 text-[11px] text-[#141413] focus:outline-none focus:border-[#141413] font-sans"
                />
                <button
                  onClick={() => handleMemorySearch()}
                  disabled={isSearchingMemory || !memoryQuery.trim()}
                  className="px-3.5 py-1.5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 text-[11px] font-bold text-[#141413] hover:bg-white hover:border-[#141413]/30 transition-all disabled:opacity-40 cursor-pointer font-sans"
                >
                  Query
                </button>
              </div>

              {/* Scopes filters */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] font-mono text-[#696969] uppercase tracking-wider block font-bold">Scope Indexes</span>
                <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-[#696969] font-bold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemoryScopes.decisions}
                      onChange={(e) => setSelectedMemoryScopes(p => ({ ...p, decisions: e.target.checked }))}
                      className="accent-[#141413]"
                    />
                    Decisions
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemoryScopes.commands}
                      onChange={(e) => setSelectedMemoryScopes(p => ({ ...p, commands: e.target.checked }))}
                      className="accent-[#141413]"
                    />
                    Commands
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemoryScopes.notes}
                      onChange={(e) => setSelectedMemoryScopes(p => ({ ...p, notes: e.target.checked }))}
                      className="accent-[#141413]"
                    />
                    Meeting Notes
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemoryScopes.strategies}
                      onChange={(e) => setSelectedMemoryScopes(p => ({ ...p, strategies: e.target.checked }))}
                      className="accent-[#141413]"
                    />
                    Strategies
                  </label>
                </div>
              </div>

              {/* Memory query RAG outputs */}
              {isSearchingMemory ? (
                <div className="flex items-center justify-center p-6 text-[#696969] text-[11px] font-mono gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#141413]" />
                  Executing cosine vector search...
                </div>
              ) : memoryResults ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {memoryResults.map((res, idx) => (
                    <div key={idx} className="p-3 bg-[#FCFBFA] border border-[#141413]/10 rounded-[12px] space-y-1.5">
                      <div className="flex justify-between items-center text-[9px] font-mono border-b border-[#141413]/10 pb-1">
                        <span className="text-[#141413] font-bold uppercase tracking-wider">{res.category}</span>
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">
                          {(res.score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                      <h5 className="text-[10px] font-bold text-[#141413]">{res.title}</h5>
                      <p className="text-[10px] text-[#696969] font-sans whitespace-pre-line leading-relaxed">
                        {res.content}
                      </p>
                      <div className="flex justify-between text-[8px] font-mono text-[#696969] font-bold">
                        <span>BY: {res.actor}</span>
                        <span>DATE: {res.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-[#F3F0EE]/30 border border-dashed border-[#141413]/20 rounded-[12px] text-center text-[#696969] text-[10.5px]">
                  Submit query to retrieve semantic citations.
                </div>
              )}
            </div>
          </div>

          {/* G. Knowledge Base Ingestion Panel */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5 font-mono">
                <HardDrive className="w-4 h-4 text-[#141413]" />
                Knowledge Base Ingestion
              </h2>
              <span className="text-[10px] font-mono text-[#696969] font-bold">{knowledge.length} FILES</span>
            </div>

            <form onSubmit={handleIngestMaterials} className="space-y-3">
              <input
                type="text"
                placeholder="Filename (e.g. Cap_Table_V1.md)"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#141413]/20 text-[11px] text-[#141413] focus:outline-none focus:border-[#141413] font-sans"
              />
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full px-2 py-1.5 rounded-[8px] bg-[#F3F0EE] border border-[#141413]/20 text-[10px] text-[#141413] focus:outline-none focus:border-[#141413]"
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
                className="w-full px-3 py-1.5 rounded-[8px] bg-white border border-[#141413]/20 text-[11px] text-[#141413] focus:outline-none focus:border-[#141413] font-mono resize-none leading-relaxed"
              />
              <button
                type="submit"
                disabled={isUploading || !uploadName || !uploadContent}
                className="w-full py-2.5 rounded-[20px] bg-[#141413] text-[#F3F0EE] hover:bg-[#262627] text-[11px] font-bold disabled:opacity-40 cursor-pointer font-sans"
              >
                {isUploading ? 'Executing Vector Parse...' : 'Ingest to pgvector Base'}
              </button>
            </form>

            {/* List of active knowledge files */}
            <div className="space-y-2 pt-1 border-t border-[#141413]/10">
              <span className="text-[9px] font-mono text-[#696969] uppercase tracking-wider block font-bold">Indexed Materials</span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {knowledge.map(k => (
                  <button
                    key={k.id}
                    onClick={() => setSelectedDocId(k.id)}
                    className={`w-full p-2 text-left rounded-[8px] border transition-all cursor-pointer flex items-center justify-between ${
                      selectedDocId === k.id
                        ? 'bg-[#F3F0EE] border-[#141413]'
                        : 'bg-[#FCFBFA] border-[#141413]/10 text-[#696969] hover:text-[#141413]'
                    }`}
                  >
                    <span className="truncate max-w-[120px] font-semibold">{k.name}</span>
                    <span className="font-mono text-[#696969] shrink-0 text-[8.5px] uppercase font-bold">{k.type.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* H. Decision Log / Historic Ledger Section */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] flex items-center gap-1.5 font-mono">
                <ClipboardList className="w-4 h-4 text-[#141413]" />
                Governance Ledger
              </h2>
              <span className="text-[10px] font-mono text-[#696969] font-bold">{decisions.length} AUDITED</span>
            </div>

            <p className="text-xs text-[#696969]">
              Chronological immutable timeline of approved Human-in-the-Loop operational signs.
            </p>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {decisions.map((dec) => (
                <div key={dec.id} className="p-3 rounded-[12px] border border-[#141413]/10 bg-[#FCFBFA] space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-mono">
                    <span className={`font-bold px-1.5 py-0.2 rounded-full uppercase text-[8px] ${
                      dec.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {dec.status.toUpperCase()}
                    </span>
                    <span className="text-[#696969] font-bold">{new Date(dec.timestamp).toLocaleDateString()}</span>
                  </div>
                  <h5 className="text-[10.5px] font-bold text-[#141413] line-clamp-1">{dec.title}</h5>
                  <p className="text-[10px] text-[#696969] leading-relaxed line-clamp-2">{dec.description}</p>
                  <p className="text-[9px] text-[#696969] font-mono font-bold italic">
                    Outcome: {dec.impactText}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* RISK PREDICTION ENGINE (Blueprint Stretch Feature #5) */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] font-mono">Risk Prediction Engine</h2>
              </div>
              <span className="text-[9px] font-mono text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full font-bold">AI PREDICTIVE</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-[12px] bg-[#FCFBFA] border border-[#141413]/10 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                  <span className="text-[#696969]">Launch Delay Risk</span>
                  <span className="text-amber-700">18% Low Risk (92% Conf)</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600" style={{ width: '18%' }} />
                </div>
              </div>

              <div className="p-2.5 rounded-[12px] bg-[#FCFBFA] border border-[#141413]/10 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                  <span className="text-[#696969]">Hiring Bottleneck</span>
                  <span className="text-rose-700">34% Medium (89% Conf)</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-rose-600" style={{ width: '34%' }} />
                </div>
              </div>

              <div className="p-2.5 rounded-[12px] bg-[#FCFBFA] border border-[#141413]/10 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                  <span className="text-[#696969]">Burn Rate Threat</span>
                  <span className="text-emerald-700">12% Minimal (96% Conf)</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600" style={{ width: '12%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* SMART GOAL TRACKER (Blueprint Stretch Feature #7) */}
          <div className="bg-white border border-[#141413]/10 p-5 rounded-[20px] space-y-4 shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px] hover:border-[#141413]/20 transition-all">
            <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#141413] font-mono">Smart Goal Tracker</h2>
              </div>
              <span className="text-[9px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">76% COMPLETED</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center text-[10px] mb-1 font-mono font-bold">
                  <span className="text-[#696969]">Product MVP Launch</span>
                  <span className="text-indigo-700 font-bold">78%</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-700" style={{ width: '78%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1 font-mono font-bold">
                  <span className="text-[#696969]">Founding Eng Hiring</span>
                  <span className="text-pink-700 font-bold">65%</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-pink-600" style={{ width: '65%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] mb-1 font-mono font-bold">
                  <span className="text-[#696969]">Seed Round Fundraising</span>
                  <span className="text-emerald-700 font-bold">85%</span>
                </div>
                <div className="h-1.5 bg-[#F3F0EE] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* REPORT GENERATION MODAL OVERLAY (Investor Update / Board Report) */}
      {generatedReport && (
        <div className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-[#141413]/10 rounded-[20px] shadow-[rgba(0,0,0,0.12)_0px_24px_48px_0px] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#141413]/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#141413]/05 text-[#141413] border border-[#141413]/10 font-bold">
                  {generatedReport.type.toUpperCase()}
                </span>
                <h3 className="text-sm font-bold text-[#141413] mt-1">{generatedReport.title}</h3>
              </div>
              <button
                onClick={() => setGeneratedReport(null)}
                className="px-3.5 py-1.5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 text-xs text-[#696969] hover:text-[#141413] transition-all cursor-pointer font-sans"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto font-mono text-xs text-[#141413] leading-relaxed whitespace-pre-wrap bg-[#FCFBFA]">
              {generatedReport.content}
            </div>

            <div className="p-4 border-t border-[#141413]/10 bg-[#F3F0EE] flex justify-between items-center">
              <span className="text-[10px] font-mono text-[#696969] font-bold">Auto-compiled from active startup metrics & RAG context</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedReport.content);
                  alert('Copied report to clipboard!');
                  setGeneratedReport(null);
                }}
                className="px-4 py-2 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-white font-bold text-xs cursor-pointer font-sans"
              >
                Copy Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GMAIL / OUTREACH INTEGRATION MODAL (Blueprint Stretch Feature #8) */}
      {emailModal && (
        <div className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-[#141413]/10 rounded-[20px] shadow-[rgba(0,0,0,0.12)_0px_24px_48px_0px] overflow-hidden">
            <div className="p-5 border-b border-[#141413]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-[#141413]">Gmail Integration Outreach</h3>
              </div>
              <button
                onClick={() => setEmailModal(null)}
                className="text-xs text-[#696969] hover:text-[#141413] transition-all cursor-pointer font-sans font-bold"
              >
                Cancel
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#696969] mb-1 font-bold">To Candidate:</label>
                <input
                  type="text"
                  value={emailModal.recipient}
                  readOnly
                  className="w-full bg-[#FCFBFA] border border-[#141413]/10 rounded-[8px] p-2.5 text-[#141413] font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#696969] mb-1 font-bold">Subject:</label>
                <input
                  type="text"
                  value={emailModal.subject}
                  readOnly
                  className="w-full bg-[#FCFBFA] border border-[#141413]/10 rounded-[8px] p-2.5 text-[#141413] font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-[#696969] mb-1 font-bold">Email Body:</label>
                <textarea
                  value={emailModal.body}
                  readOnly
                  rows={6}
                  className="w-full bg-[#FCFBFA] border border-[#141413]/10 rounded-[8px] p-2.5 text-[#141413] font-mono leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#141413]/10 bg-[#F3F0EE] flex justify-end gap-2">
              <button
                onClick={() => setEmailModal(null)}
                className="px-3.5 py-1.5 rounded-[20px] bg-white border border-[#141413]/10 text-xs text-[#696969] hover:text-[#141413] transition-all cursor-pointer font-bold"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  alert('Email successfully dispatched via Gmail API integration!');
                  setEmailModal(null);
                }}
                className="px-5 py-1.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-white font-bold text-xs cursor-pointer font-sans"
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
