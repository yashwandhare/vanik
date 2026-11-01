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
  status: 'ok',
  service: 'VANIK API',
  version: '0.4.0',
};

export const FIXTURE_READINESS: ReadinessResponse = {
  status: 'ready',
  database: 'ok',
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
  description: 'Autonomous procurement agent representing Shree Ganesh Kirana for 40-SKU Diwali restock basket',
  capabilities: ['request_quote', 'evaluate_offers', 'counter_offer', 'place_order'],
  allowed_tools: ['marketplace_search', 'benchmark_compare'],
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
    value: '4.9',
    verified_outcome_count: 48,
    evidence_is_simulated: true,
  },
  trust_confidence: {
    level: 'high',
    evidence_count: 48,
    summary: 'Consistent on-time payment settlement and zero payment disputes across 48 mandi trades.',
    evidence_is_simulated: true,
  },
  security: {
    status: 'no_incidents_recorded',
    incident_count: 0,
  },
  created_at: '2026-10-31T10:00:00Z',
  updated_at: '2026-10-31T10:00:00Z',
};

export const FIXTURE_SELLER_AGENT_KISAN: AgentPassportResponse = {
  agent_id: 'agent-kisan-01',
  principal_id: 'seller-kisan-01',
  name: 'Kisan Wholesale Agent',
  role: 'seller',
  description: 'Autonomous clearance & inventory liquidation representative for Kisan Wholesale Traders',
  capabilities: ['quote_price', 'counter_offer', 'commit_inventory', 'sign_agreement'],
  allowed_tools: ['inventory_ledger', 'mandi_benchmark_feed'],
  strategy_profile: 'inventory_clearance',
  passport_version: 2,
  agent_status: 'active',
  verification_status: 'demo_verified',
  signing_key: {
    algorithm: 'Ed25519',
    public_key: 'ksn+44192/8TyWQHOg7hcvPapiMlrwIaaPcHURo98124=',
    fingerprint: 'sha256:44192ksn8812f854046fd2271b7bed4b6abe45aa58877ef47f9721ksn44',
    key_version: 2,
  },
  market_rating: {
    value: '4.9',
    verified_outcome_count: 142,
    evidence_is_simulated: true,
  },
  trust_confidence: {
    level: 'high',
    evidence_count: 142,
    summary: '99.4% on-time fulfillment rate, zero benchmark inflation incidents, 98% negotiation win rate.',
    evidence_is_simulated: true,
  },
  security: {
    status: 'no_incidents_recorded',
    incident_count: 0,
  },
  created_at: '2026-10-15T08:00:00Z',
  updated_at: '2026-11-01T09:00:00Z',
};

export const FIXTURE_SELLER_AGENT_UTSAV: AgentPassportResponse = {
  agent_id: 'agent-utsav-01',
  principal_id: 'seller-utsav-01',
  name: 'Utsav Wholesale Agent',
  role: 'seller',
  description: 'Volume discount & festive procurement agent for Utsav Distributors',
  capabilities: ['quote_price', 'counter_offer', 'commit_inventory'],
  allowed_tools: ['inventory_ledger', 'mandi_benchmark_feed'],
  strategy_profile: 'volume_discount',
  passport_version: 1,
  agent_status: 'active',
  verification_status: 'demo_verified',
  signing_key: {
    algorithm: 'Ed25519',
    public_key: 'utsav+88124/8TyWQHOg7hcvPapiMlrwIaaPcHURo44192=',
    fingerprint: 'sha256:88124utsav12f854046fd2271b7bed4b6abe45aa58877ef47f9721utsav88',
    key_version: 1,
  },
  market_rating: {
    value: '4.8',
    verified_outcome_count: 98,
    evidence_is_simulated: true,
  },
  trust_confidence: {
    level: 'high',
    evidence_count: 98,
    summary: '98.6% on-time fulfillment rate, strong credit terms compliance.',
    evidence_is_simulated: true,
  },
  security: {
    status: 'no_incidents_recorded',
    incident_count: 0,
  },
  created_at: '2026-10-18T08:00:00Z',
  updated_at: '2026-11-01T08:30:00Z',
};

export const FIXTURE_SELLER_AGENT_MAHALAXMI: AgentPassportResponse = {
  agent_id: 'agent-mhlx-01',
  principal_id: 'seller-mhlx-01',
  name: 'Mahalaxmi Agro Agent',
  role: 'seller',
  description: 'Margin optimizing autonomous agent for Mahalaxmi Agro Distributors',
  capabilities: ['quote_price', 'counter_offer', 'commit_inventory'],
  allowed_tools: ['inventory_ledger'],
  strategy_profile: 'margin_optimizer',
  passport_version: 1,
  agent_status: 'active',
  verification_status: 'demo_verified',
  signing_key: {
    algorithm: 'Ed25519',
    public_key: 'mhlx+98124/8TyWQHOg7hcvPapiMlrwIaaPcHURo11992=',
    fingerprint: 'sha256:98124mhlx12f854046fd2271b7bed4b6abe45aa58877ef47f9721mhlx98',
    key_version: 1,
  },
  market_rating: {
    value: '4.6',
    verified_outcome_count: 76,
    evidence_is_simulated: true,
  },
  trust_confidence: {
    level: 'medium',
    evidence_count: 76,
    summary: '96.2% on-time fulfillment, strict margin floor policies.',
    evidence_is_simulated: true,
  },
  security: {
    status: 'no_incidents_recorded',
    incident_count: 0,
  },
  created_at: '2026-10-20T08:00:00Z',
  updated_at: '2026-11-01T08:00:00Z',
};

export const ALL_DEMO_PASSPORTS: Record<string, AgentPassportResponse> = {
  '30000000-0000-4000-8000-000000000001': FIXTURE_AGENT_PASSPORT,
  'agent-kisan-01': FIXTURE_SELLER_AGENT_KISAN,
  'seller-agent-kisan': FIXTURE_SELLER_AGENT_KISAN,
  'agent-utsav-01': FIXTURE_SELLER_AGENT_UTSAV,
  'agent-mhlx-01': FIXTURE_SELLER_AGENT_MAHALAXMI,
};

export const FIXTURE_AGENT_LIST: AgentListResponse = {
  items: [
    FIXTURE_AGENT_PASSPORT,
    FIXTURE_SELLER_AGENT_KISAN,
    FIXTURE_SELLER_AGENT_UTSAV,
    FIXTURE_SELLER_AGENT_MAHALAXMI,
  ],
  pagination: {
    total: 4,
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
