import React, { createContext, useContext, useState } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  loginAsDemo: () => void;
  /**
   * Performs a fetch with the Clerk session token automatically attached
   * as a Bearer Authorization header. Drop-in replacement for the old
   * JWT-based apiFetch used throughout the app.
   */
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [demoUser, setDemoUser] = useState<User | null>(null);

  // Map Clerk user or Demo user to the app's internal User shape
  const user: User | null = demoUser ?? (
    isSignedIn && clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
          name: clerkUser.fullName ?? clerkUser.username ?? 'Founder User',
          role: ((clerkUser.publicMetadata?.role as UserRole) ?? 'Founder'),
        }
      : null
  );

  const loading = !isLoaded && !demoUser;

  const loginAsDemo = () => {
    setDemoUser({
      id: 'usr_founder_demo',
      email: 'founder@founder.os',
      name: 'Founder Demo',
      role: 'Founder',
    });
  };

  const logout = async () => {
    setDemoUser(null);
    try {
      await signOut();
    } catch (e) {
      // Ignore if not signed in via Clerk
    }
  };

  /**
   * Attaches the session token to every API request.
   */
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token: string | null = null;
    try {
      token = await getToken();
    } catch (e) {
      token = 'mock_demo_bearer_token';
    }

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['Authorization'] = `Bearer mock_demo_bearer_token`;
    }

    // Only route RAG-specific endpoints to the Python FastAPI backend
    const isPythonEndpoint = url.startsWith('/api/chat') || url.startsWith('/api/rag');
    const finalUrl = isPythonEndpoint ? `http://127.0.0.1:8000${url}` : url;

    return fetch(finalUrl, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, loginAsDemo, apiFetch }}>
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
