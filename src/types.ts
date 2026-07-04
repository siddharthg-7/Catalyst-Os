/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StartupProfile {
  name: string;
  industry: string;
  description: string;
  fundingStage: string;
  cashBalance: number;
  burnRate: number;
  runwayMonths: number;
  healthScore: number;
  metrics: {
    velocity: number;
    financialHealth: number;
    legalCompliance: number;
    growthRate: number;
    operationsEfficiency: number;
  };
}

export type AgentRole =
  | 'CEO'
  | 'Finance'
  | 'Talent'
  | 'Growth'
  | 'Operations'
  | 'Legal'
  | 'ConflictResolver'
  | 'ApprovalManager';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  avatar: string;
  description: string;
  status: 'idle' | 'analyzing' | 'collaborating' | 'generating' | 'reviewing';
  currentTask?: string;
  keyMetric: string;
  metricValue: string;
  color: string;
}

export interface AgentMessage {
  id: string;
  sender: AgentRole;
  receiver: AgentRole | 'All';
  content: string;
  timestamp: string;
  isConflict?: boolean;
}

export interface WorkflowTask {
  id: string;
  title: string;
  assignedTo: AgentRole;
  status: 'pending' | 'in_progress' | 'completed';
  result?: string;
}

export interface Deliverable {
  id: string;
  initiativeId: string;
  title: string;
  description: string;
  type: 'document' | 'contract' | 'financials' | 'marketing_plan' | 'policy';
  status: 'pending_review' | 'approved' | 'rejected';
  content: string;
  impact: string;
  financialChange?: number;
  metricChanges?: {
    velocity?: number;
    financialHealth?: number;
    legalCompliance?: number;
    growthRate?: number;
    operationsEfficiency?: number;
  };
}

export interface Initiative {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  category: 'funding' | 'hiring' | 'growth' | 'operations' | 'legal';
  createdAt: string;
  currentTaskIndex: number;
  tasks: WorkflowTask[];
  messages: AgentMessage[];
  deliverables: Deliverable[];
  mcp_tool_calls?: MCPToolCall[];
}

export interface MCPToolCall {
  tool: string;
  input: any;
  output: any;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters?: any;
}

export interface VaultStatus {
  status: 'connected' | 'fallback';
  vaultAddr: string;
  keysFound: string[];
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  summary: string;
  insights: string[];
}

export type UserRole = 'Founder' | 'Executive' | 'Admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface DecisionRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  timestamp: string;
  impactText: string;
  financialImpact: number;
  status: 'approved' | 'rejected';
}
