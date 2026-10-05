import type {
  HealthResponse,
  User,
  Project,
  Scan,
  Finding,
  Report,
  ScanOut,
  ScanReportOut,
  FindingOut,
} from '../types';

type ApiProject = { id: string; name: string; description: string | null; created_at: string };
type ApiScan = {
  id: string;
  project_id: string;
  status: Scan['status'];
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  upload_id?: string | null;
  error_message?: string | null;
  project_name?: string;
  repository_name?: string;
  files_analyzed?: number | null;
};

function normalizeProject(value: ApiProject): Project {
  return {
    ...value,
    description: value.description ?? '',
    repository_url: '',
    branch: '',
    updated_at: value.created_at,
    findings_count: { critical: 0, high: 0, medium: 0, low: 0 },
  };
}

function normalizeScan(value: ApiScan): Scan {
  return {
    ...value,
    project_name: value.project_name || '',
    repository_name: value.repository_name || value.upload_id || 'repository.zip',
    branch: 'main',
    total_findings: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    pqc_readiness_score: 50,
    started_at: value.started_at ?? undefined,
    completed_at: value.completed_at ?? undefined,
  };
}

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) || 'http://127.0.0.1:8000/api/v1';

// ──────────────────────────────────────────────
// ApiError — typed error with HTTP status code
// ──────────────────────────────────────────────
export type ApiErrorType =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

type ApiFinding = {
  finding_id: string;
  scan_id: string;
  engine: string;
  category: string | null;
  severity: string;
  title: string;
  file_path: string;
  line_number: number | null;
  evidence: string | null;
  explanation: string | null;
  confidence: number | null;
  recommendation: string | null;
  is_development: boolean;
};

function normalizeFinding(value: ApiFinding): Finding {
  return {
    id: value.finding_id,
    scan_id: value.scan_id,
    engine: value.engine.toLowerCase(),
    category: (value.engine.toUpperCase() as any) || 'CRYPTO',
    finding_category: value.category ?? '',
    severity: value.severity.toUpperCase() as Finding['severity'],
    title: value.title,
    file: value.file_path,
    line: value.line_number ?? 0,
    evidence: value.evidence ?? '',
    explanation: value.explanation ?? '',
    confidence: (value.confidence as any) ?? 'HIGH',
    recommendation: value.recommendation ?? '',
    status: 'OPEN',
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly errorType: ApiErrorType;
  readonly userMessage: string;
  readonly endpoint?: string;
  readonly kind?: 'network' | 'http';

  constructor(status: number, serverDetail?: string, endpoint?: string) {
    let errorType: ApiErrorType;
    let userMessage: string;

    if (status === 0) {
      errorType = 'NETWORK_ERROR';
      userMessage = serverDetail || 'Backend unavailable. Check that the server is running and try again.';
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
      userMessage = serverDetail || `The request was rejected (HTTP ${status}).`;
    }

    super(userMessage);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
    this.userMessage = userMessage;
    this.endpoint = endpoint;
    this.kind = status === 0 ? 'network' : 'http';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ──────────────────────────────────────────────
// 401 listener registry — notify AuthContext on session expiry
// ──────────────────────────────────────────────
type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

export function registerUnauthorizedHandler(fn: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(fn);
  return () => {
    unauthorizedHandlers.delete(fn);
  };
}

function notifyUnauthorized() {
  unauthorizedHandlers.forEach((fn) => fn());
}

// ──────────────────────────────────────────────
// Token Storage Helpers (supports browser & Node test env)
// ──────────────────────────────────────────────
const getStoredToken = (): string | null => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('pqc_auth_token');
    }
  } catch {
    // ignore
  }
  return null;
};

const setStoredToken = (token: string | null): void => {
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) {
        localStorage.setItem('pqc_auth_token', token);
      } else {
        localStorage.removeItem('pqc_auth_token');
      }
    }
  } catch {
    // ignore
  }
};

// ──────────────────────────────────────────────
// ApiClient
// ──────────────────────────────────────────────
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = getStoredToken();
  }

  setToken(token: string | null) {
    this.token = token;
    setStoredToken(token);
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.setToken(null);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ──────────────────────────────────────────
  // Core request — adds Authorization header, handles all error codes
  // ──────────────────────────────────────────
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customSignal?: AbortSignal
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Only set Content-Type for non-FormData bodies
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Attach Bearer token if present
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let signalToUse: AbortSignal = controller.signal;
    if (customSignal) {
      if (customSignal.aborted) {
        clearTimeout(timeoutId);
        throw new ApiError(0, 'Request aborted by caller', cleanEndpoint);
      }
      const combined = new AbortController();
      controller.signal.addEventListener('abort', () => combined.abort());
      customSignal.addEventListener('abort', () => combined.abort());
      signalToUse = combined.signal;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: signalToUse,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let detail: string | undefined;
        try {
          const body = await response.json();
          detail =
            typeof body?.detail === 'string'
              ? body.detail
              : Array.isArray(body?.detail)
              ? body.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ')
              : body?.message
              ? String(body.message)
              : undefined;
        } catch {
          // ignore parse errors
        }

        const err = new ApiError(response.status, detail, cleanEndpoint);

        // On 401: clear stored token, notify all registered handlers
        if (response.status === 401) {
          this.clearToken();
          notifyUnauthorized();
        }

        throw err;
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) throw err;

      if (customSignal?.aborted) {
        throw new ApiError(0, 'Request aborted by caller', cleanEndpoint);
      }

      // Network/timeout errors → status 0
      throw new ApiError(0, undefined, cleanEndpoint);
    }
  }

  // ──────────────────────────────────────────
  // 1. Health check
  // ──────────────────────────────────────────
  async health(signal?: AbortSignal): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', { method: 'GET' }, signal);
  }

  // ──────────────────────────────────────────
  // 2. Authentication — NO mock fallback
  // ──────────────────────────────────────────

  /**
   * POST /auth/register
   */
  async register(payload: {
    email: string;
    password: string;
    full_name?: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * POST /auth/login
   * Backend returns: { access_token: string }
   * Store token, then fetch current user.
   */
  async login(payload: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: User }> {
    const res = await this.request<{ access_token: string; user?: User }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    this.setToken(res.access_token);
    const user = res.user ?? (await this.getCurrentUser());
    return { token: res.access_token, user };
  }

  /**
   * GET /auth/me
   * Requires Bearer token.
   */
  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me', { method: 'GET' });
  }

  // ──────────────────────────────────────────
  // 3. Projects — NO mock fallback
  // ──────────────────────────────────────────

  async getProjects(): Promise<Project[]> {
    const raw = await this.request<ApiProject[]>('/projects', { method: 'GET' });
    return raw.map(normalizeProject);
  }

  async createProject(payload: {
    name: string;
    description?: string;
    repository_url?: string;
  }): Promise<Project> {
    const raw = await this.request<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: payload.name, description: payload.description }),
    });
    return normalizeProject(raw);
  }

  async getProject(id: string): Promise<Project> {
    const raw = await this.request<ApiProject>(`/projects/${id}`, { method: 'GET' });
    return normalizeProject(raw);
  }

  // ──────────────────────────────────────────
  // 4. Uploads — NO mock fallback
  // ──────────────────────────────────────────

  async uploadRepository(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ upload_id: string; filename: string; file_name: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append('file', file);

    if (onProgress) onProgress(35);
    const res = await this.request<{
      upload_id: string;
      filename?: string;
      file_name?: string;
      size_bytes?: number;
    }>('/uploads', {
      method: 'POST',
      body: formData,
    });
    if (onProgress) onProgress(100);
    const fname = res.filename || res.file_name || file.name;
    return {
      upload_id: res.upload_id,
      filename: fname,
      file_name: fname,
      size_bytes: res.size_bytes ?? file.size,
    };
  }

  // ──────────────────────────────────────────
  // 5. Scans — Day 2 & Contract Compliant
  // ──────────────────────────────────────────

  /**
   * Fetch a single scan by ID. Matches backend GET /api/v1/scans/{scan_id}
   */
  async getScan(id: string, signal?: AbortSignal): Promise<ScanOut> {
    return this.request<ScanOut>(`/scans/${id}`, { method: 'GET' }, signal);
  }

  /**
   * List all scans or scans filtered by project. Matches backend GET /api/v1/scans?project_id=...
   */
  async listScans(projectId?: string, signal?: AbortSignal): Promise<ScanOut[]> {
    const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return this.request<ScanOut[]>(`/scans${qs}`, { method: 'GET' }, signal);
  }

  /**
   * Get all scans normalized to the frontend Scan model.
   */
  async getScans(): Promise<Scan[]> {
    const raw = await this.request<ApiScan[]>('/scans', { method: 'GET' });
    return raw.map(normalizeScan);
  }

  /**
   * Cancel an active non-terminal scan. Matches backend POST /api/v1/scans/{scan_id}/cancel
   */
  async cancelScan(id: string): Promise<Scan> {
    const raw = await this.request<ApiScan>(`/scans/${id}/cancel`, { method: 'POST' });
    return normalizeScan(raw);
  }

  /**
   * Create a new scan. Matches backend POST /api/v1/scans and returns typed Scan.
   */
  async createScan(payload: {
    project_id: string;
    upload_id?: string;
    filename?: string;
    file_name?: string;
    file_size?: string;
  }): Promise<Scan> {
    const raw = await this.request<ApiScan>('/scans', {
      method: 'POST',
      body: JSON.stringify({
        project_id: payload.project_id,
        upload_id: payload.upload_id || 'default',
      }),
    });
    const normalized = normalizeScan(raw);
    if (payload.filename || payload.file_name) {
      normalized.repository_name = payload.filename || payload.file_name || normalized.repository_name;
    }
    if (payload.file_name) {
      normalized.file_name = payload.file_name;
    }
    if (payload.file_size) {
      normalized.file_size = payload.file_size;
    }
    return normalized;
  }

  /**
   * Fetch findings for a specific scan.
   * Queries GET /api/v1/findings?scan_id=... and filters by scan_id on client
   * if backend does not yet filter server-side.
   */
  async getScanFindings(scanId: string, signal?: AbortSignal): Promise<FindingOut[]> {
    try {
      const findings = await this.request<FindingOut[]>(
        `/findings?scan_id=${encodeURIComponent(scanId)}`,
        { method: 'GET' },
        signal
      );
      if (Array.isArray(findings)) {
        return findings.filter((f) => !f.scan_id || f.scan_id === scanId);
      }
      return [];
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Fetch Day 1 report summary for a scan. Matches backend GET /api/v1/reports/{scan_id}
   */
  async getScanReport(scanId: string, signal?: AbortSignal): Promise<ScanReportOut> {
    return this.request<ScanReportOut>(`/reports/${scanId}`, { method: 'GET' }, signal);
  }

  // ──────────────────────────────────────────
  // 6. Findings — NO mock fallback
  // ──────────────────────────────────────────

  async getFindings(params?: {
    scan_id?: string;
    severity?: string;
    engine?: string;
    finding_category?: string;
  }): Promise<Finding[]> {
    const query = new URLSearchParams();
    if (params?.scan_id) query.append('scan_id', params.scan_id);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.engine) query.append('engine', params.engine);
    if (params?.finding_category) query.append('finding_category', params.finding_category);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const findings = await this.request<ApiFinding[]>(`/findings${qs}`, { method: 'GET' });
    return findings.map(normalizeFinding);
  }

  async getFinding(id: string): Promise<Finding> {
    const finding = await this.request<ApiFinding>(`/findings/${id}`, { method: 'GET' });
    return normalizeFinding(finding);
  }

  // ──────────────────────────────────────────
  // 7. Reports — NO mock fallback
  // ──────────────────────────────────────────

  async getReport(scanId: string): Promise<Report> {
    return this.request<Report>(`/reports/${scanId}`, { method: 'GET' });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
