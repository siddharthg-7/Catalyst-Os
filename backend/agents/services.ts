import { GoogleGenAI, Type } from '@google/genai';
import { ai } from '../services/geminiService';
import { 
  CEO_PROMPT, 
  FINANCE_PROMPT, 
  TALENT_PROMPT, 
  GROWTH_PROMPT, 
  OPERATIONS_PROMPT, 
  LEGAL_PROMPT, 
  CONFLICT_PROMPT, 
  APPROVAL_PROMPT 
} from './prompts';
import { 
  PlannerOutputDTO, 
  AgentResponseDTO, 
  ConflictResolutionDTO, 
  WorkflowTaskDTO, 
  ExpectedDeliverableDTO 
} from './types';

// Helper to call Gemini model with system instruction and JSON schema response
async function callGeminiJson<T>(
  systemInstruction: string, 
  userPrompt: string, 
  fallbackGenerator: () => T,
  responseSchema?: any
): Promise<T> {
  if (!ai) {
    console.warn('Gemini API client not initialized. Using premium simulation fallback.');
    return fallbackGenerator();
  }

  try {
    const config: any = {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.7,
    };

    if (responseSchema) {
      config.responseSchema = responseSchema;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config,
    });

    const text = response.text || '';
    const cleanJson = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
    return JSON.parse(cleanJson) as T;
  } catch (err) {
    console.error('Error executing Gemini API, falling back:', err);
    return fallbackGenerator();
  }
}

// 1. CEO Planner Service
export async function runCEOPlanner(founderGoal: string, startupState: string, ragContext: string): Promise<PlannerOutputDTO> {
  const prompt = `
FOUNDER OPERATIONAL GOAL: "${founderGoal}"

STARTUP CURRENT STATE:
${startupState}

COMPLEMENTARY BUSINESS INTELLIGENCE DOCUMENTS (RAG Context):
${ragContext}

Analyze this goal and decompose it into exact subtasks for appropriate agents. Return a JSON matching the requested schema.
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      initiativeId: { type: Type.STRING },
      founderGoal: { type: Type.STRING },
      requiredExecutives: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      ragQueryString: { type: Type.STRING },
      decomposedTasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            assignedTo: { type: Type.STRING },
            title: { type: Type.STRING },
            constraints: { type: Type.STRING }
          },
          required: ['id', 'assignedTo', 'title', 'constraints']
        }
      },
      expectedDeliverables: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            title: { type: Type.STRING }
          },
          required: ['type', 'title']
        }
      }
    },
    required: ['initiativeId', 'founderGoal', 'requiredExecutives', 'ragQueryString', 'decomposedTasks', 'expectedDeliverables']
  };

  const fallback = (): PlannerOutputDTO => {
    const isHiring = founderGoal.toLowerCase().includes('engineer') || founderGoal.toLowerCase().includes('hire');
    const isFunding = founderGoal.toLowerCase().includes('pitch') || founderGoal.toLowerCase().includes('funding');
    const isGrowth = founderGoal.toLowerCase().includes('marketing') || founderGoal.toLowerCase().includes('campaign');

    if (isHiring) {
      return {
        initiativeId: `init_${Date.now()}`,
        founderGoal,
        requiredExecutives: ['Talent', 'Finance', 'Legal'],
        ragQueryString: 'founding engineer compensation option pool cliff',
        decomposedTasks: [
          { id: 'task_t1', assignedTo: 'Talent', title: 'Determine leading recruiting bands and stock vesting ranges.', constraints: 'Options pool max 1.5%.' },
          { id: 'task_f1', assignedTo: 'Finance', title: 'Audit monthly payroll budget and cash flow impact.', constraints: 'Keep runway above 11 months.' },
          { id: 'task_l1', assignedTo: 'Legal', title: 'Draft proprietary IP assignment clauses and employment handbook.', constraints: 'Standard 4-year vesting with 1-year cliff.' }
        ],
        expectedDeliverables: [
          { type: 'contract', title: 'Executive Offer and IP Security Agreement' }
        ]
      };
    } else if (isFunding) {
      return {
        initiativeId: `init_${Date.now()}`,
        founderGoal,
        requiredExecutives: ['Finance', 'Growth', 'Legal'],
        ragQueryString: 'seed round funding valuation cap pitch',
        decomposedTasks: [
          { id: 'task_f1', assignedTo: 'Finance', title: 'Verify core startup financials, cash position, and projections.', constraints: 'Align with GAAP standard metrics.' },
          { id: 'task_g1', assignedTo: 'Growth', title: 'Formulate seed round marketing deck messaging and product metrics.', constraints: 'Highlight predictive scheduling gains.' },
          { id: 'task_l1', assignedTo: 'Legal', title: 'Construct Reg D disclosure terms for seed-stage investors.', constraints: 'Adhere to modern SEC standards.' }
        ],
        expectedDeliverables: [
          { type: 'document', title: 'CatalystOS Institutional Funding Briefing Document' }
        ]
      };
    } else {
      return {
        initiativeId: `init_${Date.now()}`,
        founderGoal,
        requiredExecutives: ['Growth', 'Operations', 'Finance'],
        ragQueryString: 'marketing campaign cloud compute scaling budget',
        decomposedTasks: [
          { id: 'task_g1', assignedTo: 'Growth', title: 'Design viral referral program and landing copy.', constraints: 'Capped credits per user.' },
          { id: 'task_o1', assignedTo: 'Operations', title: 'Audit load capacity and configure auto-scaling infrastructure.', constraints: 'Maintain 99.98% availability.' },
          { id: 'task_f1', assignedTo: 'Finance', title: 'Model marketing campaign cost threshold and server margin ratios.', constraints: 'Capped at $2k/mo budget.' }
        ],
        expectedDeliverables: [
          { type: 'marketing_plan', title: 'CatalystOS Cloud Pilot Campaign & Referral Brief' }
        ]
      };
    }
  };

  return callGeminiJson<PlannerOutputDTO>(CEO_PROMPT, prompt, fallback, responseSchema);
}

// Helper generic for special agents
const agentResponseSchema = {
  type: Type.OBJECT,
  properties: {
    agentId: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          financialImpact: { type: Type.NUMBER },
          riskRating: { type: Type.STRING }
        },
        required: ['id', 'title', 'description', 'financialImpact', 'riskRating']
      }
    },
    isConflict: { type: Type.BOOLEAN },
    conflictReason: { type: Type.STRING },
    metricChanges: {
      type: Type.OBJECT,
      properties: {
        velocity: { type: Type.NUMBER },
        financialHealth: { type: Type.NUMBER },
        legalCompliance: { type: Type.NUMBER },
        growthRate: { type: Type.NUMBER },
        operationsEfficiency: { type: Type.NUMBER }
      }
    }
  },
  required: ['agentId', 'reasoning', 'recommendations', 'isConflict']
};

// 2. Finance Agent Service
export async function runFinanceAgent(subtask: string, startupState: string, ragContext: string): Promise<AgentResponseDTO> {
  const prompt = `
TASK DELEGATED BY CEO: "${subtask}"

STARTUP STATE:
${startupState}

KNOWLEDGE DISCLOSURES (RAG):
${ragContext}

Evaluate this task. Perform mathematical analyses, verify budgets, and determine runway impacts.
`;

  const fallback = (): AgentResponseDTO => {
    const isHiring = subtask.toLowerCase().includes('hire') || subtask.toLowerCase().includes('engineer') || subtask.toLowerCase().includes('salary');
    const isFunding = subtask.toLowerCase().includes('funding') || subtask.toLowerCase().includes('seed') || subtask.toLowerCase().includes('valuation');

    if (isHiring) {
      return {
        agentId: 'Finance',
        reasoning: 'Hiring a lead engineer requires a massive ongoing payroll expense. Given our pre-seed cash position of $245k and monthly burn of $18.5k, adding a $145k salary ($12k/mo) is a major treasury threat, cutting runway down to 8.0 months if not offset.',
        recommendations: [{
          id: 'rec_f1',
          title: 'Establish a $115k Base Salary Limit',
          description: 'Capping the base salary at $115,000 prevents runway deterioration and maintains our pre-seed budget limits.',
          financialImpact: -9583,
          riskRating: 'low'
        }],
        isConflict: true,
        conflictReason: 'The proposed $145,000 salary exceeds pre-seed guidelines and will shorten company runway below our safe 11-month buffer.',
        metricChanges: { financialHealth: -8, velocity: 5, operationsEfficiency: 2 }
      };
    } else if (isFunding) {
      return {
        agentId: 'Finance',
        reasoning: 'Structuring financial projections for seed-stage investment shows robust potential. Validating actual CAC/LTV parameters establishes institutional readiness.',
        recommendations: [{
          id: 'rec_f2',
          title: 'Publish Conservative Projections Model',
          description: 'Maintains GAAP standards. Highlights our 34% predictive scheduling cloud-cost reduction.',
          financialImpact: 0,
          riskRating: 'low'
        }],
        isConflict: false,
        metricChanges: { financialHealth: 12, legalCompliance: 5 }
      };
    } else {
      return {
        agentId: 'Finance',
        reasoning: 'Viral marketing programs can experience cloud resource scaling blowups. We must set clear boundaries on credits.',
        recommendations: [{
          id: 'rec_f3',
          title: 'Impose Campaign Budget Caps',
          description: 'Restricting discount credits to $1,200 per month maintains solid pre-seed metrics.',
          financialImpact: -1200,
          riskRating: 'low'
        }],
        isConflict: true,
        conflictReason: 'Growth proposed a 50% computations subsidy, which risks over $8,000/mo in server API costs and triggers compliance issues.',
        metricChanges: { financialHealth: -2, growthRate: 8, operationsEfficiency: -1 }
      };
    }
  };

  return callGeminiJson<AgentResponseDTO>(FINANCE_PROMPT, prompt, fallback, agentResponseSchema);
}

// 3. Talent Agent Service
export async function runTalentAgent(subtask: string, startupState: string, ragContext: string): Promise<AgentResponseDTO> {
  const prompt = `
TASK DELEGATED BY CEO: "${subtask}"

STARTUP STATE:
${startupState}

KNOWLEDGE DISCLOSURES (RAG):
${ragContext}

Analyze talent pipelines, source targets, and design option pool compensation ratios.
`;

  const fallback = (): AgentResponseDTO => {
    return {
      agentId: 'Talent',
      reasoning: 'Sourcing an executive-level platform architect requires a competitive offer. High-tier engineer bands are $145k base salary and 1.5% equity options with standard vesting.',
      recommendations: [{
        id: 'rec_t1',
        title: 'Offer $145,000 base with 1.5% options pool',
        description: 'Ensures we win top talent in a highly competitive devtools space. Includes a 12-month cliff and 48-month vesting schedules.',
        financialImpact: -12083,
        riskRating: 'medium'
      }],
      isConflict: false,
      metricChanges: { velocity: 15, operationsEfficiency: 10, financialHealth: -4 }
    };
  };

  return callGeminiJson<AgentResponseDTO>(TALENT_PROMPT, prompt, fallback, agentResponseSchema);
}

// 4. Growth Agent Service
export async function runGrowthAgent(subtask: string, startupState: string, ragContext: string): Promise<AgentResponseDTO> {
  const prompt = `
TASK DELEGATED BY CEO: "${subtask}"

STARTUP STATE:
${startupState}

KNOWLEDGE DISCLOSURES (RAG):
${ragContext}

Evaluate marketing campaigns, landing copies, conversion loops, and customer pipelines.
`;

  const fallback = (): AgentResponseDTO => {
    return {
      agentId: 'Growth',
      reasoning: 'To accelerate mid-market adoption, we should introduce a viral loop giving 50% computation server credits to users who bring qualified pilots.',
      recommendations: [{
        id: 'rec_g1',
        title: 'Launch a 50% Compute Referral Campaign',
        description: 'Drives viral growth coefficients and builds immediate waitlists.',
        financialImpact: -8000,
        riskRating: 'medium'
      }],
      isConflict: false,
      metricChanges: { growthRate: 18, velocity: 5, financialHealth: -3 }
    };
  };

  return callGeminiJson<AgentResponseDTO>(GROWTH_PROMPT, prompt, fallback, agentResponseSchema);
}

// 5. Operations Agent Service
export async function runOperationsAgent(subtask: string, startupState: string, ragContext: string): Promise<AgentResponseDTO> {
  const prompt = `
TASK DELEGATED BY CEO: "${subtask}"

STARTUP STATE:
${startupState}

KNOWLEDGE DISCLOSURES (RAG):
${ragContext}

Formulate system architecture, server deployment speedups, tool setup, and SOC-2 security protocols.
`;

  const fallback = (): AgentResponseDTO => {
    return {
      agentId: 'Operations',
      reasoning: 'Implementing automated server orchestration requires isolated auto-scaling node clusters. We must ensure robust capacity before high-traffic referral launch.',
      recommendations: [{
        id: 'rec_o1',
        title: 'Deploy Automated Failover Node Clusters',
        description: 'Configures auto-scaling and monitoring. Optimizes resource utilization across AWS/GCP nodes.',
        financialImpact: -400,
        riskRating: 'low'
      }],
      isConflict: false,
      metricChanges: { operationsEfficiency: 15, velocity: 8, legalCompliance: 2 }
    };
  };

  return callGeminiJson<AgentResponseDTO>(OPERATIONS_PROMPT, prompt, fallback, agentResponseSchema);
}

// 6. Legal Agent Service
export async function runLegalAgent(subtask: string, startupState: string, ragContext: string): Promise<AgentResponseDTO> {
  const prompt = `
TASK DELEGATED BY CEO: "${subtask}"

STARTUP STATE:
${startupState}

KNOWLEDGE DISCLOSURES (RAG):
${ragContext}

Audit contracts, IP safety disclosures, regulatory filings, and corporate structures.
`;

  const fallback = (): AgentResponseDTO => {
    return {
      agentId: 'Legal',
      reasoning: 'For hiring and pilot agreements, we must have clear IP protection and Regulation D exemptions to block compliance breaches.',
      recommendations: [{
        id: 'rec_l1',
        title: 'Integrate proprietary IP Assignment and NDA Protection',
        description: 'Implements absolute corporate ownership over employee code creations. Safeguards secret cloud optimization formulas.',
        financialImpact: 0,
        riskRating: 'low'
      }],
      isConflict: false,
      metricChanges: { legalCompliance: 18, operationsEfficiency: 4 }
    };
  };

  return callGeminiJson<AgentResponseDTO>(LEGAL_PROMPT, prompt, fallback, agentResponseSchema);
}

// 7. Conflict Resolver Service
export async function runConflictResolver(messages: any[], startupState: string): Promise<ConflictResolutionDTO> {
  const messagesContext = messages.map(m => `[${m.sender} to ${m.receiver}]: ${m.content} (isConflict: ${m.isConflict || false})`).join('\n');
  const prompt = `
MESSAGES REQUIRING MEDIATION:
${messagesContext}

STARTUP CURRENT STATE:
${startupState}

Analyze the clash, structure a compromise combining the performance requirements of Talent/Growth with the financial/regulatory restrictions of Finance/Legal.
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      conflictId: { type: Type.STRING },
      resolvedMetrics: {
        type: Type.OBJECT,
        properties: {
          financialChange: { type: Type.NUMBER },
          metricChanges: {
            type: Type.OBJECT,
            properties: {
              velocity: { type: Type.NUMBER },
              financialHealth: { type: Type.NUMBER },
              legalCompliance: { type: Type.NUMBER },
              growthRate: { type: Type.NUMBER },
              operationsEfficiency: { type: Type.NUMBER }
            },
            required: ['velocity', 'financialHealth', 'legalCompliance', 'growthRate', 'operationsEfficiency']
          }
        },
        required: ['financialChange', 'metricChanges']
      },
      resolutionText: { type: Type.STRING },
      compromiseDetails: { type: Type.STRING }
    },
    required: ['conflictId', 'resolvedMetrics', 'resolutionText', 'compromiseDetails']
  };

  const fallback = (): ConflictResolutionDTO => {
    const isHiringConflict = messages.some(m => m.content.toLowerCase().includes('salary') || m.content.toLowerCase().includes('145'));
    
    if (isHiringConflict) {
      return {
        conflictId: `con_${Date.now()}`,
        resolvedMetrics: {
          financialChange: -10666, // $128,000 base salary instead of $145,000 base
          metricChanges: {
            velocity: 15,
            financialHealth: -3,
            legalCompliance: 8,
            growthRate: 0,
            operationsEfficiency: 10
          }
        },
        resolutionText: 'Structured elegant compromise: Adjust Base Salary to $128,000 and increase option allocation to 1.65% with standard quarterly vesting.',
        compromiseDetails: 'Satisfies Talent incentive targets by offering high options equity upside while respecting CFO financial runway restrictions.'
      };
    } else {
      return {
        conflictId: `con_${Date.now()}`,
        resolvedMetrics: {
          financialChange: -1200,
          metricChanges: {
            velocity: -2,
            financialHealth: 6,
            legalCompliance: 5,
            growthRate: 10,
            operationsEfficiency: 8
          }
        },
        resolutionText: 'Structured campaign compromise: Implement a referral campaign capped at 1,000 compute credits ($15 value) per user, up to 5 referrals.',
        compromiseDetails: 'Allows Growth to maintain strong user acquisition loops while securing server cluster operations under a strict $1,200/mo cost cap.'
      };
    }
  };

  return callGeminiJson<ConflictResolutionDTO>(CONFLICT_PROMPT, prompt, fallback, responseSchema);
}

// 8. Approval Manager Service
export async function runApprovalManager(
  initiativeId: string,
  initiativeTitle: string, 
  initiativeDescription: string, 
  agentResponses: any[]
): Promise<any> {
  const prompt = `
INITIATIVE: "${initiativeTitle}"
DESCRIPTION: "${initiativeDescription}"

CONSOLIDATED EXECUTIVE RESPONSES:
${JSON.stringify(agentResponses)}

Compile the ultimate high-quality business Deliverable document in perfect, comprehensive Markdown format.
No placeholders. Ensure all numbers, legal schedules, or plans are concrete and professionally designed.
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      initiativeId: { type: Type.STRING },
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      type: { type: Type.STRING }, // 'document' | 'contract' | 'financials' | 'marketing_plan' | 'policy'
      content: { type: Type.STRING },
      impact: { type: Type.STRING },
      financialChange: { type: Type.NUMBER },
      metricChanges: {
        type: Type.OBJECT,
        properties: {
          velocity: { type: Type.INTEGER },
          financialHealth: { type: Type.INTEGER },
          legalCompliance: { type: Type.INTEGER },
          growthRate: { type: Type.INTEGER },
          operationsEfficiency: { type: Type.INTEGER }
        }
      }
    },
    required: ['id', 'initiativeId', 'title', 'description', 'type', 'content', 'impact', 'financialChange', 'metricChanges']
  };

  const fallback = (): any => {
    const isHiring = initiativeTitle.toLowerCase().includes('engineer') || initiativeTitle.toLowerCase().includes('hire');
    const isFunding = initiativeTitle.toLowerCase().includes('funding') || initiativeTitle.toLowerCase().includes('seed') || initiativeTitle.toLowerCase().includes('pitch');

    if (isHiring) {
      return {
        id: `del_${Date.now()}`,
        initiativeId,
        title: 'Lead Platform Engineer Offer Package & Option Pool Vesting Agreement',
        description: 'Vetted compensation structures, 12-month cliff clauses, and IP protection agreements.',
        type: 'contract',
        content: `# STRATEGIC RECRUITMENT AND COMPENSATION CHARTER\n\n### Offer Structure\n- **Position:** Lead Core Platform Infrastructure\n- **Annual Base:** $128,000 USD\n- **Equity Allocation:** 1.65% Non-qualified Stock Options (NSOs)\n\n### Legal & Protective Provisions\n1. **Vesting Schedule:** 4 years monthly vesting with 1-year initial cliff.\n2. **Confidentiality:** Post-termination non-disclosure of core orchestration engine code.\n3. **IP Protection:** Standard corporate IP Assignment and Proprietary Information clause.\n\n### Treasury Modeling\n- Monthly burn adjustments modeled at -$10,666.\n- Cash reserve runway projected at 12.1 months.`,
        impact: 'Boosts platform performance velocity (+15 points), optimizes ops efficiency, decreases runway by 1.1 months.',
        financialChange: -10666,
        metricChanges: { velocity: 15, financialHealth: -3, operationsEfficiency: 10, legalCompliance: 8 }
      };
    } else if (isFunding) {
      return {
        id: `del_${Date.now()}`,
        initiativeId,
        title: 'Institutional Seed Funding Pitch Deck Outline',
        description: 'Vetted investor presentation outline detailing financials, waitlist conversions, and product specs.',
        type: 'document',
        content: `# INVESTOR SEED ROUND BRIEFING CHARTER\n\n### Executive Summary\nSeeking **$1,500,000 USD** seed funding at a **$10,000,000** valuation cap to expand engineering bandwidth.\n\n### Key Metrics\n- **Current Pipeline Value:** $120,000 (qualified waitlist and trials)\n- **Uptime:** 99.98% validated orchestrator uptime\n- **Target CAC:** $250 with target payback of 5.5 months\n\n### Use of Proceeds\n- 65% - Engineering & Core Platform automation\n- 20% - Enterprise Growth pipeline loops\n- 15% - Compliance, SOC-2, and Legal audits`,
        impact: 'Dramatically improves financial rating upon successful closing (+20 points) and opens investor channels.',
        financialChange: 1500000,
        metricChanges: { financialHealth: 20, growthRate: 15, legalCompliance: 5 }
      };
    } else {
      return {
        id: `del_${Date.now()}`,
        initiativeId,
        title: 'CatalystOS Pilot launch Campaign & Referral Guidelines',
        description: 'Referral loop parameters, compute credit limits, and server scaling setups.',
        type: 'marketing_plan',
        content: `# PLATFORM INFORMATION SECURITY AND ACCESS CONTROL POLICY\n\n### Objective\nTo establish strict access rules, audit controls, and encryption schedules to satisfy SOC-2 criteria.\n\n### Access Protocols\n- Multi-factor authentication (MFA) required on all production systems.\n- IAM policies scoped strictly under least-privilege constraints.\n\n### Data Handling\n1. **In-Transit:** TLS 1.3 protocol enforced across all active API connections.\n2. **At-Rest:** AES-256 database and storage layer encryption.\n3. **Logging:** Immutable connection metrics aggregated into central secure logs.`,
        impact: 'Secures compliance standards (+15 points), optimizes operations efficiency, minor velocity drag.',
        financialChange: -1200,
        metricChanges: { legalCompliance: 15, operationsEfficiency: 8, velocity: -2, growthRate: 10 }
      };
    }
  };

  return callGeminiJson<any>(APPROVAL_PROMPT, prompt, fallback, responseSchema);
}
