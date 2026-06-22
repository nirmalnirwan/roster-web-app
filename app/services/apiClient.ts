import { getToken } from './authService';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5002';

type JsonBody = object | unknown[];

interface ApiErrorResponse {
  error?: string;
  errors?: Record<string, string[]> | string[] | Array<{ description?: string; code?: string }>;
  title?: string;
}

async function request(path: string, options: RequestInit = {}, allowedStatuses: number[] = []) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // try refreshing once if unauthorized
  if (res.status === 401) {
    try {
      const { refresh } = await import('./authService');
      const newTokens = await refresh();
      headers['Authorization'] = `Bearer ${newTokens.token}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    } catch {
      // if refresh fails, propagate original error
    }
  }

  if (!res.ok && !allowedStatuses.includes(res.status)) {
    // attempt to read body for error message
    throw new Error(await readErrorMessage(res));
  }

  return res;
}

export const apiClient = {
  get: (path: string) => request(path, { method: 'GET' }),
  getOptional: (path: string) => request(path, { method: 'GET' }, [404]),
  post: (path: string, body?: JsonBody) =>
    request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: JsonBody) =>
    request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorResponse;

    if (body.error) return body.error;
    if (Array.isArray(body.errors)) {
      return (
        body.errors
          .map((error) => (typeof error === 'string' ? error : error.description || error.code))
          .filter(Boolean)
          .join(', ') || body.title || res.statusText
      );
    }
    if (body.errors) {
      return Object.values(body.errors).flat().join(', ') || body.title || res.statusText;
    }
    if (body.title) return body.title;
  } catch {
    return res.statusText;
  }

  return res.statusText;
}
