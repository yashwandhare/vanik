import type {
  AgentCreateRequest,
  AgentListResponse,
  AgentPassportResponse,
  ErrorEnvelope,
  ErrorResponse,
  HealthResponse,
  LoginRequest,
  PrincipalCreateRequest,
  PrincipalResponse,
  ReadinessResponse,
  RegisterRequest,
  SessionResponse,
  UserResponse,
} from './types';
import {
  FIXTURE_AGENT_LIST,
  FIXTURE_AGENT_PASSPORT,
  FIXTURE_HEALTH,
  FIXTURE_PRINCIPAL,
  FIXTURE_READINESS,
  FIXTURE_SESSION,
  FIXTURE_USER,
} from './fixtures';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly requestId?: string;
  public readonly status: number;
  public readonly details?: ErrorEnvelope['details'];

  constructor(status: number, envelope: ErrorEnvelope) {
    super(envelope.message || `API error: ${envelope.code}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = envelope.code;
    this.requestId = envelope.request_id;
    this.details = envelope.details;
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  csrfToken?: string;
  useMockFallback?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private csrfToken?: string;
  private useMockFallback: boolean;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    this.csrfToken = config.csrfToken;
    this.useMockFallback = config.useMockFallback ?? false;
  }

  public setCsrfToken(token?: string) {
    this.csrfToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    mockFallback?: () => T
  ): Promise<{ data: T; isMock: boolean }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.csrfToken && options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase())) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        let envelope: ErrorEnvelope;
        try {
          const body = (await response.json()) as ErrorResponse;
          envelope = body.error || {
            code: 'http_error',
            message: `Request failed with status ${response.status}`,
            request_id: response.headers.get('x-request-id') || 'unknown',
          };
        } catch {
          envelope = {
            code: 'invalid_json_error',
            message: response.statusText || `HTTP ${response.status}`,
            request_id: response.headers.get('x-request-id') || 'unknown',
          };
        }
        throw new ApiClientError(response.status, envelope);
      }

      if (response.status === 204) {
        return { data: undefined as unknown as T, isMock: false };
      }

      const data = (await response.json()) as T;
      return { data, isMock: false };
    } catch (err) {
      if (err instanceof ApiClientError) {
        // If it's a 404 or backend business workflow not implemented yet, and mock fallback is enabled:
        if (this.useMockFallback && mockFallback && [404, 501, 502, 503].includes(err.status)) {
          return { data: mockFallback(), isMock: true };
        }
        throw err;
      }

      // Network failure / connection refused
      if (this.useMockFallback && mockFallback) {
        return { data: mockFallback(), isMock: true };
      }

      throw err;
    }
  }

  // Health & Readiness (Implemented in backend)
  public async getHealth(): Promise<{ data: HealthResponse; isMock: boolean }> {
    return this.request<HealthResponse>('/health', { method: 'GET' }, () => FIXTURE_HEALTH);
  }

  public async getReadiness(): Promise<{ data: ReadinessResponse; isMock: boolean }> {
    return this.request<ReadinessResponse>('/health/ready', { method: 'GET' }, () => FIXTURE_READINESS);
  }

  // Phase 1 Identity Routes (Contracts published, backend endpoints pending)
  public async register(payload: RegisterRequest): Promise<{ data: UserResponse; isMock: boolean }> {
    return this.request<UserResponse>(
      '/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => ({
        ...FIXTURE_USER,
        email: payload.email,
        phone: payload.phone || null,
      })
    );
  }

  public async login(payload: LoginRequest): Promise<{ data: SessionResponse; isMock: boolean }> {
    const res = await this.request<SessionResponse>(
      '/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => FIXTURE_SESSION
    );
    if (res.data?.csrf_token) {
      this.setCsrfToken(res.data.csrf_token);
    }
    return res;
  }

  public async getSession(): Promise<{ data: SessionResponse; isMock: boolean }> {
    return this.request<SessionResponse>('/v1/auth/session', { method: 'GET' }, () => FIXTURE_SESSION);
  }

  public async logout(): Promise<{ data: void; isMock: boolean }> {
    const res = await this.request<void>('/v1/auth/logout', { method: 'POST' }, () => undefined);
    this.setCsrfToken(undefined);
    return res;
  }

  // Principals
  public async createPrincipal(payload: PrincipalCreateRequest): Promise<{ data: PrincipalResponse; isMock: boolean }> {
    return this.request<PrincipalResponse>(
      '/v1/principals',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => ({
        ...FIXTURE_PRINCIPAL,
        legal_name: payload.legal_name,
        trade_name: payload.trade_name || null,
        business_type: payload.business_type,
        roles: payload.roles,
      })
    );
  }

  public async getPrincipal(principalId: string): Promise<{ data: PrincipalResponse; isMock: boolean }> {
    return this.request<PrincipalResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}`,
      { method: 'GET' },
      () => FIXTURE_PRINCIPAL
    );
  }

  // Agents & Passports
  public async createAgent(
    principalId: string,
    payload: AgentCreateRequest
  ): Promise<{ data: AgentPassportResponse; isMock: boolean }> {
    return this.request<AgentPassportResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}/agents`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => ({
        ...FIXTURE_AGENT_PASSPORT,
        principal_id: principalId,
        name: payload.name,
        role: payload.role,
        description: payload.description || '',
      })
    );
  }

  public async listAgents(principalId: string): Promise<{ data: AgentListResponse; isMock: boolean }> {
    return this.request<AgentListResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}/agents`,
      { method: 'GET' },
      () => FIXTURE_AGENT_LIST
    );
  }

  public async getAgentPassport(agentId: string): Promise<{ data: AgentPassportResponse; isMock: boolean }> {
    return this.request<AgentPassportResponse>(
      `/v1/agents/${encodeURIComponent(agentId)}/passport`,
      { method: 'GET' },
      () => FIXTURE_AGENT_PASSPORT
    );
  }
}

// Default singleton instance with mock fallback enabled for development
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  useMockFallback: true,
});
