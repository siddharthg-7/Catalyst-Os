/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord, TeamMember, UserPermissions, CompanyInvitation, DelegatedTask } from './types';
import SaaSDashboard from './components/SaaSDashboard';
import AgentWorkspace from './components/AgentWorkspace';
import WorkflowCanvas from './components/WorkflowCanvas';
import ApprovalQueue from './components/ApprovalQueue';
import KnowledgeBase from './components/KnowledgeBase';
import DecisionLog from './components/DecisionLog';
import ScenarioSimulator from './components/ScenarioSimulator';
import PeopleDirectory from './components/PeopleDirectory';
import AcceptInvitation from './components/AcceptInvitation';
import EmployeeWorkspace from './components/EmployeeWorkspace';
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
  Users,
  TrendingUp,
  Layers,
  Database,
  Briefcase
} from 'lucide-react';
import CommandPalette from './components/CommandPalette';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import CatalystLogo from './components/CatalystLogo';
import CatalystOsChatbot from './components/chatbot/CatalystOsChatbot';
import NotificationPanel from './components/NotificationPanel';
import MouseSpotlight from './components/MouseSpotlight';
import AuroraBackground from './components/AuroraBackground';
import Footer from './components/Footer';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, logout, apiFetch, loginAsDemo } = useAuth();
  
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    try {
      const savedUserStr = localStorage.getItem('catalystos_user') || localStorage.getItem('catalystos_demo_user');
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        if (u?.id) {
          return localStorage.getItem(`catalystos_onboarding_completed_${u.id}`) === 'true';
        }
      }
    } catch {}
    return false;
  });

  const [isCheckingStartup, setIsCheckingStartup] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      loginAsDemo();
      localStorage.setItem('catalystos_onboarding_completed_usr_founder_demo', 'true');
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}
      navigate('/dashboard');
    }
  }, []);

  useEffect(() => {
    // Reset scoped collections so a previous session or other user's data never leaks
    setKnowledge([]);
    setApprovals([]);
    setDecisions([]);
    setInitiatives([]);
    setTeamMembers([]);

    if (user) {
      const isAlreadyMarked = localStorage.getItem(`catalystos_onboarding_completed_${user.id}`) === 'true';
      setOnboardingCompleted(isAlreadyMarked);
      setIsCheckingStartup(!isAlreadyMarked);

      apiFetch('/api/startup')
        .then(res => res.json())
        .then(data => {
          if (data && data.onboarded && data.name) {
            setOnboardingCompleted(true);
            setStartup(data);
            try {
              localStorage.setItem(`catalystos_onboarding_completed_${user.id}`, 'true');
              localStorage.setItem(`catalystos_startup_${user.id}`, JSON.stringify(data));
            } catch {}
          } else {
            setOnboardingCompleted(false);
            setStartup(null);
            try {
              localStorage.removeItem(`catalystos_onboarding_completed_${user.id}`);
              localStorage.removeItem(`catalystos_startup_${user.id}`);
            } catch {}
          }
        })
        .catch((err) => {
          console.warn('[App] Startup profile fetch warning:', err);
          setOnboardingCompleted(isAlreadyMarked);
        })
        .finally(() => {
          setIsCheckingStartup(false);
        });
    } else {
      setOnboardingCompleted(false);
      setIsCheckingStartup(false);
      setStartup(null);
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
          if (user?.id) {
            try {
              localStorage.setItem(`catalystos_startup_${user.id}`, JSON.stringify(result.startup));
            } catch {}
          }
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

  // ── Derive activeTab from URL pathname ───────────────────────────────────────
  const getActiveTabFromPath = (pathname: string): 'dashboard' | 'workspace' | 'approvals' | 'scenarios' | 'decisions' | 'knowledge' | 'workflows' | 'agents' | 'people' => {
    if (pathname.includes('/workspace')) return 'workspace';
    if (pathname.includes('/approvals')) return 'approvals';
    if (pathname.includes('/scenarios')) return 'scenarios';
    if (pathname.includes('/decisions')) return 'decisions';
    if (pathname.includes('/knowledge')) return 'knowledge';
    if (pathname.includes('/workflows')) return 'workflows';
    if (pathname.includes('/people')) return 'people';
    if (pathname.includes('/agents')) return 'agents';
    return 'dashboard';
  };

  const activeTab = getActiveTabFromPath(location.pathname);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('ceo');
  const [agentsExpanded, setAgentsExpanded] = useState<boolean>(true);
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Sync selected agent with URL if on /dashboard/agents/:agentId
  useEffect(() => {
    const match = location.pathname.match(/\/agents\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      setSelectedAgentId(match[1]);
    }
  }, [location.pathname]);

  const handleTabChange = (tab: 'dashboard' | 'workspace' | 'approvals' | 'scenarios' | 'decisions' | 'knowledge' | 'workflows' | 'agents' | 'people', agentId?: string) => {
    if (tab === 'agents') {
      const targetAgent = agentId || selectedAgentId || 'ceo';
      setSelectedAgentId(targetAgent);
      navigate(`/dashboard/agents/${targetAgent}`);
    } else if (tab === 'dashboard') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/${tab}`);
    }
  };

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    navigate(`/dashboard/agents/${agentId}`);
  };

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

  const [startup, setStartup] = useState<StartupProfile | null>(() => {
    try {
      const savedUserStr = localStorage.getItem('catalystos_user') || localStorage.getItem('catalystos_demo_user');
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        if (u?.id) {
          const cached = localStorage.getItem(`catalystos_startup_${u.id}`);
          if (cached) return JSON.parse(cached);
        }
      }
    } catch {}
    return DEFAULT_STARTUP_PROFILE;
  });
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [approvals, setApprovals] = useState<Deliverable[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeFile[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try {
      const savedUserStr = localStorage.getItem('catalystos_user') || localStorage.getItem('catalystos_demo_user');
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        if (u?.id) {
          const cached = localStorage.getItem(`catalystos_team_${u.id}`);
          if (cached) return JSON.parse(cached);
        }
      }
    } catch {}
    return [];
  });

  // P1 Task 8 — accounts with real access (Membership) and pending invitations.
  const [memberships, setMemberships] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);

  // Phase A3 — Council decomposed work orders and delegated tasks.
  const [tasks, setTasks] = useState<DelegatedTask[]>([]);

  // P1 Task 7 — effective permissions, mirrored from the backend.
  // Founder-equivalent defaults keep the UI usable until /api/permissions/me answers.
  const [permissions, setPermissions] = useState<UserPermissions>({
    role: 'FOUNDER',
    areas: ['dashboard', 'approvals', 'knowledge', 'workflows', 'agents', 'people', 'scenarios', 'decisions'],
    agents: ['CEO', 'Finance', 'Talent', 'Growth', 'Legal', 'Operations', 'Investment', 'Auditor'],
    actions: [
      'startup:write', 'approvals:review', 'knowledge:write',
      'people:read', 'people:write', 'people:access',
      'orchestrate:execute', 'orchestrate:request'
    ]
  });

  const hasPermission = (action: UserPermissions['actions'][number]) => permissions.actions.includes(action);

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const hydrateTasks = async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTasks(data);
      }
    } catch (err) {
      console.warn('[App] Tasks refresh warning:', err);
    }
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
        apiFetch('/api/team'),
        apiFetch('/api/permissions/me'),
        apiFetch('/api/invitations'),
        apiFetch('/api/memberships'),
        apiFetch('/api/tasks'),
      ]);

      const [startupRes, agentsRes, initiativesRes, approvalsRes, decisionsRes, knowledgeRes, teamRes, permissionsRes, invitationsRes, membershipsRes, tasksRes] = results;

      if (invitationsRes.status === 'fulfilled' && invitationsRes.value.ok) {
        const data = await invitationsRes.value.json();
        if (Array.isArray(data)) setInvitations(data);
      }
      if (membershipsRes.status === 'fulfilled' && membershipsRes.value.ok) {
        const data = await membershipsRes.value.json();
        if (Array.isArray(data)) setMemberships(data);
      }
      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const taskData = await tasksRes.value.json();
        if (Array.isArray(taskData)) setTasks(taskData);
      }

      if (permissionsRes.status === 'fulfilled' && permissionsRes.value.ok) {
        const perms = await permissionsRes.value.json();
        if (perms && Array.isArray(perms.areas) && Array.isArray(perms.actions)) setPermissions(perms);
      }

      if (startupRes.status === 'fulfilled' && startupRes.value.ok) setStartup(await startupRes.value.json());
      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) setAgents(await agentsRes.value.json());
      if (initiativesRes.status === 'fulfilled' && initiativesRes.value.ok) setInitiatives(await initiativesRes.value.json());
      if (approvalsRes.status === 'fulfilled' && approvalsRes.value.ok) setApprovals(await approvalsRes.value.json());
      if (decisionsRes.status === 'fulfilled' && decisionsRes.value.ok) setDecisions(await decisionsRes.value.json());
      if (knowledgeRes.status === 'fulfilled' && knowledgeRes.value.ok) setKnowledge(await knowledgeRes.value.json());
      if (teamRes.status === 'fulfilled' && teamRes.value.ok) {
        const teamData = await teamRes.value.json();
        if (Array.isArray(teamData)) {
          setTeamMembers(teamData);
          if (user?.id) {
            try {
              localStorage.setItem(`catalystos_team_${user.id}`, JSON.stringify(teamData));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('Error hydrating applet state:', err);
    }
  };

  const handleAddTeamMember = async (newMember: { fullName: string; email: string; role: string; department: string; status?: 'Active' | 'Invited' }) => {
    const memberName = newMember.fullName;
    try {
      const res = await apiFetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      if (res.ok) {
        const created = await res.json();
        setTeamMembers(prev => {
          const updated = [created, ...prev.filter(m => m.id !== created.id)];
          if (user?.id) {
            try {
              localStorage.setItem(`catalystos_team_${user.id}`, JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
        showToast(`Team member "${memberName}" successfully added.`, 'success');
        return;
      }
    } catch (err) {
      console.warn('[App] Team member API error, fallback to local:', err);
    }

    // Local fallback
    const fallbackMember: TeamMember = {
      id: window.crypto?.randomUUID?.() || `member_${Date.now()}`,
      fullName: newMember.fullName,
      name: newMember.fullName,
      email: newMember.email,
      role: newMember.role,
      department: newMember.department,
      status: newMember.status || 'Active',
      joinedAt: new Date().toISOString()
    };
    setTeamMembers(prev => {
      const updated = [fallbackMember, ...prev];
      if (user?.id) {
        try {
          localStorage.setItem(`catalystos_team_${user.id}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    showToast(`Team member "${memberName}" added to venture.`, 'success');
  };

  // ── P1 Task 9: revoke a company account's access ──────────────────────────
  const refreshMemberships = async () => {
    try {
      const res = await apiFetch('/api/memberships');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMemberships(data);
      }
    } catch (err) {
      console.warn('[App] Membership refresh warning:', err);
    }
  };

  const handleRemoveMembership = async (id: string) => {
    const res = await apiFetch(`/api/memberships/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data?.error || 'That member could not be removed.', 'error');
      return;
    }
    // The person may still exist as a roster entry, so refresh both lists.
    await Promise.all([refreshMemberships(), hydrateTeam()]);
    showToast(`${data.fullName || 'Member'} no longer has access to the workspace.`, 'success');
  };

  const hydrateTeam = async () => {
    try {
      const res = await apiFetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTeamMembers(data);
          if (user?.id) {
            try {
              localStorage.setItem(`catalystos_team_${user.id}`, JSON.stringify(data));
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn('[App] Team refresh warning:', err);
    }
  };

  // ── P1 Task 8: invitations ────────────────────────────────────────────────
  const refreshInvitations = async () => {
    try {
      const res = await apiFetch('/api/invitations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setInvitations(data);
      }
    } catch (err) {
      console.warn('[App] Invitation refresh warning:', err);
    }
  };

  const handleInviteMember = async (invite: { email: string; role: string }) => {
    const res = await apiFetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invite)
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data?.error || 'The invitation could not be created.', 'error');
      throw new Error(data?.error || 'Invitation failed');
    }
    await refreshInvitations();
    // With no SMTP configured the backend returns the link in development so the
    // founder can pass it along manually.
    if (data.invitationUrl && !data.emailDelivered) {
      try {
        await navigator.clipboard?.writeText(data.invitationUrl);
        showToast(`Invitation created for ${invite.email}. Link copied to clipboard.`, 'success');
      } catch {
        showToast(`Invitation created for ${invite.email}. Copy the link from the server log.`, 'info');
      }
    } else {
      showToast(`Invitation emailed to ${invite.email}.`, 'success');
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    const res = await apiFetch(`/api/invitations/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data?.error || 'The invitation could not be revoked.', 'error');
      return;
    }
    await refreshInvitations();
    showToast('Invitation revoked.', 'success');
  };

  const handleResendInvitation = async (id: string) => {
    const res = await apiFetch(`/api/invitations/${id}/resend`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data?.error || 'The invitation could not be resent.', 'error');
      return;
    }
    await refreshInvitations();
    if (data.invitationUrl && !data.emailDelivered) {
      try {
        await navigator.clipboard?.writeText(data.invitationUrl);
        showToast('New invitation link created and copied to clipboard.', 'success');
      } catch {
        showToast('New invitation link created. Copy it from the server log.', 'info');
      }
    } else {
      showToast('Invitation resent.', 'success');
    }
  };

  const handleRemoveTeamMember = async (id: string) => {
    try {
      await apiFetch(`/api/team/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[App] Team member delete API warning:', err);
    }
    setTeamMembers(prev => {
      const updated = prev.filter(m => m.id !== id);
      if (user?.id) {
        try {
          localStorage.setItem(`catalystos_team_${user.id}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    showToast('Team member removed from venture roster.', 'info');
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

  const handleReviewItem = async (
    id: string, 
    action: 'approve' | 'modify' | 'reject', 
    feedback?: string,
    modifications?: any
  ) => {
    if (user?.role === 'Executive') {
      showToast('Unauthorized: Executive accounts cannot review or approve deliverables. Please login as Founder.', 'error');
      return;
    }
    try {
      const res = await apiFetch(`/api/approvals/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback, modifications }),
      });

      if (res.ok) {
        const data = await res.json();
        setStartup(data.startupProfile);
        setApprovals(prev => prev.filter(item => item.id !== id));
        
        const decRes = await apiFetch('/api/decisions');
        if (decRes.ok) setDecisions(await decRes.json());

        const toastMsg = 
          action === 'approve'
            ? 'Deliverable signed off. System metrics and ledger adjusted.'
            : action === 'modify'
            ? 'Deliverable approved with modified parameters. Metrics adjusted.'
            : 'Deliverable rejected with founder directives and returned to council.';
        showToast(toastMsg, action === 'reject' ? 'info' : 'success');
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

  const renderDashboard = () => {
    if (!startup) {
      return (
        <div className="flex h-screen w-screen items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md border" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Initializing CatalystOS Executive Council...</p>
          </div>
        </div>
      );
    }

    // ── Navigation helpers ─────────────────────────────────────────────────────
    const navItems = [
      { id: 'dashboard' as const,  label: 'Dashboard',  Icon: Activity,    badge: `${startup.healthScore}%`, badgeColor: 'text-emerald-700' },
      { id: 'workspace' as const,  label: 'Employee Workspace', Icon: Briefcase, badge: tasks.length > 0 ? String(tasks.length) : 'Co-Pilot', badgeColor: 'text-amber-600' },
      { id: 'approvals' as const,  label: 'Approvals',  Icon: CheckSquare, badge: approvals.length > 0 ? String(approvals.length) : '', badgeColor: 'text-rose-700' },
      { id: 'knowledge' as const,  label: 'Company Knowledge', Icon: Database, badge: `${knowledge.length} docs`, badgeColor: 'text-indigo-600' },
      { id: 'workflows' as const,  label: 'Workflows',  Icon: Layers,      badge: initiatives.length > 0 ? String(initiatives.length) : '', badgeColor: 'text-[#696969]' },
      { id: 'people' as const,     label: 'People',     Icon: Users,       badge: teamMembers.length > 0 ? String(teamMembers.length) : 'New', badgeColor: 'text-emerald-600' },
      { id: 'scenarios' as const,  label: 'Scenario Studio', Icon: TrendingUp, badge: 'What-If', badgeColor: 'text-indigo-600' },
      { id: 'decisions' as const,  label: 'Decision Ledger', Icon: Shield, badge: decisions.length > 0 ? `${decisions.length}` : '', badgeColor: 'text-[#696969]' },
    ].filter(item => item.id === 'workspace' || permissions.areas.includes(item.id as any));

    const tabLabel = navItems.find(n => n.id === activeTab)?.label ?? activeTab;

    return (
      <div className="flex h-screen overflow-hidden font-sans relative" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
        <AuroraBackground />
        <MouseSpotlight />
      
      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col border-r shrink-0 justify-between" style={{ width: 'var(--sidebar-width)', backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)', padding: '1.25rem' }}>
        <div className="space-y-6">
          
          {/* Logo */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--c-fg)', color: 'var(--c-bg)' }}>
              <CatalystLogo className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base block" style={{ letterSpacing: '-0.02em', color: 'var(--c-fg)' }}>CatalystOS</span>
              <span className="text-label" style={{ fontSize: '0.6rem', color: 'var(--c-faint)' }}>AI Operating System</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-0.5">

            {navItems.map(({ id, label, Icon, badge, badgeColor }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className="relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all font-sans cursor-pointer group"
                  style={{ color: isActive ? 'var(--c-bg)' : 'var(--c-muted)' }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--c-fg)'; e.currentTarget.style.backgroundColor = 'var(--c-surface-2)'; }}}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--c-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}}
                >
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl -z-0"
                      style={{ backgroundColor: 'var(--c-fg)', boxShadow: 'var(--shadow-sm)' }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5">
                    <Icon className="w-4 h-4 transition-colors" style={{ opacity: isActive ? 1 : 0.6 }} />
                    <span>{label}</span>
                  </span>
                  {badge && (
                    <span className="relative z-10 text-[10px] font-mono font-bold" style={{ opacity: isActive ? 0.7 : 1, color: isActive ? 'var(--c-bg)' : undefined }}>
                      {!isActive && <span className={badgeColor}>{badge}</span>}
                      {isActive && badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* ── Collapsible Executive Agents ── */}
            <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--c-border)' }}>
              <button
                onClick={() => setAgentsExpanded(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-label transition-colors cursor-pointer"
                style={{ color: 'var(--c-faint)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--c-fg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--c-faint)'; }}
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" style={{ opacity: 0.6 }} />
                  <span>Executive Agents</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${agentsExpanded ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {agentsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 space-y-0.5">
                      {agents.map((ag, i) => {
                        const isSelected = activeTab === 'agents' && selectedAgentId === ag.id;
                        return (
                          <motion.button
                            key={ag.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => handleSelectAgent(ag.id)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all font-sans cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? 'var(--c-fg)' : 'transparent',
                              color: isSelected ? 'var(--c-bg)' : 'var(--c-muted)',
                              border: isSelected ? '1px solid var(--c-fg)' : '1px solid transparent',
                            }}
                            onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.backgroundColor = 'var(--c-surface-2)'; e.currentTarget.style.color = 'var(--c-fg)'; }}}
                            onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--c-muted)'; }}}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ag.status !== 'idle' ? 'bg-emerald-500 animate-pulse' : ''}`} style={{ backgroundColor: ag.status === 'idle' ? 'var(--c-faint)' : undefined }} />
                              <span className="truncate">{ag.name.split(' ')[0]}</span>
                            </span>
                            <span className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'var(--c-surface-2)', color: isSelected ? 'var(--c-bg)' : 'var(--c-muted)' }}>
                              {ag.role}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>

        <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--c-border)' }}>
          {/* Theme Toggle */}
          <button
            onClick={() => {
              const html = document.documentElement;
              const current = html.getAttribute('data-theme');
              const next = current === 'dark' ? 'light' : 'dark';
              html.setAttribute('data-theme', next);
              localStorage.setItem('catalystos-theme', next);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
            style={{ color: 'var(--c-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-surface-2)'; e.currentTarget.style.color = 'var(--c-fg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--c-muted)'; }}
            title="Toggle Theme"
          >
            <Sparkles className="w-4 h-4" style={{ opacity: 0.6 }} />
            <span>Toggle Theme</span>
          </button>
          
          {/* User profile */}
          <div className="p-3 rounded-xl flex items-center justify-between gap-2 min-w-0" style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 uppercase font-mono" style={{ backgroundColor: 'var(--c-fg)', color: 'var(--c-bg)' }}>
                {user?.name?.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate font-sans" style={{ color: 'var(--c-fg)' }}>{user?.name}</div>
                <div className="text-[10px] truncate capitalize flex items-center gap-1 font-mono" style={{ color: 'var(--c-muted)' }}>
                  <Shield className="w-2.5 h-2.5 shrink-0" style={{ opacity: 0.4 }} />
                  <span>{user?.role}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              title="Sign Out Session"
              className="p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-fg)'; e.currentTarget.style.color = 'var(--c-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--c-surface)'; e.currentTarget.style.color = 'var(--c-muted)'; }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between px-6 md:px-8 transition-all duration-300" style={{ height: 'var(--topbar-height)', backgroundColor: scrolled ? 'var(--glass-bg)' : 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', backdropFilter: scrolled ? 'blur(20px)' : 'none', boxShadow: scrolled ? 'var(--shadow-sm)' : 'none' }}>
          <div className="flex items-center gap-4 text-sm">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-fg)' }}
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-bold font-sans" style={{ letterSpacing: '-0.02em', color: 'var(--c-fg)' }}>CatalystOS</span>
            <span style={{ color: 'var(--c-border-strong)' }}>/</span>
            <span className="font-medium text-xs capitalize font-sans" style={{ color: 'var(--c-muted)' }}>{tabLabel} Workspace</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search bar */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer font-sans"
              style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--c-border-strong)'; e.currentTarget.style.color = 'var(--c-fg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-muted)'; }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search anything...</span>
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-faint)' }}>⌘K</kbd>
            </button>

            {/* Company Knowledge Quick Access */}
            <button
              onClick={() => handleTabChange('knowledge')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                backgroundColor: activeTab === 'knowledge' ? 'var(--c-fg)' : 'var(--c-surface-2)',
                color: activeTab === 'knowledge' ? 'var(--c-bg)' : 'var(--c-fg)',
                border: `1px solid ${activeTab === 'knowledge' ? 'var(--c-fg)' : 'var(--c-border)'}`,
              }}
              title="Company Knowledge Base"
            >
              <Database className="w-3.5 h-3.5" style={{ color: activeTab === 'knowledge' ? 'var(--c-bg)' : 'var(--c-accent)' }} />
              <span className="font-sans text-[11px] font-semibold">Knowledge</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold" style={{ backgroundColor: 'rgba(79,70,229,0.1)', color: 'var(--c-accent)' }}>
                {knowledge.length}
              </span>
            </button>

            {/* Notifications bell */}
            <button 
              onClick={() => setNotificationsOpen(true)}
              className="relative p-2 rounded-lg transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--c-fg)'; e.currentTarget.style.borderColor = 'var(--c-border-strong)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--c-muted)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}
              title="Open Operational Alerts"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--c-accent)' }} />
            </button>

            {/* Founder profile */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold uppercase font-mono" style={{ backgroundColor: 'var(--c-fg)', color: 'var(--c-bg)' }}>
                {user?.name?.slice(0, 2)}
              </div>
              <span className="text-xs font-medium font-sans" style={{ color: 'var(--c-fg)' }}>{user?.name}</span>
            </div>
          </div>
        </header>

        {/* View Content */}
        <main
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 15)}
          className="flex-1 overflow-y-auto scroll-smooth"
          style={{ backgroundColor: 'var(--c-bg)' }}
        >
          <div className="app-container page-padding py-8 space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              >
                {activeTab === 'dashboard' && startup && (
                  <SaaSDashboard 
                    startup={startup}
                    agents={agents}
                    initiatives={initiatives}
                    approvals={approvals}
                    decisions={decisions}
                    knowledge={knowledge}
                    tasks={tasks}
                    memberships={memberships}
                    invitations={invitations}
                    onReviewItem={handleReviewItem}
                    onUploadDoc={handleUploadDoc}
                    onLaunchInitiative={handleLaunchInitiative}
                    onSimulateInitiative={handleSimulateInitiative}
                    onUpdateStartup={handleUpdateStartup}
                    onRefreshTasks={hydrateTasks}
                    onNavigate={(tab) => handleTabChange(tab as any)}
                  />
                )}

                {activeTab === 'workspace' && (
                  <EmployeeWorkspace 
                    userRole={user?.role}
                    userName={user?.name}
                    companyName={startup?.name}
                    onRefreshTasks={hydrateTasks}
                    onNavigateToApprovals={() => handleTabChange('approvals')}
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
                    onSelectAgent={handleSelectAgent}
                  />
                )}

                {activeTab === 'workflows' && (
                  <WorkflowCanvas 
                    initiatives={initiatives} 
                    onLaunchInitiative={handleLaunchInitiative} 
                    onSimulateInitiative={handleSimulateInitiative} 
                    onNavigate={(tab) => handleTabChange(tab as any)}
                  />
                )}

                {activeTab === 'approvals' && (
                  <ApprovalQueue 
                    approvals={approvals} 
                    onReviewItem={handleReviewItem} 
                    currentCash={startup.cashBalance}
                    currentBurn={startup.burnRate}
                  />
                )}

                {activeTab === 'scenarios' && (
                  <ScenarioSimulator
                    currentCash={startup.cashBalance}
                    currentBurn={startup.burnRate}
                    companyName={startup.name}
                  />
                )}

                {activeTab === 'decisions' && (
                  <DecisionLog 
                    decisions={decisions} 
                    onRefresh={hydrateState}
                  />
                )}

                {activeTab === 'knowledge' && (
                  <KnowledgeBase 
                    documents={knowledge} 
                    onUploadDoc={handleUploadDoc} 
                  />
                )}

                {activeTab === 'people' && (
                  <PeopleDirectory 
                    user={user}
                    companyName={startup.name}
                    teamMembers={teamMembers}
                    onAddMember={hasPermission('people:write') ? handleAddTeamMember : undefined}
                    onRemoveMember={hasPermission('people:write') ? handleRemoveTeamMember : undefined}
                    memberships={memberships}
                    invitations={invitations}
                    onInviteMember={hasPermission('people:access') ? handleInviteMember : undefined}
                    onRevokeInvitation={hasPermission('people:access') ? handleRevokeInvitation : undefined}
                    onResendInvitation={hasPermission('people:access') ? handleResendInvitation : undefined}
                    onRemoveMembership={hasPermission('people:access') ? handleRemoveMembership : undefined}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <Footer onNavigate={(tab) => handleTabChange(tab as any)} />
        </main>

      {/* Toast Alerts */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl flex items-center gap-3.5 min-w-[300px] max-w-sm font-sans"
            style={{
              backgroundColor: 'var(--c-surface)',
              border: `1px solid ${toast.type === 'success' ? 'var(--c-success)' : toast.type === 'error' ? 'var(--c-danger)' : 'var(--c-border)'}`,
              color: toast.type === 'success' ? 'var(--c-success)' : toast.type === 'error' ? 'var(--c-danger)' : 'var(--c-fg)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <Sparkles className="w-4 h-4 shrink-0 opacity-60" />
            <div className="flex-1">
              <p className="text-xs font-semibold leading-normal">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          handleTabChange(tab);
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

      {/* ── Mobile Drawer (Animated) ─────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 md:hidden"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 md:hidden flex flex-col justify-between"
              style={{ backgroundColor: 'var(--c-surface)', borderRight: '1px solid var(--c-border)', boxShadow: 'var(--shadow-xl)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--c-fg)', color: 'var(--c-bg)' }}>
                      <CatalystLogo className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold font-sans" style={{ letterSpacing: '-0.02em', color: 'var(--c-fg)' }}>CatalystOS</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map(({ id, label, Icon, badge, badgeColor }, i) => (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => { handleTabChange(id); setMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium font-sans transition-all"
                      style={{
                        backgroundColor: activeTab === id ? 'var(--c-fg)' : 'transparent',
                        color: activeTab === id ? 'var(--c-bg)' : 'var(--c-muted)',
                      }}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </span>
                      {badge && <span className="text-[10px] font-mono font-bold" style={{ opacity: activeTab === id ? 0.7 : 1 }}>{badge}</span>}
                    </motion.button>
                  ))}
                </nav>
              </div>

              <div className="p-6" style={{ borderTop: '1px solid var(--c-border)' }}>
                <div className="text-center text-label" style={{ color: 'var(--c-faint)' }}>
                  AI Executive Council
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Catalyst OS AI Chatbot */}
      <CatalystOsChatbot />

      {/* Real-time Operational Notifications Drawer */}
      <NotificationPanel 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
        onNavigate={(tab) => handleTabChange(tab)} 
      />

    </div>
    );
  };

  return (
    <Routes>
      {/* Landing Phase Route - Guarded: If authenticated, redirect to workspace or onboarding */}
      <Route
        path="/"
        element={
          loading || isCheckingStartup ? (
            <div className="flex h-screen w-screen items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md border" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Checking Workspace Status...</p>
              </div>
            </div>
          ) : user ? (
            onboardingCompleted ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <AuthScreen key="landing" initialView="landing" />
          )
        }
      />

      {/* Aliases for login and signup routes */}
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      <Route path="/signup" element={<Navigate to="/auth" replace />} />

      {/* Authentication Phase Route */}
      {/* P1 Task 8: public invitation acceptance. The raw token is the credential,
          so this route must not sit behind the authentication guard. */}
      <Route path="/accept-invitation" element={<AcceptInvitation />} />

      <Route
        path="/auth"
        element={
          loading || isCheckingStartup ? (
            <div className="flex h-screen w-screen items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md border" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Checking Workspace Status...</p>
              </div>
            </div>
          ) : user ? (
            onboardingCompleted ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <AuthScreen key="auth" initialView="auth" />
          )
        }
      />

      {/* Onboarding Phase Route */}
      <Route
        path="/onboarding"
        element={
          loading || isCheckingStartup ? (
            <div className="flex h-screen w-screen items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-md border" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Checking Workspace Status...</p>
              </div>
            </div>
          ) : !user ? (
            <Navigate to="/auth" replace />
          ) : onboardingCompleted ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthScreen
              key="onboarding"
              initialView="onboarding"
              onOnboardingComplete={handleOnboardingComplete}
            />
          )
        }
      />

      {/* Direct Shortcuts for Workspace Phases */}
      <Route path="/workspace" element={<Navigate to="/dashboard/workspace" replace />} />
      <Route path="/approvals" element={<Navigate to="/dashboard/approvals" replace />} />
      <Route path="/knowledge" element={<Navigate to="/dashboard/knowledge" replace />} />
      <Route path="/workflows" element={<Navigate to="/dashboard/workflows" replace />} />
      <Route path="/people" element={<Navigate to="/dashboard/people" replace />} />
      <Route path="/scenarios" element={<Navigate to="/dashboard/scenarios" replace />} />
      <Route path="/decisions" element={<Navigate to="/dashboard/decisions" replace />} />
      <Route path="/agents" element={<Navigate to="/dashboard/agents" replace />} />
      <Route path="/agents/:agentId" element={<Navigate to="/dashboard/agents" replace />} />

      {/* Executive Workspace Dashboard Phase Route */}
      <Route
        path="/dashboard/*"
        element={
          loading || isCheckingStartup ? (
            <div className="flex h-screen w-screen items-center justify-center bg-[#F3F0EE]">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-white border border-[#141413]/10 flex items-center justify-center mx-auto shadow-[rgba(0,0,0,0.06)_0px_8px_24px]">
                  <RefreshCw className="w-6 h-6 text-[#141413] animate-spin" />
                </div>
                <p className="text-xs font-mono text-[#696969] uppercase tracking-widest">Verifying Active Platform Session...</p>
              </div>
            </div>
          ) : !user ? (
            <Navigate to="/auth" replace />
          ) : !onboardingCompleted ? (
            <Navigate to="/onboarding" replace />
          ) : (
            renderDashboard()
          )
        }
      />

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
