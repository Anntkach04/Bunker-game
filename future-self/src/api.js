const TOKEN_KEY = 'futureself_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  signup: (payload) => request('POST', '/api/subscribers', payload),
  me: () => request('GET', '/api/me'),
  updateMe: (payload) => request('PUT', '/api/me', payload),
  preview: () => request('GET', '/api/me/preview'),
  sendNow: () => request('POST', '/api/me/send-now'),
  listEmails: () => request('GET', '/api/me/emails'),
  getEmail: (id) => request('GET', `/api/me/emails/${id}`),
  scheduleTest: () => request('POST', '/api/me/schedule-test'),
  health: () => request('GET', '/api/health'),
};
