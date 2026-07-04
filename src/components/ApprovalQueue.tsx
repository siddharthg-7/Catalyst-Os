/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Deliverable } from '../types';
import { CheckCircle2, XCircle, AlertCircle, FileText, ChevronRight, TrendingUp, Info } from 'lucide-react';

interface ApprovalQueueProps {
  approvals: Deliverable[];
  onReviewItem: (id: string, action: 'approve' | 'reject', feedback?: string) => Promise<void>;
}

export default function ApprovalQueue({ approvals, onReviewItem }: ApprovalQueueProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>(approvals[0]?.id || '');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItem = approvals.find(a => a.id === selectedItemId) || approvals[0];

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await onReviewItem(selectedItem.id, action, feedback);
      setFeedback('');
      // Reset selection
      const remaining = approvals.filter(a => a.id !== selectedItem.id);
      if (remaining.length > 0) {
        setSelectedItemId(remaining[0].id);
      } else {
        setSelectedItemId('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="approval-queue-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left List of pending approvals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">Pending Founder Review</h4>
          <span className="px-2 py-0.5 rounded-full text-xs bg-[#18181B] border border-[#27272A] text-zinc-300 font-mono">
            {approvals.length} Blocked
          </span>
        </div>

        {approvals.length > 0 ? (
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {approvals.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                  (selectedItem?.id === item.id)
                    ? 'bg-[#18181B] border-[#27272A] shadow-md shadow-[#6366F1]/5'
                    : 'bg-[#18181B]/30 border-[#27272A]/60 hover:bg-[#18181B]/60 hover:border-[#27272A]'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#6366F1]/10 text-[#6366F1] shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider font-semibold">
                      {item.type}
                    </span>
                    {item.financialChange !== undefined && (
                      <span className={`text-[10px] font-mono font-bold ${
                        item.financialChange > 0 ? 'text-[#22C55E]' : 'text-rose-400'
                      }`}>
                        {item.financialChange > 0 ? '+' : ''}${Math.round(item.financialChange / 1000)}k
                      </span>
                    )}
                  </div>
                  <h5 className="mt-1.5 text-xs font-semibold text-zinc-200 line-clamp-1">{item.title}</h5>
                  <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-12 rounded-xl border border-dashed border-[#27272A] text-center text-xs text-zinc-500">
            ✓ Approval queue cleared. No actions blocked.
          </div>
        )}
      </div>

      {/* Main Review Canvas */}
      <div className="lg:col-span-2">
        {selectedItem ? (
          <div className="p-6 rounded-xl border border-[#27272A] bg-[#18181B] space-y-6 flex flex-col justify-between shadow-sm">
            
            {/* Top Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-0.5 text-[10px] font-mono rounded-full bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 uppercase">
                    Stage Deliverable: {selectedItem.type}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2 leading-snug">{selectedItem.title}</h3>
                </div>
                
                <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Awaiting Signature
                </span>
              </div>

              {/* Render simulated impact */}
              <div className="p-4 rounded-lg bg-zinc-950/60 border border-[#27272A]/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">Estimated Runway Impact</span>
                  <p className="text-xs font-semibold text-zinc-200">{selectedItem.impact}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">Treasury Allocation</span>
                  <p className={`text-xs font-mono font-bold ${
                    selectedItem.financialChange && selectedItem.financialChange > 0 ? 'text-[#22C55E]' : 'text-zinc-200'
                  }`}>
                    {selectedItem.financialChange ? `${selectedItem.financialChange > 0 ? '+' : ''}$${selectedItem.financialChange.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono tracking-wider">Departmental Adjustments</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedItem.metricChanges && Object.entries(selectedItem.metricChanges).map(([metric, change]) => (
                      <span key={metric} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        change > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {metric.replace('Health', '').toUpperCase()} {change > 0 ? '+' : ''}{change}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vetted Markdown Document Content */}
              <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">Deliverable Document Draft</span>
                <div className="p-5 rounded-lg border border-[#27272A] bg-zinc-950/80 max-h-[300px] overflow-y-auto text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                  {selectedItem.content}
                </div>
              </div>
            </div>

            {/* Bottom Review Controls */}
            <div className="space-y-4 pt-4 border-t border-[#27272A]">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Founder Feedback Instructions (Optional upon Rejection)</label>
                <input
                  type="text"
                  placeholder="e.g. Reduce options allocation to 1% or require stricter service standards..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-[#6366F1]"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleAction('reject')}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg border border-rose-900/40 bg-rose-950/10 hover:bg-rose-950/20 text-xs font-bold text-rose-400 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Reject & Recalibrate
                </button>
                <button
                  onClick={() => handleAction('approve')}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Execute
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-12 rounded-xl border border-dashed border-[#27272A] text-center text-zinc-500 text-xs flex flex-col items-center justify-center min-h-[350px]">
            <CheckCircle2 className="w-10 h-10 text-[#22C55E] mb-3" />
            <h4 className="text-sm font-semibold text-white">All Clear!</h4>
            <p className="text-zinc-400 mt-1">There are no pending corporate drafts or employment documents blocked for review.</p>
          </div>
        )}
      </div>

    </div>
  );
}
