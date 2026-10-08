/**
 * CatalystOS - High-Assurance Founder Approval Center (Phase 2.2 & 2.3)
 * Non-binary human-in-the-loop governance:
 * - 3 Action Pathways: Approve, Approve with Modifications, Reject with Directives
 * - Before vs After State Comparison (Cash, Monthly Burn, Runway, Risk)
 * - Explicit Risk Tier (Low/Medium/High/Critical) and Reversibility Badging
 */

import React, { useState, useMemo } from 'react';
import { Deliverable } from '../types';
import {
  CheckCircle2, XCircle, AlertCircle, FileText, ChevronRight,
  TrendingUp, TrendingDown, Edit3, Shield, SlidersHorizontal,
  ArrowRight, AlertTriangle, Sparkles, Check, X, RefreshCw
} from 'lucide-react';

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
  const [selectedItemId, setSelectedItemId] = useState<string>(approvals[0]?.id || '');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModifying, setIsModifying] = useState(false);

  // Modification form state
  const [customCost, setCustomCost] = useState<string>('');
  const [customHeadcount, setCustomHeadcount] = useState<string>('1');
  const [customConditions, setCustomConditions] = useState<string>('');

  const selectedItem = approvals.find(a => a.id === selectedItemId) || approvals[0];

  // Derive risk tier & reversibility deterministically
  const itemGovernance = useMemo(() => {
    if (!selectedItem) return { risk: 'LOW' as const, reversibility: 'REVERSIBLE' as const };
    const cost = Math.abs(selectedItem.financialChange || 0);
    const type = selectedItem.type.toLowerCase();

    if (type === 'contract' || cost >= 50000) {
      return { risk: 'CRITICAL' as const, reversibility: 'IRREVERSIBLE' as const };
    }
    if (cost >= 15000 || type === 'financials') {
      return { risk: 'HIGH' as const, reversibility: 'IRREVERSIBLE' as const };
    }
    if (type === 'marketing_plan' || cost > 0) {
      return { risk: 'MEDIUM' as const, reversibility: 'REVERSIBLE' as const };
    }
    return { risk: 'LOW' as const, reversibility: 'REVERSIBLE' as const };
  }, [selectedItem]);

  // Deterministic Before vs After Calculations
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
      // If large annual commitment, amortize across 12 months; otherwise add to monthly burn
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

      // Advance to next remaining approval
      const remaining = approvals.filter(a => a.id !== selectedItem.id);
      if (remaining.length > 0) {
        setSelectedItemId(remaining[0].id);
      } else {
        setSelectedItemId('');
      }
    } catch (err) {
      console.error('[ApprovalQueue] Review error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="approval-queue-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* ── Left Sidebar: Queue Items ───────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#141413]">Pending Authorizations</h4>
            <span className="text-[11px] text-[#696969]">Human-in-the-loop decision gate</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs bg-rose-50 border border-rose-200 text-rose-800 font-mono font-bold">
            {approvals.length} Blocked
          </span>
        </div>

        {approvals.length > 0 ? (
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {approvals.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const cost = item.financialChange || 0;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setIsModifying(false);
                  }}
                  className={`w-full p-4 rounded-[18px] border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#141413] shadow-[rgba(0,0,0,0.06)_0px_4px_16px_0px]'
                      : 'bg-[#FCFBFA] border-[#141413]/10 hover:bg-white hover:border-[#141413]/25'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isSelected ? 'bg-[#141413] text-[#F3F0EE]' : 'bg-[#141413]/05 text-[#141413]'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono text-[#696969] tracking-wider font-bold">
                        {item.type}
                      </span>
                      {cost !== 0 && (
                        <span className={`text-[10px] font-mono font-bold ${
                          cost > 0 ? 'text-emerald-700' : 'text-[#141413]'
                        }`}>
                          {cost > 0 ? '+' : ''}${Math.round(cost / 1000)}k
                        </span>
                      )}
                    </div>
                    <h5 className="mt-1 text-xs font-bold text-[#141413] line-clamp-1">{item.title}</h5>
                    <p className="mt-1 text-[11px] text-[#696969] line-clamp-2 leading-relaxed">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-[20px] border border-dashed border-[#141413]/20 bg-white text-center text-xs text-[#696969] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-[#141413]">Queue Clear</h4>
            <p>No operational commitments or contracts blocked for signature.</p>
          </div>
        )}
      </div>

      {/* ── Main Review Canvas ──────────────────────────────────────── */}
      <div className="lg:col-span-2">
        {selectedItem ? (
          <div className="p-6 md:p-8 rounded-[24px] border border-[#141413]/10 bg-white space-y-6 flex flex-col justify-between shadow-[rgba(0,0,0,0.03)_0px_4px_20px_0px]">
            
            <div className="space-y-5">
              
              {/* Header Badging */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 text-[10px] font-mono rounded-full bg-[#141413]/05 text-[#141413] border border-[#141413]/10 uppercase font-bold">
                      {selectedItem.type}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full ${
                      itemGovernance.risk === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      itemGovernance.risk === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-sky-100 text-sky-800 border border-sky-200'
                    }`}>
                      {itemGovernance.risk} Risk
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full ${
                      itemGovernance.reversibility === 'IRREVERSIBLE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {itemGovernance.reversibility}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-[#141413] leading-snug">
                    {selectedItem.title}
                  </h3>
                </div>

                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 font-mono text-xs flex items-center gap-1.5 font-bold shrink-0">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Awaiting Signature
                </span>
              </div>

              {/* ── BEFORE vs AFTER State Comparison Panel ─────────────── */}
              <div className="p-4 rounded-[16px] bg-[#FCFBFA] border border-[#141413]/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#141413]" />
                    Deterministic Impact Forecast (Current vs Proposed)
                  </span>
                  <span className="text-[10px] font-mono text-[#696969]">Neon Treasury Sync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Cash Balance */}
                  <div className="p-3 rounded-[12px] bg-white border border-[#141413]/06 space-y-1">
                    <span className="text-[10px] text-[#696969] block font-mono uppercase font-bold">Cash Balance</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-[#696969]">${(currentCash / 1000).toFixed(1)}k</span>
                      <ArrowRight className="w-3 h-3 text-[#696969]/50" />
                      <span className="text-xs font-mono font-bold text-[#141413]">${(stateProjection.projectedCash / 1000).toFixed(1)}k</span>
                    </div>
                  </div>

                  {/* Monthly Burn */}
                  <div className="p-3 rounded-[12px] bg-white border border-[#141413]/06 space-y-1">
                    <span className="text-[10px] text-[#696969] block font-mono uppercase font-bold">Monthly Burn</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-[#696969]">${(currentBurn / 1000).toFixed(1)}k/mo</span>
                      <ArrowRight className="w-3 h-3 text-[#696969]/50" />
                      <span className="text-xs font-mono font-bold text-[#141413]">${(stateProjection.projectedBurn / 1000).toFixed(1)}k/mo</span>
                    </div>
                  </div>

                  {/* Active Runway */}
                  <div className="p-3 rounded-[12px] bg-white border border-[#141413]/06 space-y-1">
                    <span className="text-[10px] text-[#696969] block font-mono uppercase font-bold">Active Runway</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-[#696969]">{stateProjection.initialRunway} mo</span>
                      <ArrowRight className="w-3 h-3 text-[#696969]/50" />
                      <span className={`text-xs font-mono font-bold ${
                        Number(stateProjection.projectedRunway) < 6 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {stateProjection.projectedRunway} mo
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deliverable Document Draft Viewer */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-[#696969] uppercase font-mono tracking-wider font-bold block">
                  Deliverable Legal Charter & Terms
                </span>
                <div className="p-5 rounded-[16px] border border-[#141413]/10 bg-[#F3F0EE] max-h-[220px] overflow-y-auto text-xs text-[#141413] leading-relaxed font-mono whitespace-pre-wrap shadow-inner">
                  {selectedItem.content}
                </div>
              </div>

              {/* ── Inline Modification Drawer (When Activated) ────────── */}
              {isModifying && (
                <div className="p-4 rounded-[16px] bg-amber-50/70 border border-amber-300 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 font-sans">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Founder Parameter Adjustments
                    </span>
                    <button
                      onClick={() => setIsModifying(false)}
                      className="text-amber-800 hover:text-amber-950 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                        Adjusted Total Budget / Salary (USD)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 115000"
                        value={customCost}
                        onChange={(e) => setCustomCost(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-[10px] bg-white border border-amber-300 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                        Adjusted Headcount Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={customHeadcount}
                        onChange={(e) => setCustomHeadcount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-[10px] bg-white border border-amber-300 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                      Conditional Directives (e.g. require 1-year cliff, cap ad credits)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Base capped at $115k; review after Q2 milestones"
                      value={customConditions}
                      onChange={(e) => setCustomConditions(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-[10px] bg-white border border-amber-300 text-xs"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* ── Review Action Controls ──────────────────────────────── */}
            <div className="space-y-4 pt-4 border-t border-[#141413]/10">
              
              <div>
                <label className="block text-[10px] font-bold text-[#696969] mb-1.5 font-mono uppercase tracking-wider">
                  Founder Feedback Directives (Attached to Decision Audit Trail)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Require stricter SLA penalties, or adjust stock option cliff..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/15 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                
                {/* Modify Toggle */}
                <button
                  type="button"
                  onClick={() => setIsModifying(!isModifying)}
                  className="px-4 py-2.5 rounded-[14px] bg-[#FCFBFA] border border-[#141413]/15 hover:border-[#141413]/30 text-xs font-bold text-[#141413] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#696969]" />
                  <span>{isModifying ? 'Hide Modifications' : 'Modify Parameters'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* Reject Pathway */}
                  <button
                    onClick={() => handleAction('reject')}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-[14px] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject with Directives</span>
                  </button>

                  {/* Modified Authorization Pathway */}
                  {isModifying ? (
                    <button
                      onClick={() => handleAction('modify')}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-[14px] bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm Modified Authorization</span>
                    </button>
                  ) : (
                    /* Clean Approval Pathway */
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-[14px] bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Authorize</span>
                    </button>
                  )}
                </div>

              </div>

            </div>

          </div>
        ) : (
          <div className="p-12 rounded-[24px] border border-dashed border-[#141413]/20 bg-white text-center text-[#696969] text-xs flex flex-col items-center justify-center min-h-[400px] space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
            <h4 className="text-sm font-bold text-[#141413]">All Clear!</h4>
            <p className="max-w-sm">No operational proposals or corporate agreements require founder signature right now.</p>
          </div>
        )}
      </div>

    </div>
  );
}
