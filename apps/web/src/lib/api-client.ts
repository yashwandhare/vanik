import type {
  AgentCreateRequest,
  AgentListResponse,
  AgentPassportResponse,
  BusinessIdentifierCreateRequest,
  BusinessIdentifierResponse,
  DemoVerificationResponse,
  ErrorEnvelope,
  ErrorResponse,
  HealthResponse,
  LoginRequest,
  PrincipalCreateRequest,
  PrincipalResponse,
  ReadinessResponse,
  RegisterRequest,
  SessionResponse,
  TelegramLinkStartResponse,
  UserResponse,
} from './types';
import {
  FIXTURE_AGENT_LIST,
  FIXTURE_AGENT_PASSPORT,
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
    this.baseUrl =
      config.baseUrl ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:8000';
    this.csrfToken = config.csrfToken;
    this.useMockFallback = config.useMockFallback ?? false;
  }

  public setCsrfToken(token?: string) {
    this.csrfToken = token;
  }

  public getCsrfToken(): string | undefined {
    return this.csrfToken;
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

    // Server-side runtimes (Next SSR / Vitest) do not supply browser Origin automatically
    if (typeof window === 'undefined' && !headers['Origin']) {
      headers['Origin'] =
        process.env.NEXT_PUBLIC_APP_ORIGIN ||
        process.env.NEXT_PUBLIC_APP_URL ||
        'http://localhost:3000';
    }

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
        // Only explicitly unimplemented demo routes with mockFallback enabled may use fixtures
        if (this.useMockFallback && mockFallback && [404, 501, 502, 503].includes(err.status)) {
          return { data: mockFallback(), isMock: true };
        }
        throw err;
      }

      // Network failure / connection refused: only fall back if an explicit mock generator is provided
      if (this.useMockFallback && mockFallback) {
        return { data: mockFallback(), isMock: true };
      }

      throw err;
    }
  }

  // Health & Readiness (Implemented in backend - real requests only)
  public async getHealth(): Promise<{ data: HealthResponse; isMock: boolean }> {
    return this.request<HealthResponse>('/health', { method: 'GET' });
  }

  public async getReadiness(): Promise<{ data: ReadinessResponse; isMock: boolean }> {
    return this.request<ReadinessResponse>('/health/ready', { method: 'GET' });
  }

  // Phase 1 Identity Routes (Implemented in backend - real requests only)
  public async register(payload: RegisterRequest): Promise<{ data: UserResponse; isMock: boolean }> {
    return this.request<UserResponse>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async login(payload: LoginRequest): Promise<{ data: SessionResponse; isMock: boolean }> {
    const res = await this.request<SessionResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.data?.csrf_token) {
      this.setCsrfToken(res.data.csrf_token);
    }
    return res;
  }

  public async getSession(): Promise<{ data: SessionResponse; isMock: boolean }> {
    const res = await this.request<SessionResponse>('/v1/auth/session', { method: 'GET' });
    if (res.data?.csrf_token) {
      this.setCsrfToken(res.data.csrf_token);
    }
    return res;
  }

  public async logout(): Promise<{ data: void; isMock: boolean }> {
    const res = await this.request<void>('/v1/auth/logout', { method: 'POST' });
    this.setCsrfToken(undefined);
    return res;
  }

  // Principals (Implemented in backend - real requests only)
  public async createPrincipal(payload: PrincipalCreateRequest): Promise<{ data: PrincipalResponse; isMock: boolean }> {
    return this.request<PrincipalResponse>('/v1/principals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getPrincipal(principalId: string): Promise<{ data: PrincipalResponse; isMock: boolean }> {
    return this.request<PrincipalResponse>(`/v1/principals/${encodeURIComponent(principalId)}`, {
      method: 'GET',
    });
  }

  // Verification (Implemented in backend - real requests only)
  public async addBusinessIdentifier(
    principalId: string,
    payload: BusinessIdentifierCreateRequest
  ): Promise<{ data: BusinessIdentifierResponse; isMock: boolean }> {
    return this.request<BusinessIdentifierResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}/identifiers`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public async verifyPrincipalDemo(
    principalId: string
  ): Promise<{ data: DemoVerificationResponse; isMock: boolean }> {
    return this.request<DemoVerificationResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}/verification/demo`,
      {
        method: 'POST',
      }
    );
  }

  // Telegram Linking (Implemented in backend - real requests only)
  public async startTelegramLink(): Promise<{ data: TelegramLinkStartResponse; isMock: boolean }> {
    return this.request<TelegramLinkStartResponse>('/v1/telegram/link/start', {
      method: 'POST',
    });
  }

  public async unlinkTelegram(): Promise<{ data: void; isMock: boolean }> {
    return this.request<void>('/v1/telegram/link', {
      method: 'DELETE',
    });
  }

  // Agents & Passports (Unimplemented in backend until Phase 2 - labeled mock fallback)
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

// Default singleton instance with mock fallback DISABLED for real endpoints
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  useMockFallback: false,
});
