import React, { useState, useRef, useEffect } from 'react';
import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord } from '../types';
import {
  TrendingUp, TrendingDown, Clock, ArrowRight, Calendar,
  Mic, MicOff, Send, Sparkles, CheckSquare, Activity,
  Wallet, Hourglass, Flame, ChevronRight, Users, Scale,
  LineChart, Briefcase, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import MarkdownRenderer from './chatbot/MarkdownRenderer';

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

// ── Utility ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatINR(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toLocaleString()}`;
}

// ── Static demo data ──────────────────────────────────────────────────────────
const STATIC_TASKS = [
  { id: 't1', title: 'Review hiring recommendation', category: 'Hiring', due: 'Today', completed: false },
  { id: 't2', title: 'Approve July growth budget', category: 'Growth', due: 'Today', completed: false },
  { id: 't3', title: 'Send investor update', category: 'Investment', due: 'Tomorrow', completed: false },
  { id: 't4', title: 'Review contractor agreement', category: 'Legal', due: 'Tomorrow', completed: false },
];

const STATIC_EVENTS = [
  { id: 'e1', title: 'Investor Call', day: 'Monday', time: '11:00 AM', icon: '📊' },
  { id: 'e2', title: 'Product Demo', day: 'Wednesday', time: '3:00 PM', icon: '🚀' },
  { id: 'e3', title: 'Board Meeting', day: 'Friday', time: '10:00 AM', icon: '📋' },
];

const CATEGORY_COLOR: Record<string, string> = {
  Hiring: 'bg-blue-50 text-blue-600 border-blue-100',
  Growth: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Investment: 'bg-gray-50 text-gray-900 border-gray-200',
  Legal: 'bg-amber-50 text-amber-600 border-amber-100',
  Finance: 'bg-rose-50 text-rose-600 border-rose-100',
  Operations: 'bg-sky-50 text-sky-600 border-sky-100',
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
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  showBar?: boolean;
  barValue?: number;
  accentColor: string;
}

function KpiCard({ icon, label, value, delta, deltaPositive, showBar, barValue, accentColor }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        <span className={`flex items-center gap-1 text-xs font-semibold ${deltaPositive ? 'text-emerald-600' : 'text-orange-500'}`}>
          {deltaPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {delta}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
      </div>
      {showBar && barValue !== undefined && (
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gray-500 transition-all duration-700"
            style={{ width: `${Math.min(barValue, 100)}%` }}
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
}: SaaSDashboardProps) {
  const { user, apiFetch } = useAuth();
  const { sendMessage, messages, isTyping } = useChat(apiFetch, user?.id);

  // Tasks state (merge static + approvals)
  const [tasks, setTasks] = useState(STATIC_TASKS);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // AI Assistant state (inline, light version that also opens full chat)
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

  // Recent activity from decisions
  const recentActivity = decisions.slice(0, 4).map(d => ({
    id: d.id,
    actor: AGENT_ROLE_LABEL[d.category] ?? d.category,
    action: d.title,
    time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    positive: d.status === 'approved',
  }));

  // Fallback static activity if no decisions
  const activityFeed = recentActivity.length > 0 ? recentActivity : [
    { id: 'a1', actor: 'Finance', action: 'Updated runway forecast', time: '10:32 AM', positive: true },
    { id: 'a2', actor: 'Growth', action: 'Completed GTM strategy', time: '9:45 AM', positive: true },
    { id: 'a3', actor: 'Legal', action: 'Prepared NDA draft', time: '9:10 AM', positive: true },
    { id: 'a4', actor: 'Investment', action: 'Drafted investor update', time: '8:30 AM', positive: true },
  ];

  // KPI derived values
  const runwayMonths = startup.runwayMonths ?? 13.2;
  const burnRate = startup.burnRate ?? 185000;
  const revenue = startup.cashBalance ? Math.round(startup.cashBalance * 0.013) : 245000;
  const healthScore = startup.healthScore ?? 78;

  const firstName = user?.name?.split(' ')[0] ?? 'Founder';

  return (
    <div className="space-y-6 pb-8">

      {/* ── Welcome Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here's your company snapshot.</p>
        </div>
        <button
          onClick={() => document.getElementById('dashboard-sections')?.scrollIntoView({ behavior: 'smooth' })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors shadow-sm shadow-gray-200 w-fit"
        >
          View Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Hourglass className="w-4 h-4 text-gray-900" />}
          accentColor="bg-gray-50"
          label="Runway"
          value={`${runwayMonths.toFixed(1)} Months`}
          delta="1.8 months vs last update"
          deltaPositive={true}
        />
        <KpiCard
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          accentColor="bg-orange-50"
          label="Monthly Burn"
          value={formatINR(burnRate)}
          delta="5% from last month"
          deltaPositive={false}
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          accentColor="bg-emerald-50"
          label="Revenue"
          value={formatINR(revenue)}
          delta="12% this month"
          deltaPositive={true}
        />
        <KpiCard
          icon={<Activity className="w-4 h-4 text-gray-900" />}
          accentColor="bg-gray-50"
          label="Health Score"
          value={`${healthScore} / 100`}
          delta={`${healthScore >= 70 ? '+' : ''}${(healthScore - 70).toFixed(0)} vs baseline`}
          deltaPositive={healthScore >= 70}
          showBar={true}
          barValue={healthScore}
        />
      </div>

      {/* ── AI Assistant ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm shadow-gray-200">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Ask Catalyst</h2>
              <p className="text-xs text-gray-400">Your AI co-founder, always ready</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-gray-400 font-medium">Online</span>
            </div>
          </div>
        </div>

        {/* Conversation preview — last AI reply if any */}
        {messages.length > 0 && (
          <div className="px-6 py-4 max-h-[500px] overflow-y-auto space-y-3 border-b border-gray-50">
            {messages.slice(-3).map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-gray-900" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gray-900 text-white rounded-tr-sm'
                    : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
                }`}>
                  <MarkdownRenderer content={msg.content} />
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-gray-900" />
                </div>
                <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-gray-50 border border-gray-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="p-4">
          {aiPermissionError && (
            <div className="mb-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 flex justify-between items-center">
              <span>{aiPermissionError}</span>
              <button onClick={() => setAiPermissionError(null)} className="text-rose-400 hover:text-rose-600 font-semibold ml-2">✕</button>
            </div>
          )}

          <div className="flex items-end gap-2 p-2 bg-gray-50 border border-gray-100 rounded-2xl focus-within:border-gray-200 focus-within:bg-white transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              value={aiInput}
              onChange={e => setAiInput(e.target.value.slice(0, 2000))}
              onKeyDown={handleAiKeyDown}
              placeholder={isRecording ? 'Listening... speak now' : 'Ask Catalyst anything...'}
              disabled={aiSending}
              rows={1}
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none resize-none max-h-24 leading-relaxed"
            />

            {/* Mic button */}
            <button
              type="button"
              onClick={toggleRecording}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
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
                  ? 'bg-gray-900 text-white hover:bg-black shadow-sm shadow-gray-200'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] text-gray-400 mt-2 px-1 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>

        {/* Quick prompts */}
        <div className="px-4 pb-5 flex flex-wrap gap-2">
          {[
            "What's my runway looking like?",
            "Summarize this week's activity",
            'Draft an investor update',
            'Review our hiring plan',
          ].map(prompt => (
            <button
              key={prompt}
              onClick={() => setAiInput(prompt)}
              className="text-xs text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-50 border border-gray-100 hover:border-gray-200 px-3 py-1.5 rounded-full transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Today's Priorities + Recent Activity ───────────────────────── */}
      <div id="dashboard-sections" className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Priorities */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-gray-700" />
              Today's Priorities
            </h2>
            <span className="text-xs text-gray-400 font-medium">
              {tasks.filter(t => !t.completed).length} remaining
            </span>
          </div>

          <div className="space-y-2.5">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  task.completed
                    ? 'bg-gray-50 border-gray-100 opacity-60'
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                    task.completed
                      ? 'bg-gray-500 border-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  {task.completed && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[task.category] ?? 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                      {task.category}
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.due}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 hover:text-black transition-colors mt-auto">
            View all tasks
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gray-700" />
              Recent Activity
            </h2>
            <span className="text-xs text-gray-400 font-medium">Today</span>
          </div>

          <div className="space-y-1">
            {activityFeed.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${CATEGORY_COLOR[item.actor] ?? 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                  {item.actor.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 font-medium truncate">
                    <span className="text-gray-900 font-semibold">{item.actor}</span>{' '}
                    {item.action}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0 font-medium">{item.time}</span>
              </div>
            ))}
          </div>

          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 hover:text-black transition-colors mt-auto">
            View all activity
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Upcoming Events ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-700" />
            Upcoming Events
          </h2>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 hover:text-black transition-colors">
            View Calendar
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATIC_EVENTS.map(event => (
            <div
              key={event.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-xl shrink-0">
                {event.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{event.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">{event.day} · {event.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>



    </div>
  );
}
