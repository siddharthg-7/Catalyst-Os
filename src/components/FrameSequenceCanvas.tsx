import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowRight, Play, CheckCircle2, Shield } from 'lucide-react';

interface FrameSequenceCanvasProps {
  onStartBuilding: () => void;
  onBookDemo: () => void;
}

export default function FrameSequenceCanvas({ onStartBuilding, onBookDemo }: FrameSequenceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const TOTAL_FRAMES = 192;
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(0);
  const tickingRef = useRef(false);

  // Preload all WebP frames into memory
  useEffect(() => {
    let loadedCount = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(4, '0');
      img.src = `/frames/frame_${frameNum}.webp`;

      img.onload = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount === TOTAL_FRAMES) {
          imagesRef.current = images;
          setLoading(false);
          // Initial draw
          renderFrame(0);
        }
      };

      img.onerror = () => {
        loadedCount++;
        setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
        if (loadedCount === TOTAL_FRAMES) {
          imagesRef.current = images;
          setLoading(false);
        }
      };

      images.push(img);
    }
  }, []);

  // Cover-fit aspect ratio drawing onto canvas
  const renderFrame = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Cover fill math
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    const canvasRatio = rect.width / rect.height;
    const imgRatio = imgWidth / imgHeight;

    let drawWidth = rect.width;
    let drawHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawHeight = rect.width / imgRatio;
      offsetY = (rect.height - drawHeight) / 2;
    } else {
      drawWidth = rect.height * imgRatio;
      offsetX = (rect.width - drawWidth) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
  };

  // Scroll listener mapping scroll position to frame sequence
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) return;

      // Compute progress 0 to 1
      const rawProgress = -rect.top / totalScrollable;
      const progress = Math.max(0, Math.min(1, rawProgress));
      setScrollProgress(progress);

      const frameIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.floor(progress * TOTAL_FRAMES)
      );

      if (frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;

        if (!tickingRef.current) {
          tickingRef.current = true;
          requestAnimationFrame(() => {
            renderFrame(currentFrameRef.current);
            tickingRef.current = false;
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [loading]);

  // Calculate chapter overlay visibilities based on scroll progress
  const getChapterStyle = (start: number, end: number) => {
    const peak = (start + end) / 2;
    const halfWidth = (end - start) / 2;
    const dist = Math.abs(scrollProgress - peak);
    let opacity = 0;

    if (scrollProgress >= start && scrollProgress <= end) {
      opacity = 1 - dist / halfWidth;
      opacity = Math.max(0, Math.min(1, opacity * 1.5));
    }

    const translateY = (1 - opacity) * 30;

    return {
      opacity,
      transform: `translateY(${translateY}px)`,
      pointerEvents: opacity > 0.4 ? ('auto' as const) : ('none' as const),
      transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
    };
  };

  return (
    <div className="relative bg-[#030303]">
      
      {/* SECTION 1: HERO (Pure Matte Black, Minimalist Typography) */}
      <section className="h-screen w-full bg-[#030303] flex flex-col items-center justify-between p-8 relative overflow-hidden text-center z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Header Bar */}
        <div className="w-full max-w-6xl flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-mono font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              F
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">Catalyst OS</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              onClick={onBookDemo}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onStartBuilding}
              className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Central Hero Headline */}
        <div className="max-w-4xl space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Production Multi-Agent AI Operating System</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Meet the Executive Team <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              Every Founder Wishes They Had.
            </span>
          </h1>

          <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed font-sans">
            An autonomous operating system that delegates your vision across specialized AI executives in real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartBuilding}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold text-sm shadow-[0_0_25px_rgba(99,102,241,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = containerRef.current;
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 font-mono"
            >
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              <span>Watch Demo</span>
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="pb-6 flex flex-col items-center gap-2 text-zinc-500 text-[10px] font-mono tracking-widest uppercase animate-bounce">
          <span>Scroll To Explore</span>
          <div className="w-4 h-7 rounded-full border border-zinc-700 flex items-start justify-center p-1">
            <div className="w-1 h-1.5 rounded-full bg-indigo-400" />
          </div>
        </div>
      </section>

      {/* SECTION 2-7: STICKY CINEMATIC FRAME SEQUENCE CANVAS */}
      <div ref={containerRef} className="relative h-[650vh] bg-[#030303]">
        
        {/* Sticky Canvas Container */}
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          
          {/* Preload Overlay */}
          {loading && (
            <div className="absolute inset-0 z-50 bg-[#030303] flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold animate-pulse">
                F
              </div>
              <p className="text-xs font-mono text-zinc-400">Loading Frame Sequence... {loadProgress}%</p>
              <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-150" style={{ width: `${loadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Fullscreen Apple-style Canvas */}
          <canvas ref={canvasRef} className="w-full h-full object-cover" />

          {/* Vignette Overlay for Crisp Typography Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/60 pointer-events-none" />

          {/* ========================================================================= */}
          {/* CHAPTER OVERLAYS (Scroll Storyline) */}
          {/* ========================================================================= */}

          {/* Chapter 1: The Weight of Building (0.02 - 0.15) */}
          <div
            style={getChapterStyle(0.02, 0.16)}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold mb-3 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              CHAPTER 01 • THE ISOLATION
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              The Weight of Building
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
              Every founder begins alone. One vision. One product. Hundreds of responsibilities.
            </p>
          </div>

          {/* Chapter 2: Meet Your Executive Team (0.18 - 0.30) */}
          <div
            style={getChapterStyle(0.18, 0.32)}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold mb-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              CHAPTER 02 • THE EXECUTIVE MATRIX
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Meet Your Executive Team
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl mb-6">
              Five AI executives built specifically for startup founders.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-zinc-300">
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800">👔 CEO (Planner)</span>
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800">💰 CFO (Finance)</span>
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800">👩💼 Talent</span>
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800">📈 Growth</span>
              <span className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800">🗂 Operations</span>
            </div>
          </div>

          {/* Chapter 3: Delegation (0.34 - 0.46) */}
          <div
            style={getChapterStyle(0.34, 0.48)}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              CHAPTER 03 • DELEGATION
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Every Responsibility Finds Its Owner
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
              Watch every responsibility move from the founder to the AI executives. The founder stops managing tasks—the executives begin managing the company.
            </p>
          </div>

          {/* Chapter 4: Collaboration (0.50 - 0.62) */}
          <div
            style={getChapterStyle(0.50, 0.64)}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold mb-3 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
              CHAPTER 04 • COLLABORATION
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Five Minds. One Company.
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
              Each executive collaborates continuously. Information flows automatically across departmental silos. Every decision updates the rest of the organization.
            </p>
          </div>

          {/* Chapter 5: Growth (0.66 - 0.78) */}
          <div
            style={getChapterStyle(0.66, 0.80)}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold mb-3 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
              CHAPTER 05 • SCALE
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              From Idea to Scale.
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
              Catalyst OS transforms scattered work into an intelligent operating company. Users grow. Teams expand. Revenue increases. Everything remains synchronized.
            </p>
          </div>

          {/* Chapter 6: Results (0.82 - 0.90) */}
          <div
            style={getChapterStyle(0.82, 0.92)}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold mb-3 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
              CHAPTER 06 • FREEDOM
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Build More. Manage Less.
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
              Focus on vision while Catalyst OS handles execution.
            </p>
          </div>

          {/* Chapter 7: Final CTA (0.93 - 1.0) */}
          <div
            style={getChapterStyle(0.93, 1.0)}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center max-w-3xl mx-auto z-30"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-mono font-bold text-lg shadow-[0_0_30px_rgba(99,102,241,0.5)] mb-6">
              F
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Meet the Executive Team <br /> Every Founder Wishes They Had.
            </h2>

            <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto mb-8 font-sans">
              Deploy your multi-agent corporate matrix in under 60 seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xs">
              <button
                onClick={onStartBuilding}
                className="w-full py-3.5 rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-bold text-xs shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Start Building</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onBookDemo}
                className="w-full py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-all cursor-pointer font-mono"
              >
                Book Demo
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
