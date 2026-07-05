import React, { useState } from 'react';
import { 
  Puzzle, Github, Database, CreditCard, Slack, Trello, Mail,
  CheckCircle2, AlertCircle, RefreshCw, ChevronRight, Lock
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync?: string;
  category: 'finance' | 'engineering' | 'communication' | 'marketing';
}

export default function IntegrationsHub() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Live revenue & churn data for the Finance Agent',
      icon: <CreditCard className="w-6 h-6 text-indigo-400" />,
      status: 'connected',
      lastSync: '2 mins ago',
      category: 'finance'
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Commit velocity & PR cycle times for Engineering AI',
      icon: <Github className="w-6 h-6 text-zinc-200" />,
      status: 'syncing',
      category: 'engineering'
    },
    {
      id: 'aws',
      name: 'AWS Cloud',
      description: 'Infrastructure costs & uptime metrics',
      icon: <Database className="w-6 h-6 text-amber-500" />,
      status: 'disconnected',
      category: 'engineering'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team sentiment analysis & alert routing',
      icon: <Slack className="w-6 h-6 text-rose-400" />,
      status: 'connected',
      lastSync: '1 hr ago',
      category: 'communication'
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Campaign CTRs & lead gen data for Growth Agent',
      icon: <Mail className="w-6 h-6 text-yellow-500" />,
      status: 'disconnected',
      category: 'marketing'
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Sprint completion rate & backlog velocity',
      icon: <Trello className="w-6 h-6 text-sky-500" />,
      status: 'disconnected',
      category: 'engineering'
    }
  ]);

  const [activeFilter, setActiveFilter] = useState<'all' | 'connected' | 'disconnected'>('all');

  const handleToggle = (id: string) => {
    setIntegrations(prev => prev.map(int => {
      if (int.id === id) {
        if (int.status === 'connected') return { ...int, status: 'disconnected' };
        if (int.status === 'disconnected') return { ...int, status: 'syncing' };
        if (int.status === 'syncing') return { ...int, status: 'connected', lastSync: 'Just now' };
      }
      return int;
    }));
  };

  const filtered = integrations.filter(int => {
    if (activeFilter === 'connected') return int.status === 'connected';
    if (activeFilter === 'disconnected') return int.status === 'disconnected';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-zinc-950 p-5 border border-zinc-900 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 shadow-sm">
            <Puzzle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Integrations Hub
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Connect external data sources to ground your AI Council in reality.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveFilter('connected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFilter === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'}`}
          >
            Connected
          </button>
          <button 
            onClick={() => setActiveFilter('disconnected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeFilter === 'disconnected' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Available
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(integration => (
          <div key={integration.id} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-5 shadow-sm hover:border-zinc-700 transition-all flex flex-col group relative overflow-hidden">
            
            {/* Status Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              {integration.status === 'connected' && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> CONNECTED
                </span>
              )}
              {integration.status === 'syncing' && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  <RefreshCw className="w-3 h-3 animate-spin" /> SYNCING
                </span>
              )}
              {integration.status === 'disconnected' && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 font-semibold">
                  DISCONNECTED
                </span>
              )}
            </div>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                {integration.icon}
              </div>
              <div className="pt-1">
                <h3 className="text-sm font-bold text-white">{integration.name}</h3>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">{integration.category}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-6 flex-grow leading-relaxed">
              {integration.description}
            </p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-900/50">
              <span className="text-[10px] font-mono text-zinc-500">
                {integration.lastSync ? `Sync: ${integration.lastSync}` : 'Never synced'}
              </span>
              
              <button
                onClick={() => handleToggle(integration.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  integration.status === 'connected' 
                    ? 'bg-zinc-900 text-zinc-300 hover:text-rose-400 border border-zinc-800' 
                    : integration.status === 'syncing'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-zinc-100 text-zinc-900 hover:bg-white border border-transparent'
                }`}
              >
                {integration.status === 'connected' ? 'Configure' : integration.status === 'syncing' ? 'Authenticating...' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Security Banner */}
      <div className="mt-8 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">SOC-2 Type II Compliant Sync</h4>
          <p className="text-[11px] text-zinc-400">All external data is fully encrypted at rest and in transit. Your AI agents only have read-access to the metrics provided, preventing any unwanted system mutations.</p>
        </div>
      </div>
    </div>
  );
}
