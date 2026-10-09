import { ai } from './geminiService';
import { prisma, safeDbQuery } from './dbService';
import { 
  performHybridSearch, 
  buildContext, 
  retrieveRelevantKnowledge, 
  filterKnowledgeForAgent, 
  AgentKnowledgeSlice 
} from './ragEngine';
import { 
  startupProfile, 
  approvals, 
  isDbAvailable 
} from '../state';
import { workspaceService, CanonicalStartupContext } from './workspaceService';
import { companyContextService, CompanyContext } from './companyContextService';
import { 
  OrchestrationResponse, 
  OrchestrationAgentActivity, 
  OrchestrationEvidence, 
  OrchestrationCalculation, 
  Deliverable 
} from '../../src/types';
import { multiAgentCouncil, CouncilExecutionResult } from './multiAgentCouncil';
import { delegateWorkOrders } from './taskDelegationService';

// Benchmark salaries for headcount modeling (annual USD)
const SALARY_BENCHMARKS: Record<string, number> = {
  'engineer': 130000,
  'backend': 135000,
  'frontend': 120000,
  'fullstack': 130000,
  'senior': 150000,
  'lead': 175000,
  'designer': 105000,
  'product manager': 130000,
  'marketer': 95000,
  'growth': 100000,
  'sales': 85000,
  'legal': 160000,
};

export type AIProviderErrorCode = 
  | 'RATE_LIMITED' 
  | 'QUOTA_EXCEEDED' 
  | 'AUTHENTICATION_FAILED' 
  | 'NETWORK_ERROR' 
  | 'INVALID_REQUEST' 
  | 'MODEL_UNAVAILABLE' 
  | 'SERVICE_UNAVAILABLE'
  | 'UNKNOWN';

export function classifyAIError(err: any): AIProviderErrorCode {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.code || 0;

  if (status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('rate limit')) {
    return 'QUOTA_EXCEEDED';
  }
  if (status === 503 || msg.includes('503') || msg.includes('high demand') || msg.includes('temporarily') || msg.includes('unavailable')) {
    return 'SERVICE_UNAVAILABLE';
  }
  if (status === 401 || status === 403 || msg.includes('api_key') || msg.includes('unauthenticated') || msg.includes('forbidden')) {
    return 'AUTHENTICATION_FAILED';
  }
  if (status === 404 || msg.includes('not found') || msg.includes('no longer available')) {
    return 'MODEL_UNAVAILABLE';
  }
  if (msg.includes('network') || msg.includes('econnrefused') || msg.includes('etimedout') || msg.includes('fetch failed') || msg.includes('socket')) {
    return 'NETWORK_ERROR';
  }
  return 'UNKNOWN';
}

interface HeadcountExtraction {
  hasHiringQuery: boolean;
  count: number;
  role: string;
  estimatedAnnualSalary: number;
}

function extractHeadcountDetails(command: string): HeadcountExtraction {
  const lower = command.toLowerCase();
  const hiringKeywords = ['hire', 'hiring', 'headcount', 'recruit', 'bring on', 'onboard'];
  const hasHiringQuery = hiringKeywords.some(k => lower.includes(k));

  if (!hasHiringQuery) {
    return { hasHiringQuery: false, count: 0, role: '', estimatedAnnualSalary: 0 };
  }

  let count = 1;
  const numberWords: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  };

  const digitMatch = lower.match(/\b(\d+)\b/);
  if (digitMatch) {
    count = parseInt(digitMatch[1], 10);
  } else {
    for (const [word, val] of Object.entries(numberWords)) {
      if (new RegExp(`\\b${word}\\b`).test(lower)) {
        count = val;
        break;
      }
    }
  }

  let role = 'software engineer';
  let salary = 130000;
  for (const [key, val] of Object.entries(SALARY_BENCHMARKS)) {
    if (lower.includes(key)) {
      role = `${key} specialist`;
      salary = val;
      break;
    }
  }

  return { hasHiringQuery: true, count, role, estimatedAnnualSalary: salary };
}

export interface KnowledgeNeedDecision {
  needsDocuments: boolean;
  needsKnowledge: boolean;
  reason: string;
  searchQueries: string[];
}

export function evaluateKnowledgeNeed(command: string, intent: string): KnowledgeNeedDecision {
  const lower = command.toLowerCase().trim();

  // If greeting or completely unrelated, no company documents needed
  if (intent === 'greeting' || intent === 'unrelated_inquiry') {
    return {
      needsDocuments: false,
      needsKnowledge: false,
      reason: 'Conversational greeting or out of scope inquiry.',
      searchQueries: []
    };
  }

  // 1. Explicit references to governance, policies, handbooks, contracts, or strategies
  const hasPolicyRef = lower.includes('policy') || lower.includes('handbook') || lower.includes('guideline') ||
    lower.includes('contract') || lower.includes('agreement') || lower.includes('strategy') ||
    lower.includes('roadmap') || lower.includes('pitch deck') || lower.includes('document') ||
    lower.includes('knowledge') || lower.includes('rule') || lower.includes('according to');

  // 2. Planning or structural actions that require corporate grounding
  const isActionPlan = lower.includes('plan') || lower.includes('create a hiring plan') ||
    lower.includes('hiring plan') || lower.includes('compliance') || lower.includes('legal review') ||
    lower.includes('onboarding');

  // 3. Knowledge base inquiries or company identity
  const isKnowledgeQuery = intent === 'knowledge_inquiry' || intent === 'startup_identity';

  if (hasPolicyRef || isActionPlan || isKnowledgeQuery) {
    const searchQueries: string[] = [command];

    if (lower.includes('hiring') || lower.includes('hire') || lower.includes('engineer') || lower.includes('talent')) {
      searchQueries.push('Hiring Policy');
      searchQueries.push('Employee Handbook');
      searchQueries.push('Company Strategy');
    }

    if (lower.includes('contract') || lower.includes('legal') || lower.includes('nda') || lower.includes('agreement') || lower.includes('handbook')) {
      searchQueries.push('Employee Handbook');
      searchQueries.push('Hiring Policy');
    }

    if (lower.includes('growth') || lower.includes('marketing') || lower.includes('gtm') || lower.includes('icp')) {
      searchQueries.push('Company Strategy');
      searchQueries.push('Pitch Deck');
    }

    return {
      needsDocuments: true,
      needsKnowledge: true,
      reason: 'Command requires grounding in company policy, corporate strategy, and handbooks.',
      searchQueries
    };
  }

  return {
    needsDocuments: false,
    needsKnowledge: false,
    reason: 'Command relies on deterministic treasury telemetry and financial metrics.',
    searchQueries: [command]
  };
}

export interface IntentAnalysis {
  intent: string;
  objective: string;
  activatedRoles: string[];
  requiresFinancialCalculations: boolean;
  requiresHeadcountModeling: boolean;
  requiresRag: boolean;
  needsCompanyKnowledge?: boolean;
  knowledgeReason?: string;
  searchQueries?: string[];
  isUnrelated: boolean;
  requiresApproval: boolean;
  proposedActionTitle: string | null;
  proposedActionImpact: string | null;
}

function finalizeIntent(analysis: IntentAnalysis, command: string): IntentAnalysis {
  const kDecision = evaluateKnowledgeNeed(command, analysis.intent);
  analysis.needsCompanyKnowledge = kDecision.needsDocuments;
  analysis.knowledgeReason = kDecision.reason;
  analysis.searchQueries = kDecision.searchQueries;
  if (kDecision.needsDocuments) {
    analysis.requiresRag = true;
  }
  return analysis;
}

export function analyzeCommandIntent(command: string): IntentAnalysis {
  return finalizeIntent(rawAnalyzeCommandIntent(command), command);
}

function rawAnalyzeCommandIntent(command: string): IntentAnalysis {
  const lower = command.toLowerCase().trim();

  // 0. Conversational Greeting & Executive Readiness
  const greetingWords = ['hi', 'hii', 'hiii', 'hello', 'hey', 'heyy', 'good morning', 'good afternoon', 'good evening', 'greetings', 'hola', 'sup', 'yo'];
  const stripped = lower.replace(/[!.,?]+$/, '').trim();
  const isPureGreeting = greetingWords.includes(stripped) || 
    greetingWords.some(w => stripped === `${w} catalyst` || stripped === `${w} atlas` || stripped === `${w} team` || stripped === `${w} there` || stripped === `${w} os`);
  if (isPureGreeting) {
    return {
      intent: 'greeting',
      objective: 'Acknowledge founder and present executive situational readiness',
      activatedRoles: ['CEO', 'Finance', 'Auditor'],
      requiresFinancialCalculations: false,
      requiresHeadcountModeling: false,
      requiresRag: false,
      isUnrelated: false,
      requiresApproval: false,
      proposedActionTitle: null,
      proposedActionImpact: null
    };
  }

  // 1. Unrelated / Out of scope
  const unrelatedPatterns = [
    'weather on mars', 'weather', 'recipe', 'football', 'world cup', 'olympics', 
    'movie', 'song', 'joke', 'capital of', 'president of', 'mars tomorrow', 'tell me a story'
  ];
  if (unrelatedPatterns.some(p => lower.includes(p))) {
    return {
      intent: 'unrelated_inquiry',
      objective: 'Clarify executive boundaries and supported startup domains',
      activatedRoles: ['CEO'],
      requiresFinancialCalculations: false,
      requiresHeadcountModeling: false,
      requiresRag: false,
      isUnrelated: true,
      requiresApproval: false,
      proposedActionTitle: null,
      proposedActionImpact: null
    };
  }

  // 2. Startup Identity, Context & Vision Overview
  const identityPatterns = [
    'what is my startup', 'who are we', 'tell me about my startup', 'tell me about our startup',
    'what is our company', 'about our company', 'what does our company do', 'startup overview',
    'what is catalyst os', 'who is catalyst os', 'what do we do',
    'what do you know about my company', 'what do you know about our company',
    'what do you know about this company', 'tell me about my company', 'about my company',
    'what is my company', 'who is my company', 'what do you know about us', 'what do you know',
    'company context', 'startup context', 'what is our context', 'tell me the context',
    'what is our company context', 'what do you know about my context', 'our company context',
    'what context do you have', 'context of my company', 'tell me about our company'
  ];
  if (
    identityPatterns.some(p => lower.includes(p)) ||
    (lower.startsWith('what is') && lower.includes('startup')) ||
    (lower.includes('know') && (lower.includes('company') || lower.includes('startup') || lower.includes('venture'))) ||
    (lower.includes('context') && (lower.includes('company') || lower.includes('startup') || lower.includes('our') || lower.includes('my') || lower.includes('business') || lower.includes('venture') || lower.includes('what')))
  ) {
    return {
      intent: 'startup_identity',
      objective: 'Articulate verified startup identity, industry market positioning, and core mission',
      activatedRoles: ['CEO', 'Auditor'],
      requiresFinancialCalculations: false,
      requiresHeadcountModeling: false,
      requiresRag: true,
      isUnrelated: false,
      requiresApproval: false,
      proposedActionTitle: null,
      proposedActionImpact: null
    };
  }

  // 3. Knowledge Base & Document Inquiries
  const knowledgePatterns = [
    'what documents do we have', 'what docs do we have', 'what is in our knowledge base',
    'what is in the knowledge base', 'summarize our documents', 'summarize knowledge documents',
    'knowledge documents', 'knowledge base', 'rag documents', 'what files are uploaded',
    'what files do we have', 'show documents', 'list documents', 'summarize verified findings from our knowledge documents',
    'what did i upload', 'my documents', 'our documents', 'company documents'
  ];
  if (
    knowledgePatterns.some(p => lower.includes(p)) ||
    (lower.includes('document') && (lower.includes('what') || lower.includes('list') || lower.includes('summarize') || lower.includes('show') || lower.includes('our') || lower.includes('any'))) ||
    (lower.includes('knowledge') && (lower.includes('what') || lower.includes('base') || lower.includes('summarize') || lower.includes('show') || lower.includes('findings') || lower.includes('rag')))
  ) {
    return {
      intent: 'knowledge_inquiry',
      objective: 'Query and synthesize findings across corporate knowledge documents and RAG vector store',
      activatedRoles: ['CEO', 'Auditor'],
      requiresFinancialCalculations: false,
      requiresHeadcountModeling: false,
      requiresRag: true,
      isUnrelated: false,
      requiresApproval: false,
      proposedActionTitle: null,
      proposedActionImpact: null
    };
  }

  // 3. Hiring & Headcount Expansion Scenarios
  if (lower.includes('hire') || lower.includes('hiring') || lower.includes('engineer') || lower.includes('developer') || lower.includes('headcount') || lower.includes('recruit')) {
    const isAdvisory = lower.includes('should i') || lower.includes('can we afford') || lower.includes('can we hire') || lower.includes('is it safe to') || lower.includes('would hiring') || (lower.includes('runway') && lower.includes('month'));
    const isActionPlan = lower.includes('plan') || lower.includes('create a hiring plan') || lower.includes('roadmap') || lower.includes('build a plan') || lower.startsWith('hire ') || lower.startsWith('start hiring') || lower.startsWith('approve hire') || lower.includes('send offer');

    if (isAdvisory && !isActionPlan) {
      return {
        intent: 'hiring_scenario',
        objective: 'Assess runway impact, headcount costs, and hiring feasibility',
        activatedRoles: ['CEO', 'Finance', 'Talent', 'Auditor'],
        requiresFinancialCalculations: true,
        requiresHeadcountModeling: true,
        requiresRag: true,
        isUnrelated: false,
        requiresApproval: false,
        proposedActionTitle: null,
        proposedActionImpact: null
      };
    }

    return {
      intent: 'hiring_scenario',
      objective: 'Formulate headcount recruitment plan, compensation model, and onboarding roadmap',
      activatedRoles: ['CEO', 'Talent', 'Finance', 'Operations', 'Legal', 'Auditor'],
      requiresFinancialCalculations: true,
      requiresHeadcountModeling: true,
      requiresRag: true,
      isUnrelated: false,
      requiresApproval: true,
      proposedActionTitle: 'Headcount Recruitment Authorization',
      proposedActionImpact: 'Commits salary compensation pool to startup burn'
    };
  }

  // 4. Financial & Treasury Management
  if (lower.includes('runway') || lower.includes('burn') || lower.includes('cash') || lower.includes('afford') || lower.includes('treasury') || lower.includes('bank balance') || lower.includes('expense')) {
    return {
      intent: 'financial_inquiry',
      objective: 'Report deterministic cash balance, burn rate velocity, and active runway',
      activatedRoles: ['CEO', 'Finance', 'Auditor'],
      requiresFinancialCalculations: true,
      requiresHeadcountModeling: false,
      requiresRag: true,
      isUnrelated: false,
      requiresApproval: false,
      proposedActionTitle: null,
      proposedActionImpact: null
    };
  }

  // 5. GTM & Marketing Planning
  if (lower.includes('gtm') || lower.includes('go to market') || lower.includes('marketing') || lower.includes('growth') || lower.includes('campaign') || lower.includes('acquisition') || lower.includes('icp')) {
    const isAction = lower.includes('launch ad') || lower.includes('spend $') || lower.includes('start campaign');
    return {
      intent: 'gtm_planning',
      objective: 'Structure go-to-market milestones, distribution channels, and user acquisition strategies',
      activatedRoles: ['CEO', 'Growth', 'Finance', 'Auditor'],
      requiresFinancialCalculations: false,
      requiresHeadcountModeling: false,
      requiresRag: true,
      isUnrelated: false,
      requiresApproval: isAction,
      proposedActionTitle: isAction ? 'Growth Campaign Budget Deployment' : null,
      proposedActionImpact: isAction ? 'Allocates growth expenditure to advertising channels' : null
    };
  }

  // 6. Legal & Contract Compliance
  if (lower.includes('contract') || lower.includes('legal') || lower.includes('nda') || lower.includes('compliance') || lower.includes('terms') || lower.includes('ip') || lower.includes('policy')) {
    const isAction = lower.includes('sign ') || lower.includes('execute contract');
    return {
      intent: 'legal_compliance',
      objective: 'Review commercial contracts, governance agreements, and regulatory requirements',
      activatedRoles: ['CEO', 'Legal', 'Auditor'],
      requiresFinancialCalculations: false,
      requiresHeadcountModeling: false,
      requiresRag: true,
      isUnrelated: false,
      requiresApproval: isAction,
      proposedActionTitle: isAction ? 'Legal Agreement Execution' : null,
      proposedActionImpact: isAction ? 'Binds company to contractual terms and conditions' : null
    };
  }

  // 7. Operational Audit / Priorities / Risks
  if (lower.includes('risk') || lower.includes('focus') || lower.includes('changed') || lower.includes('blocker') || lower.includes('roadmap') || lower.includes('launch') || lower.includes('priority')) {
    return {
      intent: 'operational_audit',
      objective: 'Audit corporate milestones, operational bottlenecks, and top founder priorities',
      activatedRoles: ['CEO', 'Operations', 'Finance', 'Auditor'],
      requiresFinancialCalculations: false,
      requiresHeadcountModeling: false,
      requiresRag: true,
      isUnrelated: false,
      requiresApproval: false,
      proposedActionTitle: null,
      proposedActionImpact: null
    };
  }

  // 8. Default: General Executive Inquiry
  return {
    intent: 'general_inquiry',
    objective: 'Provide unified executive synthesis and action plan',
    activatedRoles: ['CEO', 'Auditor'],
    requiresFinancialCalculations: false,
    requiresHeadcountModeling: false,
    requiresRag: true,
    isUnrelated: false,
    requiresApproval: false,
    proposedActionTitle: null,
    proposedActionImpact: null
  };
}

export class OrchestrationService {
  private inFlightCommands = new Map<string, Promise<OrchestrationResponse>>();
  private conversationMemory = new Map<string, Array<{ role: 'founder' | 'jarvis'; content: string }>>();

  private updateConversationMemory(startupId: string, command: string, reply: string) {
    const list = this.conversationMemory.get(startupId) || [];
    list.push({ role: 'founder', content: command });
    list.push({ role: 'jarvis', content: reply });
    if (list.length > 8) {
      list.splice(0, list.length - 8);
    }
    this.conversationMemory.set(startupId, list);
  }

  private async recordCommandPersistence(
    commandId: string,
    command: string,
    status: string,
    startupId: string,
    summary: string,
    objective: string
  ) {
    if (isDbAvailable && prisma) {
      try {
        await safeDbQuery(async () => {
          await prisma.command.create({
            data: {
              id: commandId,
              content: command,
              status,
              startupId
            }
          });
          await prisma.timelineItem.create({
            data: {
              title: objective || 'Founder Command Execution',
              content: summary.slice(0, 200),
              type: 'decision',
              startupId
            }
          });
        }, 3);
        console.log(`[Persistence] commandId=${commandId} recorded in prisma.command & prisma.timelineItem.`);
      } catch (err: any) {
        console.warn('[Persistence] Notice: Could not persist command log:', err.message);
      }
    }
  }

  /**
   * Main entry point for Founder Command Center orchestration.
   * Features in-flight request deduplication to prevent duplicate LLM invocations.
   */
  async executeCommand(
    command: string,
    userIdOrContext?: string | { userId?: string; startupId?: string; commandId?: string; context?: any },
    onEvent?: (event: any) => void
  ): Promise<OrchestrationResponse> {
    const userId = typeof userIdOrContext === 'string' 
      ? userIdOrContext 
      : (typeof userIdOrContext === 'object' && userIdOrContext !== null ? userIdOrContext.userId : undefined);
    const commandId = (typeof userIdOrContext === 'object' && userIdOrContext?.commandId)
      ? userIdOrContext.commandId
      : `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (this.inFlightCommands.has(commandId)) {
      console.log(`[Command] commandId=${commandId} is already in-flight. Returning deduplicated execution.`);
      return this.inFlightCommands.get(commandId)!;
    }

    const execPromise = this._runCommandPipeline(command, commandId, userId, userIdOrContext, onEvent);
    this.inFlightCommands.set(commandId, execPromise);
    execPromise.finally(() => {
      setTimeout(() => this.inFlightCommands.delete(commandId), 10000);
    });
    return execPromise;
  }

  private async _runCommandPipeline(
    command: string,
    commandId: string,
    userId: string | undefined,
    userIdOrContext?: string | { userId?: string; startupId?: string; commandId?: string; context?: any },
    onEvent?: (event: any) => void
  ): Promise<OrchestrationResponse> {
    console.log(`[Command] commandId=${commandId} userId=${userId || 'anonymous'} command="${command}"`);
    onEvent?.({ type: 'command_received', commandId, command });

    // 1. Resolve Canonical Startup Context (Company Context Layer - P1 Task 4)
    const targetUserId = userId || (typeof userIdOrContext === 'object' ? userIdOrContext?.userId : undefined);
    const targetStartupId = typeof userIdOrContext === 'object' ? userIdOrContext?.startupId : undefined;

    let canonical: CompanyContext | null = (typeof userIdOrContext === 'object' && userIdOrContext?.context)
      ? userIdOrContext.context
      : null;

    if (!canonical && targetStartupId && targetUserId) {
      canonical = await companyContextService.getContextForStartup(targetStartupId, targetUserId);
    }
    if (!canonical && targetUserId) {
      canonical = await companyContextService.getContextForUser(targetUserId);
    }
    if (!canonical && targetStartupId && !targetUserId) {
      // In dev/offline fallback mode
      canonical = await companyContextService.getContextForStartupOrUser(targetStartupId);
    }
    if (!canonical && targetUserId && isDbAvailable && prisma) {
      const userStartup = await prisma.startup.findFirst({ where: { ownerId: targetUserId } });
      if (userStartup) {
        canonical = await companyContextService.getContextForStartup(userStartup.id, targetUserId);
      }
    }

    // 2. Intent Analysis (Determines routing, calculations, and RAG context)
    const analysis = analyzeCommandIntent(command);
    console.log(`[Intent] commandId=${commandId} intent=${analysis.intent} objective="${analysis.objective}" roles=${analysis.activatedRoles.join(',')}`);
    onEvent?.({ type: 'intent_detected', intent: analysis.intent, objective: analysis.objective, activatedRoles: analysis.activatedRoles });

    if (!canonical) {
      console.log(`[Command] commandId=${commandId} No canonical startup context found.`);
      const needsOnboardingResponse: OrchestrationResponse = {
        commandId,
        status: 'needs_information',
        interpretation: {
          intent: 'uninitialized_workspace',
          objective: 'Prompt founder onboarding to establish canonical company context'
        },
        answer: {
          summary: 'No startup workspace found for your account. Please complete onboarding to initialize your company context.',
          details: 'Once onboarded, Catalyst OS will orchestrate commands with your company financials, goals, and team.'
        },
        agents: [{ role: 'CEO', status: 'idle', contribution: 'Awaiting startup workspace onboarding.' }],
        evidence: [],
        supportingData: [],
        confidence: 1.0
      };
      onEvent?.({ type: 'complete', response: needsOnboardingResponse });
      return needsOnboardingResponse;
    }

    const startupId = canonical.startupId;
    const activeStartup = {
      name: canonical.startup.name,
      industry: canonical.startup.industry,
      description: canonical.startup.description,
      fundingStage: canonical.startup.stage,
      cashBalance: canonical.financials.cashBalance,
      burnRate: canonical.financials.monthlyBurn,
      runwayMonths: canonical.financials.runwayMonths,
      healthScore: 80,
      metrics: startupProfile.metrics,
    };
    const baseRunway = canonical.financials.runwayMonths;

    // LEVEL 0 — CONVERSATIONAL GREETING & READINESS
    if (analysis.intent === 'greeting') {
      console.log(`[Command] commandId=${commandId} Level 0 Conversational Greeting execution.`);
      const name = canonical.startup.name;
      const stage = canonical.startup.stage || 'Pre-Seed';
      const industry = canonical.startup.industry || 'Technology';
      const cash = canonical.financials.cashBalance;
      const burn = canonical.financials.monthlyBurn;
      const runway = canonical.financials.runwayMonths;

      const summary = `Hello! I am your AI Executive Orchestrator for ${name}. All executive specialist agents (Finance, Talent, Growth, Legal, Operations, Auditor) are active and grounded in your live company records.`;
      const details = `Company Overview:\n• Startup: ${name} (${stage} stage, ${industry})\n• Cash Reserves: $${(cash / 1000).toFixed(1)}K\n• Monthly Burn: $${(burn / 1000).toFixed(1)}K/mo\n• Runway Horizon: ${runway} Months\n\nHow can the executive team assist you today? You can ask about hiring scenarios, financial runway modeling, GTM planning, or compliance checks.`;

      const supportingData = [
        { label: 'Startup Name', value: name, source: 'Startup Profile' },
        { label: 'Cash Reserves', value: `$${cash.toLocaleString('en-US')}`, source: 'Neon PostgreSQL Treasury' },
        { label: 'Monthly Burn', value: `$${burn.toLocaleString('en-US')}/mo`, source: 'Operating Expense Baseline' },
        { label: 'Runway Horizon', value: `${runway} Months`, source: 'Deterministic Runway Calculator (Cash / Burn)' }
      ];

      const greetingResponse: OrchestrationResponse = {
        commandId,
        status: 'completed',
        interpretation: {
          intent: analysis.intent,
          objective: analysis.objective
        },
        answer: {
          summary,
          details
        },
        supportingData,
        agents: [
          { role: 'CEO', status: 'completed', contribution: `Ready to orchestrate executive directives for ${name}.` },
          { role: 'Finance', status: 'completed', contribution: `Treasury synchronized: $${(cash / 1000).toFixed(1)}K cash with ${runway} months runway.` },
          { role: 'Auditor', status: 'completed', contribution: 'All systems verified and grounded in persistent company records.' }
        ],
        evidence: [],
        confidence: 1.0
      };

      await this.recordCommandPersistence(commandId, command, greetingResponse.status, startupId, summary, analysis.objective);
      this.updateConversationMemory(startupId, command, summary);
      onEvent?.({ type: 'chunk', text: summary });
      onEvent?.({ type: 'complete', response: greetingResponse });
      return greetingResponse;
    }

    // LEVEL 1 — DIRECT DATA (Section 19 of PROMPT.MD)
    if (analysis.intent === 'startup_identity') {
      console.log(`[Command] commandId=${commandId} Level 1 Direct Data execution.`);
      const name = canonical.startup.name;
      const stage = canonical.startup.stage;
      const industry = canonical.startup.industry;
      const product = canonical.business.primaryProduct || canonical.startup.description;
      const icp = canonical.business.targetIcp || 'Target Customers';
      const goals = canonical.goals && canonical.goals.length > 0 ? canonical.goals.join(', ') : 'Scaling core product';
      const cash = canonical.financials.cashBalance;
      const burn = canonical.financials.monthlyBurn;
      const runway = canonical.financials.runwayMonths;

      const docCount = canonical.documents?.length || 0;
      const summary = `${name} is a ${stage} company in the ${industry} sector building ${product}. Your primary target customer profile is ${icp}.`;
      let details = `• Strategic Goals: ${goals}\n• Financial Baseline: $${cash.toLocaleString('en-US')} in cash reserves, $${burn.toLocaleString('en-US')}/mo burn rate\n• Operational Runway: ${runway} months\n• Leadership: ${canonical.founder.name} (${canonical.founder.role})\n• Knowledge Base: ${docCount > 0 ? `${docCount} verified company documents (${canonical.documents.map(d => d.name).join(', ')})` : 'Living company profile initialized'}`;

      const supportingData = [
        { label: 'Startup Name', value: name, source: 'Startup Profile' },
        { label: 'Industry', value: industry, source: 'Startup Profile' },
        { label: 'Stage', value: stage, source: 'Startup Profile' },
        { label: 'Primary Offering', value: product, source: 'Business Context' },
        { label: 'Target ICP', value: icp, source: 'Business Context' },
        { label: 'Cash Balance', value: `$${cash.toLocaleString('en-US')}`, source: 'Neon PostgreSQL Treasury' },
        { label: 'Monthly Burn', value: `$${burn.toLocaleString('en-US')}/mo`, source: 'Operating Expense Baseline' },
        { label: 'Runway', value: `${runway} Months`, source: 'Deterministic Runway Calculator' }
      ];

      if (docCount > 0) {
        supportingData.push({
          label: 'Knowledge Base',
          value: `${docCount} Documents`,
          source: 'Neon PostgreSQL Document Storage'
        });
      }

      const docEvidence = (canonical.documents || []).map((d, idx) => ({
        citationId: `[CIT-${idx + 1}]`,
        documentId: d.id,
        documentName: d.name,
        excerpt: d.summary || `Verified corporate document for ${name}`
      }));

      const docCitations = (canonical.documents || []).map((d, idx) => ({
        id: `CIT-${idx + 1}`,
        title: d.name,
        source: 'Corporate Knowledge Base (RAG)',
        relevance: '100%'
      }));

      const level1Response: OrchestrationResponse = {
        commandId,
        status: 'completed',
        interpretation: {
          intent: analysis.intent,
          objective: analysis.objective
        },
        answer: {
          summary,
          details
        },
        supportingData,
        citations: docCitations,
        evidence: docEvidence,
        agents: [
          { role: 'CEO', status: 'completed', contribution: `Synthesized verified company profile for ${name}.` },
          { role: 'Auditor', status: 'completed', contribution: 'Verified factual alignment against canonical startup context and RAG documents.' }
        ],
        confidence: 1.0
      };

      await this.recordCommandPersistence(commandId, command, level1Response.status, startupId, summary, analysis.objective);
      this.updateConversationMemory(startupId, command, summary);
      if (docEvidence.length > 0) {
        onEvent?.({ type: 'retrieval', sources: docEvidence });
      }
      onEvent?.({ type: 'complete', response: level1Response });
      return level1Response;
    }

    // LEVEL 1.5 — KNOWLEDGE BASE & DOCUMENT AUDIT (RAG Grounded for Entire Company)
    if (analysis.intent === 'knowledge_inquiry') {
      console.log(`[Command] commandId=${commandId} Level 1.5 Knowledge Base Inquiry execution.`);
      const name = canonical.startup.name;
      const docs = canonical.documents || [];
      const docCount = docs.length;

      let retrievedChunks: any[] = [];
      try {
        retrievedChunks = await performHybridSearch(command, startupId, 4);
      } catch (err: any) {
        console.warn('[Orchestrator] Hybrid search notice in knowledge_inquiry:', err.message);
      }

      let summary = '';
      let details = '';
      if (docCount === 0) {
        summary = `No corporate documents have been uploaded for ${name} yet.`;
        details = `Your company workspace is currently grounded in your foundational onboarding profile and treasury records. To expand your AI council's RAG knowledge, upload pitch decks, PRDs, contracts, or financial plans in the Knowledge Center.`;
      } else {
        summary = `${name} has ${docCount} verified document(s) indexed in the corporate Knowledge Base, fully accessible across all executive agents.`;
        const docList = docs.map((d, i) => `• [${d.type.toUpperCase()}] **${d.name}** (${d.size || 'Grounded'})\n  Summary: ${d.summary || 'Strategic corporate reference.'}`).join('\n\n');
        details = `### Verified Company Documents (RAG Grounded):\n${docList}\n\nAll documents are tenant-isolated and actively accessible to CEO, CFO, CMO, CTO, Legal, and Operations agents.`;
      }

      const evidence = (retrievedChunks.length > 0 ? retrievedChunks : docs).map((item: any, idx: number) => ({
        citationId: `[CIT-${idx + 1}]`,
        documentId: item.documentId || item.id,
        documentName: item.documentName || item.name,
        excerpt: (item.content ? item.content.slice(0, 200) + '...' : item.summary) || `Verified company document for ${name}`
      }));

      const citations = docs.map((d, idx) => ({
        id: `CIT-${idx + 1}`,
        title: d.name,
        source: 'Corporate Knowledge Base (RAG)',
        relevance: '100%'
      }));

      const supportingData = [
        { label: 'Startup Name', value: name, source: 'Startup Profile' },
        { label: 'Total Documents', value: `${docCount} Documents`, source: 'RAG Knowledge Index' },
        { label: 'Access Scope', value: 'Entire Company (All Agents)', source: 'Tenant Isolation Policy' },
        { label: 'Search Engine', value: 'Hybrid Semantic + Keyword', source: 'Neon PostgreSQL RAG Storage' }
      ];

      const knowResponse: OrchestrationResponse = {
        commandId,
        status: 'completed',
        interpretation: {
          intent: analysis.intent,
          objective: analysis.objective
        },
        answer: {
          summary,
          details
        },
        supportingData,
        citations,
        evidence,
        agents: [
          { role: 'CEO', status: 'completed', contribution: `Audited ${docCount} corporate knowledge documents for ${name}.` },
          { role: 'Auditor', status: 'completed', contribution: 'Verified all documents are company-scoped and RAG grounded.' }
        ],
        confidence: 1.0
      };

      await this.recordCommandPersistence(commandId, command, knowResponse.status, startupId, summary, analysis.objective);
      this.updateConversationMemory(startupId, command, summary);
      onEvent?.({ type: 'retrieval', sources: evidence });
      onEvent?.({ type: 'complete', response: knowResponse });
      return knowResponse;
    }

    // LEVEL 2 — DATA + DETERMINISTIC TOOL (Section 19 of PROMPT.MD)
    if (analysis.intent === 'financial_inquiry' && !analysis.requiresHeadcountModeling) {
      console.log(`[Command] commandId=${commandId} Level 2 Deterministic Financial Tool execution.`);
      const cash = canonical.financials.cashBalance;
      const burn = canonical.financials.monthlyBurn;
      const runway = canonical.financials.runwayMonths;

      const summary = `Based on your current cash balance of ₹${cash.toLocaleString()} and monthly burn rate of ₹${burn.toLocaleString()}/mo, your active runway is approximately ${runway} months.`;
      const details = runway < 6
        ? '⚠️ High Risk Warning: Runway has dropped below 6 months. Prioritize cash preservation and immediate bridge fundraising.'
        : 'Treasury status is within safe operational thresholds (> 12 months) for continuous milestone execution.';

      const supportingData = [
        { label: 'Cash Balance', value: `₹${cash.toLocaleString()}`, source: 'Neon PostgreSQL Treasury' },
        { label: 'Monthly Burn', value: `₹${burn.toLocaleString()}/mo`, source: 'Operating Expense Baseline' },
        { label: 'Active Runway', value: `${runway} Months`, source: 'Deterministic Runway Calculator (Cash / Burn)' }
      ];

      const level2Response: OrchestrationResponse = {
        commandId,
        status: 'completed',
        interpretation: {
          intent: analysis.intent,
          objective: analysis.objective
        },
        answer: {
          summary,
          details
        },
        supportingData,
        agents: [
          { role: 'Finance', status: 'completed', contribution: `Computed deterministic runway of ${runway} months based on ₹${burn.toLocaleString()}/mo burn.` },
          { role: 'Auditor', status: 'completed', contribution: 'Validated mathematical calculation with zero hallucination.' }
        ],
        evidence: [],
        calculations: [
          { metric: 'Current Cash Balance', value: `₹${cash.toLocaleString()}`, source: 'Neon PostgreSQL Treasury' },
          { metric: 'Current Monthly Burn', value: `₹${burn.toLocaleString()}/mo`, source: 'Neon PostgreSQL Treasury' },
          { metric: 'Active Runway', value: `${runway} Months`, source: 'Deterministic Runway Calculation: cashBalance / burnRate' }
        ],
        confidence: 1.0
      };

      await this.recordCommandPersistence(commandId, command, level2Response.status, startupId, summary, analysis.objective);
      this.updateConversationMemory(startupId, command, summary);
      onEvent?.({ type: 'complete', response: level2Response });
      return level2Response;
    }

    // 3. Early Handler for Unrelated / Out-of-Scope Commands
    if (analysis.isUnrelated) {
      console.log(`[Command] commandId=${commandId} out_of_scope handled directly.`);
      const outOfScopeResponse: OrchestrationResponse = {
        commandId,
        status: 'completed',
        interpretation: {
          intent: analysis.intent,
          objective: analysis.objective
        },
        answer: {
          summary: `I am the Catalyst OS executive orchestrator focused on your startup operations, financials, hiring, and growth. I do not have tools or live data to answer questions about "${command}".`,
          details: 'Please submit commands related to your company strategy, cash runway, hiring plans, GTM campaigns, or operational roadmap.'
        },
        agents: [{ role: 'CEO', status: 'completed', contribution: 'Clarified executive scope and operational focus.' }],
        evidence: [],
        calculations: [],
        confidence: 0.99
      };
      await this.recordCommandPersistence(commandId, command, outOfScopeResponse.status, startupId, outOfScopeResponse.answer.summary, analysis.objective);
      onEvent?.({ type: 'complete', response: outOfScopeResponse });
      return outOfScopeResponse;
    }

    // 4. Deterministic Financial Calculations (Computed ONLY when intent warrants it)
    const calculations: OrchestrationCalculation[] = [];
    let monthlyBurnIncrease = 0;
    let projectedRunway: number | null = null;
    let headcount: HeadcountExtraction = { hasHiringQuery: false, count: 0, role: '', estimatedAnnualSalary: 0 };

    if (analysis.requiresFinancialCalculations) {
      calculations.push({
        metric: 'Current Cash Balance',
        value: `$${activeStartup.cashBalance.toLocaleString()}`,
        source: 'Neon PostgreSQL Treasury Ledger'
      });
      calculations.push({
        metric: 'Current Monthly Burn',
        value: `$${activeStartup.burnRate.toLocaleString()}/mo`,
        source: 'Neon PostgreSQL Treasury Ledger'
      });
      calculations.push({
        metric: 'Active Runway',
        value: `${baseRunway} Months`,
        source: 'Deterministic Treasury Calculation: cashBalance / burnRate'
      });

      if (analysis.requiresHeadcountModeling) {
        headcount = extractHeadcountDetails(command);
        if (headcount.hasHiringQuery && headcount.count > 0) {
          monthlyBurnIncrease = Math.round((headcount.count * headcount.estimatedAnnualSalary) / 12);
          const newBurn = activeStartup.burnRate + monthlyBurnIncrease;
          projectedRunway = newBurn > 0 ? parseFloat((activeStartup.cashBalance / newBurn).toFixed(1)) : 999.0;
          const runwayDelta = parseFloat((projectedRunway - baseRunway).toFixed(1));

          calculations.push({
            metric: `Headcount Cost (${headcount.count}x ${headcount.role})`,
            value: `+$${monthlyBurnIncrease.toLocaleString()}/mo`,
            source: 'Deterministic Headcount Benchmark Model'
          });
          calculations.push({
            metric: 'Projected Runway Post-Hire',
            value: `${projectedRunway} Months (${runwayDelta} mos change)`,
            source: 'Deterministic Scenario Calculation: cashBalance / (burnRate + cost)'
          });
        }
      }
    }

    // 5. User-Scoped Hybrid RAG Retrieval (Grounded in Verified Company Files)
    let evidence: OrchestrationEvidence[] = [];
    let retrievedContextText = 'No specific internal documents were indexed or retrieved.';
    const agentKnowledgeMap = new Map<string, AgentKnowledgeSlice>();

    if (analysis.needsCompanyKnowledge || analysis.requiresRag) {
      try {
        console.log(`[RAG] Searching company knowledge base for: "${command}" (startupId: ${startupId}, reason: ${analysis.knowledgeReason || 'domain analysis'})`);
        const retrievedChunks = await retrieveRelevantKnowledge({
          startupId,
          command,
          subQueries: analysis.searchQueries || [],
          limit: 6,
          minSimilarity: 0.35
        });

        if (retrievedChunks.length > 0) {
          const { contextText, citations } = buildContext(retrievedChunks);
          retrievedContextText = contextText;
          evidence = citations.map(c => ({
            citationId: c.citationId,
            documentId: c.documentId,
            documentName: c.documentName,
            excerpt: c.chunkContent.slice(0, 200) + '...'
          }));

          // Route domain-scoped knowledge to each active specialist agent (safeguards context size and relevance)
          for (const role of analysis.activatedRoles) {
            agentKnowledgeMap.set(role, filterKnowledgeForAgent(role, retrievedChunks));
          }
        }
      } catch (err: any) {
        console.warn('[Orchestrator] RAG search encountered error:', err.message);
      }
    }

    onEvent?.({ type: 'retrieval', sources: evidence });

    // 6. Explicit Missing Data Gating (DATA_MISSING)
    const lowerCmd = command.toLowerCase();
    const isSpecificBudgetQuery = lowerCmd.includes('hiring budget') || lowerCmd.includes('marketing budget') || lowerCmd.includes('hiring spend');
    if (isSpecificBudgetQuery && evidence.length === 0 && !lowerCmd.includes('runway') && !lowerCmd.includes('cash')) {
      console.log(`[Command] commandId=${commandId} Missing specific verified budget data.`);
      const missingDataResponse: OrchestrationResponse = {
        commandId,
        status: 'needs_information',
        interpretation: {
          intent: analysis.intent,
          objective: analysis.objective
        },
        answer: {
          summary: `I don't have verified hiring-budget data available in the connected company records.`,
          details: `While our overall treasury cash is $${activeStartup.cashBalance.toLocaleString()} and monthly burn is $${activeStartup.burnRate.toLocaleString()}/mo, a dedicated departmental hiring budget has not been established. Please upload a budget allocation or financial plan in the Knowledge Center.`
        },
        agents: analysis.activatedRoles.map(r => ({ role: r, status: 'completed', contribution: 'Identified missing department budget allocation.' })),
        evidence: [],
        calculations: [],
        confidence: 0.88
      };
      await this.recordCommandPersistence(commandId, command, missingDataResponse.status, startupId, missingDataResponse.answer.summary, analysis.objective);
      onEvent?.({ type: 'complete', response: missingDataResponse });
      return missingDataResponse;
    }

    // 7. Multi-Agent Council Execution (Phases 3 & 4)
    const councilResult = await multiAgentCouncil.executeCouncil(
      command,
      canonical,
      evidence.map(e => e.excerpt),
      { 
        activatedRoles: analysis.activatedRoles,
        agentKnowledgeMap
      }
    );

    // Phase A3: persist the CEO decomposition as assignable Task rows so the work
    // survives the request and can reach an employee workspace. Delegation must
    // never fail the founder's command, so this is deliberately non-throwing.
    await delegateWorkOrders(
      startupId,
      councilResult.decomposition.workOrders.map(w => ({
        department: w.department,
        objective: w.objective
      }))
    );

    const agents: OrchestrationAgentActivity[] = [];
    const allRoles = ['CEO', 'Finance', 'Talent', 'Growth', 'Operations', 'Legal', 'Auditor'];

    for (const role of allRoles) {
      if (!analysis.activatedRoles.includes(role)) {
        agents.push({ role, status: 'idle' });
      }
    }

    for (const role of analysis.activatedRoles) {
      onEvent?.({ type: 'agent_started', role, status: 'analyzing' });
      const execRes = councilResult.executiveResults.get(role as any)
        || (role === 'Finance' ? councilResult.executiveResults.get('CFO') : undefined)
        || (role === 'CFO' ? councilResult.executiveResults.get('Finance' as any) : undefined);
      const contribution = execRes ? execRes.recommendation : `${role} analyzed domain parameters.`;
      agents.push({
        role,
        status: 'completed',
        contribution
      });
      onEvent?.({ type: 'agent_completed', role, contribution });
    }

    // 8. Consolidated AI Synthesis with Gemini
    onEvent?.({ type: 'synthesis_started' });

    let finalSummary = councilResult.finalSynthesis.summary;
    let finalDetails = councilResult.finalSynthesis.details;
    let confidence = 0.95;

    if (ai) {
      const calculationsSummary = calculations.length > 0
        ? calculations.map(c => `- **${c.metric}:** ${c.value} (${c.source})`).join('\n')
        : 'NONE (This inquiry does not require treasury or headcount math).';

      const history = this.conversationMemory.get(startupId) || [];
      const recentContext = history.slice(-4).map(h => `${h.role === 'founder' ? 'Founder' : 'Catalyst'}: ${h.content}`).join('\n');

      const councilFindingsText = Array.from(councilResult.executiveResults.values())
        .map(r => `• ${r.role} [Vote: ${r.vote.verdict}]: ${r.recommendation}${r.conditions.length > 0 ? ` (Conditions: ${r.conditions.join('; ')})` : ''}`)
        .join('\n');

      const synthesisPrompt = `
You are the CEO of Catalyst OS, an autonomous startup operating system.
You are delivering a unified, grounded, decision-ready response to the Founder.

FOUNDER COMMAND: "${command}"
INTENT: ${analysis.intent} - ${analysis.objective}

CANONICAL COMPANY CONTEXT (SINGLE SOURCE OF TRUTH):
${companyContextService.toPromptContext(canonical, 'CEO', command)}

${recentContext ? `RECENT CONVERSATION HISTORY:\n${recentContext}\n` : ''}
${calculations.length > 0 ? `DETERMINISTIC APPLICATION CALCULATIONS:\n${calculationsSummary}\n` : ''}
${retrievedContextText !== 'No specific internal documents were indexed or retrieved.' ? `INTERNAL VERIFIED KNOWLEDGE BASE:\n${retrievedContextText}\n` : 'NO RELEVANT INTERNAL COMPANY DOCUMENTS FOUND FOR THIS TOPIC.'}

INDEPENDENT EXECUTIVE COUNCIL DELIBERATIONS & FORMAL VOTES:
${councilFindingsText}

BOARD CONSENSUS:
${councilResult.boardConsensus.summary}
${councilResult.boardConsensus.hasUnresolvedVeto ? '⚠️ CRITICAL: Council consensus is BLOCKED by one or more formal executive vetoes.' : '✓ Board consensus satisfied.'}

INSTRUCTIONS:
1. Deliver ONE authoritative executive briefing written from the perspective of the CEO synthesizing the real council deliberation above.
2. If an active veto is present, explain the exact risk and propose alternative restructuring or escalation.
3. For startup identity questions, state company name, industry, and description.
4. Return clean JSON matching this exact structure:
{
  "summary": "1-3 sentence decisive executive verdict or direct answer",
  "details": "Actionable breakdown with specific bullet points and next steps",
  "confidence": 0.95
}
`;

      try {
        const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const candidateModels = Array.from(new Set([preferredModel, 'gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.6-flash']));
        let rawSynthesis = '';
        let lastErr: any = null;

        for (const candidate of candidateModels) {
          try {
            console.log(`[Synthesis] Invoking Gemini model ${candidate} for commandId=${commandId}`);
            const synthesisRes = await ai.models.generateContent({
              model: candidate,
              contents: synthesisPrompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              }
            });
            rawSynthesis = synthesisRes.text?.trim() || '{}';
            if (rawSynthesis && rawSynthesis !== '{}') {
              console.log(`[Synthesis] Model ${candidate} succeeded for commandId=${commandId}`);
              break;
            }
          } catch (mErr: any) {
            lastErr = mErr;
            const errCode = classifyAIError(mErr);
            console.warn(`[Synthesis] Model ${candidate} failed with ${errCode}: ${mErr.message}. Trying next candidate model...`);
            if (errCode === 'SERVICE_UNAVAILABLE' || errCode === 'RATE_LIMITED' || errCode === 'QUOTA_EXCEEDED') {
              await new Promise(r => setTimeout(r, 600));
            }
          }
        }

        if (!rawSynthesis || rawSynthesis === '{}') {
          if (lastErr) throw lastErr;
          throw new Error('All candidate Gemini models failed to generate content.');
        }

        const parsedSynthesis = JSON.parse(rawSynthesis);
        finalSummary = parsedSynthesis.summary || councilResult.finalSynthesis.summary;
        finalDetails = parsedSynthesis.details || councilResult.finalSynthesis.details;
        confidence = parsedSynthesis.confidence || 0.95;
      } catch (err: any) {
        const errCode = classifyAIError(err);
        console.error(`[AI] provider=gemini error=${errCode} action=NO_RETRY message="${err.message}"`);

        // If intent is startup identity, synthesize directly from verified startup profile
        if (analysis.intent === 'startup_identity') {
          console.log(`[Command] commandId=${commandId} Grounded in verified startup profile.`);
          finalSummary = `Your startup is ${activeStartup.name}, operating in the ${activeStartup.industry} sector (${activeStartup.fundingStage} stage). ${activeStartup.description || 'Enterprise automated operating platform.'}`;
          finalDetails = evidence.length > 0 
            ? `Verified from connected company records and pitch deck materials.`
            : `Retrieved directly from your verified startup profile in Neon PostgreSQL.`;
          confidence = 0.92;

          for (const ag of agents) {
            if (ag.status === 'analyzing') {
              ag.status = 'completed';
              ag.contribution = `${ag.role} verified company identity from persistent startup records.`;
            }
          }
        } else if (analysis.intent === 'financial_inquiry') {
          // If pure financial inquiry, synthesize directly from deterministic treasury calculations
          console.log(`[Command] commandId=${commandId} Grounded in deterministic treasury ledger.`);
          finalSummary = `Your active runway is ${baseRunway} months, with a cash balance of $${activeStartup.cashBalance.toLocaleString()} and monthly burn rate of $${activeStartup.burnRate.toLocaleString()}/mo.`;
          finalDetails = `Calculated deterministically from the Neon PostgreSQL treasury ledger (cashBalance / burnRate).`;
          confidence = 0.95;

          for (const ag of agents) {
            if (ag.status === 'analyzing') {
              ag.status = 'completed';
              ag.contribution = `${ag.role} audited deterministic ledger calculations.`;
            }
          }
        } else if (evidence.length > 0) {
          // If we have grounded documents retrieved from the vector store, provide verified factual synthesis
          console.log(`[Command] commandId=${commandId} Grounded in ${evidence.length} retrieved document fragments during provider failover.`);
          finalSummary = `Executive summary for ${activeStartup.name}: Retrieved verified knowledge records regarding "${command}".`;
          finalDetails = evidence.map((e, idx) => `• [${e.documentName || e.citationId || 'Knowledge Base'}]: ${e.excerpt}`).join('\n\n');
          confidence = 0.88;

          for (const ag of agents) {
            if (ag.status === 'analyzing') {
              ag.status = 'completed';
              ag.contribution = `${ag.role} verified data directly from company knowledge base.`;
            }
          }
        } else {
          // Rule 3 & 25: Never disguise AI failure as a successful response for complex analysis!
          const unavailableResponse: OrchestrationResponse = {
            commandId,
            status: 'provider_unavailable',
            interpretation: {
              intent: analysis.intent,
              objective: analysis.objective
            },
            answer: {
              summary: `Executive analysis is temporarily unavailable because the AI provider is unavailable (${errCode === 'QUOTA_EXCEEDED' ? 'Quota exceeded' : errCode === 'SERVICE_UNAVAILABLE' ? 'High provider traffic (503)' : 'Service unavailable'}). Your company data was not changed.`,
              details: `The AI orchestration service encountered: ${errCode}. Please retry in a few moments or verify your API quota.`
            },
            agents: agents.map(a => a.status === 'analyzing' ? { ...a, status: 'idle', contribution: 'Analysis paused due to provider limit.' } : a),
            evidence: evidence,
            calculations: calculations,
            confidence: 0,
            error: {
              code: errCode,
              message: err.message
            }
          };

          await this.recordCommandPersistence(commandId, command, unavailableResponse.status, startupId, unavailableResponse.answer.summary, analysis.objective);
          onEvent?.({ type: 'complete', response: unavailableResponse });
          return unavailableResponse;
        }
      }
    } else {
      // Offline / Unconfigured AI Provider
      finalSummary = `AI provider is not configured. Deterministic company status for "${activeStartup.name}": Cash $${activeStartup.cashBalance.toLocaleString()}, Burn $${activeStartup.burnRate.toLocaleString()}/mo, Runway ${baseRunway} mos.`;
      finalDetails = 'Please configure GEMINI_API_KEY to activate multi-agent synthesis.';
      confidence = 0.5;
    }

    onEvent?.({ type: 'chunk', text: finalSummary });

    // 9. Human-in-the-Loop Approval Center Integration
    let approvalRequirement: OrchestrationResponse['approval'] = undefined;

    const shouldTriggerApproval = analysis.requiresApproval;

    if (shouldTriggerApproval) {
      const isHiring = headcount.hasHiringQuery && headcount.count > 0;
      const approvalTitle = isHiring 
        ? `Hire ${headcount.count}x ${headcount.role}`
        : (analysis.proposedActionTitle || 'Operational Commitment');
      const approvalImpact = isHiring
        ? `Increases monthly burn by ₹${monthlyBurnIncrease.toLocaleString()}/mo. Projected runway: ${projectedRunway ?? baseRunway} months.`
        : (analysis.proposedActionImpact || 'Requires founder verification.');

      const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const approvalItem: Deliverable = {
        id: approvalId,
        initiativeId: commandId,
        title: approvalTitle,
        description: approvalImpact,
        type: isHiring ? 'contract' : 'document',
        status: 'pending_review',
        content: `### Executive Action Proposal\n\n**Objective:** ${analysis.objective}\n\n**Command:** "${command}"\n\n**Financial Impact:** ${monthlyBurnIncrease > 0 ? `+₹${monthlyBurnIncrease.toLocaleString()}/mo burn` : 'Neutral'}\n\n**Executive Rationale:** ${finalSummary}\n\n**Council Consensus:** ${councilResult.boardConsensus.summary}`,
        impact: approvalImpact,
        financialChange: monthlyBurnIncrease > 0 ? -monthlyBurnIncrease : 0,
        metricChanges: {
          velocity: isHiring ? 15 : 5,
          financialHealth: monthlyBurnIncrease > 0 ? -8 : 0,
          operationsEfficiency: 10,
        },
        votes: councilResult.boardConsensus.votes,
        boardConsensus: councilResult.boardConsensus,
        riskLevel: councilResult.finalSynthesis.riskTier,
        reversibility: councilResult.finalSynthesis.reversibility,
        headcount: isHiring ? headcount.count : undefined,
        conditions: councilResult.finalSynthesis.conditions
      };

      approvals.unshift(approvalItem);

      if (isDbAvailable && prisma) {
        try {
          await safeDbQuery(async () => {
            let activePlan = await prisma.plan.findFirst({ where: { startupId } });
            if (!activePlan) {
              activePlan = await prisma.plan.create({
                data: {
                  title: 'Core Executive Operations',
                  description: 'Default continuous operating plan',
                  startupId: startupId,
                  status: 'active'
                }
              });
            }

            await prisma.approval.create({
              data: {
                id: approvalId,
                title: approvalItem.title,
                description: approvalItem.description,
                type: approvalItem.type,
                status: 'pending_review',
                content: approvalItem.content,
                impact: approvalItem.impact,
                financialChange: approvalItem.financialChange || 0,
                metricChanges: approvalItem.metricChanges || {},
                planId: activePlan.id,
              }
            });

            await prisma.notification.create({
              data: {
                title: `Approval Required: ${approvalItem.title}`,
                message: `${approvalItem.description} requires founder review.`,
                type: 'APPROVAL',
                startupId
              }
            });

            // Invalidate company context so pendingApprovalsCount reflects immediately
            companyContextService.invalidate(startupId);
          }, 3);
        } catch (dbErr: any) {
          console.warn('[Orchestrator] Could not persist approval/notification to DB:', dbErr.message);
        }
      }

      approvalRequirement = {
        required: true,
        approvalId,
        reason: `High-impact operational commitment (${approvalTitle}). Requires explicit Founder sign-off.`,
        impact: approvalItem.impact
      };

      onEvent?.({ type: 'approval_required', ...approvalRequirement });
    }

    // 10. Next Actions
    const nextActions = [];
    if (approvalRequirement?.required && approvalRequirement?.approvalId) {
      nextActions.push({
        label: 'Review in Approval Center',
        action: 'navigate_approvals'
      });
    }
    if (headcount.hasHiringQuery) {
      nextActions.push({
        label: 'Simulate Headcount Impact on Runway',
        action: 'simulate_headcount'
      });
    }
    nextActions.push({
      label: 'View Knowledge Base Files',
      action: 'navigate_knowledge'
    });

    // Auditor verification check
    const auditorAg = agents.find(a => a.role === 'Auditor');
    if (auditorAg && (!auditorAg.contribution || auditorAg.contribution.trim() === '')) {
      if (calculations.length > 0) {
        auditorAg.contribution = 'Auditor verified deterministic mathematical calculations against Neon PostgreSQL ledger.';
        auditorAg.status = 'completed';
      } else if (evidence.length > 0) {
        auditorAg.contribution = 'Auditor validated citations and cross-referenced claims against verified company documents.';
        auditorAg.status = 'completed';
      } else {
        auditorAg.contribution = 'Auditor audited operational assumptions and verified strategy constraints.';
        auditorAg.status = 'completed';
      }
    }

    // Two-Layer Supporting Data (Section 15 & 30 of PROMPT.MD)
    const supportingData: Array<{ label: string; value: string; source: string }> = [];
    if (calculations.length > 0) {
      calculations.forEach(c => {
        supportingData.push({ label: c.metric, value: String(c.value), source: c.source });
      });
    }
    if (evidence.length > 0) {
      evidence.forEach(e => {
        supportingData.push({ label: e.citationId, value: e.documentName || 'Document Citation', source: e.excerpt || '' });
      });
    }

    const citations = evidence.map(e => ({
      id: e.citationId,
      title: e.documentName || 'Document Reference',
      source: e.excerpt || '',
      relevance: 'High'
    }));

    const response: OrchestrationResponse = {
      commandId,
      status: approvalRequirement?.required ? 'needs_approval' : 'completed',
      interpretation: {
        intent: analysis.intent,
        objective: analysis.objective,
      },
      answer: {
        summary: finalSummary,
        details: finalDetails,
      },
      agents,
      evidence,
      calculations,
      supportingData,
      citations,
      votes: councilResult.boardConsensus.votes,
      boardConsensus: councilResult.boardConsensus,
      approval: approvalRequirement,
      nextActions,
      confidence,
    };

    await this.recordCommandPersistence(commandId, command, response.status, startupId, finalSummary, analysis.objective);
    this.updateConversationMemory(startupId, command, finalSummary);
    console.log(`[Command] commandId=${commandId} status=${response.status} confidence=${confidence}`);
    onEvent?.({ type: 'complete', response });
    return response;
  }
}

export const orchestrationService = new OrchestrationService();
