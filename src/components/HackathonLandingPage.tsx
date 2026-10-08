import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code,
  Cpu,
  Server,
  Zap,
  ExternalLink,
  Calendar,
  MapPin,
  Clock,
  Send,
  Moon,
  Sun,
  Play,
  Bot,
  Layers,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Shield,
  Activity,
  Github,
  Linkedin,
  Mail,
  ChevronRight,
  Database,
  Terminal,
  FileText
} from 'lucide-react';
import CatalystLogo from './CatalystLogo';

interface HackathonLandingPageProps {
  onStartBuilding: () => void;
  onDemoLogin?: () => void;
}

export default function HackathonLandingPage({ onStartBuilding, onDemoLogin }: HackathonLandingPageProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'projects' | 'experience' | 'skills' | 'achievements' | 'certifications' | 'contact'>('home');
  const [isDark, setIsDark] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  // Sync theme with document
  useEffect(() => {
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    setIsDark(isDarkTheme);
  }, []);

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('catalystos-theme', next);
    setIsDark(!isDark);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'projects', label: 'Projects' },
    { id: 'experience', label: 'Experience' },
    { id: 'skills', label: 'Skills' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'contact', label: 'Contact' },
  ] as const;

  return (
    <div className="min-h-screen relative font-sans overflow-x-hidden selection:bg-indigo-500/20 selection:text-indigo-900 transition-colors duration-300" style={{ backgroundColor: 'var(--c-bg)', color: 'var(--c-fg)' }}>
      
      {/* ── AMBIENT AURORA & PARTICLES BACKGROUND ────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div 
          className="absolute w-[650px] h-[650px] rounded-full blur-[120px] -top-40 -left-20 opacity-40 transition-opacity duration-700"
          style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[130px] top-1/3 -right-20 opacity-35 transition-opacity duration-700"
          style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute w-[550px] h-[550px] rounded-full blur-[110px] bottom-10 left-1/4 opacity-30 transition-opacity duration-700"
          style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.16) 0%, transparent 70%)' }}
        />

        {/* Subtle floating ambient particle dots */}
        <div className="absolute top-[18%] left-[12%] w-1.5 h-1.5 rounded-full bg-indigo-400/40 animate-ping" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[28%] right-[15%] w-1 h-1 rounded-full bg-purple-400/50" />
        <div className="absolute top-[48%] left-[8%] w-1.5 h-1.5 rounded-full bg-sky-400/40" />
        <div className="absolute top-[65%] right-[22%] w-1 h-1 rounded-full bg-indigo-400/30" />
        <div className="absolute top-[82%] left-[18%] w-1.5 h-1.5 rounded-full bg-purple-400/40" />
      </div>

      {/* ── 1. STICKY FLOATING PILL NAVBAR (Images 2 & 4) ────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-5 flex justify-center pointer-events-none">
        <nav 
          className="w-full max-w-5xl rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.06)] border transition-all duration-300 pointer-events-auto backdrop-blur-md"
          style={{ 
            backgroundColor: isDark ? 'rgba(22, 22, 22, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.85)'
          }}
        >
          {/* Brand Logo / Avatar */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => { setActiveTab('home'); scrollToSection('hero'); }}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-sm group-hover:scale-105 transition-transform">
              SC
            </div>
            <span className="font-bold text-sm tracking-tight font-sans" style={{ color: 'var(--c-fg)' }}>
              Sai Charan
            </span>
          </div>

          {/* Center Navigation Links with Active Pill indicator */}
          <div className="hidden lg:flex items-center gap-1 text-[13px] font-medium font-sans">
            {navLinks.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    scrollToSection(tab.id);
                  }}
                  className={`relative px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive ? 'font-semibold text-indigo-600' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="landingNavPill"
                      className="absolute inset-0 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg -z-10"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action: Theme toggle + Let's Connect CTA */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-all cursor-pointer border hover:scale-105"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(241, 245, 249, 0.8)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.8)',
                color: isDark ? '#E2E8F0' : '#475569'
              }}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Let's Connect Button */}
            <button
              onClick={() => {
                setActiveTab('contact');
                scrollToSection('contact');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.35)] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>Let's Connect</span>
            </button>
          </div>
        </nav>
      </header>

      {/* ── 2. HERO METRICS STRIP (Image 1 top cards) ───────────────────────── */}
      <section id="hero" className="pt-32 pb-12 px-6 relative z-10">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {[
              { number: '10+', label: 'Projects Built' },
              { number: '20+', label: 'Technologies' },
              { number: '2', label: 'Internships' },
              { number: '5+', label: 'Achievements' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="rounded-2xl p-6 text-center border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group"
                style={{
                  backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(241, 245, 249, 0.9)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03)'
                }}
              >
                <div className="text-3xl md:text-4xl font-extrabold text-indigo-600 tracking-tight font-sans mb-1 group-hover:scale-105 transition-transform">
                  {stat.number}
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 font-sans">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Demo Access Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border" style={{ backgroundColor: isDark ? 'var(--c-surface-2)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.8)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block" style={{ color: 'var(--c-fg)' }}>CatalystOS Autonomous Operating System</span>
                <span className="text-[11px] text-slate-500">Live Hackathon Full-Stack MVP Environment</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={onStartBuilding}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(203, 213, 225, 0.8)' }}
              >
                Sign In
              </button>
              {onDemoLogin && (
                <button
                  onClick={onDemoLogin}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Launch Workspace</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ── 3. "WHAT I SPECIALIZE IN" / 4 PASTEL CARDS (Image 1) ─────────────── */}
      <section id="about" className="py-16 px-6 relative z-10">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-100 dark:border-indigo-900/60">
              Core Expertise
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--c-fg)', letterSpacing: '-0.02em' }}>
              What I <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Specialize In</span>
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              From intelligent computer vision systems to scalable full-stack applications
            </p>
          </div>

          {/* 4 Pastel Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* 1. Pastel Lavender */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300"
              style={{
                backgroundColor: isDark ? 'rgba(79, 70, 229, 0.08)' : '#F3EFFE',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : '#E5DCFB'
              }}
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-purple-600 bg-purple-100/80 dark:bg-purple-900/40">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  AI & Computer Vision
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  YOLOv11, PyTorch, deep learning, object detection, model training & deployment.
                </p>
              </div>
            </motion.div>

            {/* 2. Pastel Sky Blue */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300"
              style={{
                backgroundColor: isDark ? 'rgba(14, 165, 233, 0.08)' : '#EAF3FF',
                borderColor: isDark ? 'rgba(14, 165, 233, 0.25)' : '#D2E5FF'
              }}
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sky-600 bg-sky-100/80 dark:bg-sky-900/40">
                  <Code className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  Full-Stack Development
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  React, Next.js, Spring Boot, Node.js, REST APIs, WebSockets, PostgreSQL.
                </p>
              </div>
            </motion.div>

            {/* 3. Pastel Mint */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300"
              style={{
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.08)' : '#EAFBF3',
                borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#CEF5DF'
              }}
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-emerald-600 bg-emerald-100/80 dark:bg-emerald-900/40">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  Systems & Infrastructure
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  Linux, Nginx, reverse proxy, SSL, DNS, Google Cloud, server monitoring.
                </p>
              </div>
            </motion.div>

            {/* 4. Pastel Peach/Amber */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300"
              style={{
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FEF5EA',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FCE5CB'
              }}
            >
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-amber-600 bg-amber-100/80 dark:bg-amber-900/40">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                  Performance Engineering
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  Load testing, production hosting, CI/CD, AI-assisted development.
                </p>
              </div>
            </motion.div>

          </div>

        </div>
      </section>

      {/* ── 4. "SELECTED PROJECTS" / CASE STUDY GRADIENT CARDS (Image 2) ─────── */}
      <section id="projects" className="py-16 px-6 relative z-10">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-100 dark:border-indigo-900/60">
              Featured Work
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--c-fg)', letterSpacing: '-0.02em' }}>
              Selected <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Projects</span>
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Real-world systems, computer vision models, and full-stack software built for production.
            </p>
          </div>

          {/* 3 Case Study Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Project 1: Fire & Smoke Detection (Peach top gradient) */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl overflow-hidden border shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between"
              style={{
                backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
              }}
            >
              <div>
                {/* Header with Peach gradient */}
                <div 
                  className="p-6 border-b"
                  style={{
                    background: isDark ? 'linear-gradient(180deg, rgba(251, 146, 60, 0.15) 0%, transparent 100%)' : 'linear-gradient(180deg, #FFE8DC 0%, #FFFFFF 100%)',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(254, 215, 170, 0.4)'
                  }}
                >
                  <span className="text-[11px] font-bold tracking-wider text-orange-600 uppercase font-mono block mb-3">
                    CASE STUDY
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    Fire & Smoke Detection
                  </h3>
                </div>

                {/* Content body */}
                <div className="p-6 space-y-5">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Real-time industrial fire and smoke detection using YOLOv11 with monitoring dashboard and analytics.
                  </p>

                  {/* Tech badge pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {['YOLOv11', 'PyTorch', 'Computer Vision', 'FastAPI'].map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                        style={{
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#F3EFFE',
                          color: isDark ? '#A5B4FC' : '#4F46E5',
                          borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E0E7FF'
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer link */}
              <div className="p-6 pt-0">
                <button
                  onClick={onStartBuilding}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View Case Study</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Project 2: Smart Parking System (Sky Blue top gradient) */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl overflow-hidden border shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between"
              style={{
                backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
              }}
            >
              <div>
                {/* Header with Sky Blue gradient */}
                <div 
                  className="p-6 border-b"
                  style={{
                    background: isDark ? 'linear-gradient(180deg, rgba(14, 165, 233, 0.15) 0%, transparent 100%)' : 'linear-gradient(180deg, #E0F2FE 0%, #FFFFFF 100%)',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(186, 230, 253, 0.4)'
                  }}
                >
                  <span className="text-[11px] font-bold tracking-wider text-sky-600 uppercase font-mono block mb-3">
                    CASE STUDY
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    Smart Parking System
                  </h3>
                </div>

                {/* Content body */}
                <div className="p-6 space-y-5">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Bridges communication gap between security and faculty with real-time notifications and slot management.
                  </p>

                  {/* Tech badge pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {['Spring Boot', 'React', 'WebSockets', 'MySQL'].map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                        style={{
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#F3EFFE',
                          color: isDark ? '#A5B4FC' : '#4F46E5',
                          borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E0E7FF'
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer link */}
              <div className="p-6 pt-0">
                <button
                  onClick={onStartBuilding}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View Case Study</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Project 3: VoxScholar (Lavender top gradient) */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-3xl overflow-hidden border shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between"
              style={{
                backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
              }}
            >
              <div>
                {/* Header with Lavender gradient */}
                <div 
                  className="p-6 border-b"
                  style={{
                    background: isDark ? 'linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, transparent 100%)' : 'linear-gradient(180deg, #F3E8FF 0%, #FFFFFF 100%)',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(233, 213, 255, 0.4)'
                  }}
                >
                  <span className="text-[11px] font-bold tracking-wider text-purple-600 uppercase font-mono block mb-3">
                    CASE STUDY
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    VoxScholar
                  </h3>
                </div>

                {/* Content body */}
                <div className="p-6 space-y-5">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    AI-powered academic assistant with voice interaction, intelligent Q&A, and study tools.
                  </p>

                  {/* Tech badge pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {['React', 'Node.js', 'FastAPI', 'MongoDB'].map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                        style={{
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#F3EFFE',
                          color: isDark ? '#A5B4FC' : '#4F46E5',
                          borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E0E7FF'
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer link */}
              <div className="p-6 pt-0">
                <button
                  onClick={onStartBuilding}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View Case Study</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

          </div>

        </div>
      </section>

      {/* ── 5. "EXPERIENCE" / VERTICAL TIMELINE CARDS (Image 3) ─────────────── */}
      <section id="experience" className="py-16 px-6 relative z-10">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-100 dark:border-indigo-900/60">
              Career History
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--c-fg)', letterSpacing: '-0.02em' }}>
              Work <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Experience</span>
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Professional hands-on experience in cloud infrastructure, DevOps pipelines, and server architecture.
            </p>
          </div>

          {/* Timeline Container with Vertical Line and Purple Node Dots */}
          <div className="relative pl-6 md:pl-10 space-y-8 max-w-4xl mx-auto">
            {/* Vertical connector line */}
            <div className="absolute left-[11px] md:left-[19px] top-6 bottom-6 w-0.5 bg-indigo-200 dark:bg-indigo-900/50" />

            {/* Experience Card 1: DevOps Intern */}
            <div className="relative">
              {/* Glowing Purple Node Dot */}
              <div className="absolute -left-[29px] md:-left-[37px] top-7 w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950" />

              <div 
                className="rounded-3xl p-6 md:p-8 border shadow-[0_8px_30px_rgba(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-12 gap-6"
                style={{
                  backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
                }}
              >
                {/* Left Column (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  <span className="text-[11px] font-bold tracking-wider text-sky-600 uppercase font-mono block">
                    INTERNSHIP
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      DevOps Intern
                    </h3>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Aarna Connect
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-sans">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>June 2026 — July 2026</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Docker', 'Linux', 'Nginx', 'Git', 'GitHub', 'CI/CD', 'Server Management', 'Cloud Deployment'].map((b) => (
                      <span
                        key={b}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                        style={{
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#F3EFFE',
                          color: isDark ? '#A5B4FC' : '#4F46E5',
                          borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E0E7FF'
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => scrollToSection('contact')}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right Column: Highlights (5 cols) */}
                <div className="md:col-span-5 md:border-l md:pl-6 border-slate-100 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 font-mono">
                    Highlights
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>Cloud infrastructure & deployment workflows</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>Server configuration & deployment automation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>Application monitoring & environment maintenance</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>Streamlined deployment pipelines with CI/CD</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Experience Card 2: Server Management Intern */}
            <div className="relative">
              {/* Glowing Purple Node Dot */}
              <div className="absolute -left-[29px] md:-left-[37px] top-7 w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950" />

              <div 
                className="rounded-3xl p-6 md:p-8 border shadow-[0_8px_30px_rgba(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-12 gap-6"
                style={{
                  backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
                }}
              >
                {/* Left Column (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  <span className="text-[11px] font-bold tracking-wider text-sky-600 uppercase font-mono block">
                    INTERNSHIP
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      Server Management Intern
                    </h3>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Head of Innovation, Incubation & Entrepreneurship
                    </p>
                    <p className="text-xs text-slate-500">Mentor: Mr. M Krishna Prasad</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-sans">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>October 2025 — March 2026</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Linux', 'Nginx', 'Google Cloud', 'SSL', 'DNS', 'Git/GitHub', 'Server Administration'].map((b) => (
                      <span
                        key={b}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                        style={{
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#F3EFFE',
                          color: isDark ? '#A5B4FC' : '#4F46E5',
                          borderColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#E0E7FF'
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => scrollToSection('contact')}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right Column: Highlights (5 cols) */}
                <div className="md:col-span-5 md:border-l md:pl-6 border-slate-100 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 font-mono">
                    Highlights
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>Linux server administration and management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>Nginx reverse proxy and SSL configuration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>Google Cloud Console deployment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <span>Production hosting and load testing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 6. "LET'S CONNECT" / TWO-COLUMN CONTACT (Image 4) ───────────────── */}
      <section id="contact" className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-100 dark:border-indigo-900/60">
              Contact
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight" style={{ color: 'var(--c-fg)', letterSpacing: '-0.02em' }}>
              Let's <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Connect</span>
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Open to full-time roles, internships, freelance projects, and interesting collaborations.
            </p>
          </div>

          {/* 2-Column Contact Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              
              {/* Opportunities Card */}
              <div 
                className="rounded-3xl p-6 border shadow-[0_8px_30px_rgba(0,0,0,0.02)] space-y-4"
                style={{
                  backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
                }}
              >
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Available for Opportunities</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  Currently open to full-time roles, internships, and exciting projects in AI/ML and full-stack development.
                </p>
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Andhra Pradesh, India</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>IST (UTC+5:30)</span>
                  </div>
                </div>
              </div>

              {/* Social Cards */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block pl-1">
                  Find me on
                </span>

                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-4 rounded-2xl border flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-sm group block"
                  style={{
                    backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
                  }}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 group-hover:scale-105 transition-transform">
                    <Github className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block" style={{ color: 'var(--c-fg)' }}>GitHub</span>
                    <span className="text-[10px] text-slate-400 font-mono">@YOUR_GITHUB</span>
                  </div>
                </a>

                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-4 rounded-2xl border flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-sm group block"
                  style={{
                    backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
                  }}
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <Linkedin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block" style={{ color: 'var(--c-fg)' }}>LinkedIn</span>
                    <span className="text-[10px] text-slate-400 font-mono">Sai Charan</span>
                  </div>
                </a>
              </div>

            </div>

            {/* Right Column: Send a Message Form (7 cols) */}
            <div className="md:col-span-7">
              <div 
                className="rounded-3xl p-6 md:p-8 border shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-6"
                style={{
                  backgroundColor: isDark ? 'var(--c-surface)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.85)'
                }}
              >
                <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--c-fg)' }}>
                  Send a Message
                </h3>

                {contactSubmitted ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Message Received!</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Thank you for reaching out. I'll get back to you as soon as possible.
                    </p>
                    <button
                      onClick={() => setContactSubmitted(false)}
                      className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
                    >
                      Send Another
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setContactSubmitted(true);
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Your Name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans"
                        style={{
                          backgroundColor: isDark ? 'var(--c-surface-2)' : '#F8FAFC',
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                          color: 'var(--c-fg)'
                        }}
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans"
                        style={{
                          backgroundColor: isDark ? 'var(--c-surface-2)' : '#F8FAFC',
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                          color: 'var(--c-fg)'
                        }}
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans"
                      style={{
                        backgroundColor: isDark ? 'var(--c-surface-2)' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                        color: 'var(--c-fg)'
                      }}
                    />

                    <textarea
                      rows={5}
                      placeholder="Your Message"
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans resize-none"
                      style={{
                        backgroundColor: isDark ? 'var(--c-surface-2)' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                        color: 'var(--c-fg)'
                      }}
                    />

                    <button
                      type="submit"
                      className="w-full py-3 px-6 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.35)] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t text-center text-xs text-slate-500 dark:text-slate-400 relative z-10" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(226, 232, 240, 0.8)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
              SC
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Sai Charan • CatalystOS</span>
          </div>
          <p>© {new Date().getFullYear()} Sai Charan. Built with React, TailwindCSS & Framer Motion.</p>
        </div>
      </footer>

    </div>
  );
}
