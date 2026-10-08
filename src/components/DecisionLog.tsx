/**
 * CatalystOS - Corporate Decision Ledger Component (Section 15)
 * Institutional memory & auditable corporate record.
 * Formatted with clean table columns (Decision, Context, Owner, Recommendation, Status, Date)
 * and an interactive slide-over detail drawer.
 */

import React, { useState, useMemo } from 'react';
import { DecisionRecord } from '../types';
import {
  FileText, Search, Filter, Download, CheckCircle2, XCircle,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Calendar,
  Shield, Users, DollarSign, ExternalLink, ChevronRight, X,
  Clock, Check
} from 'lucide-react';
import Section from './Section';

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
    <div id="decision-log-container" className="space-y-6 font-sans">
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <Section delay={0.05} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#141413]/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#696969]">
              Institutional Memory
            </span>
            <span className="w-1 h-1 rounded-full bg-[#141413]/30" />
            <span className="text-[11px] font-mono text-[#696969]">
              {decisions.length} Decisions Archived
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141413]">
            Decision Ledger
          </h1>
          <p className="text-sm text-[#696969] mt-1 max-w-2xl">
            Immutable, auditable corporate record of all executive deliberations, founder verdicts, financial shifts, and board authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="interactive-btn px-3.5 py-2 rounded-xl bg-white border border-[#141413]/15 hover:border-[#141413] text-xs font-semibold text-[#141413] flex items-center gap-1.5 transition-all shadow-subtle"
          >
            <Download className="w-3.5 h-3.5 text-[#696969]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJSON}
            className="interactive-btn magnetic-btn px-3.5 py-2 rounded-xl bg-[#141413] hover:bg-[#262627] text-xs font-semibold text-[#F3F0EE] flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit JSON</span>
          </button>
        </div>
      </Section>

      {/* ── METRIC SUMMARY ROW ────────────────────────────────────────────── */}
      <Section delay={0.1} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="catalyst-card card-hover glow-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#696969]">
            Total Decisions
          </span>
          <p className="text-2xl font-bold font-mono text-[#141413]">{stats.total}</p>
        </div>
        <div className="catalyst-card card-hover glow-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#696969]">
            Authorizations
          </span>
          <p className="text-2xl font-bold font-mono text-emerald-700">{stats.approved}</p>
        </div>
        <div className="catalyst-card card-hover glow-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#696969]">
            Rejected / Vetoed
          </span>
          <p className="text-2xl font-bold font-mono text-rose-700">{stats.rejected}</p>
        </div>
        <div className="catalyst-card card-hover glow-border p-4 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#696969]">
            Committed Capital
          </span>
          <p className={`text-2xl font-bold font-mono ${stats.netCapital >= 0 ? 'text-emerald-700' : 'text-[#141413]'}`}>
            {stats.netCapital >= 0 ? '+' : ''}${Math.round(stats.netCapital).toLocaleString()}
          </p>
        </div>
      </Section>

      {/* ── SEARCH & FILTER CONTROLS ──────────────────────────────────────── */}
      <Section delay={0.15} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#696969] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ledger by title, keyword, context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#141413]/15 text-xs text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white border border-[#141413]/15 text-[#141413] font-medium focus:outline-none focus:border-[#141413]"
          >
            <option value="ALL">All Tracks</option>
            <option value="HIRING">Hiring & Talent</option>
            <option value="FINANCE">Finance & Treasury</option>
            <option value="GROWTH">Growth & GTM</option>
            <option value="LEGAL">Legal & Contracts</option>
            <option value="OPERATIONS">Operations & Sprints</option>
            <option value="STRATEGY">CEO Strategy</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white border border-[#141413]/15 text-[#141413] font-medium focus:outline-none focus:border-[#141413]"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved & Executed</option>
            <option value="REJECTED">Rejected by Founder</option>
            <option value="FAILED">Execution Failed</option>
          </select>
        </div>
      </Section>

      {/* ── CLEAN TABLE / LIST: SECTION 15 COMPLIANT ─────────────────────── */}
      <Section delay={0.2} className="catalyst-card rounded-2xl overflow-hidden divide-y divide-[#141413]/05">
        {/* Table Header Columns: Decision | Context | Owner | Recommendation | Status | Date */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3.5 bg-[#FCFBFA] text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] border-b border-[#141413]/10">
          <div className="col-span-3">Decision</div>
          <div className="col-span-3">Context & Directives</div>
          <div className="col-span-2">Owner / Lead</div>
          <div className="col-span-2">Recommendation</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Date</div>
        </div>

        {/* Table Rows */}
        {filteredDecisions.length > 0 ? (
          filteredDecisions.map((record) => {
            const isApproved = record.status === 'approved';
            const isFailed = record.status === 'failed';
            const dateStr = new Date(record.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            });

            return (
              <div
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 px-6 py-4 items-center hover:bg-[#FCFBFA] transition-colors cursor-pointer group"
              >
                {/* 1. Decision (Col 3) */}
                <div className="lg:col-span-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded-md bg-[#141413]/05 text-[#141413] uppercase">
                      {record.category}
                    </span>
                    {record.reversibility && (
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                        record.reversibility === 'REVERSIBLE' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {record.reversibility}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-[#141413] group-hover:text-black line-clamp-1">
                    {record.title}
                  </h4>
                </div>

                {/* 2. Context & Directives (Col 3) */}
                <div className="lg:col-span-3 text-xs text-[#696969]">
                  <p className="line-clamp-2 leading-relaxed">
                    {record.impactText || record.description}
                  </p>
                </div>

                {/* 3. Owner / Lead (Col 2) */}
                <div className="lg:col-span-2 flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#141413]/10 text-[#141413] flex items-center justify-center font-bold text-[10px] font-mono">
                    {record.approver ? record.approver[0] : 'F'}
                  </div>
                  <span className="font-semibold text-[#141413] truncate">
                    {record.approver || 'Founder Sign-off'}
                  </span>
                </div>

                {/* 4. Recommendation / Impact (Col 2) */}
                <div className="lg:col-span-2 text-xs font-mono">
                  {record.financialImpact ? (
                    <span className={`font-bold ${record.financialImpact > 0 ? 'text-emerald-700' : 'text-[#141413]'}`}>
                      {record.financialImpact > 0 ? '+' : ''}${Math.abs(record.financialImpact).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[#696969]">Operational Alignment</span>
                  )}
                  <span className="text-[10px] text-[#696969] block font-sans truncate">
                    {record.recommendationBy || 'Executive Council'}
                  </span>
                </div>

                {/* 5. Status (Col 1) */}
                <div className="lg:col-span-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                    isApproved ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' :
                    isFailed ? 'bg-amber-500/10 text-amber-800 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-800 border border-rose-500/20'
                  }`}>
                    {isApproved ? <Check className="w-2.5 h-2.5" /> : null}
                    {record.status}
                  </span>
                </div>

                {/* 6. Date (Col 1) */}
                <div className="lg:col-span-1 text-right text-xs font-mono text-[#696969] flex items-center justify-end gap-1.5">
                  <span>{dateStr}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#696969]/50 group-hover:text-[#141413] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-xs text-[#696969] space-y-1">
            <p className="font-bold text-[#141413]">No ledger records matching filters</p>
            <p>Try refining your search terms or selecting all tracks.</p>
          </div>
        )}
      </Section>

      {/* ── FOCUSED DETAIL DRAWER ─────────────────────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-[#141413]/40 backdrop-blur-sm flex items-center justify-end">
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-fade-in border-l border-[#141413]/10">
            
            <div className="p-6 border-b border-[#141413]/10 space-y-3 sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#141413]/05 text-[#141413] uppercase">
                    {selectedRecord.category}
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase ${
                    selectedRecord.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedRecord.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-full hover:bg-[#141413]/05 text-[#696969] hover:text-[#141413] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#141413]">{selectedRecord.title}</h3>
                <span className="text-[11px] font-mono text-[#696969] flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Logged: {new Date(selectedRecord.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] block">
                  Deliberation Context & Summary
                </span>
                <p className="text-xs text-[#141413] leading-relaxed bg-[#FCFBFA] p-4 rounded-xl border border-[#141413]/08">
                  {selectedRecord.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] block">
                  Forecasted & Executed Impact
                </span>
                <p className="text-xs text-[#141413] leading-relaxed bg-[#FCFBFA] p-4 rounded-xl border border-[#141413]/08">
                  {selectedRecord.impactText || 'Standard strategic trajectory parameters recorded.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-[#141413]/08 bg-[#FCFBFA] space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#696969] block">Authorizing Party</span>
                  <span className="font-bold text-[#141413]">{selectedRecord.approver || 'Founder Sign-off'}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-[#141413]/08 bg-[#FCFBFA] space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-[#696969] block">Capital Delta</span>
                  <span className="font-bold font-mono text-[#141413]">
                    {selectedRecord.financialImpact ? `$${Math.abs(selectedRecord.financialImpact).toLocaleString()}` : '$0 (Neutral)'}
                  </span>
                </div>
              </div>

              {selectedRecord.rawCouncilDeliberation && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#696969] block">
                    Audited Council Raw Log
                  </span>
                  <div className="p-4 rounded-xl border border-[#141413]/10 bg-[#FCFBFA] max-h-48 overflow-y-auto text-[11px] font-mono text-[#141413] leading-relaxed whitespace-pre-wrap">
                    {selectedRecord.rawCouncilDeliberation}
                  </div>
                </div>
              )}

            </div>

            <div className="p-5 border-t border-[#141413]/10 bg-[#FCFBFA] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#696969]">Record ID: {selectedRecord.id}</span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] transition-all"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
