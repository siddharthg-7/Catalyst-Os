import { prisma, safeDbQuery } from './dbService';

export interface CanonicalStartupContext {
  startupId: string;
  ownerId: string;
  founder: {
    name: string;
    role: string;
    email: string;
  };
  startup: {
    name: string;
    description: string;
    industry: string;
    stage: string;
  };
  business: {
    model: string;
    targetIcp: string;
    primaryProduct: string;
  };
  financials: {
    cashBalance: number;
    monthlyBurn: number;
    runwayMonths: number;
  };
  goals: string[];
  priorities: string[];
  milestones: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: string;
  }>;
  recentDecisions: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    financialImpact: number;
    status: string;
    createdAt: string;
  }>;
  pendingApprovals: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    financialChange: number;
    status: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    size: string;
    summary: string;
  }>;
  agents: Array<{
    id: string;
    role: string;
    name: string;
    status: string;
    currentTask?: string | null;
  }>;
}

export interface OnboardingPayload {
  founderName?: string;
  founderRole?: string;
  startupName: string;
  industry: string;
  description: string;
  fundingStage?: string;
  businessModel?: string;
  targetIcp?: string;
  primaryProduct?: string;
  cashBalance: number;
  monthlyBurn: number;
  goals?: string[];
  priorities?: string[];
}

// 8 Canonical Executive Agents specified in PROMPT.MD Sections 24 & 25
export const DEFAULT_EXECUTIVE_ROLES = [
  { role: 'CEO', name: 'Atlas', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', description: 'Autonomous corporate strategist & CEO orchestrator.' },
  { role: 'Finance', name: 'Aura', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', description: 'Chief Financial Officer: unit economics, cash burn, and runway governance.' },
  { role: 'Talent', name: 'Echo', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', description: 'Head of People & Recruiting: talent acquisition, hiring roadmaps, compensation.' },
  { role: 'Growth', name: 'Vector', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', description: 'VP of Growth & Marketing: ICP positioning, CAC/LTV, demand generation.' },
  { role: 'Legal', name: 'Nexus', avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150', description: 'General Counsel: IP protection, compliance, commercial contracts, regulatory safeguards.' },
  { role: 'Operations', name: 'Helix', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', description: 'VP of Operations: cross-functional milestone tracking, delivery, workflow velocity.' },
  { role: 'Investment', name: 'Apex', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150', description: 'Head of Capital & Investor Relations: fundraising strategy, cap table modeling.' },
  { role: 'Auditor', name: 'Sentry', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150', description: 'Compliance & Verification Auditor: math accuracy, evidence grounding, hallucination prevention.' },
];

// In-memory cache strictly keyed by startupId (Section 35)
const workspaceCache = new Map<string, { context: CanonicalStartupContext; cachedAt: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

export class WorkspaceService {
  /**
   * Initializes or updates a startup workspace for a user with canonical context.
   */
  public async saveOnboardingData(userId: string, payload: OnboardingPayload): Promise<CanonicalStartupContext> {
    const cash = Number(payload.cashBalance) || 0;
    const burn = Number(payload.monthlyBurn) || 0;
    const runway = burn > 0 ? parseFloat((cash / burn).toFixed(1)) : 999;

    // 1. Ensure user exists
    let user = await safeDbQuery(() => prisma.user.findUnique({ where: { id: userId } }));
    if (!user) {
      user = await safeDbQuery(() => prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@catalyst.os`,
          name: payload.founderName || 'Founder',
          role: payload.founderRole || 'Founder'
        }
      }));
    } else if (payload.founderName || payload.founderRole) {
      user = await safeDbQuery(() => prisma.user.update({
        where: { id: userId },
        data: {
          name: payload.founderName || user?.name,
          role: payload.founderRole || user?.role
        }
      }));
    }

    // 2. Find existing startup or create fresh one
    let startup = await safeDbQuery(() => prisma.startup.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    }));

    if (startup) {
      startup = await safeDbQuery(() => prisma.startup.update({
        where: { id: startup!.id },
        data: {
          name: payload.startupName,
          industry: payload.industry,
          description: payload.description,
          fundingStage: payload.fundingStage || 'Pre-Seed',
          cashBalance: cash,
          burnRate: burn,
          healthScore: 80,
        }
      }));
    } else {
      startup = await safeDbQuery(() => prisma.startup.create({
        data: {
          name: payload.startupName,
          industry: payload.industry,
          description: payload.description,
          fundingStage: payload.fundingStage || 'Pre-Seed',
          cashBalance: cash,
          burnRate: burn,
          healthScore: 80,
          ownerId: userId
        }
      }));
    }

    const startupId = startup.id;

    // 3. Initialize 8 default Executive Agents if not present
    const existingAgents = await safeDbQuery(() => prisma.executiveAgent.findMany({
      where: { startupId }
    }));

    if (!existingAgents || existingAgents.length === 0) {
      for (const agentDef of DEFAULT_EXECUTIVE_ROLES) {
        await safeDbQuery(() => prisma.executiveAgent.create({
          data: {
            role: agentDef.role,
            name: agentDef.name,
            avatar: agentDef.avatar,
            status: 'idle',
            startupId
          }
        }));
      }
    }

    // 4. Save business context memories (ICP, product, model, goals)
    if (payload.targetIcp) {
      await safeDbQuery(() => prisma.memory.create({
        data: {
          category: 'BUSINESS_ICP',
          title: 'Target Ideal Customer Profile (ICP)',
          description: payload.targetIcp!,
          startupId
        }
      }));
    }
    if (payload.primaryProduct) {
      await safeDbQuery(() => prisma.memory.create({
        data: {
          category: 'PRIMARY_PRODUCT',
          title: 'Primary Product / Service Offering',
          description: payload.primaryProduct!,
          startupId
        }
      }));
    }
    if (payload.goals && payload.goals.length > 0) {
      for (const goal of payload.goals) {
        await safeDbQuery(() => prisma.memory.create({
          data: {
            category: 'GOAL',
            title: 'Strategic Startup Goal',
            description: goal,
            startupId
          }
        }));
      }
    }

    // 5. Create initial Timeline Item
    await safeDbQuery(() => prisma.timelineItem.create({
      data: {
        title: 'Startup Workspace Initialized',
        content: `Completed onboarding for ${payload.startupName} in ${payload.industry}. Baseline runway: ${runway} months.`,
        type: 'milestone',
        startupId
      }
    }));

    // Invalidate memory cache for this startup
    workspaceCache.delete(startupId);

    // Return fresh canonical context
    return this.getCanonicalContext(startupId);
  }

  /**
   * Retrieves the structured canonical StartupContext from PostgreSQL.
   */
  public async getCanonicalContext(startupIdOrUserId: string): Promise<CanonicalStartupContext | null> {
    // 1. Resolve startup
    let startup = await safeDbQuery(() => prisma.startup.findFirst({
      where: {
        OR: [
          { id: startupIdOrUserId },
          { ownerId: startupIdOrUserId }
        ]
      },
      include: {
        owner: true,
        agents: true,
        documents: { orderBy: { createdAt: 'desc' } },
        decisions: { orderBy: { createdAt: 'desc' }, take: 10 },
        plans: {
          include: {
            approvals: { where: { status: 'pending_review' } }
          }
        },
        timeline: { orderBy: { createdAt: 'desc' }, take: 10 },
        memories: true
      }
    }));

    if (!startup) {
      return null;
    }

    const startupId = startup.id;

    // Check cache
    const cached = workspaceCache.get(startupId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.context;
    }

    // Extract memories
    const icpMemory = startup.memories.find(m => m.category === 'BUSINESS_ICP')?.description || '';
    const productMemory = startup.memories.find(m => m.category === 'PRIMARY_PRODUCT')?.description || '';
    const goals = startup.memories.filter(m => m.category === 'GOAL').map(m => m.description);
    const priorities = startup.memories.filter(m => m.category === 'PRIORITY').map(m => m.description);

    // Extract pending approvals
    const pendingApprovals: any[] = [];
    startup.plans.forEach(p => {
      p.approvals.forEach(a => {
        pendingApprovals.push({
          id: a.id,
          title: a.title,
          description: a.description,
          type: a.type,
          financialChange: a.financialChange,
          status: a.status
        });
      });
    });

    const cash = startup.cashBalance;
    const burn = startup.burnRate;
    const runway = burn > 0 ? parseFloat((cash / burn).toFixed(1)) : 999;

    const canonical: CanonicalStartupContext = {
      startupId: startup.id,
      ownerId: startup.ownerId,
      founder: {
        name: startup.owner?.name || 'Founder',
        role: startup.owner?.role || 'Founder',
        email: startup.owner?.email || ''
      },
      startup: {
        name: startup.name,
        description: startup.description,
        industry: startup.industry,
        stage: startup.fundingStage
      },
      business: {
        model: 'Subscription SaaS / Transactional',
        targetIcp: icpMemory || startup.description,
        primaryProduct: productMemory || startup.description
      },
      financials: {
        cashBalance: cash,
        monthlyBurn: burn,
        runwayMonths: runway
      },
      goals: goals.length > 0 ? goals : ['Accelerate Product-Market Fit', 'Scale Customer Acquisition'],
      priorities: priorities.length > 0 ? priorities : ['Core Product Milestones', 'Cash Preservation'],
      milestones: startup.timeline.map(t => ({
        id: t.id,
        title: t.title,
        content: t.content,
        type: t.type,
        createdAt: t.createdAt.toISOString()
      })),
      recentDecisions: startup.decisions.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        financialImpact: d.financialImpact,
        status: d.status,
        createdAt: d.createdAt.toISOString()
      })),
      pendingApprovals,
      documents: startup.documents.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size,
        summary: d.summary
      })),
      agents: startup.agents.map(a => ({
        id: a.id,
        role: a.role,
        name: a.name,
        status: a.status,
        currentTask: a.currentTask
      }))
    };

    workspaceCache.set(startupId, { context: canonical, cachedAt: Date.now() });
    return canonical;
  }

  /**
   * Invalidates cached context for a startup.
   */
  public invalidateCache(startupId: string) {
    workspaceCache.delete(startupId);
  }
}

export const workspaceService = new WorkspaceService();
