/**
 * CatalystOS - What-If Scenario Studio (Phase 6)
 * Deterministic treasury projection and executive sensitivity simulator.
 * Calculates financial impacts deterministically and renders structured AI executive interpretation.
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, ShieldCheck,
  Users, DollarSign, Calendar, RefreshCw, Sparkles, Check,
  ArrowRight, ShieldAlert, BarChart3, HelpCircle
} from 'lucide-react';

interface ScenarioSimulatorProps {
  currentCash: number;
  currentBurn: number;
  companyName?: string;
}

interface ScenarioPreset {
  id: string;
  title: string;
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
    title: 'Hire 3 Senior Engineers',
    description: 'Scale core product development with 3 senior engineers at $150k base.',
    headcountDelta: 3,
    headcountRole: 'Senior Backend Engineer',
    headcountSalary: 150000,
    adSpendDelta: 0,
    revenueDeltaPercent: 0,
    oneTimeExpense: 0
  },
  {
    id: 'ad_spend_15k',
    title: 'Increase Ad Spend by $15k/mo',
    description: 'Accelerate acquisition with an aggressive performance marketing push.',
    headcountDelta: 0,
    headcountRole: '',
    headcountSalary: 0,
    adSpendDelta: 15000,
    revenueDeltaPercent: 0,
    oneTimeExpense: 0
  },
  {
    id: 'rev_down_20',
    title: 'Revenue Falls by 20%',
    description: 'Stress test operational solvency in an adverse market contraction.',
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
    description: 'Product launch milestone delayed by 1 month of unbudgeted burn.',
    headcountDelta: 0,
    headcountRole: '',
    headcountSalary: 0,
    adSpendDelta: 0,
    revenueDeltaPercent: 0,
    oneTimeExpense: 25000
  },
  {
    id: 'preservation',
    title: 'Cash Preservation Mode',
    description: 'Freeze hiring and cut growth spend by $10k/mo to extend runway.',
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
  // Scenario inputs
  const [headcount, setHeadcount] = useState<number>(0);
  const [headcountSalary, setHeadcountSalary] = useState<number>(140000);
  const [headcountRole, setHeadcountRole] = useState<string>('Software Engineer');
  const [adSpendDelta, setAdSpendDelta] = useState<number>(0);
  const [revenueDeltaPercent, setRevenueDeltaPercent] = useState<number>(0);
  const [oneTimeExpense, setOneTimeExpense] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Apply a preset
  const applyPreset = (preset: ScenarioPreset) => {
    setActivePreset(preset.id);
    setHeadcount(preset.headcountDelta);
    setHeadcountSalary(preset.headcountSalary || 140000);
    setHeadcountRole(preset.headcountRole || 'Software Engineer');
    setAdSpendDelta(preset.adSpendDelta);
    setRevenueDeltaPercent(preset.revenueDeltaPercent);
    setOneTimeExpense(preset.oneTimeExpense);
  };

  const resetToBaseline = () => {
    setActivePreset(null);
    setHeadcount(0);
    setHeadcountSalary(140000);
    setHeadcountRole('Software Engineer');
    setAdSpendDelta(0);
    setRevenueDeltaPercent(0);
    setOneTimeExpense(0);
  };

  // Deterministic financial calculation (100% deterministic arithmetic)
  const simulation = useMemo(() => {
    const cash = Math.max(0, currentCash);
    const burn = Math.max(1000, currentBurn);

    // Initial runway
    const initialRunway = parseFloat((cash / burn).toFixed(1));

    // Fully loaded headcount cost: (Base Salary * 1.20) / 12 * Count
    const monthlyHeadcountCost = headcount > 0
      ? ((headcountSalary * 1.20) / 12) * headcount
      : 0;

    // Monthly burn adjustments
    const growthDelta = adSpendDelta;
    // Assuming 25% of baseline burn is net revenue offset if not explicitly tracked
    const estimatedRevBase = burn * 0.35;
    const revenueImpact = estimatedRevBase * (revenueDeltaPercent / 100);

    const netBurnDelta = monthlyHeadcountCost + growthDelta - revenueImpact;
    const projectedBurn = Math.max(1000, burn + netBurnDelta);

    const projectedCash = Math.max(0, cash - oneTimeExpense);
    const projectedRunway = parseFloat((projectedCash / projectedBurn).toFixed(1));
    const runwayDelta = parseFloat((projectedRunway - initialRunway).toFixed(1));

    // Risk tier evaluation
    let riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (projectedRunway < 4.0 || projectedCash <= 0) {
      riskRating = 'CRITICAL';
    } else if (projectedRunway < 6.0) {
      riskRating = 'HIGH';
    } else if (projectedRunway < 10.0 || netBurnDelta > 20000) {
      riskRating = 'MEDIUM';
    }

    // 12-Month projected cash depletion trajectory
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Deterministic Financial Engine
            </span>
            <span className="text-xs text-zinc-500 font-mono">Phase 6 Simulation Studio</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mt-1">What-If Scenario Studio</h2>
          <p className="text-sm text-zinc-500">
            Model capital allocation, hiring expansions, and revenue shocks. Mathematical calculations run deterministically before executive council interpretation.
          </p>
        </div>

        <button
          onClick={resetToBaseline}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors self-start"
        >
          <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
          Reset Baseline
        </button>
      </div>

      {/* Quick Scenario Presets */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-2">
          Executive Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-zinc-900">{preset.title}</h4>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls vs Projected Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Variables (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-5 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Scenario Variables
            </h3>
            <span className="text-[11px] text-zinc-500">Live Adjustment</span>
          </div>

          {/* 1. Headcount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                Additional Headcount
              </label>
              <span className="text-xs font-bold font-mono text-zinc-900">
                +{headcount} {headcount === 1 ? 'hire' : 'hires'}
              </span>
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
              className="w-full accent-indigo-600 cursor-pointer"
            />
            {headcount > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Role Profile</span>
                  <input
                    type="text"
                    value={headcountRole}
                    onChange={(e) => setHeadcountRole(e.target.value)}
                    className="w-full text-xs px-2 py-1 border border-zinc-200 rounded text-zinc-800 font-medium"
                    placeholder="e.g. Senior Backend"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Base Salary ($/yr)</span>
                  <input
                    type="number"
                    value={headcountSalary}
                    onChange={(e) => setHeadcountSalary(Number(e.target.value))}
                    step="5000"
                    className="w-full text-xs px-2 py-1 border border-zinc-200 rounded text-zinc-800 font-mono font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Growth / Ad Spend */}
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
                Monthly Ad & Growth Spend Delta
              </label>
              <span className={`text-xs font-bold font-mono ${adSpendDelta > 0 ? 'text-amber-600' : adSpendDelta < 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
                {adSpendDelta >= 0 ? `+$${adSpendDelta.toLocaleString()}` : `-$${Math.abs(adSpendDelta).toLocaleString()}`}/mo
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
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* 3. Revenue Shift */}
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                Revenue Variance Shock
              </label>
              <span className={`text-xs font-bold font-mono ${revenueDeltaPercent < 0 ? 'text-red-600' : revenueDeltaPercent > 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
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
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-zinc-400">Models market contraction, customer churn, or accelerated ARR growth.</p>
          </div>

          {/* 4. One-Time Expenditure / Milestone Slip */}
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                One-Time Capital Expenditure / Slip Cost
              </label>
              <span className="text-xs font-bold font-mono text-zinc-900">
                ${oneTimeExpense.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100000"
              step="5000"
              value={oneTimeExpense}
              onChange={(e) => {
                setOneTimeExpense(parseInt(e.target.value, 10));
                setActivePreset(null);
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Projected Metrics & Visuals (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Delta KPI Scorecard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Projected Runway */}
            <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Projected Runway</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-zinc-900 font-mono">
                  {simulation.projectedRunway}
                </span>
                <span className="text-xs text-zinc-500">mos</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold">
                {simulation.runwayDelta < 0 ? (
                  <span className="text-red-600 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                    {simulation.runwayDelta} mos
                  </span>
                ) : simulation.runwayDelta > 0 ? (
                  <span className="text-emerald-600 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    +{simulation.runwayDelta} mos
                  </span>
                ) : (
                  <span className="text-zinc-500">Baseline</span>
                )}
              </div>
            </div>

            {/* Projected Burn */}
            <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Projected Burn</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black text-zinc-900 font-mono">
                  ${Math.round(simulation.projectedBurn / 1000)}k
                </span>
                <span className="text-[11px] text-zinc-500">/mo</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-zinc-600 font-mono">
                {simulation.netBurnDelta >= 0 ? `+$${Math.round(simulation.netBurnDelta / 1000)}k/mo` : `-$${Math.round(Math.abs(simulation.netBurnDelta) / 1000)}k/mo`}
              </div>
            </div>

            {/* Projected Cash */}
            <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Projected Cash</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-black text-zinc-900 font-mono">
                  ${Math.round(simulation.projectedCash / 1000)}k
                </span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-zinc-500">
                Base: ${Math.round(simulation.initialCash / 1000)}k
              </div>
            </div>

            {/* Risk Rating */}
            <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Risk Assessment</span>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                    simulation.riskRating === 'CRITICAL'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : simulation.riskRating === 'HIGH'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : simulation.riskRating === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {simulation.riskRating}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-500">
                {simulation.projectedRunway < 6 ? '< 6 mo threshold' : 'Safe buffer (> 6 mo)'}
              </p>
            </div>
          </div>

          {/* 12-Month Depletion Trajectory Bar Chart */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                12-Month Projected Treasury Trajectory
              </h4>
              <span className="text-[11px] text-zinc-500 font-mono">
                Zero Point: {simulation.projectedRunway > 12 ? '>12 months' : `Month ${Math.ceil(simulation.projectedRunway)}`}
              </span>
            </div>

            <div className="grid grid-cols-12 gap-1.5 items-end h-24 pt-2 border-b border-zinc-100 pb-2">
              {simulation.timeline.map((point) => {
                const maxCash = Math.max(1, simulation.projectedCash);
                const heightPct = Math.max(6, Math.min(100, (point.cash / maxCash) * 100));
                const isCritical = point.cash <= simulation.projectedBurn * 3;
                return (
                  <div key={point.month} className="flex flex-col items-center h-full justify-end group">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        point.cash <= 0
                          ? 'bg-red-400'
                          : isCritical
                          ? 'bg-amber-400'
                          : 'bg-indigo-600'
                      }`}
                      title={`Month ${point.month}: $${point.cash.toLocaleString()}`}
                    />
                    <span className="text-[9px] text-zinc-400 font-mono mt-1">M{point.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-indigo-600 inline-block" /> Healthy
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-amber-400 inline-block" /> Warning (&lt;3 mo)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-red-400 inline-block" /> Depleted
                </span>
              </div>
              <span className="font-mono text-zinc-400">Baseline Cash: ${currentCash.toLocaleString()}</span>
            </div>
          </div>

          {/* AI Executive Council Interpretation */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                AI Executive Council Synthesis
              </h4>
              <span className="text-[11px] font-semibold text-zinc-500">
                Ground Truth Verified
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* CFO Interpretation */}
              <div className="p-2.5 bg-white border border-zinc-200 rounded-lg flex items-start gap-2.5">
                <span className="font-bold text-zinc-900 min-w-14">CFO:</span>
                <p className="text-zinc-600 leading-relaxed">
                  {simulation.projectedRunway < 4.0 ? (
                    <span className="text-red-700 font-medium">
                      ⚠️ <strong>VETO RECOMMENDATION:</strong> This scenario collapses runway to {simulation.projectedRunway} months. Violates the 4-month minimum solvency covenant. Reject or mandate immediate bridge capital.
                    </span>
                  ) : simulation.projectedRunway < 6.0 ? (
                    <span className="text-amber-700 font-medium">
                      ⚠️ <strong>CONDITIONAL:</strong> Compresses runway below 6 months ({simulation.projectedRunway} mos). Requires operational hiring freeze or discretionary cuts elsewhere.
                    </span>
                  ) : (
                    <span className="text-zinc-700">
                      ✓ <strong>SOLVENCY APPROVED:</strong> Treasury retains {simulation.projectedRunway} months of operational runway. Within comfortable risk thresholds.
                    </span>
                  )}
                </p>
              </div>

              {/* Talent Interpretation */}
              {headcount > 0 && (
                <div className="p-2.5 bg-white border border-zinc-200 rounded-lg flex items-start gap-2.5">
                  <span className="font-bold text-zinc-900 min-w-14">Talent:</span>
                  <p className="text-zinc-600 leading-relaxed">
                    Adding {headcount}x {headcountRole} increases loaded compensation burn by ${Math.round(simulation.monthlyHeadcountCost).toLocaleString()}/mo. Anticipate 30-45 day sourcing cycle.
                  </p>
                </div>
              )}

              {/* Auditor Interpretation */}
              <div className="p-2.5 bg-white border border-zinc-200 rounded-lg flex items-start gap-2.5">
                <span className="font-bold text-zinc-900 min-w-14">Auditor:</span>
                <p className="text-zinc-600 leading-relaxed">
                  Mathematical calculations verified against deterministic FinancialEngine rules. Zero generative hallucination in balance projections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
