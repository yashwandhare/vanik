import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ApiClientError } from '../src/lib/api-client';
import { FIXTURE_AGENT_PASSPORT } from '../src/lib/fixtures';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches health from backend matching published schema', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', service: 'VANIK API', version: '0.4.0' }),
      headers: new Headers(),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    const res = await client.getHealth();

    expect(res.data.status).toBe('ok');
    expect(res.data.service).toBe('VANIK API');
    expect(res.data.version).toBe('0.4.0');
    expect(res.isMock).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('successfully fetches readiness matching published schema', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ready', database: 'ok' }),
      headers: new Headers(),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    const res = await client.getReadiness();

    expect(res.data.status).toBe('ready');
    expect(res.data.database).toBe('ok');
    expect(res.isMock).toBe(false);
  });

  it('never fakes success on implemented routes during network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: true });

    // Health, Auth, Principal, Verification, and Telegram endpoints must throw, not return mocks
    await expect(client.getHealth()).rejects.toThrow('Connection refused');
    await expect(
      client.register({ email: 'test@example.com', password: 'password12345', display_name: 'Test' })
    ).rejects.toThrow('Connection refused');
    await expect(client.login({ email: 'test@example.com', password: 'password12345' })).rejects.toThrow(
      'Connection refused'
    );
    await expect(client.startTelegramLink()).rejects.toThrow('Connection refused');
  });

  it('exposes 5xx server errors directly without swallowing them', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: { code: 'internal_error', message: 'Database connection failed', request_id: '500-req-id' },
      }),
      headers: new Headers({ 'x-request-id': '500-req-id' }),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: true });

    await expect(
      client.createPrincipal({
        legal_name: 'Test',
        trade_name: 'Test',
        business_type: 'retail',
        address: 'Pune',
        contact_email: 'test@example.com',
        roles: ['buyer'],
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('parses structured ErrorResponse envelope on failure', async () => {
    const mockErrorBody = {
      error: {
        code: 'validation_error',
        message: 'Invalid email format.',
        details: [{ field: 'body.email', code: 'value_error', message: 'Must be a valid email.' }],
        request_id: '40000000-0000-4000-8000-000000000001',
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => mockErrorBody,
      headers: new Headers({ 'x-request-id': '40000000-0000-4000-8000-000000000001' }),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });

    await expect(
      client.register({ email: 'bad-email', password: '123', display_name: 'Test' })
    ).rejects.toThrow('Invalid email format.');

    try {
      await client.register({ email: 'bad-email', password: '123', display_name: 'Test' });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.code).toBe('validation_error');
      expect(apiErr.status).toBe(422);
      expect(apiErr.requestId).toBe('40000000-0000-4000-8000-000000000001');
      expect(apiErr.details?.[0].field).toBe('body.email');
    }
  });

  it('only allows mock fallback on explicitly unimplemented demo routes', async () => {
    // Network failure simulation
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: true });

    // Unimplemented Phase 2 Agent passport uses mock when fallback enabled
    const passport = await client.getAgentPassport('30000000-0000-4000-8000-000000000001');
    expect(passport.data.agent_id).toBe(FIXTURE_AGENT_PASSPORT.agent_id);
    expect(passport.data.signing_key.algorithm).toBe('Ed25519');
    expect(passport.isMock).toBe(true);
  });

  it('propagates CSRF token on mutating requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: '456',
          email: 'test@example.com',
          display_name: 'Test User',
          created_at: '2026-10-31T10:00:00Z',
        },
        expires_at: '2026-10-31T18:00:00Z',
        csrf_token: 'csrf-abc',
      }),
      headers: new Headers(),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    client.setCsrfToken('csrf-abc');

    await client.createPrincipal({
      legal_name: 'Test Corp',
      trade_name: 'Test Brand',
      business_type: 'retail',
      address: 'Pune',
      contact_email: 'test@example.com',
      roles: ['buyer'],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/principals',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-CSRF-Token': 'csrf-abc',
        }),
      })
    );
  });

  it('calls verification and telegram linking endpoints with CSRF token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ link_code: 'VANIK-LINK-948214', expires_at: '2026-10-31T10:10:00Z' }),
      headers: new Headers(),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    client.setCsrfToken('csrf-xyz');

    const res = await client.startTelegramLink();
    expect(res.data.link_code).toBe('VANIK-LINK-948214');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/telegram/link/start',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'csrf-xyz',
        }),
      })
    );
  });

  it('restores session and attaches CSRF token from session response', async () => {
    const mockSession = {
      user: {
        id: 'user-uuid-123',
        email: 'kirana@example.com',
        display_name: 'Kirana Owner',
        created_at: '2026-10-31T10:00:00Z',
      },
      expires_at: '2026-10-31T18:00:00Z',
      csrf_token: 'restored-csrf-token-777',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSession,
      headers: new Headers(),
    });

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    const res = await client.getSession();

    expect(res.data.user.email).toBe('kirana@example.com');
    expect(client.getCsrfToken()).toBe('restored-csrf-token-777');
  });

  it('clears CSRF token and calls backend on logout', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
      headers: new Headers(),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    client.setCsrfToken('active-csrf-token');

    await client.logout();

    expect(client.getCsrfToken()).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'active-csrf-token',
        }),
      })
    );
  });

  it('throws on principal 404 and does not swallow into fake success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: { code: 'not_found', message: 'Principal not found', request_id: '404-req-id' },
      }),
      headers: new Headers({ 'x-request-id': '404-req-id' }),
    });

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: true });

    await expect(client.getPrincipal('non-existent-id')).rejects.toThrow('Principal not found');
  });

  it('performs synthetic demo verification against backend endpoint', async () => {
    const mockVerificationResult = {
      principal_id: '20000000-0000-4000-8000-000000000001',
      verification_status: 'demo_verified',
      label: 'GST Registered Regular Business',
      verified_at: '2026-10-31T12:00:00Z',
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockVerificationResult,
      headers: new Headers(),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    client.setCsrfToken('verify-csrf');

    const res = await client.verifyPrincipalDemo('20000000-0000-4000-8000-000000000001');

    expect(res.data.verification_status).toBe('demo_verified');
    expect(res.data.label).toBe('GST Registered Regular Business');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/v1/principals/20000000-0000-4000-8000-000000000001/verification/demo',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'verify-csrf',
        }),
      })
    );
  });
});
