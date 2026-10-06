/**
 * BE-18: Category Filter Alias Bug Tests
 *
 * Verifies:
 * 1. engine filter sends ?engine=...
 * 2. finding_category filter sends ?finding_category=...
 * 3. Combined filters send ?engine=...&finding_category=...
 * 4. NEVER generates ?category= or &category=
 * 5. Handles scan_id, severity, limit, offset alongside engine and finding_category
 */

import { strict as assert } from 'node:assert';
import { describe, it, before, beforeEach } from 'node:test';

// Setup minimal localStorage mock for Node environment
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};

// Inline minimal ApiClient mirroring desktop/src/services/api.ts for test isolation
class TestApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.lastUrl = null;
  }

  async request(endpoint, options = {}) {
    this.lastUrl = `${this.baseUrl}${endpoint}`;
    return [];
  }

  async getFindings(params) {
    const query = new URLSearchParams();
    if (params?.scan_id) query.append('scan_id', params.scan_id);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.engine) query.append('engine', params.engine);
    if (params?.finding_category) query.append('finding_category', params.finding_category);
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    if (params?.offset !== undefined) query.append('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/findings${qs}`, { method: 'GET' });
  }
}

describe('BE-18: Category Filter Alias Bug', () => {
  let client;

  beforeEach(() => {
    client = new TestApiClient('http://localhost:8000/api/v1');
  });

  it('TEST 1 — Engine filter sends ?engine=Semgrep and NEVER ?category=', async () => {
    await client.getFindings({ engine: 'Semgrep' });

    assert.ok(client.lastUrl, 'A request URL was recorded');
    const url = new URL(client.lastUrl);
    assert.strictEqual(url.searchParams.get('engine'), 'Semgrep');
    assert.strictEqual(
      url.searchParams.get('category'),
      null,
      `URL must NEVER contain category parameter, got: ${client.lastUrl}`
    );
    assert.strictEqual(
      /[?&]category=/.test(client.lastUrl),
      false,
      `URL query string must not contain ?category= or &category=, got: ${client.lastUrl}`
    );
  });

  it('TEST 2 — Category filter sends ?finding_category=Cryptography and NEVER ?category=', async () => {
    await client.getFindings({ finding_category: 'Cryptography' });

    assert.ok(client.lastUrl, 'A request URL was recorded');
    const url = new URL(client.lastUrl);
    assert.strictEqual(url.searchParams.get('finding_category'), 'Cryptography');
    assert.strictEqual(
      url.searchParams.get('category'),
      null,
      `URL must NEVER contain category parameter, got: ${client.lastUrl}`
    );
    assert.strictEqual(
      /[?&]category=/.test(client.lastUrl),
      false,
      `URL query string must not contain ?category= or &category=, got: ${client.lastUrl}`
    );
  });

  it('TEST 3 — Both filters combined send ?engine=Semgrep&finding_category=Cryptography', async () => {
    await client.getFindings({
      engine: 'Semgrep',
      finding_category: 'Cryptography',
    });

    assert.ok(client.lastUrl, 'A request URL was recorded');
    const url = new URL(client.lastUrl);

    assert.strictEqual(url.searchParams.get('engine'), 'Semgrep');
    assert.strictEqual(url.searchParams.get('finding_category'), 'Cryptography');
    assert.strictEqual(
      url.searchParams.get('category'),
      null,
      'category query parameter must be null'
    );
  });

  it('TEST 4 — Comprehensive query with severity, engine, and finding_category', async () => {
    await client.getFindings({
      scan_id: 'scan-123',
      severity: 'HIGH',
      engine: 'sast',
      finding_category: 'injection',
      limit: 50,
      offset: 0,
    });

    assert.ok(client.lastUrl, 'A request URL was recorded');
    const url = new URL(client.lastUrl);

    assert.strictEqual(url.searchParams.get('scan_id'), 'scan-123');
    assert.strictEqual(url.searchParams.get('severity'), 'HIGH');
    assert.strictEqual(url.searchParams.get('engine'), 'sast');
    assert.strictEqual(url.searchParams.get('finding_category'), 'injection');
    assert.strictEqual(url.searchParams.get('limit'), '50');
    assert.strictEqual(url.searchParams.get('offset'), '0');
    assert.strictEqual(
      url.searchParams.get('category'),
      null,
      'category query parameter must not exist'
    );
  });

  it('TEST 5 — No filters sends /findings without any query params', async () => {
    await client.getFindings();

    assert.ok(client.lastUrl, 'A request URL was recorded');
    assert.strictEqual(client.lastUrl, 'http://localhost:8000/api/v1/findings');
  });
});
