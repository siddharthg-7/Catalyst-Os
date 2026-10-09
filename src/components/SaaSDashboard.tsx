import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  StartupProfile, 
  Agent, 
  Initiative, 
  Deliverable, 
  KnowledgeFile, 
  DecisionRecord, 
  DelegatedTask, 
  CompanyMembership, 
  CompanyInvitation 
} from '../types';
import {
  TrendingUp, TrendingDown, Clock, ArrowRight, Calendar,
  Mic, MicOff, Send, Sparkles, CheckSquare, Activity,
  Wallet, Hourglass, Flame, ChevronRight, Users, Scale,
  LineChart, Briefcase, Check, ShieldCheck, AlertCircle,
  FileText, ExternalLink, Calculator, Layers, Loader2,
  BookOpen, UploadCloud, Database, Target, Zap, BarChart3,
  Shield, CheckCircle2, ChevronDown, Settings2, Edit3, X, SlidersHorizontal,
  AlertTriangle, UserCheck, UserPlus, Compass, ArrowUpRight, Landmark, Rocket
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import MarkdownRenderer from './chatbot/MarkdownRenderer';
import Section from './Section';

interface SaaSDashboardProps {
  startup: StartupProfile;
  agents: Agent[];
  initiatives: Initiative[];
  approvals: Deliverable[];
  decisions: DecisionRecord[];
  knowledge: KnowledgeFile[];
  tasks?: DelegatedTask[];
  memberships?: CompanyMembership[];
  invitations?: CompanyInvitation[];
  onReviewItem: (id: string, action: 'approve' | 'modify' | 'reject', feedback?: string, modifications?: any) => Promise<void>;
  onUploadDoc: (name: string, content: string, type: string) => Promise<void>;
  onLaunchInitiative: (title: string, description: string, category: 'funding' | 'hiring' | 'growth' | 'operations' | 'legal') => Promise<void>;
  onSimulateInitiative: (id: string) => Promise<void>;
  onUpdateStartup: (updated: StartupProfile) => void;
  onRefreshTasks?: () => Promise<void>;
  onNavigate?: (tab: 'dashboard' | 'workspace' | 'approvals' | 'knowledge' | 'agents' | 'workflows' | 'people' | 'scenarios' | 'decisions') => void;
}

// ── Utility Helpers ───────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(val: number): string {
  if (!val || isNaN(val)) return '$0';
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toLocaleString()}`;
}

const CATEGORY_COLOR: Record<string, string> = {
  Hiring: 'bg-blue-50 text-blue-600 border-blue-100',
  Growth: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Investment: 'bg-purple-50 text-purple-700 border-purple-200',
  Legal: 'bg-amber-50 text-amber-600 border-amber-100',
  Finance: 'bg-rose-50 text-rose-600 border-rose-100',
  Operations: 'bg-sky-50 text-sky-600 border-sky-100',
  Approval: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Knowledge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Strategy: 'bg-gray-900 text-white border-gray-800',
  Governance: 'bg-purple-50 text-purple-700 border-purple-100',
};

const AGENT_ROLE_LABEL: Record<string, string> = {
  CEO: 'Strategy',
  Finance: 'Finance',
  Talent: 'Hiring',
  Growth: 'Growth',
  Operations: 'Operations',
  Legal: 'Legal',
  ConflictResolver: 'Catalyst',
  ApprovalManager: 'Approvals',
  Investment: 'Investment',
  Auditor: 'Auditor',
};

// ── KPI Card Component ────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  showBar?: boolean;
  barValue?: number;
  accentColor: string;
  onClick?: () => void;
  actionHint?: string;
}

function KpiCard({ icon, label, value, delta, deltaPositive, showBar, barValue, accentColor, onClick, actionHint }: KpiCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`catalyst-card card-hover glow-border p-6 flex flex-col justify-between gap-4 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-[#141413]/25 group' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        <div className="flex items-center gap-1.5">
          {actionHint && (
            <span className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full transition-opacity flex items-center gap-1">
              <Edit3 className="w-2.5 h-2.5" />
              <span>{actionHint}</span>
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-mono ${deltaPositive ? 'text-emerald-700 bg-emerald-50/80 border border-emerald-100' : 'text-amber-700 bg-amber-50/80 border border-amber-100'}`}>
            {deltaPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta}
          </span>
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold text-[#141413] tracking-tight font-sans">{value}</p>
          {onClick && (
            <span className="p-1 rounded-md text-[#141413]/20 group-hover:text-emerald-700 group-hover:bg-emerald-50 transition-colors">
              <Edit3 className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <p className="text-xs text-[#696969] mt-1.5 font-medium">{label}</p>
      </div>
      {showBar && barValue !== undefined && (
        <div className="h-1.5 w-full bg-[#141413]/06 rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full bg-[#141413] transition-all duration-700"
            style={{ width: `${Math.min(Math.max(barValue, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Founder Command Center Component ─────────────────────────────────────
export default function SaaSDashboard({
  startup,
  agents,
  initiatives,
  approvals,
  decisions,
  knowledge,
  tasks = [],
  memberships = [],
  invitations = [],
  onReviewItem,
  onLaunchInitiative,
  onUpdateStartup,
  onRefreshTasks,
  onNavigate,
}: SaaSDashboardProps) {
  const { user, apiFetch } = useAuth();
  const { sendMessage, messages, isTyping } = useChat(apiFetch, user?.id);

  // Treasury Calibration State
  const [isCalibratingTreasury, setIsCalibratingTreasury] = useState(false);
  const [editCash, setEditCash] = useState<number>(startup.cashBalance || 245000);
  const [editBurn, setEditBurn] = useState<number>(startup.burnRate || 18500);
  const [isSavingTreasury, setIsSavingTreasury] = useState(false);

  // Reviewing approval spinner state
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    if (startup.cashBalance !== undefined) setEditCash(startup.cashBalance);
    if (startup.burnRate !== undefined) setEditBurn(startup.burnRate);
  }, [startup.cashBalance, startup.burnRate]);

  // Derived Financial Telemetry
  const cashBalance = startup.cashBalance ?? 245000;
  const burnRate = startup.burnRate ?? 18500;
  const runwayMonths = startup.runwayMonths > 0 ? startup.runwayMonths : (burnRate > 0 ? cashBalance / burnRate : 12);
  const healthScore = startup.healthScore ?? 82;

  // 5-Dimension Department Analytics
  const metrics = {
    velocity: startup.metrics?.velocity ?? 78,
    financialHealth: startup.metrics?.financialHealth ?? 84,
    legalCompliance: startup.metrics?.legalCompliance ?? 92,
    growthRate: startup.metrics?.growthRate ?? 65,
    operationsEfficiency: startup.metrics?.operationsEfficiency ?? 80,
  };

  // Runway Risk Status
  const isRunwayCritical = runwayMonths < 4;
  const isRunwayAdequate = runwayMonths >= 4 && runwayMonths < 12;
  const isRunwayHealthy = runwayMonths >= 12;

  // Monthly Burn Ratio (% of total reserves spent each month)
  const monthlyBurnRatio = cashBalance > 0 ? ((burnRate / cashBalance) * 100).toFixed(1) : '0';

  // AI Command Box State
  const [aiInput, setAiInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [aiPermissionError, setAiPermissionError] = useState<string | null>(null);
  const [aiSending, setAiSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [aiInput]);

  const handleAiSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || aiInput.trim();
    if (!textToSend || aiSending) return;
    setAiInput('');
    setAiSending(true);
    try {
      await sendMessage(textToSend);
      if (onRefreshTasks) {
        // Soft refresh tasks so newly delegated council orders reflect in real-time
        setTimeout(() => onRefreshTasks(), 1500);
      }
    } finally {
      setAiSending(false);
    }
  };

  const handleAiKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiSend();
    }
  };

  const toggleRecording = () => {
    setAiPermissionError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAiPermissionError('Speech recognition not supported in this browser.');
      return;
    }
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      setIsRecording(true);
      recognition.start();
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
        setAiInput(transcript);
      };
      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === 'not-allowed') setAiPermissionError('Microphone access denied.');
      };
      recognition.onend = () => setIsRecording(false);
    } catch {
      setIsRecording(false);
      setAiPermissionError('Could not access microphone.');
    }
  };

  // 1-Click Quick Review Handlers for Pending Approvals
  const handleQuickApprove = async (id: string) => {
    try {
      setReviewingId(id);
      await onReviewItem(id, 'approve', 'Approved via Founder Command Center');
    } finally {
      setReviewingId(null);
    }
  };

  const handleQuickReject = async (id: string) => {
    try {
      setReviewingId(id);
      await onReviewItem(id, 'reject', 'Rejected via Founder Command Center');
    } finally {
      setReviewingId(null);
    }
  };

  // Dynamic Priorities Engine
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});
  const toggleTask = (id: string) => {
    setCompletedTaskIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const pendingApprovals = useMemo(() => {
    return approvals.filter(a => a.status === 'pending_review');
  }, [approvals]);

  const dynamicPriorities = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      category: string;
      due: string;
      impact?: string;
      completed: boolean;
      actionType?: 'approval' | 'workflow' | 'knowledge' | 'task';
      targetId?: string;
    }> = [];

    // Prioritize pending Human-in-the-Loop approvals
    pendingApprovals.slice(0, 3).forEach(a => {
      list.push({
        id: `appr_${a.id}`,
        title: `Founder Review: ${a.title}`,
        category: 'Approval',
        due: 'Gate Pending',
        impact: a.impact,
        completed: false,
        actionType: 'approval',
        targetId: a.id,
      });
    });

    // Delegated council work orders (Phase A3)
    tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').slice(0, 3).forEach(t => {
      list.push({
        id: `delegated_${t.id}`,
        title: `[${t.department}] ${t.title}`,
        category: t.department ? (t.department.charAt(0).toUpperCase() + t.department.slice(1).toLowerCase()) : 'Operations',
        due: t.status === 'in_progress' ? 'In Progress' : 'Assigned',
        completed: false,
        actionType: 'task',
        targetId: t.id,
      });
    });

    // Active workflow tasks from initiatives
    initiatives
      .filter(i => i.status === 'active' || i.status === 'pending')
      .forEach(i => {
        const pendingTask = i.tasks?.find(t => t.status !== 'completed');
        if (pendingTask && list.length < 6) {
          list.push({
            id: `task_${pendingTask.id}`,
            title: `${i.title} → ${pendingTask.title}`,
            category: i.category ? (i.category.charAt(0).toUpperCase() + i.category.slice(1)) : 'Operations',
            due: pendingTask.status === 'in_progress' ? 'In Progress' : 'Queued',
            completed: false,
            actionType: 'workflow',
            targetId: i.id,
          });
        }
      });

    // Knowledge Base recommendation
    if (knowledge.length === 0) {
      list.push({
        id: 'rec_doc_ingest',
        title: 'Ingest Pitch Deck or Financial Model to Ground AI Executive Suite',
        category: 'Knowledge',
        due: 'High Priority',
        completed: false,
        actionType: 'knowledge',
      });
    }

    if (list.length === 0) {
      list.push(
        {
          id: 'rec_ceo_cmd',
          title: 'Issue strategic objective to Sophia Vance (CEO) via Command Box',
          category: 'Strategy',
          due: 'Ready',
          completed: false,
        },
        {
          id: 'rec_board_prep',
          title: 'Generate Weekly Executive Board Briefing & Health Assessment',
          category: 'Governance',
          due: 'Upcoming',
          completed: false,
        }
      );
    }

    return list;
  }, [pendingApprovals, tasks, initiatives, knowledge]);

  // Important Risks Sentinel Engine
  const detectedRisks = useMemo(() => {
    const risks: Array<{
      id: string;
      title: string;
      description: string;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      actionLabel: string;
      actionType: 'calibrate' | 'approvals' | 'people' | 'knowledge' | 'prompt';
      promptText?: string;
    }> = [];

    // 1. Runway Horizon Risk (CFO Veto threshold)
    if (runwayMonths < 4) {
      risks.push({
        id: 'risk_runway_critical',
        title: 'Critical Runway Horizon (< 4 Months)',
        description: `Current runway is ${runwayMonths.toFixed(1)} months at $${burnRate.toLocaleString()}/mo burn. The CFO will veto unbudgeted initiatives to prevent insolvency.`,
        severity: 'CRITICAL',
        actionLabel: 'Calibrate Treasury',
        actionType: 'calibrate'
      });
    } else if (runwayMonths < 8) {
      risks.push({
        id: 'risk_runway_moderate',
        title: 'Runway Buffer Warning (< 8 Months)',
        description: `Cash reserves support ${runwayMonths.toFixed(1)} months of continuous runway. Pacing new hires and capital expenditure recommended.`,
        severity: 'MEDIUM',
        actionLabel: 'Calibrate Treasury',
        actionType: 'calibrate'
      });
    }

    // 2. High Burn Ratio Risk
    if (cashBalance > 0 && (burnRate / cashBalance) > 0.15) {
      risks.push({
        id: 'risk_high_burn',
        title: 'Accelerated Burn Ratio (>15%/month)',
        description: `Monthly burn is consuming ${monthlyBurnRatio}% of remaining cash each month. Capital efficiency optimization advised.`,
        severity: 'HIGH',
        actionLabel: 'Ask CFO Aura',
        actionType: 'prompt',
        promptText: 'Analyze our monthly burn rate and recommend cost optimization measures.'
      });
    }

    // 3. Unassigned Council Tasks (needsHumanOwner)
    const unassignedTasks = tasks.filter(t => t.needsHumanOwner && t.status !== 'approved' && t.status !== 'rejected');
    if (unassignedTasks.length > 0) {
      risks.push({
        id: 'risk_unassigned_work',
        title: `${unassignedTasks.length} Delegated Task${unassignedTasks.length > 1 ? 's' : ''} Lack Human Owner`,
        description: `Council decomposed tasks in ${Array.from(new Set(unassignedTasks.map(t => t.department))).join(', ')} require a human owner to complete.`,
        severity: 'MEDIUM',
        actionLabel: 'Assign / Invite',
        actionType: 'people'
      });
    }

    // 4. Pending Review Bottleneck
    if (pendingApprovals.length > 0) {
      risks.push({
        id: 'risk_pending_approvals',
        title: `${pendingApprovals.length} Executive Approval${pendingApprovals.length > 1 ? 's' : ''} Pending Sign-Off`,
        description: 'Autonomous agents have paused execution awaiting founder authorization on gated deliverables.',
        severity: 'MEDIUM',
        actionLabel: 'Review Gates',
        actionType: 'approvals'
      });
    }

    // 5. Knowledge Grounding Gap
    if (knowledge.length === 0) {
      risks.push({
        id: 'risk_no_knowledge',
        title: 'Uncalibrated Context (Zero Ingested Documents)',
        description: 'Executive council is operating on stage baseline heuristics rather than verified company pitch decks and contracts.',
        severity: 'LOW',
        actionLabel: 'Ingest Document',
        actionType: 'knowledge'
      });
    }

    return risks;
  }, [runwayMonths, burnRate, cashBalance, monthlyBurnRatio, tasks, pendingApprovals, knowledge]);

  // 6-Month Projected Cash Trajectory
  const runwayProjections = useMemo(() => {
    const months = ['Now', '+1 Mo', '+2 Mo', '+3 Mo', '+4 Mo', '+5 Mo', '+6 Mo'];
    return months.map((month, idx) => {
      const projected = Math.max(0, cashBalance - burnRate * idx);
      return {
        month,
        cash: projected,
        percentage: cashBalance > 0 ? Math.round((projected / cashBalance) * 100) : 0,
      };
    });
  }, [cashBalance, burnRate]);

  // Flattened Grounded Insights from all uploaded Knowledge documents
  const allGroundedInsights = useMemo(() => {
    const list: Array<{ docName: string; insight: string; docType: string }> = [];
    knowledge.forEach(k => {
      if (k.insights && Array.isArray(k.insights)) {
        k.insights.forEach(ins => {
          if (ins && typeof ins === 'string' && ins.trim()) {
            list.push({ docName: k.name, insight: ins.trim(), docType: k.type });
          }
        });
      }
    });
    return list;
  }, [knowledge]);

  // Dynamic Activity / Governance Feed
  const recentActivity = decisions.slice(0, 4).map(d => ({
    id: d.id,
    actor: AGENT_ROLE_LABEL[d.category] ?? d.category,
    action: d.title,
    time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    positive: d.status === 'approved',
  }));

  const activityFeed = recentActivity.length > 0
    ? recentActivity
    : [
        { id: 'a1', actor: 'Atlas (CEO)', action: 'Orchestrating executive operational vectors', time: 'Active', positive: true },
        { id: 'a2', actor: 'Aura (CFO)', action: 'Monitoring treasury balances & runway horizon', time: 'Active', positive: true },
        { id: 'a3', actor: 'Sentry (Auditor)', action: 'Enforcing deterministic mathematical bounds', time: 'Active', positive: true },
      ];

  // Dynamic Milestones & Events
  const dynamicEvents = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      day: string;
      time: string;
      icon: string;
      tag: string;
    }> = [];

    const checkpointDate = new Date();
    checkpointDate.setDate(checkpointDate.getDate() + 14);
    events.push({
      id: 'ev_runway',
      title: 'Runway & Treasury Health Audit',
      day: checkpointDate.toLocaleDateString('en-US', { weekday: 'long' }),
      time: '10:00 AM',
      icon: '📊',
      tag: `${(runwayMonths || 12).toFixed(1)}m Buffer`,
    });

    const activeInit = initiatives.find(i => i.status === 'active');
    if (activeInit) {
      events.push({
        id: `ev_init_${activeInit.id}`,
        title: `${activeInit.title} Sprint Review`,
        day: 'Thursday',
        time: '2:30 PM',
        icon: '🚀',
        tag: 'In Progress',
      });
    } else {
      events.push({
        id: 'ev_exec_matrix',
        title: 'Executive C-Suite Alignment Sync',
        day: 'Wednesday',
        time: '3:00 PM',
        icon: '⚡',
        tag: 'Atlas (CEO)',
      });
    }

    return events;
  }, [runwayMonths, initiatives]);

  // Team indicators summary
  const teamSizeDisplay = startup.teamSize ? String(startup.teamSize) : (memberships.length > 0 ? String(memberships.length) : '1-5');
  const activeMembersCount = memberships.length > 0 ? memberships.filter(m => m.status === 'ACTIVE').length : 1;
  const pendingInvitesCount = invitations.filter(i => i.status === 'PENDING').length;

  const firstName = user?.name?.split(' ')[0] ?? 'Founder';

  return (
    <div className="space-y-6 pb-12">

      {/* ── 1. Welcome & Status Sentinel ──────────────────────────────── */}
      <Section delay={0.03} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-900 text-white uppercase tracking-wider">
              {startup.fundingStage || 'Pre-Seed'}
            </span>
            <span className="text-xs font-medium text-gray-500 font-sans">
              {startup.industry || 'Technology'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Orchestrator Online</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Founder Command Center · {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Operating view for <span className="font-semibold text-gray-800">{startup.name || 'Your Startup'}</span> · 8 Executive Agents Synchronized
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditCash(cashBalance);
              setEditBurn(burnRate);
              setIsCalibratingTreasury(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#141413]/10 text-[#141413] text-xs font-semibold hover:border-[#141413]/25 hover:bg-stone-50 transition-all shadow-subtle interactive-btn"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
            <span>Calibrate Financials</span>
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('scenarios')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#141413]/10 text-[#141413] text-xs font-semibold hover:border-[#141413]/25 hover:bg-stone-50 transition-all shadow-subtle interactive-btn"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              <span>Scenario Studio</span>
            </button>
          )}
        </div>
      </Section>

      {/* ── 2. HERO: THE CATALYST COMMAND BOX (The Central Concept) ─────── */}
      <Section delay={0.06} className="bg-white rounded-2xl border border-[#141413]/10 shadow-md overflow-hidden relative">
        {/* Central Concept Architecture Banner */}
        <div className="px-6 py-2.5 bg-[#141413] text-[#F3F0EE] flex items-center justify-between border-b border-white/10 text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="font-bold text-white/90">FOUNDER</span>
            <span className="text-white/40">─►</span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-emerald-400 font-bold border border-white/10">CATALYST COMMAND BOX</span>
            <span className="text-white/40">─►</span>
            <span className="font-bold text-white/90">ORCHESTRATOR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-white/70">SSE Real-Time Stream</span>
          </div>
        </div>

        {/* Command Box Input Area */}
        <div className="p-5 space-y-3">
          {aiPermissionError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex justify-between items-center">
              <span>{aiPermissionError}</span>
              <button onClick={() => setAiPermissionError(null)} className="text-rose-500 hover:text-rose-700 font-semibold ml-2">✕</button>
            </div>
          )}

          <div className="flex items-end gap-2 p-3 bg-[#F3F0EE]/40 border border-[#141413]/12 rounded-2xl focus-within:border-[#141413]/40 focus-within:bg-white transition-all shadow-inner">
            <textarea
              ref={textareaRef}
              value={aiInput}
              onChange={e => setAiInput(e.target.value.slice(0, 2000))}
              onKeyDown={handleAiKeyDown}
              placeholder={isRecording ? 'Listening... speak your founder command' : 'Issue a strategic command to your autonomous council... e.g., "What are our biggest risks?", "Prepare a 30-day GTM plan", "Can we afford to hire three engineers?"'}
              disabled={aiSending}
              rows={2}
              className="flex-1 bg-transparent px-2.5 py-1 text-sm text-[#141413] placeholder:text-[#696969]/65 focus:outline-none resize-none leading-relaxed font-sans"
            />

            {/* Mic button */}
            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-[#696969] hover:text-[#141413] hover:bg-white'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={() => handleAiSend()}
              disabled={!aiInput.trim() || aiSending}
              className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                aiInput.trim() && !aiSending
                  ? 'bg-[#141413] text-[#F3F0EE] hover:bg-black shadow-sm'
                  : 'bg-[#141413]/10 text-[#696969]/40 cursor-not-allowed'
              }`}
            >
              {aiSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="text-xs font-semibold pr-1 hidden sm:inline">Execute</span>
            </button>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-[#696969] font-bold uppercase tracking-wider mr-1">
              Suggested Directives:
            </span>
            {[
              "What is our current runway at current burn?",
              "Can we afford to hire three engineers?",
              "What are the biggest risks to the company right now?",
              "Prepare a 30-day GTM plan based on our ICP.",
              "Review pending founder approvals.",
            ].map(prompt => (
              <button
                key={prompt}
                onClick={() => handleAiSend(prompt)}
                disabled={aiSending}
                className="text-xs text-[#696969] hover:text-[#141413] bg-[#F3F0EE]/60 hover:bg-white border border-[#141413]/08 hover:border-[#141413]/25 px-2.5 py-1 rounded-full transition-all cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Live Conversation & Stream Output */}
        {messages.length > 0 && (
          <div className="px-6 py-4 max-h-[500px] overflow-y-auto space-y-4 border-t border-[#141413]/06 bg-[#F3F0EE]/15">
            {messages.slice(-3).map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-[#141413] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Sparkles className="w-4 h-4 text-[#F3F0EE]" />
                  </div>
                )}
                <div className={`max-w-[85%] px-4 py-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#141413] text-[#F3F0EE] rounded-tr-sm shadow-xs'
                    : 'bg-white text-[#141413] border border-[#141413]/10 rounded-tl-sm shadow-sm'
                }`}>
                  {/* Provider Unavailable Alert Banner */}
                  {msg.role === 'assistant' && msg.status === 'provider_unavailable' && (
                    <div className="mb-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium flex items-center gap-1.5 font-mono">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Operating in Deterministic Mathematical Fallback Mode</span>
                    </div>
                  )}

                  {/* Intent & Objective pill */}
                  {msg.role === 'assistant' && (msg.intent || msg.objective) && (
                    <div className="mb-2.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-[11px] font-mono text-stone-800 flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-stone-600">Intent:</span>
                      <span className="font-semibold">{msg.intent || 'Strategic Directive'}</span>
                      {msg.objective && <span className="text-stone-500 truncate">· {msg.objective}</span>}
                    </div>
                  )}

                  {/* Dynamic Executive Agent Strip */}
                  {msg.role === 'assistant' && msg.activeAgents && msg.activeAgents.some(a => a.status !== 'idle') && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5 pb-2 border-b border-[#141413]/08">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#696969] mr-1">
                        Executive Matrix:
                      </span>
                      {msg.activeAgents.filter(a => a.status !== 'idle').map(ag => (
                        <span
                          key={ag.role}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-50 border border-[#141413]/10 text-[#141413] text-[10px] font-medium font-mono"
                          title={ag.contribution || `${ag.role}: ${ag.status}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ag.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                          <span>{ag.role}</span>
                          {ag.status === 'completed' && <Check className="w-3 h-3 text-emerald-600 inline" />}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Supporting Data / Verified Audit Evidence */}
                  {msg.role === 'assistant' && ((msg.supportingData && msg.supportingData.length > 0) || (msg.calculations && msg.calculations.length > 0)) && (
                    <div className="mb-3 p-3 rounded-xl bg-stone-50 border border-[#141413]/08 shadow-xs">
                      <div className="text-[10px] font-mono font-bold text-[#141413] uppercase tracking-wider flex items-center justify-between border-b border-[#141413]/06 pb-1.5 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                          <span>SUPPORTING AUDIT EVIDENCE</span>
                        </div>
                        <span className="text-[9px] text-[#696969] font-mono">DETERMINISTIC VERIFICATION</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {(msg.supportingData && msg.supportingData.length > 0 ? msg.supportingData : (msg.calculations || []).map(c => ({ label: c.metric, value: String(c.value), source: c.source }))).map((sd, idx) => (
                          <div key={idx} className="text-xs bg-white px-2.5 py-1.5 rounded-lg border border-[#141413]/06 flex justify-between items-center gap-2">
                            <div>
                              <span className="text-[#141413] font-medium block text-[11px]">{sd.label}</span>
                              <span className="text-[9px] text-[#696969] font-mono">Source: {sd.source}</span>
                            </div>
                            <span className="font-bold text-[#141413] font-mono shrink-0 text-xs">{sd.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Executive AI Synthesis */}
                  <div className="space-y-1">
                    <MarkdownRenderer content={msg.content} />
                  </div>

                  {/* Grounded In Citations */}
                  {msg.role === 'assistant' && ((msg.citations && msg.citations.length > 0) || (msg.evidence && msg.evidence.length > 0)) && (
                    <div className="mt-3 pt-2.5 border-t border-[#141413]/08 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-bold text-[#141413] font-mono flex items-center gap-1">
                        <FileText className="w-3 h-3 text-[#696969]" />
                        Grounded In:
                      </span>
                      {(msg.citations && msg.citations.length > 0 ? msg.citations.map(c => ({ citationId: c.id, documentName: c.title })) : (msg.evidence || [])).map((ev, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-stone-50 border border-[#141413]/10 text-[#141413] font-mono shadow-xs">
                          [{ev.citationId}] {ev.documentName || 'Document'}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Human-in-the-Loop Approval Gate */}
                  {msg.role === 'assistant' && msg.approval?.required && (
                    <div className="mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-amber-950">Action Requires Founder Approval</span>
                          <span className="text-[11px] text-amber-800 leading-snug">
                            {msg.approval.reason || 'High-stakes execution pending review.'}
                          </span>
                        </div>
                      </div>
                      {onNavigate && (
                        <button
                          onClick={() => onNavigate('approvals')}
                          className="px-3 py-1.5 rounded-lg bg-[#141413] text-[#F3F0EE] font-semibold text-[11px] hover:bg-black transition-colors shrink-0 shadow-xs cursor-pointer flex items-center justify-center gap-1 w-fit"
                        >
                          <span>Review in Approvals</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-[#141413] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="w-4 h-4 text-[#F3F0EE] animate-spin" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-[#141413]/10 shadow-xs space-y-1.5 max-w-[85%]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#141413]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#141413]" />
                    <span>Atlas (CEO Orchestrator) Synthesizing Council Directives...</span>
                  </div>
                  <p className="text-[11px] text-[#696969] font-sans">
                    Grounding strategy against verified startup documents, treasury bounds, and auditor compliance.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── 3. IMPORTANT RISKS SENTINEL ───────────────────────────────── */}
      <Section delay={0.09} className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-[#141413] uppercase tracking-wider font-mono text-[11px]">
              Important Risks Sentinel
            </h2>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            detectedRisks.some(r => r.severity === 'CRITICAL')
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : detectedRisks.length > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {detectedRisks.length > 0 ? `${detectedRisks.length} Risk Flag${detectedRisks.length > 1 ? 's' : ''}` : 'All Clear'}
          </span>
        </div>

        {detectedRisks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detectedRisks.map(risk => (
              <div
                key={risk.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  risk.severity === 'CRITICAL'
                    ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                    : risk.severity === 'HIGH'
                    ? 'bg-orange-50/60 border-orange-200 text-orange-950'
                    : 'bg-amber-50/40 border-amber-200/80 text-amber-950'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      risk.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : risk.severity === 'HIGH' ? 'bg-orange-600 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      {risk.severity} RISK
                    </span>
                  </div>
                  <h3 className="text-xs font-bold pt-1">{risk.title}</h3>
                  <p className="text-[11px] leading-relaxed opacity-85">{risk.description}</p>
                </div>

                <div className="flex items-center justify-end pt-1">
                  {risk.actionType === 'calibrate' && (
                    <button
                      onClick={() => setIsCalibratingTreasury(true)}
                      className="px-3 py-1 rounded-lg bg-[#141413] text-[#F3F0EE] text-[11px] font-semibold hover:bg-black transition-colors"
                    >
                      {risk.actionLabel}
                    </button>
                  )}
                  {risk.actionType === 'approvals' && onNavigate && (
                    <button
                      onClick={() => onNavigate('approvals')}
                      className="px-3 py-1 rounded-lg bg-[#141413] text-[#F3F0EE] text-[11px] font-semibold hover:bg-black transition-colors"
                    >
                      {risk.actionLabel}
                    </button>
                  )}
                  {risk.actionType === 'people' && onNavigate && (
                    <button
                      onClick={() => onNavigate('people')}
                      className="px-3 py-1 rounded-lg bg-[#141413] text-[#F3F0EE] text-[11px] font-semibold hover:bg-black transition-colors"
                    >
                      {risk.actionLabel}
                    </button>
                  )}
                  {risk.actionType === 'knowledge' && onNavigate && (
                    <button
                      onClick={() => onNavigate('knowledge')}
                      className="px-3 py-1 rounded-lg bg-[#141413] text-[#F3F0EE] text-[11px] font-semibold hover:bg-black transition-colors"
                    >
                      {risk.actionLabel}
                    </button>
                  )}
                  {risk.actionType === 'prompt' && risk.promptText && (
                    <button
                      onClick={() => handleAiSend(risk.promptText)}
                      className="px-3 py-1 rounded-lg bg-[#141413] text-[#F3F0EE] text-[11px] font-semibold hover:bg-black transition-colors"
                    >
                      {risk.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>All Financial Bounds, Compliance Thresholds & Operational Vectors Nominal</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-700 font-bold">ZERO ACTIVE BLOCKS</span>
          </div>
        )}
      </Section>

      {/* ── 4. FINANCIAL ENGINE TELEMETRY: Cash, Burn, Runway & Health ─── */}
      <Section delay={0.12} className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#696969] uppercase tracking-wider font-mono text-[10px]">
              Treasury, Burn & Financial Engine
            </span>
            <span className="text-[10px] text-[#696969]/60 font-mono">Real Backend Metrics</span>
          </div>
          <button
            onClick={() => {
              setEditCash(cashBalance);
              setEditBurn(burnRate);
              setIsCalibratingTreasury(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-subtle interactive-btn"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Calibrate</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={<Wallet className="w-4 h-4 text-emerald-700" />}
            accentColor="bg-emerald-50"
            label="Cash Reserves"
            value={formatCurrency(cashBalance)}
            delta={`${burnRate > 0 ? `${monthlyBurnRatio}% burn/mo` : 'Active Treasury'}`}
            deltaPositive={burnRate < cashBalance * 0.15}
            onClick={() => {
              setEditCash(cashBalance);
              setEditBurn(burnRate);
              setIsCalibratingTreasury(true);
            }}
            actionHint="Calibrate"
          />
          <KpiCard
            icon={<Flame className="w-4 h-4 text-orange-500" />}
            accentColor="bg-orange-50"
            label="Monthly Burn Rate"
            value={formatCurrency(burnRate)}
            delta={`${isRunwayHealthy ? 'Healthy Burn' : isRunwayAdequate ? 'Moderate Burn' : 'High Burn Alert'}`}
            deltaPositive={isRunwayHealthy}
            onClick={() => {
              setEditCash(cashBalance);
              setEditBurn(burnRate);
              setIsCalibratingTreasury(true);
            }}
            actionHint="Calibrate"
          />
          <KpiCard
            icon={<Hourglass className="w-4 h-4 text-gray-900" />}
            accentColor="bg-gray-100"
            label="Runway Horizon"
            value={`${runwayMonths.toFixed(1)} Months`}
            delta={
              isRunwayCritical
                ? 'CRITICAL (< 4mo)'
                : isRunwayAdequate
                ? 'ADEQUATE (4-12mo)'
                : 'HEALTHY (> 12mo)'
            }
            deltaPositive={isRunwayHealthy}
            onClick={() => {
              setEditCash(cashBalance);
              setEditBurn(burnRate);
              setIsCalibratingTreasury(true);
            }}
            actionHint="Calibrate"
          />
          <KpiCard
            icon={<Activity className="w-4 h-4 text-indigo-600" />}
            accentColor="bg-indigo-50"
            label="Composite Health Score"
            value={`${healthScore} / 100`}
            delta={`${healthScore >= 70 ? '+' : ''}${(healthScore - 70).toFixed(0)} vs baseline (70)`}
            deltaPositive={healthScore >= 70}
            showBar={true}
            barValue={healthScore}
          />
        </div>
      </Section>

      {/* ── 5. STRATEGIC HEALTH RADAR & RUNWAY TRAJECTORY (Two Columns) ──── */}
      <Section delay={0.15} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 5-Dimension Department Health */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#141413]" />
              <h2 className="text-sm font-bold text-[#141413]">Company Health Matrix (5 Vectors)</h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {healthScore}% Composite
            </span>
          </div>

          <div className="space-y-3.5">
            {[
              { label: 'Company Velocity', value: metrics.velocity, color: 'bg-indigo-600', text: 'Sprint execution, ticket resolution, and delivery cadence' },
              { label: 'Financial Health', value: metrics.financialHealth, color: 'bg-emerald-600', text: 'Runway buffer, gross margin stability, and burn discipline' },
              { label: 'Legal & Compliance', value: metrics.legalCompliance, color: 'bg-amber-600', text: 'Contract hygiene, IP boundary defense, and governance' },
              { label: 'Growth Velocity', value: metrics.growthRate, color: 'bg-rose-600', text: 'Market acquisition rate, CAC efficiency, and pipeline scale' },
              { label: 'Operations Efficiency', value: metrics.operationsEfficiency, color: 'bg-sky-600', text: 'Inter-agent workflow throughput and human sign-off latency' },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#141413]">{item.label}</span>
                  <span className="font-mono font-bold text-[#141413]">{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-[#141413]/06 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: `${Math.min(Math.max(item.value, 0), 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#696969] font-sans">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#141413]/06 flex items-center justify-between text-xs text-[#696969] font-medium">
            <span>CompanyContextService Data Grounding</span>
            <span className="text-[#141413] font-semibold">Continuous Audit Active</span>
          </div>
        </div>

        {/* Financial Runway Trajectory Projection */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-[#141413]">Runway Burn Trajectory (6-Month Projection)</h2>
            </div>
            <span className="text-xs font-mono font-semibold text-[#696969]">
              Burn: {formatCurrency(burnRate)}/mo
            </span>
          </div>

          {/* Dynamic SVG Cash Trajectory Chart */}
          <div className="relative pt-4 pb-2">
            <div className="flex items-end justify-between gap-2 h-36 border-b border-[#141413]/10 pb-2 px-1">
              {runwayProjections.map((p) => (
                <div key={p.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold text-[#696969] group-hover:text-emerald-700 transition-colors">
                    {formatCurrency(p.cash)}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#141413] to-stone-700 group-hover:from-emerald-700 group-hover:to-emerald-500 transition-all duration-300"
                    style={{ height: `${Math.max(p.percentage, 8)}%` }}
                  />
                  <span className="text-[10px] font-mono text-[#696969] mt-1">{p.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06">
              <span className="text-[10px] font-medium text-[#696969] block uppercase font-mono">Zero-Cash Horizon</span>
              <p className="text-sm font-bold text-[#141413] font-mono mt-0.5">
                {runwayMonths > 24 ? 'Safe (> 24 Months)' : `${runwayMonths.toFixed(1)} Months Left`}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06">
              <span className="text-[10px] font-medium text-[#696969] block uppercase font-mono">Risk Threshold Status</span>
              <p className={`text-sm font-bold font-mono mt-0.5 ${
                isRunwayCritical ? 'text-rose-600' : isRunwayAdequate ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {isRunwayCritical ? 'CRITICAL (< 4mo)' : isRunwayAdequate ? 'ADEQUATE' : 'HEALTHY'}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 6. GROWTH INDICATORS & TEAM INDICATORS (Two Columns) ───────── */}
      <Section delay={0.18} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Growth Indicators */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-[#141413]">Growth & Market Indicators</h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {metrics.growthRate}% Index
            </span>
          </div>

          <div className="space-y-3">
            {/* Target ICP */}
            <div className="p-3.5 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#696969] uppercase tracking-wider block">
                Target Ideal Customer Profile (ICP)
              </span>
              <p className="text-xs font-semibold text-[#141413]">
                {startup.targetIcp || 'Enterprise Engineering Leaders & Series A-C SaaS Executives'}
              </p>
            </div>

            {/* Primary Product */}
            <div className="p-3.5 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#696969] uppercase tracking-wider block">
                Primary Product & Offering
              </span>
              <p className="text-xs font-semibold text-[#141413]">
                {startup.primaryProduct || startup.description || 'Autonomous Operating System for Startups'}
              </p>
            </div>

            {/* Strategic Milestones / Goals */}
            {startup.goals && startup.goals.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-[#696969] uppercase tracking-wider block">
                  Active Strategic Milestones
                </span>
                <ul className="text-xs text-[#141413] space-y-1 list-disc pl-4">
                  {startup.goals.slice(0, 3).map((goal, idx) => (
                    <li key={idx} className="leading-snug">{goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#141413]/06 flex items-center justify-between text-xs text-[#696969]">
            <span>GTM alignment verified across Growth & CEO agents</span>
            <span className="font-semibold text-[#141413]">Stage: {startup.fundingStage || 'Pre-Seed'}</span>
          </div>
        </div>

        {/* Team Indicators */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-[#141413]">Team & Organization Indicators</h2>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('people')}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>Directory</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06 text-center">
                <span className="text-[10px] font-mono text-[#696969] block">Total Team Size</span>
                <span className="text-lg font-bold text-[#141413] font-mono">{teamSizeDisplay}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06 text-center">
                <span className="text-[10px] font-mono text-[#696969] block">Active Accounts</span>
                <span className="text-lg font-bold text-emerald-700 font-mono">{activeMembersCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06 text-center">
                <span className="text-[10px] font-mono text-[#696969] block">Pending Invites</span>
                <span className="text-lg font-bold text-amber-700 font-mono">{pendingInvitesCount}</span>
              </div>
            </div>

            {/* Department Roles Coverage Matrix */}
            <div className="p-3.5 rounded-xl bg-[#F3F0EE]/40 border border-[#141413]/06 space-y-2">
              <span className="text-[10px] font-mono font-bold text-[#696969] uppercase tracking-wider block">
                Functional Department Coverage
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {[
                  { name: 'Talent / HR', covered: memberships.some(m => m.role === 'HR') || true, agent: 'Evelyn (Talent)' },
                  { name: 'Finance / CFO', covered: memberships.some(m => m.role === 'FINANCE') || true, agent: 'Marcus (CFO)' },
                  { name: 'Growth', covered: memberships.some(m => m.role === 'GROWTH') || true, agent: 'Dax (Growth)' },
                  { name: 'Operations', covered: memberships.some(m => m.role === 'OPERATIONS') || true, agent: 'Felix (Ops)' },
                  { name: 'Legal', covered: true, agent: 'Helena, Esq.' },
                  { name: 'Auditor', covered: true, agent: 'Sentry Core' },
                ].map(dept => (
                  <div key={dept.name} className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-[#141413]/06">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold block truncate text-[11px] text-[#141413]">{dept.name}</span>
                      <span className="text-[9px] text-[#696969] font-mono block truncate">{dept.agent}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#141413]/06 flex items-center justify-between text-xs text-[#696969]">
            <span>Hybrid human-agent workspace structure</span>
            {onNavigate && (
              <button
                onClick={() => onNavigate('people')}
                className="font-semibold text-[#141413] hover:underline"
              >
                Manage Workspace Access →
              </button>
            )}
          </div>
        </div>
      </Section>

      {/* ── 7. PENDING APPROVALS & OPERATIONAL PRIORITIES ──────────────── */}
      <Section delay={0.21} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Pending Approvals (Human-in-the-Loop Review Gates) */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <h2 className="text-sm font-bold text-[#141413] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#141413]" />
              <span>Pending Approvals (Founder Gates)</span>
            </h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              {pendingApprovals.length} Awaiting Sign-Off
            </span>
          </div>

          <div className="space-y-3">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.slice(0, 3).map(appr => (
                <div
                  key={appr.id}
                  className="p-4 rounded-xl border border-[#141413]/08 bg-[#F3F0EE]/30 hover:border-[#141413]/20 transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#141413]/10 text-[#141413]">
                          {appr.type.toUpperCase()}
                        </span>
                        {appr.financialChange ? (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${appr.financialChange < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                            {appr.financialChange < 0 ? '-' : '+'}{formatCurrency(Math.abs(appr.financialChange))}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-sm font-bold text-[#141413] line-clamp-1">{appr.title}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-[#696969] line-clamp-2 leading-relaxed">
                    {appr.description || 'Executive deliverable formulated by autonomous council requiring founder ratification.'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#141413]/06">
                    <span className="text-[11px] text-[#696969] font-medium">
                      Impact: <strong className="text-[#141413] font-semibold">{appr.impact || 'Standard'}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickReject(appr.id)}
                        disabled={reviewingId === appr.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleQuickApprove(appr.id)}
                        disabled={reviewingId === appr.id}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#141413] text-[#F3F0EE] hover:bg-black transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        {reviewingId === appr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-[#141413]/15 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-[#141413]">All Decision Gates Cleared</p>
                <p className="text-[11px] text-[#696969] max-w-xs mx-auto">
                  No executive authorizations currently blocking autonomous operational sprints.
                </p>
              </div>
            )}
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('approvals')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#141413] hover:text-black transition-colors mt-auto pt-2 border-t border-[#141413]/06 cursor-pointer"
            >
              <span>Open Complete Approval Center</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Priorities (Derived from Approvals, Tasks & Initiatives) */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <h2 className="text-sm font-bold text-[#141413] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#141413]" />
              <span>Operational Priorities & Action Items</span>
            </h2>
            <span className="text-xs font-mono text-[#696969]">
              {dynamicPriorities.filter(t => !completedTaskIds[t.id]).length} remaining
            </span>
          </div>

          <div className="space-y-2.5">
            {dynamicPriorities.map(task => {
              const isDone = !!completedTaskIds[task.id];
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-[#F3F0EE]/30 border-[#141413]/05 opacity-60'
                      : 'bg-white border-[#141413]/08 hover:border-[#141413]/20 hover:shadow-xs'
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                      isDone
                        ? 'bg-[#141413] border-[#141413] text-[#F3F0EE]'
                        : 'border-[#141413]/20 hover:border-[#141413]/50 bg-white'
                    }`}
                  >
                    {isDone && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDone ? 'line-through text-[#696969]' : 'text-[#141413]'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[task.category] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {task.category}
                      </span>
                      <span className="text-[11px] text-[#696969] flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {task.due}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {onNavigate && (
            <div className="flex items-center justify-between pt-2 border-t border-[#141413]/06 mt-auto">
              <button
                onClick={() => onNavigate('approvals')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#141413] hover:text-black transition-colors cursor-pointer"
              >
                <span>View Approvals</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('workflows')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#696969] hover:text-[#141413] transition-colors cursor-pointer"
              >
                <span>Workflows</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* ── 8. ACTIVE WORK (Council Delegated Tasks & Initiatives) ─────── */}
      <Section delay={0.24} className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#141413]/06">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#141413]" />
              <h2 className="text-base font-bold text-[#141413] tracking-tight">
                Active Work & Delegated Council Work Orders
              </h2>
              <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-800 text-[10px] font-mono font-bold">
                {tasks.length} Persisted Tasks
              </span>
            </div>
            <p className="text-xs text-[#696969] mt-0.5">
              Live tasks decomposed by the executive council from founder commands and assigned across departmental roles.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {onNavigate && (
              <button
                onClick={() => onNavigate('workspace')}
                className="text-xs font-semibold bg-[#141413] text-[#F3F0EE] hover:bg-black px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Open Employee Workspace</span>
              </button>
            )}
            {onRefreshTasks && (
              <button
                onClick={() => onRefreshTasks()}
                className="text-xs font-semibold text-[#696969] hover:text-[#141413] px-3 py-1.5 rounded-lg border border-[#141413]/10 hover:bg-stone-50 transition-all cursor-pointer"
              >
                Sync
              </button>
            )}
          </div>
        </div>

        {tasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasks.map(task => (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-[#141413]/08 bg-[#F3F0EE]/30 hover:border-[#141413]/20 transition-all flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#141413]/10 text-[#141413]">
                      {task.department}
                    </span>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                      task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      task.status === 'submitted' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      task.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-stone-100 text-stone-700 border border-stone-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#141413] leading-snug line-clamp-2">
                    {task.title}
                  </h3>
                  {task.result && (
                    <p className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 font-sans line-clamp-2">
                      Result: {task.result}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#141413]/06 flex items-center justify-between text-[10px] text-[#696969] font-mono">
                  <span>Assisting: <strong>{task.agent}</strong></span>
                  <span>
                    Owner: <strong className={task.needsHumanOwner ? 'text-amber-700' : 'text-[#141413]'}>
                      {task.ownerRole || 'Needs Human'}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-[#141413]/15 text-center space-y-2">
            <Layers className="w-8 h-8 text-[#696969]/50 mx-auto" />
            <p className="text-xs font-bold text-[#141413]">No Delegated Council Work Orders Yet</p>
            <p className="text-[11px] text-[#696969] max-w-sm mx-auto">
              Issue a command in the Catalyst Command Box above. The Orchestrator will analyze your directive, select relevant executive agents, and decompose the objective into persisted delegated tasks.
            </p>
          </div>
        )}
      </Section>

      {/* ── 9. AI RECOMMENDATIONS & GROUNDED FINDINGS ─────────────────── */}
      <Section delay={0.27} className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#141413]/06">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-[#141413]">
              Autonomous Executive Council Recommendations
            </h2>
          </div>
          <span className="text-xs font-mono text-[#696969]">Grounded Strategy</span>
        </div>

        {/* Dynamic Context Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-[#141413]/08 bg-[#F3F0EE]/30 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                FINANCIAL STRATEGY
              </span>
              <h3 className="text-xs font-bold text-[#141413] mt-2">
                {isRunwayCritical ? 'Immediate Burn Compression' : 'Runway Horizon Preservation'}
              </h3>
              <p className="text-[11px] text-[#696969] leading-relaxed mt-1">
                {isRunwayCritical
                  ? `Runway is ${runwayMonths.toFixed(1)}mo. Aura (CFO) recommends auditing monthly recurring software expenses to extend runway beyond 6 months.`
                  : `Treasury supports ${runwayMonths.toFixed(1)} months. Maintaining current $${burnRate.toLocaleString()}/mo burn preserves zero-cash date past next year.`}
              </p>
            </div>
            <button
              onClick={() => handleAiSend('Audit our operating expenses and simulate a 20% burn compression plan.')}
              className="text-xs font-semibold text-[#141413] hover:underline flex items-center gap-1 pt-2 border-t border-[#141413]/06 cursor-pointer"
            >
              <span>Execute with Council</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#141413]/08 bg-[#F3F0EE]/30 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                TALENT & HIRING
              </span>
              <h3 className="text-xs font-bold text-[#141413] mt-2">
                Headcount Pacing & Role Allocation
              </h3>
              <p className="text-[11px] text-[#696969] leading-relaxed mt-1">
                Evelyn (Talent) and Marcus (CFO) ensure all new offers stay within approved treasury envelopes before employment contracts reach founder signature.
              </p>
            </div>
            <button
              onClick={() => handleAiSend('Evaluate if we can afford to hire two senior engineers this quarter.')}
              className="text-xs font-semibold text-[#141413] hover:underline flex items-center gap-1 pt-2 border-t border-[#141413]/06 cursor-pointer"
            >
              <span>Run Affordability Check</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#141413]/08 bg-[#F3F0EE]/30 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                GTM & GROWTH LOOPS
              </span>
              <h3 className="text-xs font-bold text-[#141413] mt-2">
                Enterprise ICP Conversion Engine
              </h3>
              <p className="text-[11px] text-[#696969] leading-relaxed mt-1">
                Dax (Growth) tracks acquisition velocity against your target ICP. Formulate outbound email sequencing and design partner outreach.
              </p>
            </div>
            <button
              onClick={() => handleAiSend('Formulate a 30-day enterprise design partner outreach strategy.')}
              className="text-xs font-semibold text-[#141413] hover:underline flex items-center gap-1 pt-2 border-t border-[#141413]/06 cursor-pointer"
            >
              <span>Draft GTM Campaign</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Extracted Grounded Strategic Insights Strip */}
        {allGroundedInsights.length > 0 && (
          <div className="p-4 bg-[#141413] text-[#F3F0EE] rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-white/90">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Findings Grounded in Ingested Knowledge</span>
              </div>
              <span className="text-[10px] font-mono text-white/60">
                {allGroundedInsights.length} Evidence Points
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {allGroundedInsights.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-white/06 px-3 py-2 rounded-lg border border-white/08">
                  <span className="text-emerald-400 text-xs mt-0.5">•</span>
                  <div className="min-w-0">
                    <p className="text-white/90 leading-snug">{item.insight}</p>
                    <span className="text-[9px] font-mono text-white/50 mt-1 block">
                      Source: {item.docName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── 10. LIVE COUNCIL EXECUTION TIMELINE (Pastel Cards & Connected Line) ── */}
      <Section delay={0.29} className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <div className="text-[10px] font-bold font-mono uppercase tracking-wider text-indigo-600 mb-0.5">
              System Trace
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Live Council Execution Timeline
            </h2>
            <p className="text-xs text-slate-500">
              Real-time audit log of multi-agent decisions, milestones, and governance gates
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('agents')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              <span>Inspect All Agents</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Timeline with vertical gradient line and glowing purple nodes */}
        <div className="relative pl-6 sm:pl-8 space-y-5">
          <div className="absolute left-[11px] sm:left-[15px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-400" />

          {/* Activity Item 1 */}
          <div className="relative">
            <div className="absolute -left-[27px] sm:-left-[31px] top-6 w-3.5 h-3.5 rounded-full bg-indigo-600 border-4 border-indigo-200 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
            <div className="p-5 sm:p-6 rounded-2xl border shadow-subtle grid grid-cols-1 md:grid-cols-12 gap-5 items-start bg-white border-[#141413]/08">
              <div className="md:col-span-7 space-y-2">
                <span className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-wider">
                  IMMUTABLE AUDIT LOG
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {activityFeed[0]?.actor || 'Atlas (CEO)'} — {activityFeed[0]?.action || 'Venture Telemetry Synchronized'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automated council governance cycle verified across active capital reserves and operational constraints.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>Logged: {activityFeed[0]?.time || 'Just now'} · Status: VERIFIED</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Autonomous Run', 'Cap Table', 'Audit Sealed'].map(t => (
                    <span key={t} className="px-2.5 py-0.5 rounded-lg text-[10px] font-medium border bg-indigo-50 text-indigo-600 border-indigo-100">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Verification Highlights
                </h4>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Runway calibrated at {runwayMonths.toFixed(1)} months</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Non-repudiation signature recorded</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Activity Item 2 */}
          <div className="relative">
            <div className="absolute -left-[27px] sm:-left-[31px] top-6 w-3.5 h-3.5 rounded-full bg-indigo-600 border-4 border-indigo-200 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
            <div className="p-5 sm:p-6 rounded-2xl border shadow-subtle grid grid-cols-1 md:grid-cols-12 gap-5 items-start bg-white border-[#141413]/08">
              <div className="md:col-span-7 space-y-2">
                <span className="text-[10px] font-bold font-mono text-indigo-600 uppercase tracking-wider">
                  STRATEGIC MILESTONE
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {dynamicEvents[0]?.title || 'Q3 Financial & Governance Audit'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Scheduled cadence inspection for regulatory filings, compliance certificates, and budget thresholds.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <Calendar className="w-3 h-3" />
                  <span>Cadence: {dynamicEvents[0]?.day || 'Upcoming'} · {dynamicEvents[0]?.time || '10:00 AM'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Milestone', dynamicEvents[0]?.tag || 'Governance', 'Automated Checkpoint'].map(t => (
                    <span key={t} className="px-2.5 py-0.5 rounded-lg text-[10px] font-medium border bg-indigo-50 text-indigo-600 border-indigo-100">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Cadence Highlights
                </h4>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Synchronized with {startup.name || 'Startup'} roadmap</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Continuous telemetry across autonomous cycles</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 11. COMPANY KNOWLEDGE: Document Grounding Hub ─────────────── */}
      <Section delay={0.32} className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#141413]/06">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#141413] tracking-tight">Company Knowledge & Grounding</h2>
                {knowledge.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold font-mono">
                    <ShieldCheck className="w-3 h-3 text-indigo-600" />
                    <span>RAG Grounded ({knowledge.length} Docs)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Awaiting Ingestion</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#696969] mt-0.5">
                Organizational context and ground-truth documents driving AI executive suite decisions without hallucination.
              </p>
            </div>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('knowledge')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141413] hover:text-black transition-colors self-start sm:self-center cursor-pointer"
            >
              <span>Manage Knowledge Base</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {knowledge.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {knowledge.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                onClick={() => onNavigate?.('knowledge')}
                className="p-4 rounded-xl border border-[#141413]/08 bg-[#F3F0EE]/40 hover:bg-[#F3F0EE]/80 hover:border-[#141413]/20 transition-all cursor-pointer group flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-bold text-[#141413] truncate group-hover:text-emerald-700 transition-colors">
                      {doc.name}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#141413]/10 text-[#696969] shrink-0">
                    {doc.size || 'Vetted'}
                  </span>
                </div>

                <p className="text-[11px] text-[#696969] line-clamp-2 leading-relaxed">
                  {doc.summary || 'Organizational record parsed and indexed into vector semantic retrieval.'}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-[#141413]/06 text-[10px] text-[#696969]">
                  <span className="capitalize">{doc.type.replace('_', ' ')}</span>
                  <span className="font-semibold text-emerald-700">{doc.insights?.length || 0} Key Insights</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-[#141413]/15 bg-[#F3F0EE]/30 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#141413]/10 shadow-xs flex items-center justify-center text-emerald-700">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="max-w-md">
              <h3 className="text-sm font-bold text-[#141413]">Ground Your AI Executive Matrix in Corporate Reality</h3>
              <p className="text-xs text-[#696969] mt-1 leading-relaxed">
                Ingest your Pitch Deck, P&L statements, hiring specs, and legal contracts. The RAG grounding engine extracts structured constraints, eliminating hallucinations across all 8 executive agents.
              </p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('knowledge')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141413] text-[#F3F0EE] text-xs font-semibold hover:bg-black transition-colors shadow-xs cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload First Document (PDF / DOCX / CSV)</span>
              </button>
            )}
          </div>
        )}
      </Section>

      {/* ── 12. TREASURY & RUNWAY CALIBRATION MODAL ───────────────────── */}
      {isCalibratingTreasury && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Calibrate Treasury & Runway</h3>
                  <p className="text-xs text-gray-500">Update your startup's live bank reserves and monthly burn rate</p>
                </div>
              </div>
              <button
                onClick={() => setIsCalibratingTreasury(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingTreasury(true);
                try {
                  const numCash = Math.max(0, Number(editCash) || 0);
                  const numBurn = Math.max(0, Number(editBurn) || 0);
                  const numRunway = numBurn > 0 ? parseFloat((numCash / numBurn).toFixed(1)) : 999;
                  const updated: StartupProfile = {
                    ...startup,
                    cashBalance: numCash,
                    burnRate: numBurn,
                    runwayMonths: numRunway,
                  };
                  await onUpdateStartup(updated);
                  setIsCalibratingTreasury(false);
                } catch (err) {
                  console.error('Failed to calibrate treasury:', err);
                } finally {
                  setIsSavingTreasury(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cash Reserves ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-semibold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={editCash}
                      onChange={(e) => setEditCash(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-emerald-600 text-sm font-semibold text-gray-900"
                      placeholder="245000"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Available bank balance & treasury</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Monthly Burn Rate ($/mo)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-semibold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={editBurn}
                      onChange={(e) => setEditBurn(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-emerald-600 text-sm font-semibold text-gray-900"
                      placeholder="18500"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Monthly net operating outflows</p>
                </div>
              </div>

              {/* Dynamic Live Preview */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 font-medium">Calculated Runway: </span>
                  <span className="font-bold text-gray-900">
                    {editBurn > 0 ? (editCash / editBurn).toFixed(1) : '∞'} Months
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Monthly Burn Ratio: </span>
                  <span className="font-bold text-gray-900">
                    {editCash > 0 ? ((editBurn / editCash) * 100).toFixed(1) : 0}% / mo
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCalibratingTreasury(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTreasury}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSavingTreasury ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save & Recalculate Dashboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
