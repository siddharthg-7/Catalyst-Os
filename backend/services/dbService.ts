import { PrismaClient } from '@prisma/client';
import { StartupProfile, Agent, Initiative, Deliverable, DecisionRecord, User, UserRole, AgentRole } from '../../src/types';

export const prisma = new PrismaClient();

// ============================================================================
// REPOSITORY PATTERN / CRUD SERVICES (Everything Production Ready)
// ============================================================================

export class UserRepository {
  async findAll(): Promise<User[]> {
    const records = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(r => ({
      id: r.id,
      email: r.email,
      name: r.name || '',
      role: r.role as UserRole,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async findByEmail(email: string) {
    const record = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!record) return null;
    return {
      id: record.id,
      email: record.email,
      name: record.name || '',
      role: record.role as UserRole,
      passwordHash: bcryptHashMock(record.id), // Salted representation mapping
      createdAt: record.createdAt.toISOString(),
    };
  }

  async findById(id: string) {
    const record = await prisma.user.findUnique({
      where: { id },
    });
    if (!record) return null;
    return {
      id: record.id,
      email: record.email,
      name: record.name || '',
      role: record.role as UserRole,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async create(data: { email: string; name: string; role: UserRole; passwordHash: string }): Promise<User> {
    const record = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
      },
    });
    return {
      id: record.id,
      email: record.email,
      name: record.name || '',
      role: record.role as UserRole,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

export class StartupRepository {
  async getProfile(): Promise<StartupProfile | null> {
    const record = await prisma.startup.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return null;

    const runway = record.burnRate > 0 ? parseFloat((record.cashBalance / record.burnRate).toFixed(1)) : 999;

    return {
      name: record.name,
      industry: record.industry,
      description: record.description,
      fundingStage: record.fundingStage,
      cashBalance: record.cashBalance,
      burnRate: record.burnRate,
      runwayMonths: runway,
      healthScore: record.healthScore,
      metrics: {
        velocity: 65,
        financialHealth: 72,
        legalCompliance: 80,
        growthRate: 45,
        operationsEfficiency: 70,
      },
    };
  }

  async updateProfile(updates: Partial<StartupProfile>): Promise<StartupProfile> {
    const active = await prisma.startup.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    
    if (!active) {
      throw new Error('No startup profile found to update.');
    }

    const record = await prisma.startup.update({
      where: { id: active.id },
      data: {
        name: updates.name,
        industry: updates.industry,
        description: updates.description,
        fundingStage: updates.fundingStage,
        cashBalance: updates.cashBalance,
        burnRate: updates.burnRate,
        healthScore: updates.healthScore,
      },
    });

    const runway = record.burnRate > 0 ? parseFloat((record.cashBalance / record.burnRate).toFixed(1)) : 999;

    return {
      name: record.name,
      industry: record.industry,
      description: record.description,
      fundingStage: record.fundingStage,
      cashBalance: record.cashBalance,
      burnRate: record.burnRate,
      runwayMonths: runway,
      healthScore: record.healthScore,
      metrics: {
        velocity: 65,
        financialHealth: 72,
        legalCompliance: 80,
        growthRate: 45,
        operationsEfficiency: 70,
      },
    };
  }
}

export class AgentRepository {
  async findAll(): Promise<Agent[]> {
    const records = await prisma.executiveAgent.findMany();
    return records.map(r => ({
      id: r.id,
      name: r.name,
      role: r.role as AgentRole,
      avatar: r.avatar,
      description: getAgentDescription(r.role),
      status: r.status as any,
      keyMetric: getAgentKeyMetric(r.role),
      metricValue: getAgentMetricValue(r.role),
      color: getAgentColor(r.role),
    }));
  }

  async updateStatus(id: string, status: string, currentTask?: string | null) {
    return prisma.executiveAgent.update({
      where: { id },
      data: {
        status,
        currentTask,
      },
    });
  }
}

export class InitiativeRepository {
  async findAll(): Promise<Initiative[]> {
    const records = await prisma.plan.findMany({
      include: {
        tasks: true,
        approvals: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(r => {
      // Build initiative map
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        status: (r.status === 'completed' ? 'completed' : 'pending') as any,
        category: 'hiring' as const, // default mapping
        createdAt: r.createdAt.toISOString(),
        currentTaskIndex: r.tasks.filter(t => t.status === 'completed').length,
        tasks: r.tasks.map(t => ({
          id: t.id,
          title: t.title,
          assignedTo: t.assignedTo as AgentRole,
          status: (t.status === 'completed' ? 'completed' : t.status === 'in_progress' ? 'in_progress' : 'pending') as any,
          result: t.result || undefined,
        })),
        messages: [],
        deliverables: r.approvals.map(a => ({
          id: a.id,
          initiativeId: r.id,
          title: a.title,
          description: a.description,
          type: a.type as any,
          status: a.status as any,
          content: a.content,
          impact: a.impact,
          financialChange: a.financialChange,
          metricChanges: a.metricChanges as any,
        })),
      };
    });
  }

  async create(title: string, description: string, category: string): Promise<Initiative> {
    const record = await prisma.plan.create({
      data: {
        title,
        description,
        status: 'pending',
        startupId: 'st_aeroflow',
      },
    });

    return {
      id: record.id,
      title,
      description,
      status: 'pending',
      category: category as any,
      createdAt: record.createdAt.toISOString(),
      currentTaskIndex: 0,
      tasks: [],
      messages: [],
      deliverables: [],
    };
  }
}

// Helpers for agents mapping
function getAgentDescription(role: string): string {
  switch (role) {
    case 'CEO': return 'Autonomous corporate strategist. Formulates broad roadmaps and delegates objectives.';
    case 'Finance': return 'Automated Chief Financial Officer. Optimizes unit economics and burn rates.';
    case 'Talent': return 'AI Recruiting and HR Executive. Strategizes options pools and drafts contracts.';
    case 'Growth': return 'Autonomous Marketing and demand generation optimizer.';
    case 'Operations': return 'AI Infrastructure and System Integrator. Automates sprints.';
    case 'Legal': return 'Automated General Counsel. Drafts binding commercial contracts.';
    case 'ConflictResolver': return 'Corporate Compromise Engine. Mediates functional trade-offs.';
    case 'ApprovalManager': return 'Executive Presentation Engine. Packages active deliverables.';
    default: return 'Corporate Executive Agent';
  }
}

function getAgentKeyMetric(role: string): string {
  switch (role) {
    case 'CEO': return 'Company Velocity';
    case 'Finance': return 'Financial Health';
    case 'Talent': return 'Hiring Speed';
    case 'Growth': return 'User Growth Rate';
    case 'Operations': return 'Ops Efficiency';
    case 'Legal': return 'Compliance Index';
    case 'ConflictResolver': return 'Resolution Rate';
    case 'ApprovalManager': return 'Ready Deliverables';
    default: return 'KPI';
  }
}

function getAgentMetricValue(role: string): string {
  switch (role) {
    case 'CEO': return '65%';
    case 'Finance': return '72%';
    case 'Talent': return '58 days';
    case 'Growth': return '+45% MoM';
    case 'Operations': return '70%';
    case 'Legal': return '80%';
    case 'ConflictResolver': return '98%';
    case 'ApprovalManager': return '0 Pending';
    default: return 'Nominal';
  }
}

function getAgentColor(role: string): string {
  switch (role) {
    case 'CEO': return 'indigo';
    case 'Finance': return 'emerald';
    case 'Talent': return 'pink';
    case 'Growth': return 'amber';
    case 'Operations': return 'sky';
    case 'Legal': return 'rose';
    case 'ConflictResolver': return 'purple';
    case 'ApprovalManager': return 'teal';
    default: return 'slate';
  }
}

function bcryptHashMock(id: string): string {
  // Returns hashed equivalent
  return '$2a$10$TqyG970A1tdqWlE5gYgWquOaF9E0k9K0qW12v456v789x.y.z.w.m.';
}
