/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord } from './types';
import SaaSDashboard from './components/SaaSDashboard';
import AgentWorkspace from './components/AgentWorkspace';
import WorkflowCanvas from './components/WorkflowCanvas';
import ApprovalQueue from './components/ApprovalQueue';
import KnowledgeBase from './components/KnowledgeBase';
import { 
  Bell,
  CheckSquare, 
  FileText, 
  Activity,
  Menu,
  X,
  Sparkles,
  RefreshCw,
  Search,
  Shield,
  LogOut,
  ChevronDown,
  Users
} from 'lucide-react';
import CommandPalette from './components/CommandPalette';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import CatalystLogo from './components/CatalystLogo';
import CatalystOsChatbot from './components/chatbot/CatalystOsChatbot';
import NotificationPanel from './components/NotificationPanel';

export default function App() {
  const { user, loading, logout, apiFetch, loginAsDemo } = useAuth();
  
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      localStorage.removeItem('catalystos_onboarding_completed_usr_founder_demo');
      localStorage.removeItem('catalystos_onboarding_context_usr_founder_demo');
      loginAsDemo();
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (user) {
      apiFetch('/api/startup')
        .then(res => res.json())
        .then(data => {
          if (data && data.onboarded && data.name) {
            setOnboardingCompleted(true);
            setStartup(data);
          } else {
            localStorage.removeItem(`catalystos_onboarding_completed_${user.id}`);
            setOnboardingCompleted(false);
          }
        })
        .catch(() => {
          localStorage.removeItem(`catalystos_onboarding_completed_${user.id}`);
          setOnboardingCompleted(false);
        });
    } else {
      setOnboardingCompleted(false);
    }
  }, [user]);

  const handleOnboardingComplete = async (onboardingData: any) => {
    try {
      const res = await apiFetch('/api/startup/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingData)
      });
      if (res.ok) {
        const result = await res.json();
        if (result.startup) {
          setStartup(result.startup);
        }
      }
    } catch (err) {
      console.error('[Onboarding] Error submitting onboarding data:', err);
    }
    if (user?.id) {
      localStorage.setItem(`catalystos_onboarding_completed_${user.id}`, 'true');
    }
    setOnboardingCompleted(true);
    await hydrateState();
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'knowledge' | 'agents' | 'workflows'>('dashboard');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('ceo');
  const [agentsExpanded, setAgentsExpanded] = useState<boolean>(true);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const DEFAULT_STARTUP_PROFILE: StartupProfile = {
    name: 'CatalystOS Startup',
    industry: 'B2B SaaS / Developer Tools',
    description: 'Enterprise-grade automated workflow orchestration platform for hybrid cloud environments.',
    fundingStage: 'Pre-Seed',
    cashBalance: 245000,
    burnRate: 18500,
    runwayMonths: 13.2,
    healthScore: 78,
    metrics: {
      velocity: 65,
      financialHealth: 72,
      legalCompliance: 80,
      growthRate: 45,
      operationsEfficiency: 70,
    },
  };

  const DEFAULT_AGENTS: Agent[] = [
    {
      id: 'ceo',
      name: 'Sophia Vance (Atlas)',
      role: 'CEO',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      description: 'Autonomous corporate strategist. Formulates broad roadmaps and coordinates specialist executives.',
      status: 'idle',
      keyMetric: 'Company Velocity',
      metricValue: '78%',
      color: 'indigo',
    },
    {
      id: 'finance',
      name: 'Marcus Sterling (Aura)',
      role: 'Finance',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      description: 'Automated Chief Financial Officer. Optimizes unit economics, burn rates, and deterministic runways.',
      status: 'idle',
      keyMetric: 'Financial Health',
      metricValue: '85%',
      color: 'emerald',
    },
    {
      id: 'talent',
      name: 'Evelyn Brooks (Echo)',
      role: 'Talent',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      description: 'AI Recruiting and HR Executive. Strategizes resource allocation and compensation structures.',
      status: 'idle',
      keyMetric: 'Hiring Speed',
      metricValue: '28 days',
      color: 'pink',
    },
    {
      id: 'growth',
      name: 'Dax Ramirez (Vector)',
      role: 'Growth',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      description: 'Autonomous Marketing and Acquisition Officer. Focuses on customer acquisition and GTM loops.',
      status: 'idle',
      keyMetric: 'Growth Index',
      metricValue: '82%',
      color: 'amber',
    },
    {
      id: 'legal',
      name: 'Helena Vance, Esq. (Nexus)',
      role: 'Legal',
      avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150',
      description: 'Automated General Counsel. Drafts contracts, assesses IP protection, and reviews compliance.',
      status: 'idle',
      keyMetric: 'Compliance Index',
      metricValue: '92%',
      color: 'rose',
    },
    {
      id: 'operations',
      name: 'Felix Torres (Helix)',
      role: 'Operations',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      description: 'Chief Operating Officer. Orchestrates milestone deliveries, sprint cadences, and systems reliability.',
      status: 'idle',
      keyMetric: 'Ops Efficiency',
      metricValue: '88%',
      color: 'sky',
    },
    {
      id: 'investment',
      name: 'Sarah Chen (Apex)',
      role: 'Investment',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      description: 'Investor Relations & Capital Executive. Formulates cap table simulations and fundraising models.',
      status: 'idle',
      keyMetric: 'Capital Readiness',
      metricValue: 'Pre-Seed',
      color: 'purple',
    },
    {
      id: 'auditor',
      name: 'Sentry Core (Auditor)',
      role: 'Auditor',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      description: 'Governance & Verification Officer. Audits calculations, checks evidence grounding, and enforces gates.',
      status: 'idle',
      keyMetric: 'Verification Pass',
      metricValue: '100%',
      color: 'blue',
    },
  ];

  const [startup, setStartup] = useState<StartupProfile | null>(DEFAULT_STARTUP_PROFILE);
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [approvals, setApprovals] = useState<Deliverable[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeFile[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const hydrateState = async () => {
    if (!user) return;
    try {
      const results = await Promise.allSettled([
        apiFetch('/api/startup'),
        apiFetch('/api/agents'),
        apiFetch('/api/initiatives'),
        apiFetch('/api/approvals'),
        apiFetch('/api/decisions'),
        apiFetch('/api/knowledge'),
      ]);

      const [startupRes, agentsRes, initiativesRes, approvalsRes, decisionsRes, knowledgeRes] = results;

      if (startupRes.status === 'fulfilled' && startupRes.value.ok) setStartup(await startupRes.value.json());
      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) setAgents(await agentsRes.value.json());
      if (initiativesRes.status === 'fulfilled' && initiativesRes.value.ok) setInitiatives(await initiativesRes.value.json());
      if (approvalsRes.status === 'fulfilled' && approvalsRes.value.ok) setApprovals(await approvalsRes.value.json());
      if (decisionsRes.status === 'fulfilled' && decisionsRes.value.ok) setDecisions(await decisionsRes.value.json());
      if (knowledgeRes.status === 'fulfilled' && knowledgeRes.value.ok) setKnowledge(await knowledgeRes.value.json());
    } catch (err) {
      console.error('Error hydrating applet state:', err);
    }
  };

  useEffect(() => {
    hydrateState();
  }, [user]);

  const handleUpdateStartup = async (updated: StartupProfile) => {
    if (user?.role === 'Executive') {
      showToast('Unauthorized: Executive accounts cannot update startup parameters. Please login as Founder.', 'error');
      return;
    }
    try {
      const res = await apiFetch('/api/startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        const data = await res.json();
        setStartup(data);
        showToast('Startup configuration & AI analysis updated successfully.', 'success');
        const knowRes = await apiFetch('/api/knowledge');
        if (knowRes.ok) setKnowledge(await knowRes.json());
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to save startup configuration.', 'error');
      }
    } catch (err) {
      showToast('Error syncing profile with server.', 'error');
    }
  };

  const handleLaunchInitiative = async (title: string, description: string, category: 'funding' | 'hiring' | 'growth' | 'operations' | 'legal') => {
    try {
      const res = await apiFetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category }),
      });

      if (res.ok) {
        const newInit = await res.json();
        setInitiatives(prev => [newInit, ...prev]);
        showToast(`Strategic Initiative "${title}" successfully launched.`, 'success');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to deploy initiative.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to deploy initiative.', 'error');
    }
  };

  const handleSimulateInitiative = async (id: string) => {
    try {
      const res = await apiFetch(`/api/initiatives/${id}/simulate`, {
        method: 'POST',
      });

      if (res.ok) {
        const updatedInit = await res.json();
        setInitiatives(prev => prev.map(i => i.id === id ? updatedInit : i));
        
        const [apprRes, decRes, startRes] = await Promise.all([
          apiFetch('/api/approvals'),
          apiFetch('/api/decisions'),
          apiFetch('/api/startup'),
        ]);
        if (apprRes.ok) setApprovals(await apprRes.json());
        if (decRes.ok) setDecisions(await decRes.json());
        if (startRes.ok) setStartup(await startRes.json());

        showToast('Multi-agent collaboration cycle finalized. Check Approval Queue!', 'success');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to execute collaboration cycle.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error executing multi-agent simulator.', 'error');
    }
  };

  const handleReviewItem = async (id: string, action: 'approve' | 'reject', feedback?: string) => {
    if (user?.role === 'Executive') {
      showToast('Unauthorized: Executive accounts cannot review or approve deliverables. Please login as Founder.', 'error');
      return;
    }
    try {
      const res = await apiFetch(`/api/approvals/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback }),
      });

      if (res.ok) {
        const data = await res.json();
        setStartup(data.startupProfile);
        setApprovals(prev => prev.filter(item => item.id !== id));
        
        const decRes = await apiFetch('/api/decisions');
        if (decRes.ok) setDecisions(await decRes.json());

        showToast(
          action === 'approve' 
            ? 'Deliverable signed off. System metrics and ledger adjusted.' 
            : 'Deliverable rejected and sent back to executive council.', 
          action === 'approve' ? 'success' : 'info'
        );
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to review asset.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to review asset.', 'error');
    }
  };

  const handleUploadDoc = async (name: string, content: string, type: string, fileData?: string, mimeType?: string) => {
    try {
      const res = await apiFetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content, type, fileData, mimeType }),
      });

      if (res.ok) {
        const newDoc = await res.json();
        setKnowledge(prev => [newDoc, ...prev]);
        showToast(`Document "${name}" parsed and ingested into vector base.`, 'success');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to ingest file.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to ingest corporate file.', 'error');
    }
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F3F0EE]">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-white border border-[#141413]/10 flex items-center justify-center mx-auto shadow-[rgba(0,0,0,0.06)_0px_8px_24px]">
            <RefreshCw className="w-6 h-6 text-[#141413] animate-spin" />
          </div>
          <p className="text-xs font-mono text-[#696969] uppercase tracking-widest">Verifying Active Platform Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen key="landing" initialView="landing" />;
  }

  if (!onboardingCompleted) {
    return (
      <AuthScreen
        key="onboarding"
        initialView="onboarding"
        onOnboardingComplete={handleOnboardingComplete}
      />
    );
  }

  // ── Startup-loading screen ─────────────────────────────────────────────────
  if (!startup) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F3F0EE]">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-white border border-[#141413]/10 flex items-center justify-center mx-auto shadow-[rgba(0,0,0,0.06)_0px_8px_24px]">
            <RefreshCw className="w-6 h-6 text-[#141413] animate-spin" />
          </div>
          <p className="text-xs font-mono text-[#696969] uppercase tracking-widest">Initializing CatalystOS Executive Council...</p>
        </div>
      </div>
    );
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard' as const,  label: 'Dashboard',  Icon: Activity,    badge: `${startup.healthScore}%`, badgeColor: 'text-emerald-700' },
    { id: 'approvals' as const,  label: 'Approvals',  Icon: CheckSquare, badge: approvals.length > 0 ? String(approvals.length) : '', badgeColor: 'text-rose-700' },
    { id: 'knowledge' as const,  label: 'Knowledge',  Icon: FileText,    badge: `${knowledge.length} files`, badgeColor: 'text-[#696969]' },
  ];

  const tabLabel = navItems.find(n => n.id === activeTab)?.label ?? activeTab;

  return (
    <div className="flex h-screen bg-[#F3F0EE] text-[#141413] overflow-hidden font-sans">
      
      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#141413]/10 bg-white p-6 shrink-0 justify-between shadow-[rgba(0,0,0,0.04)_4px_0px_24px_0px]">
        <div className="space-y-8">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F3F0EE] border border-[#141413]/20 p-1 flex items-center justify-center">
              <CatalystLogo className="w-5 h-5 text-[#141413]" />
            </div>
            <span className="font-bold text-lg text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>CatalystOS</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">

            {navItems.map(({ id, label, Icon, badge, badgeColor }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] text-xs font-medium transition-all border font-sans cursor-pointer ${
                    isActive
                      ? 'bg-[#141413] border-[#141413] text-[#F3F0EE] shadow-sm'
                      : 'text-[#696969] hover:text-[#141413] hover:bg-[#F3F0EE] border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#F3F0EE]' : 'text-[#141413]/50'}`} />
                    {label}
                  </span>
                  {badge && (
                    <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#F3F0EE]/70' : badgeColor}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* ── Collapsible Executive Agents Navbar (Section 24 of PROMPT.MD) ── */}
            <div className="pt-4 border-t border-[#141413]/08 mt-3">
              <button
                onClick={() => setAgentsExpanded(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold text-[#696969] hover:text-[#141413] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#141413]/60" />
                  <span>Executive Agents</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${agentsExpanded ? 'rotate-180' : ''}`} />
              </button>

              {agentsExpanded && (
                <div className="mt-1 space-y-0.5">
                  {agents.map(ag => {
                    const isSelected = activeTab === 'agents' && selectedAgentId === ag.id;
                    return (
                      <button
                        key={ag.id}
                        onClick={() => {
                          setSelectedAgentId(ag.id);
                          setActiveTab('agents');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs transition-all border font-sans cursor-pointer ${
                          isSelected
                            ? 'bg-[#141413] border-[#141413] text-[#F3F0EE] font-medium shadow-2xs'
                            : 'text-[#696969] hover:text-[#141413] hover:bg-[#F3F0EE] border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ag.status !== 'idle' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                          <span className="truncate">{ag.name.split(' ')[0]}</span>
                        </span>
                        <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.2 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {ag.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#141413]/10">
          {/* User profile */}
          <div className="p-3 rounded-[12px] bg-[#F3F0EE] border border-[#141413]/10 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#141413] flex items-center justify-center text-[#F3F0EE] font-bold text-xs shrink-0 uppercase font-mono">
                {user?.name?.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#141413] truncate font-sans">{user?.name}</div>
                <div className="text-[10px] text-[#696969] truncate capitalize flex items-center gap-1 font-mono">
                  <Shield className="w-2.5 h-2.5 text-[#141413]/40 shrink-0" />
                  <span>{user?.role}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { logout(); }}
              title="Sign Out Session"
              className="p-1.5 rounded-lg bg-white hover:bg-[#141413] hover:text-[#F3F0EE] text-[#696969] transition-colors cursor-pointer shrink-0 border border-[#141413]/10"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#141413]/10 bg-white/80 backdrop-blur-sm px-6 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-sm text-[#696969]">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-[10px] bg-[#F3F0EE] border border-[#141413]/10 text-[#141413]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-bold text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>CatalystOS</span>
            <span className="text-[#141413]/20">/</span>
            <span className="text-[#696969] font-medium text-xs capitalize font-sans">{tabLabel} Workspace</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search bar */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[#F3F0EE] border border-[#141413]/10 text-[#696969] hover:text-[#141413] hover:border-[#141413]/20 text-xs transition-colors cursor-pointer font-sans"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search anything...</span>
              <kbd className="text-[9px] font-mono bg-white border border-[#141413]/10 px-1.5 py-0.5 rounded text-[#696969]">⌘K</kbd>
            </button>

            {/* Notifications bell */}
            <button 
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-[10px] bg-[#F3F0EE] border border-[#141413]/10 text-[#696969] hover:text-[#141413] hover:border-[#141413]/20 transition-colors cursor-pointer"
              title="Open Operational Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            </button>

            {/* Founder profile */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#141413]/10 rounded-[10px]">
              <div className="w-5 h-5 rounded-md bg-[#141413] flex items-center justify-center text-[10px] font-bold text-[#F3F0EE] uppercase font-mono">
                {user?.name?.slice(0, 2)}
              </div>
              <span className="text-xs text-[#141413] font-medium font-sans">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-[#F3F0EE]">
          
          {activeTab === 'dashboard' && startup && (
            <SaaSDashboard 
              startup={startup}
              agents={agents}
              initiatives={initiatives}
              approvals={approvals}
              decisions={decisions}
              knowledge={knowledge}
              onReviewItem={handleReviewItem}
              onUploadDoc={handleUploadDoc}
              onLaunchInitiative={handleLaunchInitiative}
              onSimulateInitiative={handleSimulateInitiative}
              onUpdateStartup={handleUpdateStartup}
              onNavigate={setActiveTab}
            />
          )}
          
          {activeTab === 'agents' && (
            <AgentWorkspace 
              agents={agents} 
              startup={startup} 
              decisions={decisions}
              knowledge={knowledge}
              onUpdateStartup={handleUpdateStartup} 
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
            />
          )}

          {activeTab === 'workflows' && (
            <WorkflowCanvas 
              initiatives={initiatives} 
              onLaunchInitiative={handleLaunchInitiative} 
              onSimulateInitiative={handleSimulateInitiative} 
            />
          )}

          {activeTab === 'approvals' && (
            <ApprovalQueue 
              approvals={approvals} 
              onReviewItem={handleReviewItem} 
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeBase 
              documents={knowledge} 
              onUploadDoc={handleUploadDoc} 
            />
          )}

        </main>

      {/* Toast Alerts */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-[16px] border shadow-[rgba(0,0,0,0.12)_0px_16px_32px] flex items-center gap-3.5 min-w-[300px] max-w-sm font-sans ${
          toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' :
          toast.type === 'error'   ? 'bg-white border-rose-200 text-rose-800' :
                                     'bg-white border-[#141413]/10 text-[#141413]'
        }`}>
          <Sparkles className="w-4 h-4 shrink-0 opacity-60" />
          <div className="flex-1">
            <p className="text-xs font-semibold leading-normal">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          showToast(`Switched workspace view to: ${tab.toUpperCase()}`, 'info');
        }}
        onRunAction={(actionName) => {
          if (actionName === 'simulate') {
            const firstPending = initiatives.find(i => i.status === 'pending');
            if (firstPending) {
              handleSimulateInitiative(firstPending.id);
            } else {
              showToast('No pending sprints available for simulation. Launch an initiative first!', 'error');
            }
          }
        }}
      />

      </div>

      {/* ── Mobile Drawer ────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm md:hidden" id="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-72 bg-white border-r border-[#141413]/10 h-full p-6 flex flex-col justify-between shadow-[rgba(0,0,0,0.12)_8px_0px_32px]" id="mobile-menu-drawer" onClick={e => e.stopPropagation()}>
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#F3F0EE] border border-[#141413]/20 flex items-center justify-center">
                    <CatalystLogo className="w-4 h-4 text-[#141413]" />
                  </div>
                  <span className="text-sm font-bold text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>CatalystOS</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-[#F3F0EE] border border-[#141413]/10 text-[#696969] hover:text-[#141413]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1 pt-2">
                {navItems.map(({ id, label, badge, badgeColor }) => (
                  <button
                    key={id}
                    onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] text-xs font-medium font-sans transition-all ${
                      activeTab === id
                        ? 'bg-[#141413] text-[#F3F0EE]'
                        : 'text-[#696969] hover:bg-[#F3F0EE] hover:text-[#141413]'
                    }`}
                  >
                    {label}
                    {badge && <span className={`text-[10px] font-mono font-bold ${activeTab === id ? 'text-[#F3F0EE]/70' : badgeColor}`}>{badge}</span>}
                  </button>
                ))}
              </nav>

            </div>

            <div className="pt-6 border-t border-[#141413]/10 text-center text-[10px] text-[#696969] font-mono uppercase tracking-widest">
              Dual Core AI Council
            </div>
          </div>
        </div>
      )}

      {/* Catalyst OS AI Chatbot */}
      <CatalystOsChatbot />

      {/* Real-time Operational Notifications Drawer (Section 21 of PROMPT.MD) */}
      <NotificationPanel 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
        onNavigate={setActiveTab} 
      />

    </div>
  );
}
