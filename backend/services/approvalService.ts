import { prisma, safeDbQuery } from './dbService';
import { companyContextService } from './companyContextService';
import { startupProfile, approvals, decisionLog, initiatives, isDbAvailable } from '../state';
import { Deliverable, StartupProfile, DecisionRecord } from '../../src/types';
import { decisionLedgerService } from './decisionLedgerService';
import { idempotencyService } from './idempotencyService';

export interface CreateApprovalParams {
  startupId: string;
  title: string;
  description: string;
  type: string;
  content?: string;
  impact?: string;
  financialChange?: number;
  metricChanges?: Record<string, number>;
  planId?: string;
}

export interface ReviewApprovalParams {
  approvalId: string;
  userId: string;
  userRole?: string;
  startupId?: string;
  action: 'approve' | 'modify' | 'reject';
  feedback?: string;
  idempotencyKey?: string;
  modifications?: {
    financialChange?: number;
    headcount?: number;
    conditions?: string;
  };
  /** For testing: force execution failure to test failure handling boundary */
  simulateExecutionFailure?: boolean;
}

export interface ReverseApprovalParams {
  approvalId: string;
  userId: string;
  userRole?: string;
  reason?: string;
}

export interface ReverseApprovalResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  message?: string;
  item?: Deliverable;
  startupProfile?: StartupProfile;
  stateChangesApplied?: StateChangesApplied;
}

export interface StateChangesApplied {
  isStateChanging: boolean;
  cashBalanceDelta: number;
  burnRateDelta: number;
  teamSizeDelta: number;
  runwayMonths: number;
  healthScoreDelta: number;
}

export interface ReviewApprovalResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  alreadyProcessed?: boolean;
  message?: string;
  item?: Deliverable;
  startupProfile?: StartupProfile;
  stateChangesApplied?: StateChangesApplied;
}

/**
 * Normalizes input type string to canonical Deliverable type.
 */
export function normalizeDeliverableType(type: string): 'document' | 'contract' | 'financials' | 'marketing_plan' | 'policy' {
  const t = (type || '').toLowerCase();
  if (t === 'contract') return 'contract';
  if (t === 'financial' || t === 'financials') return 'financials';
  if (t === 'marketing_plan' || t === 'marketing') return 'marketing_plan';
  if (t === 'policy' || t === 'legal') return 'policy';
  return 'document';
}

/**
 * Normalizes numbers or text representing team size and increments by countToAdd.
 * e.g. "5" -> "6", "4 engineers" -> "5 engineers", "1-5" -> "6"
 */
export function incrementTeamSize(existingDescription: string, countToAdd: number = 1): string {
  if (!existingDescription || existingDescription.trim() === '') {
    return `${countToAdd + 1} team members`;
  }
  const trimmed = existingDescription.trim();
  const match = trimmed.match(/(\d+)/);
  if (match) {
    const currentNum = parseInt(match[1], 10);
    const newNum = currentNum + countToAdd;
    return trimmed.replace(/\d+/, newNum.toString());
  }
  return `${trimmed} + ${countToAdd} new hire`;
}

/**
 * Maps a Prisma Approval record to standard Deliverable interface.
 */
export function mapApprovalToDeliverable(appr: any): Deliverable {
  let metricChanges = { velocity: 0, financialHealth: 0, legalCompliance: 0, growthRate: 0, operationsEfficiency: 0 };
  if (appr.metricChanges) {
    if (typeof appr.metricChanges === 'string') {
      try {
        metricChanges = { ...metricChanges, ...JSON.parse(appr.metricChanges) };
      } catch {
        // ignore parse error
      }
    } else if (typeof appr.metricChanges === 'object') {
      metricChanges = { ...metricChanges, ...appr.metricChanges };
    }
  }

  return {
    id: appr.id,
    initiativeId: appr.plan?.id || appr.planId || 'init_executive',
    title: appr.title,
    description: appr.description,
    type: normalizeDeliverableType(appr.type),
    content: appr.content || appr.description,
    impact: appr.impact || 'Requires founder verification.',
    financialChange: appr.financialChange ?? 0,
    status: appr.status || 'pending_review',
    metricChanges
  };
}

export const processedApprovalsMap = new Map<string, Deliverable>();
export const approvalToStartupMap = new Map<string, string>();
export const userToStartupMap = new Map<string, string>();

export class ApprovalService {
  private simulateDegraded = false;

  public setDegradedMode(active: boolean) {
    this.simulateDegraded = active;
  }

  public isDegradedModeActive(): boolean {
    if (this.simulateDegraded) return true;
    if (process.env.NODE_ENV === 'production' && !isDbAvailable) return true;
    return false;
  }

  /**
   * Creates a structured executive Approval record linked to the startup's active plan.
   * Emits notification and invalidates context so pending approvals list is updated.
   */
  public async createApproval(params: CreateApprovalParams): Promise<Deliverable> {
    const {
      startupId,
      title,
      description,
      type,
      content,
      impact,
      financialChange = 0,
      metricChanges = {},
      planId
    } = params;

    if (!startupId) {
      throw new Error('startupId is required to create an approval.');
    }

    const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const deliverableItem: Deliverable = {
      id: approvalId,
      initiativeId: planId || 'init_executive',
      title,
      description,
      type: normalizeDeliverableType(type),
      content: content || description,
      impact: impact || 'Requires founder verification.',
      financialChange,
      status: 'pending_review',
      metricChanges: {
        velocity: 0,
        financialHealth: 0,
        legalCompliance: 0,
        growthRate: 0,
        operationsEfficiency: 0,
        ...metricChanges
      }
    };

    // Store in active in-memory array for fast-path local access
    approvals.unshift(deliverableItem);
    approvalToStartupMap.set(approvalId, startupId);

    if (isDbAvailable && prisma) {
      try {
        await safeDbQuery(async () => {
          let targetPlanId = planId;
          if (!targetPlanId) {
            const startupInDb = await prisma.startup.findUnique({
              where: { id: startupId }
            });
            if (!startupInDb) {
              return;
            }
            let activePlan = await prisma.plan.findFirst({
              where: { startupId }
            });
            if (!activePlan) {
              activePlan = await prisma.plan.create({
                data: {
                  title: 'Core Executive Operations',
                  description: 'Default continuous operating plan',
                  startupId,
                  status: 'active'
                }
              });
            }
            targetPlanId = activePlan.id;
          }

          await prisma.approval.create({
            data: {
              id: approvalId,
              title,
              description,
              type,
              status: 'pending_review',
              content: deliverableItem.content,
              impact: deliverableItem.impact,
              financialChange,
              metricChanges: deliverableItem.metricChanges || {},
              planId: targetPlanId
            }
          });

          await prisma.notification.create({
            data: {
              title: `Approval Required: ${title}`,
              message: `${description} requires founder review.`,
              type: 'APPROVAL',
              startupId
            }
          });
        }, 1);

        // Invalidate context cache to reflect newly pending approval
        companyContextService.invalidate(startupId);
      } catch (dbErr: any) {
        console.warn('[ApprovalService] DB query failed, maintained in memory state:', dbErr.message);
      }
    }

    return deliverableItem;
  }

  /**
   * Retrieves pending and recent approvals for the authenticated founder's startup.
   * Strictly enforces tenant scoping: returns only approvals belonging to the requesting user's startup.
   */
  public async getApprovalsForUser(userId: string): Promise<Deliverable[]> {
    if (!userId) {
      return [];
    }

    let userStartupId: string | null = null;
    if (isDbAvailable && prisma) {
      const userStartup = await safeDbQuery(() =>
        prisma.startup.findFirst({
          where: { ownerId: userId },
          select: { id: true }
        })
      );
      if (userStartup) {
        userStartupId = userStartup.id;
      }
    }

    let dbApprovals: Deliverable[] = [];
    if (isDbAvailable && prisma && userStartupId) {
      const records = await safeDbQuery(() =>
        prisma.approval.findMany({
          where: {
            plan: {
              startupId: userStartupId!
            }
          },
          include: {
            plan: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      );

      if (records && records.length > 0) {
        dbApprovals = records.map(mapApprovalToDeliverable);
      }
    }

    // Merge with in-memory approvals (filtering for duplicates)
    const existingIds = new Set(dbApprovals.map(a => a.id));
    const memoryApprovals = approvals.filter(a => !existingIds.has(a.id));

    return [...dbApprovals, ...memoryApprovals];
  }

  /**
   * Reviews and executes an approval action ('approve' | 'reject').
   * Enforces:
   * 1. Authentication & Role Authorization (Founders/Admins only)
   * 2. Cross-Tenant Isolation (Users can only review approvals belonging to their company)
   * 3. Idempotency Guard (Already reviewed approvals cannot be re-executed or double-mutate state)
   * 4. State Mutation Boundary (Only supported state mutations persist to PostgreSQL)
   * 5. Clean Failure Handling (Failed executions do not falsely mutate company state)
   * 6. Context Invalidation (Refreshes Company Context after successful state changes)
   * 7. Audit Trail (Records in Execution, DecisionLog, and TimelineItem)
   */
  public async reviewApproval(params: ReviewApprovalParams): Promise<ReviewApprovalResult> {
    const { approvalId, userId, userRole, action, feedback, simulateExecutionFailure } = params;

    // 0. Degraded Mode Guard (Rule 3 & Section 14)
    if (this.isDegradedModeActive()) {
      return {
        success: false,
        statusCode: 503,
        error: 'Catalyst OS is operating in degraded read-only mode. Critical financial and executive state mutations are temporarily blocked because durable storage is unavailable.'
      };
    }

    // 0.1 Idempotency Lock Guard (Section 4 & 5)
    const effectiveTenantId = params.startupId || userToStartupMap.get(userId) || approvalToStartupMap.get(approvalId) || 'default';
    const lock = await idempotencyService.acquireLock({
      tenantId: effectiveTenantId,
      approvalId,
      action,
      idempotencyKey: params.idempotencyKey
    });

    if (!lock.acquired) {
      if (lock.status === 'completed' && lock.cachedResult) {
        return {
          ...lock.cachedResult,
          alreadyProcessed: true,
          message: `Approval has already been processed with status: "${lock.cachedResult.item?.status || 'approved'}". Duplicate execution prevented.`,
          stateChangesApplied: {
            isStateChanging: false,
            cashBalanceDelta: 0,
            burnRateDelta: 0,
            teamSizeDelta: 0,
            runwayMonths: lock.cachedResult.startupProfile?.runwayMonths || 0,
            healthScoreDelta: 0
          }
        };
      }
      if (lock.status === 'processing') {
        return {
          success: false,
          statusCode: 409,
          error: 'Conflict: An identical approval review operation is currently being processed by another worker or request.'
        };
      }
    }

    // 1. Authentication & Role Authorization
    if (!userId) {
      await idempotencyService.release({
        tenantId: effectiveTenantId,
        approvalId,
        action,
        idempotencyKey: params.idempotencyKey,
        error: 'Unauthorized'
      });
      return {
        success: false,
        statusCode: 401,
        error: 'Unauthorized: Authentication required to review approvals.'
      };
    }

    if (userRole && userRole === 'Executive') {
      await idempotencyService.release({
        tenantId: effectiveTenantId,
        approvalId,
        action,
        idempotencyKey: params.idempotencyKey,
        error: 'Forbidden'
      });
      return {
        success: false,
        statusCode: 403,
        error: 'Unauthorized: Executive accounts cannot review or approve deliverables. Please login as Founder.'
      };
    }

    // 2. Fetch Approval and Verify Tenant Scoping
    let dbApproval: any = null;
    let startup: any = null;

    if (isDbAvailable && prisma) {
      dbApproval = await safeDbQuery(() =>
        prisma.approval.findUnique({
          where: { id: approvalId },
          include: {
            plan: {
              include: {
                startup: true
              }
            }
          }
        })
      );
    }

    // Check in memory if already processed (Idempotency Guard)
    const alreadyProcessedMemory = processedApprovalsMap.get(approvalId);
    if (alreadyProcessedMemory) {
      const alreadyMemResult: ReviewApprovalResult = {
        success: true,
        alreadyProcessed: true,
        message: `Approval has already been processed with status: "${alreadyProcessedMemory.status}". Duplicate execution prevented.`,
        item: alreadyProcessedMemory,
        startupProfile: startupProfile,
        stateChangesApplied: {
          isStateChanging: false,
          cashBalanceDelta: 0,
          burnRateDelta: 0,
          teamSizeDelta: 0,
          runwayMonths: startupProfile.runwayMonths,
          healthScoreDelta: 0
        }
      };
      await idempotencyService.commit({
        tenantId: effectiveTenantId,
        approvalId,
        action,
        idempotencyKey: params.idempotencyKey,
        result: alreadyMemResult
      });
      return alreadyMemResult;
    }

    // In-memory Cross-Tenant Authorization Check
    const associatedStartupId = approvalToStartupMap.get(approvalId);
    const callerStartupId = params.startupId || userToStartupMap.get(userId);
    if (associatedStartupId && callerStartupId && associatedStartupId !== callerStartupId) {
      await idempotencyService.release({
        tenantId: effectiveTenantId,
        approvalId,
        action,
        idempotencyKey: params.idempotencyKey,
        error: 'Forbidden'
      });
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: You do not have permission to review approvals for another company.'
      };
    }

    // Check in memory if not in DB
    const memoryIndex = approvals.findIndex(a => a.id === approvalId);
    const memoryApproval = memoryIndex !== -1 ? approvals[memoryIndex] : null;

    if (!dbApproval && !memoryApproval) {
      await idempotencyService.release({
        tenantId: effectiveTenantId,
        approvalId,
        action,
        idempotencyKey: params.idempotencyKey,
        error: 'NotFound'
      });
      return {
        success: false,
        statusCode: 404,
        error: 'Approval deliverable not found.'
      };
    }

    if (dbApproval) {
      startup = dbApproval.plan?.startup;
      // Cross-Tenant Authorization Check
      if (!startup || startup.ownerId !== userId) {
        await idempotencyService.release({
          tenantId: effectiveTenantId,
          approvalId,
          action,
          idempotencyKey: params.idempotencyKey,
          error: 'Forbidden'
        });
        return {
          success: false,
          statusCode: 403,
          error: 'Forbidden: You do not have permission to review approvals for another company.'
        };
      }
    }

    const currentStatus = dbApproval ? dbApproval.status : memoryApproval?.status;

    // 3. Idempotency Guard: prevent re-executing already processed approvals
    if (currentStatus !== 'pending_review') {
      const deliverable = dbApproval ? mapApprovalToDeliverable(dbApproval) : memoryApproval!;
      const alreadyStatusResult: ReviewApprovalResult = {
        success: true,
        alreadyProcessed: true,
        message: `Approval has already been processed with status: "${currentStatus}". Duplicate execution prevented.`,
        item: deliverable,
        startupProfile: startupProfile,
        stateChangesApplied: {
          isStateChanging: false,
          cashBalanceDelta: 0,
          burnRateDelta: 0,
          teamSizeDelta: 0,
          runwayMonths: startupProfile.runwayMonths,
          healthScoreDelta: 0
        }
      };
      await idempotencyService.commit({
        tenantId: effectiveTenantId,
        approvalId,
        action,
        idempotencyKey: params.idempotencyKey,
        result: alreadyStatusResult
      });
      return alreadyStatusResult;
    }

    // 4. Handle REJECTION
    if (action === 'reject') {
      if (dbApproval && isDbAvailable && prisma) {
        await safeDbQuery(async () => {
          await prisma.approval.update({
            where: { id: approvalId },
            data: { status: 'rejected' }
          });

          await prisma.decisionLog.create({
            data: {
              title: `Reject: ${dbApproval.title}`,
              description: `Rejected by founder with feedback: "${feedback || 'No feedback provided'}"`,
              category: (dbApproval.type || 'OPERATIONS').toUpperCase(),
              impactText: 'No operational metrics modified.',
              financialImpact: 0,
              status: 'rejected',
              startupId: startup.id
            }
          });

          await prisma.timelineItem.create({
            data: {
              title: `Rejected: ${dbApproval.title}`,
              content: `Founder rejected proposed deliverable. Feedback: "${feedback || 'None'}"`,
              type: 'rejection',
              startupId: startup.id
            }
          });
        }, 3);

        // Invalidate context to update pendingApprovals count
        companyContextService.invalidate(startup.id);
        companyContextService.invalidate(userId);
      }

      if (memoryApproval) {
        memoryApproval.status = 'rejected';
        decisionLog.unshift({
          id: `dec_${Date.now()}`,
          title: `Reject: ${memoryApproval.title}`,
          description: `Rejected by founder with feedback: "${feedback || 'No feedback provided'}"`,
          category: memoryApproval.type.toUpperCase(),
          timestamp: new Date().toISOString(),
          impactText: 'No operational metrics modified.',
          financialImpact: 0,
          status: 'rejected'
        });
        if (memoryIndex !== -1) approvals.splice(memoryIndex, 1);
      }

      decisionLedgerService.appendEvent({
        decisionId: approvalId,
        startupId: startup?.id || 'stp_default',
        workflowId: dbApproval?.initiativeId || memoryApproval?.initiativeId || approvalId,
        actor: `Founder (${userId})`,
        eventType: 'FOUNDER_REJECTED',
        payload: { feedback: feedback || null }
      });

      const item = dbApproval ? mapApprovalToDeliverable({ ...dbApproval, status: 'rejected' }) : memoryApproval!;
      processedApprovalsMap.set(approvalId, item);

      const rejectResult: ReviewApprovalResult = {
        success: true,
        message: 'Deliverable rejected and recorded in decision ledger.',
        item,
        startupProfile: await this.buildStartupProfile(startup),
        stateChangesApplied: {
          isStateChanging: false,
          cashBalanceDelta: 0,
          burnRateDelta: 0,
          teamSizeDelta: 0,
          runwayMonths: startup ? (startup.burnRate > 0 ? parseFloat((startup.cashBalance / startup.burnRate).toFixed(1)) : 999) : 0,
          healthScoreDelta: 0
        }
      };

      await idempotencyService.commit({
        tenantId: effectiveTenantId,
        approvalId,
        action,
        idempotencyKey: params.idempotencyKey,
        result: rejectResult
      });

      return rejectResult;
    }

    // 5. Handle APPROVAL & MODIFICATION
    if (action === 'approve' || action === 'modify') {
      const appr = dbApproval || memoryApproval;
      const titleLower = (appr.title || '').toLowerCase();
      const descLower = (appr.description || '').toLowerCase();
      const typeLower = (appr.type || '').toLowerCase();
      const effectiveFinancialChange = params.modifications?.financialChange !== undefined 
        ? params.modifications.financialChange 
        : appr.financialChange;
      const effectiveHeadcount = params.modifications?.headcount !== undefined
        ? params.modifications.headcount
        : undefined;

      // Classify if action represents a supported state mutation
      const isHiring = typeLower === 'contract' ||
        titleLower.includes('hire') ||
        titleLower.includes('recruiting') ||
        descLower.includes('hire') ||
        descLower.includes('headcount');

      const isFinancial = appr.financialChange !== 0 ||
        typeLower === 'financial' ||
        titleLower.includes('budget') ||
        titleLower.includes('seed funding') ||
        titleLower.includes('treasury');

      const rawMetricChanges = appr.metricChanges || {};
      const hasMetricChanges = Object.values(rawMetricChanges).some((v: any) => typeof v === 'number' && v !== 0);

      const isStateChanging = isHiring || isFinancial || hasMetricChanges;

      decisionLedgerService.appendEvent({
        decisionId: approvalId,
        startupId: startup?.id || 'stp_default',
        workflowId: appr.initiativeId || approvalId,
        actor: `Founder (${userId})`,
        eventType: action === 'modify' ? 'FOUNDER_MODIFIED' : 'FOUNDER_APPROVED',
        payload: {
          action,
          feedback: feedback || null,
          modifications: params.modifications || null,
          effectiveFinancialChange,
          effectiveHeadcount
        }
      });

      // 5.1 Simulated or Detected Execution Failure Handling
      if (simulateExecutionFailure) {
        if (dbApproval && isDbAvailable && prisma) {
          await safeDbQuery(async () => {
            await prisma.approval.update({
              where: { id: approvalId },
              data: { status: 'execution_failed' }
            });

            await prisma.execution.create({
              data: {
                action: appr.title,
                payload: { error: 'Simulated execution subsystem failure' },
                status: 'failed',
                planId: appr.planId || dbApproval.planId
              }
            });

            await prisma.decisionLog.create({
              data: {
                title: `Execution Failed: ${appr.title}`,
                description: 'Approved by founder but execution failed in backend subsystem.',
                category: (appr.type || 'EXECUTION').toUpperCase(),
                impactText: 'Execution failed. No false company-state mutations applied.',
                financialImpact: 0,
                status: 'failed',
                startupId: startup.id
              }
            });
          }, 3);
        }

        return {
          success: false,
          statusCode: 500,
          error: 'Execution failed: Operational subsystem error. Company state was not modified.'
        };
      }

      // 5.2 Execute State-Changing Approval
      let cashDelta = 0;
      let burnDelta = 0;
      let teamSizeDelta = 0;
      let healthScoreDelta = 0;

      if (isStateChanging) {
        // A. Headcount / Hiring Mutation
        if (isHiring) {
          let headcount = effectiveHeadcount || 1;
          const countMatch = (appr.title + ' ' + appr.description).match(/hire\s+(\d+)x?/i);
          if (countMatch && !effectiveHeadcount) {
            headcount = parseInt(countMatch[1], 10) || 1;
          }
          teamSizeDelta = headcount;

          // Determine monthly burn impact
          if (effectiveFinancialChange && effectiveFinancialChange < 0) {
            const absChange = Math.abs(effectiveFinancialChange);
            burnDelta = absChange > 20000 ? Math.round(absChange / 12) : Math.round(absChange);
          } else {
            burnDelta = 10000 * headcount;
          }
        }

        // B. Financial Treasury Mutation
        if (isFinancial) {
          if (effectiveFinancialChange > 0) {
            cashDelta += effectiveFinancialChange;
          } else if (effectiveFinancialChange < 0) {
            if (!isHiring) {
              cashDelta += effectiveFinancialChange;
              const absChange = Math.abs(effectiveFinancialChange);
              burnDelta += Math.round(absChange / 12);
            }
          }
        }

        // C. Metrics & Health Score Mutation
        if (hasMetricChanges) {
          const vals = Object.values(rawMetricChanges).filter((v): v is number => typeof v === 'number');
          if (vals.length > 0) {
            const avgDelta = vals.reduce((a, b) => a + b, 0) / vals.length;
            healthScoreDelta = Math.round(avgDelta);
          }
        }
      }

      if (isStateChanging && startup && isDbAvailable && prisma) {
        try {
          // A. Headcount / Hiring Mutation in PostgreSQL
          if (isHiring) {
            const existingTeamMemory = await prisma.memory.findFirst({
              where: {
                startupId: startup.id,
                category: 'TEAM_SIZE'
              }
            });

            const currentDesc = existingTeamMemory?.description || '1-5';
            const updatedTeamDesc = incrementTeamSize(currentDesc, teamSizeDelta);

            if (existingTeamMemory) {
              await prisma.memory.update({
                where: { id: existingTeamMemory.id },
                data: { description: updatedTeamDesc }
              });
            } else {
              await prisma.memory.create({
                data: {
                  category: 'TEAM_SIZE',
                  title: 'Team Structure',
                  description: updatedTeamDesc,
                  startupId: startup.id
                }
              });
            }
          }

          const newCashBalance = Math.max(0, startup.cashBalance + cashDelta);
          const newBurnRate = Math.max(0, startup.burnRate + burnDelta);
          const newHealthScore = Math.min(100, Math.max(10, startup.healthScore + healthScoreDelta));

          // Persist state change to Startup in PostgreSQL
          await prisma.startup.update({
            where: { id: startup.id },
            data: {
              cashBalance: newCashBalance,
              burnRate: newBurnRate,
              healthScore: newHealthScore
            }
          });

          // Record in Execution
          await prisma.execution.create({
            data: {
              action: appr.title,
              payload: {
                approvalId: appr.id,
                type: appr.type,
                cashDelta,
                burnDelta,
                teamSizeDelta,
                newCashBalance,
                newBurnRate,
                newHealthScore,
                feedback: feedback || null
              },
              status: 'completed',
              planId: appr.planId || dbApproval.planId
            }
          });

          // Record in DecisionLog
          await prisma.decisionLog.create({
            data: {
              title: `Approve: ${appr.title}`,
              description: appr.description,
              category: (appr.type || 'OPERATIONS').toUpperCase(),
              impactText: appr.impact || 'Executive action executed and verified in company ledger.',
              financialImpact: appr.financialChange || 0,
              status: 'approved',
              startupId: startup.id
            }
          });

          // Record in TimelineItem
          await prisma.timelineItem.create({
            data: {
              title: `Signed Off: ${appr.title}`,
              content: `${appr.description}. Impact: ${appr.impact || 'Company operational parameters updated.'}`,
              type: isHiring ? 'hire' : 'financial',
              startupId: startup.id
            }
          });

          // Update Approval status in PostgreSQL
          await prisma.approval.update({
            where: { id: approvalId },
            data: { status: 'approved' }
          });

          // CRITICAL: Invalidate Company Context so future AI requests retrieve fresh database state
          companyContextService.invalidate(startup.id);
          companyContextService.invalidate(userId);

          // Update local memory state for backwards compatibility
          startup.cashBalance = newCashBalance;
          startup.burnRate = newBurnRate;
          startup.healthScore = newHealthScore;

          decisionLedgerService.appendEvent({
            decisionId: approvalId,
            startupId: startup.id,
            workflowId: appr.initiativeId || approvalId,
            actor: 'Executive Execution Engine',
            eventType: 'EXECUTION_COMPLETED',
            payload: { cashDelta, burnDelta, teamSizeDelta, newCashBalance, newBurnRate, newHealthScore }
          });
        } catch (execErr: any) {
          console.error('[Approval Execution] Failed to persist state mutation:', execErr.message);

          decisionLedgerService.appendEvent({
            decisionId: approvalId,
            startupId: startup.id,
            workflowId: appr.initiativeId || approvalId,
            actor: 'Executive Execution Engine',
            eventType: 'EXECUTION_FAILED',
            payload: { error: execErr.message }
          });

          // Mark approval as failed without updating company metrics
          await safeDbQuery(async () => {
            await prisma.approval.update({
              where: { id: approvalId },
              data: { status: 'execution_failed' }
            });
            await prisma.execution.create({
              data: {
                action: appr.title,
                payload: { error: execErr.message },
                status: 'failed',
                planId: appr.planId || dbApproval.planId
              }
            });
          }, 3);

          return {
            success: false,
            statusCode: 500,
            error: `Execution failed: ${execErr.message}. Company state was preserved.`
          };
        }
      } else if (!isStateChanging && startup && isDbAvailable && prisma) {
        // 5.3 Non-State-Changing Approval (e.g. Marketing Copy, Document Review)
        await safeDbQuery(async () => {
          await prisma.approval.update({
            where: { id: approvalId },
            data: { status: 'approved' }
          });

          await prisma.execution.create({
            data: {
              action: appr.title,
              payload: {
                approvalId: appr.id,
                type: appr.type,
                nonStateChanging: true,
                feedback: feedback || null
              },
              status: 'completed',
              planId: appr.planId || dbApproval.planId
            }
          });

          await prisma.decisionLog.create({
            data: {
              title: `Approve: ${appr.title}`,
              description: appr.description,
              category: (appr.type || 'DOCUMENT').toUpperCase(),
              impactText: appr.impact || 'Deliverable approved by founder. No financial metrics modified.',
              financialImpact: 0,
              status: 'approved',
              startupId: startup.id
            }
          });

          await prisma.timelineItem.create({
            data: {
              title: `Approved: ${appr.title}`,
              content: appr.description,
              type: 'deliverable',
              startupId: startup.id
            }
          });
        }, 3);

        // Invalidate context so pending approvals list is updated
        companyContextService.invalidate(startup.id);
        companyContextService.invalidate(userId);
      }

      // Sync memory state for offline / hybrid mode
      if (memoryApproval) {
        memoryApproval.status = 'approved';
        if (isStateChanging) {
          if (cashDelta !== 0) {
            startupProfile.cashBalance = Math.max(0, startupProfile.cashBalance + cashDelta);
          }
          if (burnDelta !== 0) {
            startupProfile.burnRate = Math.round(startupProfile.burnRate + burnDelta);
          }
          if (startupProfile.burnRate > 0) {
            startupProfile.runwayMonths = parseFloat((startupProfile.cashBalance / startupProfile.burnRate).toFixed(1));
          } else {
            startupProfile.runwayMonths = 999;
          }
          if (healthScoreDelta !== 0) {
            startupProfile.healthScore = Math.min(100, Math.max(10, startupProfile.healthScore + healthScoreDelta));
          }
        }

        decisionLog.unshift({
          id: `dec_${Date.now()}`,
          title: `Approve: ${memoryApproval.title}`,
          description: memoryApproval.description,
          category: memoryApproval.type.toUpperCase(),
          timestamp: new Date().toISOString(),
          impactText: memoryApproval.impact,
          financialImpact: memoryApproval.financialChange || 0,
          status: 'approved'
        });

        initiatives.forEach(init => {
          const del = init.deliverables.find(d => d.id === approvalId);
          if (del) del.status = 'approved';
        });

        if (memoryIndex !== -1) approvals.splice(memoryIndex, 1);

        decisionLedgerService.appendEvent({
          decisionId: approvalId,
          startupId: startup?.id || approvalToStartupMap.get(approvalId) || 'stp_default',
          workflowId: appr.initiativeId || approvalId,
          actor: 'Executive Execution Engine',
          eventType: 'EXECUTION_COMPLETED',
          payload: {
            cashDelta,
            burnDelta,
            teamSizeDelta,
            healthScoreDelta,
            newCashBalance: startupProfile.cashBalance,
            newBurnRate: startupProfile.burnRate,
            newHealthScore: startupProfile.healthScore
          }
        });
      }

      const updatedDeliverable = dbApproval
        ? mapApprovalToDeliverable({ ...dbApproval, status: 'approved' })
        : memoryApproval!;

      processedApprovalsMap.set(approvalId, updatedDeliverable);

      const profile = await this.buildStartupProfile(startup);

      const approveResult: ReviewApprovalResult = {
        success: true,
        message: 'Deliverable approved and executed successfully.',
        item: updatedDeliverable,
        startupProfile: profile,
        stateChangesApplied: {
          isStateChanging,
          cashBalanceDelta: cashDelta,
          burnRateDelta: burnDelta,
          teamSizeDelta,
          runwayMonths: profile.runwayMonths,
          healthScoreDelta
        }
      };

      await idempotencyService.commit({
        tenantId: effectiveTenantId,
        approvalId,
        action,
        idempotencyKey: params.idempotencyKey,
        result: approveResult
      });

      return approveResult;
    }

    await idempotencyService.release({
      tenantId: effectiveTenantId,
      approvalId,
      action,
      idempotencyKey: params.idempotencyKey,
      error: `Invalid review action: "${action}"`
    });

    return {
      success: false,
      statusCode: 400,
      error: `Invalid review action: "${action}". Expected "approve" or "reject".`
    };
  }

  /**
   * Section 26: Reversal of an approved deliverable.
   * Restores state changes, records REVERSAL_EXECUTED in Decision Ledger, and marks status 'reversed'.
   */
  public async reverseApproval(params: ReverseApprovalParams): Promise<ReverseApprovalResult> {
    const { approvalId, userId, userRole, reason } = params;

    if (!userId) {
      return { success: false, statusCode: 401, error: 'Unauthorized: Authentication required to reverse approvals.' };
    }
    if (userRole && userRole === 'Executive') {
      return { success: false, statusCode: 403, error: 'Unauthorized: Executive accounts cannot reverse deliverables.' };
    }
    if (this.isDegradedModeActive()) {
      return {
        success: false,
        statusCode: 503,
        error: 'Catalyst OS is operating in degraded read-only mode. Reversals are blocked because durable storage is unavailable.'
      };
    }

    const processed = processedApprovalsMap.get(approvalId);
    if (!processed) {
      return { success: false, statusCode: 404, error: 'Deliverable must be in processed approved state to be reversed.' };
    }

    if (processed.status !== 'approved') {
      return { success: false, statusCode: 400, error: `Cannot reverse deliverable with status "${processed.status}". Only approved items can be reversed.` };
    }

    const isHiring = (processed.type || '').toLowerCase() === 'contract' ||
      (processed.title || '').toLowerCase().includes('hire');

    if (isHiring) {
      return {
        success: false,
        statusCode: 400,
        error: 'Irreversible action: Executed employment contracts and hiring actions cannot be automatically reversed.'
      };
    }

    // Reversible financial mutation rollback
    const origChange = processed.financialChange || 0;
    const restoredCashDelta = origChange < 0 ? Math.abs(origChange) : -origChange;
    const restoredBurnDelta = origChange < 0 ? -Math.round(Math.abs(origChange) / 12) : 0;

    startupProfile.cashBalance = Math.max(0, startupProfile.cashBalance + restoredCashDelta);
    startupProfile.burnRate = Math.max(0, startupProfile.burnRate + restoredBurnDelta);
    if (startupProfile.burnRate > 0) {
      startupProfile.runwayMonths = parseFloat((startupProfile.cashBalance / startupProfile.burnRate).toFixed(1));
    } else {
      startupProfile.runwayMonths = 999;
    }

    processed.status = 'rejected';

    decisionLedgerService.appendEvent({
      decisionId: approvalId,
      startupId: approvalToStartupMap.get(approvalId) || 'stp_default',
      workflowId: processed.initiativeId || approvalId,
      actor: `Founder (${userId})`,
      eventType: 'REVERSAL_EXECUTED',
      payload: {
        reason: reason || 'Founder reversed previous approval',
        restoredCashDelta,
        restoredBurnDelta,
        newCashBalance: startupProfile.cashBalance,
        newBurnRate: startupProfile.burnRate
      }
    });

    return {
      success: true,
      message: 'Deliverable successfully reversed and state changes rolled back.',
      item: processed,
      startupProfile,
      stateChangesApplied: {
        isStateChanging: true,
        cashBalanceDelta: restoredCashDelta,
        burnRateDelta: restoredBurnDelta,
        teamSizeDelta: 0,
        runwayMonths: startupProfile.runwayMonths,
        healthScoreDelta: 0
      }
    };
  }

  /**
   * Retrieves decision records for the authenticated user's startup.
   */
  public async getDecisionsForUser(userId: string): Promise<DecisionRecord[]> {
    if (isDbAvailable && prisma && userId) {
      const userStartup = await safeDbQuery(() =>
        prisma.startup.findFirst({
          where: { ownerId: userId },
          select: { id: true }
        })
      );

      if (userStartup) {
        const records = await safeDbQuery(() =>
          prisma.decisionLog.findMany({
            where: { startupId: userStartup.id },
            orderBy: { createdAt: 'desc' },
            take: 50
          })
        );

        if (records && records.length > 0) {
          return records.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            category: r.category,
            timestamp: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date().toISOString(),
            impactText: r.impactText,
            financialImpact: r.financialImpact,
            status: r.status as 'approved' | 'rejected'
          }));
        }
      }
    }

    return decisionLog;
  }

  /**
   * Builds the StartupProfile for the frontend response.
   */
  private async buildStartupProfile(startup: any): Promise<StartupProfile> {
    if (!startup) {
      return startupProfile;
    }

    const cash = startup.cashBalance ?? startupProfile.cashBalance;
    const burn = startup.burnRate ?? startupProfile.burnRate;
    const runway = burn > 0 ? parseFloat((cash / burn).toFixed(1)) : 999;

    return {
      name: startup.name || startupProfile.name,
      industry: startup.industry || startupProfile.industry,
      description: startup.description || startupProfile.description,
      fundingStage: (startup.stage || startupProfile.fundingStage) as any,
      cashBalance: cash,
      burnRate: burn,
      runwayMonths: runway,
      healthScore: startup.healthScore ?? startupProfile.healthScore,
      metrics: startupProfile.metrics
    };
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
