import type {
  HealthResponse,
  User,
  Project,
  Scan,
  Finding,
  Report,
} from '../types';

type ApiProject = { id: string; name: string; description: string | null; created_at: string };
type ApiScan = { id: string; project_id: string; status: Scan['status']; created_at: string; started_at?: string | null; completed_at?: string | null; upload_id?: string | null; error_message?: string | null };

function normalizeProject(value: ApiProject): Project {
  return { ...value, description: value.description ?? '', repository_url: '', branch: '', updated_at: value.created_at, findings_count: { critical: 0, high: 0, medium: 0, low: 0 } };
}

function normalizeScan(value: ApiScan): Scan {
  return { ...value, project_name: '', repository_name: value.upload_id ?? '', branch: '', total_findings: 0, critical_count: 0, high_count: 0, medium_count: 0, low_count: 0, pqc_readiness_score: 0, started_at: value.started_at ?? undefined, completed_at: value.completed_at ?? undefined };
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
    category: value.engine.toUpperCase(),
    finding_category: value.category ?? '',
    severity: value.severity.toUpperCase() as Finding['severity'],
    title: value.title,
    file: value.file_path,
    line: value.line_number ?? 0,
    evidence: value.evidence ?? '',
    explanation: value.explanation ?? '',
    confidence: value.confidence ?? 0,
    recommendation: value.recommendation ?? '',
    is_development: value.is_development,
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly errorType: ApiErrorType;
  readonly userMessage: string;

  constructor(status: number, serverDetail?: string) {
    let errorType: ApiErrorType;
    let userMessage: string;

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
      userMessage = serverDetail || `The request was rejected (HTTP ${status}).`;
    }

    super(userMessage);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
    this.userMessage = userMessage;
  }
}

// ──────────────────────────────────────────────
// 401 listener registry — notify AuthContext on session expiry
// ──────────────────────────────────────────────
type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

export function registerUnauthorizedHandler(fn: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(fn);
  return () => unauthorizedHandlers.delete(fn);
}

function notifyUnauthorized() {
  unauthorizedHandlers.forEach((fn) => fn());
}

// ──────────────────────────────────────────────
// ApiClient
// ──────────────────────────────────────────────
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = null;
  }

  setToken(token: string | null) {
    this.token = token;
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
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
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

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let detail: string | undefined;
        try {
          const body = await response.json();
          detail = typeof body?.detail === 'string' ? body.detail : undefined;
        } catch {
          // ignore parse errors
        }

        const err = new ApiError(response.status, detail);

        // On 401: clear stored token, notify all registered handlers
        if (response.status === 401) {
          this.clearToken();
          notifyUnauthorized();
        }

        throw err;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // Re-throw ApiError as-is
      if (err instanceof ApiError) throw err;

      // Network/timeout errors → status 0
      throw new ApiError(0);
    }
  }

  // ──────────────────────────────────────────
  // 1. Health check
  // ──────────────────────────────────────────
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', { method: 'GET' });
  }

  // ──────────────────────────────────────────
  // 2. Authentication — NO mock fallback
  // ──────────────────────────────────────────

  /**
   * POST /auth/register
   * Backend returns: { access_token: string } as UserResponse
   * Note: the register endpoint (backend/foundation) returns UserResponse, not a token.
   * We store no token from register — user must login after registration.
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
    return (await this.request<ApiProject[]>('/projects', { method: 'GET' })).map(normalizeProject);
  }

  async createProject(payload: {
    name: string;
    description: string;
    repository_url?: string;
  }): Promise<Project> {
    return normalizeProject(await this.request<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: payload.name, description: payload.description }),
    }));
  }

  async getProject(id: string): Promise<Project> {
    return normalizeProject(await this.request<ApiProject>(`/projects/${id}`, { method: 'GET' }));
  }

  // ──────────────────────────────────────────
  // 4. Uploads — NO mock fallback
  // ──────────────────────────────────────────

  async uploadRepository(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ upload_id: string; filename: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append('file', file);

    if (onProgress) onProgress(10);
    const res = await this.request<{
      upload_id: string;
      filename: string;
      size_bytes: number;
    }>('/uploads', {
      method: 'POST',
      body: formData,
    });
    if (onProgress) onProgress(100);
    return res;
  }

  // ──────────────────────────────────────────
  // 5. Scans — NO mock fallback
  // ──────────────────────────────────────────

  async createScan(payload: {
    project_id: string;
    upload_id: string;
    filename?: string;
    file_size?: string;
  }): Promise<Scan> {
    return normalizeScan(await this.request<ApiScan>('/scans', {
      method: 'POST',
      body: JSON.stringify({ project_id: payload.project_id, upload_id: payload.upload_id }),
    }));
  }

  async getScans(): Promise<Scan[]> {
    return (await this.request<ApiScan[]>('/scans', { method: 'GET' })).map(normalizeScan);
  }

  async getScan(id: string): Promise<Scan> {
    return normalizeScan(await this.request<ApiScan>(`/scans/${id}`, { method: 'GET' }));
  }

  async cancelScan(id: string): Promise<Scan> {
    return normalizeScan(await this.request<ApiScan>(`/scans/${id}/cancel`, { method: 'POST' }));
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
