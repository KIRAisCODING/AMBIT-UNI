/**
 * AMBIT — Centralized Type-Safe API Client
 * Automatically attaches timezone, standard headers, and handles error normalization.
 */

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null | undefined>;
}

async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: any,
  options: RequestOptions = {}
): Promise<T> {
  const timeZone = getUserTimeZone();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-timezone': timeZone,
    ...(options.headers || {}),
  };

  let url = endpoint;
  if (options.params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== null && value !== undefined) {
        query.set(key, String(value));
      }
    }
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);

  let data: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const errorMessage =
      (typeof data === 'object' && data?.error) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(res.status, errorMessage, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, 'GET', undefined, options),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, 'POST', body, options),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, 'PATCH', body, options),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, 'PUT', body, options),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, 'DELETE', undefined, options),
};

