import type {
  HealthResponse,
  User,
  Project,
  Scan,
  Finding,
  Report,
} from '../types';

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
      userMessage = serverDetail || `Unexpected error (HTTP ${status}).`;
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
    this.token = localStorage.getItem('pqc_auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('pqc_auth_token', token);
    } else {
      localStorage.removeItem('pqc_auth_token');
    }
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
          if (typeof body?.detail === 'string') {
            detail = body.detail;
          } else if (Array.isArray(body?.detail) && body.detail.length > 0) {
            detail = body.detail
              .map((d: { msg?: string; loc?: string[] }) => {
                const field = d.loc && d.loc.length > 1 ? `${d.loc[d.loc.length - 1]}: ` : '';
                return `${field}${d.msg || 'Invalid value'}`;
              })
              .join(', ');
          }
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
  }): Promise<User> {
    return this.request<User>('/auth/register', {
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
    return this.request<Project[]>('/projects', { method: 'GET' });
  }

  async createProject(payload: {
    name: string;
    description: string;
    repository_url?: string;
  }): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, { method: 'GET' });
  }

  // ──────────────────────────────────────────
  // 4. Uploads — NO mock fallback
  // ──────────────────────────────────────────

  async uploadRepository(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ upload_id: string; file_name: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append('file', file);

    if (onProgress) onProgress(10);
    const res = await this.request<{
      upload_id: string;
      file_name: string;
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
    file_name?: string;
    file_size?: string;
  }): Promise<Scan> {
    return this.request<Scan>('/scans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getScans(): Promise<Scan[]> {
    return this.request<Scan[]>('/scans', { method: 'GET' });
  }

  async getScan(id: string): Promise<Scan> {
    return this.request<Scan>(`/scans/${id}`, { method: 'GET' });
  }

  async cancelScan(id: string): Promise<Scan> {
    return this.request<Scan>(`/scans/${id}/cancel`, { method: 'POST' });
  }

  // ──────────────────────────────────────────
  // 6. Findings — NO mock fallback
  // ──────────────────────────────────────────

  async getFindings(params?: {
    scan_id?: string;
    severity?: string;
    engine?: string;
    finding_category?: string;
    limit?: number;
    offset?: number;
  }): Promise<Finding[]> {
    const query = new URLSearchParams();
    if (params?.scan_id) query.append('scan_id', params.scan_id);
    if (params?.severity) query.append('severity', params.severity);
    // BE-18 fix: The API treats engine and finding_category as distinct filters.
    // NEVER send category= as an alias.
    if (params?.engine) query.append('engine', params.engine);
    if (params?.finding_category) query.append('finding_category', params.finding_category);
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    if (params?.offset !== undefined) query.append('offset', String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Finding[]>(`/findings${qs}`, { method: 'GET' });
  }

  async getFinding(id: string): Promise<Finding> {
    return this.request<Finding>(`/findings/${id}`, { method: 'GET' });
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
