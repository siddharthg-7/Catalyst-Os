/**
 * CatalystOS - Founder Activity Ledger & Real-Time Audit Service (Module 6 & Data Schema)
 * Records and indexes all employee and agent actions: task claims, draft submissions,
 * metric revisions, status updates, and founder approvals.
 * Supports chronological feed querying with live filters by Department, Employee, and Action Type.
 */

import { prisma, safeDbQuery } from './dbService';

export type ActivityAction =
  | 'TASK_CLAIMED'
  | 'TASK_SUBMITTED'
  | 'RULE_MODIFIED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'
  | 'CHANGES_REQUESTED'
  | 'METRIC_REVISED'
  | 'STATUS_UPDATE'
  | 'DOCUMENT_INGESTED'
  | 'ORCHESTRATION_STARTED';

export interface ActivityLogRecord {
  id: string;
  startupId: string;
  userId: string;
  actorId: string;
  actorRole: string;
  action: ActivityAction | string;
  targetEntity?: string;
  targetId?: string;
  payloadDelta?: any;
  department?: string;
  details: Record<string, any>;
  status?: string;
  timestamp: string;
}

// In-memory persistent activity log store
const memoryActivityLogs: ActivityLogRecord[] = [];

export class ActivityLogService {
  /**
   * Records an immutable activity event in the audit log.
   */
  public async logActivity(params: {
    startupId: string;
    userId: string;
    actorRole?: string;
    action: ActivityAction | string;
    targetEntity?: string;
    targetId?: string;
    payloadDelta?: any;
    department?: string;
    details?: Record<string, any>;
    status?: string;
  }): Promise<ActivityLogRecord> {
    const {
      startupId,
      userId,
      actorRole = 'EMPLOYEE',
      action,
      targetEntity = 'TASK',
      targetId,
      payloadDelta = null,
      department,
      details = {},
      status = 'COMPLETED'
    } = params;

    const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();

    const record: ActivityLogRecord = {
      id,
      startupId: startupId || 'default',
      userId,
      actorId: userId,
      actorRole,
      action,
      targetEntity,
      targetId,
      payloadDelta,
      department: department || details?.department || 'GENERAL',
      details,
      status,
      timestamp
    };

    // 1. Store in memory
    memoryActivityLogs.unshift(record);
    if (memoryActivityLogs.length > 2000) {
      memoryActivityLogs.pop();
    }

    // 2. Persist to Prisma if ActivityLog model exists
    try {
      await safeDbQuery(async () => {
        if ((prisma as any).activityLog) {
          await (prisma as any).activityLog.create({
            data: {
              id: record.id,
              startupId: record.startupId,
              userId: record.userId,
              action: record.action,
              details: {
                actorRole: record.actorRole,
                targetEntity: record.targetEntity,
                targetId: record.targetId,
                payloadDelta: record.payloadDelta,
                department: record.department,
                status: record.status,
                ...record.details
              },
              timestamp: new Date()
            }
          });
        }
      });
    } catch {}

    return record;
  }

  /**
   * Retrieves a filtered chronological activity feed.
   */
  public async listActivities(params: {
    startupId: string;
    department?: string;
    userId?: string;
    action?: string;
    limit?: number;
  }): Promise<ActivityLogRecord[]> {
    const { startupId, department, userId, action, limit = 50 } = params;

    // Filter memory logs
    let filtered = memoryActivityLogs.filter(log => {
      if (startupId && log.startupId !== startupId) return false;
      if (department && department !== 'ALL' && log.department?.toUpperCase() !== department.toUpperCase()) return false;
      if (userId && log.userId !== userId && log.actorId !== userId) return false;
      if (action && action !== 'ALL' && log.action.toUpperCase() !== action.toUpperCase()) return false;
      return true;
    });

    // Check Prisma database if available
    try {
      if ((prisma as any).activityLog) {
        const whereClause: any = { startupId };
        if (userId) whereClause.userId = userId;
        if (action && action !== 'ALL') whereClause.action = action;

        const dbLogs: any = await safeDbQuery(() => (prisma as any).activityLog.findMany({
          where: whereClause,
          orderBy: { timestamp: 'desc' },
          take: limit
        }));

        if (Array.isArray(dbLogs) && dbLogs.length > 0) {
          const mappedDb: ActivityLogRecord[] = dbLogs.map((l: any) => ({
            id: l.id,
            startupId: l.startupId,
            userId: l.userId,
            actorId: l.userId,
            actorRole: l.details?.actorRole || 'EMPLOYEE',
            action: l.action,
            targetEntity: l.details?.targetEntity || 'TASK',
            targetId: l.details?.targetId,
            payloadDelta: l.details?.payloadDelta,
            department: l.details?.department || 'GENERAL',
            details: l.details || {},
            status: l.details?.status || 'COMPLETED',
            timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : new Date().toISOString()
          }));

          // Merge without duplicates
          const seen = new Set(filtered.map(f => f.id));
          for (const item of mappedDb) {
            if (department && department !== 'ALL' && item.department?.toUpperCase() !== department.toUpperCase()) {
              continue;
            }
            if (!seen.has(item.id)) {
              filtered.push(item);
              seen.add(item.id);
            }
          }
          filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      }
    } catch {}

    return filtered.slice(0, limit);
  }
}

export const activityLogService = new ActivityLogService();
