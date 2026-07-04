import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignIn, SignUp } from '@clerk/clerk-react';
import {
  Shield, Building2, Rocket, CheckCircle2, RefreshCw,
  ArrowRight, Sparkles, Zap, ChevronRight, ArrowLeft,
  Globe, Lock, Layers, Cpu, BarChart3, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import HackathonLandingPage from './HackathonLandingPage';
import CatalystLogo from './CatalystLogo';

// ── Clerk appearance — Mastercard cream palette ─────────────────────────────
const clerkAppearance = {
  variables: {
    colorPrimary: '#141413',
    colorBackground: 'transparent',
    colorInputBackground: '#ffffff',
    colorInputText: '#141413',
    colorText: '#141413',
    colorTextSecondary: '#696969',
    colorDanger: '#b91c1c',
    colorSuccess: '#15803d',
    borderRadius: '0.875rem',
    fontFamily: '"Sofia Sans", Arial, ui-sans-serif, system-ui, sans-serif',
    fontSize: '0.875rem',
    spacingUnit: '0.75rem',
  },
  elements: {
    rootBox: { width: '100%' },
    card: {
      background: 'transparent',
      boxShadow: 'none',
      padding: '0',
      width: '100%',
      border: 'none',
    },
    cardBox: { boxShadow: 'none', background: 'transparent', width: '100%' },

    header: { display: 'none' },
    headerTitle: {
      color: '#141413',
      fontSize: '1.25rem',
      fontWeight: '700',
      letterSpacing: '-0.02em',
      lineHeight: '1.3',
    },
    headerSubtitle: { color: '#696969', fontSize: '0.8125rem', marginTop: '0.5rem' },

    // Social buttons
    socialButtonsBlockButton: {
      background: '#ffffff',
      border: '1px solid rgba(20,20,19,0.12)',
      color: '#141413',
      borderRadius: '0.75rem',
      padding: '0.625rem 0.875rem',
      fontSize: '0.8125rem',
      fontWeight: '500',
      transition: 'all 0.2s',
      gap: '0.625rem',
      minHeight: '44px',
      textAlign: 'left' as const,
    },
    socialButtonsBlockButton__hover: {
      background: '#F3F0EE',
      borderColor: 'rgba(20,20,19,0.2)',
    },
    socialButtonsProviderIcon: { width: '20px', height: '20px' },
    socialButtonsIconButton: { background: 'transparent', border: 'none', color: '#141413' },

    // Divider
    dividerLine: { background: 'rgba(20,20,19,0.1)', height: '1px', width: '100%' },
    dividerText: {
      color: '#696969',
      fontSize: '0.6875rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
      fontWeight: '500',
    },
    dividerButton: { fontSize: '0.6875rem', color: '#696969' },

    // Form fields
    formField: { marginBottom: '0', width: '100%' },
    formFieldRow: { gap: '0.75rem', width: '100%' },
    formFieldRowInputs: { gap: '0.75rem' },
    formFieldLabel: {
      color: '#696969',
      textTransform: 'uppercase' as const,
      fontSize: '0.625rem',
      letterSpacing: '0.1em',
      fontWeight: '600',
      marginBottom: '0.375rem',
      display: 'block',
    },
    formFieldInput: {
      background: '#ffffff',
      border: '1px solid rgba(20,20,19,0.15)',
      color: '#141413',
      borderRadius: '0.75rem',
      fontSize: '0.875rem',
      fontFamily: '"Sofia Sans", Arial, ui-sans-serif, system-ui, sans-serif',
      padding: '0.6875rem 0.875rem',
      width: '100%',
      minHeight: '44px',
      boxSizing: 'border-box' as const,
      transition: 'all 0.2s',
      outline: 'none',
      lineHeight: '1.5',
    },
    formFieldInputFocus: {
      borderColor: '#141413',
      boxShadow: '0 0 0 3px rgba(20,20,19,0.06)',
    },
    formFieldInput__error: { borderColor: '#b91c1c', background: 'rgba(185,28,28,0.03)' },
    formFieldErrorText: { color: '#b91c1c', fontSize: '0.6875rem', marginTop: '0.375rem', fontWeight: '500' },
    formFieldWarningText: { color: '#92400e', fontSize: '0.6875rem' },

    // Primary button
    formButtonPrimary: {
      background: '#141413',
      color: '#F3F0EE',
      fontWeight: '700',
      borderRadius: '20px',
      fontSize: '0.8125rem',
      fontFamily: '"Sofia Sans", Arial, ui-sans-serif, system-ui, sans-serif',
      letterSpacing: '0.01em',
      boxShadow: 'rgba(0,0,0,0.15) 0px 4px 12px',
      transition: 'all 0.2s',
      minHeight: '44px',
      padding: '0.625rem 1.25rem',
      width: '100%',
      border: 'none',
      cursor: 'pointer',
    },
    formButtonPrimary__hover: {
      background: '#262627',
      boxShadow: 'rgba(0,0,0,0.2) 0px 6px 16px',
      transform: 'translateY(-1px)',
    },
    formButtonPrimary__active: { transform: 'translateY(0)' },
    formButtonSecondary: {
      background: '#ffffff',
      color: '#141413',
      border: '1px solid rgba(20,20,19,0.15)',
      borderRadius: '20px',
      fontWeight: '500',
      fontSize: '0.8125rem',
      minHeight: '44px',
    },

    identityPreview: {
      background: '#F3F0EE',
      border: '1px solid rgba(20,20,19,0.1)',
      borderRadius: '0.75rem',
      padding: '0.625rem 0.875rem',
      color: '#141413',
      fontSize: '0.875rem',
    },
    identityPreviewEditButton: { color: '#696969', fontSize: '0.75rem', fontWeight: '500', transition: 'color 0.2s' },
    identityPreviewEditButton__hover: { color: '#141413' },

    otpCodeFieldInput: {
      background: '#ffffff',
      border: '1px solid rgba(20,20,19,0.15)',
      color: '#141413',
      borderRadius: '0.75rem',
      fontSize: '1.25rem',
      fontWeight: '600',
      fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: '0.15em',
      width: '48px',
      height: '56px',
      textAlign: 'center' as const,
    },
    otpCodeFieldInput__error: { borderColor: '#b91c1c' },
    otpCodeFieldInputSpacing: { marginRight: '0.5rem' },

    footer: { marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(20,20,19,0.08)' },
    footerAction: { marginTop: '0' },
    footerActionText: { color: '#696969', fontSize: '0.8125rem' },
    footerActionLink: { color: '#141413', fontWeight: '600', fontSize: '0.8125rem', transition: 'color 0.2s' },
    footerActionLink__hover: { color: '#262627' },
    footerPages: { marginTop: '1rem' },
    footerPagesLink: { color: '#696969', fontSize: '0.75rem' },
    footerPagesLink__hover: { color: '#141413' },

    formResendCodeLink: { color: '#141413', fontSize: '0.75rem', fontWeight: '600', transition: 'color 0.2s' },
    formResendCodeLink__hover: { color: '#262627' },
    verificationLinkStatus: { color: '#15803d' },

    alert: { borderRadius: '0.75rem', fontSize: '0.8125rem', padding: '0.75rem 1rem', background: '#F3F0EE', border: '1px solid rgba(20,20,19,0.1)' },
    alertText: { fontSize: '0.8125rem', color: '#141413' },
    alertLink: { color: '#141413', fontWeight: '600' },

    formFieldCheckbox: { borderRadius: '0.375rem', borderColor: 'rgba(20,20,19,0.2)' },
    formFieldCheckboxChecked: { background: '#141413', borderColor: '#141413' },
    formFieldLabelCheckbox: { color: '#696969', fontSize: '0.8125rem', fontWeight: '400' },

    passwordRequirements: { color: '#696969', fontSize: '0.6875rem' },
    passwordRequirement: { color: '#696969', fontSize: '0.6875rem' },
    passwordRequirementText: { color: '#696969', fontSize: '0.6875rem' },
    passwordRequirementSuccess: { color: '#15803d' },
    passwordStrengthBar: { borderRadius: '999px', height: '3px' },
    passwordStrengthBarBackground: { background: 'rgba(20,20,19,0.08)', borderRadius: '999px', height: '3px' },

    modalBackdrop: { background: 'rgba(20,20,19,0.5)', backdropFilter: 'blur(8px)' },
    modalContent: {
      background: '#FCFBFA',
      border: '1px solid rgba(20,20,19,0.1)',
      borderRadius: '1.5rem',
      boxShadow: 'rgba(0,0,0,0.12) 0px 40px 80px',
    },
    modalCloseButton: { color: '#696969' },

    avatarBox: { width: '40px', height: '40px', borderRadius: '0.75rem', background: '#F3F0EE' },
    organizationSwitcherTrigger: {
      borderRadius: '0.75rem',
      border: '1px solid rgba(20,20,19,0.1)',
      background: '#ffffff',
      padding: '0.5rem 0.75rem',
    },
    organizationSwitcherTrigger__hover: { background: '#F3F0EE' },
  },
};

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
  onOnboardingComplete?: (onboardingData: {
    startupName: string;
    industry: string;
    burnRate: string;
    runway: string;
    idea: string;
    budget: string;
    timeline: string;
    path: 'existing' | 'new';
  }) => void;
}

export default function AuthScreen({ initialView = 'landing', onOnboardingComplete }: AuthScreenProps) {
  const { loginAsDemo } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'onboarding'>(initialView);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [direction, setDirection] = useState(0);

  const [onboardingPath, setOnboardingPath] = useState<'existing' | 'new'>('existing');
  const [buildingAgents, setBuildingAgents] = useState(false);
  const [agentProgress, setAgentProgress] = useState({
    ceo: false, cfo: false, talent: false, growth: false, ops: false,
  });

  const [startupName, setStartupName] = useState('CatalystOS Startup');
  const [industry, setIndustry] = useState('B2B SaaS / Developer Tools');
  const [burnRate, setBurnRate] = useState('$18,500 / mo');
  const [runway, setRunway] = useState('13.2 months');
  const [idea, setIdea] = useState('');
  const [budget, setBudget] = useState('$50,000');
  const [timeline, setTimeline] = useState('30 Days');

  const startOnboardingAnimation = async () => {
    setBuildingAgents(true);
    const agents = ['ceo', 'cfo', 'talent', 'growth', 'ops'] as const;
    for (const agent of agents) {
      await new Promise(r => setTimeout(r, 600));
      setAgentProgress(p => ({ ...p, [agent]: true }));
    }
    await new Promise(r => setTimeout(r, 800));
    if (onOnboardingComplete) {
      onOnboardingComplete({ startupName, industry, burnRate, runway, idea, budget, timeline, path: onboardingPath });
    } else {
      setDirection(1);
      setView('auth');
    }
  };

  const navigateTo = (newView: typeof view) => {
    setDirection(newView === 'landing' ? -1 : 1);
    setView(newView);
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
    <div className="min-h-screen bg-[#F3F0EE] text-[#141413] relative font-sans overflow-hidden">
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
            />
          </motion.div>
        )}

        {/* ── ONBOARDING VIEW ──────────────────────────────────────────── */}
        {view === 'onboarding' && (
          <motion.div
            key="onboarding"
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
              <div className="hidden lg:flex flex-col justify-between p-10 bg-[#F3F0EE] border-r border-[#141413]/10 relative overflow-hidden">
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
                    Build your<br />
                    <span className="text-[#696969]">executive team</span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-sm text-[#696969] leading-relaxed max-w-xs font-sans"
                  >
                    Configure AI agents that understand your startup's context, metrics, and strategic goals.
                  </motion.p>
                </div>

                <div className="space-y-2.5 mt-8">
                  <FeatureCard icon={Cpu}    title="AI Executive Agents"   description="5 specialized agents with domain expertise"      delay={0.5} />
                  <FeatureCard icon={Layers} title="Context-Aware"         description="Agents learn your startup's unique metrics"      delay={0.6} />
                  <FeatureCard icon={Shield} title="Enterprise Security"   description="End-to-end encryption, SOC2 compliant"          delay={0.7} />
                </div>
              </div>

              {/* Right panel — Onboarding form */}
              <div className="p-8 lg:p-10 bg-white">
                {!buildingAgents ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-lg font-bold text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>Smart Onboarding</h2>
                        <p className="text-[#696969] text-xs mt-0.5 font-sans">Configure your startup parameters</p>
                      </div>
                      <button
                        onClick={() => navigateTo('landing')}
                        className="w-8 h-8 rounded-[10px] bg-[#F3F0EE] border border-[#141413]/10 flex items-center justify-center text-[#696969] hover:text-[#141413] hover:bg-white transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pathway Selector */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {[
                        { id: 'existing' as const, icon: Building2, label: 'Existing Startup', desc: 'Provide metrics & pitch deck' },
                        { id: 'new' as const,      icon: Rocket,    label: 'New Idea',         desc: 'Define concept & timeline' },
                      ].map((path) => (
                        <button
                          key={path.id}
                          onClick={() => setOnboardingPath(path.id)}
                          className={`p-4 rounded-[16px] border text-left space-y-2 transition-all duration-300 cursor-pointer ${
                            onboardingPath === path.id
                              ? 'bg-[#141413] border-[#141413] shadow-[rgba(0,0,0,0.15)_0px_4px_12px]'
                              : 'bg-[#F3F0EE] border-[#141413]/10 hover:border-[#141413]/20 hover:bg-white'
                          }`}
                        >
                          <path.icon className={`w-4 h-4 transition-colors ${onboardingPath === path.id ? 'text-[#F3F0EE]' : 'text-[#141413]/50'}`} />
                          <h4 className={`text-xs font-semibold font-sans ${onboardingPath === path.id ? 'text-[#F3F0EE]' : 'text-[#141413]'}`}>{path.label}</h4>
                          <p className={`text-[10px] leading-relaxed font-sans ${onboardingPath === path.id ? 'text-[#F3F0EE]/60' : 'text-[#696969]'}`}>{path.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Form Fields */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={onboardingPath}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3 mb-6"
                      >
                        {onboardingPath === 'existing' ? (
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Startup Name', value: startupName, onChange: setStartupName },
                              { label: 'Industry',     value: industry,     onChange: setIndustry     },
                              { label: 'Monthly Burn', value: burnRate,     onChange: setBurnRate     },
                              { label: 'Runway',       value: runway,       onChange: setRunway       },
                            ].map((field) => (
                              <div key={field.label}>
                                <label className={labelCls}>{field.label}</label>
                                <input type="text" value={field.value} onChange={e => field.onChange(e.target.value)} className={inputCls} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className={labelCls}>Startup Concept</label>
                              <input type="text" placeholder="e.g. AI-powered automated code review platform" value={idea} onChange={e => setIdea(e.target.value)} className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={labelCls}>Budget</label>
                                <input type="text" value={budget} onChange={e => setBudget(e.target.value)} className={inputCls} />
                              </div>
                              <div>
                                <label className={labelCls}>Target Launch</label>
                                <input type="text" value={timeline} onChange={e => setTimeline(e.target.value)} className={inputCls} />
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    <button
                      onClick={startOnboardingAnimation}
                      className="w-full py-3.5 rounded-[20px] bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold transition-all duration-300 hover:shadow-[rgba(0,0,0,0.15)_0px_6px_16px] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 font-sans"
                    >
                      Deploy Executive Team
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ) : (
                  /* Building animation */
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-6">
                    <div className="space-y-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        className="w-10 h-10 mx-auto rounded-[12px] bg-[#F3F0EE] border border-[#141413]/10 flex items-center justify-center"
                      >
                        <Cpu className="w-5 h-5 text-[#141413]/60" />
                      </motion.div>
                      <h3 className="text-lg font-bold text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>Building Your Team</h3>
                      <p className="text-xs text-[#696969] font-sans">Synthesizing domain contexts & initializing agent graphs</p>
                    </div>

                    <div className="space-y-2 max-w-xs mx-auto text-left">
                      {(['ceo', 'cfo', 'talent', 'growth', 'ops'] as const).map((agent, i) => {
                        const labels = { ceo: 'CEO Orchestrator', cfo: 'CFO (Treasury)', talent: 'Head of Talent', growth: 'Head of Growth', ops: 'Operations Executive' };
                        const prevDone = i === 0 || agentProgress[(['ceo', 'cfo', 'talent', 'growth', 'ops'] as const)[i - 1]];
                        return (
                          <motion.div
                            key={agent}
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            className={`p-3 rounded-[12px] border flex items-center justify-between transition-all duration-500 font-sans ${
                              agentProgress[agent]
                                ? 'bg-[#141413] border-[#141413] text-[#F3F0EE]'
                                : prevDone
                                ? 'bg-[#F3F0EE] border-[#141413]/10 text-[#696969]'
                                : 'bg-white border-[#141413]/05 text-[#141413]/30'
                            }`}
                          >
                            <span className="text-xs font-medium">{labels[agent]}</span>
                            {agentProgress[agent] ? (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                                <CheckCircle2 className="w-4 h-4 text-[#F3F0EE]" />
                              </motion.div>
                            ) : prevDone ? (
                              <RefreshCw className="w-3.5 h-3.5 text-[#696969] animate-spin" />
                            ) : null}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
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

              {/* Right panel — Clerk auth form */}
              <div className="p-8 lg:p-10 flex flex-col bg-white">
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
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
                  <h2 className="text-xl font-bold text-[#141413] mb-1 font-sans" style={{ letterSpacing: '-0.02em' }}>Access CatalystOS</h2>
                  <p className="text-xs text-[#696969] font-sans">Authenticate your session to continue</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex-1">
                  {authTab === 'signin' ? (
                    <SignIn appearance={clerkAppearance} routing="hash" />
                  ) : (
                    <SignUp appearance={clerkAppearance} routing="hash" />
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="mt-6 pt-5 border-t border-[#141413]/08 text-center"
                >
                  <button
                    onClick={() => setAuthTab(authTab === 'signin' ? 'signup' : 'signin')}
                    className="text-xs text-[#696969] hover:text-[#141413] transition-colors cursor-pointer font-sans"
                  >
                    {authTab === 'signin' ? (
                      <>Don't have an account? <span className="text-[#141413] font-semibold">Sign up</span></>
                    ) : (
                      <>Already have an account? <span className="text-[#141413] font-semibold">Sign in</span></>
                    )}
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
