/**
 * CatalystOS - Corporate Decision Ledger Component (Phase 2.1)
 * Immutable, auditable corporate record of all executive deliberations, founder verdicts,
 * financial shifts, and board votes.
 */

import React, { useState, useMemo } from 'react';
import { DecisionRecord } from '../types';
import {
  FileText, Search, Filter, Download, CheckCircle2, XCircle,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Calendar,
  Shield, Users, DollarSign, ExternalLink, ChevronRight, X
} from 'lucide-react';

interface DecisionLogProps {
  decisions: DecisionRecord[];
  onRefresh?: () => Promise<void>;
}

export default function DecisionLog({ decisions, onRefresh }: DecisionLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<DecisionRecord | null>(null);

  // Filter & Search Pipeline
  const filteredDecisions = useMemo(() => {
    return decisions.filter(d => {
      // Category filter
      if (selectedCategory !== 'ALL' && d.category.toUpperCase() !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && d.status.toUpperCase() !== selectedStatus) {
        return false;
      }
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = d.title.toLowerCase().includes(q);
        const matchesDesc = d.description.toLowerCase().includes(q);
        const matchesCat = d.category.toLowerCase().includes(q);
        const matchesImpact = d.impactText?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat && !matchesImpact) {
          return false;
        }
      }
      return true;
    });
  }, [decisions, searchQuery, selectedCategory, selectedStatus]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = decisions.length;
    const approved = decisions.filter(d => d.status === 'approved').length;
    const rejected = decisions.filter(d => d.status === 'rejected').length;
    const netCapital = decisions.reduce((acc, d) => d.status === 'approved' ? acc + (d.financialImpact || 0) : acc, 0);

    return { total, approved, rejected, netCapital };
  }, [decisions]);

  // CSV Export
  const exportCSV = () => {
    if (decisions.length === 0) return;
    const headers = ['Timestamp', 'Title', 'Category', 'Status', 'Financial Impact (USD)', 'Description', 'Impact Summary'];
    const rows = filteredDecisions.map(d => [
      `"${new Date(d.timestamp).toISOString()}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.category}"`,
      `"${d.status}"`,
      d.financialImpact || 0,
      `"${d.description.replace(/"/g, '""')}"`,
      `"${(d.impactText || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalystos_decision_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export
  const exportJSON = () => {
    if (decisions.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredDecisions, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `catalystos_decision_ledger_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* ── Top Header & Stats ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xl font-bold text-[#141413] tracking-tight">Corporate Decision Ledger</h2>
          </div>
          <p className="text-xs text-[#696969] mt-0.5">
            Immutable, audit-proof history of executive council proposals, founder authorizations, and capital allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-[12px] bg-white border border-[#141413]/10 hover:border-[#141413]/30 text-xs font-semibold text-[#141413] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Export filtered ledger as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-[#696969]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="px-3.5 py-2 rounded-[12px] bg-[#141413] hover:bg-[#262627] text-xs font-semibold text-[#F3F0EE] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Export raw JSON audit trail"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit JSON</span>
          </button>
        </div>
      </div>

      {/* ── Metric Snapshot Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-[16px] bg-white border border-[#141413]/08 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#696969]">Total Logged Decisions</span>
          <p className="text-xl font-bold font-mono text-[#141413]">{stats.total}</p>
        </div>
        <div className="p-4 rounded-[16px] bg-white border border-[#141413]/08 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#696969]">Authorizations Executed</span>
          <p className="text-xl font-bold font-mono text-emerald-700">{stats.approved}</p>
        </div>
        <div className="p-4 rounded-[16px] bg-white border border-[#141413]/08 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#696969]">Proposals Rejected</span>
          <p className="text-xl font-bold font-mono text-rose-700">{stats.rejected}</p>
        </div>
        <div className="p-4 rounded-[16px] bg-white border border-[#141413]/08 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#696969]">Capital Delta Committed</span>
          <p className={`text-xl font-bold font-mono ${stats.netCapital >= 0 ? 'text-emerald-700' : 'text-[#141413]'}`}>
            {stats.netCapital >= 0 ? '+' : ''}${Math.round(stats.netCapital).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-[16px] bg-white border border-[#141413]/08 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#696969] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search decisions by title, keyword, impact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-[10px] bg-[#FCFBFA] border border-[#141413]/10 text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Department Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-[10px] bg-[#FCFBFA] border border-[#141413]/10 text-[#141413] font-medium focus:outline-none focus:border-[#141413]"
          >
            <option value="ALL">All Departments</option>
            <option value="HIRING">Hiring & Talent</option>
            <option value="FINANCE">Finance & Treasury</option>
            <option value="GROWTH">Growth & GTM</option>
            <option value="LEGAL">Legal & Contracts</option>
            <option value="OPERATIONS">Operations & Sprints</option>
            <option value="STRATEGY">CEO Strategy</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-[10px] bg-[#FCFBFA] border border-[#141413]/10 text-[#141413] font-medium focus:outline-none focus:border-[#141413]"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved & Executed</option>
            <option value="REJECTED">Rejected by Founder</option>
            <option value="FAILED">Execution Failed</option>
          </select>
        </div>
      </div>

      {/* ── Decisions Table & Records ───────────────────────────────── */}
      <div className="rounded-[20px] bg-white border border-[#141413]/10 overflow-hidden shadow-xs">
        {filteredDecisions.length > 0 ? (
          <div className="divide-y divide-[#141413]/06">
            {filteredDecisions.map((record) => {
              const isApproved = record.status === 'approved';
              const isFailed = record.status === 'failed';
              const dateStr = new Date(record.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="p-4 hover:bg-[#FCFBFA] transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isApproved ? 'bg-emerald-50 text-emerald-700' : isFailed ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {isApproved ? <CheckCircle2 className="w-4 h-4" /> : isFailed ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F3F0EE] text-[#141413] border border-[#141413]/08">
                          {record.category}
                        </span>
                        <span className="text-[10px] font-mono text-[#696969] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#696969]/70" />
                          {dateStr}
                        </span>
                        {record.reversibility && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                            record.reversibility === 'REVERSIBLE' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {record.reversibility}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-[#141413] group-hover:text-amber-800 transition-colors line-clamp-1">
                        {record.title}
                      </h4>
                      <p className="text-[11px] text-[#696969] line-clamp-1 leading-relaxed">
                        {record.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pl-11 md:pl-0">
                    {/* Financial Delta */}
                    <div className="text-right">
                      {record.financialImpact !== 0 ? (
                        <span className={`text-xs font-mono font-bold ${
                          record.financialImpact > 0 ? 'text-emerald-700' : 'text-[#141413]'
                        }`}>
                          {record.financialImpact > 0 ? '+' : ''}${Math.round(record.financialImpact).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-[#696969]">Neutral</span>
                      )}
                      <span className="block text-[9px] font-mono text-[#696969] uppercase">Treasury Shift</span>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      isFailed ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {record.status}
                    </span>

                    <ChevronRight className="w-4 h-4 text-[#696969] group-hover:text-[#141413] transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-8 h-8 text-[#696969]/50 mx-auto" />
            <h4 className="text-xs font-bold text-[#141413]">No Decisions Matched Filter</h4>
            <p className="text-[11px] text-[#696969] max-w-sm mx-auto">
              There are no recorded corporate decisions matching the selected status or category criteria.
            </p>
          </div>
        )}
      </div>

      {/* ── Slide-over Detail Modal ──────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-[24px] border border-[#141413]/10 shadow-2xl p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-[#696969] hover:text-[#141413] hover:bg-[#F3F0EE] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="space-y-2 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#F3F0EE] text-[#141413]">
                  {selectedRecord.category}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  selectedRecord.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedRecord.status}
                </span>
                <span className="text-[10px] font-mono text-[#696969]">
                  {new Date(selectedRecord.timestamp).toLocaleString()}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#141413] leading-snug">
                {selectedRecord.title}
              </h3>
            </div>

            {/* Core Rationale */}
            <div className="p-4 rounded-[14px] bg-[#FCFBFA] border border-[#141413]/08 space-y-2">
              <span className="text-[10px] uppercase font-mono font-bold text-[#696969] tracking-wider block">
                Executive Rationale & Directives
              </span>
              <p className="text-xs text-[#141413] leading-relaxed">
                {selectedRecord.description}
              </p>
            </div>

            {/* Financial & Impact Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-[14px] bg-[#F3F0EE]/60 border border-[#141413]/06 space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969] block">Financial Delta</span>
                <p className={`text-base font-mono font-bold ${
                  selectedRecord.financialImpact > 0 ? 'text-emerald-700' : 'text-[#141413]'
                }`}>
                  {selectedRecord.financialImpact > 0 ? '+' : ''}${Math.round(selectedRecord.financialImpact).toLocaleString()}
                </p>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[#F3F0EE]/60 border border-[#141413]/06 space-y-1">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969] block">Operational Metric Shift</span>
                <p className="text-xs font-semibold text-[#141413] truncate">
                  {selectedRecord.impactText || 'Standard workflow progression'}
                </p>
              </div>
            </div>

            {/* Board Votes & Consensus */}
            {selectedRecord.votes && selectedRecord.votes.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono font-bold text-[#696969] tracking-wider block">
                  Executive Board Consensus
                </span>
                <div className="space-y-1.5">
                  {selectedRecord.votes.map((v, i) => (
                    <div key={i} className="p-2.5 rounded-[10px] bg-[#FCFBFA] border border-[#141413]/06 flex items-center justify-between text-xs">
                      <span className="font-bold text-[#141413]">{v.agent}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        v.verdict === 'APPROVE' ? 'bg-emerald-100 text-emerald-800' :
                        v.verdict === 'APPROVE_WITH_CONDITIONS' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {v.verdict}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Action */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 rounded-[14px] bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] transition-all cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
