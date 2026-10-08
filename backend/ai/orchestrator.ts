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
    return {
      initiativeId: `init_${Date.now()}`,
      founderGoal: initiative.description,
      requiredExecutives: ['Finance', 'Talent', 'Legal'],
      ragQueryString: 'engineer recruitment stock vesting options',
      decomposedTasks: [
        { id: 'task_t1', assignedTo: 'Talent', title: 'Audit lead platforms developer salary ranges.', constraints: 'Keep options target at 1.5%.' },
        { id: 'task_f1', assignedTo: 'Finance', title: 'Verify base budget availability.', constraints: 'Do not drop runway under 11 months.' },
        { id: 'task_l1', assignedTo: 'Legal', title: 'Verify vesting compliance and clauses.', constraints: '4-year vesting, 1-year cliff.' }
      ],
      expectedDeliverables: [{ type: 'contract', title: 'Automated Platform Lead Offer Package' }]
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
      // Basic deterministic fallback
      const isHiring = task.title.toLowerCase().includes('salary') || task.title.toLowerCase().includes('compensation') || task.title.toLowerCase().includes('engineer');
      const isFinance = role === 'Finance';
      
      return {
        agentId: role,
        reasoning: `Executed subtask: "${task.title}". Analyzed boundaries, constraints, and dependencies.`,
        recommendations: [{
          id: `rec_${role.toLowerCase()}_1`,
          title: `Approve ${role} parameters`,
          description: `Vetted target limits for: "${task.title}".`,
          financialImpact: isFinance ? (isHiring ? -115000 / 12 : -1200) : 0,
          riskRating: 'low'
        }],
        isConflict: isFinance && isHiring, // standard CFO clash
        conflictReason: isFinance && isHiring ? 'Salary request cuts our runway below safe pre-seed levels.' : undefined,
        metricChanges: {
          velocity: 5,
          financialHealth: isFinance ? -4 : 2,
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
      return {
        conflictId: `con_${Date.now()}`,
        resolvedMetrics: {
          financialChange: -10666,
          metricChanges: { velocity: 15, financialHealth: -3, legalCompliance: 8, growthRate: 0, operationsEfficiency: 10 }
        },
        resolutionText: 'Structured elegant compromise: Adjust base salary limit to $128,000, compensated with 1.65% options equity.',
        compromiseDetails: 'Balances Talent recruitment requirements with CFO runway preservation goals.'
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
    return {
      id: `del_${Date.now()}`,
      initiativeId: ceoPlan.initiativeId,
      title: 'DevOps Platform Architecture Hiring & Options Policy',
      description: 'Fully vetted employment agreement detailing stock pool limits, vesting, and NDAs.',
      type: 'contract',
      content: `# LEAD INFRASTRUCTURE DEVELOPER COMPENSATION CHARTER\n\n- **Base Salary:** $128,000 USD\n- **Equity Grant:** 1.65% Stock Options pool\n- **Vesting:** 4-year standard, 1-year cliff.\n- **Legal terms:** Broad intellectual property assignment clauses protecting proprietary scheduling code.`,
      impact: 'Dramatically improves development velocity (+15) and infrastructure setup while preserving cash-runway bounds.',
      financialChange: -10666,
      metricChanges: { velocity: 15, financialHealth: -3, legalCompliance: 8, growthRate: 0, operationsEfficiency: 10 }
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
