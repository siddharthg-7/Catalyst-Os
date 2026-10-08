import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Building2, Rocket, CheckCircle2, RefreshCw,
  ArrowRight, Sparkles, Zap, ChevronRight, ArrowLeft,
  Globe, Lock, Layers, Cpu, BarChart3, Users, Mail, KeyRound, AlertCircle,
  DollarSign, Target, Flag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import HackathonLandingPage from './HackathonLandingPage';
import CatalystOsChatbot from './chatbot/CatalystOsChatbot';
import CatalystLogo from './CatalystLogo';
import FounderOnboardingWizard from './FounderOnboardingWizard';


// ── Warm orbital arc background (replaces dark grid) ──────────────────────
function WarmBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Very subtle warm orbital arcs */}
      <div
        className="absolute rounded-full border border-[#141413]/[0.04]"
        style={{ width: '800px', height: '800px', top: '-200px', right: '-300px' }}
      />
      <div
        className="absolute rounded-full border border-[#141413]/[0.03]"
        style={{ width: '560px', height: '560px', top: '-80px', right: '-160px' }}
      />
      <div
        className="absolute rounded-full border border-[#141413]/[0.03]"
        style={{ width: '600px', height: '600px', bottom: '-200px', left: '-250px' }}
      />
      <div
        className="absolute rounded-full border border-[#141413]/[0.02]"
        style={{ width: '400px', height: '400px', bottom: '-100px', left: '-120px' }}
      />
    </div>
  );
}

// ── Feature card (left panel) ──────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, delay }: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-start gap-3 p-3.5 rounded-[16px] bg-white border border-[#141413]/10 shadow-[rgba(0,0,0,0.03)_0px_2px_8px]"
    >
      <div className="w-8 h-8 rounded-lg bg-[#F3F0EE] border border-[#141413]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#141413]/60" />
      </div>
      <div>
        <p className="text-xs font-semibold text-[#141413] mb-0.5 font-sans">{title}</p>
        <p className="text-[10px] text-[#696969] leading-relaxed font-sans">{description}</p>
      </div>
    </motion.div>
  );
}

interface AuthScreenProps {
  key?: string;
  initialView?: 'landing' | 'auth' | 'onboarding';
  onOnboardingComplete?: (onboardingData: any) => void;
}

export default function AuthScreen({ initialView = 'landing', onOnboardingComplete }: AuthScreenProps) {
  const navigate = useNavigate();
  const { loginAsDemo, user, logout, signin, signup } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'onboarding'>(initialView);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  // Native Neon Auth state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authRole, setAuthRole] = useState<UserRole>('Founder');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setAuthSubmitting(true);
    try {
      if (authTab === 'signin') {
        const res = await signin(authEmail, authPassword);
        if (!res.success) {
          setAuthError(res.error || 'Invalid credentials.');
        } else {
          if (res.onboarded) {
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
        }
      } else {
        const res = await signup(authEmail, authPassword, authFullName.trim() || 'Founder', authRole);
        if (!res.success) {
          setAuthError(res.error || 'Registration failed.');
        } else {
          if (res.onboarded) {
            navigate('/dashboard');
          } else {
            navigate('/onboarding');
          }
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const navigateTo = (newView: typeof view) => {
    setDirection(newView === 'landing' ? -1 : 1);
    setView(newView);
    if (newView === 'landing') navigate('/');
    else if (newView === 'auth') navigate('/auth');
    else if (newView === 'onboarding') navigate('/onboarding');
  };

  const pageVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40, scale: 0.98 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40, scale: 0.98 }),
  };

  // ── Input shared style ──────────────────────────────────────────────────
  const inputCls = "w-full bg-white border border-[#141413]/15 rounded-[12px] px-3.5 py-2.5 text-sm text-[#141413] placeholder-[#696969] focus:outline-none focus:border-[#141413] focus:ring-2 focus:ring-[#141413]/06 transition-all font-sans";
  const labelCls = "block text-[10px] uppercase tracking-widest text-[#696969] mb-1.5 font-bold font-mono";

  return (
    <div className="min-h-screen relative font-sans overflow-hidden transition-colors duration-300" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
      <WarmBackground />

      <AnimatePresence mode="wait" custom={direction}>

        {/* ── LANDING VIEW (wraps HackathonLandingPage) ─────────────────── */}
        {view === 'landing' && (
          <motion.div
            key="landing"
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="w-full min-h-screen"
          >
            <HackathonLandingPage
              onStartBuilding={() => navigateTo('auth')}
              onDemoLogin={async () => {
                await loginAsDemo();
                localStorage.setItem('catalystos_onboarding_completed_usr_founder_demo', 'true');
                navigate('/dashboard');
              }}
            />
          </motion.div>
        )}

        {/* ── ONBOARDING VIEW (Founder Onboarding Wizard) ── */}
        {view === 'onboarding' && (
          <motion.div
            key='onboarding'
            custom={direction}
            variants={pageVariants}
            initial='enter'
            animate='center'
            exit='exit'
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className='min-h-screen flex items-center justify-center p-6 relative z-10'
          >
            <FounderOnboardingWizard
              user={user}
              onComplete={async (payload) => {
                if (onOnboardingComplete) {
                  await onOnboardingComplete(payload);
                }
                navigate('/dashboard');
              }}
              onCancel={() => {
                if (user) logout();
                navigateTo('landing');
              }}
            />
          </motion.div>
        )}

        {/* ── AUTH VIEW ────────────────────────────────────────────────── */}
        {view === 'auth' && (
          <motion.div
            key="auth"
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="min-h-screen flex items-center justify-center p-6 relative z-10"
          >
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white border border-[#141413]/10 rounded-[40px] overflow-hidden shadow-[rgba(0,0,0,0.08)_0px_40px_80px]">
              
              {/* Left panel — Brand */}
              <div className="hidden lg:flex flex-col justify-center p-10 bg-[#F3F0EE] border-r border-[#141413]/10 relative overflow-hidden">
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex items-center gap-2.5 mb-12"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#141413]/10 flex items-center justify-center">
                      <CatalystLogo className="w-4 h-4 text-[#141413]" />
                    </div>
                    <span className="text-sm font-bold text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>CatalystOS</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-3xl font-bold text-[#141413] mb-3 leading-tight font-sans" style={{ letterSpacing: '-0.02em' }}
                  >
                    Let's build<br />
                    <span className="text-[#696969]">your startup.</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-sm text-[#696969] leading-relaxed max-w-xs font-sans"
                  >
                    Answer a few questions and CatalystOS will personalize your workspace for your startup.
                  </motion.p>

                  <div className="space-y-2.5 mt-10">
                    <FeatureCard icon={Cpu}    title="Tell us about your startup"                  description="Share a few details so we understand your goals."  delay={0.5} />
                    <FeatureCard icon={Layers} title="Your AI Companion learns your business"      description="We'll personalize every recommendation using your startup's context."  delay={0.6} />
                    <FeatureCard icon={Shield} title="Start building"                              description="Access your dashboard and begin working with your AI team."      delay={0.7} />
                  </div>
                </div>
              </div>

              {/* Right panel — Neon Auth Form */}
              <div className="p-8 lg:p-10 flex flex-col bg-white justify-between">
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex items-center justify-between mb-8"
                  >
                    <div className="flex items-center gap-2.5 lg:hidden">
                      <div className="w-6 h-6 rounded-lg bg-[#F3F0EE] border border-[#141413]/10 flex items-center justify-center">
                        <CatalystLogo className="w-3.5 h-3.5 text-[#141413]" />
                      </div>
                      <span className="text-xs font-bold text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>CatalystOS</span>
                    </div>
                    <button
                      onClick={() => navigateTo('landing')}
                      className="w-8 h-8 rounded-[10px] bg-[#F3F0EE] border border-[#141413]/10 flex items-center justify-center text-[#696969] hover:text-[#141413] hover:bg-white transition-all cursor-pointer"
                      title="Back to Landing"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono font-semibold border border-emerald-200/60 mb-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Neon PostgreSQL Auth
                    </div>
                    <h2 className="text-xl font-bold text-[#141413] mb-1 font-sans" style={{ letterSpacing: '-0.02em' }}>
                      {authTab === 'signin' ? 'Welcome Back' : 'Create CatalystOS Account'}
                    </h2>
                    <p className="text-xs text-[#696969] font-sans">
                      {authTab === 'signin' 
                        ? 'Sign in to access your startup intelligence dashboard' 
                        : 'Deploy your autonomous executive council on Neon PostgreSQL'}
                    </p>
                  </motion.div>

                  {/* Auth Switch Tabs */}
                  <div className="flex bg-[#F3F0EE] p-1 rounded-xl mb-5 border border-[#141413]/05">
                    <button
                      type="button"
                      onClick={() => { setAuthTab('signin'); setAuthError(null); }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        authTab === 'signin'
                          ? 'bg-white text-[#141413] shadow-sm'
                          : 'text-[#696969] hover:text-[#141413]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthTab('signup'); setAuthError(null); }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        authTab === 'signup'
                          ? 'bg-white text-[#141413] shadow-sm'
                          : 'text-[#696969] hover:text-[#141413]'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                      <span>{authError}</span>
                    </motion.div>
                  )}

                  {/* Form fields */}
                  <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                    {authTab === 'signup' && (
                      <div className="space-y-1">
                        <label className={labelCls}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={authFullName}
                          onChange={(e) => setAuthFullName(e.target.value)}
                          placeholder="e.g. Alex Morgan"
                          className={inputCls}
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className={labelCls}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="founder@venture.com"
                        className={inputCls}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={labelCls}>
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        className={inputCls}
                      />
                    </div>



                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full mt-2 py-3 px-4 bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] font-bold text-xs rounded-[20px] transition-all flex items-center justify-center gap-2 shadow-[rgba(0,0,0,0.15)_0px_4px_12px] disabled:opacity-50 cursor-pointer"
                    >
                      {authSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Authenticating with Neon...</span>
                        </>
                      ) : (
                        <>
                          <span>{authTab === 'signin' ? 'Sign In to CatalystOS' : 'Create Account'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#141413]/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest text-[#696969]">
                      <span className="bg-white px-2">Instant Sandbox Access</span>
                    </div>
                  </div>

                  {/* 1-Click Demo Login */}
                  <button
                    type="button"
                    onClick={async () => {
                      await loginAsDemo();
                      localStorage.setItem('catalystos_onboarding_completed_usr_founder_demo', 'true');
                      navigate('/dashboard');
                    }}
                    className="w-full py-2.5 px-4 bg-[#F3F0EE] hover:bg-[#e7e4e1] border border-[#141413]/10 text-[#141413] font-bold text-xs rounded-[20px] transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Launch Demo as Founder (1-Click)</span>
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-[#141413]/08 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab(authTab === 'signin' ? 'signup' : 'signin');
                      setAuthError(null);
                    }}
                    className="text-xs text-[#696969] hover:text-[#141413] transition-colors cursor-pointer font-sans"
                  >
                    {authTab === 'signin' ? (
                      <>Don't have an account? <span className="text-[#141413] font-semibold">Sign up</span></>
                    ) : (
                      <>Already have an account? <span className="text-[#141413] font-semibold">Sign in</span></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Global Catalyst OS AI Chatbot Widget */}
      <CatalystOsChatbot />
    </div>
  );
}
