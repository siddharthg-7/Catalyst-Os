import React from 'react';
import { Bot, X, Sparkles } from 'lucide-react';
import CatalystLogo from '../CatalystLogo';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export default function ChatButton({ isOpen, onClick, unreadCount = 0 }: ChatButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={onClick}
        aria-label="Toggle Catalyst OS AI Chatbot"
        className="w-14 h-14 rounded-2xl bg-white hover:bg-zinc-200 text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:shadow-[0_0_40px_rgba(255,255,255,0.7)] transition-all duration-300 flex items-center justify-center relative cursor-pointer group scale-100 hover:scale-105 active:scale-95"
      >
        {/* Subtle Ambient Pulse Ring */}
        <span className="absolute -inset-1 rounded-2xl bg-white/20 animate-ping opacity-75 pointer-events-none" style={{ animationDuration: '3s' }} />

        {/* Icon Transition */}
        {isOpen ? (
          <X className="w-6 h-6 text-black transition-transform duration-300 rotate-90" />
        ) : (
          <div className="relative flex items-center justify-center">
            <CatalystLogo className="w-7 h-7 text-black transition-transform duration-300 group-hover:scale-110" />
            <Sparkles className="w-3.5 h-3.5 text-black absolute -top-1 -right-1 animate-pulse" />
          </div>
        )}

        {/* Unread Badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-black font-mono text-[10px] font-bold flex items-center justify-center shadow-lg border border-black">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
