import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:5000';
    }
    return 'https://flism-app.onrender.com';
  }
  return 'http://localhost:5000';
}

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('flism_admin_token') : null;
    }
    return await SecureStore.getItemAsync('flism_admin_token');
  } catch { return null; }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem('flism_admin_token', token);
  } else {
    await SecureStore.setItemAsync('flism_admin_token', token);
  }
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('flism_admin_token');
  } else {
    await SecureStore.deleteItemAsync('flism_admin_token');
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });

  const contentType = res.headers.get('content-type') || '';
  let data: any;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message = typeof data === 'string' ? data : data?.error || JSON.stringify(data);
    throw new Error(message || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> { return apiFetch<T>(path); }
export async function apiPost<T>(path: string, body: unknown): Promise<T> { return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
export async function apiPut<T>(path: string, body: unknown): Promise<T> { return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }); }
export async function apiDelete<T>(path: string): Promise<T> { return apiFetch<T>(path, { method: 'DELETE' }); }
