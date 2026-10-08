import { Router, Request, Response } from 'express';
import { startupProfile, knowledgeFiles } from '../state';
import { runFinanceAgent, runTalentAgent, runGrowthAgent, runOperationsAgent, runLegalAgent } from './services';
import { authenticateJWT, AuthenticatedRequest } from '../services/neonAuthMiddleware';
import { companyContextService } from '../services/companyContextService';

const router = Router();

// 1. FINANCE AGENT CONTROLLERS
// GET /api/finance/burn-chart - Generates a dynamic projection chart of cash-depletion velocity over time
router.get('/finance/burn-chart', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const context = req.user?.id ? await companyContextService.getContextForUser(req.user.id) : null;
  const cashBalance = context?.financial.cashBalance ?? startupProfile.cashBalance;
  const burnRate = context?.financial.monthlyBurn ?? startupProfile.burnRate;

  const months = 12;
  const projections = [];
  let currentCash = cashBalance;
  
  for (let i = 0; i <= months; i++) {
    projections.push({
      month: `Month ${i}`,
      cash: Math.round(currentCash),
      runway: burnRate > 0 ? parseFloat((currentCash / burnRate).toFixed(1)) : 999
    });
    currentCash = Math.max(0, currentCash - burnRate);
  }
  
  res.json({
    burnRate,
    projections
  });
});

// GET /api/finance/affordability-check - Instantly verify budget availability for a salary package
router.get('/finance/affordability-check', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const context = req.user?.id ? await companyContextService.getContextForUser(req.user.id) : null;
  const cashBalance = context?.financial.cashBalance ?? startupProfile.cashBalance;
  const burnRate = context?.financial.monthlyBurn ?? startupProfile.burnRate;

  const salary = parseFloat(req.query.salary as string) || 120000;
  const equity = parseFloat(req.query.equity as string) || 1.2;

  const annualCost = salary;
  const monthlyCost = annualCost / 12;
  const newBurnRate = burnRate + monthlyCost;
  const potentialRunway = parseFloat((cashBalance / (newBurnRate > 0 ? newBurnRate : 1)).toFixed(1));

  const isAffordable = potentialRunway >= 11; // Buffer rule of 11 months

  res.json({
    salary,
    equity,
    monthlyCost,
    potentialBurnRate: newBurnRate,
    potentialRunway,
    isAffordable,
    recommendation: isAffordable 
      ? 'Affordable within pre-seed boundaries.' 
      : 'Triggers budget conflict. Recommend scaling base salary down and compensating with proportional equity pool options.'
  });
});

// 2. TALENT AGENT CONTROLLERS
// POST /api/talent/score-candidates - Parses and ranks candidates against a criteria
router.post('/talent/score-candidates', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  const { jobDescriptionId, resumes } = req.body;
  if (!resumes || !Array.isArray(resumes)) {
    res.status(400).json({ error: 'Resumes array is required.' });
    return;
  }

  const rankings = resumes.map((resume: any) => {
    // Basic heuristics-driven parser for simulation/production scoring
    const text = (resume.rawText || '').toLowerCase();
    let score = 60; // baseline

    if (text.includes('kubernetes') || text.includes('orchestrat')) score += 15;
    if (text.includes('node.js') || text.includes('typescript')) score += 10;
    if (text.includes('aws') || text.includes('gcp') || text.includes('cloud')) score += 10;
    if (text.includes('senior') || text.includes('lead')) score += 5;

    score = Math.min(100, score);

    return {
      candidateName: resume.candidateName || 'Anonymous Candidate',
      score,
      alignmentSummary: score >= 85 
        ? 'Exceptional technical alignment with cloud infrastructure, container services, and Node.js backend pipelines.' 
        : 'Moderate alignment. Candidate possesses strong foundations but lacks targeted cloud scheduling exposure.',
      recommendedCompensation: {
        salaryBase: score >= 85 ? 128000 : 110000,
        equityPercent: score >= 85 ? 1.65 : 1.0
      }
    };
  });

  res.json({ rankings });
});

// GET /api/talent/benchmarks - Retrieves compensation benchmarks
router.get('/talent/benchmarks', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const context = req.user?.id ? await companyContextService.getContextForUser(req.user.id) : null;
  const industry = context?.identity.industry ?? startupProfile.industry;
  const fundingStage = context?.identity.stage ?? startupProfile.fundingStage;
  const role = req.query.role as string || 'Lead Platform Engineer';
  
  res.json({
    industry,
    fundingStage,
    role,
    salaryP50: 125000,
    salaryP90: 155000,
    equityPercentRange: '1.0% - 2.0%',
    standardVesting: '4-year monthly vesting with a standard 12-month initial cliff.'
  });
});

// 3. GROWTH AGENT CONTROLLERS
// GET /api/growth/campaigns - Retrieve active campaigns list
router.get('/growth/campaigns', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  res.json([
    {
      id: 'camp_1',
      title: 'CatalystOS Launch Campaign & Viral Referral program',
      status: 'active',
      channels: ['LinkedIn', 'Cold Outreach'],
      budgetLimit: 1200,
      expectedConversionRate: 0.12,
      leadsGenerated: 342
    }
  ]);
});

// POST /api/growth/generate-assets - Automatically generates copy drafts
router.post('/growth/generate-assets', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const context = req.user?.id ? await companyContextService.getContextForUser(req.user.id) : null;
  const companyName = context?.identity.name ?? 'CatalystOS Startup';
  const founderName = context?.founder.name ?? 'Sophia Vance';
  const founderRole = context?.founder.role ?? 'CEO';
  const problem = context?.business.problem ?? 'manual scheduling delays';
  const targetIcp = context?.business.targetIcp ?? 'DevOps Managers';

  const { initiativeTitle, targetSegment } = req.body;
  const segment = targetSegment || targetIcp;
  
  const response = {
    campaignTitle: initiativeTitle || `${companyName} Launch Campaign`,
    targetSegment: segment,
    channels: ['LinkedIn', 'Direct Cold Outreach'],
    contentDrafts: {
      linkedinPost: `We are wasting billions annually on idle servers.\n\nToday, we are launching ${companyName}: addressing "${problem}".\n\n🚀 Join our free pilot: [Link]`,
      emailSubject: `Solving ${problem.slice(0, 40)} for ${segment}`,
      emailBody: `Hi [First Name],\n\nI noticed you are managing infrastructure at your team. ${problem}.\n\n${companyName} is built specifically to solve this for ${segment}.\n\nWould you be open to a brief 10-minute chat?\n\nBest,\n${founderName}\n${founderRole}, ${companyName}`
    }
  };

  res.json(response);
});

export default router;
