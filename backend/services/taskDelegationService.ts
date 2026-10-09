/**
 * Phase A3 — Task Decomposition & Delegation.
 *
 * The council already decomposes a founder command into work orders, but those
 * work orders only ever existed in memory: the `Task` model was never created or
 * read at runtime. Without persisted, assignable tasks there is no employee
 * workspace, no employee -> founder submission, and no record of work. This
 * service is that missing layer.
 *
 * Design notes:
 *  - No schema change. Tasks hang off the startup's `Plan`, which is how
 *    tenant scoping already works for Approval. `Task.assignedTo` holds the
 *    OWNING ROLE (a permissionService Role), so role -> member resolution is a
 *    comparison against `Membership.role` and needs no new column.
 *  - A department with no corresponding human role (LEGAL, AUDITOR) stays
 *    founder-owned rather than being assigned to an invented employee. The
 *    north-star rule is: missing AI capability -> provision the agent; missing
 *    HUMAN responsibility -> surface it for the founder to assign or invite.
 */
import { prisma, safeDbQuery } from './dbService';
import { normalizeRole, type Role } from './permissionService';
import { resolveMembership } from './membershipService';

/** Council work-order departments, as produced by multiAgentCouncil.decompose. */
export type Department =
  | 'TALENT' | 'FINANCE' | 'GROWTH' | 'LEGAL' | 'OPERATIONS' | 'AUDITOR';

export type TaskStatus =
  | 'pending'      // delegated, nobody has picked it up
  | 'in_progress'  // an employee is working on it with their AI teammate
  | 'submitted'    // employee submitted; awaits founder approval
  | 'approved'
  | 'rejected';

export const TASK_STATUSES: TaskStatus[] = [
  'pending', 'in_progress', 'submitted', 'approved', 'rejected'
];

/**
 * Department -> the human role that owns the work.
 *
 * LEGAL and AUDITOR map to null deliberately: there is no LEGAL or AUDITOR human
 * role in the permission model, and inventing one would imply the company employs
 * someone it does not. Those tasks stay with the founder/admin.
 */
const DEPARTMENT_OWNER: Record<Department, Role | null> = {
  TALENT: 'HR',
  FINANCE: 'FINANCE',
  GROWTH: 'GROWTH',
  OPERATIONS: 'OPERATIONS',
  LEGAL: null,
  AUDITOR: null
};

/** The AI agent that assists on this department's work. */
const DEPARTMENT_AGENT: Record<Department, string> = {
  TALENT: 'Talent',
  FINANCE: 'CFO',
  GROWTH: 'Growth',
  OPERATIONS: 'Operations',
  LEGAL: 'Legal',
  AUDITOR: 'Auditor'
};

export function ownerRoleForDepartment(dept: string): Role | null {
  return DEPARTMENT_OWNER[(dept || '').toUpperCase() as Department] ?? null;
}

export function agentForDepartment(dept: string): string {
  return DEPARTMENT_AGENT[(dept || '').toUpperCase() as Department] || 'CEO';
}

export class TaskDelegationError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
    this.name = 'TaskDelegationError';
  }
}

/**
 * `Task.title` carries a compact machine-readable prefix so department, agent and
 * owning role survive without new columns:
 *   "[TALENT|Talent|HR] Analyze candidate role profile..."
 * Anything unparseable degrades to an unassigned task rather than throwing.
 */
const TITLE_PREFIX = /^\[([A-Z]+)\|([A-Za-z]+)\|([A-Z]*)\]\s*/;

function encodeTitle(dept: string, agent: string, owner: Role | null, objective: string): string {
  return `[${dept.toUpperCase()}|${agent}|${owner || ''}] ${objective}`;
}

export interface DelegatedTask {
  id: string;
  planId?: string;
  title: string;
  department: string;
  agent: string;
  ownerRole: Role | null;
  status: TaskStatus;
  result: string | null;
  /** True when no human role owns this yet — the founder must assign or invite. */
  needsHumanOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanStepDefinition {
  stepNumber: number;
  title: string;
  department: Department;
  agent: string;
  ownerRole: Role | null;
}

export interface PlanWithTasks {
  id: string;
  title: string;
  description: string;
  status: string;
  startupId: string;
  tasks: DelegatedTask[];
  explicitSteps: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DecomposedPlanResult {
  plan: {
    id: string;
    title: string;
    description: string;
    status: string;
    startupId: string;
    createdAt: string;
    updatedAt: string;
  };
  tasks: DelegatedTask[];
  explicitSteps: string[];
  formattedPlanText: string;
}

function decodeTask(row: any): DelegatedTask {
  const match = TITLE_PREFIX.exec(row.title || '');
  const department = match?.[1] || 'GENERAL';
  const agent = match?.[2] || 'CEO';
  const ownerRole = (match?.[3] || '') as Role | '';
  const title = (row.title || '').replace(TITLE_PREFIX, '');
  const assigned = (row.assignedTo || '').trim().toUpperCase();

  return {
    id: row.id,
    planId: row.planId,
    title,
    department,
    agent,
    ownerRole: ownerRole ? normalizeRole(ownerRole) : null,
    status: (row.status || 'pending') as TaskStatus,
    result: row.result ?? null,
    needsHumanOwner: !assigned || assigned === 'UNASSIGNED',
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt)
  };
}

/** Finds, or creates once, the startup's continuous operating plan. */
async function resolvePlanId(startupId: string): Promise<string> {
  const existing: any = await safeDbQuery(() =>
    prisma.plan.findFirst({ where: { startupId }, orderBy: { createdAt: 'asc' } })
  );
  if (existing) return existing.id;

  const created: any = await prisma.plan.create({
    data: {
      title: 'Core Executive Operations',
      description: 'Default continuous operating plan',
      startupId,
      status: 'active'
    }
  });
  return created.id;
}

export interface WorkOrderInput {
  department: string;
  objective: string;
}

/**
 * Persists a council decomposition as assignable Task rows.
 *
 * Idempotent per command: callers pass the orchestrator's commandId, and an
 * existing task with the same encoded title under the same plan is not
 * duplicated. Never throws into the orchestration path — a delegation failure
 * must not fail the founder's command.
 */
export async function delegateWorkOrders(
  startupId: string,
  workOrders: WorkOrderInput[],
  options?: { planId?: string }
): Promise<DelegatedTask[]> {
  if (!startupId || !prisma || !Array.isArray(workOrders) || workOrders.length === 0) {
    return [];
  }

  try {
    const planId = options?.planId || await resolvePlanId(startupId);
    const created: DelegatedTask[] = [];

    for (const order of workOrders) {
      const dept = (order.department || 'GENERAL').toUpperCase();
      const owner = ownerRoleForDepartment(dept);
      const agent = agentForDepartment(dept);
      const title = encodeTitle(dept, agent, owner, order.objective);

      const duplicate: any = await safeDbQuery(() =>
        (prisma as any).task.findFirst({ where: { planId, title } })
      );
      if (duplicate) {
        created.push(decodeTask(duplicate));
        continue;
      }

      const row: any = await (prisma as any).task.create({
        data: {
          title,
          // The owning ROLE, not a userId: resolution is a comparison against
          // Membership.role, so no new column is needed.
          assignedTo: owner || 'UNASSIGNED',
          status: 'pending',
          planId
        }
      });
      created.push(decodeTask(row));
    }

    return created;
  } catch (err: any) {
    console.warn('[taskDelegationService] delegateWorkOrders note:', err.message);
    return [];
  }
}

/**
 * Turns a founder command into an explicit, structured plan definition with ordered steps.
 *
 * Example:
 * Founder: "Prepare a hiring plan for two senior developers."
 * Plan Title: "Hiring Plan: Two Senior Developers"
 * Steps:
 *  1. Analyze current engineering capacity
 *  2. Determine hiring requirements
 *  3. Check hiring policy
 *  4. Analyze budget impact
 *  5. Draft hiring plan
 *  6. Submit for review
 */
export function buildPlanStepsForCommand(command: string): {
  title: string;
  description: string;
  steps: PlanStepDefinition[];
} {
  const lower = command.toLowerCase();

  // 1. Hiring / Recruitment Plan
  const isHiring = /hire|hiring|headcount|developer|engineer|designer|sales|recruit/i.test(lower);
  if (isHiring) {
    let title = 'Hiring Plan: Headcount Recruitment';
    if (/two\s+senior\s+dev|2\s+senior\s+dev/i.test(lower)) {
      title = 'Hiring Plan: Two Senior Developers';
    } else if (/engineer/i.test(lower)) {
      title = 'Hiring Plan: Engineering Headcount';
    } else if (/senior/i.test(lower)) {
      title = 'Hiring Plan: Senior Specialist';
    }

    return {
      title,
      description: `Execution plan for founder directive: "${command}"`,
      steps: [
        {
          stepNumber: 1,
          title: 'Analyze current engineering capacity',
          department: 'OPERATIONS',
          agent: 'Operations',
          ownerRole: 'OPERATIONS'
        },
        {
          stepNumber: 2,
          title: 'Determine hiring requirements',
          department: 'TALENT',
          agent: 'Talent',
          ownerRole: 'HR'
        },
        {
          stepNumber: 3,
          title: 'Check hiring policy',
          department: 'LEGAL',
          agent: 'Legal',
          ownerRole: null // Legal has no human employee; stays with founder/admin
        },
        {
          stepNumber: 4,
          title: 'Analyze budget impact',
          department: 'FINANCE',
          agent: 'CFO',
          ownerRole: 'FINANCE'
        },
        {
          stepNumber: 5,
          title: 'Draft hiring plan',
          department: 'TALENT',
          agent: 'Talent',
          ownerRole: 'HR'
        },
        {
          stepNumber: 6,
          title: 'Submit for review',
          department: 'OPERATIONS',
          agent: 'CEO',
          ownerRole: 'FOUNDER'
        }
      ]
    };
  }

  // 2. Growth / Marketing Plan
  const isGrowth = /market|growth|campaign|acquisition|ad|sales|launch|gtm/i.test(lower);
  if (isGrowth) {
    return {
      title: 'Growth Plan: Go-To-Market Execution',
      description: `Execution plan for founder directive: "${command}"`,
      steps: [
        {
          stepNumber: 1,
          title: 'Analyze current market capacity & ICP benchmarks',
          department: 'GROWTH',
          agent: 'Growth',
          ownerRole: 'GROWTH'
        },
        {
          stepNumber: 2,
          title: 'Determine campaign acquisition requirements',
          department: 'GROWTH',
          agent: 'Growth',
          ownerRole: 'GROWTH'
        },
        {
          stepNumber: 3,
          title: 'Check marketing compliance & privacy policy',
          department: 'LEGAL',
          agent: 'Legal',
          ownerRole: null
        },
        {
          stepNumber: 4,
          title: 'Analyze budget impact & CAC payback period',
          department: 'FINANCE',
          agent: 'CFO',
          ownerRole: 'FINANCE'
        },
        {
          stepNumber: 5,
          title: 'Draft go-to-market campaign plan',
          department: 'GROWTH',
          agent: 'Growth',
          ownerRole: 'GROWTH'
        },
        {
          stepNumber: 6,
          title: 'Submit for review',
          department: 'GROWTH',
          agent: 'CEO',
          ownerRole: 'FOUNDER'
        }
      ]
    };
  }

  // 3. Financial / Budget / Runway Plan
  const isFinancial = /budget|burn|runway|cash|funding|raise|cut|cost|spend/i.test(lower);
  if (isFinancial) {
    return {
      title: 'Financial Plan: Treasury & Capital Allocation',
      description: `Execution plan for founder directive: "${command}"`,
      steps: [
        {
          stepNumber: 1,
          title: 'Audit current treasury & department expenditures',
          department: 'FINANCE',
          agent: 'CFO',
          ownerRole: 'FINANCE'
        },
        {
          stepNumber: 2,
          title: 'Determine capital reallocation requirements',
          department: 'FINANCE',
          agent: 'CFO',
          ownerRole: 'FINANCE'
        },
        {
          stepNumber: 3,
          title: 'Check contractual & governance policies',
          department: 'LEGAL',
          agent: 'Legal',
          ownerRole: null
        },
        {
          stepNumber: 4,
          title: 'Analyze runway impact & scenario stress tests',
          department: 'FINANCE',
          agent: 'CFO',
          ownerRole: 'FINANCE'
        },
        {
          stepNumber: 5,
          title: 'Draft financial allocation plan',
          department: 'FINANCE',
          agent: 'CFO',
          ownerRole: 'FINANCE'
        },
        {
          stepNumber: 6,
          title: 'Submit for review',
          department: 'FINANCE',
          agent: 'CEO',
          ownerRole: 'FOUNDER'
        }
      ]
    };
  }

  // 4. Default Strategic Execution Plan
  return {
    title: `Execution Plan: ${command.slice(0, 50)}`,
    description: `Execution plan for founder directive: "${command}"`,
    steps: [
      {
        stepNumber: 1,
        title: 'Analyze current operational capacity',
        department: 'OPERATIONS',
        agent: 'Operations',
        ownerRole: 'OPERATIONS'
      },
      {
        stepNumber: 2,
        title: 'Determine execution requirements',
        department: 'OPERATIONS',
        agent: 'Operations',
        ownerRole: 'OPERATIONS'
      },
      {
        stepNumber: 3,
        title: 'Check company policy & compliance',
        department: 'LEGAL',
        agent: 'Legal',
        ownerRole: null
      },
      {
        stepNumber: 4,
        title: 'Analyze budget impact & runway preservation',
        department: 'FINANCE',
        agent: 'CFO',
        ownerRole: 'FINANCE'
      },
      {
        stepNumber: 5,
        title: 'Draft execution plan',
        department: 'OPERATIONS',
        agent: 'Operations',
        ownerRole: 'OPERATIONS'
      },
      {
        stepNumber: 6,
        title: 'Submit for review',
        department: 'OPERATIONS',
        agent: 'CEO',
        ownerRole: 'FOUNDER'
      }
    ]
  };
}

export function formatPlanAsText(planTitle: string, steps: { stepNumber: number; title: string }[]): string {
  const lines = ['PLAN', ''];
  steps.forEach(s => {
    lines.push(`${s.stepNumber}. ${s.title}`);
  });
  return lines.join('\n');
}

/**
 * Phase A4: Turns a founder command into an explicit Plan and ordered Task rows.
 *
 * Creates a dedicated `Plan` row in the database, populates the ordered `Task` rows,
 * and returns the structured plan for the founder assistant and employee workspace.
 */
export async function decomposeCommandToPlan(params: {
  startupId: string;
  command: string;
  commandId?: string;
}): Promise<DecomposedPlanResult> {
  const { startupId, command, commandId } = params;
  const planData = buildPlanStepsForCommand(command);
  const formattedPlanText = formatPlanAsText(planData.title, planData.steps);
  const explicitSteps = planData.steps.map(s => s.title);

  if (!startupId) {
    const fallbackPlanId = `plan_${Date.now()}`;
    const fallbackTasks: DelegatedTask[] = planData.steps.map((s, idx) => ({
      id: `task_${Date.now()}_${idx + 1}`,
      planId: fallbackPlanId,
      title: s.title,
      department: s.department,
      agent: s.agent,
      ownerRole: s.ownerRole,
      status: 'pending' as TaskStatus,
      result: null,
      needsHumanOwner: !s.ownerRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    return {
      plan: {
        id: fallbackPlanId,
        title: planData.title,
        description: planData.description,
        status: 'active',
        startupId: 'memory',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      tasks: fallbackTasks,
      explicitSteps,
      formattedPlanText
    };
  }

  // 1. Resolve or create Plan row in database
  let planRow: any = null;
  if (prisma) {
    try {
      if (commandId) {
        planRow = await safeDbQuery(() =>
          (prisma as any).plan.findFirst({
            where: {
              startupId,
              description: { contains: commandId }
            }
          })
        );
      }
      if (!planRow) {
        // Also check if plan with exact title and description exists for this startup
        planRow = await safeDbQuery(() =>
          (prisma as any).plan.findFirst({
            where: {
              startupId,
              title: planData.title
            }
          })
        );
      }
      if (!planRow) {
        planRow = await safeDbQuery(() =>
          (prisma as any).plan.create({
            data: {
              title: planData.title,
              description: commandId
                ? `[${commandId}] ${planData.description}`
                : planData.description,
              status: 'active',
              startupId
            }
          })
        );
      }
    } catch (err: any) {
      console.warn('[taskDelegationService] Error creating plan row:', err.message);
    }
  }

  const effectivePlanId = planRow?.id || `plan_${Date.now()}`;
  const tasks: DelegatedTask[] = [];

  // 2. Persist Task rows linked to this Plan
  for (const step of planData.steps) {
    const encodedTitle = encodeTitle(step.department, step.agent, step.ownerRole, step.title);
    let taskRow: any = null;

    if (prisma && planRow) {
      try {
        taskRow = await safeDbQuery(() =>
          (prisma as any).task.findFirst({
            where: { planId: effectivePlanId, title: encodedTitle }
          })
        );
        if (!taskRow) {
          taskRow = await safeDbQuery(() =>
            (prisma as any).task.create({
              data: {
                title: encodedTitle,
                assignedTo: step.ownerRole || 'UNASSIGNED',
                status: 'pending',
                planId: effectivePlanId
              }
            })
          );
        }
      } catch (err: any) {
        console.warn('[taskDelegationService] Error creating task row:', err.message);
      }
    }

    if (taskRow) {
      tasks.push(decodeTask(taskRow));
    } else {
      tasks.push({
        id: `task_${Date.now()}_${step.stepNumber}`,
        planId: effectivePlanId,
        title: step.title,
        department: step.department,
        agent: step.agent,
        ownerRole: step.ownerRole,
        status: 'pending' as TaskStatus,
        result: null,
        needsHumanOwner: !step.ownerRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  return {
    plan: {
      id: effectivePlanId,
      title: planRow?.title || planData.title,
      description: planRow?.description || planData.description,
      status: planRow?.status || 'active',
      startupId,
      createdAt: planRow?.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: planRow?.updatedAt?.toISOString?.() || new Date().toISOString()
    },
    tasks,
    explicitSteps,
    formattedPlanText
  };
}

/**
 * Lists all plans for the caller's company, scoped to their role.
 */
export async function listPlansForUser(userId: string): Promise<PlanWithTasks[]> {
  if (!userId || !prisma) return [];

  const membership = await resolveMembership(userId);
  if (!membership) {
    throw new TaskDelegationError(
      403,
      'Forbidden: you do not have active access to a company workspace.',
      'NO_ACTIVE_MEMBERSHIP'
    );
  }

  const role = membership.role;
  const isPrivileged = role === 'FOUNDER' || role === 'ADMIN';

  try {
    const plans: any[] = await safeDbQuery(() =>
      (prisma as any).plan.findMany({
        where: { startupId: membership.startupId },
        include: {
          tasks: {
            where: isPrivileged ? {} : { assignedTo: role },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    );

    return (plans || []).map((p: any) => {
      const decodedTasks = (p.tasks || []).map(decodeTask);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        startupId: p.startupId,
        tasks: decodedTasks,
        explicitSteps: decodedTasks.map((t: DelegatedTask) => t.title),
        createdAt: p.createdAt?.toISOString?.() ?? String(p.createdAt),
        updatedAt: p.updatedAt?.toISOString?.() ?? String(p.updatedAt)
      };
    });
  } catch (err: any) {
    console.warn('[taskDelegationService] listPlansForUser note:', err.message);
    return [];
  }
}

/**
 * Gets a specific plan by id with its tasks, scoped to the caller's company.
 */
export async function getPlanById(userId: string, planId: string): Promise<PlanWithTasks> {
  if (!userId || !prisma) {
    throw new TaskDelegationError(503, 'Database unavailable.', 'DB_UNAVAILABLE');
  }

  const membership = await resolveMembership(userId);
  if (!membership) {
    throw new TaskDelegationError(
      403,
      'Forbidden: you do not have active access to a company workspace.',
      'NO_ACTIVE_MEMBERSHIP'
    );
  }

  const role = membership.role;
  const isPrivileged = role === 'FOUNDER' || role === 'ADMIN';

  const plan: any = await safeDbQuery(() =>
    (prisma as any).plan.findFirst({
      where: { id: planId, startupId: membership.startupId },
      include: {
        tasks: {
          where: isPrivileged ? {} : { assignedTo: role },
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  );

  if (!plan) {
    throw new TaskDelegationError(404, 'Plan not found in this company.', 'NOT_FOUND');
  }

  const decodedTasks = (plan.tasks || []).map(decodeTask);
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    status: plan.status,
    startupId: plan.startupId,
    tasks: decodedTasks,
    explicitSteps: decodedTasks.map((t: DelegatedTask) => t.title),
    createdAt: plan.createdAt?.toISOString?.() ?? String(plan.createdAt),
    updatedAt: plan.updatedAt?.toISOString?.() ?? String(plan.updatedAt)
  };
}

/**
 * Lists the tasks a user may see, scoped to their company and role.
 *
 * FOUNDER/ADMIN see everything, including tasks with no human owner.
 * Everyone else sees only tasks owned by their own role — an employee must not
 * see the whole company's workload.
 */
export async function listTasksForUser(userId: string): Promise<DelegatedTask[]> {
  if (!userId || !prisma) return [];

  const membership = await resolveMembership(userId);
  if (!membership) {
    throw new TaskDelegationError(
      403,
      'Forbidden: you do not have active access to a company workspace.',
      'NO_ACTIVE_MEMBERSHIP'
    );
  }

  const role = membership.role;
  const isPrivileged = role === 'FOUNDER' || role === 'ADMIN';

  try {
    const rows: any[] = await safeDbQuery(() =>
      (prisma as any).task.findMany({
        where: {
          plan: { startupId: membership.startupId },
          ...(isPrivileged ? {} : { assignedTo: role })
        },
        orderBy: { createdAt: 'desc' }
      })
    );
    return (rows || []).map(decodeTask);
  } catch (err: any) {
    console.warn('[taskDelegationService] listTasksForUser note:', err.message);
    return [];
  }
}

/**
 * Updates a task's status and/or result.
 *
 * Tenant- and role-scoped: the task must belong to the caller's company, and a
 * non-privileged member may only touch tasks owned by their own role. Transitions
 * past `submitted` are reserved for the founder approval loop (Phase B), so they
 * are rejected here rather than silently allowed.
 */
export async function updateTaskForUser(params: {
  userId: string;
  taskId: string;
  status?: string;
  result?: string;
}): Promise<DelegatedTask> {
  const { userId, taskId } = params;
  if (!prisma) {
    throw new TaskDelegationError(503, 'The database is unavailable.', 'DB_UNAVAILABLE');
  }

  const membership = await resolveMembership(userId);
  if (!membership) {
    throw new TaskDelegationError(
      403,
      'Forbidden: you do not have active access to a company workspace.',
      'NO_ACTIVE_MEMBERSHIP'
    );
  }

  const role = membership.role;
  const isPrivileged = role === 'FOUNDER' || role === 'ADMIN';

  const row: any = await safeDbQuery(() =>
    (prisma as any).task.findFirst({
      where: { id: taskId, plan: { startupId: membership.startupId } }
    })
  );
  // A task in another company is indistinguishable from a missing one.
  if (!row) {
    throw new TaskDelegationError(404, 'Task not found in this company.', 'NOT_FOUND');
  }

  const assigned = (row.assignedTo || '').trim().toUpperCase();
  if (!isPrivileged && assigned !== role) {
    throw new TaskDelegationError(
      403,
      'Forbidden: that task is owned by another department.',
      'NOT_TASK_OWNER'
    );
  }

  const data: Record<string, any> = {};

  if (params.status !== undefined) {
    const next = String(params.status).toLowerCase() as TaskStatus;
    if (!TASK_STATUSES.includes(next)) {
      throw new TaskDelegationError(
        400,
        `Status must be one of [${TASK_STATUSES.join(', ')}].`,
        'INVALID_STATUS'
      );
    }
    // approved/rejected are set by the founder approval loop, not by an employee
    // marking their own work done.
    if ((next === 'approved' || next === 'rejected') && !isPrivileged) {
      throw new TaskDelegationError(
        403,
        'Only the founder or an admin can approve or reject submitted work.',
        'APPROVAL_RESERVED'
      );
    }
    data.status = next;
  }

  if (params.result !== undefined) {
    data.result = String(params.result);
  }

  if (Object.keys(data).length === 0) {
    throw new TaskDelegationError(400, 'Nothing to update.', 'NO_CHANGES');
  }

  const updated: any = await (prisma as any).task.update({
    where: { id: row.id },
    data
  });
  return decodeTask(updated);
}
