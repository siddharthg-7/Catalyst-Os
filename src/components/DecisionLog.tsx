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
    <div id="decision-log-container" className="space-y-6 font-sans">
      
      {/* Ledger Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-5 rounded-[20px] border border-[#141413]/10 bg-white flex items-center justify-between shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="space-y-1">
            <span className="text-[10px] text-[#696969] uppercase tracking-wider font-bold font-mono">Audited Actions</span>
            <p className="text-2xl font-bold text-[#141413] font-mono">{decisions.length}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141413]/05 text-[#141413]">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-[20px] border border-[#141413]/10 bg-white flex items-center justify-between shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="space-y-1">
            <span className="text-[10px] text-[#696969] uppercase tracking-wider font-bold font-mono">Net Capital Shift</span>
            <p className={`text-2xl font-bold font-mono ${
              aggregateMetrics.netCapitalChange >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {formatCurrency(aggregateMetrics.netCapitalChange)}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-[20px] border border-[#141413]/10 bg-white flex items-center justify-between shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="space-y-1">
            <span className="text-[10px] text-[#696969] uppercase tracking-wider font-bold font-mono">Governance Compliance</span>
            <p className="text-2xl font-bold text-emerald-700 font-mono">100%</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Audit Feed */}
      <div className="p-6 rounded-[20px] border border-[#141413]/10 bg-white shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
        <div className="flex items-center justify-between border-b border-[#141413]/10 pb-4 mb-4">
          <div>
            <h4 className="text-sm font-bold text-[#141413]">Audited Executive Signoffs</h4>
            <p className="text-xs text-[#696969] mt-1">Chronological record of corporate actions approved or declined by the founder.</p>
          </div>
          <span className="text-[10px] uppercase font-mono text-[#696969] tracking-wider font-bold">Secured Governance Ledger</span>
        </div>

        {decisions.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {decisions.map((dec) => (
              <div
                key={dec.id}
                className="p-4 rounded-[16px] border border-[#141413]/10 bg-[#FCFBFA] flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    dec.status === 'approved' 
                      ? 'bg-emerald-500/10 text-emerald-700' 
                      : 'bg-rose-500/10 text-rose-700'
                  }`}>
                    {dec.status === 'approved' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-xs font-bold text-[#141413]">{dec.title}</h5>
                      <span className="px-2 py-0.5 text-[8px] font-mono rounded-full bg-[#F3F0EE] border border-[#141413]/10 text-[#696969] font-bold uppercase">
                        {dec.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#696969] leading-relaxed">{dec.description}</p>
                    <p className="text-[10px] text-[#696969] italic flex items-center gap-1">
                      <span>Outcome:</span> {dec.impactText}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1.5 text-[11px] font-mono">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                    dec.status === 'approved' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'
                  }`}>
                    {dec.status.toUpperCase()}
                  </span>
                  
                  <div className="text-[#696969] flex items-center justify-end gap-1 text-[10px]">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(dec.timestamp).toLocaleDateString()}
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-[16px] border border-dashed border-[#141413]/20 text-center text-[#696969] text-xs">
            No decisions logged. Complete strategic approvals to populate audit trail.
          </div>
        )}
      </div>

    </div>
  );
}
