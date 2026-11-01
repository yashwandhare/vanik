import type {
  AcceptOfferRequest,
  ApprovalChallengeResponse,
  ApproveRequest,
  DealListResponse,
  DealResponse,
  MemoryCorrectionRequest,
  MemoryDisputeRequest,
  NegotiationListResponse,
  NotificationListResponse,
  ReceiptResponse,
  ReplayResponse,
  SecurityIncidentListResponse,
  SellerRFQListResponse,
  SupplierMemoryListResponse,
  SupplierMemoryResponse,
  AgentCreateRequest,
  AgentListResponse,
  AgentPassportResponse,
  BusinessIdentifierCreateRequest,
  BusinessIdentifierResponse,
  DemoVerificationResponse,
  ErrorEnvelope,
  ErrorResponse,
  HealthResponse,
  InventoryLineResponse,
  InventoryResponse,
  InventoryUpdateRequest,
  LoginRequest,
  PrincipalCreateRequest,
  PrincipalResponse,
  ProductListResponse,
  ProductResponse,
  ReadinessResponse,
  RegisterRequest,
  SellerListResponse,
  SellerProfileRequest,
  SellerProfileResponse,
  SellerSummary,
  SessionResponse,
  TaskCreateRequest,
  TaskListResponse,
  TaskResponse,
  TelegramLinkStartResponse,
  UserResponse,
} from './types';

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

  // Agents & Passports (Implemented in backend with Ed25519 persistence - real requests only)
  public async createAgent(
    principalId: string,
    payload: AgentCreateRequest
  ): Promise<{ data: AgentPassportResponse; isMock: boolean }> {
    return this.request<AgentPassportResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}/agents`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public async listAgents(principalId: string): Promise<{ data: AgentListResponse; isMock: boolean }> {
    return this.request<AgentListResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}/agents`,
      { method: 'GET' }
    );
  }

  public async getAgentPassport(agentId: string): Promise<{ data: AgentPassportResponse; isMock: boolean }> {
    return this.request<AgentPassportResponse>(
      `/v1/agents/${encodeURIComponent(agentId)}/passport`,
      { method: 'GET' }
    );
  }

  public async pauseAgent(agentId: string): Promise<{ data: AgentPassportResponse; isMock: boolean }> {
    return this.request<AgentPassportResponse>(
      `/v1/agents/${encodeURIComponent(agentId)}/pause`,
      { method: 'POST' }
    );
  }

  public async resumeAgent(agentId: string): Promise<{ data: AgentPassportResponse; isMock: boolean }> {
    return this.request<AgentPassportResponse>(
      `/v1/agents/${encodeURIComponent(agentId)}/resume`,
      { method: 'POST' }
    );
  }

  public async revokeAgent(agentId: string): Promise<{ data: AgentPassportResponse; isMock: boolean }> {
    return this.request<AgentPassportResponse>(
      `/v1/agents/${encodeURIComponent(agentId)}/revoke`,
      { method: 'POST' }
    );
  }

  public async rotateAgentKey(agentId: string): Promise<{ data: AgentPassportResponse; isMock: boolean }> {
    return this.request<AgentPassportResponse>(
      `/v1/agents/${encodeURIComponent(agentId)}/keys/rotate`,
      { method: 'POST' }
    );
  }

  // Marketplace & Catalogue (Phase 2 - Published in packages/shared-schemas/v1)
  public async listCatalogueProducts(params?: {
    category?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ProductListResponse; isMock: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.query) searchParams.set('query', params.query);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

    const qs = searchParams.toString();
    const path = `/v1/catalogue/products${qs ? `?${qs}` : ''}`;
    return this.request<ProductListResponse>(path, { method: 'GET' });
  }

  public async listMarketplaceSellers(params?: {
    category?: string;
    coverage?: string;
    min_credit_days?: number;
    max_delivery_days?: number;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: SellerListResponse; isMock: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.coverage) searchParams.set('coverage', params.coverage);
    if (params?.min_credit_days !== undefined) {
      searchParams.set('min_credit_days', String(params.min_credit_days));
    }
    if (params?.max_delivery_days !== undefined) {
      searchParams.set('max_delivery_days', String(params.max_delivery_days));
    }
    if (params?.query) searchParams.set('query', params.query);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

    const qs = searchParams.toString();
    const path = `/v1/marketplace/sellers${qs ? `?${qs}` : ''}`;
    return this.request<SellerListResponse>(path, { method: 'GET' });
  }

  public async getSellerInventory(
    principalId: string,
    agentId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{ data: InventoryResponse; isMock: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

    const qs = searchParams.toString();
    const path = `/v1/principals/${encodeURIComponent(principalId)}/agents/${encodeURIComponent(agentId)}/inventory${qs ? `?${qs}` : ''}`;
    return this.request<InventoryResponse>(path, { method: 'GET' });
  }

  public async updateSellerInventory(
    principalId: string,
    agentId: string,
    payload: InventoryUpdateRequest
  ): Promise<{ data: InventoryLineResponse; isMock: boolean }> {
    return this.request<InventoryLineResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}/agents/${encodeURIComponent(agentId)}/inventory`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public async getSellerProfile(
    principalId: string
  ): Promise<{ data: SellerProfileResponse; isMock: boolean }> {
    return this.request<SellerProfileResponse>(
      `/v1/marketplace/sellers/${encodeURIComponent(principalId)}`,
      { method: 'GET' }
    );
  }

  public async updateSellerProfile(
    principalId: string,
    payload: SellerProfileRequest
  ): Promise<{ data: SellerProfileResponse; isMock: boolean }> {
    return this.request<SellerProfileResponse>(
      `/v1/principals/${encodeURIComponent(principalId)}/seller-profile`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  public async createTask(
    payload: TaskCreateRequest
  ): Promise<{ data: TaskResponse; isMock: boolean }> {
    return this.request<TaskResponse>('/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listTasks(
    params?: { limit?: number; offset?: number; principal_id?: string } | string
  ): Promise<{ data: TaskListResponse; isMock: boolean }> {
    const query = new URLSearchParams();
    if (typeof params === 'string') {
      query.set('principal_id', params);
    } else if (params) {
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      if (params.offset !== undefined) query.set('offset', String(params.offset));
      if (params.principal_id !== undefined) query.set('principal_id', params.principal_id);
    }
    return this.request<TaskListResponse>(`/v1/tasks${query.size ? `?${query}` : ''}`, { method: 'GET' });
  }

  public getTask(taskId: string) {
    return this.request<TaskResponse>(`/v1/tasks/${encodeURIComponent(taskId)}`, { method: 'GET' });
  }

  public launchTask(taskId: string) {
    return this.request<NegotiationListResponse>(`/v1/tasks/${encodeURIComponent(taskId)}/launch`, { method: 'POST' });
  }

  public taskNegotiations(taskId: string) {
    return this.request<NegotiationListResponse>(`/v1/tasks/${encodeURIComponent(taskId)}/negotiations`, { method: 'GET' });
  }

  public acceptOffer(negotiationId: string, payload: AcceptOfferRequest) {
    return this.request<DealResponse>(`/v1/negotiations/${encodeURIComponent(negotiationId)}/accept`, { method: 'POST', body: JSON.stringify(payload) });
  }

  public listDeals() {
    return this.request<DealListResponse>('/v1/deals', { method: 'GET' });
  }

  public getDeal(dealId: string) {
    return this.request<DealResponse>(`/v1/deals/${encodeURIComponent(dealId)}`, { method: 'GET' });
  }

  public challenge(dealId: string) {
    return this.request<ApprovalChallengeResponse>(`/v1/deals/${encodeURIComponent(dealId)}/approval-challenge`, { method: 'POST' });
  }

  public approve(dealId: string, payload: ApproveRequest) {
    return this.request<DealResponse>(`/v1/deals/${encodeURIComponent(dealId)}/approve`, { method: 'POST', body: JSON.stringify(payload) });
  }

  public reject(dealId: string) {
    return this.request<DealResponse>(`/v1/deals/${encodeURIComponent(dealId)}/reject`, { method: 'POST' });
  }

  public settle(dealId: string, idempotencyKey: string) {
    return this.request<ReceiptResponse>(`/v1/deals/${encodeURIComponent(dealId)}/settle`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } });
  }

  public receipt(dealId: string) {
    return this.request<ReceiptResponse>(`/v1/deals/${encodeURIComponent(dealId)}/receipt`, { method: 'GET' });
  }

  public replay(taskId: string) {
    return this.request<ReplayResponse>(`/v1/tasks/${encodeURIComponent(taskId)}/replay`, { method: 'GET' });
  }

  public security(taskId: string) {
    return this.request<SecurityIncidentListResponse>(`/v1/tasks/${encodeURIComponent(taskId)}/security`, { method: 'GET' });
  }

  public memory(principalId: string) {
    return this.request<SupplierMemoryListResponse>(`/v1/principals/${encodeURIComponent(principalId)}/supplier-memory`, { method: 'GET' });
  }

  public disputeMemory(memoryId: string, payload: MemoryDisputeRequest) {
    return this.request<SupplierMemoryResponse>(`/v1/supplier-memory/${encodeURIComponent(memoryId)}/dispute`, { method: 'POST', body: JSON.stringify(payload) });
  }

  public correctMemory(memoryId: string, payload: MemoryCorrectionRequest) {
    return this.request<SupplierMemoryResponse>(`/v1/supplier-memory/${encodeURIComponent(memoryId)}/correct`, { method: 'POST', body: JSON.stringify(payload) });
  }

  public notifications() {
    return this.request<NotificationListResponse>('/v1/notifications', { method: 'GET' });
  }

  public sellerRFQs(principalId: string) {
    return this.request<SellerRFQListResponse>(`/v1/principals/${encodeURIComponent(principalId)}/rfqs`, { method: 'GET' });
  }
}

// Default singleton instance with mock fallback DISABLED for real endpoints
export const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  useMockFallback: false,
});
