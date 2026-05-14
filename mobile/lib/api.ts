import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  // On web, use relative URLs (works through the Express proxy on port 5000)
  if (Platform.OS === 'web') return '';
  // On native device/emulator, use localhost
  return 'http://localhost:5000';
}

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('flism_token') : null;
    }
    return await SecureStore.getItemAsync('flism_token');
  } catch { return null; }
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem('flism_token', token);
  } else {
    await SecureStore.setItemAsync('flism_token', token);
  }
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('flism_token');
  } else {
    await SecureStore.deleteItemAsync('flism_token');
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
