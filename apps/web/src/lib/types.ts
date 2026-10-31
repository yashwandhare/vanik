/**
 * TypeScript contracts mirroring packages/shared-schemas/v1
 * Authoritative source: Main's published schemas
 */

export interface ErrorDetail {
  field?: string | null;
  code: string;
  message: string;
}

export interface ErrorEnvelope {
  code: string;
  message: string;
  details?: ErrorDetail[];
  request_id: string;
}

export interface ErrorResponse {
  error: ErrorEnvelope;
}

export interface HealthResponse {
  status: 'ok' | string;
  service: string;
  version: string;
}

export interface ReadinessResponse {
  status: 'ready' | string;
  database: 'ok' | string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface SessionResponse {
  user: UserResponse;
  expires_at: string;
  csrf_token: string;
}

export type BusinessRole = 'buyer' | 'seller';
export type MembershipRole = 'owner' | 'admin' | 'operator' | 'viewer';
export type VerificationStatus = 'not_submitted' | 'pending' | 'demo_verified' | 'rejected';

export interface PrincipalCreateRequest {
  legal_name: string;
  trade_name: string;
  business_type: string;
  address: string;
  contact_email: string;
  roles: BusinessRole[];
}

export interface PrincipalResponse {
  id: string;
  legal_name: string;
  trade_name: string;
  business_type: string;
  address: string;
  contact_email: string;
  roles: BusinessRole[];
  verification_status: VerificationStatus;
  membership_role: MembershipRole;
  created_at: string;
}

export type IdentifierType = 'pan' | 'gstin' | 'udyam' | 'cin' | 'llpin';

export interface BusinessIdentifierCreateRequest {
  identifier_type: IdentifierType;
  value: string;
  is_synthetic: true;
}

export interface BusinessIdentifierResponse {
  id: string;
  principal_id: string;
  identifier_type: IdentifierType;
  masked_value: string;
  status: VerificationStatus;
  is_synthetic: true;
  created_at: string;
}

export interface DemoVerificationResponse {
  principal_id: string;
  verification_status: 'demo_verified';
  verified_at: string;
  label: 'SIMULATED / DEMO';
}

export interface TelegramLinkStartResponse {
  link_code: string;
  expires_at: string;
}

export interface TelegramLinkResponse {
  id: string;
  user_id: string;
  telegram_user_id: string;
  linked_at: string;
}

export type AgentStatus = 'active' | 'paused' | 'revoked';

export interface PublicSigningKey {
  algorithm: 'Ed25519' | string;
  public_key: string;
  fingerprint: string;
  key_version: number;
}

export interface MarketRating {
  value: string | null;
  verified_outcome_count: number;
  evidence_is_simulated: boolean;
}

export interface TrustConfidence {
  level: 'limited' | 'medium' | 'high';
  evidence_count: number;
  summary: string;
  evidence_is_simulated: boolean;
}

export interface SecuritySummary {
  status: 'no_incidents_recorded' | 'review_needed' | 'restricted';
  incident_count: number;
}

export interface AgentCreateRequest {
  name: string;
  role: BusinessRole;
  description?: string;
  strategy_profile?: string;
  capabilities?: string[];
  allowed_tools?: string[];
}

export interface AgentPassportResponse {
  agent_id: string;
  principal_id: string;
  name: string;
  role: BusinessRole;
  description: string;
  capabilities: string[];
  allowed_tools: string[];
  strategy_profile: string;
  passport_version: number;
  agent_status: AgentStatus;
  verification_status: VerificationStatus;
  signing_key: PublicSigningKey;
  market_rating: MarketRating;
  trust_confidence: TrustConfidence;
  security: SecuritySummary;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface AgentListResponse {
  items: AgentPassportResponse[];
  pagination: PaginationMeta;
}
