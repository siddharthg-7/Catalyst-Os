/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { DecisionRecord } from '../types';
import { ShieldCheck, Calendar, ArrowUpRight, ArrowDownRight, ClipboardList, TrendingUp } from 'lucide-react';

interface DecisionLogProps {
  decisions: DecisionRecord[];
}

export default function DecisionLog({ decisions }: DecisionLogProps) {
  
  // Calculate aggregate audited metrics
  const aggregateMetrics = useMemo(() => {
    let approvedCount = 0;
    let rejectedCount = 0;
    let netCapitalChange = 0;

    decisions.forEach(d => {
      if (d.status === 'approved') {
        approvedCount++;
        netCapitalChange += d.financialImpact;
      } else {
        rejectedCount++;
      }
    });

    return { approvedCount, rejectedCount, netCapitalChange };
  }, [decisions]);

  const formatCurrency = (val: number) => {
    const sign = val >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(val).toLocaleString()}`;
  };

  return (
    <div id="decision-log-container" className="space-y-6">
      
      {/* Ledger Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-4 rounded-xl border border-[#27272A] bg-[#18181B] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Audited Actions</span>
            <p className="text-2xl font-bold text-white font-mono">{decisions.length}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#27272A] bg-[#18181B] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Net Capital Shift</span>
            <p className={`text-2xl font-bold font-mono ${
              aggregateMetrics.netCapitalChange >= 0 ? 'text-[#22C55E]' : 'text-rose-400'
            }`}>
              {formatCurrency(aggregateMetrics.netCapitalChange)}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#27272A] bg-[#18181B] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Governance Compliance</span>
            <p className="text-2xl font-bold text-[#22C55E] font-mono">100%</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Audit Feed */}
      <div className="p-5 rounded-xl border border-[#27272A] bg-[#18181B] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Audited Executive Signoffs</h4>
            <p className="text-xs text-zinc-400 mt-1">Chronological record of corporate actions approved or declined by the founder.</p>
          </div>
          <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Secured Governance Ledger</span>
        </div>

        {decisions.length > 0 ? (
          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {decisions.map((dec) => (
              <div
                key={dec.id}
                className="p-4 rounded-xl border border-[#27272A]/60 bg-zinc-950/20 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    dec.status === 'approved' 
                      ? 'bg-[#22C55E]/10 text-[#22C55E]' 
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {dec.status === 'approved' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-xs font-semibold text-zinc-100">{dec.title}</h5>
                      <span className="px-2 py-0.5 text-[8px] font-mono rounded bg-zinc-900 border border-[#27272A] text-zinc-400 font-semibold uppercase">
                        {dec.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">{dec.description}</p>
                    <p className="text-[10px] text-zinc-500 font-sans italic flex items-center gap-1">
                      <span>Outcome:</span> {dec.impactText}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1.5 text-[11px] font-mono">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider ${
                    dec.status === 'approved' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {dec.status.toUpperCase()}
                  </span>
                  
                  <div className="text-zinc-500 flex items-center justify-end gap-1 text-[10px]">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(dec.timestamp).toLocaleDateString()}
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-xl border border-dashed border-[#27272A] text-center text-zinc-500 text-xs">
            No decisions logged. Complete strategic approvals to populate audit trail.
          </div>
        )}
      </div>

    </div>
  );
}
