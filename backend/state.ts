import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord, User, UserRole } from '../src/types';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export let isDbAvailable = true;

export interface UserDBRecord extends User {
  passwordHash: string;
}

export const users: UserDBRecord[] = [
  {
    id: 'usr_founder',
    email: 'founder@founder.os',
    name: 'Sophia Vance',
    role: 'Founder',
    passwordHash: bcrypt.hashSync('password123', 10),
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_executive',
    email: 'exec@founder.os',
    name: 'Marcus Sterling',
    role: 'Executive',
    passwordHash: bcrypt.hashSync('password123', 10),
    createdAt: new Date().toISOString()
  },
  {
    id: 'usr_admin',
    email: 'admin@founder.os',
    name: 'CatalystOS Admin',
    role: 'Admin',
    passwordHash: bcrypt.hashSync('password123', 10),
    createdAt: new Date().toISOString()
  }
];

export function addUser(user: UserDBRecord) {
  users.push(user);
  if (!isDbAvailable) return;
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


export let startupProfile: StartupProfile = {
  name: 'CatalystOS Startup',
  industry: 'B2B SaaS / Developer Tools',
  description: 'Enterprise-grade automated workflow orchestration platform for hybrid cloud environments, optimizing resource usage and cloud spend.',
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

export const agentsList: Agent[] = [
  {
    id: 'ceo',
    name: 'Sophia Vance',
    role: 'CEO',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    description: 'Autonomous corporate strategist. Formulates broad roadmaps, delegates operational objectives, and balances high-level vision with resource constraints.',
    status: 'idle',
    keyMetric: 'Company Velocity',
    metricValue: '65%',
    color: 'indigo',
  },
  {
    id: 'finance',
    name: 'Marcus Sterling',
    role: 'Finance',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    description: 'Automated Chief Financial Officer. Optimizes unit economics, monitors cash burn rates, ensures cost compliance, and models long-term cap tables.',
    status: 'idle',
    keyMetric: 'Financial Health',
    metricValue: '72%',
    color: 'emerald',
  },
  {
    id: 'talent',
    name: 'Evelyn Brooks',
    role: 'Talent',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    description: 'AI Recruiting and HR Executive. Strategizes resource allocation, drafts compensation structures (base & equity), and sources top industry contributors.',
    status: 'idle',
    keyMetric: 'Hiring Speed',
    metricValue: '58 days',
    color: 'pink',
  },
  {
    id: 'growth',
    name: 'Dax Ramirez',
    role: 'Growth',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    description: 'Autonomous Marketing and User Acquisition Officer. Focuses on viral loops, product positioning, content engines, and demand generation optimization.',
    status: 'idle',
    keyMetric: 'User Growth Rate',
    metricValue: '+45% MoM',
    color: 'amber',
  },
  {
    id: 'operations',
    name: 'Kaelen Finch',
    role: 'Operations',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    description: 'AI Infrastructure and System Integrator. Automates engineering sprints, cloud deployments, third-party vendor management, and internal tooling efficiency.',
    status: 'idle',
    keyMetric: 'Ops Efficiency',
    metricValue: '70%',
    color: 'sky',
  },
  {
    id: 'legal',
    name: 'Helena Vance, Esq.',
    role: 'Legal',
    avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150',
    description: 'Automated General Counsel. Drafts binding commercial contracts, reviews multi-jurisdictional compliance, assesses IP protection, and flags structural liabilities.',
    status: 'idle',
    keyMetric: 'Compliance Index',
    metricValue: '80%',
    color: 'rose',
  },
  {
    id: 'conflict',
    name: 'Pax-9 Synthesis',
    role: 'ConflictResolver',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    description: 'Corporate Compromise Engine. Mediates functional trade-offs between agents (e.g., Growth budget vs. Finance burn, Talent speed vs. Legal safety) to deliver optimized compromises.',
    status: 'idle',
    keyMetric: 'Resolution Rate',
    metricValue: '98%',
    color: 'purple',
  },
  {
    id: 'approval',
    name: 'Loom-V Director',
    role: 'ApprovalManager',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    description: 'Executive Presentation Engine. Packages active multi-agent deliverables, runs compliance audits, and coordinates high-fidelity feedback loops with the Human Founder.',
    status: 'idle',
    keyMetric: 'Ready Deliverables',
    metricValue: '0 Pending',
    color: 'teal',
  },
];

export let initiatives: Initiative[] = [
  {
    id: 'init_1',
    title: 'Founding Engineer Talent Acquisition & Options Pool',
    description: 'Structure and deploy a recruiting workflow to hire the lead cloud engineer. Requires Talent options setup, Finance budget approval, and Legal contract auditing.',
    status: 'completed',
    category: 'hiring',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    currentTaskIndex: 3,
    tasks: [
      { id: 't1', title: 'Define job descriptions and equity allocation range', assignedTo: 'Talent', status: 'completed', result: 'Structured 1.2% options pool and $140k base salary.' },
      { id: 't2', title: 'Audit budget impact and cash flow models', assignedTo: 'Finance', status: 'completed', result: 'Verified burn rate increase of $11.6k/mo.' },
      { id: 't3', title: 'Draft standard IP assignment and employment agreements', assignedTo: 'Legal', status: 'completed', result: 'Drafted complete Employee Agreement with proprietary information protection.' }
    ],
    messages: [
      { id: 'm1', sender: 'CEO', receiver: 'All', content: 'We need to bring on a World Class Founding Engineer to accelerate our cloud infrastructure orchestrator.', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'm2', sender: 'Talent', receiver: 'Finance', content: 'Drafted requirements. Proposing $140,000 base + 1.2% options pool for founder-level engineering commitment.', timestamp: new Date(Date.now() - 2.9 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'm3', sender: 'Finance', receiver: 'Talent', content: 'This base is aligned with our current pre-seed treasury but pushes runway below 11 months if product launches late. Proposing 1.4% equity + $125k base to preserve cash.', timestamp: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000).toISOString(), isConflict: true },
      { id: 'm4', sender: 'ConflictResolver', receiver: 'All', content: 'Compromise structured: $132,000 base + 1.3% equity, vesting quarterly with a 1-year cliff. Keeps runway at safe 12.1 months.', timestamp: new Date(Date.now() - 2.7 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'm5', sender: 'Legal', receiver: 'All', content: 'Vesting structure incorporated. Drafted employment contract & IP assignment agreements. Safe to deploy.', timestamp: new Date(Date.now() - 2.6 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    deliverables: [
      {
        id: 'del_1',
        initiativeId: 'init_1',
        title: 'Founding Engineer Employment Package & IP Assignment',
        description: 'Complete recruitment documents including employment offer, stock vesting terms (1-year cliff), and standard IP assignment clause.',
        type: 'contract',
        status: 'approved',
        content: '# FOUNDING ENGINEER EMPLOYMENT OFFER\n\n**Position:** Lead Platform Architect\n**Base Compensation:** $132,000 USD / Year\n**Equity Compensation:** 1.3% Stock Options Pool\n\n### Vesting & Clauses:\n1. **Vesting Schedule:** 4-year monthly vesting with a standard 12-month cliff.\n2. **IP Assignment:** All work and IP created during employment is fully assigned to CatalystOS Startup.\n3. **Non-Disclosure:** Multi-year strict proprietary data protection clause included.',
        impact: 'Increases team velocity by 18 points, decreases runway by 1.1 months, increases operations efficiency.',
        financialChange: -11000,
        metricChanges: { velocity: 18, operationsEfficiency: 12, financialHealth: -5 }
      }
    ],
  },
  {
    id: 'init_2',
    title: 'Enterprise Pilot Program Outreach & Compliance',
    description: 'Deploy a lead acquisition workflow targeting 5 mid-market companies. Draft pilot terms, pricing options, service level agreements (SLAs), and landing copy.',
    status: 'pending',
    category: 'growth',
    createdAt: new Date().toISOString(),
    currentTaskIndex: 0,
    tasks: [
      { id: 't4', title: 'Target segment lead scoring and landing page messaging', assignedTo: 'Growth', status: 'pending' },
      { id: 't5', title: 'Draft enterprise service levels (SLAs) and trial contracts', assignedTo: 'Legal', status: 'pending' },
      { id: 't6', title: 'Model pilot pricing economics and cloud support cost margins', assignedTo: 'Finance', status: 'pending' }
    ],
    messages: [],
    deliverables: [],
  }
];

export let approvals: Deliverable[] = [
  {
    id: 'del_2',
    initiativeId: 'init_1',
    title: 'Q3 Enterprise Pilot Terms & SLA Draft',
    description: 'Enterprise agreement template for upcoming pilots with $15,000 pilot fee structures, 99.9% uptime commitments, and data privacy clauses.',
    type: 'contract',
    status: 'pending_review',
    content: '# CATALYSTOS PILOT AGREEMENT\n\nThis pilot program contract sets out the trial terms with mid-market testers.\n\n### Key Terms:\n- **Pilot Duration:** 90 Days\n- **Service Fee:** $15,000 USD flat fee\n- **Uptime Commitment:** 99.9% availability, standard support desk SLA.\n- **Data Privacy:** Full SOC-2 compliance compliance guarantees included.\n\n### Business Outcome:\n- Unlocks pilot pipeline value, validates SaaS pricing framework.',
    impact: 'Unlocks +$15,000 pilot revenue, increases growth metrics (+10 points) and customer confidence.',
    financialChange: 15000,
    metricChanges: { growthRate: 10, financialHealth: 6, operationsEfficiency: -2 }
  }
];

export let decisionLog: DecisionRecord[] = [
  {
    id: 'dec_1',
    title: 'Deploy Founding Engineer Offer Package',
    description: 'Officially extended the vetted Lead Platform Architect offer with compromise compensation.',
    category: 'Talent Acquisition',
    timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
    impactText: 'Increased company execution capacity +18 points, adjusted runway.',
    financialImpact: -11000,
    status: 'approved',
  }
];

export let knowledgeFiles: KnowledgeFile[] = [
  {
    id: 'doc_1',
    name: 'CatalystOS_Pitch_Deck.md',
    type: 'pitch_deck',
    size: '14 KB',
    uploadDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    summary: 'Core fundraising presentation detailing CatalystOS Cloud Orchestrator, market size ($22B), product roadmap, and founder experience.',
    insights: [
      'Targeting $1.5M Seed round at $10M pre-money valuation.',
      'Saves cloud costs by up to 34% using predictive scheduling algorithms.',
      'Differentiator: True autonomous scheduling with multi-cloud failover support.'
    ]
  }
];

// Mutators and helpers to keep state synchronized
export function updateStartupProfile(updater: Partial<StartupProfile>) {
  Object.assign(startupProfile, updater);
  if (startupProfile.burnRate > 0) {
    startupProfile.runwayMonths = parseFloat((startupProfile.cashBalance / startupProfile.burnRate).toFixed(1));
  } else {
    startupProfile.runwayMonths = 999;
  }

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
    prisma.executiveAgent.update({
      where: { id: a.id },
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
      prisma.executiveAgent.update({
        where: { id: a.id },
        data: { status, currentTask: status !== 'idle' ? `${status.toUpperCase()}...` : null }
      }).catch(() => {});
    } else if (activeRole) {
      a.status = 'idle';
      if (!isDbAvailable) return;
      prisma.executiveAgent.update({
        where: { id: a.id },
        data: { status: 'idle', currentTask: null }
      }).catch(() => {});
    }
  });
}

// Automatically sync memory state with Neon PostgreSQL on load
async function syncStateWithDatabase() {
  try {
    console.log('🔄 Synchronizing memory state with Neon PostgreSQL...');
    
    // Sync Users
    const dbUsers = await prisma.user.findMany();
    if (dbUsers.length > 0) {
      users.length = 0; // Clear default array
      dbUsers.forEach(u => {
        users.push({
          id: u.id,
          email: u.email,
          name: u.name || '',
          role: u.role as UserRole,
          passwordHash: bcrypt.hashSync('password123', 10), // standard map
          createdAt: u.createdAt.toISOString()
        });
      });
      console.log(`✅ Synced ${dbUsers.length} users.`);
    }

    // Sync Startup Profile
    const dbStartup = await prisma.startup.findFirst({ orderBy: { createdAt: 'desc' } });
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
    const dbAgents = await prisma.executiveAgent.findMany();
    if (dbAgents.length > 0) {
      agentsList.forEach(a => {
        const matchingDb = dbAgents.find(da => da.id === a.id);
        if (matchingDb) {
          a.status = matchingDb.status as any;
        }
      });
      console.log('✅ Synced executive agents statuses.');
    }

    // Sync Knowledge Files
    const dbDocs = await prisma.startupDocument.findMany({
      orderBy: { createdAt: 'desc' }
    });
    if (dbDocs.length > 0) {
      knowledgeFiles.length = 0;
      dbDocs.forEach(d => {
        knowledgeFiles.push({
          id: d.id,
          name: d.name,
          type: d.type as any,
          size: d.size,
          uploadDate: d.createdAt.toISOString(),
          summary: d.summary,
          insights: d.insights
        });
      });
      console.log(`✅ Synced ${dbDocs.length} knowledge base documents.`);
    }

    console.log('🎉 Neon PostgreSQL state synchronization complete.');
  } catch (err: any) {
    isDbAvailable = false;
    console.warn('⚠️ Could not connect to Neon PostgreSQL for startup sync. Falling back to high-fidelity offline default states.');
  }
}

// Trigger background synchronization
syncStateWithDatabase();

