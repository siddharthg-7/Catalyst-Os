import React, { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Shield } from 'lucide-react';

// Dark glassmorphic appearance config matching the app's design system
const clerkAppearance = {
  variables: {
    colorPrimary: '#6366f1',          // indigo-500
    colorBackground: '#09090b',       // zinc-950
    colorInputBackground: '#09090b',  // zinc-950
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: '#a1a1aa',    // zinc-400
    colorDanger: '#f87171',           // red-400
    colorSuccess: '#34d399',          // emerald-400
    borderRadius: '0.5rem',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: '0.875rem',
  },
  elements: {
    // Outermost card — transparent so our own container shows through
    card: {
      background: 'transparent',
      boxShadow: 'none',
      padding: '0',
    },
    // Hide Clerk's own header (we render our own above the component)
    header: { display: 'none' },
    // Social / OAuth buttons row
    socialButtonsBlockButton: {
      background: '#18181b',
      border: '1px solid #27272a',
      color: '#fff',
    },
    socialButtonsBlockButton__hover: {
      background: '#27272a',
    },
    // Divider
    dividerLine: { background: '#27272a' },
    dividerText: { color: '#52525b' },
    // Input fields
    formFieldInput: {
      background: '#09090b',
      border: '1px solid #3f3f46',
      color: '#fff',
    },
    formFieldLabel: {
      color: '#a1a1aa',
      textTransform: 'uppercase' as const,
      fontSize: '0.65rem',
      letterSpacing: '0.08em',
      fontWeight: '600',
    },
    // Primary action button
    formButtonPrimary: {
      background: '#6366f1',
      boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.15)',
      fontWeight: '600',
    },
    // Footer links
    footerActionLink: { color: '#818cf8' },  // indigo-400
    // Error message
    formFieldErrorText: { color: '#f87171' },
    // The "Already have an account? Sign in" footer — we handle tab switching,
    // so hide Clerk's own version to avoid double navigation links.
    footer: { display: 'none' },
    // Internal card body
    cardBox: {
      boxShadow: 'none',
      background: 'transparent',
    },
  },
};

export default function AuthScreen() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 relative overflow-hidden font-sans">

      {/* Ambient glow decorations */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#09090b] border border-[#1e1e24] rounded-2xl shadow-2xl p-8 relative z-10">

        {/* Logo + header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            CatalystOS{' '}
            <span className="text-[10px] uppercase bg-zinc-800 text-zinc-400 font-mono tracking-wider px-2 py-0.5 rounded border border-zinc-700">
              v2.0
            </span>
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            {tab === 'signin'
              ? 'Sign in to access your multi-agent corporate matrix'
              : 'Create your account to get started'}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800 rounded-lg mb-6">
          <button
            id="auth-signin-tab"
            onClick={() => setTab('signin')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              tab === 'signin'
                ? 'bg-[#18181b] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Sign In
          </button>
          <button
            id="auth-signup-tab"
            onClick={() => setTab('signup')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              tab === 'signup'
                ? 'bg-[#18181b] text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* Clerk auth components */}
        <div id="clerk-auth-container">
          {tab === 'signin' ? (
            <SignIn
              appearance={clerkAppearance}
              routing="hash"
              signUpUrl="#signup"
              fallbackRedirectUrl="/"
            />
          ) : (
            <SignUp
              appearance={clerkAppearance}
              routing="hash"
              signInUrl="#signin"
              fallbackRedirectUrl="/"
            />
          )}
        </div>

      </div>
    </div>
  );
}
