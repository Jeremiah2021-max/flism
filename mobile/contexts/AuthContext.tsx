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
  department: string | null;
  faculty: string | null;
  year_of_study: string | null;
  date_of_birth: string | null;
  address: string | null;
  ghana_card_number: string | null;
  momo_number: string | null;
  momo_provider: string | null;
  role: string;
  kyc_step: number;
  trust_score: number;
  loan_limit: string;
  is_verified: boolean;
  is_kyc_complete: boolean;
  is_student_verified: boolean;
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
  department?: string;
  faculty?: string;
  year_of_study?: string;
  momo_number?: string;
  momo_provider?: string;
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
