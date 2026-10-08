/**
 * CatalystOS - Founder Decision Inbox & Approvals (Section 14)
 * Engineered as a clean, scannable Decision Inbox table.
 * Clicking 'Review' opens a focused slide-over evaluation drawer with Before vs After state projections,
 * parameter modification sliders, and high-assurance audit trails.
 */

import React, { useState, useMemo } from 'react';
import { Deliverable } from '../types';
import {
  CheckCircle2, XCircle, AlertCircle, FileText, ChevronRight,
  TrendingUp, TrendingDown, Edit3, Shield, SlidersHorizontal,
  ArrowRight, AlertTriangle, Sparkles, Check, X, RefreshCw,
  Search, Filter, ExternalLink
} from 'lucide-react';
import Section from './Section';

interface ApprovalQueueProps {
  approvals: Deliverable[];
  onReviewItem: (id: string, action: 'approve' | 'modify' | 'reject', feedback?: string, modifications?: any) => Promise<void>;
  currentCash?: number;
  currentBurn?: number;
}

export default function ApprovalQueue({
  approvals,
  onReviewItem,
  currentCash = 250000,
  currentBurn = 15000
}: ApprovalQueueProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Review Drawer state
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModifying, setIsModifying] = useState(false);

  // Modification form state
  const [customCost, setCustomCost] = useState<string>('');
  const [customHeadcount, setCustomHeadcount] = useState<string>('1');
  const [customConditions, setCustomConditions] = useState<string>('');

  const selectedItem = approvals.find(a => a.id === selectedItemId) || null;

  // Filtered approvals list
  const filteredApprovals = useMemo(() => {
    return approvals.filter(item => {
      if (filterType !== 'ALL' && item.type.toUpperCase() !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [approvals, filterType, searchQuery]);

  // Derive risk tier & reversibility deterministically
  const getItemGovernance = (item: Deliverable) => {
    const cost = Math.abs(item.financialChange || 0);
    const type = item.type.toLowerCase();

    if (type === 'contract' || cost >= 50000) {
      return { risk: 'CRITICAL' as const, reversibility: 'IRREVERSIBLE' as const, rec: 'Helena (Legal)' };
    }
    if (cost >= 15000 || type === 'financials') {
      return { risk: 'HIGH' as const, reversibility: 'IRREVERSIBLE' as const, rec: 'Marcus (Finance)' };
    }
    if (type === 'marketing_plan' || cost > 0) {
      return { risk: 'MEDIUM' as const, reversibility: 'REVERSIBLE' as const, rec: 'Dax (Growth)' };
    }
    return { risk: 'LOW' as const, reversibility: 'REVERSIBLE' as const, rec: 'Atlas (CEO)' };
  };

  // Deterministic Before vs After Calculations for currently reviewed item
  const stateProjection = useMemo(() => {
    if (!selectedItem) {
      return {
        initialRunway: (currentCash / currentBurn).toFixed(1),
        projectedCash: currentCash,
        projectedBurn: currentBurn,
        projectedRunway: (currentCash / currentBurn).toFixed(1)
      };
    }

    const finChange = isModifying && customCost
      ? -Math.abs(parseFloat(customCost) || 0)
      : (selectedItem.financialChange || 0);

    let projectedCash = currentCash;
    let projectedBurn = currentBurn;

    if (finChange > 0) {
      projectedCash += finChange;
    } else if (finChange < 0) {
      const absCost = Math.abs(finChange);
      const monthlyAdd = absCost > 20000 ? Math.round(absCost / 12) : absCost;
      projectedBurn += monthlyAdd;
    }

    const initialRunway = currentBurn > 0 ? (currentCash / currentBurn).toFixed(1) : '99+';
    const projectedRunway = projectedBurn > 0 ? (projectedCash / projectedBurn).toFixed(1) : '99+';

    return {
      initialRunway,
      projectedCash,
      projectedBurn,
      projectedRunway
    };
  }, [selectedItem, currentCash, currentBurn, isModifying, customCost]);

  const handleAction = async (action: 'approve' | 'modify' | 'reject') => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      let modifications: any = undefined;
      if (action === 'modify') {
        modifications = {
          financialChange: customCost ? -Math.abs(parseFloat(customCost) || 0) : selectedItem.financialChange,
          headcount: parseInt(customHeadcount, 10) || 1,
          conditions: customConditions.trim() || 'Custom founder constraints applied'
        };
      }

      await onReviewItem(selectedItem.id, action, feedback, modifications);
      setFeedback('');
      setIsModifying(false);
      setCustomCost('');
      setCustomConditions('');
      setSelectedItemId(null);
    } catch (err) {
      console.error('[ApprovalQueue] Review error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGovernance = selectedItem ? getItemGovernance(selectedItem) : null;

  return (
    <div id="approval-queue-container" className="space-y-6 font-sans">
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <Section delay={0.05} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141413]/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#696969]">
              Executive Governance
            </span>
            <span className="w-1 h-1 rounded-full bg-[#141413]/30" />
            <span className="text-[11px] font-mono text-[#696969]">
              {approvals.length} Requiring Sign-Off
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
            Decision Inbox
          </h1>
          <p className="text-sm text-[#696969] mt-1 max-w-2xl">
            Human-in-the-loop review queue for contracts, budget expansions, and high-impact council deliverables.
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white border border-[#141413]/10 text-xs font-mono flex items-center gap-3 shadow-sm">
            <div>
              <span className="text-[#696969] block text-[10px] uppercase">Cash Impact</span>
              <span className="font-bold text-[#141413]">
                ${approvals.reduce((acc, a) => acc + Math.abs(a.financialChange || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="w-px h-6 bg-[#141413]/10" />
            <div>
              <span className="text-[#696969] block text-[10px] uppercase">Pending</span>
              <span className="font-bold text-amber-700">{approvals.length} items</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── SEARCH & FILTER BAR ────────────────────────────────────────────── */}
      <Section delay={0.1} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#696969] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pending decisions by title or context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#141413]/15 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-[#696969] font-medium shrink-0">Filter:</span>
          {['ALL', 'CONTRACT', 'FINANCIALS', 'MARKETING_PLAN'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === type
                  ? 'bg-[#141413] text-[#F3F0EE]'
                  : 'bg-white border border-[#141413]/10 text-[#696969] hover:text-[#141413]'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </Section>

      {/* ── DECISION INBOX TABLE / ROWS ───────────────────────────────────── */}
      <Section delay={0.15}>
      {filteredApprovals.length > 0 ? (
        <div className="catalyst-card rounded-2xl overflow-hidden divide-y divide-[#141413]/05">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-[#FCFBFA] text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] border-b border-[#141413]/10">
            <div className="col-span-4">Decision & Context</div>
            <div className="col-span-2">Recommended By</div>
            <div className="col-span-2">Treasury Impact</div>
            <div className="col-span-2">Risk / Reversibility</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {/* Table Rows */}
          {filteredApprovals.map((item) => {
            const gov = getItemGovernance(item);
            const cost = item.financialChange || 0;

            return (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[#FCFBFA] transition-colors group"
              >
                {/* Decision & Context (4 cols) */}
                <div className="md:col-span-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="tech-badge">
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-[#696969]">Score: {item.impact}/10</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#141413] leading-snug">{item.title}</h4>
                  <p className="text-[11px] text-[#696969] line-clamp-1 leading-normal">{item.description}</p>
                </div>

                {/* Recommended By (2 cols) */}
                <div className="md:col-span-2 flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#141413]/10 text-[#141413] flex items-center justify-center font-bold text-[10px] font-mono">
                    {gov.rec[0]}
                  </div>
                  <span className="font-semibold text-[#141413]">{gov.rec}</span>
                </div>

                {/* Impact (2 cols) */}
                <div className="md:col-span-2 text-xs font-mono">
                  {cost !== 0 ? (
                    <span className={`font-bold ${cost > 0 ? 'text-emerald-700' : 'text-[#141413]'}`}>
                      {cost > 0 ? '+' : ''}${Math.abs(cost).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[#696969]">Neutral ($0)</span>
                  )}
                  <span className="text-[10px] text-[#696969] block font-sans">Total capital shift</span>
                </div>

                {/* Risk / Reversibility (2 cols) */}
                <div className="md:col-span-2 space-y-1">
                  <span className={`inline-flex px-2 py-0.5 text-[9px] font-mono font-bold rounded-full ${
                    gov.risk === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    gov.risk === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-sky-100 text-sky-800 border border-sky-200'
                  }`}>
                    {gov.risk} Risk
                  </span>
                  <span className="text-[10px] text-[#696969] block font-mono">
                    {gov.reversibility}
                  </span>
                </div>

                {/* Primary Action: Review (2 cols) */}
                <div className="md:col-span-2 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setIsModifying(false);
                      setFeedback('');
                    }}
                    className="interactive-btn magnetic-btn px-4 py-2 rounded-xl bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Review</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-16 rounded-2xl border border-dashed border-[#141413]/20 bg-white text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#141413]">Decision Inbox Clear</h3>
          <p className="text-xs text-[#696969] max-w-sm mx-auto leading-relaxed">
            All AI executive operations are currently executing within founder-authorized parameters. No pending gates blocked.
          </p>
        </div>
      )}
      </Section>

      {/* ── FOCUSED EVALUATION DRAWER / MODAL ──────────────────────────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm flex items-center justify-end">
          <div className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-fade-in border-l border-[#141413]/10">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-[#141413]/10 space-y-3 sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#141413]/05 text-[#141413] border border-[#141413]/10 uppercase">
                    {selectedItem.type.replace('_', ' ')}
                  </span>
                  {selectedGovernance && (
                    <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                      selectedGovernance.risk === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                      selectedGovernance.risk === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                      'bg-sky-100 text-sky-800'
                    }`}>
                      {selectedGovernance.risk} Risk
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedItemId(null)}
                  className="p-1.5 rounded-full hover:bg-[#141413]/05 text-[#696969] hover:text-[#141413] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#141413] leading-snug">{selectedItem.title}</h3>
                <p className="text-xs text-[#696969] mt-1">{selectedItem.description}</p>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              
              {/* Deterministic Impact Projections */}
              <div className="p-4 rounded-xl bg-[#FCFBFA] border border-[#141413]/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#141413]" />
                    Forecasted Runway & Treasury Shift
                  </span>
                  <span className="text-[10px] font-mono text-[#696969]">Neon Treasury Sync</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-white border border-[#141413]/05 space-y-1">
                    <span className="text-[9px] text-[#696969] block font-mono uppercase font-bold">Cash Balance</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-[#696969]">${(currentCash / 1000).toFixed(0)}k</span>
                      <ArrowRight className="w-3 h-3 text-[#696969]/50" />
                      <span className="text-xs font-mono font-bold text-[#141413]">${(stateProjection.projectedCash / 1000).toFixed(0)}k</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#141413]/05 space-y-1">
                    <span className="text-[9px] text-[#696969] block font-mono uppercase font-bold">Monthly Burn</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-[#696969]">${(currentBurn / 1000).toFixed(0)}k</span>
                      <ArrowRight className="w-3 h-3 text-[#696969]/50" />
                      <span className="text-xs font-mono font-bold text-[#141413]">${(stateProjection.projectedBurn / 1000).toFixed(0)}k</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-[#141413]/05 space-y-1">
                    <span className="text-[9px] text-[#696969] block font-mono uppercase font-bold">Runway</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-[#696969]">{stateProjection.initialRunway}m</span>
                      <ArrowRight className="w-3 h-3 text-[#696969]/50" />
                      <span className="text-xs font-mono font-bold text-emerald-700">{stateProjection.projectedRunway}m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charter / Terms Content */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#696969] block">
                  Deliverable Legal Charter & Terms
                </span>
                <div className="p-4 rounded-xl border border-[#141413]/10 bg-[#FCFBFA] max-h-56 overflow-y-auto text-xs font-mono text-[#141413] leading-relaxed whitespace-pre-wrap">
                  {selectedItem.content}
                </div>
              </div>

              {/* Inline Modifications Section */}
              {isModifying && (
                <div className="p-4 rounded-xl bg-amber-500/05 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Parameter Modifications
                    </span>
                    <button
                      onClick={() => setIsModifying(false)}
                      className="text-xs text-amber-800 hover:underline"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">Adjusted Budget (USD)</label>
                      <input
                        type="number"
                        placeholder="e.g. 115000"
                        value={customCost}
                        onChange={(e) => setCustomCost(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">Headcount Adjust</label>
                      <input
                        type="number"
                        value={customHeadcount}
                        onChange={(e) => setCustomHeadcount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">Founder Directives</label>
                    <input
                      type="text"
                      placeholder="e.g. Include 1-year cliff, review at quarterly board meeting"
                      value={customConditions}
                      onChange={(e) => setCustomConditions(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Feedback Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] block">
                  Directives for Executive Council
                </label>
                <input
                  type="text"
                  placeholder="Optional directives attached to audit ledger..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#141413]/15 text-xs text-[#141413] focus:outline-none focus:border-[#141413]"
                />
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-5 border-t border-[#141413]/10 bg-[#FCFBFA] space-y-3 sticky bottom-0">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModifying(!isModifying)}
                  className="px-3.5 py-2 rounded-xl border border-[#141413]/15 bg-white text-xs font-bold text-[#141413] hover:border-[#141413] flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#696969]" />
                  <span>{isModifying ? 'Hide Adjustments' : 'Modify Parameters'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>

                  {isModifying ? (
                    <button
                      onClick={() => handleAction('modify')}
                      disabled={isSubmitting}
                      className="interactive-btn px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Authorize with Modifications
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={isSubmitting}
                      className="interactive-btn px-5 py-2 rounded-xl bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Sign
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
