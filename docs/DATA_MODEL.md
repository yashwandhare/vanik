# VANIK — Data Model

This document describes the primary database entities, relationships, and constraints in VANIK.

---

## 1. Entity-Relationship Overview

```
users ──◄ principal_members ►── principals ──◄ agents ──◄ agent_keys
                                    │             │
                                    │             ├──◄ tasks ──◄ task_mandates
                                    │             │       │
                                    │             │       └──◄ negotiations ──◄ agent_messages
                                    │             │                 │
                                    │             │                 └──◄ offers ──◄ offer_lines
                                    │             │
                                    ▼             ▼
                               inventory     deals ──◄ approvals ──◄ mock_payments
                                   │           │
                               products ◄──────┘
```

---

## 2. Core Entities

### 2.1 Identity & Access

| Entity | Primary Fields | Description |
|---|---|---|
| `users` | `id`, `email`, `password_hash`, `status`, `created_at` | Human accounts. Uses Argon2id password hashing and normalized email. |
| `user_sessions` | `id`, `user_id`, `token_hash`, `csrf_hash`, `expires_at` | Opaque, revocable eight-hour authentication sessions. |
| `principals` | `id`, `legal_name`, `trade_name`, `business_type`, `verification_status` | Verified commercial entities (buyers, sellers, or both). |
| `principal_members` | `principal_id`, `user_id`, `role`, `status` | Access control bindings (`owner`, `admin`, `operator`, `viewer`). |
| `business_identifiers` | `id`, `principal_id`, `type`, `value_digest`, `masked_value` | Hashed business identifiers (GSTIN, PAN). Raw credentials are never stored. |
| `telegram_links` | `id`, `user_id`, `telegram_user_id`, `linked_at` | Bi-directional linkage between Telegram users and human accounts. |

### 2.2 Agents & Passports

| Entity | Primary Fields | Description |
|---|---|---|
| `agents` | `id`, `principal_id`, `role`, `name`, `status`, `strategy_profile` | Autonomous AI agents representing business principals. |
| `agent_keys` | `id`, `agent_id`, `public_key`, `fingerprint`, `key_version`, `status` | Ed25519 cryptographic key records. Private keys are AES-GCM encrypted. |
| `agent_passports` | `agent_id`, `passport_version`, `reputation_score`, `security_status` | Persistent public credentials and historical reliability records. |

### 2.3 Catalogue & Inventory

| Entity | Primary Fields | Description |
|---|---|---|
| `products` | `id`, `sku`, `name`, `category`, `unit`, `benchmark_price` | Standardized mandi commodity items with trusted reference prices. |
| `inventory` | `id`, `principal_id`, `product_id`, `available_qty`, `reserved_qty` | Seller wholesale stock levels and allocation reservations. |

### 2.4 Negotiation & Commerce

| Entity | Primary Fields | Description |
|---|---|---|
| `tasks` | `id`, `principal_id`, `agent_id`, `objective`, `budget`, `status` | High-level procurement jobs assigned to buyer agents. |
| `task_mandates` | `task_id`, `constraints_json`, `permissions_json`, `expires_at` | Scoped authority limits (budget ceiling, required SKUs, time bounds). |
| `negotiations` | `id`, `task_id`, `buyer_agent_id`, `seller_agent_id`, `state`, `round_no` | State machine tracking bilateral bargaining between two agents. |
| `agent_messages` | `id`, `negotiation_id`, `sender_agent_id`, `payload`, `signature` | Signed protocol wire messages with RFC-8785 canonical payloads. |
| `offers` | `id`, `negotiation_id`, `version`, `total_amount`, `payment_terms`, `status` | Structured commercial bids submitted during negotiation rounds. |
| `offer_lines` | `id`, `offer_id`, `product_id`, `quantity`, `unit_price`, `line_total` | Line-item pricing, discounts, and quantity commitments. |

### 2.5 Settlement & Auditing

| Entity | Primary Fields | Description |
|---|---|---|
| `deals` | `id`, `task_id`, `buyer_principal_id`, `seller_principal_id`, `final_amount` | Legally binding agreed transaction terms. |
| `approvals` | `id`, `deal_id`, `approver_user_id`, `challenge_hash`, `status` | Cryptographic approval challenge authorized by the human principal. |
| `mock_payments` | `id`, `deal_id`, `amount`, `method`, `reference`, `status` | Simulated payment execution (UPI Instant, Smart Escrow, RTGS). |
| `audit_events` | `id`, `actor_type`, `actor_id`, `event_type`, `payload`, `created_at` | Immutable append-only audit trail. Database triggers reject updates/deletions. |

---

## 3. Data Integrity Constraints

1. **Strict Ownership:** Every agent, task, and inventory record belongs to exactly one verified business principal.
2. **Immutable Audit Log:** Audit events and signed agent messages are append-only.
3. **Approval Binding:** Approvals strictly bind to the SHA-256 digest of the agreed deal terms. Any change to terms invalidates existing approvals.
4. **Synthetic Data Minimization:** The system uses synthetic business identifiers and mock payment references. Real personal identity documents are never collected or stored.
