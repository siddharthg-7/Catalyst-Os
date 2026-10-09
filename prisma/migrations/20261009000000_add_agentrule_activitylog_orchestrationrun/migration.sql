-- Round 2 audit: the AgentRule, ActivityLog and OrchestrationRun models were
-- added to schema.prisma and generated into the client, but the tables were
-- never created. The client guards therefore became truthy and every write
-- failed (3x via safeDbQuery retry). Purely additive: 3 tables + 4 indexes.

-- CreateTable
CREATE TABLE "AgentRule" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "agentRole" TEXT NOT NULL,
    "rules" TEXT[],
    "spendLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationRun" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "directive" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dagPlan" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRule_startupId_agentRole_idx" ON "AgentRule"("startupId", "agentRole");

-- CreateIndex
CREATE INDEX "OrchestrationRun_startupId_status_idx" ON "OrchestrationRun"("startupId", "status");

-- CreateIndex
CREATE INDEX "ActivityLog_startupId_userId_idx" ON "ActivityLog"("startupId", "userId");

-- CreateIndex
CREATE INDEX "ActivityLog_startupId_action_idx" ON "ActivityLog"("startupId", "action");

