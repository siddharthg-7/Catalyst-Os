import 'dotenv/config';
import { StartupProfile, Agent, Initiative, Deliverable, KnowledgeFile, DecisionRecord, User, UserRole } from '../src/types';

import bcrypt from 'bcryptjs';
import { prisma } from './services/dbService';
export let isDbAvailable = true;

export interface UserDBRecord extends User {
  passwordHash: string;
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

export let startupProfile: StartupProfile = {
  name: '',
  industry: '',
  description: '',
  fundingStage: 'Pre-Seed',
  cashBalance: 0,
  burnRate: 0,
  runwayMonths: 0,
  healthScore: 0,
  metrics: {
    velocity: 0,
    financialHealth: 0,
    legalCompliance: 0,
    growthRate: 0,
    operationsEfficiency: 0,
  },
};

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

export let initiatives: Initiative[] = [];
export let approvals: Deliverable[] = [];
export let decisionLog: DecisionRecord[] = [];
export let knowledgeFiles: KnowledgeFile[] = [];

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
export async function syncStateWithDatabase() {
  try {
    console.log('🔄 Synchronizing memory state with Neon PostgreSQL...');
    
    const syncOperations = async () => {
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

      isDbAvailable = true;
      console.log('🎉 Neon PostgreSQL state synchronization complete.');
    };

    const timeoutGuard = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Remote database connection timed out (15000ms)')), 15000)
    );

    await Promise.race([syncOperations(), timeoutGuard]);
  } catch (err: any) {
    isDbAvailable = false;
    console.warn(`⚠️ Could not connect to Neon PostgreSQL for startup sync (${err?.message || err}). Falling back to high-fidelity offline default states.`);
  }

}

// Trigger background synchronization
syncStateWithDatabase();

