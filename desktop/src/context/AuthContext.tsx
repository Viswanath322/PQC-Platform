/**
 * AuthContext — centralised authentication state.
 *
 * Single source of truth for:
 *  - Whether the user is authenticated
 *  - The stored access token
 *  - The resolved User object
 *  - login / register / logout actions
 *
 * The context registers a handler with the API client so that any
 * 401 response automatically clears auth state and triggers redirect
 * to the login screen (no mock fallback is substituted).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, registerUnauthorizedHandler } from '../services/api';
import type { User } from '../types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;     // resolving token on app boot
  token: string | null;
  user: User | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  /** Call to signal 401 was received anywhere in the app */
  handleUnauthorized: () => void;
}

// ──────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ──────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('pqc_auth_token')
  );
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Boot: if a token exists, resolve the current user ──────────────
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const storedToken = localStorage.getItem('pqc_auth_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.getCurrentUser();
        if (!cancelled) {
          setUser(me);
          setToken(storedToken);
        }
      } catch {
        // Token invalid / expired → clear everything
        if (!cancelled) {
          api.clearToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Register the 401 handler with the API client ────────────────────
  const handleUnauthorized = useCallback(() => {
    api.clearToken();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    return registerUnauthorizedHandler(handleUnauthorized);
  }, [handleUnauthorized]);

  // ── login ─────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      const { token: newToken, user: loggedInUser } = await api.login({
        email,
        password,
      });
      setToken(newToken);
      setUser(loggedInUser);
    },
    []
  );

  // ── register ──────────────────────────────────────────────────────
  // Backend register endpoint returns UserResponse (not a token).
  // User must login after registration to obtain a token.
  const register = useCallback(
    async (email: string, password: string, fullName?: string) => {
      await api.register({ email, password, full_name: fullName });
      // Immediately login after successful registration
      const { token: newToken, user: loggedInUser } = await api.login({
        email,
        password,
      });
      setToken(newToken);
      setUser(loggedInUser);
    },
    []
  );

  // ── logout ────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    api.clearToken();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token && !!user,
        isLoading,
        token,
        user,
        login,
        register,
        logout,
        handleUnauthorized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
