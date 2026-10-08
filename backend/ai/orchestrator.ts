import { Initiative, WorkflowTask, AgentMessage, Deliverable } from '../../src/types';
import { Type } from '@google/genai';
import { callModelJson } from './gemini.service';
import { loadPromptAsset, renderPromptTemplate } from './prompt-loader';
import { vectorService } from '../rag/vector.service';
import { memorySystem } from './memory';
import { toolRegistry } from './tool-registry';
import { PlannerOutputDTO, AgentResponseDTO, ConflictResolutionDTO } from '../agents/types';

// Simple helper to find avatar for roles
const getAvatarByRole = (role: string): string => {
  switch (role) {
    case 'CEO': return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150';
    case 'Finance': return 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150';
    case 'Talent': return 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150';
    case 'Growth': return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150';
    case 'Operations': return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150';
    case 'Legal': return 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150';
    case 'ConflictResolver': return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150';
    case 'ApprovalManager': return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150';
    default: return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150';
  }
};

export async function runOrchestrationLoop(
  initiative: Initiative,
  startupProfile: any,
  knowledgeFiles: any[]
): Promise<any> {
  console.log(`[Orchestrator] Launching Multi-Agent System for Initiative: "${initiative.title}"`);

  // Clear and Re-Index vector service with any updated knowledge files
  vectorService.clear();
  for (const doc of knowledgeFiles) {
    vectorService.indexDocument(doc.id, doc.name, `${doc.summary}\n\nKey Insights:\n${doc.insights.join('\n')}`);
  }

  const startupStateStr = JSON.stringify(startupProfile, null, 2);

  // Load Prompt assets for CEO
  const ceoSystem = loadPromptAsset('CEO', 'system.md') || 'You are Sophia Vance, the autonomous CEO Planner Agent.';
  const ceoConstraints = loadPromptAsset('CEO', 'constraints.md');
  const fullCeoSystem = ceoConstraints 
    ? `${ceoSystem}\n\n### CONSTRAINTS & LIMITATIONS:\n${ceoConstraints}`
    : ceoSystem;

  const ceoTemplate = loadPromptAsset('CEO', 'prompt.md') || 'Decompose: {{goal}}\nContext: {{context}}';

  // Step 1: Run RAG Search to see if any pre-loaded files correspond to our goal
  const rawRagText = await vectorService.query(initiative.description, 3);

  // Compile CEO context
  const renderedCeoPrompt = renderPromptTemplate(ceoTemplate, {
    goal: initiative.description,
    context: startupStateStr,
    rag: rawRagText,
    agents: 'CEO, Finance, Talent, Growth, Operations, Legal'
  });

  const ceoSchema = {
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

  const fallbackCeo = (): PlannerOutputDTO => {
    const isHiringScenario = initiative.id === 'init_demo_hiring' || 
      initiative.title.toLowerCase().includes('hire') || 
      initiative.title.toLowerCase().includes('engineer') ||
      initiative.title.toLowerCase().includes('launch');

    if (isHiringScenario) {
      return {
        initiativeId: initiative.id || `init_${Date.now()}`,
        founderGoal: initiative.description,
        requiredExecutives: ['Finance', 'Operations', 'Growth'],
        ragQueryString: 'NovaTech enterprise launch runway pilot customers engineering bottleneck',
        decomposedTasks: [
          { id: 'task_f1', assignedTo: 'Finance', title: 'Stress test runway impact of 2 new senior hires (-₹4L/mo) vs 1 senior hire (-₹2L/mo) against ₹72L reserves', constraints: 'Maintain minimum 6-month runway buffer.' },
          { id: 'task_o1', assignedTo: 'Operations', title: 'Evaluate 3-developer bandwidth bottleneck and onboarding mentorship drag on 6-week launch sprint', constraints: 'Current team at 95% capacity; avoid 25% sprint drag.' },
          { id: 'task_g1', assignedTo: 'Growth', title: 'Quantify delivery commitments for 5 enterprise pilot partners and ₹25L ARR launch milestone', constraints: 'Release committed in 6 weeks.' }
        ],
        expectedDeliverables: [{ type: 'contract', title: 'Executive Decision: Hire 1 Senior Platform Infrastructure Engineer' }]
      };
    }

    return {
      initiativeId: `init_${Date.now()}`,
      founderGoal: initiative.description,
      requiredExecutives: ['Finance', 'Operations', 'Growth'],
      ragQueryString: 'strategic growth expansion budget planning',
      decomposedTasks: [
        { id: 'task_f1', assignedTo: 'Finance', title: 'Audit treasury bounds & cash burn impact', constraints: 'Protect 12-month runway.' },
        { id: 'task_o1', assignedTo: 'Operations', title: 'Assess infrastructure scaling and delivery limits', constraints: 'Maintain 99.9% uptime.' },
        { id: 'task_g1', assignedTo: 'Growth', title: 'Model acquisition conversion and revenue upside', constraints: 'Target 30% MoM growth.' }
      ],
      expectedDeliverables: [{ type: 'document', title: 'Strategic Initiative Execution Roadmap' }]
    };
  };

  console.log('[Orchestrator] Running Sophia Vance (CEO Planner)...');
  const ceoPlan = await callModelJson<PlannerOutputDTO>(renderedCeoPrompt, {
    systemInstruction: fullCeoSystem,
    responseSchema: ceoSchema,
    temperature: 0.7
  }, fallbackCeo);

  const messages: AgentMessage[] = [];
  const completedTasks: WorkflowTask[] = [];
  const agentResponses: AgentResponseDTO[] = [];

  // Add CEO start message
  messages.push({
    id: `msg_ceo_start_${Date.now()}`,
    sender: 'CEO',
    receiver: 'All',
    content: `Team, we are launching an important initiative: "${ceoPlan.founderGoal}". I have decomposed our objectives and assigned concrete tasks. Let's coordinate immediately to secure quality execution.`,
    timestamp: new Date().toISOString()
  });

  // Query secondary RAG context based on CEO's special ragQueryString!
  const targetedRagText = await vectorService.query(ceoPlan.ragQueryString, 3);

  // Common Specialty Agent response schema
  const agentSchema = {
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

  // Step 2: Iterate through decomposed tasks and trigger specific agents
  for (const task of ceoPlan.decomposedTasks) {
    const role = task.assignedTo;
    console.log(`[Orchestrator] Running agent: ${role} on task: "${task.title}"`);

    // Load agent prompts
    const agentSystem = loadPromptAsset(role, 'system.md') || `You are the ${role} executive agent.`;
    const agentConstraints = loadPromptAsset(role, 'constraints.md');
    const fullAgentSystem = agentConstraints 
      ? `${agentSystem}\n\n### CONSTRAINTS & LIMITATIONS:\n${agentConstraints}`
      : agentSystem;

    const agentTemplate = loadPromptAsset(role, 'prompt.md') || `Task: {{task}}\nContext: {{context}}`;

    const renderedAgentPrompt = renderPromptTemplate(agentTemplate, {
      task: task.title,
      context: startupStateStr,
      rag: targetedRagText
    });

    const fallbackAgent = (): AgentResponseDTO => {
      const isHiring = task.title.toLowerCase().includes('salary') || 
        task.title.toLowerCase().includes('compensation') || 
        task.title.toLowerCase().includes('hire') || 
        task.title.toLowerCase().includes('engineer');

      if (role === 'Finance') {
        return {
          agentId: 'Finance',
          reasoning: isHiring
            ? 'Aura (Finance) runway audit: NovaTech holds ₹72,00,000 in liquid reserves with an ₹8,00,000/month burn rate (9.0 months runway). Adding 2 senior engineers increases monthly burn to ₹12,00,000/mo, collapsing runway to 5.5 months—breaching our 6-month safety buffer before the enterprise launch. Adding 1 senior engineer increases monthly burn to ₹10,00,000/mo, maintaining a safe 7.8 months of runway.'
            : 'Aura (Finance) treasury audit: Verified expenditure against liquid capital and monthly burn rate. Runway preserves target tolerance boundaries.',
          recommendations: [{
            id: `rec_finance_1`,
            title: isHiring ? 'Approve 1 Senior Hire (Defer Second Hire to Post-Launch)' : 'Authorize Controlled Expenditure',
            description: isHiring
              ? 'Authorizes 1 senior platform engineer. Preserves 7.8 months of operational runway while unlocking core backend throughput.'
              : 'Approve budgeted capital deployment with strict monthly milestone reviews.',
            financialImpact: isHiring ? -200000 : -100000,
            riskRating: 'medium'
          }],
          isConflict: isHiring, // Clash: 2 hires creates unsafe burn
          conflictReason: isHiring ? 'Adding 2 engineers simultaneously reduces cash runway to 5.5 months, breaching our 6-month fiscal safety boundary.' : undefined,
          metricChanges: {
            velocity: 15,
            financialHealth: -2,
            legalCompliance: 0,
            growthRate: 0,
            operationsEfficiency: 10
          }
        };
      }

      if (role === 'Operations') {
        return {
          agentId: 'Operations',
          reasoning: isHiring
            ? 'Helix (Operations) bottleneck audit: Our 3-developer core team is running at 95% workload capacity. Onboarding 2 new developers concurrently introduces a 25% mentorship overhead, slowing sprint velocity right before the 6-week launch. A single senior platform specialist can be integrated in under 10 days with minimal team disruption.'
            : 'Helix (Operations) delivery audit: Reviewed workflow bottlenecks and confirmed operational pipeline is capable of absorbing this initiative.',
          recommendations: [{
            id: `rec_ops_1`,
            title: isHiring ? 'Targeted Platform Infrastructure Integration' : 'Optimize Delivery Pipeline',
            description: isHiring
              ? 'Assign 1 senior engineer strictly to CI/CD pipeline automation and enterprise API reliability to protect launch deadline.'
              : 'Streamline operational procedures and eliminate handoff bottlenecks across modules.',
            financialImpact: 0,
            riskRating: 'low'
          }],
          isConflict: false,
          metricChanges: {
            velocity: 18,
            financialHealth: 0,
            legalCompliance: 0,
            growthRate: 5,
            operationsEfficiency: 15
          }
        };
      }

      if (role === 'Growth') {
        return {
          agentId: 'Growth',
          reasoning: isHiring
            ? 'Vector (Growth) market impact audit: NovaTech has 5 enterprise pilot agreements committed for launch in 6 weeks, unlocking ₹25,00,000 in ARR. Missing this milestone due to platform bottlenecks risks pilot cancellation. We need immediate platform throughput to fulfill pilot SLAs.'
            : 'Vector (Growth) market audit: Verified customer acquisition trajectory. Initiative directly accelerates qualified pipeline conversion.',
          recommendations: [{
            id: `rec_growth_1`,
            title: isHiring ? 'Accelerate Enterprise Pilot Delivery SLAs' : 'Deploy Growth Acceleration Loop',
            description: isHiring
              ? 'Deploy platform capacity to satisfy data security and throughput criteria for the 5 enterprise pilot partners.'
              : 'Launch targeted acquisition campaigns to capture high-intent enterprise pipeline.',
            financialImpact: 2500000,
            riskRating: 'low'
          }],
          isConflict: false,
          metricChanges: {
            velocity: 10,
            financialHealth: 5,
            legalCompliance: 0,
            growthRate: 15,
            operationsEfficiency: 5
          }
        };
      }

      // Default specialty agent fallback
      return {
        agentId: role,
        reasoning: `Executed subtask: "${task.title}". Analyzed boundaries, constraints, and dependencies.`,
        recommendations: [{
          id: `rec_${role.toLowerCase()}_1`,
          title: `Approve ${role} parameters`,
          description: `Vetted target limits for: "${task.title}".`,
          financialImpact: 0,
          riskRating: 'low'
        }],
        isConflict: false,
        metricChanges: {
          velocity: 5,
          financialHealth: 0,
          legalCompliance: role === 'Legal' ? 15 : 0
        }
      };
    };

    const response = await callModelJson<AgentResponseDTO>(renderedAgentPrompt, {
      systemInstruction: fullAgentSystem,
      responseSchema: agentSchema,
      temperature: 0.7
    }, fallbackAgent);

    agentResponses.push(response);

    // Save as message in the thread
    messages.push({
      id: `msg_${role.toLowerCase()}_${Date.now()}`,
      sender: role,
      receiver: 'CEO',
      content: `${response.reasoning}\n\n**Recommendations:**\n${response.recommendations.map(r => `- **${r.title}**: ${r.description} (Est. Impact: $${r.financialImpact})`).join('\n')}`,
      timestamp: new Date().toISOString(),
      isConflict: response.isConflict
    });

    // Add memory log
    if (response.recommendations.length > 0) {
      memorySystem.logMemory(
        ceoPlan.initiativeId,
        role === 'Finance' ? 'financial_policy' : role === 'Legal' ? 'compliance_standard' : 'hiring_criteria',
        response.recommendations[0].title,
        response.recommendations[0].description
      );
    }

    completedTasks.push({
      id: task.id,
      title: task.title,
      assignedTo: role,
      status: 'completed',
      result: response.reasoning
    });
  }

  // Step 3: Conflict detection and resolution
  const conflictsExist = agentResponses.some(r => r.isConflict);
  let resolvedMetrics: any = null;

  if (conflictsExist) {
    console.log('[Orchestrator] Conflicts detected. Deploying Pax-9 Synthesis (ConflictResolver)...');

    const conflictSystem = loadPromptAsset('ConflictResolver', 'system.md') || 'You are Pax-9 Synthesis, Corporate Compromise Mediator.';
    const conflictConstraints = loadPromptAsset('ConflictResolver', 'constraints.md');
    const fullConflictSystem = conflictConstraints
      ? `${conflictSystem}\n\n### CONSTRAINTS & LIMITATIONS:\n${conflictConstraints}`
      : conflictSystem;

    const conflictTemplate = loadPromptAsset('ConflictResolver', 'prompt.md') || 'Resolve conflict for these messages:\n{{messages}}';

    const renderedConflictPrompt = renderPromptTemplate(conflictTemplate, {
      messages: messages.map(m => `[${m.sender}]: ${m.content} (isConflict: ${m.isConflict || false})`).join('\n'),
      context: startupStateStr
    });

    const conflictSchema = {
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

    const fallbackResolver = (): ConflictResolutionDTO => {
      const isHiring = initiative.id === 'init_demo_hiring' || 
        initiative.title.toLowerCase().includes('hire') || 
        initiative.title.toLowerCase().includes('engineer') || 
        initiative.title.toLowerCase().includes('launch');

      if (isHiring) {
        return {
          conflictId: `con_${Date.now()}`,
          resolvedMetrics: {
            financialChange: -200000,
            metricChanges: { velocity: 20, financialHealth: -2, legalCompliance: 5, growthRate: 12, operationsEfficiency: 15 }
          },
          resolutionText: 'Executive Consensus: Proceed with hiring ONE senior platform engineer immediately. Defer second hire to post-launch.',
          compromiseDetails: 'Balances Aura\'s runway preservation goals (maintaining 7.8 months of runway) with Helix\'s onboarding bandwidth and Vector\'s 5 enterprise pilot SLA commitments.'
        };
      }

      return {
        conflictId: `con_${Date.now()}`,
        resolvedMetrics: {
          financialChange: -100000,
          metricChanges: { velocity: 15, financialHealth: -2, legalCompliance: 8, growthRate: 10, operationsEfficiency: 10 }
        },
        resolutionText: 'Structured elegant compromise: Re-align budget allocations and deploy phased milestone pacing.',
        compromiseDetails: 'Maintains runway margin while achieving operational targets.'
      };
    };

    const resolution = await callModelJson<ConflictResolutionDTO>(renderedConflictPrompt, {
      systemInstruction: fullConflictSystem,
      responseSchema: conflictSchema,
      temperature: 0.7
    }, fallbackResolver);

    resolvedMetrics = resolution;

    messages.push({
      id: `msg_resolver_${Date.now()}`,
      sender: 'ConflictResolver',
      receiver: 'All',
      content: `### Conflict Mediated Successfully\n\n**Resolution:** ${resolution.resolutionText}\n\n**Compromise Details:** ${resolution.compromiseDetails}`,
      timestamp: new Date().toISOString()
    });
  }

  // Step 4: Package final deliverables using ApprovalManager (Loom-V Director)
  console.log('[Orchestrator] Running Loom-V Director (ApprovalManager)...');
  const approvalSystem = loadPromptAsset('ApprovalManager', 'system.md') || 'You are the Loom-V Director.';
  const approvalConstraints = loadPromptAsset('ApprovalManager', 'constraints.md');
  const fullApprovalSystem = approvalConstraints
    ? `${approvalSystem}\n\n### CONSTRAINTS & LIMITATIONS:\n${approvalConstraints}`
    : approvalSystem;

  const approvalTemplate = loadPromptAsset('ApprovalManager', 'prompt.md') || 'Package deliverables: {{title}}';

  const renderedApprovalPrompt = renderPromptTemplate(approvalTemplate, {
    title: initiative.title,
    description: initiative.description,
    responses: JSON.stringify(agentResponses)
  });

  const approvalSchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      initiativeId: { type: Type.STRING },
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      type: { type: Type.STRING },
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

  const fallbackApproval = (): any => {
    const isHiring = initiative.id === 'init_demo_hiring' || 
      initiative.title.toLowerCase().includes('hire') || 
      initiative.title.toLowerCase().includes('engineer') || 
      initiative.title.toLowerCase().includes('launch');

    if (isHiring) {
      return {
        id: `del_${Date.now()}`,
        initiativeId: ceoPlan.initiativeId,
        title: 'Executive Decision: Hire 1 Senior Platform Infrastructure Engineer',
        description: 'Synthesized council resolution approving 1 senior engineer to eliminate the 6-week launch bottleneck while preserving 7.8 months of runway.',
        type: 'contract',
        content: `# EXECUTIVE COUNCIL DECISION CHARTER: HIRING AUTHORIZATION\n\n### Strategic Recommendation\n**Proceed with hiring ONE senior platform engineer immediately.** Defer the second engineering hire to the post-launch milestone.\n\n### Council Consensus Analysis\n- **Atlas (CEO / Strategy):** Aligned with the 6-week enterprise launch sprint; resolves core backend delivery bottleneck.\n- **Aura (Finance):** Rejects 2 hires (runway collapses from 9.0m to 5.5m). Approves 1 hire (burn increases to ₹10L/mo, runway safely preserved at 7.8m).\n- **Helix (Operations):** 1 senior engineer integrates in 10 days; avoids the 25% mentorship overhead of onboarding 2 developers during active sprint.\n- **Vector (Growth):** Protects launch SLAs for 5 enterprise pilot partners and unlocks ₹25,00,000 in ARR.\n\n### Financial & Operational Impact\n- **Headcount:** +1 (Engineering team grows from 3 to 4, total team to 9)\n- **Monthly Burn:** Increases by ₹2,00,000 / month\n- **Cash Runway:** 7.8 Months (Above 6-month safety buffer)\n- **Sprint Velocity:** +20%\n- **Risk Rating:** Low-Medium\n- **Confidence:** 94% High`,
        impact: 'Eliminates the 6-week enterprise launch bottleneck while preserving 7.8 months of cash runway.',
        financialChange: -200000,
        metricChanges: { velocity: 20, financialHealth: -2, legalCompliance: 5, growthRate: 12, operationsEfficiency: 15 }
      };
    }

    return {
      id: `del_${Date.now()}`,
      initiativeId: ceoPlan.initiativeId,
      title: 'Strategic Growth & Operational Execution Charter',
      description: 'Council-approved operational roadmap aligning capital governance and milestone delivery.',
      type: 'document',
      content: `# STRATEGIC INITIATIVE EXECUTION CHARTER\n\n- **Objective:** Accelerate roadmap execution under capital governance constraints.\n- **Financial Thresholds:** Monthly burn ceiling enforced.\n- **Operational Checkpoints:** Bi-weekly executive council audit review.`,
      impact: 'Improves execution velocity while protecting capital efficiency.',
      financialChange: -100000,
      metricChanges: { velocity: 15, financialHealth: -2, legalCompliance: 8, growthRate: 10, operationsEfficiency: 10 }
    };
  };

  const finalDeliverable = await callModelJson<any>(renderedApprovalPrompt, {
    systemInstruction: fullApprovalSystem,
    responseSchema: approvalSchema,
    temperature: 0.7
  }, fallbackApproval);

  // Apply resolved conflict parameters if present
  if (resolvedMetrics) {
    finalDeliverable.financialChange = resolvedMetrics.resolvedMetrics.financialChange;
    finalDeliverable.metricChanges = resolvedMetrics.resolvedMetrics.metricChanges;
  }

  const deliverables: Deliverable[] = [{
    id: finalDeliverable.id || `del_${Date.now()}`,
    initiativeId: initiative.id,
    title: finalDeliverable.title,
    description: finalDeliverable.description,
    type: finalDeliverable.type || 'document',
    status: 'pending_review',
    content: finalDeliverable.content,
    impact: finalDeliverable.impact,
    financialChange: finalDeliverable.financialChange,
    metricChanges: finalDeliverable.metricChanges
  }];

  // Final confirmation message from Sophia (CEO)
  messages.push({
    id: `msg_ceo_final_${Date.now()}`,
    sender: 'CEO',
    receiver: 'All',
    content: `Our strategic planning session has completed successfully. Loom-V Director has packaged our final corporate deliverable: **"${deliverables[0].title}"**. I have directed this to the Founder Approval Queue for high-fidelity review.`,
    timestamp: new Date().toISOString()
  });

  return {
    tasks: completedTasks,
    messages,
    deliverables
  };
}
