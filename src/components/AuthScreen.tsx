import React, { useState, useEffect, useRef, useMemo } from 'react';
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

    footer: { display: 'none' },
    footerAction: { display: 'none' },
    footerActionText: { display: 'none' },
    footerActionLink: { display: 'none' },
    footerActionLink__hover: { display: 'none' },
    footerPages: { display: 'none' },
    footerPagesLink: { display: 'none' },
    footerPagesLink__hover: { display: 'none' },

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
  const { loginAsDemo, user } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'onboarding'>(initialView);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [direction, setDirection] = useState(0);

  const [onboardingPath, setOnboardingPath] = useState<'existing' | 'new'>('existing');
  const [currentStep, setCurrentStep] = useState(0); // 0 = Welcome, 1-8 = Questions, 9 = Checklist
  const [checkmarkProgress, setCheckmarkProgress] = useState(0);

  // Existing Startup States
  const [existingName, setExistingName] = useState('');
  const [existingDescription, setExistingDescription] = useState('');
  const [existingIndustry, setExistingIndustry] = useState('SaaS');
  const [existingStage, setExistingStage] = useState('MVP');
  const [existingTeamSize, setExistingTeamSize] = useState(1);
  const [existingChallenge, setExistingChallenge] = useState('Hiring');
  const [existingMilestone, setExistingMilestone] = useState('90 Days');
  const [existingAdditional, setExistingAdditional] = useState('');

  // New Idea States
  const [newIdea, setNewIdea] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newCustomers, setNewCustomers] = useState('');
  const [newIndustry, setNewIndustry] = useState('SaaS');
  const [newTeamStyle, setNewTeamStyle] = useState('Solo Founder');
  const [newChallenge, setNewChallenge] = useState('Building an MVP');
  const [newTimeline, setNewTimeline] = useState('90 Days');
  const [newAdditional, setNewAdditional] = useState('');

  const runChecklistAnimation = async () => {
    setCheckmarkProgress(0);
    for (let i = 1; i <= 4; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setCheckmarkProgress(i);
    }
    await new Promise(resolve => setTimeout(resolve, 800));

    const finalPayload = onboardingPath === 'existing'
      ? {
          path: 'existing',
          startupName: existingName || 'CatalystOS Startup',
          startupDescription: existingDescription || 'B2B software solutions',
          industry: existingIndustry,
          stage: existingStage,
          teamSize: String(existingTeamSize),
          biggestChallenge: existingChallenge,
          timeline: existingMilestone,
          additionalInfo: existingAdditional
        }
      : {
          path: 'new',
          startupName: 'My Startup Project',
          startupDescription: newIdea || 'Scratch startup idea',
          industry: newIndustry,
          stage: 'Idea',
          teamSize: newTeamStyle,
          biggestChallenge: newChallenge,
          timeline: newTimeline,
          additionalInfo: newAdditional
        };

    if (user?.id) {
      localStorage.setItem(`catalystos_onboarding_context_${user.id}`, JSON.stringify(finalPayload));
    }

    if (onOnboardingComplete) {
      onOnboardingComplete({
        startupName: finalPayload.startupName,
        industry: finalPayload.industry,
        burnRate: onboardingPath === 'existing' ? `$${existingTeamSize * 8000} / mo` : '$0 / mo',
        runway: '12 months',
        idea: finalPayload.startupDescription,
        budget: onboardingPath === 'existing' ? '$100,000' : '$5,000',
        timeline: finalPayload.timeline,
        path: onboardingPath
      });
    }
  };

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
    } else {
      setCurrentStep(9);
      runChecklistAnimation();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isNextDisabled = useMemo(() => {
    if (onboardingPath === 'existing') {
      if (currentStep === 1 && !existingName.trim()) return true;
      if (currentStep === 2 && !existingDescription.trim()) return true;
    } else {
      if (currentStep === 1 && !newIdea.trim()) return true;
      if (currentStep === 2 && !newProblem.trim()) return true;
      if (currentStep === 3 && !newCustomers.trim()) return true;
    }
    return false;
  }, [currentStep, onboardingPath, existingName, existingDescription, newIdea, newProblem, newCustomers]);

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

        {/* ── ONBOARDING VIEW (Redesigned Conversational Startup Setup) ── */}
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
            <div className="w-full max-w-xl bg-white border border-[#141413]/10 rounded-[32px] p-8 md:p-10 shadow-[rgba(0,0,0,0.08)_0px_40px_80px] relative overflow-hidden">
              
              {/* Step Progress Header */}
              {currentStep > 0 && currentStep <= 8 && (
                <div className="flex items-center justify-between border-b border-[#141413]/10 pb-3.5 mb-6">
                  <span className="text-[10px] font-mono font-bold text-[#696969] uppercase tracking-widest">
                    Question {currentStep} of 8
                  </span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          idx + 1 === currentStep 
                            ? 'w-6 bg-[#141413]' 
                            : idx + 1 < currentStep 
                            ? 'w-2 bg-[#141413]/40' 
                            : 'w-2 bg-[#141413]/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Questionnaire Content Panels */}
              <AnimatePresence mode="wait">
                
                {/* ── Step 0: Welcome Screen ── */}
                {currentStep === 0 && (
                  <motion.div
                    key="step-welcome"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    <div className="space-y-3 text-center">
                      <div className="w-10 h-10 rounded-xl bg-[#F3F0EE] border border-[#141413]/10 flex items-center justify-center mx-auto mb-2">
                        <CatalystLogo className="w-5 h-5 text-[#141413]" />
                      </div>
                      <h2 className="text-2xl font-bold text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>
                        Let's get to know your startup.
                      </h2>
                      <p className="text-xs text-[#696969] leading-relaxed max-w-sm mx-auto font-sans">
                        We'll ask a few quick questions so CatalystOS can personalize your workspace and AI companion.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          setOnboardingPath('existing');
                          handleNext();
                        }}
                        className="p-5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white text-left space-y-2.5 transition-all cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-[#141413]/05 flex items-center justify-center group-hover:bg-[#141413] transition-colors">
                          <Building2 className="w-4 h-4 text-[#141413] group-hover:text-[#F3F0EE] transition-colors" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#141413] font-sans">Existing Startup</h4>
                          <p className="text-[10px] text-[#696969] leading-relaxed font-sans mt-0.5">Continue building an existing company.</p>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setOnboardingPath('new');
                          handleNext();
                        }}
                        className="p-5 rounded-[20px] bg-[#F3F0EE] border border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white text-left space-y-2.5 transition-all cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-[#141413]/05 flex items-center justify-center group-hover:bg-[#141413] transition-colors">
                          <Rocket className="w-4 h-4 text-[#141413] group-hover:text-[#F3F0EE] transition-colors" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#141413] font-sans">New Startup Idea</h4>
                          <p className="text-[10px] text-[#696969] leading-relaxed font-sans mt-0.5">I'm starting from scratch.</p>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── Path 1: Existing Startup Questions (1-8) ── */}
                {onboardingPath === 'existing' && currentStep > 0 && currentStep <= 8 && (
                  <motion.div
                    key={`existing-step-${currentStep}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">What is your startup called?</label>
                        <input
                          type="text"
                          placeholder="e.g. Acme Corp"
                          value={existingName}
                          onChange={e => setExistingName(e.target.value)}
                          className={inputCls}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && !isNextDisabled && handleNext()}
                        />
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">What does your startup do?</label>
                        <textarea
                          placeholder="Describe your product, service, or business model..."
                          value={existingDescription}
                          onChange={e => setExistingDescription(e.target.value)}
                          className={`${inputCls} min-h-[140px] resize-none`}
                          autoFocus
                        />
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">Which industry are you in?</label>
                        <select
                          value={existingIndustry}
                          onChange={e => setExistingIndustry(e.target.value)}
                          className={inputCls}
                        >
                          {['SaaS', 'Healthcare', 'FinTech', 'Education', 'AI', 'E-commerce', 'Other'].map(ind => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">What stage is your startup currently in?</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {['Idea', 'MVP', 'Beta', 'Early Revenue', 'Scaling'].map(stg => (
                            <button
                              key={stg}
                              type="button"
                              onClick={() => setExistingStage(stg)}
                              className={`p-3.5 rounded-[16px] border text-xs font-bold transition-all cursor-pointer font-sans ${
                                existingStage === stg
                                  ? 'bg-[#141413] border-[#141413] text-[#F3F0EE]'
                                  : 'bg-[#F3F0EE] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white text-[#141413]'
                              }`}
                            >
                              {stg}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentStep === 5 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">How many people are currently on your team?</label>
                        <div className="flex items-center gap-4 py-2">
                          <button
                            type="button"
                            onClick={() => setExistingTeamSize(Math.max(1, existingTeamSize - 1))}
                            className="w-11 h-11 rounded-full border border-[#141413]/10 bg-[#F3F0EE] hover:bg-white text-lg font-bold flex items-center justify-center transition-all cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xl font-bold font-mono min-w-[50px] text-center">{existingTeamSize}</span>
                          <button
                            type="button"
                            onClick={() => setExistingTeamSize(existingTeamSize + 1)}
                            className="w-11 h-11 rounded-full border border-[#141413]/10 bg-[#F3F0EE] hover:bg-white text-lg font-bold flex items-center justify-center transition-all cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    {currentStep === 6 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">What is your biggest challenge right now?</label>
                        <div className="grid grid-cols-2 gap-2.5">
                          {['Hiring', 'Fundraising', 'Product Development', 'Marketing', 'Finding Customers', 'Operations', 'Other'].map(ch => (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setExistingChallenge(ch)}
                              className={`p-3 rounded-[14px] border text-left text-xs font-bold transition-all cursor-pointer font-sans truncate ${
                                existingChallenge === ch
                                  ? 'bg-[#141413] border-[#141413] text-[#F3F0EE]'
                                  : 'bg-[#F3F0EE] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white text-[#141413]'
                              }`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentStep === 7 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">When do you want to achieve your next major milestone?</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['30 Days', '60 Days', '90 Days', '6 Months', 'Custom'].map(tls => (
                            <button
                              key={tls}
                              type="button"
                              onClick={() => setExistingMilestone(tls)}
                              className={`p-3.5 rounded-[16px] border text-xs font-bold transition-all cursor-pointer font-sans ${
                                existingMilestone === tls
                                  ? 'bg-[#141413] border-[#141413] text-[#F3F0EE]'
                                  : 'bg-[#F3F0EE] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white text-[#141413]'
                              }`}
                            >
                              {tls}
                            </button>
                          ))}
                        </div>
                        {existingMilestone === 'Custom' && (
                          <input
                            type="text"
                            placeholder="e.g. End of Q3, next month"
                            value={existingMilestone === 'Custom' ? '' : existingMilestone}
                            onChange={e => setExistingMilestone(e.target.value)}
                            className={`${inputCls} mt-2`}
                            autoFocus
                          />
                        )}
                      </div>
                    )}

                    {currentStep === 8 && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-lg font-bold text-[#141413] font-sans block">Anything else you'd like CatalystOS to know?</label>
                          <span className="text-[10px] text-[#696969] block">Optional. Share any details or requirements.</span>
                        </div>
                        <textarea
                          placeholder="e.g. Seeking options policy reviews, treasury burn details..."
                          value={existingAdditional}
                          onChange={e => setExistingAdditional(e.target.value)}
                          className={`${inputCls} min-h-[120px] resize-none`}
                          autoFocus
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Path 2: New Startup Idea Questions (1-8) ── */}
                {onboardingPath === 'new' && currentStep > 0 && currentStep <= 8 && (
                  <motion.div
                    key={`new-step-${currentStep}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-6"
                  >
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">What's your startup idea?</label>
                        <textarea
                          placeholder="Describe your concept, vision, or product idea..."
                          value={newIdea}
                          onChange={e => setNewIdea(e.target.value)}
                          className={`${inputCls} min-h-[140px] resize-none`}
                          autoFocus
                        />
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">What problem are you trying to solve?</label>
                        <textarea
                          placeholder="Explain the user pain point or inefficiency you're targetting..."
                          value={newProblem}
                          onChange={e => setNewProblem(e.target.value)}
                          className={`${inputCls} min-h-[140px] resize-none`}
                          autoFocus
                        />
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">Who are your target customers?</label>
                        <input
                          type="text"
                          placeholder="e.g. Small agencies, freelance developers, retail buyers"
                          value={newCustomers}
                          onChange={e => setNewCustomers(e.target.value)}
                          className={inputCls}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && !isNextDisabled && handleNext()}
                        />
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">Which industry best fits your idea?</label>
                        <select
                          value={newIndustry}
                          onChange={e => setNewIndustry(e.target.value)}
                          className={inputCls}
                        >
                          {['SaaS', 'Healthcare', 'FinTech', 'Education', 'AI', 'E-commerce', 'Other'].map(ind => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {currentStep === 5 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">Are you building alone or with a team?</label>
                        <div className="grid grid-cols-1 gap-3">
                          {['Solo Founder', '2–5 Members', '6+ Members'].map(ts => (
                            <button
                              key={ts}
                              type="button"
                              onClick={() => setNewTeamStyle(ts)}
                              className={`p-4 rounded-[16px] border text-left text-xs font-bold transition-all cursor-pointer font-sans ${
                                newTeamStyle === ts
                                  ? 'bg-[#141413] border-[#141413] text-[#F3F0EE]'
                                  : 'bg-[#F3F0EE] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white text-[#141413]'
                              }`}
                            >
                              {ts}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentStep === 6 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">What's your biggest challenge today?</label>
                        <div className="grid grid-cols-2 gap-2.5">
                          {['Validating my idea', 'Building an MVP', 'Finding Co-founders', 'Funding', 'Marketing', 'Other'].map(ch => (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => setNewChallenge(ch)}
                              className={`p-3.5 rounded-[16px] border text-left text-xs font-bold transition-all cursor-pointer font-sans truncate ${
                                newChallenge === ch
                                  ? 'bg-[#141413] border-[#141413] text-[#F3F0EE]'
                                  : 'bg-[#F3F0EE] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white text-[#141413]'
                              }`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentStep === 7 && (
                      <div className="space-y-4">
                        <label className="text-lg font-bold text-[#141413] font-sans">When would you like to launch?</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['30 Days', '60 Days', '90 Days', '6 Months', 'No Timeline Yet'].map(tl => (
                            <button
                              key={tl}
                              type="button"
                              onClick={() => setNewTimeline(tl)}
                              className={`p-3.5 rounded-[16px] border text-xs font-bold transition-all cursor-pointer font-sans ${
                                newTimeline === tl
                                  ? 'bg-[#141413] border-[#141413] text-[#F3F0EE]'
                                  : 'bg-[#F3F0EE] border-[#141413]/10 hover:border-[#141413]/30 hover:bg-white text-[#141413]'
                              }`}
                            >
                              {tl}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentStep === 8 && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-lg font-bold text-[#141413] font-sans block">Anything else you'd like CatalystOS to know?</label>
                          <span className="text-[10px] text-[#696969] block">Optional.</span>
                        </div>
                        <textarea
                          placeholder="e.g. Custom requirements or specialized questions for setup..."
                          value={newAdditional}
                          onChange={e => setNewAdditional(e.target.value)}
                          className={`${inputCls} min-h-[120px] resize-none`}
                          autoFocus
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Step 9: Redesigned Checklist Loader ── */}
                {currentStep === 9 && (
                  <motion.div
                    key="step-checklist"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 text-center space-y-6"
                  >
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-[#141413] font-sans" style={{ letterSpacing: '-0.02em' }}>
                        Perfect!
                      </h2>
                      <p className="text-xs text-[#696969] font-sans">
                        We're setting up your personalized CatalystOS workspace.
                      </p>
                    </div>

                    <div className="space-y-2.5 max-w-xs mx-auto text-left">
                      {[
                        { label: 'Understanding your startup...', step: 1 },
                        { label: 'Preparing your AI companion...', step: 2 },
                        { label: 'Creating your launch roadmap...', step: 3 },
                        { label: 'Personalizing your dashboard...', step: 4 },
                      ].map((item) => (
                        <div
                          key={item.step}
                          className={`flex items-center gap-3 p-3.5 rounded-[16px] border transition-all duration-500 font-sans ${
                            checkmarkProgress >= item.step
                              ? 'bg-[#141413] border-[#141413] text-[#F3F0EE] shadow-[rgba(0,0,0,0.1)_0px_4px_12px]'
                              : checkmarkProgress === item.step - 1
                              ? 'bg-[#F3F0EE] border-[#141413]/15 text-[#696969]'
                              : 'bg-white border-[#141413]/05 text-[#141413]/20'
                          }`}
                        >
                          {checkmarkProgress >= item.step ? (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex-shrink-0">
                              <CheckCircle2 className="w-4 h-4 text-[#F3F0EE]" />
                            </motion.div>
                          ) : checkmarkProgress === item.step - 1 ? (
                            <RefreshCw className="w-3.5 h-3.5 text-[#696969] animate-spin flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-[#141413]/10 flex-shrink-0" />
                          )}
                          <span className="text-xs font-semibold">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Wizard Navigation Footer */}
              {currentStep > 0 && currentStep <= 8 && (
                <div className="flex items-center justify-between border-t border-[#141413]/10 pt-4 mt-8">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex items-center gap-1 text-xs text-[#696969] hover:text-[#141413] transition-colors cursor-pointer font-sans"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isNextDisabled}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-[#141413] hover:bg-[#262627] text-[#F3F0EE] text-xs font-bold transition-all rounded-[20px] disabled:opacity-40 cursor-pointer font-sans animate-fade-in"
                  >
                    <span>{currentStep === 8 ? 'Finish Setup' : 'Continue'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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

      {/* Global Catalyst OS AI Chatbot Widget */}
      <CatalystOsChatbot />
    </div>
  );
}
