# VANIK — Data Model

This is a logical model. Physical schema and migrations must be finalised during implementation.

## Core entities

| Entity | Key fields | Notes |
| --- | --- | --- |
| `users` | id, email, password_hash, auth_provider, status | Human account; normalized email and Argon2id hash |
| `user_sessions` | id, user_id, token_hash, csrf_hash, expires_at, revoked_at | Opaque, revocable, eight-hour session |
| `principals` | id, legal_name, trade_name, business_type, address, verification_status | Business identity |
| `principal_members` | principal_id, user_id, role, status | Owner/admin/operator/viewer |
| `business_identifiers` | id, principal_id, type, value_digest, masked_value, status | Store a digest and display-safe mask, never a raw real identifier |
| `telegram_links` | id, user_id, telegram_user_id, linked_at, revoked_at | One-time link flow |
| `agents` | id, principal_id, role, name, status, strategy_profile | Multiple agents per principal |
| `agent_keys` | id, agent_id, public_key, fingerprint, key_version, status | Private key stays server-side |
| `agent_capabilities` | agent_id, capability, config | Allowed actions/tools |
| `agent_passports` | agent_id, passport_version, reputation_summary, trust_confidence, security_status | Persistent public/controlled profile |
| `tasks` | id, principal_id, agent_id, objective, budget, deadline, status | Task instance |
| `task_mandates` | task_id, constraints_json, priorities_json, permissions_json, expires_at | Scoped authority |
| `products` | id, sku, name, category, unit, benchmark_price | Seed 40 distinct SKUs |
| `inventory` | principal_id, agent_id, product_id, available_qty, reserved_qty | Seller inventory |
| `negotiations` | id, task_id, buyer_agent_id, seller_agent_id, state, round_no | One seller conversation per task |
| `agent_messages` | id, negotiation_id, sender_agent_id, message_type, payload, signature, nonce, created_at | Signed protocol events |
| `offers` | id, negotiation_id, version, structured_terms, status, expires_at | Structured commercial proposal |
| `offer_lines` | offer_id, product_id, quantity, unit_price, discount, line_total | Item-level quote |
| `deals` | id, task_id, buyer_principal_id, seller_principal_id, final_offer_id, version, status | Locked agreement |
| `approvals` | id, deal_id, deal_version, approver_user_id, challenge_hash, expires_at, used_at | One-time exact approval |
| `mock_payments` | id, deal_id, amount, currency, status, mock_reference | No real payment |
| `events` | id, principal_id, actor_type, actor_id, event_type, entity_type, entity_id, payload, created_at | Append-only audit log |
| `supplier_memory` | id, buyer_principal_id, seller_principal_id, event_id, memory_type, evidence, confidence | Cross-session supplier history |
| `security_incidents` | id, principal_id, agent_id, event_id, incident_type, severity, status | Security separate from rating |
| `telegram_notifications` | id, user_id, event_id, delivery_status | Notification delivery |

## Phase 1 physical schema

Migration `20261031_0001` implements users, sessions, principals, memberships and business identifiers. Migration `20261031_0002` adds demo-verification timestamps and one identifier per type. Application and database constraints enforce lifecycle and membership values. Authentication tokens and identifier values are stored only as keyed digests.

Agents, keys, tasks, negotiations, deals and audit tables remain logical designs until their migrations are added.

## Identity constraints

- Every agent belongs to exactly one principal.
- A principal may own many agents across buyer and seller roles.
- A Telegram account is linked to a human user, not directly treated as a business identity.
- Seller ranking and collusion analysis aggregate by principal.
- Agent ID is not the cryptographic proof; signatures verified against the Passport public key provide message authenticity.

## Approval integrity

Approval must bind to deal ID/version, principals, amount, currency, line items, payment destination, expiry and nonce. Store a canonical hash of the approved terms. Any material change creates a new deal version and invalidates old approval.

## Data minimisation

The hackathon uses synthetic identifiers and synthetic credit credentials. Do not store raw real identity documents. Hash or redact demo identifiers where practical.
