/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord } from './types';
import MetricCards from './components/MetricCards';
import SaaSDashboard from './components/SaaSDashboard';
import AgentWorkspace from './components/AgentWorkspace';
import WorkflowCanvas from './components/WorkflowCanvas';
import ApprovalQueue from './components/ApprovalQueue';
import KnowledgeBase from './components/KnowledgeBase';
import DecisionLog from './components/DecisionLog';
import GodmodeTest from './components/GodmodeTest';
import IntegrationsHub from './components/IntegrationsHub';
import NotificationPanel from './components/NotificationPanel';
import { 
  Rocket, 
  Terminal, 
  Settings, 
  HelpCircle, 
  CheckSquare, 
  FileText, 
  Clipboard, 
  TrendingUp, 
  Activity,
  Menu,
  X,
  Sparkles,
  RefreshCw,
  Search,
  Shield,
  LogOut,
  Bell,
  Puzzle
} from 'lucide-react';
import CommandPalette from './components/CommandPalette';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import CatalystLogo from './components/CatalystLogo';

export default function App() {
  const { user, loading, logout, apiFetch } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'workflows' | 'approvals' | 'knowledge' | 'ledger' | 'godmode' | 'integrations'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Keyboard shortcut listener for CMD/CTRL+K
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

  // Core domain state
  const [startup, setStartup] = useState<StartupProfile | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [approvals, setApprovals] = useState<Deliverable[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeFile[]>([]);

  // Toast status bar
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // State hydration on mount
  const hydrateState = async () => {
    if (!user) return;
    try {
      const [startupRes, agentsRes, initiativesRes, approvalsRes, decisionsRes, knowledgeRes] = await Promise.all([
        apiFetch('/api/startup'),
        apiFetch('/api/agents'),
        apiFetch('/api/initiatives'),
        apiFetch('/api/approvals'),
        apiFetch('/api/decisions'),
        apiFetch('/api/knowledge'),
      ]);

      if (startupRes.ok) setStartup(await startupRes.json());
      if (agentsRes.ok) setAgents(await agentsRes.json());
      if (initiativesRes.ok) setInitiatives(await initiativesRes.json());
      if (approvalsRes.ok) setApprovals(await approvalsRes.json());
      if (decisionsRes.ok) setDecisions(await decisionsRes.json());
      if (knowledgeRes.ok) setKnowledge(await knowledgeRes.json());
    } catch (err) {
      console.error('Error hydrating applet state:', err);
      showToast('Connection to server established. Utilizing sandbox database.', 'info');
    }
  };

  useEffect(() => {
    hydrateState();
  }, [user]);

  // Update handlers
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
        showToast('Startup configuration saved successfully to virtual DB.', 'success');
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
        
        // Refresh approvals and ledger from server
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
        
        // Refresh decision log
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

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-400">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#6366F1] animate-spin mx-auto" />
          <p className="text-xs font-mono">Verifying Active Platform Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!startup) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-400">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#6366F1] animate-spin mx-auto" />
          <p className="text-xs font-mono">Initializing FounderOS Executive Council...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#09090b] text-[#f4f4f5] overflow-hidden font-sans">
      
      {/* Sidebar: Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#27272A] bg-[#09090b] p-6 shrink-0 justify-between">
        <div className="space-y-8">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#18181b] border border-zinc-700 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <CatalystLogo className="w-5 h-5 text-orange-500" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">Catalyst OS</span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 ml-2">Core Engine</div>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeTab === 'dashboard' 
                  ? 'bg-[#18181B] border-[#27272A] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/50 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-[#6366F1]" />
                SaaS Dashboard
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-400">{startup.healthScore}%</span>
            </button>

            <button
              onClick={() => setActiveTab('workflows')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeTab === 'workflows' 
                  ? 'bg-[#18181B] border-[#27272A] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/50 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-[#6366F1]" />
                Strategic Sprints
              </span>
              {initiatives.filter(i => i.status === 'active').length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono font-semibold animate-pulse">
                  ACTIVE
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeTab === 'approvals' 
                  ? 'bg-[#18181B] border-[#27272A] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/50 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-[#6366F1]" />
                Approval Queue
              </span>
              {approvals.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[8px] bg-rose-500/15 text-rose-400 border border-rose-500/20 font-mono font-bold">
                  {approvals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeTab === 'agents' 
                  ? 'bg-[#18181B] border-[#27272A] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/50 border-transparent'
              }`}
            >
              <Settings className="w-4 h-4 text-[#6366F1]" />
              Agent Configurator
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeTab === 'knowledge' 
                  ? 'bg-[#18181B] border-[#27272A] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/50 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#6366F1]" />
                Knowledge Base
              </span>
              <span className="text-[10px] font-mono text-zinc-500">{knowledge.length} files</span>
            </button>

            <button
              onClick={() => setActiveTab('integrations')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeTab === 'integrations' 
                  ? 'bg-[#18181B] border-[#27272A] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/50 border-transparent'
              }`}
            >
              <Puzzle className="w-4 h-4 text-[#6366F1]" />
              Integrations Hub
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeTab === 'ledger' 
                  ? 'bg-[#18181B] border-[#27272A] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/50 border-transparent'
              }`}
            >
              <Clipboard className="w-4 h-4 text-[#6366F1]" />
              Governance Ledger
            </button>

            <button
              onClick={() => setActiveTab('godmode')}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                activeTab === 'godmode' 
                  ? 'bg-[#18181B] border-[#27272A] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-[#18181B]/50 border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Rocket className="w-4 h-4 text-indigo-500" />
                G0DM0D3 API Test
              </span>
            </button>
            
          </nav>
        </div>

        {/* Sleek Health Score Widget */}
        <div className="p-4 border-t border-[#27272A] space-y-4">
          <div className="bg-[#111827] rounded-xl p-3.5 border border-[#27272A]">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
              <span>Health Score</span>
              <span className="text-[9px] text-[#6366F1] font-mono font-normal">Dual Core</span>
            </div>
            <div className="text-2xl font-bold text-[#22C55E] font-mono">{startup.healthScore}%</div>
            <div className="h-1.5 w-full bg-gray-800 rounded-full mt-2 overflow-hidden">
              <div className="bg-[#22C55E] h-full transition-all duration-500" style={{ width: `${startup.healthScore}%` }}></div>
            </div>
          </div>

          {/* Logged in User Profile Card */}
          <div className="bg-[#09090b]/50 rounded-xl p-3 border border-[#27272A] flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-900/50 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 uppercase font-mono">
                {user?.name?.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-100 truncate">{user?.name}</div>
                <div className="text-[10px] text-zinc-500 truncate capitalize flex items-center gap-1 font-mono">
                  <Shield className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                  <span>{user?.role}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { logout(); }}
              title="Sign Out Session"
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-[#1f1f23] text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#27272A] bg-[#09090b] px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-[#18181B] border border-[#27272A] text-zinc-300 hover:text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-semibold text-white">Catalyst OS</span>
            <span className="text-gray-700">/</span>
            <span className="text-gray-300 font-medium capitalize">{activeTab.replace('ledger', 'Governance Ledger').replace('approvals', 'Approval Queue').replace('workflows', 'Strategic Sprints').replace('knowledge', 'Knowledge Base').replace('agents', 'Agent Configurator')} Workspace</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Command Search bar */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827]/40 border border-[#27272A] text-zinc-400 hover:text-zinc-200 hover:bg-[#111827] text-xs transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span>Search console...</span>
              <kbd className="text-[9px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">⌘K</kbd>
            </button>

            {/* Tech Stack Status Badges */}
            <div className="hidden xl:flex items-center gap-1.5 text-[9px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold" title="PostgreSQL + pgvector active">
                PostgreSQL/pgvector
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold" title="FastAPI LangGraph multi-agent engine active">
                FastAPI/LangGraph
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold" title="Model Context Protocol tools enabled">
                MCP Tools
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold" title="HashiCorp Vault secret manager">
                Vault
              </span>
            </div>

            {/* Dynamic mini cash balance widget */}
            <div className="px-3.5 py-1.5 rounded-lg bg-[#111827] border border-[#27272A] flex items-center gap-2 text-xs">
              <span className="text-[10px] uppercase font-semibold text-gray-400 font-mono">Treasury:</span>
              <span className="font-mono text-[#22C55E] font-bold">
                ${startup.cashBalance.toLocaleString()}
              </span>
            </div>
            
            {/* Interactive User Info Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-zinc-900/60 border border-zinc-800 rounded-lg">
              <div className="w-5 h-5 rounded-md bg-indigo-950 border border-indigo-900 flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase font-mono">
                {user?.name?.slice(0, 2)}
              </div>
              <span className="text-xs text-zinc-300 font-medium">{user?.name}</span>
              <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-indigo-400 border border-zinc-800">
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Interactive View Panel Scroll container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* Active View Router */}
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
            />
          )}
          
          {activeTab === 'agents' && (
            <AgentWorkspace 
              agents={agents} 
              startup={startup} 
              onUpdateStartup={handleUpdateStartup} 
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

          {activeTab === 'ledger' && (
            <DecisionLog 
              decisions={decisions} 
            />
          )}

          {activeTab === 'godmode' && (
            <GodmodeTest />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsHub />
          )}

        </main>

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />

      {/* Floating Custom Toast Alerts */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-xl flex items-center gap-3.5 min-w-[300px] animate-slide-in ${
          toast.type === 'success' ? 'bg-zinc-950 border-emerald-950 text-emerald-400' :
          toast.type === 'error' ? 'bg-zinc-950 border-rose-950 text-rose-400' :
          'bg-zinc-950 border-zinc-800 text-zinc-300'
        }`}>
          <Sparkles className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold leading-normal">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Global Command Console */}
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

      {/* Sidebar: Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden" id="mobile-menu-overlay">
          <div className="w-64 bg-zinc-950 border-r border-zinc-900 h-full p-6 flex flex-col justify-between" id="mobile-menu-drawer">
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CatalystLogo className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-bold text-white">Catalyst OS</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded bg-zinc-900 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1.5 pt-4">
                <button
                  onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
                >
                  Dashboard <span className="text-emerald-400 font-mono">{startup.healthScore}%</span>
                </button>
                <button
                  onClick={() => { setActiveTab('workflows'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
                >
                  Strategic Sprints
                </button>
                <button
                  onClick={() => { setActiveTab('approvals'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
                >
                  Approval Queue <span className="text-rose-400 font-mono font-bold">{approvals.length}</span>
                </button>
                <button
                  onClick={() => { setActiveTab('agents'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
                >
                  Agent Configurator
                </button>
                <button
                  onClick={() => { setActiveTab('knowledge'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
                >
                  Knowledge Base
                </button>
                <button
                  onClick={() => { setActiveTab('ledger'); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-900"
                >
                  Governance Ledger
                </button>
              </nav>

            </div>

            <div className="pt-6 border-t border-zinc-900 text-center text-[10px] text-zinc-500 font-mono uppercase">
              Dual Core AI Council
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
