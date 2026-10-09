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
import { normalizeRole, type Role, ROLES } from './permissionService';
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
  assignedUserId?: string | null;
  assignedUserName?: string | null;
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
  const rawAssigned = (row.assignedTo || '').trim();
  const assigned = rawAssigned.toUpperCase();

  let assignedUserId: string | null = null;
  if (rawAssigned.includes(':')) {
    assignedUserId = rawAssigned.split(':')[1] || null;
  } else if (rawAssigned && rawAssigned !== 'UNASSIGNED' && !ROLES.includes(assigned as any)) {
    assignedUserId = rawAssigned;
  }

  const hasRole = Boolean(ownerRole);
  const isAssigned = Boolean(assignedUserId);
  const needsHumanOwner = isAssigned ? false : (!hasRole || assigned === 'UNASSIGNED');

  return {
    id: row.id,
    planId: row.planId,
    title,
    department,
    agent,
    ownerRole: ownerRole ? normalizeRole(ownerRole) : null,
    assignedUserId,
    assignedUserName: row.assignedUserName || null,
    status: (row.status || 'pending') as TaskStatus,
    result: row.result ?? null,
    needsHumanOwner,
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
/**
 * Helper to enrich tasks with their assigned user's display name.
 */
async function enrichTasksWithUserNames(tasks: DelegatedTask[]): Promise<DelegatedTask[]> {
  const userIds = Array.from(new Set(tasks.map(t => t.assignedUserId).filter(Boolean))) as string[];
  if (userIds.length === 0 || !prisma) return tasks;

  try {
    const users: any[] = await safeDbQuery(() =>
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      })
    );
    const userMap = new Map<string, string>();
    for (const u of users || []) {
      userMap.set(u.id, u.name || u.email || 'Team Member');
    }
    return tasks.map(t => {
      if (t.assignedUserId && userMap.has(t.assignedUserId)) {
        return { ...t, assignedUserName: userMap.get(t.assignedUserId)! };
      }
      return t;
    });
  } catch {
    return tasks;
  }
}

/**
 * Lists the tasks a user may see, scoped to their company and role.
 *
 * FOUNDER/ADMIN see everything, including tasks with no human owner.
 * Everyone else sees only tasks owned by their own role or assigned to them — an employee
 * must not see the whole company's workload.
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
          ...(isPrivileged
            ? {}
            : {
                OR: [
                  { assignedTo: role },
                  { assignedTo: { startsWith: `${role}:` } },
                  { assignedTo: userId },
                  { assignedTo: { endsWith: `:${userId}` } }
                ]
              })
        },
        orderBy: { createdAt: 'desc' }
      })
    );
    const decoded = (rows || []).map(decodeTask);
    return await enrichTasksWithUserNames(decoded);
  } catch (err: any) {
    console.warn('[taskDelegationService] listTasksForUser note:', err.message);
    return [];
  }
}

/**
 * Phase B1: Human task assignment & claim mechanism.
 *
 * - Founder/Admin can assign any task in the company to any active member, or unassign (assigneeId: null).
 * - Employees (HR, FINANCE, GROWTH, OPERATIONS) can claim tasks belonging to their department.
 * - Cross-department assignment or claim attempts by non-privileged members are strictly rejected.
 * - Claiming advances task status from 'pending' to 'in_progress'.
 */
export async function assignTaskForUser(params: {
  userId: string;
  taskId: string;
  assigneeId?: string | null;
}): Promise<DelegatedTask> {
  const { userId, taskId } = params;
  let targetAssigneeId = params.assigneeId;

  if (!prisma) {
    throw new TaskDelegationError(503, 'The database is unavailable.', 'DB_UNAVAILABLE');
  }

  const callerMembership = await resolveMembership(userId);
  if (!callerMembership) {
    throw new TaskDelegationError(
      403,
      'Forbidden: you do not have active access to a company workspace.',
      'NO_ACTIVE_MEMBERSHIP'
    );
  }

  const role = callerMembership.role;
  const isPrivileged = role === 'FOUNDER' || role === 'ADMIN';

  const row: any = await safeDbQuery(() =>
    (prisma as any).task.findFirst({
      where: { id: taskId, plan: { startupId: callerMembership.startupId } }
    })
  );
  if (!row) {
    throw new TaskDelegationError(404, 'Task not found in this company.', 'NOT_FOUND');
  }

  const decoded = decodeTask(row);

  // If not privileged, caller can only claim the task for THEMSELVES and only if they match the department ownerRole
  if (!isPrivileged) {
    if (targetAssigneeId && targetAssigneeId !== userId) {
      throw new TaskDelegationError(
        403,
        'Forbidden: employees cannot assign tasks to other team members.',
        'ASSIGNMENT_FORBIDDEN'
      );
    }
    // Employee is claiming
    targetAssigneeId = userId;

    if (!decoded.ownerRole || decoded.ownerRole !== role) {
      throw new TaskDelegationError(
        403,
        'Forbidden: you can only claim tasks designated for your department.',
        'NOT_TASK_OWNER'
      );
    }
  }

  let newAssignedTo: string;
  let targetUserName: string | null = null;

  if (targetAssigneeId) {
    // Validate target assignee belongs to same company
    const targetMembership = await resolveMembership(targetAssigneeId);
    if (!targetMembership || targetMembership.startupId !== callerMembership.startupId) {
      throw new TaskDelegationError(
        404,
        'Assignee not found in this company workspace.',
        'ASSIGNEE_NOT_FOUND'
      );
    }
    const rolePrefix = decoded.ownerRole || targetMembership.role;
    newAssignedTo = `${rolePrefix}:${targetAssigneeId}`;

    const userRecord = await safeDbQuery(() =>
      prisma.user.findUnique({
        where: { id: targetAssigneeId },
        select: { name: true, email: true }
      })
    );
    targetUserName = userRecord?.name || userRecord?.email || null;
  } else {
    // Unassign: reset to department role or UNASSIGNED
    newAssignedTo = decoded.ownerRole || 'UNASSIGNED';
  }

  const updateData: Record<string, any> = {
    assignedTo: newAssignedTo
  };
  // If task was pending and is now claimed by user, advance to in_progress
  if (targetAssigneeId && row.status === 'pending') {
    updateData.status = 'in_progress';
  }

  const updated: any = await (prisma as any).task.update({
    where: { id: row.id },
    data: updateData
  });

  const resTask = decodeTask(updated);
  if (targetUserName) {
    resTask.assignedUserName = targetUserName;
  }
  return resTask;
}

/**
 * Updates a task's status and/or result.
 *
 * Tenant- and role-scoped: the task must belong to the caller's company, and a
 * non-privileged member may only touch tasks owned by their role or assigned to them.
 * Transitions to 'submitted' auto-create an item in the Founder Approval queue.
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

  const rawAssigned = (row.assignedTo || '').trim();
  const assignedUpper = rawAssigned.toUpperCase();
  const isDirectAssignee = rawAssigned.includes(userId);
  const isRoleAssignee = assignedUpper === role || assignedUpper.startsWith(`${role}:`);

  if (!isPrivileged && !isDirectAssignee && !isRoleAssignee) {
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

  const decoded = decodeTask(updated);

  // If status is 'submitted', route deliverable directly to the Founder Approval queue (Phase B)
  if (data.status === 'submitted') {
    const approvalId = `appr_task_${row.id}`;
    const approvalTitle = `Deliverable Review: ${decoded.title}`;
    const approvalDescription = params.result || updated.result || `Completed deliverable for ${decoded.department} task: ${decoded.title}`;
    const approvalImpact = `Submitted by ${membership.role} (${decoded.agent}). Awaiting founder verification.`;

    await safeDbQuery(async () => {
      const existing = await (prisma as any).approval.findUnique({ where: { id: approvalId } });
      if (!existing) {
        await (prisma as any).approval.create({
          data: {
            id: approvalId,
            title: approvalTitle,
            description: approvalDescription,
            type: 'document',
            content: approvalDescription,
            impact: approvalImpact,
            financialChange: 0,
            metricChanges: {},
            planId: row.planId,
            status: 'pending_review'
          }
        });
      } else {
        await (prisma as any).approval.update({
          where: { id: approvalId },
          data: {
            title: approvalTitle,
            description: approvalDescription,
            content: approvalDescription,
            impact: approvalImpact,
            status: 'pending_review'
          }
        });
      }
    });
  }

  return decoded;
}

// ============================================================================
// PHASE B2 — EMPLOYEE WORKSPACE & COMPANION AI DRAFTS
// ============================================================================

export interface CompanionAgentInfo {
  name: string;
  role: string;
  avatar: string;
  description: string;
  department: string;
}

export const COMPANION_AGENTS: Record<string, CompanionAgentInfo> = {
  TALENT: {
    name: 'Echo',
    role: 'Chief People Officer & Talent Architect',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    description: 'Expert in talent acquisition, interview rubrics, compensation leveling, and onboarding milestones.',
    department: 'TALENT'
  },
  HR: {
    name: 'Echo',
    role: 'Chief People Officer & Talent Architect',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    description: 'Expert in talent acquisition, interview rubrics, compensation leveling, and onboarding milestones.',
    department: 'TALENT'
  },
  FINANCE: {
    name: 'Aura',
    role: 'Chief Financial Officer & Treasury Strategist',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    description: 'Specialist in cashflow runway, burn modeling, capital allocation, and financial compliance.',
    department: 'FINANCE'
  },
  GROWTH: {
    name: 'Vector',
    role: 'Chief Marketing Officer & Growth Lead',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    description: 'Specialist in go-to-market channels, CAC payback modeling, customer acquisition, and brand campaigns.',
    department: 'GROWTH'
  },
  OPERATIONS: {
    name: 'Atlas',
    role: 'Chief Operating Officer & Systems Architect',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    description: 'Architect for operational runbooks, team capacity modeling, IT provisioning, and SLA governance.',
    department: 'OPERATIONS'
  }
};

export function getCompanionAgent(departmentOrRole: string): CompanionAgentInfo {
  const key = (departmentOrRole || '').toUpperCase();
  return COMPANION_AGENTS[key] || {
    name: 'Catalyst Core',
    role: 'Executive AI Co-Pilot',
    avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150',
    description: 'Autonomous executive intelligence engine assisting with cross-functional execution.',
    department: key || 'GENERAL'
  };
}

export function generateAgentDraftContent(task: DelegatedTask, companyName?: string): {
  draftContent: string;
  guidelines: string[];
} {
  const dept = (task.department || '').toUpperCase();
  const lower = task.title.toLowerCase();

  if (dept === 'TALENT' || dept === 'HR' || lower.includes('hiring') || lower.includes('engineer') || lower.includes('recruit')) {
    return {
      draftContent: `### Talent Executive Working Draft: ${task.title}
**Assisting AI:** Echo (Chief People Officer)
**Target Organization:** ${companyName || 'Engineering & Operations'}

#### 1. Candidate Persona & Competency Matrix
- **Core Technical Stack:** TypeScript, React 19, Node.js / PostgreSQL, Cloud Architecture.
- **Leveling:** Senior / Staff IC. Minimum 5+ years building distributed resilient systems.
- **Autonomous Velocity:** Proven track record leading features end-to-end with high quality.

#### 2. Four-Stage Interview Loop
1. **Recruiter Screen (30m):** Experience alignment, compensation expectation check, work authorization.
2. **Technical Deep-Dive & Live Pairing (60m):** System design scenario, clean code decomposition.
3. **Bar Raiser Architecture Review (45m):** Resilience, database concurrency, API design.
4. **Founder Executive & Culture Fit (45m):** Startup mindset, ownership ethos, mutual alignment.

#### 3. Compensation & Leveling Guardrail
- **Base Range:** Market 75th percentile benchmark.
- **Equity Band:** Standard 4-year vesting schedule with 1-year cliff.
- **Budget Compliance:** Checked against company financial policies and cash runway bounds.

#### 4. 90-Day Onboarding Plan
- **Day 1–30:** Complete local setup, deploy first pull request within week 1, shadow on-call rotation.
- **Day 31–60:** Own core feature architecture, pair with product stakeholders.
- **Day 61–90:** Lead autonomous sprint deliverables, contribute to system scaling improvements.`,
      guidelines: [
        'Verify headcount authorization with Finance before extending offers.',
        'Follow company interview scorecard standards.',
        'Ensure 1-year cliff and 4-year vesting terms match stock option policies.'
      ]
    };
  }

  if (dept === 'FINANCE' || lower.includes('budget') || lower.includes('burn') || lower.includes('runway') || lower.includes('financial')) {
    return {
      draftContent: `### Financial Executive Working Draft: ${task.title}
**Assisting AI:** Aura (Chief Financial Officer)
**Scope:** Treasury & Capital Impact Audit

#### 1. Cashflow Impact Assessment
- **Estimated Expenditure / Addition:** Modeled against current burn rate.
- **Runway Variance:** Maintains minimum 6-month buffer threshold after allocation.
- **Capital Efficiency:** High ROI expected within 2 quarters.

#### 2. Risk & Safeguards Analysis
- **Fixed vs. Variable Cost Allocation:** Preserves liquid cash reserves.
- **Stress-Test Scenario:** Evaluated under downside revenue conditions.
- **Approval Requisite:** Requires final Founder sign-off before balance ledger dispatch.

#### 3. Strategic Financial Recommendation
- Proceed with budgeted plan while monitoring monthly net burn delta.
- Review vendor / headcount terms after 90 days.`,
      guidelines: [
        'Treasury disbursements exceeding $10,000 require dual verification.',
        'Maintain minimum 6 months runway buffer at all times.',
        'Record all approved amounts in the immutable decision ledger.'
      ]
    };
  }

  if (dept === 'GROWTH' || lower.includes('growth') || lower.includes('market') || lower.includes('acquisition') || lower.includes('campaign')) {
    return {
      draftContent: `### Growth Executive Working Draft: ${task.title}
**Assisting AI:** Vector (Chief Marketing Officer)
**Campaign Focus:** GTM Acceleration & Customer Acquisition

#### 1. Ideal Customer Profile (ICP) & Value Proposition
- **Target Segments:** High-velocity tech startups, founders, product and ops leads.
- **Key Positioning:** Streamlined autonomous operating loop with zero administrative overhead.

#### 2. Acquisition Channel Strategy
- **Organic & Content:** Technical deep dives, developer ecosystem tutorials, thought leadership.
- **Targeted Outbound:** Direct outreach to qualified early-stage teams.
- **Product-Led Loops:** Collaborative team invites and workflow sharing.

#### 3. KPI Targets & Payback Milestones
- **Target CAC:** Sustainable CAC payback < 6 months.
- **Conversion Goal:** 15%+ lead-to-activation rate.`,
      guidelines: [
        'Ensure all copy aligns with official brand messaging standards.',
        'Monitor CAC payback period weekly.',
        'Respect privacy policies and email deliverability compliance.'
      ]
    };
  }

  // Operations / General
  return {
    draftContent: `### Operational Executive Working Draft: ${task.title}
**Assisting AI:** Atlas (Chief Operating Officer)
**Scope:** Execution & Systems Roadmap

#### 1. Operational Objectives
- Clear sequential milestone execution with accountability.
- Minimal friction integration with existing tooling and developer setup.

#### 2. Tooling & Infrastructure Requirements
- Verify secure access credentials and environment configuration.
- Setup automated health alerts and status monitoring.

#### 3. Delivery Milestones
- **Phase 1:** Requirements alignment & capacity verification.
- **Phase 2:** Implementation, code review, and automated regression tests.
- **Phase 3:** Founder sign-off and production rollout.`,
    guidelines: [
      'Document all changes in the shared runbook.',
      'Maintain 99.9% uptime and zero-downtime deployment practices.',
      'Notify founder upon milestone completion.'
    ]
  };
}

export interface EmployeeWorkspacePayload {
  department: string;
  role: string;
  companionAgent: CompanionAgentInfo;
  tasks: DelegatedTask[];
  accessibleDocuments: Array<{
    id: string;
    name: string;
    type: string;
    summary: string;
    category?: string;
  }>;
  departmentMetrics?: {
    activeTasks: number;
    pendingSubmission: number;
    submittedCount: number;
    approvedCount: number;
  };
}

/**
 * Phase B2: Retrieves the employee workspace payload including companion AI agent,
 * active tasks, department metrics, and strictly role-scoped documents (zero cross-department leaks).
 */
export async function getRoleScopedContext(params: {
  userId: string;
}): Promise<EmployeeWorkspacePayload> {
  const { userId } = params;
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

  // Determine effective department for companion agent
  let department = 'GENERAL';
  if (role === 'HR') department = 'TALENT';
  else if (role === 'FINANCE') department = 'FINANCE';
  else if (role === 'GROWTH') department = 'GROWTH';
  else if (role === 'OPERATIONS') department = 'OPERATIONS';
  else if (isPrivileged) department = 'EXECUTIVE';

  const companionAgent = getCompanionAgent(department);

  // Get user tasks
  const tasks = await listTasksForUser(userId);

  // Compute metrics
  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const pendingSubmission = tasks.filter(t => t.status === 'in_progress').length;
  const submittedCount = tasks.filter(t => t.status === 'submitted').length;
  const approvedCount = tasks.filter(t => t.status === 'approved').length;

  // Retrieve role-scoped documents with ZERO cross-department leaks
  const allDocs = await safeDbQuery(async () => {
    try {
      if ((prisma as any).document) {
        return await (prisma as any).document.findMany({
          where: { startupId: membership.startupId }
        });
      }
    } catch {}
    return [];
  }) || [];

  // Standard curated company reference documents scoped strictly by role
  const standardDocs = [
    {
      id: 'doc_hiring_policy',
      name: 'Engineering Hiring Policy & Leveling Rubric.pdf',
      type: 'pdf',
      summary: 'Guidelines for technical interviews, candidate rubrics, compensation bands, and offer sign-offs.',
      category: 'TALENT'
    },
    {
      id: 'doc_employee_handbook',
      name: 'Employee Handbook & Culture Principles.pdf',
      type: 'pdf',
      summary: 'Company values, remote work policies, equipment stipends, leave entitlements, and code of conduct.',
      category: 'TALENT'
    },
    {
      id: 'doc_financial_statement',
      name: 'Q3 Financial Statements & Treasury Allocation.xlsx',
      type: 'spreadsheet',
      summary: 'Cash balance reserves, monthly recurring burn, departmental budgets, and runway projections.',
      category: 'FINANCE'
    },
    {
      id: 'doc_cap_table',
      name: 'Cap Table & Equity Incentive Pool.xlsx',
      type: 'spreadsheet',
      summary: 'Shareholder distribution, option pool reserve, vesting schedules, and 409A valuation benchmarks.',
      category: 'FINANCE'
    },
    {
      id: 'doc_gtm_strategy',
      name: 'Go-To-Market & Growth Playbook.pdf',
      type: 'pdf',
      summary: 'ICP definitions, acquisition funnels, brand guidelines, content distribution, and CAC payback targets.',
      category: 'GROWTH'
    },
    {
      id: 'doc_marketing_assets',
      name: 'Brand Guidelines & Product Messaging.pdf',
      type: 'pdf',
      summary: 'Tone of voice, typography, color palettes, logo usage, and competitive positioning matrix.',
      category: 'GROWTH'
    },
    {
      id: 'doc_ops_runbook',
      name: 'Operations Infrastructure & Tooling Runbook.pdf',
      type: 'pdf',
      summary: 'Cloud provisioning, incident response procedures, security compliance policies, and service level agreements.',
      category: 'OPERATIONS'
    }
  ];

  const combinedDocs = [...standardDocs, ...allDocs];

  // STRICT ROLE FILTERING: Zero cross-department leaks!
  const accessibleDocuments = combinedDocs.filter(doc => {
    if (isPrivileged) return true; // Founders / Admins see everything
    const docCat = (doc.category || '').toUpperCase();
    if (role === 'HR') {
      return docCat === 'TALENT' || docCat === 'HR' || doc.name.toLowerCase().includes('hiring') || doc.name.toLowerCase().includes('handbook');
    }
    if (role === 'FINANCE') {
      return docCat === 'FINANCE' || doc.name.toLowerCase().includes('financial') || doc.name.toLowerCase().includes('treasury') || doc.name.toLowerCase().includes('cap table') || doc.name.toLowerCase().includes('budget');
    }
    if (role === 'GROWTH') {
      return docCat === 'GROWTH' || doc.name.toLowerCase().includes('marketing') || doc.name.toLowerCase().includes('growth') || doc.name.toLowerCase().includes('gtm') || doc.name.toLowerCase().includes('brand');
    }
    if (role === 'OPERATIONS') {
      return docCat === 'OPERATIONS' || doc.name.toLowerCase().includes('runbook') || doc.name.toLowerCase().includes('infrastructure') || doc.name.toLowerCase().includes('operations');
    }
    return false;
  });

  return {
    department,
    role,
    companionAgent,
    tasks,
    accessibleDocuments,
    departmentMetrics: {
      activeTasks,
      pendingSubmission,
      submittedCount,
      approvedCount
    }
  };
}

/**
 * Phase B2: Retrieves the companion AI draft, task details, and role-scoped documents
 * for a specific task.
 */
export async function getAgentDraftForTask(userId: string, taskId: string): Promise<{
  task: DelegatedTask;
  companionAgent: CompanionAgentInfo;
  draftContent: string;
  guidelines: string[];
  roleScopedDocuments: Array<{ id: string; name: string; type: string; summary: string }>;
}> {
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
      where: { id: taskId, plan: { startupId: membership.startupId } },
      include: { plan: { include: { startup: true } } }
    })
  );
  if (!row) {
    throw new TaskDelegationError(404, 'Task not found in this company.', 'NOT_FOUND');
  }

  const rawAssigned = (row.assignedTo || '').trim();
  const assignedUpper = rawAssigned.toUpperCase();
  const isDirectAssignee = rawAssigned.includes(userId);
  const isRoleAssignee = assignedUpper === role || assignedUpper.startsWith(`${role}:`);

  if (!isPrivileged && !isDirectAssignee && !isRoleAssignee) {
    throw new TaskDelegationError(
      403,
      'Forbidden: you cannot access drafts for other departments.',
      'NOT_TASK_OWNER'
    );
  }

  const task = decodeTask(row);
  const companionAgent = getCompanionAgent(task.department || role);
  const companyName = row.plan?.startup?.name || 'Catalyst OS';

  const draftData = generateAgentDraftContent(task, companyName);
  const workspaceContext = await getRoleScopedContext({ userId });

  return {
    task,
    companionAgent,
    draftContent: task.result || draftData.draftContent,
    guidelines: draftData.guidelines,
    roleScopedDocuments: workspaceContext.accessibleDocuments
  };
}
