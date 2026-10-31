import type {
  AgentListResponse,
  AgentPassportResponse,
  BusinessIdentifierResponse,
  DemoVerificationResponse,
  ErrorResponse,
  HealthResponse,
  PrincipalResponse,
  ReadinessResponse,
  SessionResponse,
  TelegramLinkResponse,
  TelegramLinkStartResponse,
  UserResponse,
} from './types';

export const FIXTURE_HEALTH: HealthResponse = {
  status: 'healthy',
};

export const FIXTURE_READINESS: ReadinessResponse = {
  status: 'ready',
  database: 'connected',
};

export const FIXTURE_USER: UserResponse = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'demo@example.com',
  display_name: 'Demo Principal Owner',
  created_at: '2026-10-31T10:00:00Z',
};

export const FIXTURE_SESSION: SessionResponse = {
  user: FIXTURE_USER,
  expires_at: '2026-10-31T18:00:00Z',
  csrf_token: 'synthetic-csrf-token-000000000001',
};

export const FIXTURE_PRINCIPAL: PrincipalResponse = {
  id: '20000000-0000-4000-8000-000000000001',
  legal_name: 'Synthetic Kirana Demo',
  trade_name: 'Synthetic Kirana',
  business_type: 'retail',
  address: 'Synthetic demo address, Pune',
  contact_email: 'demo@example.com',
  roles: ['buyer'],
  verification_status: 'demo_verified',
  membership_role: 'owner',
  created_at: '2026-10-31T10:00:00Z',
};

export const FIXTURE_IDENTIFIER: BusinessIdentifierResponse = {
  id: '50000000-0000-4000-8000-000000000001',
  principal_id: '20000000-0000-4000-8000-000000000001',
  identifier_type: 'pan',
  masked_value: 'ABCDE****F',
  status: 'demo_verified',
  is_synthetic: true,
  created_at: '2026-10-31T10:00:00Z',
};

export const FIXTURE_DEMO_VERIFICATION: DemoVerificationResponse = {
  principal_id: '20000000-0000-4000-8000-000000000001',
  verification_status: 'demo_verified',
  verified_at: '2026-10-31T10:00:00Z',
  label: 'SIMULATED / DEMO',
};

export const FIXTURE_TELEGRAM_LINK_START: TelegramLinkStartResponse = {
  link_code: 'VANIK-LINK-948214',
  expires_at: '2026-10-31T10:10:00Z',
};

export const FIXTURE_TELEGRAM_LINK: TelegramLinkResponse = {
  id: '60000000-0000-4000-8000-000000000001',
  user_id: '10000000-0000-4000-8000-000000000001',
  telegram_user_id: '123456789',
  linked_at: '2026-10-31T10:00:00Z',
};

export const FIXTURE_AGENT_PASSPORT: AgentPassportResponse = {
  agent_id: '30000000-0000-4000-8000-000000000001',
  principal_id: '20000000-0000-4000-8000-000000000001',
  name: 'Diwali Buyer',
  role: 'buyer',
  description: 'Synthetic procurement agent',
  capabilities: ['request_quote'],
  allowed_tools: ['marketplace_search'],
  strategy_profile: 'default',
  passport_version: 1,
  agent_status: 'active',
  verification_status: 'demo_verified',
  signing_key: {
    algorithm: 'Ed25519',
    public_key: '11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=',
    fingerprint: 'sha256:21fe31dfa154a261626bf854046fd2271b7bed4b6abe45aa58877ef47f9721b9',
    key_version: 1,
  },
  market_rating: {
    value: null,
    verified_outcome_count: 0,
    evidence_is_simulated: true,
  },
  trust_confidence: {
    level: 'limited',
    evidence_count: 0,
    summary: 'New demo agent with no recorded outcomes.',
    evidence_is_simulated: true,
  },
  security: {
    status: 'no_incidents_recorded',
    incident_count: 0,
  },
  created_at: '2026-10-31T10:00:00Z',
  updated_at: '2026-10-31T10:00:00Z',
};

export const FIXTURE_AGENT_LIST: AgentListResponse = {
  items: [FIXTURE_AGENT_PASSPORT],
  pagination: {
    total: 1,
    limit: 20,
    offset: 0,
  },
};

export const FIXTURE_ERROR: ErrorResponse = {
  error: {
    code: 'validation_error',
    message: 'Request validation failed.',
    details: [
      {
        field: 'body.email',
        code: 'value_error',
        message: 'Must be a valid email address.',
      },
    ],
    request_id: '40000000-0000-4000-8000-000000000001',
  },
};
