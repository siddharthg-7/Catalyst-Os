import 'dotenv/config';
import { prisma } from '../services/dbService';
import { knowledgeFiles, approvals, decisionLog, initiatives } from '../state';

/**
 * Safe Development Reset Mechanism (Sections 1 & 2 of PROMPT.MD)
 * Purges all test/demo user and startup data so a new user can sign up with a clean workspace.
 * Only executes when NODE_ENV !== 'production'.
 */
export async function performDevReset(): Promise<{ success: boolean; details: Record<string, number> }> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development reset is strictly forbidden in production mode.');
  }

  console.log('[DevReset] Initiating safe development data purge...');

  const counts: Record<string, number> = {};

  try {
    // 1. Operational & notification records
    const notifs = await prisma.notification.deleteMany({});
    counts.notifications = notifs.count;

    const decisions = await prisma.decisionLog.deleteMany({});
    counts.decisions = decisions.count;

    const timeline = await prisma.timelineItem.deleteMany({});
    counts.timelineItems = timeline.count;

    const health = await prisma.healthScore.deleteMany({});
    counts.healthScores = health.count;

    // 2. Plans, executions, tasks, approvals
    const executions = await prisma.execution.deleteMany({});
    counts.executions = executions.count;

    const approvalsRes = await prisma.approval.deleteMany({});
    counts.approvals = approvalsRes.count;

    const tasks = await prisma.task.deleteMany({});
    counts.tasks = tasks.count;

    const plans = await prisma.plan.deleteMany({});
    counts.plans = plans.count;

    // 3. Commands
    const commands = await prisma.command.deleteMany({});
    counts.commands = commands.count;

    // 4. Knowledge chunks & embeddings
    const embeddings = await prisma.embedding.deleteMany({});
    counts.embeddings = embeddings.count;

    const chunks = await prisma.knowledgeChunk.deleteMany({});
    counts.knowledgeChunks = chunks.count;

    const docs = await prisma.startupDocument.deleteMany({});
    counts.startupDocuments = docs.count;

    // 5. Agents & memory
    const agents = await prisma.executiveAgent.deleteMany({});
    counts.executiveAgents = agents.count;

    const memories = await prisma.memory.deleteMany({});
    counts.memories = memories.count;

    // 6. Startups & Users
    const startups = await prisma.startup.deleteMany({});
    counts.startups = startups.count;

    const usersRes = await prisma.user.deleteMany({});
    counts.users = usersRes.count;

    // Clear legacy memory caches
    knowledgeFiles.length = 0;
    approvals.length = 0;
    decisionLog.length = 0;
    initiatives.length = 0;

    console.log('[DevReset] Safe data purge completed successfully:', counts);
    return { success: true, details: counts };
  } catch (error: any) {
    console.error('[DevReset] Purge error:', error.message);
    throw error;
  }
}

// Auto-run if executed as CLI entry point
const isDirectCli = process.argv[1]?.includes('devReset');
if (isDirectCli) {
  performDevReset()
    .then((res) => {
      console.log('✅ Dev reset successful:', JSON.stringify(res.details, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Dev reset failed:', err.message);
      process.exit(1);
    });
}
