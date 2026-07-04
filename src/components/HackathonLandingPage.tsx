import React, { useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { 
  FaRobot, 
  FaShieldHalved, 
  FaUsers, 
  FaBolt, 
  FaChartColumn, 
  FaBrain, 
  FaLock, 
  FaFingerprint, 
  FaDatabase, 
  FaGlobe, 
  FaStar, 
  FaArrowRight, 
  FaCheck, 
  FaPlus, 
  FaMinus, 
  FaGithub, 
  FaDiscord, 
  FaXTwitter, 
  FaLinkedin, 
  FaCirclePlay, 
  FaSquareCheck, 
  FaSliders, 
  FaRocket,
  FaUserAstronaut,
  FaDocker,
  FaStripe,
  FaAws,
  FaBuildingColumns,
  FaUserCheck,
  FaChartLine,
  FaTerminal
} from 'react-icons/fa6';

import { 
  SiVercel, 
  SiSupabase, 
  SiGooglecloud, 
  SiNvidia, 
  SiCloudflare 
} from 'react-icons/si';

interface HackathonLandingPageProps {
  onStartBuilding: () => void;
  onViewDemo: () => void;
}

export default function HackathonLandingPage({ onStartBuilding, onViewDemo }: HackathonLandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [lottieError, setLottieError] = useState(false);

  // Active matrix agent selection for interactive visualizer
  const [selectedAgent, setSelectedAgent] = useState<'ceo' | 'cfo' | 'talent' | 'growth'>('ceo');

  // Active workflow step for 4-step interactive animation
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);

  // Auto rotate workflow steps every 3.5s for dynamic animation
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveWorkflowStep((prev) => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Monitor scroll for navbar shrink & border effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const partnerLogos = [
    { name: 'Vercel', icon: SiVercel },
    { name: 'Docker', icon: FaDocker },
    { name: 'Stripe', icon: FaStripe },
    { name: 'GitHub', icon: FaGithub },
    { name: 'AWS', icon: FaAws },
    { name: 'Supabase', icon: SiSupabase },
    { name: 'Google Cloud', icon: SiGooglecloud },
    { name: 'NVIDIA', icon: SiNvidia },
    { name: 'Cloudflare', icon: SiCloudflare },
    { name: 'OpenAI', icon: FaBrain },
  ];

  const features = [
    {
      icon: FaRobot,
      title: 'AI Executive Council',
      text: 'Autonomous AI agents manage growth, hiring, financial modeling, and operations in real-time.',
      badge: 'Multi-Agent Matrix'
    },
    {
      icon: FaShieldHalved,
      title: 'Enterprise Security',
      text: 'End-to-end encryption with zero-trust architecture and SOC-2 compliant data privacy.',
      badge: 'Vault Isolated'
    },
    {
      icon: FaUsers,
      title: 'Founder Community',
      text: 'Connect with 10,000+ ambitious builders worldwide and share executable playbooks.',
      badge: 'Global Network'
    },
    {
      icon: FaBolt,
      title: 'Workflow Automation',
      text: 'Automate repetitive corporate workflows, pitch deck updates, and board reporting.',
      badge: 'Zero Overhead'
    },
    {
      icon: FaChartColumn,
      title: 'Real-time Analytics',
      text: 'Instant treasury tracking, burn rate forecasting, and SaaS health index recalculation.',
      badge: 'Live Telemetry'
    },
    {
      icon: FaBrain,
      title: 'AI Persistent Memory',
      text: 'Contextual RAG memory powered by high-dimensional vector search across all files.',
      badge: 'pgvector RAG'
    }
  ];

  const testimonials = [
    {
      quote: "Catalyst OS replaced three executive hires for our seed-stage startup. The CFO agent alone saved us $40k in burn rate within 30 days.",
      author: "Alex Rivera",
      role: "Founder & CEO, HyperScale",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    },
    {
      quote: "The multi-agent debate feature is exceptional. Watching the AI CFO and Head of Growth negotiate marketing budget live is seamless.",
      author: "Elena Rostova",
      role: "Co-Founder, Synthetix AI",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80"
    },
    {
      quote: "As a solo founder, Catalyst OS gave me an entire corporate executive matrix overnight. I went from managing tasks to shipping product.",
      author: "Marcus Vance",
      role: "Founder, DevMatrix",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
    }
  ];

  const faqs = [
    {
      question: "How does Catalyst OS replace executive management?",
      answer: "Catalyst OS deploys dedicated autonomous AI agents (CEO, CFO, Talent, Growth, Operations) governed by a central LangGraph state machine. You provide strategic goals; the executive agents break them down into initiatives, resolve departmental conflicts, and present complete deliverables for your approval."
    },
    {
      question: "Is my corporate financial and legal data secure?",
      answer: "Yes. Catalyst OS implements end-to-end 256-bit encryption, HashiCorp Vault secrets management, and zero-trust memory boundaries. Your corporate pitch decks, financial ledgers, and roadmaps are isolated in dedicated PostgreSQL vector partitions."
    },
    {
      question: "Can I customize the decision parameters of individual agents?",
      answer: "Absolutely. Every executive agent can be tuned with custom operational rules, spend thresholds, and risk tolerances in the Agent Configurator."
    },
    {
      question: "What happens when agents disagree on budget or priorities?",
      answer: "Our ConflictResolver engine detects cross-departmental friction (e.g., Talent requesting hiring budget while CFO enforces cash reserves). The engine negotiates a mediated compromise before submitting the unified proposal for Founder review."
    }
  ];

  const matrixAgents = {
    ceo: {
      role: 'CEO AGENT',
      status: 'PLANNING',
      title: 'Strategic Roadmap',
      desc: 'Decomposes founder vision into sprints and delegates execution across agents.',
      metricLabel: 'Sprint Velocity',
      metricValue: '98.4%',
      tasks: ['Quarterly OKR Decomposition', 'Cross-Agent Initiative Alignment', 'Conflict Resolution Review']
    },
    cfo: {
      role: 'CFO AGENT',
      status: 'TREASURY',
      title: 'Treasury & Burn Rate',
      desc: 'Monitors 13.2-month runway, audits expenses, and manages stock option pools.',
      metricLabel: 'Safe Runway',
      metricValue: '13.2 Mos',
      tasks: ['Burn Rate Cap Enforcement', 'Option Pool Dilution Audit', 'Vendor Cost Optimization']
    },
    talent: {
      role: 'TALENT AGENT',
      status: 'HIRING',
      title: 'Recruitment & Equity',
      desc: 'Parses resumes, scores skill matches, and drafts candidate outreach sequences.',
      metricLabel: 'Skill Match Score',
      metricValue: '96.2%',
      tasks: ['Senior Platform Eng Sourcing', 'NSO Vesting Schedule Draft', 'Gmail Candidate Outreach']
    },
    growth: {
      role: 'GROWTH AGENT',
      status: 'SCALING',
      title: 'Viral Growth Loops',
      desc: 'Generates marketing sequences and tracks +24% MoM user conversion loops.',
      metricLabel: 'User Conversion',
      metricValue: '+24.8%',
      tasks: ['Product-Led Acquisition Funnel', 'Mid-Market B2B Email Campaign', 'LTV/CAC Ratio Modeling']
    }
  };

  const workflowSteps = [
    { step: '01', title: 'Plan', desc: 'Define strategic founder goals in natural language.', icon: FaTerminal },
    { step: '02', title: 'Execute', desc: 'AI executives decompose goals into parallel sprints.', icon: FaRobot },
    { step: '03', title: 'Automate', desc: 'Agents handle filings, outreach, and code deployment.', icon: FaBolt },
    { step: '04', title: 'Scale', desc: 'Track real-time SaaS health and compounding growth.', icon: FaChartLine },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden">
      
      {/* 1. 21ST.DEV GLASSMORPHISM FLOATING NAVBAR */}
      <div className="fixed top-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <nav className={`w-full max-w-5xl rounded-2xl bg-[#050505]/75 backdrop-blur-xl border border-white/10 px-6 py-3.5 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-300 pointer-events-auto ${
          scrolled ? 'py-2.5 bg-[#050505]/90 border-white/15' : ''
        }`}>
          
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-extrabold shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              <FaRocket className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-white text-base tracking-tight font-sans">Catalyst OS</span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#matrix" className="hover:text-white transition-colors">Matrix</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#community" className="hover:text-white transition-colors">Community</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onViewDemo}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FaUserAstronaut className="w-3 h-3 text-zinc-400" />
              <span>Login</span>
            </button>
            <button
              onClick={onStartBuilding}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <FaArrowRight className="w-3 h-3" />
            </button>
          </div>
        </nav>
      </div>

      {/* 2. HERO SECTION (NO BOX / NO GRID AROUND THE ANIMATION) */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Subtle Ambient Lighting */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-white/5 rounded-full blur-[160px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Copy & Actions (No Badge as requested) */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
              Build Faster. <br />
              <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
                Scale Smarter.
              </span> <br />
              Ship Everything.
            </h1>

            <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-lg">
              Catalyst OS replaces your startup's executive team with autonomous AI that plans, executes and grows your company.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <button
                onClick={onStartBuilding}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-sm shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Start Free</span>
                <FaArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onViewDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <FaCirclePlay className="w-4 h-4 text-zinc-400" />
                <span>View Demo</span>
              </button>
            </div>

            {/* Social Proof */}
            <div className="pt-6 flex items-center gap-4 border-t border-zinc-850">
              <div className="flex -space-x-2">
                {testimonials.map((t, idx) => (
                  <img key={idx} src={t.avatar} alt="User" className="w-9 h-9 rounded-full border-2 border-[#050505] object-cover filter grayscale" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-white text-xs">
                  <FaStar className="w-3 h-3 text-white" />
                  <FaStar className="w-3 h-3 text-white" />
                  <FaStar className="w-3 h-3 text-white" />
                  <FaStar className="w-3 h-3 text-white" />
                  <FaStar className="w-3 h-3 text-white" />
                  <span className="text-white font-bold ml-1">5.0</span>
                </div>
                <p className="text-xs text-zinc-500">Trusted by <span className="text-white font-semibold">10,000+ Builders</span> worldwide</p>
              </div>
            </div>

          </div>

          {/* Right Column: Clean Medium-Large Lottie Animation (NO CARD/BOX/GRID BORDER) */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <div className="w-full max-w-lg aspect-square flex items-center justify-center">
              {!lottieError ? (
                <DotLottieReact
                  src="https://lottie.host/abda6c47-59d7-4809-868b-1b603b48259a/9YngNsIMcu.lottie"
                  loop
                  autoplay
                  style={{ width: '100%', height: '100%' }}
                  onError={() => setLottieError(true)}
                />
              ) : (
                <iframe
                  src="https://lottie.host/embed/abda6c47-59d7-4809-868b-1b603b48259a/9YngNsIMcu.lottie"
                  className="w-full h-full border-0"
                  title="Catalyst OS AI Animation"
                />
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 3. TRUSTED COMPANIES CONTINUOUS TICKER MARQUEE WITH WHITE BRAND LOGOS */}
      <section className="py-14 border-y border-zinc-850 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
            Empowering Next-Gen Builders Across Leading Ecosystems
          </p>

          {/* Infinite Auto-Scroll Ticker with White Logos */}
          <div className="relative w-full overflow-hidden py-4">
            <div className="flex w-[200%] animate-marquee space-x-12 items-center">
              {[...partnerLogos, ...partnerLogos].map((partner, idx) => {
                const IconComponent = partner.icon;
                return (
                  <div key={idx} className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-white hover:border-zinc-600 transition-all shrink-0">
                    <IconComponent className="w-5 h-5 text-white" />
                    <span className="text-xs font-bold tracking-wide text-white">{partner.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* 4. FEATURES GRID SECTION (2x3 Grid) */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Everything You Need.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base">
              Powerful AI tools designed to replace operational friction with automated execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl bg-[#0a0a0c] border border-zinc-800 hover:border-zinc-600 transition-all space-y-4 group">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <IconComp className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-zinc-200 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {feat.text}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 5. THE EXECUTIVE COUNCIL MATRIX (VISUAL INTERACTIVE TELEMETRY MAP - NO EMOJIS) */}
      <section id="matrix" className="py-24 px-6 bg-[#09090b] border-y border-zinc-850">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">INTERACTIVE MATRIX</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              The Executive Council Matrix
            </h2>
            <p className="text-sm text-zinc-400">Autonomous AI leadership operating in unison.</p>
          </div>

          {/* Interactive Visual Agent Selector & Dynamic Output Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Agent Select Buttons */}
            <div className="lg:col-span-4 space-y-3">
              {[
                { key: 'ceo', role: 'CEO AGENT', title: 'Strategic Roadmap', icon: FaRobot },
                { key: 'cfo', role: 'CFO AGENT', title: 'Treasury & Burn Rate', icon: FaBuildingColumns },
                { key: 'talent', role: 'TALENT AGENT', title: 'Recruitment & Equity', icon: FaUserCheck },
                { key: 'growth', role: 'GROWTH AGENT', title: 'Viral Growth Loops', icon: FaChartLine },
              ].map((ag) => {
                const IconC = ag.icon;
                const isSel = selectedAgent === ag.key;
                return (
                  <button
                    key={ag.key}
                    onClick={() => setSelectedAgent(ag.key as any)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSel 
                        ? 'bg-white text-black border-white shadow-[0_0_25px_rgba(255,255,255,0.2)]' 
                        : 'bg-[#050505] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconC className={`w-5 h-5 ${isSel ? 'text-black' : 'text-zinc-400'}`} />
                      <div>
                        <span className={`text-[10px] font-mono font-bold block ${isSel ? 'text-black/70' : 'text-zinc-500'}`}>{ag.role}</span>
                        <h4 className="text-xs font-bold">{ag.title}</h4>
                      </div>
                    </div>
                    <span className={`text-xs ${isSel ? 'text-black' : 'text-zinc-600'}`}>→</span>
                  </button>
                );
              })}
            </div>

            {/* Live Visual Telemetry Screen */}
            <div className="lg:col-span-8 p-8 rounded-3xl bg-[#050505] border border-zinc-800 space-y-6 shadow-2xl relative overflow-hidden">
              
              <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-white">{matrixAgents[selectedAgent].role}</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-white">
                  STATUS: {matrixAgents[selectedAgent].status}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{matrixAgents[selectedAgent].title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{matrixAgents[selectedAgent].desc}</p>
              </div>

              {/* Dynamic Telemetry Graph / Metric */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">{matrixAgents[selectedAgent].metricLabel}</span>
                  <span className="text-2xl font-extrabold text-white font-mono">{matrixAgents[selectedAgent].metricValue}</span>
                </div>
                
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Active Exec Tasks</span>
                  <div className="space-y-1">
                    {matrixAgents[selectedAgent].tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-300">
                        <FaCheck className="w-3 h-3 text-white shrink-0" />
                        <span className="truncate">{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 6. ENTERPRISE SECURITY SECTION */}
      <section id="security" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Cryptographic Shield */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative shadow-[0_0_60px_rgba(255,255,255,0.05)]">
              <FaShieldHalved className="w-28 h-28 text-white animate-pulse" />
              <div className="absolute inset-4 rounded-full border border-dashed border-zinc-700 animate-spin" style={{ animationDuration: '20s' }} />
            </div>
          </div>

          {/* Right Column: Security Checklist */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="text-xs uppercase font-bold text-zinc-400">ENTERPRISE SECURITY</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Zero Trust Architecture. <br /> Total Data Isolation.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Your startup data is protected by bank-grade cryptographic boundaries and HashiCorp Vault key isolation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {[
                { title: "SOC 2 Type II Certified", icon: FaShieldHalved },
                { title: "256-bit AES Encryption", icon: FaLock },
                { title: "Zero Trust Architecture", icon: FaFingerprint },
                { title: "Role-Based Access Control", icon: FaUsers },
                { title: "Real-time Threat Detection", icon: FaBolt },
                { title: "Immutable Audit Logs", icon: FaDatabase },
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0a0a0c] border border-zinc-800">
                    <ItemIcon className="w-4 h-4 text-white" />
                    <span className="text-xs font-bold text-white font-mono">{item.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* 7. ANIMATED 4-STEP WORKFLOW TIMELINE SECTION */}
      <section className="py-24 px-6 bg-[#09090b] border-y border-zinc-850">
        <div className="max-w-7xl mx-auto space-y-16 text-center">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono text-zinc-500 uppercase font-bold">WORKFLOW ENGINE</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              From Goal to Execution in 4 Steps
            </h2>
          </div>

          {/* Interactive Animated Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((st, idx) => {
              const StepIcon = st.icon;
              const isActive = activeWorkflowStep === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveWorkflowStep(idx)}
                  className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer text-left relative ${
                    isActive
                      ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] -translate-y-2'
                      : 'bg-[#050505] text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-2xl font-extrabold font-mono ${isActive ? 'text-black' : 'text-white'}`}>{st.step}</span>
                    <StepIcon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-zinc-500'}`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 ${isActive ? 'text-black' : 'text-white'}`}>{st.title}</h3>
                  <p className={`text-xs leading-relaxed ${isActive ? 'text-black/80' : 'text-zinc-400'}`}>{st.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 8. COMMUNITY METRICS SECTION */}
      <section id="community" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto space-y-16 text-center">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs uppercase font-bold text-zinc-400">FOUNDER COMMUNITY</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Powered by Ambitious Builders
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-zinc-800 space-y-2">
              <FaUsers className="w-8 h-8 text-white mx-auto" />
              <span className="text-4xl font-extrabold text-white font-mono block">10,000+</span>
              <span className="text-xs text-zinc-500 uppercase font-mono">Active Builders</span>
            </div>

            <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-zinc-800 space-y-2">
              <FaGlobe className="w-8 h-8 text-white mx-auto" />
              <span className="text-4xl font-extrabold text-white font-mono block">50+</span>
              <span className="text-xs text-zinc-500 uppercase font-mono">Countries Represented</span>
            </div>

            <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-zinc-800 space-y-2">
              <FaBolt className="w-8 h-8 text-white mx-auto" />
              <span className="text-4xl font-extrabold text-white font-mono block">100,000+</span>
              <span className="text-xs text-zinc-500 uppercase font-mono">Tasks Automated</span>
            </div>
          </div>

        </div>
      </section>

      {/* 9. TESTIMONIALS CAROUSEL */}
      <section className="py-24 px-6 bg-[#09090b] border-y border-zinc-850">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs uppercase text-zinc-500 font-bold">WALL OF LOVE</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Loved by Startup Founders
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#050505] border border-zinc-800 space-y-4 flex flex-col justify-between">
                <p className="text-xs text-zinc-300 leading-relaxed italic">
                  "{t.quote}"
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-zinc-850">
                  <img src={t.avatar} alt={t.author} className="w-10 h-10 rounded-full object-cover border border-zinc-700 filter grayscale" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{t.author}</h4>
                    <p className="text-[10px] text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. PRICING SECTION */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs uppercase text-zinc-500 font-bold">SIMPLE PRICING</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Invest in Execution, Not Overhead
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Starter Plan */}
            <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-zinc-800 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs uppercase text-zinc-500 font-bold">STARTER</span>
                <div className="text-3xl font-extrabold text-white font-mono">$0 <span className="text-xs text-zinc-500">/ month</span></div>
                <p className="text-xs text-zinc-400">Essential AI capabilities for solo founders exploring idea validation.</p>

                <div className="space-y-2 text-xs pt-4 border-t border-zinc-850">
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-zinc-400" /> 2 Executive Agents (CEO & CFO)</div>
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-zinc-400" /> 100 RAG Memory Queries/mo</div>
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-zinc-400" /> Basic Dashboard Metrics</div>
                </div>
              </div>

              <button onClick={onStartBuilding} className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold font-mono transition-all cursor-pointer">
                Start Free
              </button>
            </div>

            {/* Pro Plan (Highlighted with White Border) */}
            <div className="p-8 rounded-2xl bg-[#09090b] border-2 border-white space-y-6 flex flex-col justify-between relative shadow-[0_0_40px_rgba(255,255,255,0.15)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white text-black text-[10px] font-mono font-bold uppercase tracking-wider">
                MOST POPULAR
              </div>

              <div className="space-y-4">
                <span className="text-xs text-white uppercase font-bold">PRO EXECUTIVE MATRIX</span>
                <div className="text-3xl font-extrabold text-white font-mono">$49 <span className="text-xs text-zinc-500">/ month</span></div>
                <p className="text-xs text-zinc-300">Complete multi-agent executive council for scaling startups.</p>

                <div className="space-y-2 text-xs pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-white" /> All 5 Executive Agents</div>
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-white" /> Unlimited RAG Vector Search</div>
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-white" /> Live Inter-Agent Debate Engine</div>
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-white" /> Gmail & Calendar Integrations</div>
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-white" /> Scenario Simulator & Risk Engine</div>
                </div>
              </div>

              <button onClick={onStartBuilding} className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-extrabold font-mono transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Get Pro Access
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-zinc-800 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs uppercase text-zinc-500 font-bold">ENTERPRISE</span>
                <div className="text-3xl font-extrabold text-white font-mono">Custom</div>
                <p className="text-xs text-zinc-400">Dedicated Kubernetes deployment with custom Vault encryption.</p>

                <div className="space-y-2 text-xs pt-4 border-t border-zinc-850">
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-zinc-400" /> Custom LLM / Fine-Tuning</div>
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-zinc-400" /> Dedicated K8s Cluster</div>
                  <div className="flex items-center gap-2 text-white"><FaCheck className="text-zinc-400" /> 24/7 Priority SLA Support</div>
                </div>
              </div>

              <button onClick={onViewDemo} className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold font-mono transition-all cursor-pointer">
                Contact Sales
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 11. FAQ ACCORDION SECTION */}
      <section id="faq" className="py-24 px-6 bg-[#09090b] border-y border-zinc-850">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs uppercase text-zinc-500 font-bold">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl bg-[#050505] border border-zinc-800 overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm text-white flex items-center justify-between cursor-pointer"
                >
                  <span>{faq.question}</span>
                  {activeFaq === idx ? <FaMinus className="text-white" /> : <FaPlus className="text-zinc-500" />}
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-850 pt-3 font-sans">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. BLACK & WHITE CTA SECTION */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto p-12 rounded-3xl bg-[#09090b] border border-zinc-800 text-center space-y-6 relative z-10 shadow-[0_0_60px_rgba(255,255,255,0.05)]">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-black mx-auto shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            <FaRocket className="w-5 h-5" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Start Building Today.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto">
            Launch faster with your AI executive team. Join 10,000+ founders transforming startup execution.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartBuilding}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all cursor-pointer font-mono"
            >
              Start Free
            </button>
            <button
              onClick={onViewDemo}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs transition-all cursor-pointer font-mono"
            >
              Book Demo
            </button>
          </div>
        </div>
      </section>

      {/* 13. FOOTER */}
      <footer className="py-16 px-6 border-t border-zinc-850 bg-[#050505]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 text-xs">
          
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black">
                <FaRocket className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-white text-base tracking-tight">Catalyst OS</span>
            </div>
            <p className="text-zinc-500 max-w-xs leading-relaxed">
              The production-ready AI Operating System powering the next generation of autonomous startups.
            </p>
            <div className="flex items-center gap-4 text-base text-zinc-500">
              <FaGithub className="hover:text-white transition-colors cursor-pointer" />
              <FaDiscord className="hover:text-white transition-colors cursor-pointer" />
              <FaXTwitter className="hover:text-white transition-colors cursor-pointer" />
              <FaLinkedin className="hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono text-white font-bold uppercase text-[10px]">Product</h4>
            <ul className="space-y-2 text-zinc-500">
              <li className="hover:text-white transition-colors cursor-pointer">Executive Matrix</li>
              <li className="hover:text-white transition-colors cursor-pointer">LangGraph Graph</li>
              <li className="hover:text-white transition-colors cursor-pointer">MCP Tools</li>
              <li className="hover:text-white transition-colors cursor-pointer">pgvector RAG</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono text-white font-bold uppercase text-[10px]">Resources</h4>
            <ul className="space-y-2 text-zinc-500">
              <li className="hover:text-white transition-colors cursor-pointer">Documentation</li>
              <li className="hover:text-white transition-colors cursor-pointer">API Reference</li>
              <li className="hover:text-white transition-colors cursor-pointer">K8s Manifests</li>
              <li className="hover:text-white transition-colors cursor-pointer">Vault Setup</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono text-white font-bold uppercase text-[10px]">Legal</h4>
            <ul className="space-y-2 text-zinc-500">
              <li className="hover:text-white transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white transition-colors cursor-pointer">Terms of Service</li>
              <li className="hover:text-white transition-colors cursor-pointer">SOC-2 Disclosure</li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-zinc-600">
          <span>© {new Date().getFullYear()} Catalyst OS Inc. All rights reserved.</span>
          <span>Monochrome Black & White Apple × Linear × Stripe Design System.</span>
        </div>
      </footer>

    </div>
  );
}
