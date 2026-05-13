import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiFetch, setToken, clearToken } from '@/lib/api';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  student_id: string | null;
  university: string;
  trust_score: number;
  loan_limit: string;
  is_verified: boolean;
  is_kyc_complete: boolean;
  profile_image: string | null;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  university?: string;
  student_id?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return localStorage.getItem('flism_token');
    return await SecureStore.getItemAsync('flism_token');
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getStoredToken();
        if (stored) {
          setTokenState(stored);
          const me = await apiFetch<User>('/api/users/me');
          setUser(me);
        }
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }

  async function register(data: RegisterData) {
    const res = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }

  async function logout() {
    await clearToken();
    setTokenState(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const me = await apiFetch<User>('/api/users/me');
      setUser(me);
    } catch { /* ignore */ }
  }

  const value = useMemo(() => ({
    user, token, isLoading, login, register, logout, refreshUser
  }), [user, token, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
