/**
 * CatalystOS — Phase D Test Suite: Employee Review -> Founder Approval Loop
 *
 * Verifies:
 * - D1: Employee Submission
 *   - Employee clicks "Submit for Founder Approval"
 *   - Reuses existing Approval model (NO duplicate approval model)
 *   - Formulates executive summary, impact, recommendation, and AI assistance attribution
 * - D2: Founder Approval Experience
 *   - Founder sees APPROVAL REQUIRED with Task, Prepared By, AI Assistance, Summary, Impact, Recommendation
 *   - Integrates existing Approval, Approval Queue, DecisionLog, Financial safety engine
 * - D3: Request Changes Collaboration Loop
 *   - Founder directive: "Reduce hiring budget and resubmit."
 *   - Loop: Founder -> Request Changes -> Employee -> AI Assistant (Echo) -> Revision -> Founder
 *   - Reversible holding state (zero unauthorized financial execution until approved)
 *   - Append-only tamper-evident decision ledger records FOUNDER_CHANGES_REQUESTED
 *   - Employee resubmission resets approval review lifecycle for final Founder sign-off
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma, safeDbQuery } from '../backend/services/dbService';
import { ensureMembership, resolveMembership } from '../backend/services/membershipService';
import {
  decomposeCommandToPlan,
  listTasksForUser,
  updateTaskForUser,
  assistEmployeeOnTask,
  TaskDelegationError
} from '../backend/services/taskDelegationService';
import {
  approvalService,
  processedApprovalsMap
} from '../backend/services/approvalService';
import { decisionLedgerService } from '../backend/services/decisionLedgerService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${title} - ${details || 'Assertion failed'}`);
    failed++;
  }
}

const stamp = Date.now();
const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
const createdUserIds: string[] = [];
const createdStartupIds: string[] = [];

async function main() {
  console.log('\n===============================================================');
  console.log('  CatalystOS Phase D: Employee Review -> Founder Approval Loop  ');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // Setup: Create Company, Founder, and HR Employee
    // -------------------------------------------------------------------------
    const startupId = `stp_phased_${stamp}`;
    const founderId = `usr_founder_${stamp}`;
    const hrUserId = `usr_hr_${stamp}`;

    createdStartupIds.push(startupId);
    createdUserIds.push(founderId, hrUserId);

    const passwordHash = await hashPassword('PhaseD_Secret_123!');

    await safeDbQuery(async () => {
      await (prisma as any).user.createMany({
        data: [
          {
            id: founderId,
            email: `founder_phased_${stamp}@robotics.corp`,
            name: 'Sarah Founder',
            role: 'FOUNDER',
            passwordHash
          },
          {
            id: hrUserId,
            email: `hr_phased_${stamp}@robotics.corp`,
            name: 'Alex HR Lead',
            role: 'EMPLOYEE',
            passwordHash
          }
        ]
      });

      await (prisma as any).startup.create({
        data: {
          id: startupId,
          name: `Phase D Robotics Corp ${stamp}`,
          industry: 'Robotics & AI',
          description: 'Autonomous fulfillment logistics.',
          cashBalance: 1200000,
          burnRate: 60000,
          healthScore: 85,
          ownerId: founderId
        }
      });
    });

    await ensureMembership(founderId, startupId, 'FOUNDER');
    await ensureMembership(hrUserId, startupId, 'HR');

    console.log('1. FOUNDER COMMAND -> PLAN DECOMPOSITION -> TASK DELEGATION');

    // Founder issues hiring command
    const decomposed = await decomposeCommandToPlan({
      startupId,
      command: 'Build hiring plan for 2 senior robotics engineers with salary bands and screening rubric'
    });

    assert(decomposed.tasks.length > 0, 'Plan decomposed into tasks successfully');
    
    // Find the HR/TALENT task
    const hrTask = decomposed.tasks.find(t => t.department === 'TALENT' || t.agent === 'Echo');
    assert(Boolean(hrTask), 'Generated HR/TALENT task owned by Echo and HR role');
    const taskId = hrTask!.id;

    // -------------------------------------------------------------------------
    // Phase D1 — Employee Submission
    // -------------------------------------------------------------------------
    console.log('\n2. PHASE D1 — EMPLOYEE SUBMISSION ("Submit for Founder Approval")');

    // HR Employee collaborates with Echo and prepares draft
    const initialDraft = `# Hiring Plan — Senior Robotics Engineers
## Objectives
Recruit 2 Principal Autonomous Navigation Engineers within 45 days.

## Budget & Compensation
- Base Salary: $195,000 per engineer ($390,000 total annualized)
- Signing Bonus: $25,000 each
- Equity: 0.35% ISOs each

## Technical Evaluation Rubric
1. Real-time SLAM & ROS2 architecture benchmark.
2. Production safety edge cases and watchdog fault recovery.`;

    const submitResult = await updateTaskForUser({
      userId: hrUserId,
      taskId,
      status: 'submitted',
      result: initialDraft
    });

    assert(submitResult.status === 'submitted', 'Task status transitioned to "submitted"');

    // Verify existing Approval model was reused (NO duplicate approval table)
    const expectedApprovalId = `appr_task_${taskId}`;
    const approvalRow: any = await safeDbQuery(() =>
      (prisma as any).approval.findUnique({
        where: { id: expectedApprovalId }
      })
    );

    assert(Boolean(approvalRow), 'Reused existing Prisma Approval model (zero duplicate models created)');
    assert(approvalRow.status === 'pending' || approvalRow.status === 'pending_review', 'Approval record status is pending');

    const meta = typeof approvalRow.metricChanges === 'string'
      ? JSON.parse(approvalRow.metricChanges)
      : (approvalRow.metricChanges || {});
    assert(meta.preparedBy === 'HR Employee', 'Approval stores preparedBy: "HR Employee"');
    assert(meta.aiAssistance === 'Echo', 'Approval stores aiAssistance: "Echo"');
    assert(typeof meta.summary === 'string' && meta.summary.length > 0, 'Approval stores structured executive summary');
    assert(typeof meta.impact === 'string' && meta.impact.length > 0, 'Approval stores executive impact assessment');
    assert(typeof meta.recommendation === 'string' && meta.recommendation.length > 0, 'Approval stores recommendation');

    // -------------------------------------------------------------------------
    // Phase D2 — Founder Approval Experience
    // -------------------------------------------------------------------------
    console.log('\n3. PHASE D2 — FOUNDER APPROVAL EXPERIENCE (Structured Review Presentation)');

    const founderApprovals = await approvalService.getApprovalsForUser(founderId);
    const reviewItem = founderApprovals.find(a => a.id === expectedApprovalId);

    assert(Boolean(reviewItem), 'Founder approval queue contains submitted deliverable');
    assert(
      reviewItem!.title === hrTask!.title ||
      reviewItem!.title.toLowerCase().includes('hiring') ||
      reviewItem!.title.toLowerCase().includes('recruit') ||
      reviewItem!.title.toLowerCase().includes('requirement'),
      'Deliverable matches task title'
    );
    assert(reviewItem!.preparedBy === 'HR Employee', 'Founder sees "Prepared by: HR Employee"');
    assert(reviewItem!.aiAssistance === 'Echo', 'Founder sees "AI assistance: Echo"');
    assert(Boolean(reviewItem!.summary), 'Founder sees executive "Summary"');
    assert(Boolean(reviewItem!.impact), 'Founder sees strategic "Impact"');
    assert(Boolean(reviewItem!.recommendation), 'Founder sees clear "Recommendation"');

    // -------------------------------------------------------------------------
    // Phase D3 — Request Changes Collaboration Loop
    // -------------------------------------------------------------------------
    console.log('\n4. PHASE D3 — FOUNDER REQUESTS CHANGES ("Reduce hiring budget and resubmit.")');

    const founderDirective = 'Reduce hiring budget and resubmit.';

    const changeReqResult = await approvalService.reviewApproval({
      approvalId: expectedApprovalId,
      action: 'request_changes',
      feedback: founderDirective,
      userId: founderId
    });

    assert(changeReqResult.success === true, 'reviewApproval returned success: true');
    assert(changeReqResult.item?.status === 'changes_requested', 'reviewApproval returned item with status: "changes_requested"');

    // Verify task reverted to in_progress with founder directive
    const updatedTaskRow: any = await safeDbQuery(() =>
      (prisma as any).task.findUnique({ where: { id: taskId } })
    );
    assert(
      updatedTaskRow.status === 'in_progress' || updatedTaskRow.status === 'changes_requested',
      'Task unlocked back to in_progress / changes_requested for employee revision'
    );
    assert(
      updatedTaskRow.result.includes('[FOUNDER_DIRECTIVE]: Reduce hiring budget and resubmit.'),
      'Task result captures founder directive'
    );

    // Verify Tamper-Evident Ledger logged FOUNDER_CHANGES_REQUESTED
    const ledgerEvents = decisionLedgerService.getEventsForDecision(expectedApprovalId);
    const changeEvent = ledgerEvents.find(e => e.eventType === 'FOUNDER_CHANGES_REQUESTED');
    assert(Boolean(changeEvent), 'Cryptographic decision ledger logged FOUNDER_CHANGES_REQUESTED event');
    assert(
      changeEvent?.payload?.feedback === founderDirective,
      'Decision ledger captured exact founder feedback directive'
    );

    // Verify DecisionLog has record with zero financial mutations (financial safety engine holds changes)
    const decisionRecords: any = await safeDbQuery(() =>
      (prisma as any).decisionLog.findMany({
        where: { startupId }
      })
    );
    const changeLog = decisionRecords.find((d: any) => d.status === 'changes_requested');
    assert(Boolean(changeLog), 'DecisionLog recorded changes_requested entry');
    assert(changeLog?.financialImpact === 0, 'Financial safety engine held financial mutations at 0');

    // -------------------------------------------------------------------------
    // Phase D3.2 — Employee + AI Assistant (Echo) Revision
    // -------------------------------------------------------------------------
    console.log('\n5. PHASE D3.2 — EMPLOYEE & ECHO REVISION LOOP');

    // Employee checks task list and sees change request
    const hrTaskList = await listTasksForUser(hrUserId);
    const revisedTask = hrTaskList.find(t => t.id === taskId);
    assert(revisedTask?.changesRequested === true, 'Employee inbox flags changesRequested: true');
    assert(
      revisedTask?.founderFeedback?.includes('Reduce hiring budget'),
      'Employee inbox exposes founder directive feedback'
    );

    // Employee asks Echo for help adjusting the hiring plan according to the founder's directive
    const echoAssistance = await assistEmployeeOnTask({
      userId: hrUserId,
      taskId,
      question: 'Echo, the founder requested we reduce the hiring budget. How should we revise the compensation and base salary?'
    });

    assert(Boolean(echoAssistance.reply), 'Echo co-pilot provides intelligent revision response');
    assert(echoAssistance.agentName === 'Echo', 'AI assistance attributed to Echo');
    assert(
      echoAssistance.reply.toLowerCase().includes('budget') ||
      echoAssistance.reply.toLowerCase().includes('salary') ||
      echoAssistance.reply.toLowerCase().includes('compensation') ||
      echoAssistance.reply.toLowerCase().includes('directive'),
      'Echo acknowledges budget constraint and provides tailored adjustments'
    );

    // Employee updates draft with revised numbers and resubmits for founder approval
    const revisedDraft = `# Hiring Plan — Senior Robotics Engineers (REVISED PER FOUNDER DIRECTIVE)
## Objectives
Recruit 2 Principal Autonomous Navigation Engineers with optimized capital efficiency.

## Revised Budget & Compensation
- Base Salary: $165,000 per engineer ($330,000 total annualized — reduced by $60,000/yr)
- Performance Milestones: Equity weighted (0.45% ISOs) instead of high cash bonus.
- Signing Bonus: Removed ($0) to preserve immediate liquid burn.

## Technical Evaluation Rubric
1. Real-time SLAM & ROS2 architecture benchmark.
2. Production safety edge cases and watchdog fault recovery.`;

    const resubmitResult = await updateTaskForUser({
      userId: hrUserId,
      taskId,
      status: 'submitted',
      result: revisedDraft
    });

    assert(resubmitResult.status === 'submitted', 'Employee successfully resubmitted revised deliverable');

    // Verify approval record is back to pending and contains revised summary
    const resubmittedApproval: any = await safeDbQuery(() =>
      (prisma as any).approval.findUnique({ where: { id: expectedApprovalId } })
    );
    assert(resubmittedApproval.status === 'pending' || resubmittedApproval.status === 'pending_review', 'Approval reset to "pending" for founder review');
    assert(
      resubmittedApproval.metricChanges?.summary?.includes('REVISED') ||
      resubmittedApproval.content?.includes('REVISED'),
      'Approval metadata reflects revised deliverable content'
    );

    // -------------------------------------------------------------------------
    // Phase D3.3 — Founder Final Approval
    // -------------------------------------------------------------------------
    console.log('\n6. PHASE D3.3 — FOUNDER FINAL APPROVAL & FINANCIAL ENGINE EXECUTION');

    const finalApprovalResult = await approvalService.reviewApproval({
      approvalId: expectedApprovalId,
      action: 'approve',
      userId: founderId
    });

    assert(finalApprovalResult.success === true, 'finalApprovalResult returned success: true');
    assert(finalApprovalResult.item?.status === 'approved', 'Founder successfully approved the revised hiring plan');

    // Verify approval in DB is approved
    const finalApprovalRow: any = await safeDbQuery(() =>
      (prisma as any).approval.findUnique({ where: { id: expectedApprovalId } })
    );
    assert(finalApprovalRow.status === 'approved', 'DB Approval marked as approved');

    // Verify Task in DB is approved
    const finalTaskRow: any = await safeDbQuery(() =>
      (prisma as any).task.findUnique({ where: { id: taskId } })
    );
    assert(finalTaskRow.status === 'approved', 'DB Task marked as approved');

    // Verify DecisionLog has the final approved record
    const finalDecisions: any = await safeDbQuery(() =>
      (prisma as any).decisionLog.findMany({ where: { startupId } })
    );
    const approvedLog = finalDecisions.find((d: any) => d.status === 'approved');
    assert(Boolean(approvedLog), 'DecisionLog contains final approved strategic decision');

    console.log('\n===============================================================');
    console.log(`  Phase D Tests Completed: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    // Cleanup test artifacts
    await safeDbQuery(async () => {
      for (const sId of createdStartupIds) {
        await (prisma as any).approval.deleteMany({ where: { plan: { startupId: sId } } }).catch(() => {});
        await (prisma as any).task.deleteMany({ where: { plan: { startupId: sId } } }).catch(() => {});
        await (prisma as any).plan.deleteMany({ where: { startupId: sId } }).catch(() => {});
        await (prisma as any).membership.deleteMany({ where: { startupId: sId } }).catch(() => {});
        await (prisma as any).decisionLog.deleteMany({ where: { startupId: sId } }).catch(() => {});
        await (prisma as any).startup.deleteMany({ where: { id: sId } }).catch(() => {});
      }
      for (const uId of createdUserIds) {
        await (prisma as any).user.deleteMany({ where: { id: uId } }).catch(() => {});
      }
    });
  }
}

main();
