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
      case 'CEO': return <Rocket className="w-4 h-4 text-indigo-700" />;
      case 'Finance': return <Landmark className="w-4 h-4 text-emerald-700" />;
      case 'Talent': return <Users className="w-4 h-4 text-pink-700" />;
      case 'Growth': return <Briefcase className="w-4 h-4 text-amber-700" />;
      case 'Operations': return <Cog className="w-4 h-4 text-sky-700" />;
      case 'Legal': return <Shield className="w-4 h-4 text-rose-700" />;
      case 'ConflictResolver': return <HelpCircle className="w-4 h-4 text-purple-700" />;
      default: return <User className="w-4 h-4 text-[#141413]" />;
    }
  };

  // Get color configurations
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'indigo': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'emerald': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'pink': return 'bg-pink-50 text-pink-800 border-pink-200';
      case 'amber': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'sky': return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'rose': return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'purple': return 'bg-purple-50 text-purple-800 border-purple-200';
      default: return 'bg-[#F3F0EE] text-[#141413] border-[#141413]/10';
    }
  };

  return (
    <div id="agent-workspace-container" className="space-y-6 font-sans">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-[#141413]/10 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-2.5 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'roster' ? 'text-[#141413] border-b-2 border-[#141413]' : 'text-[#696969] hover:text-[#141413]'
            }`}
          >
            Executive AI Council
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 text-sm font-semibold transition-all relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'config' ? 'text-[#141413] border-b-2 border-[#141413]' : 'text-[#696969] hover:text-[#141413]'
            }`}
          >
            <Settings className="w-4 h-4" />
            Startup Configurator
          </button>
        </div>
        <span className="text-xs text-[#696969] font-mono font-bold uppercase tracking-wider">Role-Based AI Architecture</span>
      </div>

      {activeTab === 'roster' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-5 rounded-[20px] border border-[#141413]/10 bg-white flex flex-col justify-between hover:border-[#141413]/30 transition-all group shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover filter grayscale group-hover:grayscale-0 transition-all border border-[#141413]/10"
                    />
                    {agent.status !== 'idle' && (
                      <span className="absolute bottom-0 right-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${getColorClasses(agent.color)}`}>
                    {agent.role}
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-bold text-[#141413] flex items-center gap-1.5 leading-snug">
                    {getRoleIcon(agent.role)}
                    {agent.name}
                  </h4>
                  <p className="text-xs text-[#696969] mt-2 leading-relaxed min-h-[50px]">
                    {agent.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#141413]/10 flex items-center justify-between text-xs font-mono">
                <span className="text-[#696969] font-bold">
                  Tracking: {agent.keyMetric}
                </span>
                <span className="text-[#141413] font-bold">{agent.metricValue}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Configuration Form */
        <div className="max-w-xl mx-auto p-6 rounded-[20px] border border-[#141413]/10 bg-white shadow-[rgba(0,0,0,0.02)_0px_4px_16px_0px]">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#141413]">Startup Profile Adjustments</h3>
            <p className="text-xs text-[#696969] mt-1">Configure treasury details and business metadata. Changes affect the dynamic forecasting and agent prompts.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#696969] mb-1.5 font-mono uppercase tracking-wider text-[10px]">Startup Legal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/20 text-sm text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#696969] mb-1.5 font-mono uppercase tracking-wider text-[10px]">Primary Target Industry</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/20 text-sm text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#696969] mb-1.5 font-mono uppercase tracking-wider text-[10px]">Product Description & Objective</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/20 text-sm text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-sans resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#696969] mb-1.5 font-mono uppercase tracking-wider text-[10px]">Funding Stage</label>
                <select
                  value={fundingStage}
                  onChange={(e) => setFundingStage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#F3F0EE] border border-[#141413]/20 text-sm text-[#141413] focus:outline-none focus:border-[#141413]"
                >
                  <option value="Idea Phase">Idea Phase</option>
                  <option value="Pre-Seed">Pre-Seed</option>
                  <option value="Seed Stage">Seed Stage</option>
                  <option value="Series A">Series A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#696969] mb-1.5 font-mono uppercase tracking-wider text-[10px]">Current Cash Balance ($)</label>
                <input
                  type="number"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/20 text-sm text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#696969] mb-1.5 font-mono uppercase tracking-wider text-[10px]">Target Monthly Burn Rate ($)</label>
              <input
                type="number"
                value={burnRate}
                onChange={(e) => setBurnRate(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white border border-[#141413]/20 text-sm text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] font-mono"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              {saveSuccess && (
                <span className="text-xs text-emerald-700 font-bold animate-fade-in">
                  ✓ Profile updated successfully!
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="ml-auto px-5 py-2.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-xs font-bold text-[#F3F0EE] transition-all disabled:opacity-50 cursor-pointer font-sans"
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
