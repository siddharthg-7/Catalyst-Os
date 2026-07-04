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
import CatalystOsChatbot from './chatbot/CatalystOsChatbot';
import CatalystLogo from './CatalystLogo';

const clerkAppearance = {
  variables: {
    colorPrimary: '#ffffff',
    colorBackground: 'transparent',
    colorInputBackground: 'rgba(255,255,255,0.03)',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: '#71717a',
    colorDanger: '#f87171',
    colorSuccess: '#34d399',
    borderRadius: '0.875rem',
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    fontSize: '0.875rem',
    spacingUnit: '0.75rem',
  },
  elements: {
    // Root containers
    rootBox: {
      width: '100%',
    },
    card: {
      background: 'transparent',
      boxShadow: 'none',
      padding: '0',
      width: '100%',
      border: 'none',
    },
    cardBox: {
      boxShadow: 'none',
      background: 'transparent',
      width: '100%',
    },

    // Header
    header: {
      display: 'none',
    },
    headerTitle: {
      color: '#ffffff',
      fontSize: '1.25rem',
      fontWeight: '700',
      letterSpacing: '-0.02em',
      lineHeight: '1.3',
    },
    headerSubtitle: {
      color: '#71717a',
      fontSize: '0.8125rem',
      marginTop: '0.5rem',
    },

    // Social buttons
    socialButtonsBlockButton: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#fff',
      backdropFilter: 'blur(12px)',
      borderRadius: '0.75rem',
      padding: '0.625rem 0.875rem',
      fontSize: '0.8125rem',
      fontWeight: '500',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      gap: '0.625rem',
      minHeight: '44px',
      textAlign: 'left' as const,
    },
    socialButtonsBlockButton__hover: {
      background: 'rgba(255,255,255,0.06)',
      borderColor: 'rgba(255,255,255,0.1)',
    },
    socialButtonsBlockButton__active: {
      background: 'rgba(255,255,255,0.08)',
    },
    socialButtonsProviderIcon: {
      width: '20px',
      height: '20px',
    },
    socialButtonsIconButton: {
      background: 'transparent',
      border: 'none',
      color: '#fff',
    },

    // Divider
    dividerLine: {
      background: 'rgba(255,255,255,0.06)',
      height: '1px',
      width: '100%',
    },
    dividerText: {
      color: '#52525b',
      fontSize: '0.6875rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase' as const,
      fontWeight: '500',
    },
    dividerButton: {
      fontSize: '0.6875rem',
      color: '#52525b',
    },

    // Form fields
    formField: {
      marginBottom: '0',
      width: '100%',
    },
    formFieldRow: {
      gap: '0.75rem',
      width: '100%',
    },
    formFieldRowInputs: {
      gap: '0.75rem',
    },
    formFieldLabel: {
      color: '#71717a',
      textTransform: 'uppercase' as const,
      fontSize: '0.625rem',
      letterSpacing: '0.1em',
      fontWeight: '600',
      marginBottom: '0.375rem',
      display: 'block',
    },
    formFieldInput: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#ffffff',
      borderRadius: '0.75rem',
      fontSize: '0.875rem',
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      padding: '0.6875rem 0.875rem',
      width: '100%',
      minHeight: '44px',
      boxSizing: 'border-box' as const,
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
      lineHeight: '1.5',
    },
    formFieldInput__text: {},
    formFieldInput__emailAddress: {},
    formFieldInput__username: {},
    formFieldInput__password: {},
    formFieldInput__phone: {},

    // Input focus states
    formFieldInputFocus: {
      borderColor: 'rgba(255,255,255,0.15)',
      background: 'rgba(255,255,255,0.05)',
      boxShadow: '0 0 0 3px rgba(255,255,255,0.03)',
    },

    // Input error states
    formFieldInput__error: {
      borderColor: '#f87171',
      background: 'rgba(248,113,113,0.03)',
    },
    formFieldErrorText: {
      color: '#f87171',
      fontSize: '0.6875rem',
      marginTop: '0.375rem',
      fontWeight: '500',
    },
    formFieldWarningText: {
      color: '#fbbf24',
      fontSize: '0.6875rem',
    },

    // Primary button
    formButtonPrimary: {
      background: 'linear-gradient(135deg, #ffffff 0%, #e4e4e7 100%)',
      color: '#000000',
      fontWeight: '700',
      borderRadius: '0.75rem',
      fontSize: '0.8125rem',
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      letterSpacing: '0.01em',
      boxShadow: '0 0 20px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.3)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      minHeight: '44px',
      padding: '0.625rem 1.25rem',
      width: '100%',
      border: 'none',
      cursor: 'pointer',
    },
    formButtonPrimary__hover: {
      boxShadow: '0 0 30px rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.4)',
      transform: 'translateY(-1px)',
    },
    formButtonPrimary__active: {
      transform: 'translateY(0)',
    },
    formButtonSecondary: {
      background: 'rgba(255,255,255,0.03)',
      color: '#ffffff',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '0.75rem',
      fontWeight: '500',
      fontSize: '0.8125rem',
      minHeight: '44px',
    },

    // Identity preview (when email is shown after entering)
    identityPreview: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '0.75rem',
      padding: '0.625rem 0.875rem',
      color: '#ffffff',
      fontSize: '0.875rem',
    },
    identityPreviewEditButton: {
      color: '#71717a',
      fontSize: '0.75rem',
      fontWeight: '500',
      transition: 'color 0.2s',
    },
    identityPreviewEditButton__hover: {
      color: '#ffffff',
    },

    // OTP / Magic code input
    otpCodeFieldInput: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#ffffff',
      borderRadius: '0.75rem',
      fontSize: '1.25rem',
      fontWeight: '600',
      fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: '0.15em',
      width: '48px',
      height: '56px',
      textAlign: 'center' as const,
    },
    otpCodeFieldInput__error: {
      borderColor: '#f87171',
    },
    otpCodeFieldInputSpacing: {
      marginRight: '0.5rem',
    },

    // Footer / links
    footer: {
      marginTop: '1.5rem',
      paddingTop: '1.25rem',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    },
    footerAction: {
      marginTop: '0',
    },
    footerActionText: {
      color: '#52525b',
      fontSize: '0.8125rem',
    },
    footerActionLink: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: '0.8125rem',
      transition: 'color 0.2s',
    },
    footerActionLink__hover: {
      color: 'rgba(255,255,255,0.8)',
    },
    footerPages: {
      marginTop: '1rem',
    },
    footerPagesLink: {
      color: '#52525b',
      fontSize: '0.75rem',
    },
    footerPagesLink__hover: {
      color: '#a1a1aa',
    },

    // Form helper / resending code
    formResendCodeLink: {
      color: '#ffffff',
      fontSize: '0.75rem',
      fontWeight: '600',
      transition: 'color 0.2s',
    },
    formResendCodeLink__hover: {
      color: 'rgba(255,255,255,0.7)',
    },

    // Verification link / success states
    verificationLinkStatus: {
      color: '#34d399',
    },

    // Alert / notification boxes inside Clerk
    alert: {
      borderRadius: '0.75rem',
      fontSize: '0.8125rem',
      padding: '0.75rem 1rem',
    },
    alertText: {
      fontSize: '0.8125rem',
    },
    alertLink: {
      color: '#ffffff',
      fontWeight: '600',
    },

    // Checkbox / "Keep me signed in"
    formFieldCheckbox: {
      borderRadius: '0.375rem',
      borderColor: 'rgba(255,255,255,0.1)',
    },
    formFieldCheckboxChecked: {
      background: '#ffffff',
      borderColor: '#ffffff',
    },
    formFieldLabelCheckbox: {
      color: '#71717a',
      fontSize: '0.8125rem',
      fontWeight: '400',
    },

    // Password requirements / strength bar
    passwordRequirements: {
      color: '#71717a',
      fontSize: '0.6875rem',
    },
    passwordRequirement: {
      color: '#52525b',
      fontSize: '0.6875rem',
    },
    passwordRequirementText: {
      color: '#52525b',
      fontSize: '0.6875rem',
    },
    passwordRequirementSuccess: {
      color: '#34d399',
    },
    passwordStrengthBar: {
      borderRadius: '999px',
      height: '3px',
    },
    passwordStrengthBarBackground: {
      background: 'rgba(255,255,255,0.06)',
      borderRadius: '999px',
      height: '3px',
    },

    // Modal / overlay (e.g. User Profile modal from Clerk)
    modalBackdrop: {
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
    },
    modalContent: {
      background: '#0a0a0b',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '1rem',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
    },
    modalCloseButton: {
      color: '#71717a',
    },

    // Organization / session list
    avatarBox: {
      width: '40px',
      height: '40px',
      borderRadius: '0.75rem',
      background: 'rgba(255,255,255,0.06)',
    },
    organizationSwitcherTrigger: {
      borderRadius: '0.75rem',
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,255,255,0.03)',
      padding: '0.5rem 0.75rem',
    },
    organizationSwitcherTrigger__hover: {
      background: 'rgba(255,255,255,0.06)',
    },
  },
};

// Premium animated grid background
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{
          background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
          top: '-200px',
          right: '-200px',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.04, 0.06, 0.04],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          bottom: '-150px',
          left: '-150px',
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.03, 0.05, 0.03],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 bg-white rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Premium feature card for left panel
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
      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] backdrop-blur-sm"
    >
      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-white/60" />
      </div>
      <div>
        <p className="text-xs font-semibold text-white/80 mb-0.5">{title}</p>
        <p className="text-[10px] text-white/30 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

export default function AuthScreen() {
  const { loginAsDemo } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'onboarding'>('landing');
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [direction, setDirection] = useState(0);

  // Onboarding state
  const [onboardingPath, setOnboardingPath] = useState<'existing' | 'new'>('existing');
  const [buildingAgents, setBuildingAgents] = useState(false);
  const [agentProgress, setAgentProgress] = useState({
    ceo: false, cfo: false, talent: false, growth: false, ops: false,
  });

  // Form state
  const [startupName, setStartupName] = useState('AeroFlow AI');
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
    setDirection(1);
    setView('auth');
  };

  const navigateTo = (newView: typeof view) => {
    setDirection(newView === 'landing' ? -1 : 1);
    setView(newView);
  };

  const pageVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 40 : -40,
      scale: 0.98,
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -40 : 40,
      scale: 0.98,
    }),
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative font-sans overflow-hidden">
      <AnimatedGrid />

      <AnimatePresence mode="wait" custom={direction}>
        {/* LANDING VIEW */}
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
              onStartBuilding={() => navigateTo('onboarding')}
              onViewDemo={() => loginAsDemo()}
            />
          </motion.div>
        )}

        {/* ONBOARDING VIEW */}
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
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 bg-[#0a0a0b]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
              {/* Left panel - Brand */}
              <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-white/[0.02] to-transparent border-r border-white/[0.04] relative overflow-hidden">
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2.5 mb-12"
                  >
                    <CatalystLogo className="w-6 h-6 text-white" />
                    <span className="text-sm font-bold tracking-tight text-white">Catalyst OS</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-3xl font-bold tracking-tight text-white mb-3 leading-tight"
                  >
                    Build your
                    <br />
                    <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">
                      executive team
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-sm text-white/30 leading-relaxed max-w-xs"
                  >
                    Configure AI agents that understand your startup's context, metrics, and strategic goals.
                  </motion.p>
                </div>

                <div className="space-y-2.5 mt-8">
                  <FeatureCard
                    icon={Cpu}
                    title="AI Executive Agents"
                    description="5 specialized agents with domain expertise"
                    delay={0.5}
                  />
                  <FeatureCard
                    icon={Layers}
                    title="Context-Aware"
                    description="Agents learn your startup's unique metrics"
                    delay={0.6}
                  />
                  <FeatureCard
                    icon={Shield}
                    title="Enterprise Security"
                    description="End-to-end encryption, SOC2 compliant"
                    delay={0.7}
                  />
                </div>

                {/* Decorative grid lines */}
                <div className="absolute bottom-0 right-0 w-40 h-40 opacity-[0.03]">
                  <div className="w-full h-full" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }} />
                </div>
              </div>

              {/* Right panel - Form */}
              <div className="p-8 lg:p-10">
                {!buildingAgents ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Smart Onboarding</h2>
                        <p className="text-white/30 text-xs mt-0.5">Configure your startup parameters</p>
                      </div>
                      <button
                        onClick={() => navigateTo('landing')}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pathway Selector */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {[
                        { id: 'existing' as const, icon: Building2, label: 'Existing Startup', desc: 'Provide metrics & pitch deck' },
                        { id: 'new' as const, icon: Rocket, label: 'New Idea', desc: 'Define concept & timeline' },
                      ].map((path) => (
                        <button
                          key={path.id}
                          onClick={() => setOnboardingPath(path.id)}
                          className={`p-4 rounded-xl border text-left space-y-2 transition-all duration-300 cursor-pointer group ${
                            onboardingPath === path.id
                              ? 'bg-white/[0.06] border-white/[0.12] shadow-[0_0_20px_rgba(255,255,255,0.03)]'
                              : 'bg-white/[0.01] border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.03]'
                          }`}
                        >
                          <path.icon className={`w-4 h-4 transition-colors ${onboardingPath === path.id ? 'text-white' : 'text-white/30'}`} />
                          <h4 className="text-xs font-semibold text-white">{path.label}</h4>
                          <p className="text-[10px] text-white/25 leading-relaxed">{path.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Form Fields */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={onboardingPath}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3 mb-6"
                      >
                        {onboardingPath === 'existing' ? (
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Startup Name', value: startupName, onChange: setStartupName },
                              { label: 'Industry', value: industry, onChange: setIndustry },
                              { label: 'Monthly Burn', value: burnRate, onChange: setBurnRate },
                              { label: 'Runway', value: runway, onChange: setRunway },
                            ].map((field) => (
                              <div key={field.label}>
                                <label className="block text-[10px] uppercase tracking-widest text-white/25 mb-1.5 font-medium">{field.label}</label>
                                <input
                                  type="text"
                                  value={field.value}
                                  onChange={e => field.onChange(e.target.value)}
                                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] uppercase tracking-widest text-white/25 mb-1.5 font-medium">Startup Concept</label>
                              <input
                                type="text"
                                placeholder="e.g. AI-powered automated code review platform"
                                value={idea}
                                onChange={e => setIdea(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/25 mb-1.5 font-medium">Budget</label>
                                <input
                                  type="text"
                                  value={budget}
                                  onChange={e => setBudget(e.target.value)}
                                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase tracking-widest text-white/25 mb-1.5 font-medium">Target Launch</label>
                                <input
                                  type="text"
                                  value={timeline}
                                  onChange={e => setTimeline(e.target.value)}
                                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    <button
                      onClick={startOnboardingAnimation}
                      className="w-full py-3.5 rounded-xl bg-white text-black text-xs font-bold transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                    >
                      Deploy Executive Team
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ) : (
                  /* Building animation */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 text-center space-y-6"
                  >
                    <div className="space-y-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        className="w-10 h-10 mx-auto rounded-xl bg-white/[0.06] flex items-center justify-center"
                      >
                        <Cpu className="w-5 h-5 text-white/60" />
                      </motion.div>
                      <h3 className="text-lg font-bold text-white tracking-tight">Building Your Team</h3>
                      <p className="text-xs text-white/30">Synthesizing domain contexts & initializing agent graphs</p>
                    </div>

                    <div className="space-y-2 max-w-xs mx-auto text-left">
                      {(['ceo', 'cfo', 'talent', 'growth', 'legal'] as const).map((agent, i) => {
                        const labels = { ceo: 'CEO Orchestrator', cfo: 'CFO (Treasury)', talent: 'Head of Talent', growth: 'Head of Growth', legal: 'General Counsel' };
                        const prevDone = i === 0 || agentProgress[['ceo', 'cfo', 'talent', 'growth', 'legal'][i - 1] as keyof typeof agentProgress];
                        return (
                          <motion.div
                            key={agent}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-500 ${
                              agentProgress[agent]
                                ? 'bg-white/[0.06] border-white/[0.1] text-white'
                                : prevDone
                                ? 'bg-white/[0.02] border-white/[0.06] text-white/40'
                                : 'bg-white/[0.01] border-white/[0.03] text-white/15'
                            }`}
                          >
                            <span className="text-xs font-medium">{labels[agent]}</span>
                            {agentProgress[agent] ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              </motion.div>
                            ) : prevDone ? (
                              <RefreshCw className="w-3.5 h-3.5 text-white/20 animate-spin" />
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

        {/* AUTH VIEW */}
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
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 bg-[#0a0a0b]/80 backdrop-blur-2xl border border-white/[0.06] rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
              {/* Left panel - Brand */}
              <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-white/[0.02] to-transparent border-r border-white/[0.04] relative overflow-hidden">
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-2.5 mb-12"
                  >
                    <CatalystLogo className="w-6 h-6 text-white" />
                    <span className="text-sm font-bold tracking-tight text-white">Catalyst OS</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-3xl font-bold tracking-tight text-white mb-3 leading-tight"
                  >
                    {authTab === 'signin'
                      ? 'Welcome'
                      : 'Start your'}
                    <br />
                    <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">
                      {authTab === 'signin' ? 'back.' : 'journey.'}
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-sm text-white/30 leading-relaxed max-w-xs"
                  >
                    {authTab === 'signin'
                      ? 'Sign in to access your AI-powered executive team and strategic dashboard.'
                      : 'Create your account and deploy a full AI executive team in minutes.'}
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3 text-white/20">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/40">Trusted by 2,400+ startups</p>
                      <p className="text-[10px] text-white/20">Across 45 countries worldwide</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-white/20">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white/40">Enterprise-grade security</p>
                      <p className="text-[10px] text-white/20">SOC2 Type II certified</p>
                    </div>
                  </div>
                </motion.div>

                {/* Decorative grid lines */}
                <div className="absolute bottom-0 right-0 w-40 h-40 opacity-[0.03]">
                  <div className="w-full h-full" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }} />
                </div>
              </div>

              {/* Right panel - Auth form */}
              <div className="p-8 lg:p-10 flex flex-col">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between mb-8"
                >
                  <div className="flex items-center gap-2.5 lg:hidden">
                    <CatalystLogo className="w-5 h-5 text-white" />
                    <span className="text-xs font-bold tracking-tight text-white">Catalyst OS</span>
                  </div>
                  <button
                    onClick={() => navigateTo('landing')}
                    className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6"
                >
                  <h2 className="text-xl font-bold text-white tracking-tight mb-1">
                    {authTab === 'signin' ? 'Sign in to Catalyst' : 'Create your account'}
                  </h2>
                  <p className="text-xs text-white/30">
                    {authTab === 'signin'
                      ? 'Enter your credentials to continue'
                      : 'Deploy your AI executive team today'}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex-1"
                >
                  {authTab === 'signin' ? (
                    <SignIn appearance={clerkAppearance} routing="hash" />
                  ) : (
                    <SignUp appearance={clerkAppearance} routing="hash" />
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 pt-5 border-t border-white/[0.04] text-center"
                >
                  <button
                    onClick={() => setAuthTab(authTab === 'signin' ? 'signup' : 'signin')}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                  >
                    {authTab === 'signin' ? (
                      <>Don't have an account? <span className="text-white font-medium">Sign up</span></>
                    ) : (
                      <>Already have an account? <span className="text-white font-medium">Sign in</span></>
                    )}
                  </button>
                </motion.div>

                {/* Demo mode */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-4 text-center"
                >
                  <button
                    onClick={() => loginAsDemo()}
                    className="text-[10px] text-white/15 hover:text-white/30 transition-colors cursor-pointer font-mono uppercase tracking-widest"
                  >
                    or try the demo →
                  </button>
                </motion.div>
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
