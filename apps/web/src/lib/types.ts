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
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready' | string;
  database: 'connected' | 'unreachable' | string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  phone?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  phone?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SessionResponse {
  session_id: string;
  user_id: string;
  expires_at: string;
  csrf_token: string;
}

export type BusinessRole = 'buyer' | 'seller';
export type VerificationStatus = 'not_submitted' | 'pending' | 'demo_verified' | 'rejected';

export interface PrincipalCreateRequest {
  legal_name: string;
  trade_name?: string | null;
  business_type: string;
  address: string;
  roles: BusinessRole[];
}

export interface PrincipalResponse {
  id: string;
  legal_name: string;
  trade_name?: string | null;
  business_type: string;
  address: string;
  contact_email: string;
  roles: BusinessRole[];
  verification_status: VerificationStatus;
  membership_role: string;
  created_at: string;
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
