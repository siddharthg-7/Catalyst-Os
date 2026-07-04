import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { 
  Sparkles, 
  ArrowRight, 
  Shield, 
  ShieldCheck, 
  Lock, 
  Check, 
  CheckCircle2, 
  Zap, 
  TrendingUp, 
  Users, 
  Bot, 
  Cpu, 
  LineChart, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Play, 
  Building2, 
  Rocket, 
  Search, 
  Globe, 
  Activity, 
  DollarSign, 
  Layers, 
  Plus, 
  Minus, 
  HelpCircle, 
  Send, 
  Terminal, 
  X, 
  Menu,
  Clock,
  ArrowUpRight,
  Briefcase,
  Award,
  ChevronRight
} from 'lucide-react';
import CatalystLogo from './CatalystLogo';

import { 
  SiVercel, 
  SiSupabase, 
  SiGooglecloud, 
  SiNvidia, 
  SiCloudflare 
} from 'react-icons/si';

import { FaDocker, FaStripe, FaGithub, FaAws, FaBrain } from 'react-icons/fa6';

interface HackathonLandingPageProps {
  onStartBuilding: () => void;
  onViewDemo: () => void;
}

export default function HackathonLandingPage({ onStartBuilding, onViewDemo }: HackathonLandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedExec, setSelectedExec] = useState<'ceo' | 'cfo' | 'coo' | 'cmo' | 'cto' | 'hr'>('ceo');
  const [activeModuleTab, setActiveModuleTab] = useState<'all' | 'operate' | 'grow' | 'manage' | 'fund'>('all');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [lottieError, setLottieError] = useState(false);

  // AI Assistant Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Good morning Founder. I analyzed your Q3 metrics. Runway is stable at 13.2 months. Growth speed is +24.8% MoM. Shall we review top priorities?' }
  ]);

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev, 
        { role: 'assistant', text: `Understood. Deploying ${selectedExec.toUpperCase()} Agent sub-routine for: "${userText}". Executive strategy update queued.` }
      ]);
    }, 800);
  };

  // Dynamic Cursor Spotlight
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Monitor scroll for floating glass navbar shrinking (84px -> 68px)
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const partnerLogos = [
    { name: 'Techstars', icon: Award },
    { name: 'Y Combinator', icon: Rocket },
    { name: 'Vercel', icon: SiVercel },
    { name: 'Stripe', icon: FaStripe },
    { name: 'Docker', icon: FaDocker },
    { name: 'AWS', icon: FaAws },
    { name: 'GitHub', icon: FaGithub },
    { name: 'Google Cloud', icon: SiGooglecloud },
    { name: 'NVIDIA', icon: SiNvidia },
    { name: 'Cloudflare', icon: SiCloudflare },
  ];

  const execData = {
    ceo: {
      role: 'CEO Advisor',
      title: 'Strategic Overview of Your Startup',
      desc: 'Decomposes founder vision into actionable engineering, hiring, and growth sprints.',
      score: '95.4%',
      scoreLabel: 'Strategic Execution Score',
      priorities: [
        'Increase User Activation (+18% Target)',
        'Optimize CAC Payback Period to <6 Mos',
        'Expand to New Enterprise Markets'
      ],
      insight: 'Recommended action: Authorize CFO Agent to allocate $12k towards proven Q3 viral referral loops.'
    },
    cfo: {
      role: 'CFO Advisor',
      title: 'Treasury & Financial Audit',
      desc: 'Monitors 13.2-month runway, audits recurring SaaS expenses, and models cap table scenarios.',
      score: '13.2 Mos',
      scoreLabel: 'Verified Cash Runway Balance',
      priorities: [
        'Cap Monthly AWS Compute Burn at $8,500',
        'Audit SaaS Subscriptions & Unused Seats',
        'Prepare Series A Financial Data Room'
      ],
      insight: 'Treasury status optimal. Cash reserves will sustain planned headcount expansion through Q4.'
    },
    cto: {
      role: 'CTO Advisor',
      title: 'Architecture & Security Health',
      desc: 'Orchestrates CI/CD deployments, monitors latency, and rebuilds pgvector RAG indexes.',
      score: '99.99%',
      scoreLabel: 'Infrastructure System Uptime',
      priorities: [
        'SOC-2 Type II Automated Audit Sweep',
        'pgvector HNSW Index Performance Rebuild',
        'MCP Tool Schema Validation'
      ],
      insight: 'All 1536-dim vector stores synchronized. API latency under 24ms across 12 regions.'
    },
    cmo: {
      role: 'CMO Advisor',
      title: 'Growth Loops & Viral Funnel',
      desc: 'Generates product marketing sequences, analyzes SEO clusters, and tracks conversions.',
      score: '+24.8%',
      scoreLabel: 'MoM User Conversion Rate',
      priorities: [
        'Deploy B2B Landing Page Variant A/B Test',
        'Scale Organic Developer Newsletter',
        'Launch Referral Rewards Engine'
      ],
      insight: 'Organic search traffic grew +32% following the latest executive product playbook release.'
    },
    hr: {
      role: 'HR Advisor',
      title: 'Recruitment & Equity Pools',
      desc: 'Parses incoming candidate resumes, rates skill match, and drafts Outreach emails.',
      score: '98.4%',
      scoreLabel: 'Candidate Match Accuracy',
      priorities: [
        'Screen Senior Staff Frontend Engineers',
        'Draft Stock Option Grant Contracts',
        'Schedule Founder Final Round Interviews'
      ],
      insight: '3 Tier-1 engineering candidates parsed. Outreach sequences ready for Founder sign-off.'
    },
    coo: {
      role: 'COO Advisor',
      title: 'Operations & Process Engine',
      desc: 'Automates vendor SLA compliance, legal NDAs, and daily cross-department logistics.',
      score: '94.1%',
      scoreLabel: 'Process Automation Ratio',
      priorities: [
        'Automate Vendor NDA Approvals',
        'Reconcile Monthly Board Reporting',
        'Streamline Customer Support Escalation'
      ],
      insight: 'Operational overhead reduced by 42 hours/week using autonomous agent workflows.'
    }
  };

  const testimonials = [
    {
      quote: "FounderOS is like having a world-class executive team, without the overhead. It's a game-changer for our seed-stage startup.",
      author: "Sarah Khan",
      role: "CEO, TechScale",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    },
    {
      quote: "The AI insights are spot on and have helped us make better decisions, faster. The CFO agent alone saved $40k.",
      author: "Arjun Patel",
      role: "Founder, FinOps",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
    },
    {
      quote: "From fundraising to hiring, FounderOS covers everything we need to scale seamlessly across 12 countries.",
      author: "Maya Johnson",
      role: "COO, SmartLab",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80"
    }
  ];

  const faqs = [
    {
      question: "What is FounderOS?",
      answer: "FounderOS is an AI-powered operating system that provides founders with an autonomous executive team (CEO, CFO, CTO, CMO, HR, COO) to plan, execute, and scale startup operations seamlessly."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. FounderOS utilizes end-to-end 256-bit encryption, HashiCorp Vault secrets isolation, and zero-trust memory boundaries. Your data is never shared or used to train public LLM models."
    },
    {
      question: "Can I integrate with my existing tools?",
      answer: "Absolutely. FounderOS integrates natively with Slack, GitHub, Google Workspace, Stripe, Vercel, Notion, and major developer APIs through the Model Context Protocol (MCP)."
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes. You can start free with our Starter tier, which includes full access to basic modules and up to 2 team members with zero credit card required."
    }
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden">
      
      {/* Dynamic Monochrome Spotlight */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(750px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.04), transparent 80%)`
        }}
      />

      {/* Subtle Grain Noise Texture Background */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* 1. STICKY FLOATING GLASS NAVBAR (84px -> 68px ON SCROLL) */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 flex justify-center pointer-events-none">
        <nav className={`w-full max-w-[1320px] rounded-full bg-[#000000]/80 backdrop-blur-[20px] border border-white/[0.08] px-8 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.9)] transition-all duration-300 pointer-events-auto ${
          scrolled ? 'h-[68px] bg-[#000000]/95 border-white/[0.15] shadow-[0_12px_40px_rgba(0,0,0,1)]' : 'h-[84px]'
        }`}>
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-xl bg-[#090909] border border-white/10 p-1 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:border-white transition-colors">
              <CatalystLogo className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-white text-lg tracking-tight font-sans">FounderOS</span>
          </div>

          {/* Navigation Items */}
          <div className="hidden lg:flex items-center gap-9 text-sm font-medium text-[#B8B8B8] font-sans">
            <a href="#platform" className="hover:text-white transition-colors">Platform</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#resources" className="hover:text-white transition-colors">Resources</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={onStartBuilding}
              className="text-xs font-semibold text-[#B8B8B8] hover:text-white transition-colors cursor-pointer px-3 py-2 font-sans"
            >
              Log In
            </button>

            <button
              onClick={onStartBuilding}
              className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:shadow-[0_0_35px_rgba(255,255,255,0.6)] cursor-pointer flex items-center gap-2 font-sans"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      </header>

      {/* 2. HERO SECTION (STRICT MONOCHROME EDITORIAL REDESIGN + PRESERVED HERO RIGHT LOTTIE ANIMATION) */}
      <section className="pt-48 pb-28 px-6 relative overflow-hidden">
        
        {/* Soft Radial White Spotlight Glow */}
        <div className="absolute top-1/4 right-10 w-[700px] h-[550px] bg-gradient-to-tr from-white/[0.04] via-white/[0.02] to-transparent rounded-full blur-[170px] pointer-events-none" />

        <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Editorial Monochrome Copy (Max Width 560px) */}
          <div className="lg:col-span-6 space-y-8 text-left z-10 max-w-[560px]">
            
            {/* Tiny Monochrome Label */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111111] border border-white/[0.1] text-xs font-mono font-medium text-white/80"
            >
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>AI EXECUTIVE INTELLIGENCE</span>
            </motion.div>

            {/* Huge Heading: 80px / 72px Desktop, -4px Letter Spacing */}
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-7xl lg:text-[80px] font-extrabold tracking-[-4px] text-white leading-[0.95] font-sans"
            >
              The Executive OS <br />
              for Founders.
            </motion.h1>

            {/* Body Description: 18px */}
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#B8B8B8] text-lg leading-[170%] font-sans"
            >
              All the tools, insights, and guidance you need to build, grow, and scale your startup — in one place.
            </motion.p>

            {/* Primary & Secondary Magnetic Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 pt-2"
            >
              <button
                onClick={onStartBuilding}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-[15px] shadow-[0_0_35px_rgba(255,255,255,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 font-sans"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onViewDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#111111] hover:bg-[#181818] border border-white/10 text-white font-medium text-[15px] transition-all cursor-pointer flex items-center justify-center gap-2 backdrop-blur-md font-sans"
              >
                <span>See Platform</span>
              </button>
            </motion.div>

            {/* Social Proof Line */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="pt-6 border-t border-white/[0.08] space-y-3"
            >
              <p className="text-xs font-mono uppercase tracking-wider text-[#777777]">
                Trusted by Founders at
              </p>

              <div className="flex flex-wrap items-center gap-6 opacity-60 text-xs font-medium text-[#B8B8B8]">
                <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-white" /> Techstars</span>
                <span className="flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5 text-white" /> Y Combinator</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-white" /> TechCrunch</span>
                <span className="flex items-center gap-1.5"><FaAws className="w-3.5 h-3.5 text-white" /> AWS</span>
                <span className="flex items-center gap-1.5"><SiGooglecloud className="w-3.5 h-3.5 text-white" /> Google for Startups</span>
              </div>
            </motion.div>

          </div>

          {/* Right Column: PRESERVED HERO LOTTIE ANIMATION EXACTLY AS REQUIRED */}
          <div className="lg:col-span-6 relative flex items-center justify-center z-20">
            
            {/* Ambient Animated Orbit Rings */}
            <div className="absolute w-[540px] h-[540px] rounded-full border border-white/10 animate-spin pointer-events-none" style={{ animationDuration: '35s' }} />
            <div className="absolute w-[460px] h-[460px] rounded-full border border-white/10 animate-spin pointer-events-none" style={{ animationDuration: '50s', animationDirection: 'reverse' }} />

            {/* Freely Floating Lottie Animation (520x520px) */}
            <motion.div 
              className="w-[520px] h-[520px] relative flex items-center justify-center"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              {!lottieError ? (
                <DotLottieReact
                  src="https://lottie.host/eb092f61-1eb3-4de7-8db1-7c72da2a7379/cAAGtnj4dN.lottie"
                  loop
                  autoplay
                  speed={0.8}
                  style={{ width: '100%', height: '100%' }}
                  onError={() => setLottieError(true)}
                />
              ) : (
                <iframe
                  src="https://lottie.host/embed/eb092f61-1eb3-4de7-8db1-7c72da2a7379/cAAGtnj4dN.lottie"
                  className="w-full h-full border-0 pointer-events-none"
                  title="FounderOS AI Core"
                />
              )}

              {/* Floating AI Notification Badges around Lottie */}
              <motion.div 
                className="absolute -top-4 -left-6 p-3.5 rounded-2xl bg-[#090909]/90 border border-white/10 backdrop-blur-xl shadow-2xl flex items-center gap-3 z-30"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[#777777] uppercase block">CEO AGENT</span>
                  <span className="text-xs font-bold text-white font-sans">Strategic OKR Decomposed</span>
                </div>
              </motion.div>

              <motion.div 
                className="absolute -bottom-4 -right-6 p-3.5 rounded-2xl bg-[#090909]/90 border border-white/10 backdrop-blur-xl shadow-2xl flex items-center gap-3 z-30"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[#777777] uppercase block">CFO AGENT</span>
                  <span className="text-xs font-bold text-white font-sans">13.2-Month Runway Verified</span>
                </div>
              </motion.div>

            </motion.div>

          </div>

        </div>
      </section>

      {/* 3. TRUST BAR (MONOCHROME GLASS SCROLLING LOGO MARQUEE) */}
      <section className="py-12 border-y border-white/[0.08] bg-[#090909]">
        <div className="max-w-[1320px] mx-auto px-6 text-center space-y-6">
          
          <div className="relative w-full overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            <div className="flex w-[200%] animate-marquee space-x-16 items-center">
              {[...partnerLogos, ...partnerLogos].map((partner, idx) => {
                const IconComponent = partner.icon;
                return (
                  <div key={idx} className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity cursor-pointer shrink-0">
                    <IconComponent className="w-5 h-5 text-white" />
                    <span className="text-xs font-bold tracking-wide text-white font-sans">{partner.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES BENTO GRID SECTION (MONOCHROME 21st.dev BENTO GRID) */}
      <section id="platform" className="py-36 px-6 relative">
        
        {/* Ambient White Radial Mask */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-white/[0.02] rounded-full blur-[180px] pointer-events-none" />

        <div className="max-w-[1320px] mx-auto space-y-16 relative z-10">
          
          {/* Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest font-bold">EVERYTHING YOU NEED</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Everything you need <br /> to build and scale.
            </h2>
            <p className="text-[#B8B8B8] text-lg">
              Powerful modules. Smarter decisions. Faster growth.
            </p>

            {/* Filter Module Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              {[
                { id: 'all', label: 'All Modules' },
                { id: 'operate', label: 'Operate' },
                { id: 'grow', label: 'Grow' },
                { id: 'manage', label: 'Manage' },
                { id: 'fund', label: 'Fund' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveModuleTab(tab.id as any)}
                  className={`px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer font-sans ${
                    activeModuleTab === tab.id
                      ? 'bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                      : 'bg-[#090909] text-white/60 hover:text-white hover:bg-[#111111] border border-white/[0.08]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* BENTO GRID (28px rounded corners, 24px gap, monochrome glass cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Large Featured Bento Card (AI Executive Council) */}
            <div className="md:col-span-2 p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] hover:border-white transition-all duration-300 space-y-6 relative overflow-hidden group hover:-translate-y-1 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 font-bold uppercase">
                  ACTIVE MATRIX
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white font-sans">AI Executive Council</h3>
                <p className="text-[#B8B8B8] text-base leading-[170%] font-sans max-w-xl">
                  Get strategic advice from your AI-powered board of experts (CEO, CFO, CTO, CMO, HR, COO) operating 24/7 in unison.
                </p>
              </div>

              {/* Mini Graph / Executive Status Pills inside Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#111111] border border-white/[0.08]">
                  <span className="text-[10px] font-mono text-[#777777] uppercase block">CEO AGENT</span>
                  <span className="text-xs font-bold text-white">98.4% Velocity</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111111] border border-white/[0.08]">
                  <span className="text-[10px] font-mono text-[#777777] uppercase block">CFO AGENT</span>
                  <span className="text-xs font-bold text-white">13.2 Mos Runway</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#111111] border border-white/[0.08]">
                  <span className="text-[10px] font-mono text-[#777777] uppercase block">CTO AGENT</span>
                  <span className="text-xs font-bold text-white">99.99% Uptime</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:translate-x-1 transition-transform cursor-pointer pt-2 font-sans">
                <span>Explore Module</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 2: Intelligent Hiring */}
            <div className="p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] hover:border-white transition-all duration-300 space-y-6 relative overflow-hidden group hover:-translate-y-1 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <Users className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-sans">Intelligent Hiring</h3>
                <p className="text-[#B8B8B8] text-sm leading-[170%] font-sans">
                  Find, screen, and hire top talent 10x faster with AI candidate score models.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111111] border border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-mono text-[#B8B8B8]">Skill Match</span>
                <span className="text-xs font-mono font-bold text-white">98.4% Match</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:translate-x-1 transition-transform cursor-pointer font-sans">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 3: Investor Outreach */}
            <div className="p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] hover:border-white transition-all duration-300 space-y-6 relative overflow-hidden group hover:-translate-y-1 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <DollarSign className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-sans">Investor Outreach</h3>
                <p className="text-[#B8B8B8] text-sm leading-[170%] font-sans">
                  Personalize, automate, and close more investor meetings with data-room tracking.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111111] border border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-mono text-[#B8B8B8]">Seed Committed</span>
                <span className="text-xs font-mono font-bold text-white">$2.4M Closed</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:translate-x-1 transition-transform cursor-pointer font-sans">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 4: Workflow Automation */}
            <div className="p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] hover:border-white transition-all duration-300 space-y-6 relative overflow-hidden group hover:-translate-y-1 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <Zap className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-sans">Workflow Automation</h3>
                <p className="text-[#B8B8B8] text-sm leading-[170%] font-sans">
                  Automate repetitive tasks, legal NDAs, and board updates to focus on product.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111111] border border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-mono text-[#B8B8B8]">Manual Friction</span>
                <span className="text-xs font-mono font-bold text-white">0% Manual</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:translate-x-1 transition-transform cursor-pointer font-sans">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 5: Business Analytics */}
            <div className="p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] hover:border-white transition-all duration-300 space-y-6 relative overflow-hidden group hover:-translate-y-1 shadow-2xl">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <LineChart className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white font-sans">Business Analytics</h3>
                <p className="text-[#B8B8B8] text-sm leading-[170%] font-sans">
                  Real-time insights and live telemetry dashboards to make smarter executive decisions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#111111] border border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-mono text-[#B8B8B8]">Audit Speed</span>
                <span className="text-xs font-mono font-bold text-white">Real-Time</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-white group-hover:translate-x-1 transition-transform cursor-pointer font-sans">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>

          <div className="text-center pt-4">
            <button
              onClick={onStartBuilding}
              className="px-8 py-3.5 rounded-full bg-[#090909] hover:bg-[#111111] border border-white/[0.1] text-white font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-2 font-sans"
            >
              <span>Explore All Modules</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

        </div>
      </section>

      {/* 5. EXECUTIVE COUNCIL SECTION (AI CHAT & TELEMETRY TERMINAL) */}
      <section id="solutions" className="py-36 px-6 bg-[#090909] border-y border-white/[0.08] relative">
        <div className="max-w-[1320px] mx-auto space-y-16">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest font-bold">AN ALWAYS-ON COUNCIL</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Your always-on <br /> Executive Council.
            </h2>
            <p className="text-[#B8B8B8] text-base leading-[170%] font-sans">
              Strategic guidance, anytime you need it.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left: Floating Role Selector Sidebar */}
            <div className="lg:col-span-4 space-y-3">
              {[
                { key: 'ceo', name: 'CEO Advisor', icon: Bot, tag: 'Strategy' },
                { key: 'cfo', name: 'CFO Advisor', icon: DollarSign, tag: 'Treasury' },
                { key: 'cto', name: 'CTO Advisor', icon: Cpu, tag: 'Architecture' },
                { key: 'cmo', name: 'CMO Advisor', icon: TrendingUp, tag: 'Growth' },
                { key: 'hr', name: 'HR Advisor', icon: Users, tag: 'Hiring' },
                { key: 'coo', name: 'COO Advisor', icon: Layers, tag: 'Operations' },
              ].map((ex) => {
                const isSel = selectedExec === ex.key;
                const ExecIcon = ex.icon;
                return (
                  <div
                    key={ex.key}
                    onClick={() => setSelectedExec(ex.key as any)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between font-sans ${
                      isSel 
                        ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.3)] scale-[1.02]' 
                        : 'bg-[#111111] text-[#B8B8B8] border-white/[0.08] hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSel ? 'bg-black/10 text-black' : 'bg-white/[0.05] text-white'}`}>
                        <ExecIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold">{ex.name}</h4>
                        <span className={`text-[10px] font-mono ${isSel ? 'text-black/70' : 'text-[#777777]'}`}>{ex.tag} Engine</span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSel ? 'text-black' : 'text-[#777777]'}`} />
                  </div>
                );
              })}
            </div>

            {/* Right: AI Chat & Telemetry Interface (Monochrome Dark Glass Terminal) */}
            <div className="lg:col-span-8 p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] backdrop-blur-2xl space-y-6 shadow-2xl relative flex flex-col justify-between">
              
              <div className="space-y-6">
                
                {/* Window Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    <span className="text-xs font-mono font-bold text-white uppercase">{execData[selectedExec].role} LIVE TELEMETRY</span>
                  </div>
                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-[#111111] border border-white/10 text-[#B8B8B8]">
                    STATUS: ACTIVE AGENT GRAPH
                  </span>
                </div>

                {/* Score & Priorities Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-[#111111] border border-white/[0.08]">
                    <span className="text-[10px] font-mono text-[#777777] uppercase block">{execData[selectedExec].scoreLabel}</span>
                    <span className="text-3xl font-extrabold text-white font-mono">{execData[selectedExec].score}</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#111111] border border-white/[0.08] space-y-2">
                    <span className="text-[10px] font-mono text-[#777777] uppercase block">Top Priorities</span>
                    <div className="space-y-1.5">
                      {execData[selectedExec].priorities.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#B8B8B8] font-sans">
                          <Check className="w-3.5 h-3.5 text-white shrink-0" />
                          <span className="truncate">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interactive AI Chat Transcript Stream */}
                <div className="p-5 rounded-2xl bg-[#000000] border border-white/[0.08] space-y-3 font-mono text-xs max-h-[220px] overflow-y-auto">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded-xl ${msg.role === 'user' ? 'bg-[#181818] text-white ml-8 border border-white/10' : 'bg-[#111111] text-[#B8B8B8] border border-white/10'}`}>
                      <span className="text-[10px] text-[#777777] block mb-1 uppercase font-bold">{msg.role === 'user' ? 'Founder' : execData[selectedExec].role}</span>
                      <p className="leading-relaxed font-sans text-sm">{msg.text}</p>
                    </div>
                  ))}
                </div>

              </div>

              {/* Chat Input Prompt Form */}
              <form onSubmit={handleSendChat} className="flex items-center gap-3 pt-2">
                <input
                  type="text"
                  placeholder={`Ask ${execData[selectedExec].role} a strategic question...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#777777] focus:outline-none focus:border-white font-sans"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer font-sans shrink-0 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                  <span>Ask Question</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

            </div>

          </div>

        </div>
      </section>

      {/* 6. SECURITY SECTION (3D SHIELD & ZERO TRUST ARCHITECTURE) */}
      <section id="security" className="py-36 px-6 relative">
        <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: 3D Holographic Shield with Rotating Rings & Glow */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-[#090909] border border-white/10 flex items-center justify-center relative shadow-[0_0_90px_rgba(255,255,255,0.1)]">
              <ShieldCheck className="w-28 h-28 text-white animate-pulse" />
              <div className="absolute inset-4 rounded-full border border-dashed border-white/20 animate-spin pointer-events-none" style={{ animationDuration: '25s' }} />
              <div className="absolute inset-10 rounded-full border border-dashed border-white/10 animate-spin pointer-events-none" style={{ animationDuration: '40s', animationDirection: 'reverse' }} />
            </div>
          </div>

          {/* Right Column: Security Checklist */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest font-bold">IN-HOUSE FIRST</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Zero Trust Architecture. <br /> Total Data Isolation.
            </h2>
            <p className="text-[#B8B8B8] text-base leading-[170%] font-sans">
              Your data is encrypted, isolated, and never shared. We follow enterprise-grade security standards.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {[
                { title: "End-to-End Encryption", desc: "256-bit AES-GCM encryption in transit and at rest.", icon: Lock },
                { title: "Compliance Ready", desc: "Automated SOC 2 Type II audit logs.", icon: ShieldCheck },
                { title: "Vault Isolated", desc: "HashiCorp Vault secret manager keys.", icon: Cpu },
                { title: "SOC 2 Compliant", desc: "Zero trust memory boundaries.", icon: Shield },
              ].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div key={idx} className="p-5 rounded-2xl bg-[#090909] border border-white/[0.08] hover:border-white transition-all space-y-1">
                    <div className="flex items-center gap-2.5">
                      <ItemIcon className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white font-sans">{item.title}</span>
                    </div>
                    <p className="text-xs text-[#777777] leading-[160%] font-sans">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* 7. HOW IT WORKS (TIMELINE WORKFLOW) */}
      <section className="py-36 px-6 bg-[#090909] border-y border-white/[0.08]">
        <div className="max-w-[1320px] mx-auto space-y-16 text-center">
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest font-bold">HOW IT WORKS</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              From Goal to Execution <br /> in 4 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {[
              { step: '01', title: 'Set Goals', desc: 'Define your startup goals and milestones in plain language.', icon: Terminal },
              { step: '02', title: 'Get Guidance', desc: 'Receive AI-powered strategic recommendations across departments.', icon: Bot },
              { step: '03', title: 'Take Action', desc: 'Execute actions with smart automated tools and workflows.', icon: Zap },
              { step: '04', title: 'Track Progress', desc: 'Monitor real-time performance and iterate 10x faster.', icon: LineChart },
            ].map((st, idx) => {
              const StepIcon = st.icon;
              return (
                <div
                  key={idx}
                  className="p-8 rounded-[28px] border border-white/[0.08] bg-[#000000] hover:border-white hover:-translate-y-1 transition-all text-left relative group shadow-xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-extrabold font-mono text-white/40 group-hover:text-white transition-colors">{st.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <StepIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-sans text-white">{st.title}</h3>
                  <p className="text-sm leading-[170%] text-[#B8B8B8] font-sans">{st.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 8. METRICS SECTION (ASYMMETRICAL LARGE STATS) */}
      <section className="py-36 px-6 relative">
        <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6 text-left">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Loved by ambitious <br /> founders.
            </h2>
            <p className="text-[#B8B8B8] text-base leading-[170%] font-sans">
              Join thousands of founders building smarter, faster, and bigger.
            </p>
            <button
              onClick={onStartBuilding}
              className="px-8 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all cursor-pointer inline-flex items-center gap-2 font-sans"
            >
              <span>Join Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 gap-6">
            {[
              { label: 'Active Founders', val: '10,000+' },
              { label: 'Countries', val: '100+' },
              { label: 'Uptime', val: '99.9%' },
              { label: 'Decisions Processed', val: '1,000,000+' },
            ].map((st, idx) => (
              <div key={idx} className="p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] text-center space-y-2 hover:border-white transition-all">
                <span className="text-4xl font-extrabold text-white font-mono block">{st.val}</span>
                <span className="text-xs font-mono text-[#777777] uppercase tracking-wider">{st.label}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 9. TESTIMONIALS SECTION (WALL OF LOVE) */}
      <section className="py-36 px-6 bg-[#090909] border-y border-white/[0.08]">
        <div className="max-w-[1320px] mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest font-bold">TESTIMONIALS</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Loved by Startup Founders
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="p-8 rounded-[28px] bg-[#000000] border border-white/[0.08] hover:border-white transition-all space-y-6 flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-white text-xs">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <p className="text-sm text-white/80 leading-[170%] italic font-sans">
                    "{t.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/[0.08]">
                  <img src={t.avatar} alt={t.author} className="w-11 h-11 rounded-full object-cover border border-white/20 filter grayscale" />
                  <div>
                    <h4 className="text-sm font-bold text-white font-sans">{t.author}</h4>
                    <p className="text-xs text-[#777777] font-sans">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. PRICING SECTION (MONOCHROME PRICING WITH CRISP WHITE HIGHLIGHT PLAN) */}
      <section id="pricing" className="py-36 px-6 relative">
        <div className="max-w-[1320px] mx-auto space-y-16">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest font-bold">PRICING</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Invest in Execution, Not Overhead.
            </h2>

            {/* Toggle Billing Cycle */}
            <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-[#090909] border border-white/[0.08] pt-2">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer font-sans ${
                  billingCycle === 'monthly' ? 'bg-white text-black font-bold' : 'text-[#B8B8B8] hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer font-sans flex items-center gap-1.5 ${
                  billingCycle === 'annual' ? 'bg-white text-black font-bold' : 'text-[#B8B8B8] hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-bold">SAVE 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Starter Plan */}
            <div className="p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-mono text-[#777777] uppercase font-bold">STARTER</span>
                <div className="text-4xl font-extrabold text-white font-mono">$0 <span className="text-xs text-[#777777] font-sans">/ month</span></div>
                <p className="text-xs text-[#B8B8B8] leading-[170%] font-sans">For new founders getting started.</p>

                <div className="space-y-2.5 text-xs pt-4 border-t border-white/[0.08] font-sans">
                  <div className="flex items-center gap-2 text-white/80"><Check className="w-4 h-4 text-white" /> Basic Modules</div>
                  <div className="flex items-center gap-2 text-white/80"><Check className="w-4 h-4 text-white" /> Community Access</div>
                  <div className="flex items-center gap-2 text-white/80"><Check className="w-4 h-4 text-white" /> Up to 2 Users</div>
                </div>
              </div>

              <button onClick={onStartBuilding} className="w-full py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-bold transition-all cursor-pointer font-sans">
                Get Started
              </button>
            </div>

            {/* Pro Plan (Elevated Center Plan with White Glow) */}
            <div className="p-8 rounded-[28px] bg-[#111111] border-2 border-white space-y-6 flex flex-col justify-between relative shadow-[0_0_60px_rgba(255,255,255,0.25)] scale-[1.03]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-black text-[10px] font-mono font-bold uppercase tracking-wider shadow-md">
                MOST POPULAR
              </div>

              <div className="space-y-4">
                <span className="text-xs font-mono text-white uppercase font-bold">PRO</span>
                <div className="text-4xl font-extrabold text-white font-mono">
                  {billingCycle === 'annual' ? '$39' : '$49'} <span className="text-xs text-[#777777] font-sans">/ month</span>
                </div>
                <p className="text-xs text-white/80 leading-[170%] font-sans">For growing startups.</p>

                <div className="space-y-2.5 text-xs pt-4 border-t border-white/10 font-sans">
                  <div className="flex items-center gap-2 text-white"><Check className="w-4 h-4 text-white" /> All Modules</div>
                  <div className="flex items-center gap-2 text-white"><Check className="w-4 h-4 text-white" /> Advanced Analytics</div>
                  <div className="flex items-center gap-2 text-white"><Check className="w-4 h-4 text-white" /> Up to 10 Users</div>
                  <div className="flex items-center gap-2 text-white"><Check className="w-4 h-4 text-white" /> Priority Support</div>
                </div>
              </div>

              <button onClick={onStartBuilding} className="w-full py-4 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer font-sans shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                Get Started
              </button>
            </div>

            {/* Custom Plan */}
            <div className="p-8 rounded-[28px] bg-[#090909] border border-white/[0.08] space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-mono text-[#777777] uppercase font-bold">CUSTOM</span>
                <div className="text-4xl font-extrabold text-white font-mono">Let's talk</div>
                <p className="text-xs text-[#B8B8B8] leading-[170%] font-sans">For scaling teams & enterprise.</p>

                <div className="space-y-2.5 text-xs pt-4 border-t border-white/[0.08] font-sans">
                  <div className="flex items-center gap-2 text-white/80"><Check className="w-4 h-4 text-white" /> Custom Solutions</div>
                  <div className="flex items-center gap-2 text-white/80"><Check className="w-4 h-4 text-white" /> Dedicated Support</div>
                  <div className="flex items-center gap-2 text-white/80"><Check className="w-4 h-4 text-white" /> Unlimited Users</div>
                </div>
              </div>

              <button onClick={onViewDemo} className="w-full py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-bold transition-all cursor-pointer font-sans">
                Contact Sales
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 11. FAQ ACCORDION SECTION */}
      <section id="resources" className="py-36 px-6 bg-[#090909] border-y border-white/[0.08]">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <span className="text-xs font-mono text-white/60 uppercase tracking-widest font-bold">FAQ</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl bg-[#000000] border border-white/[0.08] overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-6 text-left font-bold text-base text-white flex items-center justify-between cursor-pointer font-sans"
                >
                  <span>{faq.question}</span>
                  {activeFaq === idx ? <Minus className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-[#777777]" />}
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-6 text-sm text-[#B8B8B8] leading-[170%] border-t border-white/[0.08] pt-4 font-sans">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. FINAL CINEMATIC LOTTIE ROCKET CTA SECTION */}
      <section className="py-36 px-6 relative overflow-hidden">
        
        {/* Soft White Radial Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-white/[0.03] rounded-full blur-[190px] pointer-events-none" />

        <div className="max-w-5xl mx-auto p-16 rounded-[40px] bg-[#090909] border border-white/10 backdrop-blur-2xl text-center space-y-8 relative z-10 shadow-[0_0_100px_rgba(255,255,255,0.1)]">
          
          {/* Animated Rocket Lottie Animation Emblem */}
          <div className="w-24 h-24 mx-auto relative flex items-center justify-center">
            <DotLottieReact
              src="https://lottie.host/397854e7-c7d6-4622-b2d8-8c254f95320a/KB1JbtgXrH.lottie"
              loop
              autoplay
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight font-sans">
            Ready to build the future?
          </h2>

          <p className="text-[#B8B8B8] text-lg max-w-xl mx-auto leading-[170%] font-sans">
            Join thousands of founders already building smarter with their AI executive team.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartBuilding}
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-white hover:bg-zinc-200 text-black font-extrabold text-sm shadow-[0_0_35px_rgba(255,255,255,0.35)] transition-all cursor-pointer font-sans"
            >
              Get Started
            </button>
            <button
              onClick={onViewDemo}
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-[#111111] hover:bg-[#181818] border border-white/10 text-white font-bold text-sm transition-all cursor-pointer font-sans backdrop-blur-md"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* 13. EDITORIAL MONOCHROME FOOTER */}
      <footer id="about" className="py-20 px-6 border-t border-white/[0.08] bg-[#000000]">
        <div className="max-w-[1320px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-10 text-xs">
          
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#090909] border border-white/10 p-1 flex items-center justify-center">
                <CatalystLogo className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight font-sans">FounderOS</span>
            </div>
            <p className="text-[#777777] max-w-xs leading-[170%] font-sans">
              The Executive OS for Founders. Empowering the next generation of autonomous startups.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono text-white font-bold uppercase text-[10px] tracking-wider">Product</h4>
            <ul className="space-y-2.5 text-[#777777] font-sans">
              <li className="hover:text-white transition-colors cursor-pointer">Overview</li>
              <li className="hover:text-white transition-colors cursor-pointer">Features</li>
              <li className="hover:text-white transition-colors cursor-pointer">Pricing</li>
              <li className="hover:text-white transition-colors cursor-pointer">Integrations</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono text-white font-bold uppercase text-[10px] tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-[#777777] font-sans">
              <li className="hover:text-white transition-colors cursor-pointer">About</li>
              <li className="hover:text-white transition-colors cursor-pointer">Careers</li>
              <li className="hover:text-white transition-colors cursor-pointer">Blog</li>
              <li className="hover:text-white transition-colors cursor-pointer">Contact</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono text-white font-bold uppercase text-[10px] tracking-wider">Resources</h4>
            <ul className="space-y-2.5 text-[#777777] font-sans">
              <li className="hover:text-white transition-colors cursor-pointer">Docs</li>
              <li className="hover:text-white transition-colors cursor-pointer">User Guides</li>
              <li className="hover:text-white transition-colors cursor-pointer">Guides</li>
              <li className="hover:text-white transition-colors cursor-pointer">Community</li>
            </ul>
          </div>

        </div>

        <div className="max-w-[1320px] mx-auto pt-14 mt-14 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-[#777777]">
          <span>© {new Date().getFullYear()} FounderOS Inc. All rights reserved.</span>
          <span>Awwwards-Grade Interactive Design System.</span>
        </div>
      </footer>

    </div>
  );
}
