import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { apiFetch, setToken, clearToken } from "@/lib/api";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  trust_score: number;
  loan_limit: string;
  is_verified: boolean;
  is_kyc_complete: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function getStoredToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return localStorage.getItem("flism_admin_token");
    return await SecureStore.getItemAsync("flism_admin_token");
  } catch {
    return null;
  }
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
          const me = await apiFetch<User>("/api/users/me");
          if (me.role !== "admin") {
            await clearToken();
          } else {
            setUser(me);
          }
        }
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await apiFetch<{ user: User; token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    if (res.user.role !== "admin")
      throw new Error("This account does not have admin access.");
    await setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  }

  async function logout() {
    await clearToken();
    setTokenState(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout }),
    [user, token, isLoading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
