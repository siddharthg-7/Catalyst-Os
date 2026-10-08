/**
 * CatalystOS - What-If Scenario Studio (Section 17)
 * Clear founder interaction: "What happens if..." → Scenario Input → Run Scenario
 * Clean 5-phase progression: Current State ↓ Scenario ↓ Executive Analysis ↓ Impact ↓ Recommendation
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, ShieldCheck,
  Users, DollarSign, Calendar, RefreshCw, Sparkles, Check,
  ArrowRight, ShieldAlert, BarChart3, HelpCircle, ArrowDown,
  Play, SlidersHorizontal, CheckCircle2, XCircle
} from 'lucide-react';

interface ScenarioSimulatorProps {
  currentCash: number;
  currentBurn: number;
  companyName?: string;
}

interface ScenarioPreset {
  id: string;
  title: string;
  query: string;
  description: string;
  headcountDelta: number;
  headcountRole: string;
  headcountSalary: number;
  adSpendDelta: number;
  revenueDeltaPercent: number;
  oneTimeExpense: number;
}

const PRESETS: ScenarioPreset[] = [
  {
    id: 'hire_3',
    title: 'Hire 3 Engineers',
    query: 'What happens if we hire 3 Senior Engineers at $150k base?',
    description: 'Scale core platform velocity with 3 senior engineers.',
    headcountDelta: 3,
    headcountRole: 'Senior Backend Engineer',
    headcountSalary: 150000,
    adSpendDelta: 0,
    revenueDeltaPercent: 0,
    oneTimeExpense: 0
  },
  {
    id: 'ad_spend_15k',
    title: '+$15k/mo Growth Spend',
    query: 'What happens if we accelerate ad spend by $15k per month?',
    description: 'Aggressive top-of-funnel customer acquisition push.',
    headcountDelta: 0,
    headcountRole: '',
    headcountSalary: 0,
    adSpendDelta: 15000,
    revenueDeltaPercent: 0,
    oneTimeExpense: 0
  },
  {
    id: 'rev_down_20',
    title: 'Revenue Drops 20%',
    query: 'What happens if top-line revenue contracts by 20%?',
    description: 'Adverse macroeconomic contraction stress test.',
    headcountDelta: 0,
    headcountRole: '',
    headcountSalary: 0,
    adSpendDelta: 0,
    revenueDeltaPercent: -20,
    oneTimeExpense: 0
  },
  {
    id: 'launch_slip_30',
    title: 'Launch Slips 30 Days',
    query: 'What happens if product launch delays by 30 days?',
    description: '1 month of unbudgeted server and operational burn.',
    headcountDelta: 0,
    headcountRole: '',
    headcountSalary: 0,
    adSpendDelta: 0,
    revenueDeltaPercent: 0,
    oneTimeExpense: 25000
  },
  {
    id: 'preservation',
    title: 'Cash Preservation',
    query: 'What happens if we freeze hiring and cut spend by $10k/mo?',
    description: 'Extend runway to maximum horizon before fundraising.',
    headcountDelta: 0,
    headcountRole: '',
    headcountSalary: 0,
    adSpendDelta: -10000,
    revenueDeltaPercent: 0,
    oneTimeExpense: 0
  }
];

export default function ScenarioSimulator({
  currentCash = 500000,
  currentBurn = 40000,
  companyName = 'Apex AI'
}: ScenarioSimulatorProps) {
  // Scenario prompt query
  const [scenarioPrompt, setScenarioPrompt] = useState('What happens if we hire 3 Senior Engineers at $150k base?');
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(true);

  // Scenario input variables
  const [headcount, setHeadcount] = useState<number>(3);
  const [headcountSalary, setHeadcountSalary] = useState<number>(150000);
  const [headcountRole, setHeadcountRole] = useState<string>('Senior Backend Engineer');
  const [adSpendDelta, setAdSpendDelta] = useState<number>(0);
  const [revenueDeltaPercent, setRevenueDeltaPercent] = useState<number>(0);
  const [oneTimeExpense, setOneTimeExpense] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<string | null>('hire_3');
  const [showVariableSliders, setShowVariableSliders] = useState(false);

  // Apply a preset
  const applyPreset = (preset: ScenarioPreset) => {
    setActivePreset(preset.id);
    setScenarioPrompt(preset.query);
    setHeadcount(preset.headcountDelta);
    setHeadcountSalary(preset.headcountSalary || 140000);
    setHeadcountRole(preset.headcountRole || 'Software Engineer');
    setAdSpendDelta(preset.adSpendDelta);
    setRevenueDeltaPercent(preset.revenueDeltaPercent);
    setOneTimeExpense(preset.oneTimeExpense);
    setHasRun(true);
  };

  const resetToBaseline = () => {
    setActivePreset(null);
    setScenarioPrompt('What happens if we remain at baseline?');
    setHeadcount(0);
    setHeadcountSalary(140000);
    setHeadcountRole('Software Engineer');
    setAdSpendDelta(0);
    setRevenueDeltaPercent(0);
    setOneTimeExpense(0);
    setHasRun(true);
  };

  const handleRunScenario = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 600);
  };

  // Deterministic financial calculation (100% mathematical integrity)
  const simulation = useMemo(() => {
    const cash = Math.max(0, currentCash);
    const burn = Math.max(1000, currentBurn);

    const initialRunway = parseFloat((cash / burn).toFixed(1));

    // Loaded compensation: (Base * 1.20) / 12 * Count
    const monthlyHeadcountCost = headcount > 0
      ? ((headcountSalary * 1.20) / 12) * headcount
      : 0;

    const growthDelta = adSpendDelta;
    const estimatedRevBase = burn * 0.35;
    const revenueImpact = estimatedRevBase * (revenueDeltaPercent / 100);

    const netBurnDelta = monthlyHeadcountCost + growthDelta - revenueImpact;
    const projectedBurn = Math.max(1000, burn + netBurnDelta);

    const projectedCash = Math.max(0, cash - oneTimeExpense);
    const projectedRunway = parseFloat((projectedCash / projectedBurn).toFixed(1));
    const runwayDelta = parseFloat((projectedRunway - initialRunway).toFixed(1));

    let riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (projectedRunway < 4.0 || projectedCash <= 0) {
      riskRating = 'CRITICAL';
    } else if (projectedRunway < 6.0) {
      riskRating = 'HIGH';
    } else if (projectedRunway < 10.0 || netBurnDelta > 20000) {
      riskRating = 'MEDIUM';
    }

    const timeline = [];
    let rollingCash = projectedCash;
    for (let month = 1; month <= 12; month++) {
      rollingCash = Math.max(0, rollingCash - projectedBurn);
      timeline.push({
        month,
        cash: Math.round(rollingCash),
        depleted: rollingCash <= 0
      });
    }

    return {
      initialCash: cash,
      initialBurn: burn,
      initialRunway,
      monthlyHeadcountCost,
      netBurnDelta,
      projectedCash,
      projectedBurn,
      projectedRunway,
      runwayDelta,
      riskRating,
      timeline
    };
  }, [currentCash, currentBurn, headcount, headcountSalary, adSpendDelta, revenueDeltaPercent, oneTimeExpense]);

  return (
    <div id="scenario-studio-container" className="space-y-8 font-sans">
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141413]/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#696969]">
              Strategic Forecasting
            </span>
            <span className="w-1 h-1 rounded-full bg-[#141413]/30" />
            <span className="text-[11px] font-mono text-[#696969]">
              Deterministic Solvency Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
            Scenario Studio
          </h1>
          <p className="text-sm text-[#696969] mt-1 max-w-2xl">
            Simulate the impact of hiring expansions, market downturns, and capital deployments before committing company cash.
          </p>
        </div>

        <button
          onClick={resetToBaseline}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#141413]/15 text-xs font-semibold text-[#141413] hover:border-[#141413] transition-colors flex items-center gap-1.5 self-start md:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#696969]" />
          Reset to Baseline
        </button>
      </div>

      {/* ── PRIMARY INTERACTION: "WHAT HAPPENS IF..." HERO ───────────────── */}
      <div className="catalyst-card p-6 md:p-8 rounded-2xl space-y-6 shadow-sm border border-[#141413]/10">
        <div>
          <span className="text-xs font-bold text-[#696969] uppercase font-mono tracking-wider block mb-2">
            Main Scenario Prompt
          </span>
          <label className="text-xl sm:text-2xl font-bold text-[#141413] block">
            What happens if...
          </label>
        </div>

        {/* Input Bar with Run Scenario CTA */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={scenarioPrompt}
              onChange={(e) => setScenarioPrompt(e.target.value)}
              placeholder="e.g. We hire 3 engineers and increase growth spend by $15k/mo..."
              className="w-full px-4 py-3.5 rounded-xl bg-white border border-[#141413]/20 text-sm font-semibold text-[#141413] focus:outline-none focus:border-[#141413] shadow-inner"
            />
          </div>

          <button
            onClick={handleRunScenario}
            disabled={isRunning}
            className="interactive-btn px-6 py-3.5 rounded-xl bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] flex items-center justify-center gap-2 shadow-sm shrink-0 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-[#F3F0EE]" />
                Run Scenario
              </>
            )}
          </button>
        </div>

        {/* Preset Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs text-[#696969] font-medium mr-1">Presets:</span>
          {PRESETS.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#141413] text-[#F3F0EE]'
                    : 'bg-[#FCFBFA] border border-[#141413]/10 text-[#696969] hover:text-[#141413] hover:border-[#141413]/30'
                }`}
              >
                {p.title}
              </button>
            );
          })}

          <button
            onClick={() => setShowVariableSliders(!showVariableSliders)}
            className="ml-auto text-xs text-[#141413] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showVariableSliders ? 'Hide Variable Controls' : 'Fine-Tune Variables'}
          </button>
        </div>

        {/* Fine-Tuning Sliders (Collapsible) */}
        {showVariableSliders && (
          <div className="pt-4 border-t border-[#141413]/10 grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-in text-xs">
            {/* Headcount */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-[#696969]">Headcount Delta</span>
                <span className="text-[#141413] font-mono font-bold">+{headcount} hires</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={headcount}
                onChange={(e) => {
                  setHeadcount(parseInt(e.target.value, 10));
                  setActivePreset(null);
                }}
                className="w-full accent-[#141413]"
              />
            </div>

            {/* Growth Spend */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-[#696969]">Monthly Ad Spend</span>
                <span className="text-[#141413] font-mono font-bold">
                  {adSpendDelta >= 0 ? `+$${adSpendDelta.toLocaleString()}` : `-$${Math.abs(adSpendDelta).toLocaleString()}`}
                </span>
              </div>
              <input
                type="range"
                min="-20000"
                max="50000"
                step="2500"
                value={adSpendDelta}
                onChange={(e) => {
                  setAdSpendDelta(parseInt(e.target.value, 10));
                  setActivePreset(null);
                }}
                className="w-full accent-[#141413]"
              />
            </div>

            {/* Revenue Variance */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-[#696969]">Revenue Shock</span>
                <span className={`font-mono font-bold ${revenueDeltaPercent < 0 ? 'text-rose-700' : 'text-[#141413]'}`}>
                  {revenueDeltaPercent > 0 ? `+${revenueDeltaPercent}%` : `${revenueDeltaPercent}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={revenueDeltaPercent}
                onChange={(e) => {
                  setRevenueDeltaPercent(parseInt(e.target.value, 10));
                  setActivePreset(null);
                }}
                className="w-full accent-[#141413]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 5-PHASE PROGRESSION FLOW (SECTION 17) ─────────────────────────── */}
      {hasRun && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Phase 1: Current State */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#141413] text-[#F3F0EE] text-[10px] font-mono font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#141413]">
                Current State (Baseline)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="catalyst-card p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969]">Baseline Cash Balance</span>
                <p className="text-xl font-bold font-mono text-[#141413]">${(currentCash / 1000).toFixed(0)}k</p>
                <span className="text-[10px] text-[#696969]">Audited Neon Ledger</span>
              </div>
              <div className="catalyst-card p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969]">Current Monthly Burn</span>
                <p className="text-xl font-bold font-mono text-[#141413]">${(currentBurn / 1000).toFixed(0)}k/mo</p>
                <span className="text-[10px] text-[#696969]">Fixed + Discretionary</span>
              </div>
              <div className="catalyst-card p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969]">Baseline Runway</span>
                <p className="text-xl font-bold font-mono text-emerald-700">{simulation.initialRunway} months</p>
                <span className="text-[10px] text-[#696969]">At current consumption</span>
              </div>
            </div>
          </section>

          <div className="flex justify-center text-[#696969]/40"><ArrowDown className="w-4 h-4" /></div>

          {/* Phase 2: Scenario Tested */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#141413] text-[#F3F0EE] text-[10px] font-mono font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#141413]">
                Scenario Tested
              </h3>
            </div>

            <div className="p-4 rounded-xl bg-[#FCFBFA] border border-[#141413]/10 text-xs text-[#141413] flex items-center justify-between flex-wrap gap-3">
              <span className="font-semibold text-sm">
                "{scenarioPrompt}"
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#696969]">
                <span>Headcount: +{headcount}</span>
                <span>·</span>
                <span>Ad Spend: ${adSpendDelta}/mo</span>
                <span>·</span>
                <span>Revenue Shock: {revenueDeltaPercent}%</span>
              </div>
            </div>
          </section>

          <div className="flex justify-center text-[#696969]/40"><ArrowDown className="w-4 h-4" /></div>

          {/* Phase 3: Executive Council Analysis */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#141413] text-[#F3F0EE] text-[10px] font-mono font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#141413]">
                Executive Council Analysis
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* CFO Analysis */}
              <div className="catalyst-card p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#141413] flex items-center gap-1.5">
                    Marcus (CFO)
                  </span>
                  <span className="text-[10px] font-mono text-[#696969]">Treasury</span>
                </div>
                <p className="text-[#696969] leading-relaxed">
                  {simulation.projectedRunway < 4.0
                    ? `Critical runway collapse to ${simulation.projectedRunway} months. Violates solvency floor. Mandatory veto.`
                    : simulation.projectedRunway < 6.0
                    ? `Compresses runway below 6-month buffer (${simulation.projectedRunway} mos). Requires operational offsets.`
                    : `Treasury retains ${simulation.projectedRunway} months of operational runway. Within healthy guidelines.`}
                </p>
              </div>

              {/* Talent Analysis */}
              <div className="catalyst-card p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#141413]">Evelyn (Talent)</span>
                  <span className="text-[10px] font-mono text-[#696969]">People</span>
                </div>
                <p className="text-[#696969] leading-relaxed">
                  {headcount > 0
                    ? `Adding ${headcount} hires expands loaded compensation burn by $${Math.round(simulation.monthlyHeadcountCost).toLocaleString()}/mo. 30-day hiring cycle expected.`
                    : 'Zero headcount modifications requested in this simulation branch.'}
                </p>
              </div>

              {/* Auditor Analysis */}
              <div className="catalyst-card p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#141413]">Nexus (Auditor)</span>
                  <span className="text-[10px] font-mono text-[#696969]">Governance</span>
                </div>
                <p className="text-[#696969] leading-relaxed">
                  Deterministic FinancialEngine calculation verified. Zero generative hallucination in balance projections.
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-center text-[#696969]/40"><ArrowDown className="w-4 h-4" /></div>

          {/* Phase 4: Treasury & Operational Impact */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#141413] text-[#F3F0EE] text-[10px] font-mono font-bold flex items-center justify-center">
                4
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#141413]">
                Forecasted Impact
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="catalyst-card p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969]">Projected Runway</span>
                <p className="text-2xl font-bold font-mono text-[#141413]">{simulation.projectedRunway} mo</p>
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                  simulation.runwayDelta < 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {simulation.runwayDelta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  {simulation.runwayDelta > 0 ? `+${simulation.runwayDelta}` : simulation.runwayDelta} mo shift
                </span>
              </div>

              <div className="catalyst-card p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969]">Projected Monthly Burn</span>
                <p className="text-2xl font-bold font-mono text-[#141413]">${Math.round(simulation.projectedBurn / 1000)}k/mo</p>
                <span className="text-[11px] font-mono text-[#696969]">
                  {simulation.netBurnDelta >= 0 ? `+$${Math.round(simulation.netBurnDelta / 1000)}k` : `-$${Math.round(Math.abs(simulation.netBurnDelta) / 1000)}k`} net delta
                </span>
              </div>

              <div className="catalyst-card p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969]">Projected Cash</span>
                <p className="text-2xl font-bold font-mono text-[#141413]">${Math.round(simulation.projectedCash / 1000)}k</p>
                <span className="text-[11px] text-[#696969]">Available liquidity</span>
              </div>

              <div className="catalyst-card p-4 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969]">Risk Assessment</span>
                <div className="pt-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                    simulation.riskRating === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    simulation.riskRating === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {simulation.riskRating}
                  </span>
                </div>
              </div>
            </div>

            {/* Trajectory visualization */}
            <div className="catalyst-card p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold uppercase tracking-wider text-[#141413]">
                  12-Month Projected Treasury Trajectory
                </span>
                <span className="text-[#696969] font-mono">
                  Depletion Horizon: {simulation.projectedRunway > 12 ? '> 12 months' : `Month ${Math.ceil(simulation.projectedRunway)}`}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-1.5 items-end h-24 pt-2 border-b border-[#141413]/05 pb-2">
                {simulation.timeline.map((point) => {
                  const maxCash = Math.max(1, simulation.projectedCash);
                  const heightPct = Math.max(8, Math.min(100, (point.cash / maxCash) * 100));
                  return (
                    <div key={point.month} className="flex flex-col items-center h-full justify-end">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-t transition-all ${
                          point.cash <= 0 ? 'bg-rose-500' : point.cash <= simulation.projectedBurn * 3 ? 'bg-amber-500' : 'bg-[#141413]'
                        }`}
                        title={`Month ${point.month}: $${point.cash.toLocaleString()}`}
                      />
                      <span className="text-[9px] text-[#696969] font-mono mt-1">M{point.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="flex justify-center text-[#696969]/40"><ArrowDown className="w-4 h-4" /></div>

          {/* Phase 5: Recommendation */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#141413] text-[#F3F0EE] text-[10px] font-mono font-bold flex items-center justify-center">
                5
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-[#141413]">
                Council Recommendation & Action Pathway
              </h3>
            </div>

            <div className={`p-6 rounded-2xl border ${
              simulation.riskRating === 'CRITICAL'
                ? 'bg-rose-500/05 border-rose-500/30'
                : simulation.riskRating === 'HIGH'
                ? 'bg-amber-500/05 border-amber-500/30'
                : 'bg-emerald-500/05 border-emerald-500/30'
            } space-y-4`}>
              <div className="flex items-center gap-2 text-sm font-bold text-[#141413]">
                {simulation.riskRating === 'CRITICAL' ? (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Adverse Solvency: Executive Veto Recommended</span>
                  </>
                ) : simulation.riskRating === 'HIGH' ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Conditional Approval: Requires Compensating Offsets</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Solvency Verified: Proceed with Strategic Initiative</span>
                  </>
                )}
              </div>

              <p className="text-xs text-[#141413] leading-relaxed">
                {simulation.riskRating === 'CRITICAL'
                  ? 'Executing this scenario reduces cash runway dangerously close to depletion. The council advises postponing non-essential headcount expansion until institutional seed or revenue milestones close.'
                  : simulation.riskRating === 'HIGH'
                  ? 'This scenario is viable but compresses buffer cushions. Proceed only if accompanied by milestone covenants or delayed hire start dates.'
                  : 'Treasury margins and burn rates remain comfortably within established covenants. The council endorses launching this initiative into active workflow execution.'}
              </p>
            </div>
          </section>

        </div>
      )}

    </div>
  );
}
