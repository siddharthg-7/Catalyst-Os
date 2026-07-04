import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState } from '../types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
  });
  const [loading, setLoading] = useState(true);

  // Load session persistence on mount
  useEffect(() => {
    try {
      const persistedUser = localStorage.getItem('founder_os_user');
      const persistedAccess = localStorage.getItem('founder_os_access_token');
      const persistedRefresh = localStorage.getItem('founder_os_refresh_token');

      if (persistedUser && persistedAccess && persistedRefresh) {
        setAuthState({
          user: JSON.parse(persistedUser),
          accessToken: persistedAccess,
          refreshToken: persistedRefresh,
        });
      }
    } catch (err) {
      console.error('Failed to parse persisted session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update localStorage when state changes
  const saveSession = (user: User, access: string, refresh: string) => {
    localStorage.setItem('founder_os_user', JSON.stringify(user));
    localStorage.setItem('founder_os_access_token', access);
    localStorage.setItem('founder_os_refresh_token', refresh);
    setAuthState({ user, accessToken: access, refreshToken: refresh });
  };

  const logout = () => {
    localStorage.removeItem('founder_os_user');
    localStorage.removeItem('founder_os_access_token');
    localStorage.removeItem('founder_os_refresh_token');
    setAuthState({ user: null, accessToken: null, refreshToken: null });
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed.');
    }

    saveSession(data.user, data.accessToken, data.refreshToken);
  };

  const signup = async (name: string, email: string, password: string, role: UserRole) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    saveSession(data.user, data.accessToken, data.refreshToken);
  };

  // Automated JWT Token interceptor and silent refresh on 401s
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = { ...(options.headers as Record<string, string>) };
    
    // Add bearer token if we have it
    if (authState.accessToken) {
      headers['Authorization'] = `Bearer ${authState.accessToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expired (401)
    if (response.status === 401 && authState.refreshToken) {
      console.log('[AuthContext] Access token expired, attempting silent refresh...');
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: authState.refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          // Save new tokens
          if (authState.user) {
            saveSession(authState.user, refreshData.accessToken, refreshData.refreshToken);
            
            // Re-attempt original request with new access token
            headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
            response = await fetch(url, { ...options, headers });
          }
        } else {
          // Refresh token expired or invalid, force logout
          console.warn('[AuthContext] Refresh token invalid. Logging out.');
          logout();
        }
      } catch (err) {
        console.error('[AuthContext] Silent token refresh failed:', err);
        logout();
      }
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{ user: authState.user, accessToken: authState.accessToken, refreshToken: authState.refreshToken, loading, login, signup, logout, apiFetch }}>
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
