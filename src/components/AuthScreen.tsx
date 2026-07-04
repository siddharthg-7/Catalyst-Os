import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Shield, Building2, Rocket, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import HackathonLandingPage from './HackathonLandingPage';
import CatalystLogo from './CatalystLogo';

// Dark glassmorphic appearance config matching the app's design system
const clerkAppearance = {
  variables: {
    colorPrimary: '#ffffff',
    colorBackground: '#09090b',
    colorInputBackground: '#09090b',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: '#a1a1aa',
    colorDanger: '#f87171',
    colorSuccess: '#34d399',
    borderRadius: '0.75rem',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: '0.875rem',
  },
  elements: {
    card: {
      background: 'transparent',
      boxShadow: 'none',
      padding: '0',
    },
    header: { display: 'none' },
    socialButtonsBlockButton: {
      background: '#18181b',
      border: '1px solid #27272a',
      color: '#fff',
    },
    socialButtonsBlockButton__hover: {
      background: '#27272a',
    },
    dividerLine: { background: '#27272a' },
    dividerText: { color: '#52525b' },
    formFieldInput: {
      background: '#09090b',
      border: '1px solid #3f3f46',
      color: '#fff',
    },
    formFieldLabel: {
      color: '#a1a1aa',
      textTransform: 'uppercase' as const,
      fontSize: '0.65rem',
      letterSpacing: '0.08em',
      fontWeight: '600',
    },
    formButtonPrimary: {
      background: '#ffffff',
      color: '#000000',
      fontWeight: '700',
    },
    footerActionLink: { color: '#ffffff' },
    formFieldErrorText: { color: '#f87171' },
    footer: { display: 'none' },
    cardBox: {
      boxShadow: 'none',
      background: 'transparent',
    },
  },
};

export default function AuthScreen() {
  const { loginAsDemo } = useAuth();

  const [view, setView] = useState<'landing' | 'auth' | 'onboarding'>('landing');
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  
  // Onboarding Form State
  const [onboardingPath, setOnboardingPath] = useState<'existing' | 'new'>('existing');
  const [buildingAgents, setBuildingAgents] = useState(false);
  const [agentProgress, setAgentProgress] = useState({
    ceo: false,
    cfo: false,
    talent: false,
    growth: false,
    ops: false,
  });

  // Startup Form State
  const [startupName, setStartupName] = useState('AeroFlow AI');
  const [industry, setIndustry] = useState('B2B SaaS / Developer Tools');
  const [burnRate, setBurnRate] = useState('$18,500 / mo');
  const [runway, setRunway] = useState('13.2 months');
  const [idea, setIdea] = useState('');
  const [budget, setBudget] = useState('$50,000');
  const [timeline, setTimeline] = useState('30 Days');

  const startOnboardingAnimation = async () => {
    setBuildingAgents(true);
    
    // Animate agent building checkmarks sequentially
    await new Promise(r => setTimeout(r, 600));
    setAgentProgress(p => ({ ...p, ceo: true }));
    await new Promise(r => setTimeout(r, 600));
    setAgentProgress(p => ({ ...p, cfo: true }));
    await new Promise(r => setTimeout(r, 600));
    setAgentProgress(p => ({ ...p, talent: true }));
    await new Promise(r => setTimeout(r, 600));
    setAgentProgress(p => ({ ...p, growth: true }));
    await new Promise(r => setTimeout(r, 600));
    setAgentProgress(p => ({ ...p, ops: true }));
    await new Promise(r => setTimeout(r, 800));

    setView('auth');
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-white relative font-sans ${view === 'landing' ? 'p-0 w-full block' : 'p-6 flex items-center justify-center'}`}>
      
      {/* 1. LANDING PAGE VIEW */}
      {view === 'landing' && (
        <div className="w-full min-h-screen">
          <HackathonLandingPage
            onStartBuilding={() => setView('onboarding')}
            onViewDemo={() => loginAsDemo()}
          />
        </div>
      )}

      {/* 2. SMART ONBOARDING FLOW */}
      {view === 'onboarding' && (
        <div className="max-w-2xl w-full bg-[#09090b] border border-zinc-800 rounded-2xl p-8 relative z-10 shadow-2xl space-y-6">
          {!buildingAgents ? (
            <>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-mono">Smart Onboarding</h2>
                  <p className="text-zinc-500 text-xs">Configure your startup parameters for executive AI context</p>
                </div>
                <button
                  onClick={() => setView('landing')}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer font-mono"
                >
                  Cancel
                </button>
              </div>

              {/* Pathway Selector */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setOnboardingPath('existing')}
                  className={`p-4 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                    onboardingPath === 'existing'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-white" />
                  <h4 className="text-xs font-bold text-white">Existing Startup</h4>
                  <p className="text-[10px] text-zinc-500">Provide team size, revenue, burn rate, and pitch deck</p>
                </button>

                <button
                  onClick={() => setOnboardingPath('new')}
                  className={`p-4 rounded-xl border text-left space-y-1 transition-all cursor-pointer ${
                    onboardingPath === 'new'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <Rocket className="w-5 h-5 text-white" />
                  <h4 className="text-xs font-bold text-white">New Startup Idea</h4>
                  <p className="text-[10px] text-zinc-500">Define concept, target audience, budget, and timeline</p>
                </button>
              </div>

              {/* Onboarding Fields */}
              {onboardingPath === 'existing' ? (
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Startup Name</label>
                    <input type="text" value={startupName} onChange={e => setStartupName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Industry</label>
                    <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Monthly Burn</label>
                    <input type="text" value={burnRate} onChange={e => setBurnRate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Runway</label>
                    <input type="text" value={runway} onChange={e => setRunway(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Startup Concept</label>
                    <input type="text" placeholder="e.g. AI-powered automated code review platform" value={idea} onChange={e => setIdea(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Budget</label>
                    <input type="text" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Target Launch</label>
                    <input type="text" value={timeline} onChange={e => setTimeline(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={startOnboardingAnimation}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold font-mono transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                  Deploy Executive Team →
                </button>
              </div>
            </>
          ) : (
            /* Animated Building Executive Team checkmark screen */
            <div className="py-8 text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-mono">Building Your Executive Team...</h3>
                <p className="text-xs text-zinc-400 font-mono">Synthesizing domain contexts and initializing agent state graphs</p>
              </div>

              <div className="space-y-3 max-w-sm mx-auto text-xs font-mono text-left">
                <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${agentProgress.ceo ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-950/40 border-zinc-850 text-zinc-600'}`}>
                  <span>✓ CEO Orchestrator</span>
                  {agentProgress.ceo ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${agentProgress.cfo ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-950/40 border-zinc-850 text-zinc-600'}`}>
                  <span>✓ CFO (Treasury & Burn)</span>
                  {agentProgress.cfo ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : agentProgress.ceo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${agentProgress.talent ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-950/40 border-zinc-850 text-zinc-600'}`}>
                  <span>✓ Head of Talent</span>
                  {agentProgress.talent ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : agentProgress.cfo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${agentProgress.growth ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-950/40 border-zinc-850 text-zinc-600'}`}>
                  <span>✓ Head of Growth</span>
                  {agentProgress.growth ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : agentProgress.talent ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${agentProgress.ops ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-950/40 border-zinc-850 text-zinc-600'}`}>
                  <span>✓ Operations Executive</span>
                  {agentProgress.ops ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : agentProgress.growth ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CLERK AUTH FORM */}
      {view === 'auth' && (
        <div className="w-full max-w-md bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl p-8 relative z-10">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <CatalystLogo className="w-5 h-5 text-orange-500" />
              <h2 className="text-sm font-bold text-white font-mono">Catalyst OS Sign In</h2>
            </div>
            <button onClick={() => setView('landing')} className="text-xs text-zinc-400 hover:text-white cursor-pointer font-mono">
              Cancel
            </button>
          </div>

          {/* Clerk Component */}
          {authTab === 'signin' ? (
            <SignIn appearance={clerkAppearance} routing="hash" />
          ) : (
            <SignUp appearance={clerkAppearance} routing="hash" />
          )}

          <div className="mt-6 pt-4 border-t border-zinc-850 text-center">
            <button
              onClick={() => setAuthTab(authTab === 'signin' ? 'signup' : 'signin')}
              className="text-xs font-mono text-zinc-400 hover:text-white cursor-pointer underline transition-colors"
            >
              {authTab === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
