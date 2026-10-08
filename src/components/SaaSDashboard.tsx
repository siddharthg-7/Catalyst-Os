import React, { useState, useRef, useEffect, useMemo } from 'react';
import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord } from '../types';
import {
  TrendingUp, TrendingDown, Clock, ArrowRight, Calendar,
  Mic, MicOff, Send, Sparkles, CheckSquare, Activity,
  Wallet, Hourglass, Flame, ChevronRight, Users, Scale,
  LineChart, Briefcase, Check, ShieldCheck, AlertCircle,
  FileText, ExternalLink, Calculator, Layers, Loader2,
  BookOpen, UploadCloud, Database, Target, Zap, BarChart3,
  Shield, CheckCircle2, ChevronDown, Settings2, Edit3, X, SlidersHorizontal
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
  onReviewItem: (id: string, action: 'approve' | 'reject', feedback?: string) => Promise<void>;
  onUploadDoc: (name: string, content: string, type: string) => Promise<void>;
  onLaunchInitiative: (title: string, description: string, category: 'funding' | 'hiring' | 'growth' | 'operations' | 'legal') => Promise<void>;
  onSimulateInitiative: (id: string) => Promise<void>;
  onUpdateStartup: (updated: StartupProfile) => void;
  onNavigate?: (tab: 'dashboard' | 'approvals' | 'knowledge' | 'agents' | 'workflows') => void;
}

// ── Utility ──────────────────────────────────────────────────────────────────
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

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function SaaSDashboard({
  startup,
  agents,
  initiatives,
  approvals,
  decisions,
  knowledge,
  onLaunchInitiative,
  onUpdateStartup,
  onNavigate,
}: SaaSDashboardProps) {
  const { user, apiFetch } = useAuth();
  const { sendMessage, messages, isTyping } = useChat(apiFetch, user?.id);

  // Treasury Calibration State
  const [isCalibratingTreasury, setIsCalibratingTreasury] = useState(false);
  const [editCash, setEditCash] = useState<number>(startup.cashBalance || 50000);
  const [editBurn, setEditBurn] = useState<number>(startup.burnRate || 8000);
  const [isSavingTreasury, setIsSavingTreasury] = useState(false);

  useEffect(() => {
    if (startup.cashBalance !== undefined) setEditCash(startup.cashBalance);
    if (startup.burnRate !== undefined) setEditBurn(startup.burnRate);
  }, [startup.cashBalance, startup.burnRate]);

  // 1. Dynamic Priorities Engine (replaces hardcoded STATIC_TASKS)
  const dynamicPriorities = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      category: string;
      due: string;
      impact?: string;
      completed: boolean;
      actionType?: 'approval' | 'workflow' | 'knowledge';
      targetId?: string;
    }> = [];

    // Prioritize pending Human-in-the-Loop approvals
    approvals
      .filter(a => a.status === 'pending_review')
      .slice(0, 3)
      .forEach(a => {
        list.push({
          id: `appr_${a.id}`,
          title: `Founder Review: ${a.title}`,
          category: 'Approval',
          due: 'Action Required',
          impact: a.impact,
          completed: false,
          actionType: 'approval',
          targetId: a.id,
        });
      });

    // Active workflow tasks from initiatives
    initiatives
      .filter(i => i.status === 'active' || i.status === 'pending')
      .forEach(i => {
        const pendingTask = i.tasks?.find(t => t.status !== 'completed');
        if (pendingTask && list.length < 5) {
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

    // Knowledge Base recommendations
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

    if (startup.burnRate <= 0) {
      list.push({
        id: 'rec_burn_config',
        title: 'Calibrate Monthly Operating Burn with Aura (CFO)',
        category: 'Finance',
        due: 'Recommended',
        completed: false,
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
  }, [approvals, initiatives, knowledge, startup]);

  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  const toggleTask = (id: string) => {
    setCompletedTaskIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 2. Dynamic Milestones & Events (replaces hardcoded STATIC_EVENTS)
  const dynamicEvents = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      day: string;
      time: string;
      icon: string;
      tag: string;
    }> = [];

    // Next Runway Review Checkpoint
    const checkpointDate = new Date();
    checkpointDate.setDate(checkpointDate.getDate() + 14);
    events.push({
      id: 'ev_runway',
      title: 'Runway & Treasury Health Audit',
      day: checkpointDate.toLocaleDateString('en-US', { weekday: 'long' }),
      time: '10:00 AM',
      icon: '📊',
      tag: `${(startup.runwayMonths || 12).toFixed(1)}m Buffer`,
    });

    // Active initiative milestone or strategy sync
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

    // Knowledge & Governance Milestone
    events.push({
      id: 'ev_audit',
      title: knowledge.length > 0 ? 'Knowledge Ingestion & Audit Sync' : 'Knowledge Base Ingestion Check',
      day: 'Friday',
      time: '11:00 AM',
      icon: '📋',
      tag: knowledge.length > 0 ? `${knowledge.length} Docs Grounded` : 'Action Required',
    });

    return events;
  }, [startup.runwayMonths, initiatives, knowledge]);

  // AI Assistant state
  const [aiInput, setAiInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [aiPermissionError, setAiPermissionError] = useState<string | null>(null);
  const [aiSending, setAiSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [aiInput]);

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiSending) return;
    const msg = aiInput.trim();
    setAiInput('');
    setAiSending(true);
    try {
      await sendMessage(msg);
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

  // Recent activity dynamically from decisions or active agents
  const recentActivity = decisions.slice(0, 4).map(d => ({
    id: d.id,
    actor: AGENT_ROLE_LABEL[d.category] ?? d.category,
    action: d.title,
    time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    positive: d.status === 'approved',
  }));

  const activeAgentActivities = agents
    .filter(a => a.status !== 'idle' && a.currentTask)
    .map(a => ({
      id: `act_${a.id}`,
      actor: a.name.split(' ')[0],
      action: a.currentTask || 'Analyzing company data',
      time: 'Live',
      positive: true,
    }));

  const activityFeed = recentActivity.length > 0
    ? recentActivity
    : (activeAgentActivities.length > 0 ? activeAgentActivities : [
        { id: 'a1', actor: 'Atlas (CEO)', action: 'Initialized autonomous executive matrix', time: 'Active', positive: true },
        { id: 'a2', actor: 'Aura (CFO)', action: 'Monitoring treasury balances & burn rate', time: 'Active', positive: true },
        { id: 'a3', actor: 'Sentry (Auditor)', action: 'Enforcing deterministic mathematical bounds', time: 'Active', positive: true },
      ]);

  // Derived KPI & Health Metrics from live startup state
  const cashBalance = startup.cashBalance ?? 245000;
  const burnRate = startup.burnRate ?? 18500;
  const runwayMonths = startup.runwayMonths > 0 ? startup.runwayMonths : (burnRate > 0 ? cashBalance / burnRate : 12);
  const healthScore = startup.healthScore ?? 78;

  // 5-Dimension Department Analytics
  const metrics = {
    velocity: startup.metrics?.velocity ?? 78,
    financialHealth: startup.metrics?.financialHealth ?? 85,
    legalCompliance: startup.metrics?.legalCompliance ?? 92,
    growthRate: startup.metrics?.growthRate ?? 65,
    operationsEfficiency: startup.metrics?.operationsEfficiency ?? 80,
  };

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

  const pendingApprovals = useMemo(() => {
    return approvals.filter(a => a.status === 'pending_review');
  }, [approvals]);

  const firstName = user?.name?.split(' ')[0] ?? 'Founder';

  return (
    <div className="space-y-6 pb-8">

      {/* ── Welcome Header ─────────────────────────────────────────────── */}
      <Section delay={0.05} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-900 text-white uppercase tracking-wider">
              {startup.fundingStage || 'Pre-Seed'}
            </span>
            <span className="text-xs font-medium text-gray-500 font-sans">
              {startup.industry || 'Technology'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Operating view for <span className="font-semibold text-gray-800">{startup.name || 'Your Startup'}</span> · Autonomous Executive Suite Active
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigate && (
            <button
              onClick={() => onNavigate('knowledge')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#141413]/10 text-[#141413] text-xs font-semibold hover:border-[#141413]/25 hover:bg-stone-50 transition-all shadow-subtle interactive-btn"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#696969]" />
              <span>Ingest Document</span>
            </button>
          )}
          <button
            onClick={() => document.getElementById('dashboard-sections')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#141413] text-[#F3F0EE] text-xs font-semibold hover:bg-black transition-all shadow-sm interactive-btn magnetic-btn"
          >
            <span>Overview</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Section>

      {/* ── Core Financial & Health KPI Matrix ─────────────────────────── */}
      <Section delay={0.1} className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#696969] uppercase tracking-wider font-mono text-[10px]">Treasury & Runway Horizon</span>
            <span className="text-[10px] text-[#696969]/60 font-mono">Dynamic Telemetry</span>
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
            <span>Calibrate Financials</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={<Wallet className="w-4 h-4 text-emerald-700" />}
            accentColor="bg-emerald-50"
            label="Cash Reserves"
            value={formatCurrency(cashBalance)}
            delta={`${burnRate > 0 ? `${((burnRate / cashBalance) * 100).toFixed(1)}% burn/mo` : 'Active Treasury'}`}
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
            delta={`${runwayMonths > 12 ? 'Healthy Burn' : runwayMonths > 6 ? 'Moderate Burn' : 'High Burn Alert'}`}
            deltaPositive={runwayMonths > 12}
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
            delta={runwayMonths >= 12 ? 'Zero-Cash > 1 Year' : `Est. ${runwayMonths.toFixed(0)}m remaining`}
            deltaPositive={runwayMonths >= 12}
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

      {/* ── TREASURY & RUNWAY CALIBRATION MODAL ───────────────────────── */}
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

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 text-xs leading-relaxed space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Why was it initially $50K and $8K?</span>
              </div>
              <p className="text-amber-800">
                During onboarding, Catalyst OS assigns standard pre-seed defaults ($50,000 cash, $8,000/mo burn) for new idea workspaces. You can adjust them here to match your exact bank balance and monthly expenses.
              </p>
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
                      placeholder="50000"
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
                      placeholder="8000"
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

      {/* ── 3. CATALYST INTELLIGENCE: Executive Suite Assistant & Synthesis ── */}
      <Section delay={0.15} className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#141413]/06">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#141413] flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#F3F0EE]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#141413]">Ask Catalyst Executive Suite</h2>
              <p className="text-xs text-[#696969]">Autonomous co-founder grounded in company records and financial bounds</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-mono font-bold">
                <Database className="w-2.5 h-2.5 text-indigo-600" />
                <span>Grounded ({knowledge.length} Docs)</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-[#696969] font-medium font-mono">Live</span>
            </div>
          </div>
        </div>

        {/* Extracted Grounded Strategic Insights Strip */}
        {allGroundedInsights.length > 0 && (
          <div className="px-6 py-3 bg-[#141413] text-[#F3F0EE] border-b border-[#141413]/10 space-y-2">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-white/90">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Executive Findings Grounded in Ingested Data</span>
              </div>
              <span className="text-[10px] font-mono text-white/60">
                {allGroundedInsights.length} Verified Evidence Points
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

        {/* Conversation preview — last AI reply if any */}
        {messages.length > 0 && (
          <div className="px-6 py-4 max-h-[460px] overflow-y-auto space-y-4 border-b border-[#141413]/06">
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
                    : 'bg-[#F3F0EE]/60 text-[#141413] border border-[#141413]/08 rounded-tl-sm shadow-xs'
                }`}>
                  {/* Provider Unavailable Alert Banner */}
                  {msg.role === 'assistant' && msg.status === 'provider_unavailable' && (
                    <div className="mb-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium flex items-center gap-1.5 font-mono">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>AI Provider Unavailable (Operating in Deterministic Fallback Mode)</span>
                    </div>
                  )}

                  {/* Dynamic Executive Agent Strip */}
                  {msg.role === 'assistant' && msg.activeAgents && msg.activeAgents.some(a => a.status !== 'idle') && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5 pb-2 border-b border-[#141413]/10">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#696969] mr-1">
                        Executive Matrix:
                      </span>
                      {msg.activeAgents.filter(a => a.status !== 'idle').map(ag => (
                        <span
                          key={ag.role}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#141413]/10 text-[#141413] text-[10px] font-medium font-mono"
                          title={ag.contribution || `${ag.role}: ${ag.status}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ag.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                          <span>{ag.role}</span>
                          {ag.status === 'completed' && <Check className="w-3 h-3 text-emerald-600 inline" />}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* LAYER 1: SUPPORTING DATA CARD */}
                  {msg.role === 'assistant' && ((msg.supportingData && msg.supportingData.length > 0) || (msg.calculations && msg.calculations.length > 0)) && (
                    <div className="mb-3 p-3 rounded-xl bg-white border border-[#141413]/10 shadow-xs">
                      <div className="text-[10px] font-mono font-bold text-[#141413] uppercase tracking-wider flex items-center justify-between border-b border-[#141413]/06 pb-1.5 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                          <span>SUPPORTING DATA</span>
                        </div>
                        <span className="text-[9px] text-[#696969] font-mono">VERIFIED AUDIT EVIDENCE</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {(msg.supportingData && msg.supportingData.length > 0 ? msg.supportingData : (msg.calculations || []).map(c => ({ label: c.metric, value: String(c.value), source: c.source }))).map((sd, idx) => (
                          <div key={idx} className="text-xs bg-[#F3F0EE]/40 px-2.5 py-1.5 rounded-lg border border-[#141413]/06 flex justify-between items-center gap-2">
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

                  {/* LAYER 2: EXECUTIVE AI SYNTHESIS */}
                  <div className="space-y-1">
                    <MarkdownRenderer content={msg.content} />
                  </div>

                  {/* Document Citations & Sources */}
                  {msg.role === 'assistant' && ((msg.citations && msg.citations.length > 0) || (msg.evidence && msg.evidence.length > 0)) && (
                    <div className="mt-3 pt-2.5 border-t border-[#141413]/08 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="font-bold text-[#141413] font-mono flex items-center gap-1">
                        <FileText className="w-3 h-3 text-[#696969]" />
                        Grounded In:
                      </span>
                      {(msg.citations && msg.citations.length > 0 ? msg.citations.map(c => ({ citationId: c.id, documentName: c.title })) : (msg.evidence || [])).map((ev, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-[#141413]/10 text-[#141413] font-mono shadow-xs">
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
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#F3F0EE]/60 border border-[#141413]/08 shadow-xs space-y-1.5 max-w-[85%]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#141413]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#141413]" />
                    <span>Atlas (CEO Orchestrator) Synthesizing Executive Directives...</span>
                  </div>
                  <p className="text-[11px] text-[#696969] font-sans">
                    Grounding strategy against verified startup documents, treasury bounds, and auditor compliance.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="p-4">
          {aiPermissionError && (
            <div className="mb-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex justify-between items-center">
              <span>{aiPermissionError}</span>
              <button onClick={() => setAiPermissionError(null)} className="text-rose-500 hover:text-rose-700 font-semibold ml-2">✕</button>
            </div>
          )}

          <div className="flex items-end gap-2 p-2.5 bg-[#F3F0EE]/40 border border-[#141413]/10 rounded-2xl focus-within:border-[#141413]/30 focus-within:bg-white transition-all shadow-xs">
            <textarea
              ref={textareaRef}
              value={aiInput}
              onChange={e => setAiInput(e.target.value.slice(0, 2000))}
              onKeyDown={handleAiKeyDown}
              placeholder={isRecording ? 'Listening... speak now' : 'Ask Catalyst anything about your startup...'}
              disabled={aiSending}
              rows={1}
              className="flex-1 bg-transparent px-2.5 py-1.5 text-sm text-[#141413] placeholder:text-[#696969]/60 focus:outline-none resize-none max-h-24 leading-relaxed font-sans"
            />

            {/* Mic button */}
            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
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
              onClick={handleAiSend}
              disabled={!aiInput.trim() || aiSending}
              className={`p-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                aiInput.trim() && !aiSending
                  ? 'bg-[#141413] text-[#F3F0EE] hover:bg-black shadow-xs'
                  : 'bg-[#141413]/10 text-[#696969]/40 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] text-[#696969] mt-2 px-1 text-center font-mono">
            Press Enter to send · Shift+Enter for new line · Direct multi-agent multimodal pipeline
          </p>
        </div>

        {/* Grounded Quick prompts */}
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {[
            "What is our projected cash runway at current burn?",
            "Summarize verified findings from our knowledge documents",
            "Prepare an investor update based on our financial model",
            "What approvals are currently pending my review?",
          ].map(prompt => (
            <button
              key={prompt}
              onClick={() => setAiInput(prompt)}
              className="text-xs text-[#696969] hover:text-[#141413] bg-[#F3F0EE]/60 hover:bg-white border border-[#141413]/08 hover:border-[#141413]/20 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </Section>

      {/* ── 4. CURRENT PRIORITIES & DECISIONS REQUIRING ATTENTION ──────── */}
      <Section delay={0.2} id="dashboard-sections" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Dynamic Priorities (Derived from Approvals & Initiatives) */}
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
                      {task.actionType === 'approval' && onNavigate && (
                        <button
                          onClick={() => onNavigate('approvals')}
                          className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
                        >
                          <span>Review Gate</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {task.actionType === 'knowledge' && onNavigate && (
                        <button
                          onClick={() => onNavigate('knowledge')}
                          className="text-[10px] text-emerald-700 font-semibold hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
                        >
                          <span>Upload File</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
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
                <span>View Approval Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate('workflows')}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#696969] hover:text-[#141413] transition-colors cursor-pointer"
              >
                <span>Active Workflows</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Decisions Requiring Attention (Human-in-the-Loop Review Gates) */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <h2 className="text-sm font-bold text-[#141413] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#141413]" />
              <span>Decisions Requiring Attention</span>
            </h2>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              {pendingApprovals.length} Pending Gates
            </span>
          </div>

          <div className="space-y-3">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.slice(0, 3).map(appr => (
                <div
                  key={appr.id}
                  className="p-4 rounded-xl border border-[#141413]/08 bg-[#F3F0EE]/30 hover:bg-[#F3F0EE]/60 hover:border-[#141413]/20 transition-all flex flex-col gap-2.5"
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
                      By: <strong className="text-[#141413] font-semibold">{appr.submittedBy || 'Executive Council'}</strong>
                    </span>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('approvals')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#141413] hover:text-black hover:underline cursor-pointer"
                      >
                        <span>Review Gate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
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
      </Section>

      {/* ── 5. ACTIVE WORK: 5-Dimension Department Health & Runway Projection ─── */}
      <Section delay={0.25} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* 5-Dimension Department Health Radar */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#141413]" />
              <h2 className="text-sm font-bold text-[#141413]">Strategic Department Health Matrix</h2>
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
            <span>Aggregated across 5 operational vectors</span>
            <span className="text-[#141413] font-semibold">Continuous Audit Active</span>
          </div>
        </div>

        {/* Financial Runway & Burn Trajectory Projection */}
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
              <span className="text-[10px] font-medium text-[#696969] block uppercase font-mono">Capital Efficiency</span>
              <p className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                {burnRate > 0 && cashBalance > 0 ? `${((cashBalance / burnRate) >= 12 ? 'Optimal' : 'Needs Optimization')}` : 'Calibrated'}
              </p>
            </div>
          </div>
        </div>

      </Section>

      {/* ── 6. RECENT INTELLIGENCE & STRATEGIC MILESTONES ──────────────── */}
      <Section delay={0.3} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* Recent Activity & Corporate Governance Log */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <h2 className="text-sm font-bold text-[#141413] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#141413]" />
              <span>Corporate Governance & Audit Log</span>
            </h2>
            <span className="text-xs text-[#696969] font-mono">Immutable</span>
          </div>

          <div className="space-y-1.5">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F3F0EE]/50 transition-colors group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${CATEGORY_COLOR[item.actor] ?? 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                  {item.actor.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#141413] font-medium truncate">
                    <span className="font-semibold">{item.actor}</span>{' '}
                    <span className="text-[#696969]">{item.action}</span>
                  </p>
                </div>
                <span className="text-[11px] text-[#696969] shrink-0 font-mono">{item.time}</span>
              </div>
            ))}
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('agents')}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#141413] hover:text-black transition-colors mt-auto pt-2 border-t border-[#141413]/06 cursor-pointer"
            >
              <span>Inspect All Executive Agents</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Upcoming Strategic Milestones (Reference 2 Inspiration) */}
        <div className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#141413]/06">
            <h2 className="text-sm font-bold text-[#141413] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#141413]" />
              <span>Strategic Milestones & Audit Checkpoints</span>
            </h2>
            <span className="text-xs font-mono text-[#696969]">Cadence</span>
          </div>

          <div className="space-y-3">
            {dynamicEvents.map(event => (
              <div
                key={event.id}
                className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[#141413]/08 bg-[#F3F0EE]/30 hover:border-[#141413]/20 hover:bg-[#F3F0EE]/60 transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-[#141413]/10 shadow-xs flex items-center justify-center text-xl shrink-0">
                  {event.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#141413] truncate">{event.title}</p>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <p className="text-xs text-[#696969] font-medium">{event.day} · {event.time}</p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#141413]/10 text-[#141413]">
                      {event.tag}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#141413]/06 flex items-center justify-between text-xs text-[#696969]">
            <span>Continuous tracking across autonomous cycles</span>
            <span className="font-semibold text-[#141413]">Sync Active</span>
          </div>
        </div>

      </Section>

      {/* ── 7. COMPANY KNOWLEDGE: Document Grounding Hub ──────────────── */}
      <Section delay={0.35} className="bg-white rounded-2xl border border-[#141413]/08 shadow-sm p-6 space-y-5">
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

        {/* Knowledge Documents Overview & Ingestion State */}
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

    </div>
  );
}
