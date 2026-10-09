import { prisma, safeDbQuery } from './dbService';
import { callModelJson } from '../ai/gemini.service';
import { Type } from '@google/genai';

export interface EmployeeRecord {
  id?: string;
  name: string;
  domain: string;
  status: 'Available' | 'Busy';
  email?: string;
  role?: string;
  skills?: string[];
}

export interface AgentTaskAllocation {
  requiredDomain: string;
  subTaskTitle: string;
  taskScope: string;
  planSteps: string[];
  assignedAgent: {
    name: string;
    role: string;
    avatar: string;
    description: string;
  };
  status: 'ASSIGNED' | 'HIRE_REQUIRED';
  assignedWorker: {
    id?: string;
    name: string;
    domain: string;
    status: 'Available' | 'Busy';
    email?: string;
  } | null;
  executionStatus: 'IN_PROGRESS' | 'BLOCKED' | 'PAUSED' | 'COMPLETED';
  monitoringStatus: 'Pending Approval' | 'In Progress' | 'Action Required' | 'Paused' | 'Completed';
  systemAlert?: string;
  hiringSuggestion?: string;
  hinglishRecommendation?: string;
  headControls: {
    canPause: boolean;
    canRevoke: boolean;
    canPostJob: boolean;
    canAssign: boolean;
  };
}

export interface MasterTrackingRow {
  subTask: string;
  assignedAgent: string;
  humanEmployee: string;
  executionStatus: string;
  rawExecutionStatus: 'IN_PROGRESS' | 'BLOCKED' | 'PAUSED' | 'COMPLETED';
  headControls: Array<'Pause' | 'Revoke' | 'Click to Post Job' | 'Assign Worker'>;
}

export interface MultiAgentAssessmentResult {
  id: string;
  projectName: string;
  inputTask: string;
  currentStep: number; // 1 to 5
  pipelineStatus: 'EXECUTING' | 'BLOCKED_ON_HIRE' | 'COMPLETED' | 'PAUSED';
  totalDomains: number;
  assignedCount: number;
  hireRequiredCount: number;
  allocations: AgentTaskAllocation[];
  monitoringBlueprint: MasterTrackingRow[];
  alerts: Array<{
    domain: string;
    severity: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    recommendation: string;
    hinglishRecommendation?: string;
  }>;
  executionGated: boolean;
  gateReason?: string;
  timestamp: string;
}

// Canonical Domain to Agent Mapping
const DOMAIN_AGENT_MAP: Record<string, { name: string; role: string; avatar: string; description: string }> = {
  'frontend': {
    name: 'Designer Agent',
    role: 'Frontend UI Architect (Atlas-UI)',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    description: 'Component architecture, reactive state binding, responsive styling, and UI form workflows.'
  },
  'python backend': {
    name: 'Backend Agent',
    role: 'Python & Systems Architect (Helix)',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    description: 'SMTP background workers, queue workers, smtplib pipelines, and Python Flask/FastAPI services.'
  },
  'backend': {
    name: 'Backend Agent',
    role: 'Core Systems Architect (Helix)',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    description: 'REST/GraphQL routing, transactional DB models, and distributed microservices.'
  },
  'devops': {
    name: 'Infrastructure Agent',
    role: 'Cloud & Infrastructure Architect (Aegis)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    description: 'Containerization, Kubernetes, CI/CD deployment pipelines, and cloud security.'
  },
  'qa testing': {
    name: 'QA & Compliance Agent',
    role: 'Verification Auditor (Sentry)',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    description: 'Automated end-to-end testing, integration tests, and security regression audits.'
  },
  'ui/ux design': {
    name: 'Designer Agent',
    role: 'Product Designer (Echo)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    description: 'Wireframing, user flows, typography, and interactive design prototypes.'
  },
  'finance': {
    name: 'CFO Agent',
    role: 'Chief Financial Officer (Aura)',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    description: 'Financial modeling, burn runway governance, and compensation modeling.'
  }
};

// Seed default employees for realistic out-of-the-box matching
const DEFAULT_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'emp_aman',
    name: 'Aman',
    domain: 'Frontend',
    status: 'Available',
    role: 'Frontend Engineer',
    email: 'aman@company.internal',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'State Management', 'REST APIs']
  },
  {
    id: 'emp_rahul',
    name: 'Rahul',
    domain: 'Python Backend',
    status: 'Busy', // Rahul is currently occupied with sprint workloads
    role: 'Python Backend Specialist',
    email: 'rahul@company.internal',
    skills: ['Python', 'FastAPI', 'SMTP', 'Worker Queues', 'PostgreSQL']
  },
  {
    id: 'emp_priya',
    name: 'Priya Nair',
    domain: 'UI/UX Design',
    status: 'Available',
    role: 'Product Designer',
    email: 'priya@company.internal',
    skills: ['Figma', 'Design Systems', 'User Research']
  },
  {
    id: 'emp_rajesh',
    name: 'Rajesh Verma',
    domain: 'DevOps',
    status: 'Busy',
    role: 'DevOps Specialist',
    email: 'rajesh@company.internal',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD Pipelines']
  }
];

export class MultiAgentOrchestratorService {
  private activeAssessments = new Map<string, MultiAgentAssessmentResult>();
  private customEmployees = new Map<string, EmployeeRecord[]>();

  /**
   * Domain fuzzy matching helper:
   * Maps 'React', 'Frontend', 'Web' -> 'Frontend'
   * Maps 'Python Backend', 'Python', 'SMTP Worker', 'Backend' -> 'Python Backend'
   */
  public matchDomain(workerDomain: string, requiredDomain: string): boolean {
    const w = (workerDomain || '').toLowerCase().trim();
    const r = (requiredDomain || '').toLowerCase().trim();

    if (w === r) return true;
    if (w.includes(r) || r.includes(w)) return true;

    // Semantic domain synonym clusters
    if ((r.includes('front') || r.includes('react') || r.includes('ui')) && (w.includes('front') || w.includes('react') || w.includes('ui'))) {
      return true;
    }
    if ((r.includes('python') || r.includes('smtp') || r.includes('worker')) && (w.includes('python') || w.includes('backend'))) {
      return true;
    }
    if (r.includes('backend') && w.includes('backend')) {
      return true;
    }
    if (r.includes('devops') && (w.includes('devops') || w.includes('infra') || w.includes('cloud'))) {
      return true;
    }
    if ((r.includes('qa') || r.includes('test')) && (w.includes('qa') || w.includes('test'))) {
      return true;
    }

    return false;
  }

  /**
   * Retrieves active employees for the startup from database + persistent memory + default roster
   */
  public async getEmployees(startupId?: string): Promise<EmployeeRecord[]> {
    const list: EmployeeRecord[] = [...DEFAULT_EMPLOYEES];

    // Merge in any dynamically registered employees for this startup
    if (startupId && this.customEmployees.has(startupId)) {
      list.push(...(this.customEmployees.get(startupId) || []));
    }

    // Attempt to merge from Prisma database memberships if available
    try {
      if (prisma && startupId) {
        const memberships = await safeDbQuery(() => (prisma as any).membership.findMany({
          where: { startupId, status: 'ACTIVE' },
          include: { user: true }
        }));

        if (Array.isArray(memberships)) {
          for (const m of memberships) {
            const userName = m.user?.name || m.user?.email?.split('@')[0] || 'Team Member';
            const userRole = m.role || 'Member';
            
            // Map RBAC role to technical domain
            let domain = 'Engineering';
            if (userRole === 'HR') domain = 'Talent & HR';
            else if (userRole === 'FINANCE') domain = 'Finance';
            else if (userRole === 'GROWTH') domain = 'Growth & Marketing';
            else if (userRole === 'OPERATIONS') domain = 'Operations';

            // Avoid duplicating default seed names
            if (!list.some(e => e.name.toLowerCase() === userName.toLowerCase())) {
              list.push({
                id: m.userId,
                name: userName,
                domain,
                status: 'Available',
                role: userRole,
                email: m.user?.email
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[MultiAgentOrchestrator] Database employee lookup fallback:', err.message);
    }

    return list;
  }

  /**
   * Adds or registers a newly hired worker into the employee database
   */
  public async registerHiredWorker(startupId: string, worker: {
    name: string;
    domain: string;
    email?: string;
    role?: string;
  }): Promise<EmployeeRecord> {
    const newRecord: EmployeeRecord = {
      id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: worker.name.trim(),
      domain: worker.domain.trim(),
      status: 'Available',
      email: worker.email || `${worker.name.toLowerCase().replace(/\s+/g, '.')}@company.internal`,
      role: worker.role || `${worker.domain} Engineer`
    };

    const current = this.customEmployees.get(startupId) || [];
    current.push(newRecord);
    this.customEmployees.set(startupId, current);

    return newRecord;
  }

  /**
   * Step 1: AI analyzes user requirement and decomposes into technical domains & sub-tasks.
   */
  public async analyzeRequirementWithAI(userRequirement: string): Promise<{
    projectName: string;
    allocations: Array<{ required_domain: string; sub_task_title: string; task_scope: string }>;
  }> {
    const prompt = `You are a Principal Software Architect.
Analyze this project requirement and list the technical domains and sub-modules needed:
"${userRequirement}"

Return a JSON object conforming to:
{
  "projectName": "Short Title",
  "allocations": [
    {
      "required_domain": "Technical domain (e.g., Frontend, Python Backend, DevOps, QA Testing)",
      "sub_task_title": "Short title of sub-task (e.g. UI Dashboard, SMTP Backend Worker)",
      "task_scope": "Detailed instructions for this specific sub-module (e.g. 1. Design HTML Form. 2. Bind states with APIs.)"
    }
  ]
}`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        projectName: { type: Type.STRING },
        allocations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              required_domain: { type: Type.STRING },
              sub_task_title: { type: Type.STRING },
              task_scope: { type: Type.STRING }
            },
            required: ['required_domain', 'sub_task_title', 'task_scope']
          }
        }
      },
      required: ['projectName', 'allocations']
    };

    const fallbackGenerator = () => {
      const lower = userRequirement.toLowerCase();
      const allocations: Array<{ required_domain: string; sub_task_title: string; task_scope: string }> = [];

      if (lower.includes('email') || lower.includes('smtp') || lower.includes('react') || lower.includes('dashboard')) {
        allocations.push({
          required_domain: 'Frontend',
          sub_task_title: 'UI Dashboard',
          task_scope: '1. Design HTML Form. 2. Bind states with APIs.'
        });
        allocations.push({
          required_domain: 'Python Backend',
          sub_task_title: 'SMTP Backend Worker',
          task_scope: '1. Configure SMTP credentials and smtplib. 2. Implement background worker queue. 3. Expose Flask/FastAPI routing endpoints.'
        });
      } else {
        allocations.push({
          required_domain: 'Frontend',
          sub_task_title: 'Client UI Interface',
          task_scope: '1. Develop responsive interface. 2. Connect client state hooks.'
        });
        allocations.push({
          required_domain: 'Backend',
          sub_task_title: 'Core Business Logic API',
          task_scope: '1. Implement database models. 2. Expose secure endpoints.'
        });
      }

      return {
        projectName: userRequirement.slice(0, 48) + '...',
        allocations
      };
    };

    return callModelJson(prompt, { responseSchema: schema, temperature: 0.1 }, fallbackGenerator);
  }

  /**
   * Executes the full 5-Step Multi-Agent Orchestration & Resource Allocation:
   * [ Input Task ] ──► (1. Select Agents) ──► (2. Check Employee DB) 
   *                                                  │
   *                      ┌───────────────────────────┴───────────┐
   *                      ▼ (Available)                           ▼ (Not Available)
   *              (3A. Assign Work)                       (3B. Notify Head to Hire)
   *                      │                                       │
   *                      ▼                                       ▼
   *              (4. Generate Plan)                     (Suggest Domain Specs)
   *                      │
   *                      ▼
   *         (5. Live Monitoring Dashboard)
   */
  public async orchestrateTask(params: {
    userRequirement: string;
    startupId?: string;
    userId?: string;
  }): Promise<MultiAgentAssessmentResult> {
    const { userRequirement, startupId = 'default_startup' } = params;
    const assessmentId = `orch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    console.log(`[MultiAgentOrchestrator] Processing requirement: "${userRequirement}"`);

    // Step 1: AI decomposes requirement into technical domains
    const aiAssessment = await this.analyzeRequirementWithAI(userRequirement);

    // Step 2: Check real employee database for active workers
    const employees = await this.getEmployees(startupId);

    const allocations: AgentTaskAllocation[] = [];
    const alerts: MultiAgentAssessmentResult['alerts'] = [];
    let assignedCount = 0;
    let hireRequiredCount = 0;

    for (const alloc of aiAssessment.allocations) {
      const domainKey = alloc.required_domain.toLowerCase().trim();
      const matchedAgent = DOMAIN_AGENT_MAP[domainKey] || 
        DOMAIN_AGENT_MAP['backend'] || {
          name: 'Core Agent',
          role: 'Domain Specialist',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
          description: 'Specialized domain execution assistant.'
        };

      // Match against employee DB
      const matchedWorker = employees.find(emp => 
        this.matchDomain(emp.domain, alloc.required_domain) && emp.status === 'Available'
      );

      // Check if employee exists but is busy
      const busyWorker = employees.find(emp => 
        this.matchDomain(emp.domain, alloc.required_domain) && emp.status === 'Busy'
      );

      // Parse plan steps from task_scope
      const steps = alloc.task_scope
        .split(/(?=\d+\.\s+)/)
        .map(s => s.trim())
        .filter(Boolean);

      if (steps.length === 0) {
        steps.push(alloc.task_scope);
      }

      if (matchedWorker) {
        // Case 3A: Worker is Available
        assignedCount++;
        allocations.push({
          requiredDomain: alloc.required_domain,
          subTaskTitle: alloc.sub_task_title,
          taskScope: alloc.task_scope,
          planSteps: steps,
          assignedAgent: matchedAgent,
          status: 'ASSIGNED',
          assignedWorker: {
            id: matchedWorker.id,
            name: matchedWorker.name,
            domain: matchedWorker.domain,
            status: 'Available',
            email: matchedWorker.email
          },
          executionStatus: 'IN_PROGRESS',
          monitoringStatus: 'Pending Approval',
          headControls: {
            canPause: true,
            canRevoke: true,
            canPostJob: false,
            canAssign: false
          }
        });

        alerts.push({
          domain: alloc.required_domain,
          severity: 'success',
          title: `[${alloc.required_domain} Domain] Resource Assigned`,
          message: `Assigned to active worker: ${matchedWorker.name}.`,
          recommendation: `Worker assigned. Monitoring status: Pending Approval.`
        });
      } else {
        // Case 3B: Worker is NOT Available (Core Requirement)
        hireRequiredCount++;
        const busyNote = busyWorker ? ` (${busyWorker.name} is currently Busy)` : '';

        const englishHiringSuggestion = `No active worker found for ${alloc.required_domain}${busyNote}. Please hire a contractor or full-time employee with skills in: ${alloc.task_scope}.`;
        
        let hinglishRecommendation = `Aapko immediate basis pe ${alloc.required_domain} Developer hire karna chahiye jo ${alloc.task_scope} deliver kar sake.`;
        if (domainKey.includes('python') || domainKey.includes('smtp') || domainKey.includes('backend')) {
          hinglishRecommendation = `Aapko immediate basis pe Python Backend Developer hire karna chahiye jise SMTP configuration, smtplib, aur Flask API routing ka access pipeline create karna aata ho.`;
        } else if (domainKey.includes('front')) {
          hinglishRecommendation = `Aapko immediate basis pe Frontend Specialist hire karna chahiye jise React state binding, dynamic forms, aur API integration aati ho.`;
        }

        allocations.push({
          requiredDomain: alloc.required_domain,
          subTaskTitle: alloc.sub_task_title,
          taskScope: alloc.task_scope,
          planSteps: steps,
          assignedAgent: matchedAgent,
          status: 'HIRE_REQUIRED',
          assignedWorker: null,
          executionStatus: 'BLOCKED',
          monitoringStatus: 'Action Required',
          systemAlert: `⚠️ ACTION REQUIRED: You need to hire a contractor or full-time employee for this phase.`,
          hiringSuggestion: englishHiringSuggestion,
          hinglishRecommendation,
          headControls: {
            canPause: false,
            canRevoke: false,
            canPostJob: true,
            canAssign: true
          }
        });

        alerts.push({
          domain: alloc.required_domain,
          severity: 'warning',
          title: `⚠️ [${alloc.required_domain} Domain] - ACTION REQUIRED`,
          message: `Status: No available workers found${busyNote}. System Alert to Head: "You need to hire a contractor or full-time employee for this phase."`,
          recommendation: englishHiringSuggestion,
          hinglishRecommendation
        });
      }
    }

    // Step 4: Generate Plan & Dependency Gating
    const executionGated = hireRequiredCount > 0;
    const pipelineStatus = executionGated ? 'BLOCKED_ON_HIRE' : 'EXECUTING';
    const gateReason = executionGated
      ? `AI multi-agent execution pipeline is blocked. Head must hire or assign an employee to the unfilled domain slots before automated steps can resume.`
      : undefined;

    // Step 5: Master Tracking Blueprint (For Head Monitoring)
    const monitoringBlueprint: MasterTrackingRow[] = allocations.map(a => {
      let executionStatusText = '⏳ In Progress';
      if (a.executionStatus === 'BLOCKED') {
        executionStatusText = '❌ BLOCKED (Hire Recommended)';
      } else if (a.executionStatus === 'PAUSED') {
        executionStatusText = '⏸️ Paused';
      } else if (a.executionStatus === 'COMPLETED') {
        executionStatusText = '✅ Completed';
      }

      return {
        subTask: a.subTaskTitle,
        assignedAgent: `${a.assignedAgent.name}`,
        humanEmployee: a.assignedWorker ? `${a.assignedWorker.name} (Available)` : 'None',
        executionStatus: executionStatusText,
        rawExecutionStatus: a.executionStatus,
        headControls: a.status === 'ASSIGNED'
          ? ['Pause', 'Revoke']
          : ['Click to Post Job', 'Assign Worker']
      };
    });

    const result: MultiAgentAssessmentResult = {
      id: assessmentId,
      projectName: aiAssessment.projectName || 'Multi-Agent Project Delivery',
      inputTask: userRequirement,
      currentStep: 5,
      pipelineStatus,
      totalDomains: allocations.length,
      assignedCount,
      hireRequiredCount,
      allocations,
      monitoringBlueprint,
      alerts,
      executionGated,
      gateReason,
      timestamp: new Date().toISOString()
    };

    this.activeAssessments.set(assessmentId, result);
    return result;
  }

  /**
   * Retrieves an assessment by ID
   */
  public getAssessment(assessmentId: string): MultiAgentAssessmentResult | undefined {
    return this.activeAssessments.get(assessmentId);
  }

  /**
   * Retrieves the most recent assessment
   */
  public getLatestAssessment(): MultiAgentAssessmentResult | undefined {
    const list = Array.from(this.activeAssessments.values());
    return list[list.length - 1];
  }

  /**
   * Head Action: Hires or assigns a worker to an unfilled/blocked slot.
   * Updates database and immediately unblocks the pipeline if all slots are filled.
   */
  public async assignWorkerToSlot(params: {
    assessmentId: string;
    domain: string;
    workerName: string;
    workerEmail?: string;
    startupId?: string;
  }): Promise<MultiAgentAssessmentResult> {
    const { assessmentId, domain, workerName, workerEmail, startupId = 'default_startup' } = params;
    const assessment = this.activeAssessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found.`);
    }

    // 1. Register hired worker in database / custom roster
    const newWorker = await this.registerHiredWorker(startupId, {
      name: workerName,
      domain,
      email: workerEmail
    });

    // 2. Update the target allocation
    const target = assessment.allocations.find(a => 
      this.matchDomain(a.requiredDomain, domain)
    );

    if (!target) {
      throw new Error(`Domain ${domain} not found in assessment ${assessmentId}.`);
    }

    target.status = 'ASSIGNED';
    target.assignedWorker = {
      id: newWorker.id,
      name: newWorker.name,
      domain: newWorker.domain,
      status: 'Available',
      email: newWorker.email
    };
    target.executionStatus = 'IN_PROGRESS';
    target.monitoringStatus = 'Pending Approval';
    target.headControls = {
      canPause: true,
      canRevoke: true,
      canPostJob: false,
      canAssign: false
    };

    // 3. Recalculate counts & gating
    assessment.assignedCount = assessment.allocations.filter(a => a.status === 'ASSIGNED').length;
    assessment.hireRequiredCount = assessment.allocations.filter(a => a.status === 'HIRE_REQUIRED').length;

    if (assessment.hireRequiredCount === 0) {
      assessment.executionGated = false;
      assessment.pipelineStatus = 'EXECUTING';
      assessment.gateReason = undefined;
    }

    // 4. Update monitoring blueprint
    assessment.monitoringBlueprint = assessment.allocations.map(a => {
      let executionStatusText = '⏳ In Progress';
      if (a.executionStatus === 'BLOCKED') {
        executionStatusText = '❌ BLOCKED (Hire Recommended)';
      } else if (a.executionStatus === 'PAUSED') {
        executionStatusText = '⏸️ Paused';
      } else if (a.executionStatus === 'COMPLETED') {
        executionStatusText = '✅ Completed';
      }

      return {
        subTask: a.subTaskTitle,
        assignedAgent: `${a.assignedAgent.name}`,
        humanEmployee: a.assignedWorker ? `${a.assignedWorker.name} (Available)` : 'None',
        executionStatus: executionStatusText,
        rawExecutionStatus: a.executionStatus,
        headControls: a.status === 'ASSIGNED'
          ? ['Pause', 'Revoke']
          : ['Click to Post Job', 'Assign Worker']
      };
    });

    assessment.timestamp = new Date().toISOString();
    this.activeAssessments.set(assessmentId, assessment);

    console.log(`[MultiAgentOrchestrator] Slot ${domain} filled with worker ${workerName}. Gated: ${assessment.executionGated}`);
    return assessment;
  }

  /**
   * Head Action: Control slot execution (Pause, Resume, or Revoke)
   */
  public controlSlot(params: {
    assessmentId: string;
    domain: string;
    action: 'pause' | 'resume' | 'revoke';
  }): MultiAgentAssessmentResult {
    const { assessmentId, domain, action } = params;
    const assessment = this.activeAssessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found.`);
    }

    const target = assessment.allocations.find(a => 
      this.matchDomain(a.requiredDomain, domain)
    );

    if (!target) {
      throw new Error(`Domain ${domain} not found in assessment ${assessmentId}.`);
    }

    if (action === 'pause') {
      target.executionStatus = 'PAUSED';
      target.monitoringStatus = 'Paused';
    } else if (action === 'resume') {
      target.executionStatus = 'IN_PROGRESS';
      target.monitoringStatus = 'In Progress';
    } else if (action === 'revoke') {
      target.status = 'HIRE_REQUIRED';
      target.assignedWorker = null;
      target.executionStatus = 'BLOCKED';
      target.monitoringStatus = 'Action Required';
      target.headControls = {
        canPause: false,
        canRevoke: false,
        canPostJob: true,
        canAssign: true
      };
      assessment.executionGated = true;
      assessment.pipelineStatus = 'BLOCKED_ON_HIRE';
      assessment.gateReason = `Worker assignment revoked for ${domain}. Head must reassign or hire.`;
    }

    // Refresh blueprint
    assessment.monitoringBlueprint = assessment.allocations.map(a => {
      let executionStatusText = '⏳ In Progress';
      if (a.executionStatus === 'BLOCKED') {
        executionStatusText = '❌ BLOCKED (Hire Recommended)';
      } else if (a.executionStatus === 'PAUSED') {
        executionStatusText = '⏸️ Paused';
      } else if (a.executionStatus === 'COMPLETED') {
        executionStatusText = '✅ Completed';
      }

      return {
        subTask: a.subTaskTitle,
        assignedAgent: `${a.assignedAgent.name}`,
        humanEmployee: a.assignedWorker ? `${a.assignedWorker.name} (Available)` : 'None',
        executionStatus: executionStatusText,
        rawExecutionStatus: a.executionStatus,
        headControls: a.status === 'ASSIGNED'
          ? ['Pause', 'Revoke']
          : ['Click to Post Job', 'Assign Worker']
      };
    });

    this.activeAssessments.set(assessmentId, assessment);
    return assessment;
  }
}

export const multiAgentOrchestratorService = new MultiAgentOrchestratorService();
