import React from 'react';
import { Shield, Sparkles, Database, Terminal, ArrowUpRight } from 'lucide-react';
import CatalystLogo from './CatalystLogo';

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

const moduleLinks = [
  { id: 'dashboard', label: 'Command Center' },
  { id: 'agents', label: 'Executive Council' },
  { id: 'workflows', label: 'Workflows & Sprints' },
  { id: 'approvals', label: 'Decision Inbox' },
  { id: 'ledger', label: 'Decision Ledger' },
  { id: 'knowledge', label: 'Company Knowledge' },
  { id: 'scenarios', label: 'Scenario Studio' },
  { id: 'people', label: 'People Directory' },
];

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="relative mt-16 border-t border-[#141413]/10 font-sans">
      <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          
          {/* Brand & Mission */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#141413] text-[#F3F0EE] flex items-center justify-center font-bold text-sm shadow-sm">
                <CatalystLogo className="w-4 h-4 text-[#F3F0EE]" />
              </div>
              <span className="font-bold text-[#141413] tracking-tight">CatalystOS</span>
            </div>

            <p className="text-xs text-[#696969] leading-relaxed max-w-xs">
              Autonomous corporate operating system. Powering high-assurance venture orchestration, multi-agent debates, and audited executive governance.
            </p>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-medium text-emerald-800">
                8 Autonomous Executives Live & Grounded
              </span>
            </div>
          </div>

          {/* Module Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#141413]">
              Workspace Navigation
            </h4>
            <ul className="grid grid-cols-2 gap-2 text-xs">
              {moduleLinks.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate?.(item.id)}
                    className="text-[#696969] hover:text-[#141413] transition-colors cursor-pointer text-left font-medium"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Security & Governance Badges */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-[#141413]">
              Governance Architecture
            </h4>
            <div className="space-y-2 text-xs text-[#696969]">
              <div className="p-3 rounded-xl bg-white border border-[#141413]/08 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#141413] font-medium">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  PostgreSQL / pgvector (Neon)
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Synced
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#141413]/08 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#141413] font-medium">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  SOC-2 Immutable Audit Ledger
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Enforced
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom credits */}
        <div className="pt-6 border-t border-[#141413]/08 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#696969]">
          <p>© {new Date().getFullYear()} CatalystOS. Built for venture founders.</p>
          <p className="font-mono text-[11px]">Enterprise High-Assurance AI Infrastructure</p>
        </div>
      </div>
    </footer>
  );
}
