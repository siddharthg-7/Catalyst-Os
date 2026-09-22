import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, safeDbQuery } from '../services/dbService';
import vaultService from '../services/vaultService';
import { extractTextFromFile } from '../services/documentParser';
import { ingestDocument, performHybridSearch, buildContext } from '../services/ragEngine';
import { 
  startupProfile, 
  updateStartupProfile, 
  agentsList, 
  initiatives, 
  approvals, 
  decisionLog, 
  knowledgeFiles,
  setAgentStatuses,
  resetAgentStatuses,
  isDbAvailable
} from '../state';
import { ai, runMultiAgentCollaboration } from '../services/geminiService';
import { Initiative, Deliverable, UserRole } from '../../src/types';
import { 
  authenticateJWT, 
  requireRole, 
  AuthenticatedRequest, 
  JWT_SECRET 
} from '../services/neonAuthMiddleware';
import jwt from 'jsonwebtoken';
import agentsRouter from '../agents/controller';
import { markdownRagService } from '../services/markdownRagService';
import { 
  uploadToS3, 
  isS3Configured, 
  checkS3Health, 
  getPresignedDownloadUrl 
} from '../services/s3Service';
import { orchestrationService } from '../services/orchestrationService';
import { workspaceService, DEFAULT_EXECUTIVE_ROLES } from '../services/workspaceService';
import { performDevReset } from '../scripts/devReset';

const router = Router();

// Public chatbot endpoint. It is grounded exclusively in local knowledge.md files.
router.post('/chat', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const query = [...messages].reverse().find(message => message?.role === 'user')?.content;
  if (typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ error: 'A non-empty user message is required.' });
    return;
  }
  try {
    res.json(await markdownRagService.answer(query.trim(), req.body?.language || 'auto'));
  } catch (error) {
    console.error('[Markdown RAG] Chat request failed:', error);
    res.status(500).json({ error: 'The knowledge base could not be queried.' });
  }
});

router.post('/chat/stream', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const query = [...messages].reverse().find(message => message?.role === 'user')?.content;
  if (typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ error: 'A non-empty user message is required.' });
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  try {
    const result = await markdownRagService.answer(query.trim(), req.body?.language || 'auto');
    for (const token of result.reply.match(/\S+\s*/g) || []) {
      res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ sources: result.sources, debug: result.debug })}\n\n`);
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('[Markdown RAG] Streaming request failed:', error);
    res.write(`data: ${JSON.stringify({ text: 'The knowledge base could not be queried.' })}\n\n`);
    res.write('data: [DONE]\n\n');
  } finally {
    res.end();
  }
});

// ============================================================================
// NATIVE NEON POSTGRESQL AUTHENTICATION
// Secure database authentication with bcrypt password hashing and JWT sessions
// ============================================================================

// POST register/signup new user
router.post('/auth/signup', async (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || cleanEmail.split('@')[0] || 'Founder').trim();
  const allowedRoles: UserRole[] = ['Founder', 'Executive', 'Investor', 'Admin'];
  const userRole: UserRole = (role && allowedRoles.includes(role)) ? role : 'Founder';

  try {
    const existing = await safeDbQuery(() => prisma.user.findUnique({
      where: { email: cleanEmail }
    }));

    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const newUser: any = await safeDbQuery(() => (prisma as any).user.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        role: userRole,
        passwordHash
      } as any
    }));

    const token = jwt.sign(
      { sub: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name || 'Founder',
        role: newUser.role as UserRole
      }
    });
  } catch (err: any) {
    console.error('[Auth API] Signup error:', err.message);
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

// POST signin/login existing user
router.post('/auth/signin', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user: any = await safeDbQuery(() => prisma.user.findUnique({
      where: { email: cleanEmail }
    }));

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.passwordHash) {
      const isValid = bcrypt.compareSync(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
    } else {
      // If legacy or demo account without password, upgrade password
      const newHash = bcrypt.hashSync(password, 10);
      await safeDbQuery(() => (prisma as any).user.update({
        where: { id: user.id },
        data: { passwordHash: newHash } as any
      }));
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || 'Founder',
        role: user.role as UserRole
      }
    });
  } catch (err: any) {
    console.error('[Auth API] Signin error:', err.message);
    res.status(500).json({ error: `Authentication failed: ${err.message}` });
  }
});

// GET current authenticated user profile
router.get('/auth/me', authenticateJWT, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// POST logout
router.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Mount specialty agent controllers
router.use('/', agentsRouter);

// ============================================================================
// DEVELOPMENT RESET ENDPOINT (Sections 1 & 2 of PROMPT.MD)
// ============================================================================
router.post('/dev/reset', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Development reset is strictly forbidden in production mode.' });
    return;
  }
  try {
    const result = await performDevReset();
    res.json(result);
  } catch (err: any) {
    console.error('[DevReset API] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// WORKSPACE & CANONICAL STARTUP CONTEXT (Sections 3, 4, 5, 8, 9, 34 & 35)
// ============================================================================

// POST complete startup onboarding
router.post('/startup/onboarding', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required for onboarding.' });
    return;
  }

  try {
    const canonicalContext = await workspaceService.saveOnboardingData(userId, req.body);
    const profile = {
      id: canonicalContext?.startupId,
      name: canonicalContext?.startup.name,
      industry: canonicalContext?.startup.industry,
      description: canonicalContext?.startup.description,
      fundingStage: canonicalContext?.startup.stage,
      cashBalance: canonicalContext?.financials.cashBalance,
      burnRate: canonicalContext?.financials.monthlyBurn,
      runwayMonths: canonicalContext?.financials.runwayMonths,
      healthScore: startupProfile.healthScore || 80,
      metrics: startupProfile.metrics,
      targetIcp: canonicalContext?.business.targetIcp,
      primaryProduct: canonicalContext?.business.primaryProduct,
      goals: canonicalContext?.goals,
      priorities: canonicalContext?.priorities,
      onboarded: true
    };
    res.json({ success: true, context: canonicalContext, startup: profile });
  } catch (err: any) {
    console.error('[Startup Onboarding API] Error:', err.message);
    res.status(500).json({ error: `Onboarding failed: ${err.message}` });
  }
});

// POST initialize a blank workspace with 8 default agents
router.post('/startup/initialize', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const defaultData = {
      startupName: req.body?.startupName || 'New Startup',
      industry: req.body?.industry || 'Technology',
      description: req.body?.description || 'Early-stage venture',
      cashBalance: req.body?.cashBalance || 0,
      monthlyBurn: req.body?.monthlyBurn || 0,
    };
    const canonicalContext = await workspaceService.saveOnboardingData(userId, defaultData);
    res.json({ success: true, context: canonicalContext });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET canonical startup context (Structured Source of Truth)
router.get('/startup/context', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const canonical = await workspaceService.getCanonicalContext(userId);
    if (!canonical) {
      res.status(404).json({ error: 'No startup workspace found for authenticated user.', onboarded: false });
      return;
    }
    res.json({ ...canonical, onboarded: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message, onboarded: false });
  }
});

// GET startup profile (Scoping strictly per authenticated user workspace)
router.get('/startup', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (isDbAvailable && prisma) {
    try {
      const canonical = await workspaceService.getCanonicalContext(userId);
      if (canonical) {
        return res.json({
          id: canonical.startupId,
          name: canonical.startup.name,
          industry: canonical.startup.industry,
          description: canonical.startup.description,
          fundingStage: canonical.startup.stage,
          cashBalance: canonical.financials.cashBalance,
          burnRate: canonical.financials.monthlyBurn,
          runwayMonths: canonical.financials.runwayMonths,
          healthScore: 80,
          metrics: {
            velocity: 85,
            financialHealth: 90,
            legalCompliance: 95,
            growthRate: 45,
            operationsEfficiency: 88,
          },
          targetIcp: canonical.business.targetIcp,
          primaryProduct: canonical.business.primaryProduct,
          goals: canonical.goals,
          priorities: canonical.priorities,
          onboarded: true
        });
      }
    } catch (dbErr: any) {
      console.warn('[Startup API] Database query warning:', dbErr.message);
    }
  }

  // Not onboarded yet
  res.json({
    name: '',
    industry: '',
    description: '',
    fundingStage: 'Pre-Seed',
    cashBalance: 0,
    burnRate: 0,
    runwayMonths: 0,
    healthScore: 0,
    metrics: {
      velocity: 0,
      financialHealth: 0,
      legalCompliance: 0,
      growthRate: 0,
      operationsEfficiency: 0,
    },
    onboarded: false
  });
});

// POST update startup profile
router.post('/startup', authenticateJWT, requireRole(['Founder', 'Admin']), async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { name, industry, description, fundingStage, cashBalance, burnRate, targetIcp, primaryProduct } = req.body;
  try {
    const canonical = await workspaceService.saveOnboardingData(userId, {
      startupName: name || 'Startup',
      industry: industry || 'Technology',
      description: description || '',
      fundingStage,
      targetIcp,
      primaryProduct,
      cashBalance: cashBalance !== undefined ? cashBalance : 0,
      monthlyBurn: burnRate !== undefined ? burnRate : 0,
    });
    
    res.json({
      id: canonical?.startupId,
      name: canonical?.startup.name,
      industry: canonical?.startup.industry,
      description: canonical?.startup.description,
      fundingStage: canonical?.startup.stage,
      cashBalance: canonical?.financials.cashBalance,
      burnRate: canonical?.financials.monthlyBurn,
      runwayMonths: canonical?.financials.runwayMonths,
      healthScore: startupProfile.healthScore || 80,
      metrics: startupProfile.metrics,
      targetIcp: canonical?.business.targetIcp,
      primaryProduct: canonical?.business.primaryProduct,
      goals: canonical?.goals,
      priorities: canonical?.priorities,
      onboarded: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET agents list (Live status from user's executive agents in DB)
router.get('/agents', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (userId && isDbAvailable && prisma) {
    try {
      const canonical = await workspaceService.getCanonicalContext(userId);
      if (canonical && canonical.agents.length > 0) {
        const mapped = canonical.agents.map(da => {
          const roleDef = DEFAULT_EXECUTIVE_ROLES.find(r => r.role.toLowerCase() === da.role.toLowerCase());
          return {
            id: da.role.toLowerCase(),
            name: da.name,
            role: da.role as any,
            avatar: roleDef?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
            description: roleDef?.description || `${da.role} Executive`,
            status: da.status as any,
            currentTask: da.currentTask || undefined,
            keyMetric: da.role === 'CEO' ? 'Company Velocity' : da.role === 'Finance' ? 'Financial Health' : da.role === 'Talent' ? 'Hiring Velocity' : da.role === 'Growth' ? 'Growth Rate' : da.role === 'Legal' ? 'Compliance Index' : da.role === 'Operations' ? 'Ops Efficiency' : da.role === 'Investment' ? 'Capital Readiness' : 'Audit Accuracy',
            metricValue: 'Active',
            color: da.role === 'CEO' ? 'indigo' : da.role === 'Finance' ? 'emerald' : da.role === 'Talent' ? 'pink' : da.role === 'Growth' ? 'amber' : da.role === 'Legal' ? 'rose' : da.role === 'Operations' ? 'teal' : da.role === 'Investment' ? 'purple' : 'blue'
          };
        });
        return res.json(mapped);
      }
    } catch (e: any) {
      console.warn('[Agents API] DB fetch warning:', e.message);
    }
  }

  res.json(agentsList);
});

// ============================================================================
// OPERATIONAL NOTIFICATIONS (Sections 21, 22 & 23 of PROMPT.MD)
// ============================================================================

// GET notifications for authenticated startup
router.get('/notifications', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId || !prisma) {
    res.json([]);
    return;
  }

  try {
    const startup = await prisma.startup.findFirst({ where: { ownerId: userId } });
    if (!startup) {
      return res.json([]);
    }

    const notifs = await prisma.notification.findMany({
      where: { startupId: startup.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(notifs);
  } catch (err: any) {
    console.error('[Notifications API] Fetch error:', err.message);
    res.json([]);
  }
});

// POST mark notification as read
router.post('/notifications/:id/read', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!prisma) {
    res.json({ success: true });
    return;
  }
  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST mark all notifications as read
router.post('/notifications/read-all', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId || !prisma) {
    res.json({ success: true });
    return;
  }
  try {
    const startup = await prisma.startup.findFirst({ where: { ownerId: userId } });
    if (startup) {
      await prisma.notification.updateMany({
        where: { startupId: startup.id, read: false },
        data: { read: true }
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET list of initiatives
router.get('/initiatives', authenticateJWT, (req: AuthenticatedRequest, res) => {
  res.json(initiatives);
});

// POST launch new initiative
router.post('/initiatives', authenticateJWT, (req: AuthenticatedRequest, res) => {
  const { title, description, category } = req.body;
  if (!title || !description || !category) {
    res.status(400).json({ error: 'Missing required initiative parameters.' });
    return;
  }

  const newInit: Initiative = {
    id: `init_${Date.now()}`,
    title,
    description,
    status: 'pending',
    category,
    createdAt: new Date().toISOString(),
    currentTaskIndex: 0,
    tasks: [
      { id: `t_gen_1`, title: 'Formulate general initiative roadmap and boundaries', assignedTo: 'CEO', status: 'pending' },
      { id: `t_gen_2`, title: 'Audit budget thresholds and financial boundaries', assignedTo: 'Finance', status: 'pending' },
      { id: `t_gen_3`, title: 'Compile protective disclosures and contract drafts', assignedTo: 'Legal', status: 'pending' }
    ],
    messages: [],
    deliverables: []
  };

  initiatives.unshift(newInit);
  res.status(201).json(newInit);
});

// TELEMETRY & SYSTEM ENDPOINTS (Vault & MCP Tools)
router.get('/vault/status', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const status = await vaultService.getStatus();
  const secretData = await vaultService.getSecret();
  res.json({
    status: status.connected ? 'connected' : 'fallback',
    vaultAddr: status.vaultAddr,
    keysFound: Object.keys(secretData)
  });
});

router.get('/mcp/tools', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const pyRes = await fetch(`${fastApiUrl}/api/py/mcp/tools`);
    if (pyRes.ok) {
      const data = await pyRes.json();
      return res.json(data);
    }
  } catch (e) {
    // Fallback response if Python service is loading
  }

  res.json({
    status: 'active',
    mcp_version: '1.0.0',
    tools: [
      { name: 'mcp_financial_calculator', description: 'Computes financial burn rates & runway impact.' },
      { name: 'mcp_compliance_auditor', description: 'Audits legal compliance, IP risk & SOC-2 guarantees.' },
      { name: 'mcp_vault_secret_loader', description: 'Queries HashiCorp Vault secrets engine.' }
    ]
  });
});

// POST simulate initiative collaboration (LangGraph Multi-Agent Loop!)
router.post('/initiatives/:id/simulate', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const init = initiatives.find(i => i.id === id);
  if (!init) {
    res.status(404).json({ error: 'Initiative not found.' });
    return;
  }

  init.status = 'active';
  setAgentStatuses('collaborating');
  const ceoAgent = agentsList.find(a => a.role === 'CEO');
  if (ceoAgent) ceoAgent.status = 'analyzing';

  try {
    console.log(`Starting LangGraph multi-agent simulation for initiative: ${init.title}`);
    
    // Attempt FastAPI Python LangGraph service invocation
    let simResult: any = null;
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    try {
      const pyResponse = await fetch(`${fastApiUrl}/api/py/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: init.id,
          title: init.title,
          description: init.description,
          category: init.category
        })
      });
      if (pyResponse.ok) {
        simResult = await pyResponse.json();
        console.log('✅ Received LangGraph simulation result from FastAPI microservice!');
      }
    } catch (pyErr: any) {
      console.warn(`FastAPI LangGraph service unavailable (${pyErr.message}). Using local engine fallback.`);
    }

    if (!simResult) {
      simResult = await runMultiAgentCollaboration(init);
    }

    // Apply sim results to initiative
    init.tasks = simResult.tasks || init.tasks;
    init.messages = simResult.messages || [];
    init.deliverables = simResult.deliverables || [];
    init.status = 'completed';

    // Reset agents back to idle
    resetAgentStatuses();

    // Seed deliverables into the approvals queue
    init.deliverables.forEach(d => {
      d.initiativeId = init.id;
      approvals.unshift({ ...d, status: 'pending_review' });
    });

    res.json(init);
  } catch (err: any) {
    console.error('Simulation endpoint failure:', err);
    init.status = 'failed';
    resetAgentStatuses();
    res.status(500).json({ error: 'Failed to execute agent simulation. Falling back to default states.' });
  }
});

// GET approvals queue
router.get('/approvals', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  let mergedApprovals = [...approvals];

  // 1. Direct PostgreSQL Prisma query
  if (isDbAvailable && prisma) {
    try {
      const dbApprovals = await safeDbQuery(async () => {
        return await prisma.approval.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50
        });
      }, 3);

      if (dbApprovals && dbApprovals.length > 0) {
        const mapped = dbApprovals.map((appr: any) => ({
          id: appr.id,
          initiativeId: appr.startupId || 'init_db_sync',
          title: `Approval: ${appr.actionType}`,
          description: appr.description || appr.actionType,
          type: (appr.actionType || 'action').toLowerCase(),
          content: appr.description,
          impact: appr.impact || 'Requires founder verification.',
          financialChange: appr.financialImpact || 0,
          status: appr.status === 'PENDING' ? 'pending_review' : appr.status.toLowerCase(),
          metricChanges: { velocity: 0, financialHealth: 0, legalCompliance: 0, growthRate: 0, operationsEfficiency: 0 }
        }));
        mergedApprovals = [...mapped, ...mergedApprovals];
      }
    } catch (dbErr: any) {
      console.warn('[Approvals API] Database query warning:', dbErr.message);
    }
  }

  // 2. Python FastAPI check with 5000ms timeout
  const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
  try {
    const pyRes = await fetch(`${fastApiUrl}/api/approvals`, { signal: AbortSignal.timeout(5000) });
    if (pyRes.ok) {
      const dbApprovals = await pyRes.json();
      const mapped = dbApprovals.map((appr: any) => {
        const payload = appr.payload || {};
        const docContent = payload.document_content || payload.email_body || JSON.stringify(payload);
        const purpose = payload.purpose || appr.action_type;
        
        return {
          id: appr.id,
          initiativeId: 'init_db_sync',
          title: payload.email_subject || `Approval: ${appr.action_type}`,
          description: purpose,
          type: (payload.contract_type || appr.action_type || 'document').toLowerCase(),
          content: docContent,
          impact: `Action type: ${appr.action_type}. Requires founder verification.`,
          financialChange: payload.financialChange || 0,
          status: appr.status === 'PENDING' ? 'pending_review' : appr.status.toLowerCase(),
          metricChanges: payload.metricChanges || { velocity: 0, financialHealth: 0, legalCompliance: 0, growthRate: 0, operationsEfficiency: 0 }
        };
      });
      const pendingDb = mapped.filter((a: any) => a.status === 'pending_review');
      mergedApprovals = [...pendingDb, ...mergedApprovals];
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.warn(`[FastAPI Sync] Failed to fetch approvals: ${err.message}. Using persistent database queue.`);
    }
  }
  res.json(mergedApprovals);
});

// POST review action on approval item
router.post('/approvals/:id/review', authenticateJWT, requireRole(['Founder', 'Admin']), async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { action, feedback } = req.body; // action: 'approve' | 'reject'

  const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';

  // Try checking if this is a database approval item
  try {
    if (action === 'approve') {
      const pyRes = await fetch(`${fastApiUrl}/api/approvals/${id}/execute`, {
        method: 'PUT'
      });
      if (pyRes.ok) {
        const dbAppr = await pyRes.json();
        
        // Write to Decision Log
        decisionLog.unshift({
          id: `dec_${Date.now()}`,
          title: `Approve: ${dbAppr.action_type}`,
          description: `Executed database transaction approval for ID ${id}`,
          category: dbAppr.action_type.toUpperCase(),
          timestamp: new Date().toISOString(),
          impactText: 'Database transaction completed and signed off.',
          financialImpact: 0,
          status: 'approved',
        });

        // Sync local memory profile from FastAPI
        const startRes = await fetch(`${fastApiUrl}/api/startup`);
        if (startRes.ok) {
          const data = await startRes.json();
          startupProfile.name = data.company_name;
          startupProfile.industry = data.industry;
          startupProfile.description = data.target_icp || '';
          startupProfile.cashBalance = data.cash_on_hand;
          startupProfile.burnRate = data.current_monthly_burn;
          if (startupProfile.burnRate > 0) {
            startupProfile.runwayMonths = parseFloat((startupProfile.cashBalance / startupProfile.burnRate).toFixed(1));
          } else {
            startupProfile.runwayMonths = 999;
          }
        }

        return res.json({ startupProfile, item: { id: dbAppr.id, title: `Database Action: ${dbAppr.action_type}`, status: 'approved' } });
      }
    }
  } catch (err: any) {
    console.warn(`[FastAPI Sync] Error checking database approvals: ${err.message}`);
  }

  // Fallback to local memory-based approvals review logic
  const index = approvals.findIndex(a => a.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Approval deliverable not found.' });
    return;
  }

  const item = approvals[index];

  if (action === 'approve') {
    item.status = 'approved';

    // Apply financial changes to startup profile
    if (item.financialChange) {
      startupProfile.cashBalance = Math.max(0, startupProfile.cashBalance + item.financialChange);
    }

    // Apply metric scores (0 to 100)
    if (item.metricChanges) {
      const keys = Object.keys(item.metricChanges) as Array<keyof typeof startupProfile.metrics>;
      keys.forEach(key => {
        const change = (item.metricChanges as any)[key] || 0;
        startupProfile.metrics[key] = Math.min(100, Math.max(10, startupProfile.metrics[key] + change));
      });
    }

    // Dynamic burn recalculation based on negative impact
    if (item.financialChange && item.financialChange < 0) {
      const burnImpact = Math.abs(item.financialChange) / 12; // spread over a year
      startupProfile.burnRate = Math.round(startupProfile.burnRate + burnImpact);
    }

    // Recalculate runway
    if (startupProfile.burnRate > 0) {
      startupProfile.runwayMonths = parseFloat((startupProfile.cashBalance / startupProfile.burnRate).toFixed(1));
    } else {
      startupProfile.runwayMonths = 999;
    }

    // Recalculate total health score
    const avgMetrics = Object.values(startupProfile.metrics).reduce((a, b) => a + b, 0) / 5;
    startupProfile.healthScore = Math.round(avgMetrics);

    // Write to Decision Log
    decisionLog.unshift({
      id: `dec_${Date.now()}`,
      title: `Approve: ${item.title}`,
      description: item.description,
      category: item.type.toUpperCase(),
      timestamp: new Date().toISOString(),
      impactText: item.impact,
      financialImpact: item.financialChange || 0,
      status: 'approved',
    });

    // Also update deliverable status in original initiative if it exists
    initiatives.forEach(init => {
      const del = init.deliverables.find(d => d.id === id);
      if (del) del.status = 'approved';
    });

  } else if (action === 'reject') {
    item.status = 'rejected';

    decisionLog.unshift({
      id: `dec_${Date.now()}`,
      title: `Reject: ${item.title}`,
      description: `Rejected by founder with feedback: "${feedback || 'No feedback provided'}"`,
      category: item.type.toUpperCase(),
      timestamp: new Date().toISOString(),
      impactText: 'No operational metrics modified.',
      financialImpact: 0,
      status: 'rejected',
    });

    initiatives.forEach(init => {
      const del = init.deliverables.find(d => d.id === id);
      if (del) del.status = 'rejected';
    });
  }

  // Remove from core review queue
  approvals.splice(index, 1);

  res.json({ startupProfile, item });
});

// GET decision logs
router.get('/decisions', authenticateJWT, (req: AuthenticatedRequest, res) => {
  res.json(decisionLog);
});

// GET knowledge base documents from Neon PostgreSQL
router.get('/knowledge', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!isDbAvailable) {
    res.json(knowledgeFiles);
    return;
  }
  try {
    const activeStartup = req.user?.id
      ? await prisma.startup.findFirst({ where: { ownerId: req.user.id } })
      : null;

    if (!activeStartup) {
      res.json([]);
      return;
    }

    const dbDocs = await prisma.startupDocument.findMany({
      where: { startupId: activeStartup.id },
      orderBy: { createdAt: 'desc' }
    });

    const docs = dbDocs.map(d => ({
      id: d.id,
      name: d.name,
      type: d.type as any,
      size: d.size,
      uploadDate: d.createdAt.toISOString(),
      summary: d.summary,
      insights: d.insights
    }));

    res.json(docs);
  } catch (err: any) {
    console.error('[Knowledge API] Error fetching documents from DB:', err.message);
    res.json([]);
  }
});

// POST upload/ingest new knowledge document with multiple formats support
router.post('/knowledge', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { name, content, type, fileData, mimeType } = req.body;
  if (!name || !type) {
    res.status(400).json({ error: 'Missing required document name or type.' });
    return;
  }

  if (!isDbAvailable) {
    const sizeStr = fileData ? `${(Buffer.from(fileData, 'base64').length / 1024).toFixed(1)} KB` : `${((content || '').length / 1024).toFixed(1)} KB`;
    const newFile = {
      id: `doc_${Date.now()}`,
      name,
      type: type as any,
      size: sizeStr,
      uploadDate: new Date().toISOString(),
      summary: `Vetted ${type} document details (Offline Mode).`,
      insights: [
        'Validated strategic growth models against pre-seed boundaries (Offline Mode).',
        'Offline mock mode activated. Database is currently unavailable.',
      ],
    };
    knowledgeFiles.unshift(newFile);
    res.status(201).json(newFile);
    return;
  }

  try {
    const prismaClient = prisma;
    const activeStartup = req.user?.id
      ? await prismaClient.startup.findFirst({ where: { ownerId: req.user.id } })
      : null;

    if (!activeStartup) {
      res.status(400).json({ error: 'No active startup found. Please complete onboarding first.' });
      return;
    }
    const startupId = activeStartup.id;

    let textContent = content || '';
    let sizeStr = '';

    // Handle base64 encoded file uploads
    if (fileData) {
      const buffer = Buffer.from(fileData, 'base64');
      sizeStr = `${(buffer.length / 1024).toFixed(1)} KB`;
      console.log(`[Knowledge API] Processing file upload: ${name} (${sizeStr}) with mimeType: ${mimeType}`);
      
      // Upload raw file to S3-compatible storage if configured
      if (isS3Configured()) {
        try {
          const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const s3Key = `documents/${Date.now()}_${sanitized}`;
          await uploadToS3({
            key: s3Key,
            body: buffer,
            contentType: mimeType || 'application/octet-stream',
            metadata: { originalName: name, documentType: type },
          });
          console.log(`[Knowledge API] Document persisted to Neon S3 Object Storage: ${s3Key}`);
        } catch (s3Err: any) {
          console.warn('[Knowledge API] S3 upload warning (non-fatal):', s3Err.message);
        }
      }

      textContent = await extractTextFromFile(buffer, name, mimeType || '');
    } else {
      sizeStr = `${((content || '').length / 1024).toFixed(1)} KB`;
    }


    if (!textContent || textContent.trim().length === 0) {
      res.status(400).json({ error: 'Extracted text content from the file is empty.' });
      return;
    }

    let summary = 'Summarizing document context...';
    let insights = ['Extracting document insights...'];

    // AI-powered analysis of uploaded startup documents!
    if (ai) {
      try {
        const analysisPrompt = `Analyze the following uploaded startup document:
Document Name: ${name}
Document Type: ${type}
Content:
${textContent.slice(0, 10000)} // Analyze first 10k chars for efficiency

Provide a structured analysis containing:
1. A concise 1-sentence summary of what this document covers.
2. A list of 3 key tactical corporate insights relevant to B2B SaaS building.

Format your output exactly as valid JSON with "summary" (string) and "insights" (array of strings). Do NOT include backticks or markdown fences.`;

        const analysisResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: analysisPrompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const parsed = JSON.parse(analysisResponse.text?.trim() || '{}');
        summary = parsed.summary || 'Summary generated.';
        insights = parsed.insights || [];
      } catch (err: any) {
        console.error('Gemini document parsing error, falling back to simulated parser:', err.message);
        summary = `Vetted ${type} document containing startup objectives and specifications.`;
        insights = [
          'Validated operational requirements against pre-seed milestones.',
          'Identified 2 core cost optimization thresholds.',
          'Structured regulatory compliance checklists for next quarter reviews.'
        ];
      }
    } else {
      summary = `Vetted ${type} document detailing startup operational profiles.`;
      insights = [
        'Validated strategic growth models against pre-seed boundaries.',
        'Constructed customer pilot roadmap containing mid-market criteria.',
        'Identified 2 legal safeguards concerning vendor data policies.'
      ];
    }

    const documentId = `doc_${Date.now()}`;
    const createdDoc = await safeDbQuery(() => prisma.startupDocument.create({
      data: {
        id: documentId,
        name,
        type,
        size: sizeStr,
        summary,
        insights,
        startupId
      }
    }));

    // Delegate overlapping chunking & high-fidelity embeddings generation to the production RAG Engine
    await ingestDocument(documentId, textContent, name, type);

    // Create real operational notification
    try {
      await prisma.notification.create({
        data: {
          startupId: activeStartup.id,
          type: 'DOCUMENT',
          title: 'Document Ready',
          message: `"${name}" (${type}) was parsed, embedded, and indexed into the knowledge base.`,
          read: false
        }
      });
    } catch (notifErr: any) {
      console.warn('[Knowledge API] Failed to create document notification:', notifErr.message);
    }

    const newFile = {
      id: createdDoc.id,
      name: createdDoc.name,
      type: createdDoc.type as any,
      size: createdDoc.size,
      uploadDate: createdDoc.createdAt.toISOString(),
      summary: createdDoc.summary,
      insights: createdDoc.insights,
    };

    knowledgeFiles.unshift(newFile);
    res.status(201).json(newFile);
  } catch (error: any) {
    console.error('[Knowledge API] Critical ingestion error:', error.message);
    res.status(500).json({ error: `File ingestion failed: ${error.message}` });
  }
});

// GET Neon S3 Object Storage status and health
router.get('/storage/status', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const status = await checkS3Health();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET presigned download URL for an uploaded document
router.get('/knowledge/:id/download', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const doc = knowledgeFiles.find((d) => d.id === id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    if (!isS3Configured()) {
      res.status(400).json({ error: 'Neon S3 storage is not configured.' });
      return;
    }

    // Try finding by name or document key
    const sanitized = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const downloadUrl = await getPresignedDownloadUrl(`documents/${sanitized}`);
    res.json({ downloadUrl, filename: doc.name });
  } catch (err: any) {
    res.status(500).json({ error: `Could not generate download URL: ${err.message}` });
  }
});

// POST search/RAG query against uploaded files in Neon PostgreSQL
router.post('/knowledge/query', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { query } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Query is required.' });
    return;
  }

  if (!isDbAvailable) {
    res.json({
      answer: `### Knowledge Retrieval Response (Offline Mode)\n\nBased on your query "${query}", we simulated search against local offline knowledge base files.\n\n- No database is connected, showing simulated local insights.`,
      citations: []
    });
    return;
  }

  try {
    const prismaClient = prisma;
    const activeStartup = req.user?.id
      ? await prismaClient.startup.findFirst({ where: { ownerId: req.user.id } })
      : null;

    if (!activeStartup) {
      res.json({
        answer: 'No corporate files matching your query have been indexed yet. Please upload relevant strategic documents (PDF, DOCX, PPTX, CSV) to feed the knowledge base!',
        citations: []
      });
      return;
    }
    const startupId = activeStartup.id;

    // 1. Perform Hybrid Search across all document chunks
    const limit = 5;
    const retrievedChunks = await performHybridSearch(query, startupId, limit);

    if (retrievedChunks.length === 0) {
      res.json({
        answer: 'No corporate files matching your query have been indexed yet. Please upload relevant strategic documents (PDF, DOCX, PPTX, CSV) to feed the knowledge base!',
        citations: []
      });
      return;
    }

    // 2. Build structured prompt context and citation objects
    const { contextText, citations } = buildContext(retrievedChunks);

    if (ai) {
      const queryPrompt = `You are the CatalystOS Knowledge Agent. Solve this user query using the attached document context:
Query: "${query}"

Corporate Document Base Context:
${contextText}

Provide a brilliant, detailed tactical answer citing specific documents where possible using the citation IDs (like [CIT-1], [CIT-2]) provided in the context. Use clean Markdown styling.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: queryPrompt,
      });

      res.json({ 
        answer: response.text,
        citations: citations
      });
    } else {
      res.json({
        answer: `I cannot generate dynamic document synthesis because the AI service is currently unavailable. Showing ${citations.length} retrieved document references.`,
        citations: citations
      });
    }
  } catch (error: any) {
    console.error('[Knowledge API] RAG query failed:', error.message);
    res.status(500).json({ error: 'RAG search failed to generate answer.' });
  }
});

// POST orchestrate command (Master Planner-Executor Canonical Endpoint)
router.post('/orchestrate', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { command, commandId, context } = req.body;
  if (!command || typeof command !== 'string' || !command.trim()) {
    res.status(400).json({ error: 'A non-empty founder command is required.' });
    return;
  }

  try {
    const result = await orchestrationService.executeCommand(
      command.trim(),
      { userId: req.user?.id, startupId: context?.startupId, commandId }
    );
    res.json(result);
  } catch (err: any) {
    console.error('[Orchestrate API] Execution failure:', err.message);
    res.status(500).json({
      error: 'I could not complete the executive analysis right now. Reason: AI orchestration pipeline encountered an error. Please try again.',
      details: err.message
    });
  }
});

// POST orchestrate stream endpoint (Real-time SSE event stream for JARVIS Dashboard)
router.post('/orchestrate/stream', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  const { command, commandId, context } = req.body;
  if (!command || typeof command !== 'string' || !command.trim()) {
    res.status(400).json({ error: 'A non-empty founder command is required.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const result = await orchestrationService.executeCommand(
      command.trim(),
      { userId: req.user?.id, startupId: context?.startupId, commandId },
      (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    );

    res.write(`data: ${JSON.stringify({ type: 'final_response', result })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('[Orchestrate Stream API] Streaming failure:', err.message);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: 'I could not complete the executive analysis right now. Reason: AI orchestration pipeline encountered an error. Please try again.'
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export default router;
