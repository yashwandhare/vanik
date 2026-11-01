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

// Phase 2 Marketplace & Catalogue Contracts (mirroring packages/shared-schemas/v1)
export interface ProductResponse {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  benchmark_price: string;
  attributes: Record<string, unknown>;
  active: boolean;
}

export interface ProductListResponse {
  items: ProductResponse[];
  pagination: PaginationMeta;
}

export interface SellerAgentSummary {
  agent_id: string;
  name: string;
  strategy_profile: string;
  status: string;
}

export interface SellerSummary {
  principal_id: string;
  trade_name: string;
  verification_status: VerificationStatus;
  coverage: string[];
  delivery_days: number;
  credit_days: number[];
  available_sku_count: number;
  reliability_evidence_count: number;
  evidence_is_simulated: boolean;
  reliability_score: string | null;
  agents: SellerAgentSummary[];
}

export interface SellerListResponse {
  items: SellerSummary[];
  pagination: PaginationMeta;
}

export interface InventoryLineResponse {
  product: ProductResponse;
  available_qty: string;
}

export interface InventoryResponse {
  principal_id: string;
  agent_id: string;
  items: InventoryLineResponse[];
  pagination: PaginationMeta;
}

export interface InventoryUpdateRequest {
  product_id: string;
  stock_qty: number | string;
}

export interface SellerProfileRequest {
  coverage: string[];
  delivery_days: number;
  credit_days: number[];
  delivery_terms?: string;
  payment_note?: string;
}

export interface SellerProfileResponse {
  seller: SellerSummary;
  legal_name: string;
  business_type: string;
  address: string;
  public_policies: Record<string, unknown>;
}

export interface TaskLineItemRequest {
  sku: string;
  quantity: number | string;
  unit: string;
}

export type TaskPriority = 'price' | 'reliability' | 'delivery' | 'credit' | 'availability';
export type TaskTool = 'marketplace_search' | 'benchmark_compare';
export type TaskAction = 'request_quote' | 'evaluate_offers';

export interface TaskCreateRequest {
  principal_id: string;
  agent_id: string;
  objective: string;
  category: 'procurement';
  lines: TaskLineItemRequest[];
  budget: number | string;
  currency: 'INR';
  delivery_deadline: string;
  expires_at: string;
  priorities: Record<TaskPriority, number | string>;
  allowed_tools: TaskTool[];
  permitted_actions: TaskAction[];
  max_rounds: number;
  min_credit_days?: number;
  max_upfront_pct?: number | string;
  requires_human_approval: true;
}

export interface TaskResponse {
  id: string;
  version: number;
  principal_id: string;
  agent_id: string;
  mandate: TaskMandateResponse;
  status:
    | 'created'
    | 'cancelled'
    | 'expired'
    | 'running'
    | 'awaiting_approval'
    | 'completed'
    | 'failed';
  created_at: string;
}

export interface TaskListResponse {
  items: TaskResponse[];
  pagination: PaginationMeta;
}

export interface TaskMandateResponse extends Omit<TaskCreateRequest, 'principal_id' | 'agent_id'> {
  lines: Array<TaskLineItemRequest & { product_id: string }>;
}

export interface PaymentTerms {
  type: 'advance_upi' | 'partial_advance' | 'credit_net_7' | 'credit_net_15' | 'credit_net_30';
  credit_days: number;
  upfront_pct: string;
  balance_due_days: number;
}

export interface OfferLine {
  product_id: string;
  sku: string;
  quantity: string;
  unit: string;
  unit_price: string;
  claimed_original_price: string;
  claimed_discount_pct: string;
  line_total: string;
}

export interface OfferTerms {
  currency: 'INR';
  lines: OfferLine[];
  total: string;
  delivery_at: string;
  payment_terms: PaymentTerms;
  expires_at: string;
  seller_note: string;
  tax_representation: 'not_modeled';
}

export interface AgentEnvelope {
  message_id: string;
  protocol_version: 'vanik.a2a.v1';
  message_type: 'REQUEST_FOR_QUOTE' | 'OFFER' | 'COUNTER_OFFER' | 'ACCEPT' | 'REJECT' | 'WITHDRAW' | 'FINAL_OFFER' | 'EXPIRE' | 'SECURITY_REPORT';
  sender_agent_id: string;
  recipient_agent_id: string;
  sender_principal_id: string;
  negotiation_id: string;
  task_id: string;
  created_at: string;
  nonce: string;
  key_version: number;
  payload: Record<string, unknown>;
  payload_hash: string;
  signature: string;
}

export interface OfferResponse {
  id: string;
  negotiation_id: string;
  seller_principal_id: string;
  seller_agent_id: string;
  version: number;
  terms: OfferTerms;
  terms_hash: string;
  valid: boolean;
  validation: Record<string, unknown>;
  ranking: Record<string, unknown>;
}

export interface NegotiationResponse {
  id: string;
  task_id: string;
  seller_principal_id: string;
  seller_agent_id: string;
  state: string;
  round_no: number;
  offers: OfferResponse[];
  messages: AgentEnvelope[];
}

export interface NegotiationListResponse {
  task_id: string;
  items: NegotiationResponse[];
  recommendation_offer_id: string | null;
}

export interface AcceptOfferRequest { offer_id: string }
export interface SellerRFQListResponse { items: NegotiationResponse[] }

export interface DealResponse {
  id: string;
  task_id: string;
  version: number;
  status: string;
  buyer_principal_id: string;
  seller_principal_id: string;
  amount: string;
  currency: 'INR';
  snapshot: Record<string, unknown>;
  terms_hash: string;
  expires_at: string;
  label: 'SIMULATED / NO REAL PAYMENT';
}
export interface DealListResponse { items: DealResponse[] }
export interface ApprovalChallengeResponse {
  challenge_id: string;
  deal_id: string;
  deal_version: number;
  terms_hash: string;
  nonce: string;
  expires_at: string;
}
export interface ApproveRequest {
  challenge_id: string;
  deal_version: number;
  terms_hash: string;
  nonce: string;
}
export interface ReceiptResponse {
  id: string;
  deal_id: string;
  amount: string;
  contracted_total: string;
  balance_due: string;
  currency: 'INR';
  status: 'succeeded';
  reference: string;
  created_at: string;
  label: 'MOCK UPI / NO FUNDS MOVED';
}
export interface EventResponse {
  id: string;
  event_type: string;
  actor_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}
export interface ReplayResponse { task_id: string; events: EventResponse[] }
export interface SecurityIncidentResponse {
  id: string;
  incident_type: string;
  agent_id: string;
  principal_id: string;
  evidence: Record<string, unknown>;
  action: string;
  status: string;
  created_at: string;
}
export interface SecurityIncidentListResponse { items: SecurityIncidentResponse[] }
export interface SupplierMemoryResponse {
  id: string;
  seller_principal_id: string;
  event_id: string;
  memory_type: string;
  score: string;
  confidence: string;
  evidence: Record<string, unknown>;
  status: string;
  created_at: string;
}
export interface SupplierMemoryListResponse { items: SupplierMemoryResponse[] }
export interface NotificationResponse { id: string; text: string; status: string; created_at: string }
export interface NotificationListResponse { items: NotificationResponse[] }
export interface MemoryDisputeRequest { reason: string }
export interface MemoryCorrectionRequest { score: string | number; confidence: string | number; reason: string }
