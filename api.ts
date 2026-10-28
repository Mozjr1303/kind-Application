const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem('token');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let targetUrl: RequestInfo | URL = input;
  if (typeof input === 'string' && input.startsWith('/api') && API_BASE_URL) {
    targetUrl = `${API_BASE_URL}${input}`;
  }

  const response = await fetch(targetUrl, { ...init, headers });
  if (response.status === 401) {
    for (const key of ['token', 'user', 'userId', 'userName', 'userRole', 'userStatus']) {
      localStorage.removeItem(key);
    }
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.clone().json();
      if (typeof body.message === 'string') message = body.message;
    } catch {
      // Keep the status-based message if the response does not contain JSON.
    }
    throw new Error(message);
  }

  return response;
}
