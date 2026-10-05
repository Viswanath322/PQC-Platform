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
import {
  mockProjects,
  mockScans,
  mockFindings,
  mockReport,
} from '../data/mockData';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) || 'http://127.0.0.1:8000/api/v1';

/**
 * Typed API Error representing either a network/connection failure or HTTP error status.
 */
export class ApiError extends Error {
  readonly status?: number;
  readonly endpoint: string;
  readonly kind: 'network' | 'http';

  constructor(message: string, endpoint: string, kind: 'network' | 'http', status?: number) {
    super(message);
    this.name = 'ApiError';
    this.endpoint = endpoint;
    this.kind = kind;
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// In-memory cache & fallback store for offline / air-gapped demo
let localProjects: Project[] = [...mockProjects];
let localScans: Scan[] = [...mockScans];
let localFindings: Finding[] = [...mockFindings];

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = typeof window !== 'undefined' ? localStorage.getItem('pqc_auth_token') : null;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('pqc_auth_token', token);
      } else {
        localStorage.removeItem('pqc_auth_token');
      }
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Centralized HTTP request method.
   * Enforces 8s timeout with AbortController and strict ApiError reporting.
   * Never swallows errors.
   */
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

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // 8-second request timeout as required
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, 8000);

    // Merge external signal if provided
    let combinedSignal: AbortSignal = timeoutController.signal;
    if (customSignal) {
      if (customSignal.aborted) {
        clearTimeout(timeoutId);
        throw new ApiError('Request aborted by caller', cleanEndpoint, 'network');
      }
      const combinedController = new AbortController();
      const onTimeout = () => combinedController.abort();
      const onCustom = () => combinedController.abort();
      timeoutController.signal.addEventListener('abort', onTimeout);
      customSignal.addEventListener('abort', onCustom);
      combinedSignal = combinedController.signal;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody === 'object') {
            if (typeof errorBody.detail === 'string') {
              errorMessage = errorBody.detail;
            } else if (Array.isArray(errorBody.detail)) {
              errorMessage = errorBody.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ');
            } else if (errorBody.message) {
              errorMessage = String(errorBody.message);
            }
          }
        } catch {
          // If JSON parse fails, try text
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            // keep default status text
          }
        }

        console.error(`[API HTTP Error] ${options.method || 'GET'} ${cleanEndpoint} [${response.status}]:`, errorMessage);
        throw new ApiError(errorMessage, cleanEndpoint, 'http', response.status);
      }

      // Empty response check
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof ApiError) {
        throw err;
      }

      const isTimeout = timeoutController.signal.aborted;
      const message = isTimeout
        ? 'Request timed out after 8 seconds'
        : err instanceof Error
        ? err.message
        : 'Network connection failed';

      console.error(`[API Network Error] ${options.method || 'GET'} ${cleanEndpoint}:`, message);
      throw new ApiError(message, cleanEndpoint, 'network');
    }
  }

  // 1. Health check - Calls GET /api/v1/health
  async health(signal?: AbortSignal): Promise<HealthResponse> {
    return await this.request<HealthResponse>('/health', { method: 'GET' }, signal);
  }

  // 2. Authentication
  async register(payload: { email: string; password: string; full_name?: string }): Promise<User> {
    return await this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async login(payload: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const res = await this.request<{ access_token: string; user?: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.access_token);
    const user = res.user || (await this.getCurrentUser());
    return { token: res.access_token, user };
  }

  async getCurrentUser(): Promise<User> {
    return await this.request<User>('/auth/me', {
      method: 'GET',
    });
  }

  // 3. Projects
  async getProjects(): Promise<Project[]> {
    return await this.request<Project[]>('/projects', {
      method: 'GET',
    });
  }

  async createProject(payload: {
    name: string;
    description?: string;
    repository_url?: string;
  }): Promise<Project> {
    const project = await this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localProjects = [project, ...localProjects];
    return project;
  }

  async getProject(id: string): Promise<Project> {
    return await this.request<Project>(`/projects/${id}`, {
      method: 'GET',
    });
  }

  // 4. Ingestion / Repository Upload
  async uploadRepository(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ upload_id: string; filename: string; file_name: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append('file', file);

    if (onProgress) onProgress(35);
    const res = await this.request<{ upload_id: string; filename?: string; file_name?: string; size_bytes?: number }>(
      '/uploads',
      {
        method: 'POST',
        body: formData,
      }
    );
    if (onProgress) onProgress(100);
    const fname = res.filename || res.file_name || file.name;
    return {
      upload_id: res.upload_id,
      filename: fname,
      file_name: fname,
      size_bytes: res.size_bytes ?? file.size,
    };
  }

  // 5. Scans (Day 2 requirements)

  /**
   * Fetch a single scan by ID. Matches backend GET /api/v1/scans/{scan_id}
   */
  async getScan(id: string, signal?: AbortSignal): Promise<ScanOut> {
    return await this.request<ScanOut>(`/scans/${id}`, { method: 'GET' }, signal);
  }

  /**
   * List all scans or scans filtered by project. Matches backend GET /api/v1/scans?project_id=...
   */
  async listScans(projectId?: string, signal?: AbortSignal): Promise<ScanOut[]> {
    const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return await this.request<ScanOut[]>(`/scans${qs}`, { method: 'GET' }, signal);
  }

  /**
   * Cancel an active non-terminal scan. Matches backend POST /api/v1/scans/{scan_id}/cancel
   */
  async cancelScan(id: string): Promise<ScanOut> {
    return await this.request<ScanOut>(`/scans/${id}/cancel`, { method: 'POST' });
  }

  /**
   * Create a new scan. Matches backend POST /api/v1/scans and returns typed Scan.
   */
  async createScan(payload: {
    project_id: string;
    upload_id?: string;
    file_name?: string;
    file_size?: string;
  }): Promise<Scan> {
    const raw = await this.request<ScanOut>('/scans', {
      method: 'POST',
      body: JSON.stringify({
        project_id: payload.project_id,
        upload_id: payload.upload_id || 'default',
      }),
    });
    return {
      id: raw.id,
      project_id: raw.project_id,
      project_name: raw.project_name || 'Project ' + raw.project_id.slice(0, 8),
      repository_name: payload.file_name || raw.repository_name || 'repository.zip',
      branch: 'main',
      status: raw.status,
      created_at: raw.created_at,
      completed_at: raw.completed_at || undefined,
      total_findings: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      pqc_readiness_score: 50,
      file_name: payload.file_name,
      file_size: payload.file_size,
    };
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
    return await this.request<ScanReportOut>(`/reports/${scanId}`, { method: 'GET' }, signal);
  }

  // Legacy compatibility helpers with development fallback data
  async getScans(): Promise<Scan[]> {
    try {
      const scanOutList = await this.listScans();
      return scanOutList.map((so) => ({
        id: so.id,
        project_id: so.project_id,
        project_name: so.project_name || 'Project ' + so.project_id.slice(0, 8),
        repository_name: so.repository_name || 'repository.zip',
        branch: 'main',
        status: so.status,
        created_at: so.created_at,
        completed_at: so.completed_at || undefined,
        total_findings: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        pqc_readiness_score: 50,
      }));
    } catch {
      return [...localScans];
    }
  }

  async getFindings(params?: {
    scan_id?: string;
    severity?: string;
    category?: string;
  }): Promise<Finding[]> {
    try {
      const query = new URLSearchParams();
      if (params?.scan_id) query.append('scan_id', params.scan_id);
      if (params?.severity) query.append('severity', params.severity);
      if (params?.category) query.append('category', params.category);
      const qs = query.toString() ? `?${query.toString()}` : '';

      return await this.request<Finding[]>(`/findings${qs}`, {
        method: 'GET',
      });
    } catch {
      let filtered = [...localFindings];
      if (params?.scan_id) {
        filtered = filtered.filter((f) => f.scan_id === params.scan_id);
      }
      if (params?.severity && params.severity !== 'ALL') {
        filtered = filtered.filter((f) => f.severity === params.severity);
      }
      if (params?.category && params.category !== 'ALL') {
        filtered = filtered.filter((f) => f.category === params.category);
      }
      return filtered;
    }
  }

  async getFinding(id: string): Promise<Finding> {
    try {
      return await this.request<Finding>(`/findings/${id}`, {
        method: 'GET',
      });
    } catch {
      const found = localFindings.find((f) => f.id === id);
      if (!found) throw new Error(`Finding ${id} not found`);
      return found;
    }
  }

  async getReport(scanId: string): Promise<Report> {
    try {
      return await this.request<Report>(`/reports/${scanId}`, {
        method: 'GET',
      });
    } catch {
      return {
        ...mockReport,
        scan_id: scanId,
      };
    }
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
