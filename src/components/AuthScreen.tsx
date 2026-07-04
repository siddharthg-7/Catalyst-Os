import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, LogIn, UserPlus, Check, ArrowRight, Building2, Rocket, Upload, CheckCircle2, RefreshCw } from 'lucide-react';
import HackathonLandingPage from './HackathonLandingPage';

export default function AuthScreen() {
  const { login, signup } = useAuth();
  
  // Navigation & View State
  const [view, setView] = useState<'landing' | 'auth' | 'onboarding'>('landing');
  const [isLogin, setIsLogin] = useState(true);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Founder' | 'Executive' | 'Admin'>('Founder');
  
  // Onboarding Form State
  const [onboardingPath, setOnboardingPath] = useState<'existing' | 'new'>('existing');
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [buildingAgents, setBuildingAgents] = useState(false);
  const [agentProgress, setAgentProgress] = useState({
    ceo: false,
    cfo: false,
    talent: false,
    growth: false,
    ops: false,
  });

  // Existing Startup Form
  const [startupName, setStartupName] = useState('AeroFlow AI');
  const [industry, setIndustry] = useState('B2B SaaS / Developer Tools');
  const [stage, setStage] = useState('Pre-Seed');
  const [teamSize, setTeamSize] = useState('6 employees');
  const [revenue, setRevenue] = useState('$12,000 / mo');
  const [burnRate, setBurnRate] = useState('$18,500 / mo');
  const [runway, setRunway] = useState('13.2 months');
  const [fundingRaised, setFundingRaised] = useState('$250,000');

  // New Startup Form
  const [idea, setIdea] = useState('');
  const [businessModel, setBusinessModel] = useState('Subscription SaaS');
  const [targetAudience, setTargetAudience] = useState('Mid-market DevOps Engineering Teams');
  const [budget, setBudget] = useState('$50,000');
  const [timeline, setTimeline] = useState('30 Days');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await login('founder@founder.os', 'password123');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(name, email, password, role);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

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

    // Complete login as founder
    await login('founder@founder.os', 'password123');
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-white relative font-sans ${view === 'landing' ? 'p-0 w-full block' : 'p-6 flex items-center justify-center'}`}>
      
      {/* 1. LANDING PAGE VIEW (Hackathon Blueprint Design) */}
      {view === 'landing' && (
        <div className="w-full min-h-screen">
          <HackathonLandingPage
            onStartBuilding={() => setView('onboarding')}
            onViewDemo={handleDemoLogin}
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
                  <h2 className="text-lg font-bold text-white">Smart Onboarding</h2>
                  <p className="text-zinc-500 text-xs">Configure your startup parameters for executive AI context</p>
                </div>
                <button
                  onClick={() => setView('landing')}
                  className="text-xs text-zinc-400 hover:text-white cursor-pointer"
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
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Startup Name</label>
                    <input type="text" value={startupName} onChange={e => setStartupName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Industry</label>
                    <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Monthly Burn</label>
                    <input type="text" value={burnRate} onChange={e => setBurnRate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Runway</label>
                    <input type="text" value={runway} onChange={e => setRunway(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Startup Concept</label>
                    <input type="text" placeholder="e.g. AI-powered automated code review platform" value={idea} onChange={e => setIdea(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Budget</label>
                    <input type="text" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">Target Launch</label>
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
                <p className="text-xs text-zinc-400">Synthesizing domain contexts and initializing agent state graphs</p>
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

      {/* 3. AUTH / LOGIN FORM */}
      {view === 'auth' && (
        <div className="max-w-md w-full bg-[#09090b] border border-zinc-800 rounded-2xl p-8 relative z-10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-lg font-bold text-white">{isLogin ? 'Sign In' : 'Create Account'}</h2>
            <button onClick={() => setView('landing')} className="text-xs text-zinc-400 hover:text-white cursor-pointer">
              Cancel
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs font-mono">
            {!isLogin && (
              <div>
                <label className="block text-zinc-400 mb-1 uppercase">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
              </div>
            )}

            <div>
              <label className="block text-zinc-400 mb-1 uppercase">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 uppercase">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-white" />
            </div>

            {error && <p className="text-rose-400 text-[11px]">{error}</p>}

            <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all cursor-pointer font-mono shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              {submitting ? 'Processing...' : isLogin ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-zinc-500">
            <button onClick={() => setIsLogin(!isLogin)} className="hover:text-white cursor-pointer underline">
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
