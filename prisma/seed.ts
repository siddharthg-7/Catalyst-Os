import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records safely (order of deletion matters due to FKs)
  console.log('🧹 Cleaning existing records...');
  await prisma.execution.deleteMany();
  await prisma.memory.deleteMany();
  await prisma.decisionLog.deleteMany();
  await prisma.timelineItem.deleteMany();
  await prisma.healthScore.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.task.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.command.deleteMany();
  await prisma.executiveAgent.deleteMany();
  await prisma.embedding.deleteMany();
  await prisma.knowledgeChunk.deleteMany();
  await prisma.startupDocument.deleteMany();
  await prisma.startup.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleaned.');

  // 2. Create Users
  console.log('👥 Seeding users...');
  const passwordHash = bcrypt.hashSync('password123', 10);

  const founder = await prisma.user.create({
    data: {
      id: 'usr_founder',
      email: 'founder@founder.os',
      name: 'Sophia Vance',
      role: 'Founder',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const executive = await prisma.user.create({
    data: {
      id: 'usr_executive',
      email: 'exec@founder.os',
      name: 'Marcus Sterling',
      role: 'Executive',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      id: 'usr_admin',
      email: 'admin@founder.os',
      name: 'CatalystOS Admin',
      role: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('✅ Users seeded.');

  // 3. Create Startup
  console.log('🏢 Seeding startup profile...');
  const startup = await prisma.startup.create({
    data: {
      id: 'st_catalystos',
      name: 'CatalystOS Startup',
      industry: 'B2B SaaS / Developer Tools',
      description: 'Enterprise-grade automated workflow orchestration platform for hybrid cloud environments, optimizing resource usage and cloud spend.',
      fundingStage: 'Pre-Seed',
      cashBalance: 245000,
      burnRate: 18500,
      healthScore: 78,
      ownerId: founder.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('✅ Startup profile seeded.');

  // 4. Create Executive Agents
  console.log('🤖 Seeding executive agents...');
  const agentsData = [
    {
      id: 'ceo',
      role: 'CEO',
      name: 'Sophia Vance',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      status: 'idle',
      currentTask: null,
    },
    {
      id: 'finance',
      role: 'Finance',
      name: 'Marcus Sterling',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      status: 'idle',
      currentTask: null,
    },
    {
      id: 'talent',
      role: 'Talent',
      name: 'Evelyn Brooks',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      status: 'idle',
      currentTask: null,
    },
    {
      id: 'growth',
      role: 'Growth',
      name: 'Dax Ramirez',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      status: 'idle',
      currentTask: null,
    },
    {
      id: 'operations',
      role: 'Operations',
      name: 'Kaelen Finch',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      status: 'idle',
      currentTask: null,
    },
    {
      id: 'legal',
      role: 'Legal',
      name: 'Helena Vance, Esq.',
      avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150',
      status: 'idle',
      currentTask: null,
    },
    {
      id: 'conflict',
      role: 'ConflictResolver',
      name: 'Pax-9 Synthesis',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      status: 'idle',
      currentTask: null,
    },
    {
      id: 'approval',
      role: 'ApprovalManager',
      name: 'Loom-V Director',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      status: 'idle',
      currentTask: null,
    },
  ];

  for (const agent of agentsData) {
    await prisma.executiveAgent.create({
      data: {
        ...agent,
        startupId: startup.id,
      },
    });
  }
  console.log('✅ Executive agents seeded.');

  // 5. Seeding default startup documents (Knowledge files)
  console.log('📁 Seeding knowledge files...');
  const doc = await prisma.startupDocument.create({
    data: {
      id: 'doc_1',
      name: 'CatalystOS_Pitch_Deck.md',
      type: 'pitch_deck',
      size: '14 KB',
      summary: 'Core fundraising presentation detailing CatalystOS Cloud Orchestrator, market size ($22B), product roadmap, and founder experience.',
      insights: [
        'Targeting $1.5M Seed round at $10M pre-money valuation.',
        'Saves cloud costs by up to 34% using predictive scheduling algorithms.',
        'Differentiator: True autonomous scheduling with multi-cloud failover support.',
      ],
      startupId: startup.id,
    },
  });

  const chunk = await prisma.knowledgeChunk.create({
    data: {
      id: 'chunk_1',
      content: 'CatalystOS Startup is an enterprise-grade automated workflow orchestration platform for hybrid cloud environments, optimizing resource usage and cloud spend.',
      documentId: doc.id,
    },
  });

  await prisma.embedding.create({
    data: {
      id: 'emb_1',
      vector: [0.12, -0.43, 0.88, 0.15, -0.09, 0.55], // Sample vector embedding
      chunkId: chunk.id,
    },
  });

  console.log('✅ Knowledge files seeded.');

  // 6. Create standard plans
  console.log('📋 Seeding plans...');
  const plan = await prisma.plan.create({
    data: {
      id: 'plan_1',
      title: 'Founding Engineer Talent Acquisition Plan',
      description: 'Acquisition and hiring plan for a lead engineering resource.',
      status: 'completed',
      startupId: startup.id,
    },
  });

  const plan2 = await prisma.plan.create({
    data: {
      id: 'plan_2',
      title: 'Enterprise Pilot Program outreach',
      description: 'Outreach and compliance mapping for trial testers.',
      status: 'planning',
      startupId: startup.id,
    },
  });

  // 7. Seeding Tasks
  console.log('📝 Seeding tasks...');
  await prisma.task.createMany({
    data: [
      {
        id: 't1',
        title: 'Define job descriptions and equity allocation range',
        assignedTo: 'Talent',
        status: 'completed',
        result: 'Structured 1.2% options pool and $140k base salary.',
        planId: plan.id,
      },
      {
        id: 't2',
        title: 'Audit budget impact and cash flow models',
        assignedTo: 'Finance',
        status: 'completed',
        result: 'Verified burn rate increase of $11.6k/mo.',
        planId: plan.id,
      },
      {
        id: 't3',
        title: 'Draft standard IP assignment and employment agreements',
        assignedTo: 'Legal',
        status: 'completed',
        result: 'Drafted complete Employee Agreement with proprietary information protection.',
        planId: plan.id,
      },
      {
        id: 't4',
        title: 'Target segment lead scoring and landing page messaging',
        assignedTo: 'Growth',
        status: 'pending',
        planId: plan2.id,
      },
      {
        id: 't5',
        title: 'Draft enterprise service levels (SLAs) and trial contracts',
        assignedTo: 'Legal',
        status: 'pending',
        planId: plan2.id,
      },
      {
        id: 't6',
        title: 'Model pilot pricing economics and cloud support cost margins',
        assignedTo: 'Finance',
        status: 'pending',
        planId: plan2.id,
      },
    ],
  });

  // 8. Seeding approvals deliverables
  console.log('📬 Seeding deliverables and approvals queue...');
  await prisma.approval.create({
    data: {
      id: 'del_2',
      title: 'Q3 Enterprise Pilot Terms & SLA Draft',
      description: 'Enterprise agreement template for upcoming pilots with $15,000 pilot fee structures, 99.9% uptime commitments, and data privacy clauses.',
      type: 'contract',
      status: 'pending_review',
      content: '# CATALYSTOS PILOT AGREEMENT\n\nThis pilot program contract sets out the trial terms with mid-market testers.\n\n### Key Terms:\n- **Pilot Duration:** 90 Days\n- **Service Fee:** $15,000 USD flat fee\n- **Uptime Commitment:** 99.9% availability, standard support desk SLA.\n- **Data Privacy:** Full SOC-2 compliance compliance guarantees included.\n\n### Business Outcome:\n- Unlocks pilot pipeline value, validates SaaS pricing framework.',
      impact: 'Unlocks +$15,000 pilot revenue, increases growth metrics (+10 points) and customer confidence.',
      financialChange: 15000,
      metricChanges: { growthRate: 10, financialHealth: 6, operationsEfficiency: -2 },
      planId: plan2.id,
    },
  });

  // 9. Seeding decision log
  console.log('🪵 Seeding decision logs...');
  await prisma.decisionLog.create({
    data: {
      id: 'dec_1',
      title: 'Deploy Founding Engineer Offer Package',
      description: 'Officially extended the vetted Lead Platform Architect offer with compromise compensation.',
      category: 'Talent Acquisition',
      impactText: 'Increased company execution capacity +18 points, adjusted runway.',
      financialImpact: -11000,
      status: 'approved',
      startupId: startup.id,
      createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('🚀 Seeding finished successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
