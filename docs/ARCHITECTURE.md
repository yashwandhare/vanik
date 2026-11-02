# VANIK — Architecture

This document describes the software architecture, logical components, and trust model of VANIK.

---

## 1. Architectural Style

VANIK uses a modular monolith architecture. One backend service manages identity, marketplace catalogues, agent lifecycles, negotiation state machines, trust verification, and audit logs. 

The web application, Telegram bot, and Telegram Mini App operate as clients to the unified backend API.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Surfaces                       │
│  ┌───────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Marketplace Web   │  │ Telegram Bot │  │  Mini App    │  │
│  │ (Next.js / React) │  │   (Python)   │  │ (Responsive) │  │
│  └─────────┬─────────┘  └──────┬───────┘  └──────┬───────┘  │
└────────────┼───────────────────┼─────────────────┼──────────┘
             │                   │                 │
             ▼                   ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                        │
│  ┌───────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Identity & Access │  │ Agent Engine │  │ Marketplace  │  │
│  ├───────────────────┤  ├──────────────┤  ├──────────────┤  │
│  │ A2A State Machine │  │ Trust Engine │  │ Deal Locking │  │
│  └───────────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│   PostgreSQL (Data)   │             │     Redis (Cache)     │
└───────────────────────┘             └───────────────────────┘
```

---

## 2. Logical Components

1. **Identity and Access:** Manages human accounts, business principals, memberships, and Telegram linking.
2. **Verification Service:** Verifies business identifiers (GSTIN, PAN) against synthetic benchmark registries.
3. **Agent Registry:** Manages agent creation, persistent Agent Passports, Ed25519 signing keys, and capability scopes.
4. **Mandate Service:** Validates task objectives, budget limits, and delegation scopes against principal authority.
5. **Marketplace Catalogue:** Maintains products, wholesale inventories, and seller discovery indices.
6. **Negotiation Engine:** Executes parallel rounds, message validation, and state machine transitions.
7. **Trust and Guardrails:** Verifies signatures, detects fake discounts, and quarantines prompt injection attempts.
8. **Deal Service:** Matches counterparty acceptance, generates approval challenges, and locks transactions.
9. **Settlement Service:** Executes simulated UPI, Mandi Smart Escrow, and RTGS payment settlements.
10. **Audit Engine:** Records append-only audit entries for every state transition and security event.

---

## 3. Runtime Workflow

```
1. Human Registration ──► 2. Principal Creation ──► 3. Agent Minting (Ed25519)
                                                            │
8. Deal Finalization  ◄── 7. Counter-Bargaining  ◄── 4. Task Mandate Dispatched
       │                                                    │
       ▼                                                    ▼
9. Human Approval     ──► 10. Settlement Executed ◄── 6. Parallel RFQs Broadcast
```

### Detailed Sequence

1. A human owner creates an account and registers a business principal.
2. The business principal completes identity verification and receives a credit rating.
3. The principal spawns an autonomous trading agent. The system generates an Ed25519 keypair and mints an Agent Passport.
4. The principal issues a procurement task mandate specifying target items, budget bounds, and delivery criteria.
5. The buyer agent discovers active seller agents and broadcasts signed Requests for Quote (RFQs).
6. Seller agents evaluate stock availability and respond with signed commercial offers.
7. The buyer agent compares competing quotes, checks benchmark prices, and submits counter-offers in parallel rounds.
8. When terms converge, the system locks the winning deal and issues a cryptographic approval challenge.
9. The human principal reviews the comparison matrix and approves the deal.
10. The system commits the transaction to the audit ledger and executes simulated settlement.

---

## 4. Trust and Security Model

### 4.1 Boundary Enforcement

- **Principal Authority:** An agent can never exceed the permissions granted by its owning business principal.
- **Mandate Confinement:** An agent cannot trade outside its assigned budget, SKUs, or time window.
- **Deterministic Guards:** Deterministic validation rules enforce all pricing bounds and signature checks. LLMs never make unvalidated financial decisions.

### 4.2 Adversarial Countermeasures

| Attack Vector | Defense Mechanism |
|---|---|
| **Forged Agent Message** | Every wire message requires a valid Ed25519 signature matching the sender's public key. |
| **Replay Attack** | Unique per-message nonces and strict 60-second timestamp validation prevent message replay. |
| **Deceptive Discount** | Quoted unit prices are verified against independent Mandi benchmark price feeds. |
| **Prompt Injection** | Free-text seller notes are strictly quarantined. Decision logic operates only on structured JSON fields. |
| **Collusion / Wash Trading** | Counterparty analysis aggregates at the business principal level. Self-dealing trades are blocked. |

### 4.3 Deal Approval Integrity

The system enforces cryptographic binding on every deal approval:
- The approval challenge binds to a canonical SHA-256 hash of the exact agreed terms: buyer, seller, line items, unit prices, credit terms, and delivery address.
- Any change to the deal terms invalidates the existing challenge and requires re-approval.
- The approval challenge is strictly single-use and short-lived.

---

## 5. Deployment Topology

The system deploys as standard containerized services:

- **PostgreSQL 16:** Relational persistence for identities, agents, catalogues, deals, and audit events.
- **Redis 7:** Ephemeral session storage and pub/sub notifications.
- **FastAPI:** Python backend application on port 8000.
- **Next.js:** Web application and interactive dashboard on port 3000.
- **Telegram Bot Worker:** Python worker process managing Telegram interactions and Mini App webhooks.
