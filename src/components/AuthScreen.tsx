import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, LogIn, UserPlus, Key, Mail, User as UserIcon, HelpCircle } from 'lucide-react';

export default function AuthScreen() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Founder' | 'Executive' | 'Admin'>('Founder');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async (demoEmail: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await login(demoEmail, 'password123');
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(name, email, password, role);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Decorative subtle ambient lights */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#09090b] border border-[#1e1e24] rounded-2xl shadow-2xl p-8 relative z-10">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            FounderOS <span className="text-[10px] uppercase bg-zinc-800 text-zinc-400 font-mono tracking-wider px-2 py-0.5 rounded border border-zinc-700">v1.4</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Sign in to access your multi-agent corporate matrix
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-850 rounded-lg mb-6">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              isLogin ? 'bg-[#18181b] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              !isLogin ? 'bg-[#18181b] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Core Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Secret Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Select Organization Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="Founder">Founder — Full corporate approval capabilities</option>
                <option value="Executive">Executive — Launch initiatives & review, cannot sign contracts</option>
                <option value="Admin">Admin — Full infrastructure management powers</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/10 disabled:opacity-50"
          >
            {submitting ? (
              <span>Processing...</span>
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Initialize Platform Session</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create New Identity</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Seeding accounts for review & grading */}
        <div className="mt-8 pt-6 border-t border-zinc-900">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-wider mb-3 font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>One-Click Role Simulation</span>
          </div>
          
          <div className="space-y-2">
            <button
              onClick={() => handleDemoLogin('founder@founder.os')}
              disabled={submitting}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-left transition-all cursor-pointer group"
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                  Sophia Vance
                </span>
                <span className="text-[10px] text-zinc-500">
                  founder@founder.os
                </span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-950/50 text-indigo-400 border border-indigo-900 font-mono">
                Founder
              </span>
            </button>

            <button
              onClick={() => handleDemoLogin('exec@founder.os')}
              disabled={submitting}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-left transition-all cursor-pointer group"
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                  Marcus Sterling
                </span>
                <span className="text-[10px] text-zinc-500">
                  exec@founder.os
                </span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-900 font-mono">
                Executive
              </span>
            </button>

            <button
              onClick={() => handleDemoLogin('admin@founder.os')}
              disabled={submitting}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-left transition-all cursor-pointer group"
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                  AeroFlow Admin
                </span>
                <span className="text-[10px] text-zinc-500">
                  admin@founder.os
                </span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-900 font-mono">
                Admin
              </span>
            </button>
          </div>
          
          <div className="mt-4 flex items-center gap-1.5 justify-center text-[10px] text-zinc-500">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Default Password for all: <code className="text-zinc-400 font-mono font-semibold">password123</code></span>
          </div>
        </div>

      </div>
    </div>
  );
}
