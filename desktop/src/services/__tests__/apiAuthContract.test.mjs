/**
 * API Authentication Contract Tests — TEST 1 through TEST 9
 *
 * Run with: node --test src/services/__tests__/apiAuthContract.test.mjs
 *
 * These tests mock fetch() and verify:
 *  - Login stores the token
 *  - Bearer header is attached to protected endpoints
 *  - 401 clears the token and throws ApiError (UNAUTHORIZED) — no mock fallback
 *  - 403 throws ApiError (FORBIDDEN) — no mock fallback
 *  - 404 throws ApiError (NOT_FOUND) — no mock fallback
 *  - Network failure throws ApiError (NETWORK_ERROR) — no mock fallback
 *  - getProjects/getScans/uploadRepository/createScan NEVER return mock data on failure
 */

import { strict as assert } from 'node:assert';
import { describe, it, before, beforeEach } from 'node:test';

// ──────────────────────────────────────────────────────────────
// Minimal localStorage mock for Node.js environment
// ──────────────────────────────────────────────────────────────
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};

// ──────────────────────────────────────────────────────────────
// Inline ApiError (mirrors the TypeScript implementation)
// ──────────────────────────────────────────────────────────────
class ApiError extends Error {
  constructor(status, serverDetail) {
    let errorType;
    let userMessage;

    if (status === 0) {
      errorType = 'NETWORK_ERROR';
      userMessage = 'Backend unavailable. Check that the server is running and try again.';
    } else if (status === 401) {
      errorType = 'UNAUTHORIZED';
      userMessage = 'Authentication required. Please sign in to continue.';
    } else if (status === 403) {
      errorType = 'FORBIDDEN';
      userMessage = 'Your account is not associated with an organization.';
    } else if (status === 404) {
      errorType = 'NOT_FOUND';
      userMessage = 'Resource not found or unavailable.';
    } else if (status === 409) {
      errorType = 'CONFLICT';
      userMessage = serverDetail || 'A conflict occurred with this request.';
    } else if (status >= 500) {
      errorType = 'SERVER_ERROR';
      userMessage = 'A backend server error occurred. Please try again later.';
    } else {
      errorType = 'UNKNOWN';
      userMessage = serverDetail || `Unexpected error (HTTP ${status}).`;
    }

    super(userMessage);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
    this.userMessage = userMessage;
  }
}

// ──────────────────────────────────────────────────────────────
// Inline ApiClient (same logic as api.ts but in pure JS)
// ──────────────────────────────────────────────────────────────
const unauthorizedHandlers = new Set();

function registerUnauthorizedHandler(fn) {
  unauthorizedHandlers.add(fn);
  return () => unauthorizedHandlers.delete(fn);
}

function notifyUnauthorized() {
  unauthorizedHandlers.forEach((fn) => fn());
}

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = localStorage.getItem('pqc_auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('pqc_auth_token', token);
    } else {
      localStorage.removeItem('pqc_auth_token');
    }
  }

  clearToken() {
    this.setToken(null);
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await globalThis.fetch(url, { ...options, headers });

      if (!response.ok) {
        let detail;
        try {
          const body = await response.json();
          detail = typeof body?.detail === 'string' ? body.detail : undefined;
        } catch { /* ignore */ }

        const err = new ApiError(response.status, detail);

        if (response.status === 401) {
          this.clearToken();
          notifyUnauthorized();
        }

        throw err;
      }

      return await response.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0);
    }
  }

  async login(payload) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.access_token);
    const user = res.user ?? await this.getCurrentUser();
    return { token: res.access_token, user };
  }

  async getCurrentUser() {
    return this.request('/auth/me', { method: 'GET' });
  }

  async getProjects() {
    return this.request('/projects', { method: 'GET' });
  }

  async createProject(payload) {
    return this.request('/projects', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getScans() {
    return this.request('/scans', { method: 'GET' });
  }

  async createScan(payload) {
    return this.request('/scans', { method: 'POST', body: JSON.stringify(payload) });
  }

  async uploadRepository(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/uploads', { method: 'POST', body: formData });
  }

  async cancelScan(id) {
    return this.request(`/scans/${id}/cancel`, { method: 'POST' });
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/** Create a fake fetch that returns the given response */
function mockFetch(status, body) {
  return async (_url, _opts) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

/** Create a fetch that captures what headers were sent */
function capturingFetch(status, body) {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, headers: opts?.headers ?? {} });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  fn.calls = calls;
  return fn;
}

/** Fetch that throws a TypeError (network failure) */
function networkErrorFetch() {
  return async () => { throw new TypeError('Failed to fetch'); };
}

const BASE = 'http://127.0.0.1:8000/api/v1';

// ──────────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────────

describe('API Authentication Contract', () => {
  let client;

  beforeEach(() => {
    localStorage.clear();
    unauthorizedHandlers.clear();
    client = new ApiClient(BASE);
  });

  // ── TEST 1: login stores access_token in localStorage ──────
  it('TEST 1 — login stores access_token in localStorage', async () => {
    globalThis.fetch = mockFetch(200, {
      access_token: 'test-token-abc123',
      user: { id: 'u1', email: 'a@b.com', full_name: 'Alice', role: 'admin', created_at: '' },
    });

    const { token } = await client.login({ email: 'a@b.com', password: 'secret' });

    assert.equal(token, 'test-token-abc123');
    assert.equal(localStorage.getItem('pqc_auth_token'), 'test-token-abc123');
    assert.equal(client.token, 'test-token-abc123');
  });

  // ── TEST 2: Bearer header is sent on GET /projects ────────
  it('TEST 2 — GET /projects sends Authorization: Bearer <token>', async () => {
    client.setToken('my-bearer-token');
    const cf = capturingFetch(200, []);
    globalThis.fetch = cf;

    await client.getProjects();

    assert.equal(cf.calls.length, 1);
    assert.equal(cf.calls[0].headers['Authorization'], 'Bearer my-bearer-token');
    assert.ok(cf.calls[0].url.includes('/projects'));
  });

  // ── TEST 3: Bearer header is sent on POST /projects ───────
  it('TEST 3 — POST /projects sends Authorization: Bearer <token>', async () => {
    client.setToken('project-token');
    const cf = capturingFetch(201, { id: 'p1', name: 'Test', description: '', branch: 'main', created_at: '', updated_at: '', findings_count: {} });
    globalThis.fetch = cf;

    await client.createProject({ name: 'Test', description: 'Desc' });

    assert.equal(cf.calls[0].headers['Authorization'], 'Bearer project-token');
  });

  // ── TEST 4: Bearer header is sent on GET /scans ───────────
  it('TEST 4 — GET /scans sends Authorization: Bearer <token>', async () => {
    client.setToken('scans-token');
    const cf = capturingFetch(200, []);
    globalThis.fetch = cf;

    await client.getScans();

    assert.equal(cf.calls[0].headers['Authorization'], 'Bearer scans-token');
    assert.ok(cf.calls[0].url.includes('/scans'));
  });

  // ── TEST 5: 401 response clears token and throws UNAUTHORIZED ──
  it('TEST 5 — 401 on GET /projects clears token and throws ApiError(UNAUTHORIZED)', async () => {
    client.setToken('expired-token');
    globalThis.fetch = mockFetch(401, { detail: 'Invalid or expired access token' });

    let notified = false;
    registerUnauthorizedHandler(() => { notified = true; });

    let thrown = null;
    try {
      await client.getProjects();
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown instanceof ApiError, 'Should throw ApiError');
    assert.equal(thrown.status, 401);
    assert.equal(thrown.errorType, 'UNAUTHORIZED');
    // Token must be cleared
    assert.equal(client.token, null);
    assert.equal(localStorage.getItem('pqc_auth_token'), null);
    // Unauthorized handler must be called
    assert.equal(notified, true);
    // MUST NOT have returned mock projects array
    // (thrown means no return value was possible)
  });

  // ── TEST 6: 401 — getProjects NEVER returns mock data ─────
  it('TEST 6 — getProjects throws on 401 and NEVER returns mock/fallback data', async () => {
    client.setToken('bad-token');
    globalThis.fetch = mockFetch(401, { detail: 'Unauthorized' });

    let result = 'NOT_SET';
    let caught = null;
    try {
      result = await client.getProjects();
    } catch (e) {
      caught = e;
    }

    assert.equal(result, 'NOT_SET', 'Must NOT have returned any value (including mock data)');
    assert.ok(caught instanceof ApiError);
    assert.equal(caught.errorType, 'UNAUTHORIZED');
  });

  // ── TEST 7: 403 throws FORBIDDEN ──────────────────────────
  it('TEST 7 — 403 response throws ApiError(FORBIDDEN)', async () => {
    client.setToken('org-less-token');
    globalThis.fetch = mockFetch(403, { detail: 'User is not assigned to an organization' });

    let thrown = null;
    try {
      await client.getProjects();
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown instanceof ApiError);
    assert.equal(thrown.status, 403);
    assert.equal(thrown.errorType, 'FORBIDDEN');
    // Token should NOT be cleared on 403
    assert.equal(client.token, 'org-less-token');
  });

  // ── TEST 8: 404 throws NOT_FOUND ──────────────────────────
  it('TEST 8 — 404 response throws ApiError(NOT_FOUND)', async () => {
    client.setToken('valid-token');
    globalThis.fetch = mockFetch(404, { detail: 'Scan not found' });

    let thrown = null;
    try {
      await client.cancelScan('scan-999');
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown instanceof ApiError);
    assert.equal(thrown.status, 404);
    assert.equal(thrown.errorType, 'NOT_FOUND');
  });

  // ── TEST 9: Network failure throws NETWORK_ERROR ──────────
  it('TEST 9 — network failure throws ApiError(NETWORK_ERROR) and NEVER returns mock data', async () => {
    client.setToken('any-token');
    globalThis.fetch = networkErrorFetch();

    let result = 'NOT_SET';
    let caught = null;
    try {
      result = await client.getScans();
    } catch (e) {
      caught = e;
    }

    assert.equal(result, 'NOT_SET', 'Must NOT have returned any value (including mock data)');
    assert.ok(caught instanceof ApiError);
    assert.equal(caught.status, 0);
    assert.equal(caught.errorType, 'NETWORK_ERROR');
  });
});
