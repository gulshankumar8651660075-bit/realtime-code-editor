const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export function getBackendUrl() {
  return BACKEND_URL;
}

export function getWsUrl() {
  // Convert http/https to ws/wss for Socket.io websocket connection
  return BACKEND_URL;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('synapse_token');
}

export function setToken(token: string) {
  localStorage.setItem('synapse_token', token);
}

export function removeToken() {
  localStorage.removeItem('synapse_token');
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('synapse_user');
  return user ? JSON.parse(user) : null;
}

export function setUser(user: any) {
  localStorage.setItem('synapse_user', JSON.stringify(user));
}

export function removeUser() {
  localStorage.removeItem('synapse_user');
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export async function apiRequest(path: string, options: RequestOptions = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}
