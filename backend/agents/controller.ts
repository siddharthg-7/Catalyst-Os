import { Router, Request, Response } from 'express';
import { startupProfile, knowledgeFiles } from '../state';
import { runFinanceAgent, runTalentAgent, runGrowthAgent, runOperationsAgent, runLegalAgent } from './services';

const router = Router();

// 1. FINANCE AGENT CONTROLLERS
// GET /api/finance/burn-chart - Generates a dynamic projection chart of cash-depletion velocity over time
router.get('/finance/burn-chart', (req: Request, res: Response) => {
  const months = 12;
  const projections = [];
  let currentCash = startupProfile.cashBalance;
  
  for (let i = 0; i <= months; i++) {
    projections.push({
      month: `Month ${i}`,
      cash: Math.round(currentCash),
      runway: parseFloat((currentCash / startupProfile.burnRate).toFixed(1))
    });
    currentCash = Math.max(0, currentCash - startupProfile.burnRate);
  }
  
  res.json({
    burnRate: startupProfile.burnRate,
    projections
  });
});

// GET /api/finance/affordability-check - Instantly verify budget availability for a salary package
router.get('/finance/affordability-check', (req: Request, res: Response) => {
  const salary = parseFloat(req.query.salary as string) || 120000;
  const equity = parseFloat(req.query.equity as string) || 1.2;

  const annualCost = salary;
  const monthlyCost = annualCost / 12;
  const newBurnRate = startupProfile.burnRate + monthlyCost;
  const potentialRunway = parseFloat((startupProfile.cashBalance / newBurnRate).toFixed(1));

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
router.post('/talent/score-candidates', (req: Request, res: Response) => {
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
router.get('/talent/benchmarks', (req: Request, res: Response) => {
  const role = req.query.role as string || 'Lead Platform Engineer';
  
  res.json({
    industry: startupProfile.industry,
    fundingStage: startupProfile.fundingStage,
    role,
    salaryP50: 125000,
    salaryP90: 155000,
    equityPercentRange: '1.0% - 2.0%',
    standardVesting: '4-year monthly vesting with a standard 12-month initial cliff.'
  });
});

// 3. GROWTH AGENT CONTROLLERS
// GET /api/growth/campaigns - Retrieve active campaigns list
router.get('/growth/campaigns', (req: Request, res: Response) => {
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
router.post('/growth/generate-assets', async (req: Request, res: Response) => {
  const { initiativeTitle, targetSegment } = req.body;
  
  const response = {
    campaignTitle: initiativeTitle || 'Campaign',
    targetSegment: targetSegment || 'DevOps Managers',
    channels: ['LinkedIn', 'Direct Cold Outreach'],
    contentDrafts: {
      linkedinPost: `We are wasting billions annually on idle servers.\n\nToday, we are launching CatalystOS Startup: the first autonomous predictive scheduler that automatically failovers and scales cloud nodes to eliminate waste.\n\n🚀 Join our free pilot (limited to 5 teams): [Link]`,
      emailSubject: 'Save 34% on your hybrid cloud server bills',
      emailBody: `Hi [First Name],\n\nI noticed you are managing cloud infrastructure. Most teams waste up to 34% of their budgets due to manual scheduling delays.\n\nCatalystOS Startup automatically scales and failovers clusters based on predictive usage.\n\nWe are accepting 5 mid-market pilots this month. Would you be open to a 10-minute chat?\n\nBest,\nSophia Vance\nCEO, CatalystOS Startup`
    }
  };

  res.json(response);
});

export default router;
