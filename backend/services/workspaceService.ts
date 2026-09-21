import { prisma, safeDbQuery } from './dbService';
import { ai } from './geminiService';
import { ingestDocument } from './ragEngine';
import { knowledgeFiles, startupProfile } from '../state';

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
  description?: string;
  idea?: string;
  fundingStage?: string;
  stage?: string;
  businessModel?: string;
  targetIcp?: string;
  newCustomers?: string;
  primaryProduct?: string;
  problem?: string;
  cashBalance?: number | string;
  monthlyBurn?: number | string;
  budget?: number | string;
  burnRate?: number | string;
  runway?: string;
  goals?: string[];
  priorities?: string[];
  path?: 'existing' | 'new';
  teamSize?: string | number;
  biggestChallenge?: string;
  timeline?: string;
  additionalInfo?: string;
}

export interface StartupAnalysisResult {
  summary: string;
  insights: string[];
  healthScore: number;
  metrics: {
    velocity: number;
    financialHealth: number;
    legalCompliance: number;
    growthRate: number;
    operationsEfficiency: number;
  };
  dossierMarkdown: string;
}

function parseFinancialNumber(val: any, defaultVal = 0): number {
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  if (!val || typeof val !== 'string') return defaultVal;
  const cleaned = val.replace(/,/g, '').trim();
  const kMatch = cleaned.match(/([\d.]+)\s*k/i);
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000;
  }
  const mMatch = cleaned.match(/([\d.]+)\s*m/i);
  if (mMatch) {
    return parseFloat(mMatch[1]) * 1000000;
  }
  const numMatch = cleaned.match(/[\d.]+/);
  if (numMatch) {
    const parsed = parseFloat(numMatch[0]);
    return isNaN(parsed) ? defaultVal : parsed;
  }
  return defaultVal;
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
   * Continuous AI Strategic Analysis for Startups
   * Evaluates the startup parameters, business viability, runway risk, and key execution metrics.
   */
  public async analyzeStartupProfile(payload: OnboardingPayload, runway: number): Promise<StartupAnalysisResult> {
    const startupName = payload.startupName || 'Catalyst Venture';
    const industry = payload.industry || 'Technology';
    const description = payload.description || payload.idea || 'Early-stage venture building specialized software.';
    const stage = payload.fundingStage || payload.stage || 'Pre-Seed';
    const icp = payload.targetIcp || payload.newCustomers || 'B2B software buyers';
    const problem = payload.problem || 'Market workflow inefficiency';
    const challenge = payload.biggestChallenge || 'Market customer acquisition and MVP delivery';
    const timeline = payload.timeline || '90 Days';
    const cash = parseFinancialNumber(payload.cashBalance ?? payload.budget, 250000);
    const burn = parseFinancialNumber(payload.monthlyBurn ?? payload.burnRate, 15000);

    // Fallback baseline in case AI model call is offline or throttled
    const fallbackSummary = `${startupName} is an emerging ${stage} venture in the ${industry} space addressing "${problem.slice(0, 100)}". With $${cash.toLocaleString()} in capital and a ${runway} month runway, the company is positioned to scale execution toward its ${timeline} milestone.`;
    const fallbackInsights = [
      `ICP Precision: Focus sales and marketing specifically on ${icp.slice(0, 80)} to optimize initial CAC.`,
      `Runway Management: Maintain strict governance over the $${burn.toLocaleString()}/mo burn rate to secure ${runway} months of operational runway.`,
      `Core Challenge Mitigation: Deploy dedicated sprints toward resolving: "${challenge.slice(0, 80)}".`,
      `Milestone Velocity: Align executive agents to deliver initial deliverables within the ${timeline} window.`
    ];
    const fallbackDossier = `# [Company Profile] ${startupName}

## Executive Summary
${fallbackSummary}

## Strategic Baseline & Core Proposition
- **Industry & Domain**: ${industry}
- **Stage**: ${stage}
- **Core Problem Solved**: ${problem}
- **Product & Vision**: ${description}
- **Ideal Customer Profile (ICP)**: ${icp}
- **Primary Operational Challenge**: ${challenge}
- **Target Milestone Horizon**: ${timeline}

## Financial Economics
- **Available Capital**: $${cash.toLocaleString()}
- **Monthly Burn**: $${burn.toLocaleString()} / month
- **Estimated Runway**: ${runway} months
- **Financial Status**: ${runway >= 12 ? 'Healthy capital runway (>12 months)' : runway >= 6 ? 'Adequate runway (6-12 months), requires milestone discipline' : 'Critical runway (<6 months), immediate revenue or funding required'}

## Key Strategic Directives for AI Executive Agents
1. **Atlas (CEO)**: Align cross-functional roadmap and strategic focus around target customers (${icp}).
2. **Aura (Finance)**: Ensure monthly cash outlays stay strictly within $${burn.toLocaleString()}/mo ceiling.
3. **Vector (Growth)**: Design customer acquisition and pilot outreach tailored to ${icp}.
4. **Nexus (Legal)**: Verify compliance safeguards, intellectual property protection, and customer agreement templates.
5. **Helix (Operations)**: Track delivery milestones to hit the ${timeline} delivery goal.
`;

    if (ai) {
      try {
        const prompt = `You are CatalystOS Executive Strategist AI. Analyze this startup and produce a structured JSON response:
Company: "${startupName}"
Industry: "${industry}"
Stage: "${stage}"
Product / Idea: "${description}"
Core Problem: "${problem}"
Target ICP: "${icp}"
Key Challenge: "${challenge}"
Milestone Timeline: "${timeline}"
Cash Balance: $${cash}
Monthly Burn: $${burn}
Runway Months: ${runway}
Additional Founder Notes: "${payload.additionalInfo || 'None'}"

Generate a valid JSON object matching this schema:
{
  "summary": "2-3 sentence strategic executive assessment of the company and operational posture.",
  "insights": [
    "Insight 1 (Growth & ICP)",
    "Insight 2 (Financial & Runway)",
    "Insight 3 (Product & Challenge)",
    "Insight 4 (Operations & Milestone)"
  ],
  "healthScore": 82, // integer 65-95 based on runway and clarity
  "metrics": {
    "velocity": 85,
    "financialHealth": 88,
    "legalCompliance": 90,
    "growthRate": 60,
    "operationsEfficiency": 82
  },
  "dossierMarkdown": "Full comprehensive markdown profile document starting with # [Company Profile] ${startupName} with Executive Overview, Market & ICP, Financial Economics, and Executive Directives."
}

Return ONLY valid JSON without markdown code blocks.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });

        const parsed = JSON.parse(response.text?.trim() || '{}');
        if (parsed.summary && Array.isArray(parsed.insights)) {
          return {
            summary: parsed.summary,
            insights: parsed.insights,
            healthScore: typeof parsed.healthScore === 'number' ? parsed.healthScore : 82,
            metrics: {
              velocity: parsed.metrics?.velocity || 80,
              financialHealth: parsed.metrics?.financialHealth || 85,
              legalCompliance: parsed.metrics?.legalCompliance || 90,
              growthRate: parsed.metrics?.growthRate || 65,
              operationsEfficiency: parsed.metrics?.operationsEfficiency || 80,
            },
            dossierMarkdown: parsed.dossierMarkdown || fallbackDossier
          };
        }
      } catch (err: any) {
        console.warn('[WorkspaceService] Gemini analysis fallback engaged:', err.message);
      }
    }

    return {
      summary: fallbackSummary,
      insights: fallbackInsights,
      healthScore: Math.min(95, Math.max(65, Math.round(70 + (runway > 12 ? 15 : runway * 1.2)))),
      metrics: {
        velocity: 80,
        financialHealth: runway > 12 ? 90 : runway > 6 ? 75 : 60,
        legalCompliance: 90,
        growthRate: 65,
        operationsEfficiency: 82,
      },
      dossierMarkdown: fallbackDossier
    };
  }

  /**
   * Initializes or updates a startup workspace for a user with canonical context.
   * Runs continuous AI strategic analysis and generates/updates the living Knowledge Base dossier.
   */
  public async saveOnboardingData(userId: string, payload: OnboardingPayload): Promise<CanonicalStartupContext> {
    const rawCash = payload.cashBalance !== undefined ? payload.cashBalance : payload.budget;
    const rawBurn = payload.monthlyBurn !== undefined ? payload.monthlyBurn : payload.burnRate;
    const cash = parseFinancialNumber(rawCash, 250000);
    const burn = parseFinancialNumber(rawBurn, 15000);
    const runway = burn > 0 ? parseFloat((cash / burn).toFixed(1)) : 999;

    const startupName = payload.startupName?.trim() || 'Catalyst Venture';
    const industry = payload.industry?.trim() || 'Technology';
    const description = (payload.description || payload.idea || payload.problem || 'Technology venture building innovative software.').trim();
    const fundingStage = payload.fundingStage || payload.stage || 'Pre-Seed';
    const targetIcp = payload.targetIcp || payload.newCustomers || '';
    const problem = payload.problem || '';
    const challenge = payload.biggestChallenge || '';
    const timeline = payload.timeline || '90 Days';

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

    // 2. Perform AI Strategic Analysis on this startup's details
    console.log(`[WorkspaceService] Running AI strategic analysis for "${startupName}"...`);
    const analysis = await this.analyzeStartupProfile(
      {
        ...payload,
        startupName,
        industry,
        description,
        fundingStage,
        targetIcp,
        problem,
        biggestChallenge: challenge,
        timeline,
        cashBalance: cash,
        monthlyBurn: burn,
      },
      runway
    );

    // 3. Find existing startup or create fresh one
    let startup = await safeDbQuery(() => prisma.startup.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' }
    }));

    if (startup) {
      startup = await safeDbQuery(() => prisma.startup.update({
        where: { id: startup!.id },
        data: {
          name: startupName,
          industry,
          description,
          fundingStage,
          cashBalance: cash,
          burnRate: burn,
          healthScore: analysis.healthScore,
        }
      }));
    } else {
      startup = await safeDbQuery(() => prisma.startup.create({
        data: {
          name: startupName,
          industry,
          description,
          fundingStage,
          cashBalance: cash,
          burnRate: burn,
          healthScore: analysis.healthScore,
          ownerId: userId
        }
      }));
    }

    const startupId = startup.id;

    // Synchronize startup_contexts table if available
    try {
      await safeDbQuery(() => (prisma as any).startup_contexts.upsert({
        where: { id: startupId },
        create: {
          id: startupId,
          company_name: startupName,
          industry,
          target_icp: targetIcp || null,
          current_monthly_burn: burn,
          cash_on_hand: cash,
        },
        update: {
          company_name: startupName,
          industry,
          target_icp: targetIcp || null,
          current_monthly_burn: burn,
          cash_on_hand: cash,
        }
      }));
    } catch (scErr: any) {
      // Non-fatal if table schema varies
      console.warn('[WorkspaceService] startup_contexts sync note:', scErr.message);
    }

    // 4. Initialize 8 default Executive Agents if not present
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

    // 5. Save business context memories (ICP, product, model, challenge, goals)
    if (targetIcp) {
      await safeDbQuery(() => prisma.memory.create({
        data: {
          category: 'BUSINESS_ICP',
          title: 'Target Ideal Customer Profile (ICP)',
          description: targetIcp,
          startupId
        }
      }));
    }
    if (problem) {
      await safeDbQuery(() => prisma.memory.create({
        data: {
          category: 'PROBLEM_STATEMENT',
          title: 'Core Problem Statement',
          description: problem,
          startupId
        }
      }));
    }
    if (challenge) {
      await safeDbQuery(() => prisma.memory.create({
        data: {
          category: 'KEY_CHALLENGE',
          title: 'Primary Operational Challenge',
          description: challenge,
          startupId
        }
      }));
    }
    if (timeline) {
      await safeDbQuery(() => prisma.memory.create({
        data: {
          category: 'TIMELINE',
          title: 'Target Milestone Timeline',
          description: timeline,
          startupId
        }
      }));
    }
    if (payload.primaryProduct || description) {
      await safeDbQuery(() => prisma.memory.create({
        data: {
          category: 'PRIMARY_PRODUCT',
          title: 'Primary Product / Service Offering',
          description: payload.primaryProduct || description,
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

    // 6. Create or update the living Knowledge Base document: [Company Profile]
    const docId = `doc_profile_${startupId}`;
    const docName = `[Company Profile] ${startupName}`;
    const docType = 'business_plan';
    const dossierText = analysis.dossierMarkdown;
    const docSize = `${(dossierText.length / 1024).toFixed(1)} KB`;

    try {
      const existingDoc = await safeDbQuery(() => prisma.startupDocument.findUnique({
        where: { id: docId }
      }));

      let savedDoc;
      if (existingDoc) {
        savedDoc = await safeDbQuery(() => prisma.startupDocument.update({
          where: { id: docId },
          data: {
            name: docName,
            type: docType,
            size: docSize,
            summary: analysis.summary,
            insights: analysis.insights,
            updatedAt: new Date()
          }
        }));
      } else {
        savedDoc = await safeDbQuery(() => prisma.startupDocument.create({
          data: {
            id: docId,
            name: docName,
            type: docType,
            size: docSize,
            summary: analysis.summary,
            insights: analysis.insights,
            startupId
          }
        }));
      }

      // Automatically chunk, embed, and index into Neon PostgreSQL RAG storage
      await ingestDocument(docId, dossierText, docName, docType);
      console.log(`[WorkspaceService] Knowledge document "${docName}" indexed and ready in Knowledge Center.`);

      // Update in-memory knowledgeFiles
      const memoryDoc = {
        id: savedDoc.id,
        name: savedDoc.name,
        type: savedDoc.type as any,
        size: savedDoc.size,
        uploadDate: savedDoc.createdAt.toISOString(),
        summary: savedDoc.summary,
        insights: savedDoc.insights
      };
      const existingIdx = knowledgeFiles.findIndex(f => f.id === docId);
      if (existingIdx >= 0) {
        knowledgeFiles[existingIdx] = memoryDoc;
      } else {
        knowledgeFiles.unshift(memoryDoc);
      }

      // Operational notification
      await safeDbQuery(() => prisma.notification.create({
        data: {
          startupId,
          type: 'DOCUMENT',
          title: 'Knowledge Base Ready',
          message: `Company profile for "${startupName}" has been analyzed by AI and indexed into the Knowledge Center.`,
          read: false
        }
      })).catch(() => {});
    } catch (docErr: any) {
      console.error('[WorkspaceService] Error creating profile knowledge document:', docErr.message);
    }

    // 7. Update in-memory startupProfile state
    startupProfile.name = startupName;
    startupProfile.industry = industry;
    startupProfile.description = description;
    startupProfile.fundingStage = fundingStage;
    startupProfile.cashBalance = cash;
    startupProfile.burnRate = burn;
    startupProfile.runwayMonths = runway;
    startupProfile.healthScore = analysis.healthScore;
    startupProfile.metrics = analysis.metrics;

    // 8. Create initial Timeline Item
    await safeDbQuery(() => prisma.timelineItem.create({
      data: {
        title: 'Startup Profile Analyzed & Indexed',
        content: `Completed onboarding analysis for ${startupName} (${industry}). Health Score: ${analysis.healthScore}%. Runway: ${runway} months.`,
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
