export type DirectiveIntent =
  | 'general_question'
  | 'knowledge_query'
  | 'analysis_recommendation'
  | 'planning'
  | 'task_creation'
  | 'workflow_execution'
  | 'financial_scenario'
  | 'approval_action'
  | 'cross_domain_directive'
  | 'unsupported_capability'
  | 'greeting';

export type OrchestrationDomain =
  | 'finance'
  | 'product_engineering'
  | 'growth'
  | 'operations'
  | 'people_talent'
  | 'legal_compliance'
  | 'auditor';

export type DagStepStatus =
  | 'planned'
  | 'awaiting_approval'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

export interface AssignedAgentInfo {
  role: string;
  name: string;
  avatar: string;
  domain: OrchestrationDomain;
}

export interface DagStep {
  id: string;
  stepNumber: number;
  title: string;
  domain: OrchestrationDomain;
  capability: string;
  assignedAgent: AssignedAgentInfo;
  dependsOn: string[];
  expectedOutput: string;
  status: DagStepStatus;
  input?: any;
  output?: any;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface OrchestrationDagPlan {
  id: string;
  objective: string;
  intent: DirectiveIntent;
  steps: DagStep[];
  risksAndConstraints: string[];
  requiredApprovals: string[];
  estimatedEffort?: string;
}

export interface CreatedRecordReference {
  type: 'task' | 'plan' | 'approval' | 'decision' | 'document';
  id: string;
  title: string;
  status?: string;
  details?: string;
}

export interface OrchestrationRunResult {
  summary: string;
  completedWork: string[];
  keyFindings: string[];
  calculations: Array<{ metric: string; value: string; source: string }>;
  assumptions: string[];
  createdRecords: CreatedRecordReference[];
  failedOrBlockedSteps: Array<{ id: string; title: string; reason: string }>;
  founderDecisions: string[];
  recommendedActions: Array<{ label: string; action: string; payload?: any }>;
  evidence: Array<{ citationId: string; documentId?: string; documentName?: string; excerpt: string }>;
}

export interface OrchestrationRun {
  runId: string;
  userId: string;
  startupId: string;
  directive: string;
  intent: DirectiveIntent;
  objective: string;
  status: 'planning' | 'running' | 'completed' | 'needs_approval' | 'failed' | 'blocked' | 'cancelled';
  currentPhase: string;
  plan: OrchestrationDagPlan | null;
  tasks: DagStep[];
  createdRecords: {
    tasks?: Array<{ id: string; title: string; assignedTo: string; status: string }>;
    plans?: Array<{ id: string; title: string; status: string }>;
    approvals?: Array<{ id: string; title: string; type: string; impact: string }>;
    decisions?: Array<{ id: string; title: string; category: string; impact: string }>;
  };
  result: OrchestrationRunResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapabilityRegistryEntry {
  id: string;
  name: string;
  domain: OrchestrationDomain;
  agentRole: string;
  agentName: string;
  description: string;
  isSupported: boolean;
}
