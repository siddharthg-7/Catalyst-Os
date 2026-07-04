/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Agent, StartupProfile } from '../types';
import { Settings, Shield, User, Landmark, Briefcase, Rocket, Cog, Users, HelpCircle } from 'lucide-react';

interface AgentWorkspaceProps {
  agents: Agent[];
  startup: StartupProfile;
  onUpdateStartup: (updated: StartupProfile) => void;
}

export default function AgentWorkspace({ agents, startup, onUpdateStartup }: AgentWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'config'>('roster');

  // Form states
  const [name, setName] = useState(startup.name);
  const [industry, setIndustry] = useState(startup.industry);
  const [description, setDescription] = useState(startup.description);
  const [fundingStage, setFundingStage] = useState(startup.fundingStage);
  const [strategy, setStrategy] = useState(startup.strategy || 'Hyper-Growth');
  const [cashBalance, setCashBalance] = useState(startup.cashBalance);
  const [burnRate, setBurnRate] = useState(startup.burnRate);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/startup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          industry,
          description,
          fundingStage,
          strategy,
          cashBalance: Number(cashBalance),
          burnRate: Number(burnRate)
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdateStartup(data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving startup configuration:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Agent role icon selector
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'CEO': return <Rocket className="w-4 h-4 text-indigo-400" />;
      case 'Finance': return <Landmark className="w-4 h-4 text-emerald-400" />;
      case 'Talent': return <Users className="w-4 h-4 text-pink-400" />;
      case 'Growth': return <Briefcase className="w-4 h-4 text-amber-400" />;
      case 'Operations': return <Cog className="w-4 h-4 text-sky-400" />;
      case 'Legal': return <Shield className="w-4 h-4 text-rose-400" />;
      case 'ConflictResolver': return <HelpCircle className="w-4 h-4 text-purple-400" />;
      default: return <User className="w-4 h-4 text-teal-400" />;
    }
  };

  // Get color configurations
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'indigo': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'emerald': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pink': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'amber': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'sky': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'rose': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'purple': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    }
  };

  return (
    <div id="agent-workspace-container" className="space-y-6">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-2.5 text-sm font-medium transition-all relative cursor-pointer ${
              activeTab === 'roster' ? 'text-white border-b-2 border-[#6366F1]' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Executive AI Council
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 text-sm font-medium transition-all relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'config' ? 'text-white border-b-2 border-[#6366F1]' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Startup Configurator
          </button>
        </div>
        <span className="text-xs text-zinc-500 font-mono">Role-Based AI Architecture</span>
      </div>

      {activeTab === 'roster' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-5 rounded-xl border border-[#27272A] bg-[#18181B] flex flex-col justify-between hover:border-[#6366F1]/50 transition-all group shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover filter grayscale group-hover:grayscale-0 transition-all border border-[#27272A]"
                    />
                    {agent.status !== 'idle' && (
                      <span className="absolute bottom-0 right-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full border ${getColorClasses(agent.color)}`}>
                    {agent.role}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    {getRoleIcon(agent.role)}
                    {agent.name}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed min-h-[50px]">
                    {agent.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#27272A] flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium flex items-center gap-1">
                  Tracking: {agent.keyMetric}
                </span>
                <span className="font-mono text-zinc-300 font-semibold">{agent.metricValue}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Configuration Form */
        <div className="max-w-xl mx-auto p-6 rounded-xl border border-[#27272A] bg-[#18181B] shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Startup Profile Adjustments</h3>
            <p className="text-xs text-zinc-400 mt-1">Configure treasury details and business metadata. Changes affect the dynamic forecasting and agent prompts.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Startup Legal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#6366F1] font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Primary Target Industry</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#6366F1]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Product Description & Objective</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#6366F1] resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Funding Stage</label>
                <select
                  value={fundingStage}
                  onChange={(e) => setFundingStage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="Idea Phase">Idea Phase</option>
                  <option value="Pre-Seed">Pre-Seed</option>
                  <option value="Seed Stage">Seed Stage</option>
                  <option value="Series A">Series A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                  Global AI Strategy 
                  <span className="text-[9px] bg-[#6366F1]/20 text-[#6366F1] px-1.5 py-0.5 rounded uppercase">New</span>
                </label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="Hyper-Growth">Hyper-Growth (Aggressive)</option>
                  <option value="Bootstrapped">Bootstrapped (Survival)</option>
                  <option value="Profitability">Profitability (Sustainable)</option>
                </select>
              </div>
            </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Current Cash Balance ($)</label>
                <input
                  type="number"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#6366F1] font-mono"
                />
              </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Target Monthly Burn Rate ($)</label>
              <input
                type="number"
                value={burnRate}
                onChange={(e) => setBurnRate(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#6366F1] font-mono"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              {saveSuccess && (
                <span className="text-xs text-emerald-400 font-medium animate-fade-in">
                  ✓ Profile updated successfully!
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="ml-auto px-5 py-2 rounded-lg bg-[#6366F1] text-xs font-semibold text-white hover:bg-[#6366F1]/85 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Updating...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
