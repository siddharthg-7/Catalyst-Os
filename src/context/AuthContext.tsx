import React, { createContext, useContext } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
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

  // Map Clerk user to the app's internal User shape
  const user: User | null =
    isSignedIn && clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
          name: clerkUser.fullName ?? clerkUser.username ?? '',
          role: ((clerkUser.publicMetadata?.role as UserRole) ?? 'Founder'),
        }
      : null;

  const loading = !isLoaded;

  const logout = async () => {
    await signOut();
  };

  /**
   * Attaches the current Clerk session token to every API request.
   * All existing callers of apiFetch continue to work unchanged.
   */
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = await getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, apiFetch }}>
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
