import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ApiClientError } from '../src/lib/api-client';
import { FIXTURE_AGENT_PASSPORT, FIXTURE_HEALTH } from '../src/lib/fixtures';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully fetches health from backend', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'healthy' }),
      headers: new Headers(),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    const res = await client.getHealth();

    expect(res.data.status).toBe('healthy');
    expect(res.isMock).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/health',
      expect.objectContaining({ method: 'GET' })
    );
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

    await expect(client.register({ email: 'bad-email', password: '123' })).rejects.toThrow(
      'Invalid email format.'
    );

    try {
      await client.register({ email: 'bad-email', password: '123' });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      const apiErr = err as ApiClientError;
      expect(apiErr.code).toBe('validation_error');
      expect(apiErr.status).toBe(422);
      expect(apiErr.requestId).toBe('40000000-0000-4000-8000-000000000001');
      expect(apiErr.details?.[0].field).toBe('body.email');
    }
  });

  it('uses mock fixtures gracefully when fallback is enabled', async () => {
    // Network failure simulation
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: true });
    const health = await client.getHealth();
    expect(health.data.status).toBe(FIXTURE_HEALTH.status);
    expect(health.isMock).toBe(true);

    const passport = await client.getAgentPassport('30000000-0000-4000-8000-000000000001');
    expect(passport.data.agent_id).toBe(FIXTURE_AGENT_PASSPORT.agent_id);
    expect(passport.data.signing_key.algorithm).toBe('Ed25519');
    expect(passport.isMock).toBe(true);
  });

  it('propagates CSRF token on mutating requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ session_id: '123', user_id: '456', expires_at: '2026-10-31', csrf_token: 'csrf-abc' }),
      headers: new Headers(),
    });
    global.fetch = mockFetch;

    const client = new ApiClient({ baseUrl: 'http://localhost:8000', useMockFallback: false });
    client.setCsrfToken('csrf-abc');

    await client.createPrincipal({
      legal_name: 'Test Corp',
      business_type: 'retail',
      address: 'Pune',
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
});
