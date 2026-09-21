import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name?: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginAsDemo: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('catalystos_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const demo = localStorage.getItem('catalystos_demo_user');
      if (demo) return JSON.parse(demo);
      const savedUser = localStorage.getItem('catalystos_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Validate or refresh session on mount
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('catalystos_token');
      const storedDemo = localStorage.getItem('catalystos_demo_user');

      if (storedDemo) {
        try {
          const parsed = JSON.parse(storedDemo);
          if (mounted) {
            setUser(parsed);
            setToken('mock_demo_bearer_token');
            setLoading(false);
          }
          return;
        } catch {
          localStorage.removeItem('catalystos_demo_user');
        }
      }

      if (!storedToken) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (mounted && data.user) {
            setUser(data.user);
            setToken(storedToken);
            localStorage.setItem('catalystos_user', JSON.stringify(data.user));
          }
        } else {
          // Token expired or invalid
          if (mounted) {
            localStorage.removeItem('catalystos_token');
            localStorage.removeItem('catalystos_user');
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.warn('[NeonAuth] Verification fallback to local state:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const signin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Authentication failed. Please check your credentials.' };
      }

      localStorage.removeItem('catalystos_demo_user');
      localStorage.setItem('catalystos_token', data.token);
      localStorage.setItem('catalystos_user', JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during sign in.' };
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string = 'Founder',
    role: UserRole = 'Founder'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      localStorage.removeItem('catalystos_demo_user');
      localStorage.setItem('catalystos_token', data.token);
      localStorage.setItem('catalystos_user', JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during sign up.' };
    }
  };

  const loginAsDemo = useCallback(() => {
    const dUser: User = {
      id: 'usr_founder_demo',
      email: 'founder@founder.os',
      name: 'Founder Demo',
      role: 'Founder',
    };
    try {
      localStorage.removeItem('catalystos_token');
      localStorage.removeItem('catalystos_user');
      localStorage.setItem('catalystos_demo_user', JSON.stringify(dUser));
    } catch {}
    setUser(dUser);
    setToken('mock_demo_bearer_token');
  }, []);

  const logout = async () => {
    try {
      localStorage.removeItem('catalystos_token');
      localStorage.removeItem('catalystos_user');
      localStorage.removeItem('catalystos_demo_user');
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
    setUser(null);
    setToken(null);
  };

  /**
   * Performs an authenticated fetch with the Neon JWT or demo token
   * automatically attached as a Bearer Authorization header.
   */
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const activeToken = token || localStorage.getItem('catalystos_token') || 'mock_demo_bearer_token';

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    // Route RAG-specific endpoints to the Python FastAPI backend if running
    const isPythonEndpoint = url.startsWith('/api/chat') || url.startsWith('/api/rag');
    const finalUrl = isPythonEndpoint ? `http://127.0.0.1:8000${url}` : url;

    return fetch(finalUrl, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signin, signup, logout, loginAsDemo, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
