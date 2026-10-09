import 'dotenv/config';
import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord, User, UserRole } from '../src/types';

import bcrypt from 'bcryptjs';
import { prisma, safeDbQuery } from './services/dbService';
export let isDbAvailable = true;

export interface UserDBRecord extends User {
  passwordHash?: string;
}

export const users: UserDBRecord[] = [];

export function addUser(user: UserDBRecord) {
  users.push(user);
  if (!isDbAvailable || !prisma) return;
  prisma.user.create({
    data: {
      id: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
      role: user.role,
    }
  }).then(() => {
    console.log(`[Database] User ${user.email} successfully persisted to Neon PostgreSQL.`);
  }).catch(err => {
    console.error(`[Database] Failed to persist user ${user.email} to PostgreSQL:`, err.message);
  });
}


export const agentsList: Agent[] = [
  {
    id: 'ceo',
    name: 'Atlas',
    role: 'CEO',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    description: 'Autonomous corporate strategist & CEO orchestrator. Decomposes goals, routes executive delegation, and synthesizes final briefs.',
    status: 'idle',
    keyMetric: 'Company Velocity',
    metricValue: '85%',
    color: 'indigo',
  },
  {
    id: 'finance',
    name: 'Aura',
    role: 'Finance',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    description: 'Chief Financial Officer. Monitors cash burn rate, executes deterministic runway calculations, and enforces capital governance.',
    status: 'idle',
    keyMetric: 'Financial Health',
    metricValue: '90%',
    color: 'emerald',
  },
  {
    id: 'talent',
    name: 'Echo',
    role: 'Talent',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    description: 'Head of People & Recruiting. Plans headcount growth, structures equity options pools, and vets engineering candidates.',
    status: 'idle',
    keyMetric: 'Hiring Velocity',
    metricValue: '45 days',
    color: 'pink',
  },
  {
    id: 'growth',
    name: 'Vector',
    role: 'Growth',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    description: 'VP of Growth & Marketing. Focuses on customer acquisition, GTM strategies, ICP positioning, and marketing loops.',
    status: 'idle',
    keyMetric: 'Growth Rate',
    metricValue: '+35% MoM',
    color: 'amber',
  },
  {
    id: 'legal',
    name: 'Nexus',
    role: 'Legal',
    avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150',
    description: 'General Counsel. Drafts binding commercial contracts, reviews compliance, assesses IP protection, and flags structural liabilities.',
    status: 'idle',
    keyMetric: 'Compliance Index',
    metricValue: '95%',
    color: 'rose',
  },
  {
    id: 'operations',
    name: 'Helix',
    role: 'Operations',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    description: 'VP of Operations. Tracks sprint milestones, coordinates cross-functional delivery, and manages operational infrastructure.',
    status: 'idle',
    keyMetric: 'Ops Efficiency',
    metricValue: '88%',
    color: 'teal',
  },
  {
    id: 'investment',
    name: 'Apex',
    role: 'Investment',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    description: 'Head of Capital & Investor Relations. Models cap tables, prepares fundraising collateral, and coordinates pitch materials.',
    status: 'idle',
    keyMetric: 'Capital Readiness',
    metricValue: 'Ready',
    color: 'purple',
  },
  {
    id: 'auditor',
    name: 'Sentry',
    role: 'Auditor',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    description: 'Compliance & Verification Auditor. Verifies mathematical determinism, validates document citations, and eliminates hallucinations.',
    status: 'idle',
    keyMetric: 'Audit Accuracy',
    metricValue: '100%',
    color: 'blue',
  },
];

import { loadPersistedState, savePersistedState } from './services/storageService';

export const DEFAULT_NOVATECH_PROFILE: StartupProfile = {
  name: 'NovaTech',
  industry: 'Enterprise AI & Developer Platform',
  description: 'Autonomous developer infrastructure and multi-agent systems for enterprise microservices.',
  fundingStage: 'Seed',
  cashBalance: 7200000, // ₹72 Lakhs ($86,400)
  burnRate: 800000,    // ₹8 Lakhs / mo ($9,600)
  runwayMonths: 9.0,   // 9 Months
  healthScore: 82,
  metrics: {
    velocity: 78,
    financialHealth: 84,
    legalCompliance: 92,
    growthRate: 65,
    operationsEfficiency: 80,
  },
};

export const DEFAULT_INITIATIVES: Initiative[] = [
  {
    id: 'init_demo_hiring',
    title: 'Should we hire 2 engineers before our next product launch?',
    description: 'Determine whether adding 2 senior engineers before the 6-week enterprise launch is financially and operationally justified, balancing sprint capacity against runway burn.',
    category: 'hiring',
    status: 'pending',
    createdAt: new Date().toISOString(),
    currentTaskIndex: 0,
    tasks: [
      { id: 't_h1', title: 'Audit engineering bottleneck & 6-week enterprise launch commitments', assignedTo: 'CEO', status: 'pending' },
      { id: 't_h2', title: 'Stress test cash runway (-₹4L/mo) against ₹72L reserves', assignedTo: 'Finance', status: 'pending' },
      { id: 't_h3', title: 'Evaluate developer onboarding ramp time vs sprint delivery capacity', assignedTo: 'Operations', status: 'pending' },
      { id: 't_h4', title: 'Quantify enterprise pilot delivery expectations & ARR impact', assignedTo: 'Growth', status: 'pending' },
    ],
    messages: [],
    deliverables: []
  }
];

export const DEFAULT_KNOWLEDGE_FILES: KnowledgeFile[] = [
  {
    id: 'doc_hiring_policy',
    name: 'Hiring Policy.pdf',
    type: 'policy',
    size: '24.2 KB',
    uploadDate: '2026-10-06T09:00:00.000Z',
    startupId: 'st_catalystos',
    summary: 'Official Talent Acquisition & Hiring Policy. Defines recruitment standards, engineering interview loops, 90-day probation review, and salary compensation benchmarks.',
    insights: [
      'All full-time engineering candidates must complete a 4-round technical assessment and cultural interview.',
      'Base salaries for Senior Engineers are benchmarked at $130,000 - $150,000/yr with standard 0.25% - 0.75% equity incentives.',
      'Mandatory structured 90-day performance milestone review before full tenure confirmation.',
      'All hiring offers require dual approval from Talent lead and Finance (CFO).'
    ]
  },
  {
    id: 'doc_employee_handbook',
    name: 'Employee Handbook.pdf',
    type: 'handbook',
    size: '38.6 KB',
    uploadDate: '2026-10-06T09:30:00.000Z',
    startupId: 'st_catalystos',
    summary: 'Company Employee Handbook & Governance Guide. Details employment standards, intellectual property protection covenants, standard 20-day PTO, at-will terms, and onboarding compliance.',
    insights: [
      'All employees and contractors must execute standard Proprietary Information and Inventions Agreement (PIIA) prior to start date.',
      'Employment is at-will; all offers are contingent upon background verification and signed compliance acknowledgment.',
      'Standard benefits package includes 20 days paid time off (PTO) and comprehensive health insurance coverage.',
      'Equipment stipend of $2,500 allocated per engineer for developer workstation and hardware setup.'
    ]
  },
  {
    id: 'doc_company_strategy',
    name: 'Company Strategy.docx',
    type: 'strategy',
    size: '42.1 KB',
    uploadDate: '2026-10-06T10:00:00.000Z',
    startupId: 'st_catalystos',
    summary: 'Strategic Master Plan & Operational Roadmap. Details the 6-month product roadmap, target enterprise launch milestones, runway guardrails, and customer acquisition priorities.',
    insights: [
      'Core corporate objective: Deliver production enterprise workflow orchestration engine within 90 days.',
      'Runway preservation guardrail: Maintain a minimum 6-month operational runway buffer at all times before approving non-essential headcount expansion.',
      'Target ICP: Mid-market B2B SaaS engineering teams with 20-100 developers building microservices.',
      'Engineering capacity is the primary delivery bottleneck; strategic technical hiring is prioritized over sales expansion.'
    ]
  },
  {
    id: 'doc_novatech_strategy',
    name: 'NovaTech_Enterprise_Strategy.md',
    type: 'pitch_deck',
    size: '18.4 KB',
    uploadDate: '2026-10-05T09:00:00.000Z',
    startupId: 'st_catalystos',
    summary: 'Executive roadmap for NovaTech Enterprise Orchestrator. Documents our 6-week launch timeline with 5 pilot enterprise customers, 3 developers bandwidth bottleneck, and ₹8L/mo burn boundary.',
    insights: [
      'Enterprise launch is firmly committed in 6 weeks with 5 pilot partner contracts.',
      'The engineering team currently has only 3 core developers and is operating at 95% workload capacity.',
      'Hiring 2 senior engineers immediately would accelerate backend pipeline delivery, but increases monthly burn by ₹4L/mo, dangerously reducing runway from 9 months to 5.5 months.',
      'Orchestrator consensus recommendation: Hire 1 senior platform engineer now, and postpone the second hire until enterprise launch revenue milestone is reached.'
    ]
  }
];

export const DEFAULT_DECISION_LOG: DecisionRecord[] = [
  {
    id: 'dec_initial_1',
    title: 'Approve: Reserve Cloud Compute Nodes for Enterprise Launch',
    description: 'Committed to 1-year reserved instances on AWS compute to optimize unit economics ahead of enterprise pilot onboarding.',
    category: 'FINANCIALS',
    timestamp: '2026-10-02T10:00:00.000Z',
    impactText: 'Saves ₹1,50,000 monthly in compute overhead while securing 99.98% dedicated SLA.',
    financialImpact: -150000,
    status: 'approved'
  }
];

// Initialize state from file cache or default seeds
const persisted = loadPersistedState();

export let startupProfile: StartupProfile = persisted?.startupProfile || { ...DEFAULT_NOVATECH_PROFILE };
export let initiatives: Initiative[] = (persisted?.initiatives && persisted.initiatives.length > 0) ? persisted.initiatives : [...DEFAULT_INITIATIVES];
export let approvals: Deliverable[] = persisted?.approvals || [];
export let decisionLog: DecisionRecord[] = (persisted?.decisionLog && persisted.decisionLog.length > 0) ? persisted.decisionLog : [...DEFAULT_DECISION_LOG];
const initialFiles: KnowledgeFile[] = (persisted?.knowledgeFiles && persisted.knowledgeFiles.length > 0)
  ? [...persisted.knowledgeFiles]
  : [];

for (const defaultDoc of DEFAULT_KNOWLEDGE_FILES) {
  const existing = initialFiles.find(kf => kf.id === defaultDoc.id || kf.name === defaultDoc.name);
  if (!existing) {
    initialFiles.push({ ...defaultDoc });
  } else if (!existing.startupId) {
    existing.startupId = defaultDoc.startupId;
  }
}

export let knowledgeFiles: KnowledgeFile[] = initialFiles;

export function persistCurrentState() {
  savePersistedState({
    startupProfile,
    initiatives,
    approvals,
    decisionLog,
    knowledgeFiles
  });
}

// Mutators and helpers to keep state synchronized
export function updateStartupProfile(updater: Partial<StartupProfile>) {
  Object.assign(startupProfile, updater);
  if (startupProfile.burnRate > 0) {
    startupProfile.runwayMonths = parseFloat((startupProfile.cashBalance / startupProfile.burnRate).toFixed(1));
  } else {
    startupProfile.runwayMonths = 999;
  }
  persistCurrentState();

  // Update in background
  if (isDbAvailable) {
    prisma.startup.findFirst({ orderBy: { createdAt: 'desc' } })
      .then(profile => {
        if (profile) {
          return prisma.startup.update({
            where: { id: profile.id },
            data: {
              name: updater.name,
              industry: updater.industry,
              description: updater.description,
              fundingStage: updater.fundingStage,
              cashBalance: updater.cashBalance,
              burnRate: updater.burnRate,
              healthScore: updater.healthScore,
            }
          });
        }
      })
      .then(() => console.log('[Database] Startup profile updated in Neon PostgreSQL.'))
      .catch(err => console.error('[Database] Failed to persist startup updates:', err.message));
  }

  return startupProfile;
}

export function resetAgentStatuses() {
  agentsList.forEach(a => {
    a.status = 'idle';
    if (!isDbAvailable) return;
    prisma.executiveAgent.updateMany({
      where: { role: a.role },
      data: { status: 'idle', currentTask: null }
    }).catch(() => {});
  });
}

export function setAgentStatuses(status: 'idle' | 'analyzing' | 'collaborating' | 'generating' | 'reviewing', activeRole?: string) {
  agentsList.forEach(a => {
    const isTarget = activeRole ? a.role === activeRole : true;
    if (isTarget) {
      a.status = status;
      if (!isDbAvailable) return;
      prisma.executiveAgent.updateMany({
        where: { role: a.role },
        data: { status, currentTask: status !== 'idle' ? `${status.toUpperCase()}...` : null }
      }).catch(() => {});
    } else if (activeRole) {
      a.status = 'idle';
      if (!isDbAvailable) return;
      prisma.executiveAgent.updateMany({
        where: { role: a.role },
        data: { status: 'idle', currentTask: null }
      }).catch(() => {});
    }
  });
}

// Automatically sync memory state with Neon PostgreSQL on load
export async function syncStateWithDatabase() {
  let timedOut = false;
  try {
    console.log('🔄 Synchronizing memory state with Neon PostgreSQL...');
    
    const syncOperations = async () => {
      // Warm up the Neon connection cleanly to wake up serverless compute
      await safeDbQuery(() => prisma.$executeRawUnsafe('SELECT 1'));

      // Fetch startup queries with automatic retry on pool/connection errors
      const [dbUsers, dbStartup, dbAgents, dbDocs] = await safeDbQuery(() => Promise.all([
        prisma.user.findMany(),
        prisma.startup.findFirst({ orderBy: { createdAt: 'desc' } }),
        prisma.executiveAgent.findMany(),
        prisma.startupDocument.findMany({ orderBy: { createdAt: 'desc' } })
      ]));

      if (timedOut) return;

      // Sync Users
      if (dbUsers && dbUsers.length > 0) {
        users.length = 0; // Clear default array
        dbUsers.forEach(u => {
          users.push({
            id: u.id,
            email: u.email,
            name: u.name || '',
            role: u.role as UserRole,
            passwordHash: (u as any).passwordHash || undefined,
            createdAt: u.createdAt.toISOString()
          });
        });
        console.log(`✅ Synced ${dbUsers.length} users.`);
      }

      // Sync Startup Profile
      if (dbStartup) {
        const runway = dbStartup.burnRate > 0 ? parseFloat((dbStartup.cashBalance / dbStartup.burnRate).toFixed(1)) : 999;
        startupProfile.name = dbStartup.name;
        startupProfile.industry = dbStartup.industry;
        startupProfile.description = dbStartup.description;
        startupProfile.fundingStage = dbStartup.fundingStage;
        startupProfile.cashBalance = dbStartup.cashBalance;
        startupProfile.burnRate = dbStartup.burnRate;
        startupProfile.runwayMonths = runway;
        startupProfile.healthScore = dbStartup.healthScore;
        console.log('✅ Synced startup profile.');
      }

      // Sync Agents
      if (dbAgents && dbAgents.length > 0) {
        agentsList.forEach(a => {
          const matchingDb = dbAgents.find(da => da.id === a.id);
          if (matchingDb) {
            a.status = matchingDb.status as any;
          }
        });
        console.log('✅ Synced executive agents statuses.');
      }



      isDbAvailable = true;
      console.log('🎉 Neon PostgreSQL state synchronization complete.');
    };

    const timeoutGuard = new Promise((_, reject) =>
      setTimeout(() => {
        timedOut = true;
        reject(new Error('Remote database connection timed out (45000ms)'));
      }, 45000)
    );

    await Promise.race([syncOperations(), timeoutGuard]);
  } catch (err: any) {
    isDbAvailable = false;
    console.warn(`⚠️ Could not connect to Neon PostgreSQL for startup sync (${err?.message || err}). Falling back to high-fidelity offline default states.`);
  }
}

// Trigger background synchronization
syncStateWithDatabase();

