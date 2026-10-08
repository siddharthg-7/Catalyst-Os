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

function decodeTask(row: any): DelegatedTask {
  const match = TITLE_PREFIX.exec(row.title || '');
  const department = match?.[1] || 'GENERAL';
  const agent = match?.[2] || 'CEO';
  const ownerRole = (match?.[3] || '') as Role | '';
  const title = (row.title || '').replace(TITLE_PREFIX, '');
  const assigned = (row.assignedTo || '').trim().toUpperCase();

  return {
    id: row.id,
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
  workOrders: WorkOrderInput[]
): Promise<DelegatedTask[]> {
  if (!startupId || !prisma || !Array.isArray(workOrders) || workOrders.length === 0) {
    return [];
  }

  try {
    const planId = await resolvePlanId(startupId);
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
