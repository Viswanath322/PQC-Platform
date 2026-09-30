import type {
  HealthResponse,
  User,
  Project,
  Scan,
  Finding,
  Report,
} from '../types';
import {
  mockProjects,
  mockScans,
  mockFindings,
  mockReport,
} from '../data/mockData';

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) || 'http://127.0.0.1:8000/api/v1';

// In-memory cache & fallback store for offline / air-gapped demo
let localProjects: Project[] = [...mockProjects];
let localScans: Scan[] = [...mockScans];
let localFindings: Finding[] = [...mockFindings];

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

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API Error ${response.status}: ${errorBody || response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // 1. Health check - Calls GET /api/v1/health
  // Expected response: { "status": "healthy" }
  async health(): Promise<HealthResponse> {
    const response = await this.request<HealthResponse>('/health', {
      method: 'GET',
    });
    return response;
  }

  // 2. Authentication
  async register(payload: { email: string; password: string; full_name?: string }): Promise<User> {
    try {
      return await this.request<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      // Mock fallback
      const mockUser: User = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email: payload.email,
        full_name: payload.full_name || payload.email.split('@')[0],
        role: 'security_auditor',
        created_at: new Date().toISOString(),
      };
      return mockUser;
    }
  }

  async login(payload: { email: string; password: string }): Promise<{ token: string; user: User }> {
    try {
      const res = await this.request<{ access_token: string; user?: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      this.setToken(res.access_token);
      const user = res.user || (await this.getCurrentUser());
      return { token: res.access_token, user };
    } catch {
      // Mock fallback token
      const mockToken = 'mock_jwt_' + Math.random().toString(36).substring(2);
      this.setToken(mockToken);
      const mockUser: User = {
        id: 'usr-admin-01',
        email: payload.email,
        full_name: 'Security Officer',
        role: 'admin',
        created_at: '2026-01-01 00:00:00 UTC',
      };
      return { token: mockToken, user: mockUser };
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      return await this.request<User>('/auth/me', {
        method: 'GET',
      });
    } catch {
      return {
        id: 'usr-admin-01',
        email: 'analyst@pqc-sentinel.local',
        full_name: 'Lead PQC Cryptographer',
        role: 'admin',
        created_at: '2026-01-01 00:00:00 UTC',
      };
    }
  }

  // 3. Projects
  async getProjects(): Promise<Project[]> {
    try {
      return await this.request<Project[]>('/projects', {
        method: 'GET',
      });
    } catch {
      return [...localProjects];
    }
  }

  async createProject(payload: {
    name: string;
    description: string;
    repository_url?: string;
  }): Promise<Project> {
    try {
      const project = await this.request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      localProjects = [project, ...localProjects];
      return project;
    } catch {
      // Offline fallback: create local project
      const newProj: Project = {
        id: `proj-${String(localProjects.length + 1).padStart(3, '0')}`,
        name: payload.name,
        description: payload.description,
        repository_url: payload.repository_url || 'https://github.com/internal/' + payload.name.toLowerCase(),
        branch: 'main',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        findings_count: { critical: 0, high: 0, medium: 0, low: 0 },
      };
      localProjects = [newProj, ...localProjects];
      return newProj;
    }
  }

  async getProject(id: string): Promise<Project> {
    try {
      return await this.request<Project>(`/projects/${id}`, {
        method: 'GET',
      });
    } catch {
      const found = localProjects.find((p) => p.id === id);
      if (!found) throw new Error(`Project ${id} not found`);
      return found;
    }
  }

  // 4. Ingestion / Repository Upload
  async uploadRepository(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ upload_id: string; file_name: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      if (onProgress) onProgress(35);
      const res = await this.request<{ upload_id: string; file_name: string; size_bytes: number }>(
        '/uploads',
        {
          method: 'POST',
          body: formData,
        }
      );
      if (onProgress) onProgress(100);
      return res;
    } catch {
      // Offline fallback simulation
      if (onProgress) {
        onProgress(30);
        await new Promise((resolve) => setTimeout(resolve, 300));
        onProgress(75);
        await new Promise((resolve) => setTimeout(resolve, 300));
        onProgress(100);
      }
      return {
        upload_id: 'upload-' + Math.random().toString(36).substring(2, 9),
        file_name: file.name,
        size_bytes: file.size,
      };
    }
  }

  // 5. Scans
  async createScan(payload: {
    project_id: string;
    file_name?: string;
    file_size?: string;
  }): Promise<Scan> {
    try {
      const scan = await this.request<Scan>('/scans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      localScans = [scan, ...localScans];
      return scan;
    } catch {
      const targetProj = localProjects.find((p) => p.id === payload.project_id) || localProjects[0];
      const scanNum = localScans.length + 1;
      const newScan: Scan = {
        id: `SCAN-${String(scanNum).padStart(3, '0')}`,
        project_id: targetProj.id,
        project_name: targetProj.name,
        repository_name: payload.file_name || `${targetProj.name.toLowerCase()}.zip`,
        branch: targetProj.branch,
        status: 'QUEUED',
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        file_name: payload.file_name || 'repository.zip',
        file_size: payload.file_size || '12.4 MB',
        total_findings: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        pqc_readiness_score: 50,
        progress_percent: 0,
      };

      // Update project scan status
      targetProj.last_scan_id = newScan.id;
      targetProj.last_scan_status = 'QUEUED';
      targetProj.last_scan_at = newScan.created_at;

      localScans = [newScan, ...localScans];
      return newScan;
    }
  }

  async getScans(): Promise<Scan[]> {
    try {
      return await this.request<Scan[]>('/scans', {
        method: 'GET',
      });
    } catch {
      return [...localScans];
    }
  }

  async getScan(id: string): Promise<Scan> {
    try {
      return await this.request<Scan>(`/scans/${id}`, {
        method: 'GET',
      });
    } catch {
      const found = localScans.find((s) => s.id === id);
      if (!found) throw new Error(`Scan ${id} not found`);
      return found;
    }
  }

  async cancelScan(id: string): Promise<{ success: boolean; scan_id: string; status: string }> {
    try {
      return await this.request<{ success: boolean; scan_id: string; status: string }>(
        `/scans/${id}/cancel`,
        {
          method: 'POST',
        }
      );
    } catch {
      const scan = localScans.find((s) => s.id === id);
      if (scan && (scan.status === 'QUEUED' || scan.status === 'INGESTING' || scan.status === 'ANALYZING' || scan.status === 'PROCESSING')) {
        scan.status = 'CANCELLED';
      }
      return { success: true, scan_id: id, status: 'CANCELLED' };
    }
  }

  // 6. Findings
  async getLiveFindings(params?: {
    severity?: string;
    category?: string;
  }): Promise<Finding[]> {
    const query = new URLSearchParams();
    if (params?.severity && params.severity !== 'all') query.append('severity', params.severity);
    if (params?.category && params.category !== 'all') query.append('category', params.category);
    const qs = query.toString() ? `?${query.toString()}` : '';

    return this.request<Finding[]>(`/findings${qs}`, {
      method: 'GET',
    });
  }

  async getFindings(params?: {
    severity?: string;
    category?: string;
  }): Promise<Finding[]> {
    try {
      return await this.getLiveFindings(params);
    } catch {
      let filtered = [...localFindings];
      if (params?.severity && params.severity !== 'all') {
        filtered = filtered.filter((finding) => finding.severity === params.severity);
      }
      if (params?.category && params.category !== 'all') {
        filtered = filtered.filter((finding) => finding.engine === params.category);
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
      const found = localFindings.find((f) => f.finding_id === id);
      if (!found) throw new Error(`Finding ${id} not found`);
      return found;
    }
  }

  // 7. Reports
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
