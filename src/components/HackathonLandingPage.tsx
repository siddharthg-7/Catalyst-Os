import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Shield,
  ShieldCheck,
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
  CheckCircle2,
  Moon,
  Sun,
  Database
} from 'lucide-react';
import CatalystLogo from './CatalystLogo';

interface HackathonLandingPageProps {
  onStartBuilding: () => void;
  onDemoLogin?: () => void;
}

export default function HackathonLandingPage({ onStartBuilding, onDemoLogin }: HackathonLandingPageProps) {
  const [activeAgent, setActiveAgent] = useState<'atlas' | 'marcus' | 'evelyn' | 'dax'>('atlas');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  // Typewriter simulation for interactive agent console
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Form submission state
  const [directiveSubmitted, setDirectiveSubmitted] = useState(false);
  const [directiveForm, setDirectiveForm] = useState({
    founderName: '',
    workEmail: '',
    directiveType: 'runway',
    directiveText: ''
  });

  const agentMessages = {
    atlas: "I've reviewed your current seed round milestones. Based on runway projections and cap table dilution analysis, I recommend structuring the SAFE notes with a $12M valuation cap and a 20% discount. Board briefing memo is generated and ready for approval.",
    marcus: "Financial telemetry indicates current monthly net burn is $42,500 with $620,000 cash in treasury. Runway extends to 14.6 months. Reclaiming unused cloud licenses and adjusting SaaS tiers can extend operations by an additional 1.8 months.",
    evelyn: "Technical sprint telemetry shows 8 core microservices operational. PRD for multi-region active replication is drafted. Sub-agent code reviews scored 98.4% test coverage with zero security regressions detected.",
    dax: "Customer acquisition cost is currently $140 with an LTV of $1,850 (13.2x ratio). Recommending launch of the automated founder referral flywheel to accelerate Q3 self-serve ARR by an estimated 28%."
  };

  useEffect(() => {
    setIsTyping(true);
    setTypingText('');
    const fullText = agentMessages[activeAgent];
    let i = 0;
    const interval = setInterval(() => {
      setTypingText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [activeAgent]);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleDirectiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDirectiveSubmitted(true);
    setTimeout(() => {
      setDirectiveSubmitted(false);
      setDirectiveForm({ founderName: '', workEmail: '', directiveType: 'runway', directiveText: '' });
      if (onDemoLogin) {
        onDemoLogin();
      } else {
        onStartBuilding();
      }
    }, 1500);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300 relative overflow-x-hidden"
      style={{
        backgroundColor: 'var(--c-bg)',
        color: 'var(--c-fg)',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* ── AMBIENT DREAMY BACKGROUND (PORTFOLIO REFERENCE) ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-indigo-200/30 dark:bg-indigo-900/15 blur-[120px]" />
        <div className="absolute top-[25%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-200/25 dark:bg-purple-900/15 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-sky-200/25 dark:bg-blue-950/20 blur-[130px]" />
      </div>

      {/* ── FLOATING PILL NAVBAR (PORTFOLIO REFERENCE) ── */}
      <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav
          className="pointer-events-auto flex items-center justify-between gap-4 sm:gap-8 px-5 py-2.5 rounded-full backdrop-blur-xl border shadow-[0_8px_30px_rgb(0,0,0,0.06)] max-w-4xl w-full transition-all duration-300"
          style={{
            backgroundColor: 'var(--c-glass-bg)',
            borderColor: 'var(--c-glass-border)'
          }}
        >
          {/* Logo & Brand */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <CatalystLogo className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                Catalyst<span className="text-indigo-600">OS</span>
              </span>
              <span className="text-[9px] font-mono tracking-wider uppercase text-slate-400 -mt-1 hidden sm:block">
                AI Operating System
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'council', label: 'Council' },
              { id: 'sprints', label: 'Pipelines' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'dispatch', label: 'Directives' },
              { id: 'faq', label: 'FAQ' }
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-xs"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Launch / Demo CTA */}
            {onDemoLogin && (
              <button
                onClick={onDemoLogin}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition-all"
              >
                <Play className="w-3 h-3 fill-indigo-600" />
                Live Demo
              </button>
            )}

            <button
              onClick={onStartBuilding}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-indigo-500/25 hover:opacity-95 transition-all transform hover:-translate-y-0.5"
            >
              Start Building
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      </header>

      {/* ── HERO SECTION ── */}
      <section id="overview" className="relative pt-36 sm:pt-44 pb-20 px-4 sm:px-6 max-w-6xl mx-auto z-10">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          {/* Centered Pill Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Autonomous Venture Operating System</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
          >
            From Idea to Launch.{' '}
            <br />
            One{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
              AI Operating System.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
          >
            CatalystOS unifies your executive C-Suite with autonomous AI agents. Real-time runway modeling,
            automated board memos, equity structuring, and compliance pipelines — with human-in-the-loop governance.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3.5 pt-2"
          >
            <button
              onClick={onStartBuilding}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              Start Building Free
              <ArrowRight className="w-4 h-4" />
            </button>

            {onDemoLogin && (
              <button
                onClick={onDemoLogin}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5 shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-indigo-600" />
                Explore Live Sandbox
              </button>
            )}
          </motion.div>
        </div>

        {/* ── 4 STATS METRIC CARDS (REFERENCE IMAGE 1 TOP) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-16 max-w-5xl mx-auto"
        >
          {[
            { metric: '99.4%', label: 'Autonomous Accuracy', sub: 'Audited deterministic telemetry' },
            { metric: '4x', label: 'Capital Velocity', sub: 'From idea to board-ready deck' },
            { metric: '5', label: 'Executive AI Agents', sub: 'Atlas, Marcus, Evelyn, Dax & Core' },
            { metric: '24/7', label: 'Continuous Governance', sub: 'Human-in-the-loop approval gates' }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-3xl border shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-center flex flex-col justify-center items-center transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: 'var(--c-surface)',
                borderColor: 'var(--c-border)'
              }}
            >
              <span className="text-3xl sm:text-4xl font-extrabold text-[#4F46E5] tracking-tight mb-1 font-sans">
                {item.metric}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {item.label}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {item.sub}
              </span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── 4 PASTEL FEATURE CARDS: EXECUTIVE COUNCIL (REFERENCE IMAGE 1 BOTTOM) ── */}
      <section id="council" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 border border-indigo-100 dark:border-indigo-900">
            Executive AI Council
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Autonomous Venture{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
              Leadership
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Specialized intelligence executing across strategy, finance, engineering, and revenue
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Lavender Card: Atlas CEO */}
          <div
            className="p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--c-pastel-lavender)',
              borderColor: 'var(--c-pastel-lavender-border)'
            }}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-5">
                <Bot className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold font-mono text-purple-700 uppercase tracking-widest block mb-1">
                Chief Executive Officer
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                Atlas — Venture Strategy
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Board memos, investor briefing packets, strategic capitalization roadmap, and governance policy design.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-purple-200/50 flex items-center justify-between text-[11px] font-semibold text-purple-700">
              <span>Governance & Vision</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Sky Blue Card: Marcus CFO */}
          <div
            className="p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--c-pastel-sky)',
              borderColor: 'var(--c-pastel-sky-border)'
            }}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold font-mono text-sky-700 uppercase tracking-widest block mb-1">
                Chief Financial Officer
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                Marcus — Capital & Runway
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Deterministic cash burn telemetry, dynamic runway modeling, cap table dilution, and SaaS economics optimization.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-sky-200/50 flex items-center justify-between text-[11px] font-semibold text-sky-700">
              <span>Financial Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Mint Card: Evelyn CPO */}
          <div
            className="p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--c-pastel-mint)',
              borderColor: 'var(--c-pastel-mint-border)'
            }}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-5">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold font-mono text-emerald-700 uppercase tracking-widest block mb-1">
                Chief Product Officer
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                Evelyn — Product & PRDs
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Technical PRD generation, sprint task decomposition, architecture review, and sub-agent development telemetry.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-emerald-200/50 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
              <span>Engineering Velocity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Amber Card: Dax CRO */}
          <div
            className="p-6 sm:p-7 rounded-3xl border transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--c-pastel-amber)',
              borderColor: 'var(--c-pastel-amber-border)'
            }}
          >
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold font-mono text-amber-700 uppercase tracking-widest block mb-1">
                Chief Revenue Officer
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                Dax — Growth & Revenue
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                GTM competitive positioning, customer funnel attribution, referral loops, and outbound sales orchestration.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-amber-200/50 flex items-center justify-between text-[11px] font-semibold text-amber-700">
              <span>Commercial Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 CASE STUDY GRADIENT HEADER CARDS (REFERENCE IMAGE 2) ── */}
      <section id="sprints" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 border border-indigo-100 dark:border-indigo-900">
            Featured Sprints
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Autonomous <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Execution Pipelines</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Live multi-agent execution pipelines across venture strategy, capital, and operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Peach / Orange Gradient Header */}
          <div
            onClick={onStartBuilding}
            className="rounded-3xl overflow-hidden border shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            style={{
              backgroundColor: 'var(--c-surface)',
              borderColor: 'var(--c-border)'
            }}
          >
            <div>
              <div
                className="p-7 border-b"
                style={{
                  background: 'linear-gradient(180deg, #FFE8DC 0%, rgba(255,255,255,0.2) 100%)',
                  borderColor: 'rgba(254, 215, 170, 0.4)'
                }}
              >
                <span className="text-[11px] font-bold tracking-wider text-orange-600 uppercase font-mono block mb-2">
                  CASE STUDY
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  Q3 Institutional Seed Round & Economics
                </h3>
              </div>
              <div className="p-7 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Prepare strategic financial pitch scripts, model CAC payback terms, audit cap table dilution, and structure investor disclosure memos.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Funding', 'Atlas CEO', 'Marcus CFO', 'SAFE Notes'].map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-7 pt-0">
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:underline">
                View Workflow Canvas <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Sky Blue Gradient Header */}
          <div
            onClick={onStartBuilding}
            className="rounded-3xl overflow-hidden border shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            style={{
              backgroundColor: 'var(--c-surface)',
              borderColor: 'var(--c-border)'
            }}
          >
            <div>
              <div
                className="p-7 border-b"
                style={{
                  background: 'linear-gradient(180deg, #E0F2FE 0%, rgba(255,255,255,0.2) 100%)',
                  borderColor: 'rgba(186, 230, 253, 0.4)'
                }}
              >
                <span className="text-[11px] font-bold tracking-wider text-sky-600 uppercase font-mono block mb-2">
                  CASE STUDY
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  Founding Infrastructure Engineer Hire
                </h3>
              </div>
              <div className="p-7 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Structure employment agreements, options vesting cliffs, IP transfer covenants, and stress test cash runway impacts.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Talent', 'Equity Pool', 'Legal NDA', 'Evelyn CPO'].map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-7 pt-0">
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:underline">
                View Workflow Canvas <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 3: Lavender Gradient Header */}
          <div
            onClick={onStartBuilding}
            className="rounded-3xl overflow-hidden border shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            style={{
              backgroundColor: 'var(--c-surface)',
              borderColor: 'var(--c-border)'
            }}
          >
            <div>
              <div
                className="p-7 border-b"
                style={{
                  background: 'linear-gradient(180deg, #F3E8FF 0%, rgba(255,255,255,0.2) 100%)',
                  borderColor: 'rgba(233, 213, 255, 0.4)'
                }}
              >
                <span className="text-[11px] font-bold tracking-wider text-purple-600 uppercase font-mono block mb-2">
                  CASE STUDY
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  SOC-2 Compliance & Vendor Security
                </h3>
              </div>
              <div className="p-7 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Draft internal data protection guidelines, formulate password compliance, and verify third-party vendor encryption policies.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Compliance', 'Security', 'Audit Trail', 'Governance'].map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-7 pt-0">
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:underline">
                View Workflow Canvas <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONNECTED VERTICAL TIMELINE WITH PURPLE DOTS (REFERENCE IMAGE 3) ── */}
      <section id="timeline" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto z-10 relative">
        <div className="text-center space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 border border-indigo-100 dark:border-indigo-900">
            System Trace
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Live Council{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
              Execution Timeline
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Sequential decision traces recorded on the immutable governance audit ledger
          </p>
        </div>

        {/* Timeline Container */}
        <div className="relative pl-6 sm:pl-10 space-y-8">
          {/* Vertical connecting line */}
          <div className="absolute left-[11px] sm:left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-400" />

          {/* Timeline Event 1 */}
          <div className="relative">
            {/* Glowing purple node dot */}
            <div className="absolute -left-[30px] sm:-left-[39px] top-7 w-4 h-4 rounded-full bg-indigo-600 border-4 border-indigo-200 dark:border-indigo-900 shadow-[0_0_12px_rgba(79,70,229,0.5)]" />

            <div
              className="p-6 sm:p-8 rounded-3xl border shadow-[0_8px_30px_rgba(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
              style={{
                backgroundColor: 'var(--c-surface)',
                borderColor: 'var(--c-border)'
              }}
            >
              <div className="md:col-span-7 space-y-3">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider font-mono">
                  EXECUTIVE INITIATIVE
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Multi-Agent Capital Consensus & Seed Calibration
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Atlas CEO and Marcus CFO synchronized cash telemetry with investor benchmarks. Generated a comprehensive sensitivity analysis under 3 hiring scenarios.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Execution Duration: 1.84s — Status: APPROVED</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {['Capital Plan', 'Runway +4.2mo', 'Board Memo', 'Treasury'].map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={onStartBuilding}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#4F46E5] text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  View Trace Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="md:col-span-5 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Telemetry Highlights
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Runway stress-tested under $50K MRR expansion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Cryptographic audit proof stored on local SQLite</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Automated Slack alert dispatched to founder</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Timeline Event 2 */}
          <div className="relative">
            {/* Glowing purple node dot */}
            <div className="absolute -left-[30px] sm:-left-[39px] top-7 w-4 h-4 rounded-full bg-indigo-600 border-4 border-indigo-200 dark:border-indigo-900 shadow-[0_0_12px_rgba(79,70,229,0.5)]" />

            <div
              className="p-6 sm:p-8 rounded-3xl border shadow-[0_8px_30px_rgba(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
              style={{
                backgroundColor: 'var(--c-surface)',
                borderColor: 'var(--c-border)'
              }}
            >
              <div className="md:col-span-7 space-y-3">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider font-mono">
                  GOVERNANCE PIPELINE
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Automated Governance & Human-in-the-Loop Gate
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Critical spend authorization of $18,400 routed through multi-agent validation. Staged in founder approval queue with rollback guarantees.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Execution Duration: 0.92s — Status: PENDING SIGN-OFF</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {['Approval Queue', 'Two-Key Auth', 'Budget Gate', 'Audit Log'].map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={onStartBuilding}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#4F46E5] text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  View Trace Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="md:col-span-5 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Governance Highlights
                </h4>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Non-repudiation digital seal applied</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>One-click approval or reversal via dashboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Zero hallucination constraint check passed</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2-COLUMN DIRECTIVE DISPATCH HUB (REFERENCE IMAGE 4) ── */}
      <section id="dispatch" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto z-10 relative">
        <div className="text-center space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 border border-indigo-100 dark:border-indigo-900">
            Command Center
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Dispatch an{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
              Executive Directive
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Test agent reasoning live or submit a priority directive to your autonomous council
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live Agent Telemetry & Reasoning Simulation */}
          <div className="lg:col-span-5 space-y-5">
            {/* Live Status Card (Portfolio Image 4 Left) */}
            <div
              className="p-6 rounded-3xl border shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4"
              style={{
                backgroundColor: 'var(--c-surface)',
                borderColor: 'var(--c-border)'
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Council Core Online & Listening
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Currently monitoring venture runway, inbound talent applications, and SOC-2 compliance triggers across your organization.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Cluster: us-west-enterprise</span>
                <span>Latency: 38ms</span>
              </div>
            </div>

            {/* Interactive Agent Switcher Pills */}
            <div
              className="p-6 rounded-3xl border shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4"
              style={{
                backgroundColor: 'var(--c-surface)',
                borderColor: 'var(--c-border)'
              }}
            >
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Simulate Agent Reasoning
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'atlas', name: 'Atlas CEO', role: 'Strategy' },
                  { id: 'marcus', name: 'Marcus CFO', role: 'Runway' },
                  { id: 'evelyn', name: 'Evelyn CPO', role: 'Product' },
                  { id: 'dax', name: 'Dax CRO', role: 'Growth' }
                ].map((ag) => (
                  <button
                    key={ag.id}
                    onClick={() => setActiveAgent(ag.id as any)}
                    className={`p-2.5 rounded-2xl text-left border text-xs font-medium transition-all ${
                      activeAgent === ag.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-200 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold">{ag.name}</div>
                    <div className="text-[10px] text-slate-400">{ag.role}</div>
                  </button>
                ))}
              </div>

              {/* Live Output Box with Typewriter Animation */}
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono min-h-[120px] relative border border-slate-800">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400">
                  <span>AGENT OUTPUT STREAM</span>
                  <span className="text-emerald-400">{isTyping ? 'THINKING...' : 'IDLE'}</span>
                </div>
                <p className="leading-relaxed">
                  {typingText}
                  {isTyping && <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Directive Form (Portfolio Image 4 Right) */}
          <div
            className="lg:col-span-7 p-8 rounded-3xl border shadow-[0_8px_30px_rgba(0,0,0,0.03)]"
            style={{
              backgroundColor: 'var(--c-surface)',
              borderColor: 'var(--c-border)'
            }}
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Send Priority Directive
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Enter directives for immediate multi-agent orchestration. The council will debate, calibrate financial constraints, and stage actions for sign-off.
            </p>

            <form onSubmit={handleDirectiveSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Founder Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Elena Rostova"
                    value={directiveForm.founderName}
                    onChange={(e) => setDirectiveForm({ ...directiveForm, founderName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl border text-xs outline-hidden transition-all focus:border-indigo-500 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Startup Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="founder@venture.ai"
                    value={directiveForm.workEmail}
                    onChange={(e) => setDirectiveForm({ ...directiveForm, workEmail: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl border text-xs outline-hidden transition-all focus:border-indigo-500 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Directive Domain
                </label>
                <select
                  value={directiveForm.directiveType}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, directiveType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border text-xs outline-hidden transition-all focus:border-indigo-500 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="runway">Financial & Runway Stress Testing</option>
                  <option value="fundraising">Seed Round SAFE Notes & Pitch Prep</option>
                  <option value="hiring">Founding Engineer Equity & Talent Search</option>
                  <option value="compliance">SOC-2 & Governance Audit Validation</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Directive Details & Constraints
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Model the cash runway if we hire 2 senior AI engineers in Q3 while maintaining 14 months of cash cushion. Draft board memo."
                  value={directiveForm.directiveText}
                  onChange={(e) => setDirectiveForm({ ...directiveForm, directiveText: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border text-xs outline-hidden transition-all focus:border-indigo-500 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={directiveSubmitted}
                className="w-full py-3 px-6 rounded-2xl bg-[#4F46E5] hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {directiveSubmitted ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    Directive Dispatched! Opening Dashboard...
                  </>
                ) : (
                  <>
                    Dispatch to Executive Council
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS ── */}
      <section id="faq" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto z-10 relative">
        <div className="text-center space-y-3 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 border border-indigo-100 dark:border-indigo-900">
            Transparency
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Frequently Asked{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Everything you need to know about autonomous startup orchestration
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'How does the human-in-the-loop approval safeguard work?',
              a: 'Every high-stakes action — such as budget allocation, equity grants, contract execution, or code deployments — requires explicit founder authorization through the Approval Queue. Nothing irreversible is performed unilaterally.'
            },
            {
              q: 'Can CatalystOS integrate with our existing financial bank accounts?',
              a: 'Yes. CatalystOS connects read-only with Stripe, Brex, Mercury, and QuickBooks through secure OAuth, continuously monitoring live burn rates and calibrating runway predictions without requiring manual CSV uploads.'
            },
            {
              q: 'How are hallucinations prevented across agent deliberations?',
              a: 'CatalystOS uses a multi-agent verification protocol. Financial figures computed by Marcus CFO must match deterministic mathematical formulas before Atlas CEO incorporates them into strategic board decks.'
            },
            {
              q: 'Can I export our venture workflows and data at any time?',
              a: 'Absolutely. All board memos, PRDs, equity schedules, and workflow state logs are stored in standardized markdown and JSON formats, exportable with one click.'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border transition-all duration-200 overflow-hidden"
              style={{
                backgroundColor: 'var(--c-surface)',
                borderColor: 'var(--c-border)'
              }}
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors"
              >
                <span>{item.q}</span>
                {activeFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-indigo-600 flex-shrink-0 ml-4" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-4" />
                )}
              </button>
              {activeFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="border-t py-12 px-4 sm:px-6 relative z-10 transition-colors"
        style={{
          backgroundColor: 'var(--c-surface)',
          borderColor: 'var(--c-border)'
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white">
              <CatalystLogo className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              Catalyst<span className="text-indigo-600">OS</span>
            </span>
            <span className="text-xs text-slate-400">
              — The Autonomous Venture Operating System
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <button onClick={() => scrollToSection('overview')} className="hover:text-indigo-600 transition-colors">
              Overview
            </button>
            <button onClick={() => scrollToSection('council')} className="hover:text-indigo-600 transition-colors">
              Council
            </button>
            <button onClick={() => scrollToSection('sprints')} className="hover:text-indigo-600 transition-colors">
              Pipelines
            </button>
            <button onClick={() => scrollToSection('timeline')} className="hover:text-indigo-600 transition-colors">
              Timeline
            </button>
            <button onClick={onStartBuilding} className="font-semibold text-indigo-600 hover:underline">
              Launch App
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
