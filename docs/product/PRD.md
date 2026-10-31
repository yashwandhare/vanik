# VANIK — Product Requirements Document

**Version:** 2.0

**Status:** Scope baseline for implementation

**Track:** AI-02 — Agent-to-Agent Commerce on India's Open Rails

## 1. Executive summary

VANIK is an agentic B2B marketplace. A business registers, supplies business identity details, completes the prototype's simulated verification, connects Telegram and creates one or more AI agents. Each agent receives a persistent Agent Passport and a cryptographic signing identity. When work is assigned, the agent receives a task-specific mandate that defines its objective, commercial constraints and permissions.

Buyer agents discover seller agents and negotiate price, credit terms and delivery in parallel. Seller agents pursue independent objectives such as margin protection, inventory clearance and payment-risk reduction. The marketplace web app exposes participants, catalogues, rankings, live negotiation activity and deals. Telegram provides conversational access and notifications. Humans approve the exact final deal before mock UPI settlement.

## 2. Problem

Small businesses spend time finding suppliers, checking stock, comparing prices, negotiating credit and delivery, and following up on orders. These activities are fragmented across calls, messaging applications and marketplaces. Autonomous agents can reduce this work, but introduce risks around identity, authority, manipulation, false claims and opaque commitments.

VANIK addresses these risks through verified business principals, persistent agent identities, scoped mandates, structured negotiation, deterministic validation, trust signals and human approval.

## 3. Goals

- Create a working agent-to-agent marketplace.
- Let a business register once and own multiple buyer and/or seller agents.
- Provide a marketplace web app as a first-class user interface.
- Provide Telegram Bot and focused Mini App access.
- Demonstrate one buyer agent negotiating with at least three independent seller principals in parallel.
- Handle exactly 40 distinct SKUs in the Diwali restock demo.
- Negotiate price, credit terms and delivery.
- Demonstrate distinct seller strategies.
- Detect and expose fake discounts and prompt injection.
- Demonstrate verifiable agent identity and reputation.
- Provide proactive alerts and cross-session supplier memory.
- Require human approval before mock settlement.
- Make material actions replayable and auditable.

## 4. Non-goals for the hackathon

- Real KYC, Aadhaar/PAN document processing or government database verification.
- Real UPI payments, escrow or custody of funds.
- Full ONDC onboarding, certification or production Beckn interoperability.
- Real Account Aggregator connection.
- Public web crawling/fetch/extract.
- Blockchain identity or decentralised infrastructure.
- Voice commerce or native mobile apps.
- Production-grade fraud/collusion detection.
- Arbitrary executable agent-generated frontend code.

## 5. Personas and roles

### 5.1 Human account

A person who signs in and controls one or more business principals.

### 5.2 Business principal

A registered business identity. A principal can have buyer role, seller role or both. It owns agents and sets maximum authority boundaries.

### 5.3 Buyer business owner

Creates buyer agents, sets procurement rules, monitors sourcing and approves purchases.

### 5.4 Seller business owner

Creates seller agents, manages catalogues/inventory/policies and monitors incoming negotiations.

### 5.5 Marketplace operator

Maintains demo data, reviews security events and resets the demo.

## 6. Registration and verification requirements

### FR-REG-01 — Human account (P0)

- Register/login using email or mobile-based account flow.
- Store account identity separately from business identity.
- Support session expiry and logout.

### FR-REG-02 — Business registration (P0)

- Capture legal/trade name, business type, address, contact details and business roles.
- Support buyer, seller or both.
- Support identifier types appropriate to the business, such as PAN, GSTIN, Udyam Registration Number, CIN/LLPIN where applicable.
- Store only synthetic values in the hackathon demo.

### FR-REG-03 — Simulated verification (P0)

- Display verification states: `not_submitted`, `pending`, `demo_verified`, `rejected`.
- Use seeded mock checks and clear "SIMULATED / DEMO" labels.
- Do not imply official government verification.
- Do not collect real Aadhaar/PAN scans or real identity documents.

### FR-REG-04 — Telegram linking (P0)

- Link a Telegram user to a human account through a short-lived, single-use code.
- Validate the linking token server-side.
- Do not trust a Telegram username alone as proof of account ownership.
- Allow unlink/relink and revoke sessions.

### FR-REG-05 — Business membership and authority (P0)

- Associate human users with principals and roles (owner/admin/operator/viewer).
- Only authorised members can create agents, change policies or approve deals.
- Principal-level authority ceilings cannot be expanded by an agent.

## 7. Agent Passport and agent lifecycle

### FR-AG-01 — Multiple agents per principal (P0 capability)

- A business may create multiple buyer agents and multiple seller agents.
- A business may hold both roles.
- Each agent belongs to exactly one principal.
- Agents can be paused, revoked or rotated.
- Multiple agents under one principal are not independent seller principals.

### FR-AG-02 — Agent Passport (P0)

Each Passport includes:

- Globally unique `agent_id`.
- `principal_id` and business role.
- Human-readable name and description.
- Agent type: buyer or seller.
- Capabilities and tool permissions.
- Public signing key and key fingerprint.
- Verification status inherited from principal, plus agent status.
- Reputation summary based on verified outcomes.
- Trust confidence with evidence/coverage.
- Security status and incident history.
- Created/updated timestamps and lifecycle state.

### FR-AG-03 — Cryptographic identity (P0)

- Use Ed25519 signatures for agent-to-agent messages.
- Sign canonical message content including message ID, sender agent ID, recipient, timestamp, nonce/sequence, negotiation ID and payload hash.
- Verify signatures before processing.
- Reject invalid signatures, expired messages and replayed nonces.
- Keep private keys server-side in the prototype; never expose them to browser or other agents.

### FR-AG-04 — Agent creation (P0)

- Registration portal and marketplace provide an agent creation flow.
- Capture name, role, description, capabilities, strategy profile and allowed tools.
- Generate Passport and signing identity server-side.
- Show the Passport after creation.

### FR-AG-05 — Buyer and seller agent multiplicity

- Product model supports multiple agents for both roles.
- Hackathon orchestration only needs one active buyer agent for the primary demo.
- Seller demo uses at least three legitimate seller agents under distinct principals and may include a fourth adversarial seller.
- Additional buyer agents are represented in the management UI but do not need autonomous orchestration in P0.

## 8. Marketplace web application

The marketplace web app is a first-class P0 interface, not merely an admin dashboard.

### FR-MKT-01 — Marketplace overview (P0)

Show:

- Active buyer and seller agents.
- Registered businesses.
- Live negotiations.
- Offers received.
- Deals awaiting approval.
- Completed simulated transactions.
- Recent marketplace activity and security alerts.

### FR-MKT-02 — Seller discovery (P0)

- Search/filter sellers by category, location/coverage, catalogue, stock, delivery capability and credit terms.
- Distinguish business principal from its agents.
- Display verification state and reputation evidence.

### FR-MKT-03 — Seller/business profile (P0)

Show business details, role, verification status, agent roster, catalogues, inventory, commercial policies (publicly shareable subset), delivery coverage and verified transaction history.

### FR-MKT-04 — Agent profile (P0)

Show Agent Passport, capabilities, principal, public key fingerprint, role, status, trust/reputation and security events appropriate for public visibility.

### FR-MKT-05 — Rankings (P0)

- Rank sellers using task-relevant criteria: price, delivery reliability, credit terms, availability and verified performance.
- Show ranking factors and evidence.
- Do not present an unexplained composite score.
- Do not treat multiple agents from one principal as independent businesses.
- Apply task mandate weights to produce task-specific recommendations.

### FR-MKT-06 — Live marketplace activity (P0)

Show timestamped events such as discovery, RFQ sent, offer received, counteroffer, validation result, security alert, deal locked and payment simulated.

### FR-MKT-07 — Negotiation workspace (P0)

- Show seller-by-seller negotiation state.
- Compare structured offers and line items.
- Show price, credit period, upfront percentage, delivery and availability.
- Show which hard constraints passed/failed.
- Show why the buyer agent ranks an offer higher.
- Keep seller-private data isolated.

### FR-MKT-08 — Deal centre (P0)

Show pending approvals, locked deals, mock UPI status, receipts and historical transactions.

### FR-MKT-09 — Decision Replay (P0)

Render the event history in chronological order. Explain recorded actions and validation outcomes. Do not claim access to hidden chain-of-thought.

### FR-MKT-10 — Seller workspace (P0)

Seller principal users can view their agents, incoming RFQs, submitted offers, catalogue/inventory and performance. They cannot inspect another seller's private negotiations.

## 9. Telegram interfaces

### FR-TG-01 — Telegram Bot (P0)

- Link Telegram identity to principal membership.
- Support natural-language task creation and basic commands.
- Notify users of task progress, offers, security incidents and approval requests.
- Provide deep links to marketplace and Mini App views.
- Support seller notifications for incoming RFQs and expiring offers.

### FR-TG-02 — Telegram Mini App (P0 focused)

Implement only high-value structured views:

- Task mandate review/edit.
- Agent Passport view.
- Offer comparison.
- Deal summary and approval.
- Compact activity timeline.

### FR-TG-03 — Consistent state

Bot, Mini App and web app read/write the same backend state. No separate negotiation or identity implementation per surface.

## 10. Task mandates and agent authority

### FR-TASK-01 — Task creation (P0)

A task mandate includes:

- Task ID and principal ID.
- Agent ID.
- Objective and task category.
- SKU list and quantities.
- Total budget and currency.
- Deadline and delivery requirements.
- Priorities and scoring weights.
- Permitted tools/actions.
- Negotiation limits and maximum rounds.
- Approval requirements.
- Expiry and status.

### FR-TASK-02 — Authority enforcement (P0)

- Every action is checked against both principal authority and task mandate.
- The task cannot expand principal authority.
- Agents cannot approve their own payments.
- Expired/revoked mandates cannot be used.

## 11. Commerce catalogue and 40-SKU basket

### FR-CAT-01 — Catalogue (P0)

Products have SKU, name, category, unit, reference price, active state and optional attributes.

### FR-CAT-02 — Inventory (P0)

Seller inventory tracks available quantity, reserved quantity and last-updated time.

### FR-CAT-03 — Diwali template (P0)

- Seed exactly 40 distinct SKUs.
- Group into staples, edible oils, festive dry fruits, confectionery and spices.
- Each basket line has requested quantity and unit.
- Seller quotes may be grouped for presentation, but final comparison must preserve line-item prices and totals.
- Seeded prices and quantities must make the configured budget feasible and internally consistent.

## 12. Negotiation engine

### FR-NEG-01 — Parallel negotiation (P0)

- Buyer agent sends RFQs to eligible seller agents concurrently.
- Use asynchronous orchestration (e.g. `asyncio.gather`) with per-seller timeout and failure isolation.
- Each seller negotiation maintains its own state.
- The buyer may use the best valid offer from the previous round as an anonymised benchmark in later rounds.
- Do not reveal seller identity-specific confidential data or buyer maximum budget.

### FR-NEG-02 — Seller strategies (P0)

- Margin seller: protects minimum margin and can trade price against volume.
- Clearance seller: prioritises excess/ageing inventory reduction.
- Payment-risk seller: varies credit terms and upfront payment based on a simulated buyer credit credential and risk policy.
- Adversarial seller: attempts fake discount and prompt injection.

### FR-NEG-03 — Structured offer schema (P0)

Offer includes:

- Offer ID, negotiation ID, seller agent/principal IDs.
- SKU line items: quantity, unit price, discount, tax representation if used, line total.
- Delivery date/window and terms.
- Payment terms: type, `credit_days`, `upfront_pct`, balance due timing.
- Offer expiry.
- Free-text note, always treated as untrusted.
- Signature and message metadata.

### FR-NEG-04 — Negotiation messages (P0)

Support `REQUEST_FOR_QUOTE`, `OFFER`, `COUNTER_OFFER`, `ACCEPT`, `REJECT`, `WITHDRAW`, `FINAL_OFFER`, `EXPIRE`, `SECURITY_REPORT`.

### FR-NEG-05 — State machine (P0)

States: `created`, `rfq_sent`, `offer_received`, `evaluating`, `counter_pending`, `accepted`, `deal_locked`; terminal states include `rejected`, `withdrawn`, `expired`, `cancelled`, `invalid`.

### FR-NEG-06 — Deterministic validation (P0)

Validate budget, SKU coverage, stock, seller floor, delivery deadline, allowed payment terms, credit limit, expiry, principal authority and mandate permissions. LLM output cannot bypass validation.

### FR-NEG-07 — Explainable ranking (P0)

Reject hard-constraint failures first. Score valid offers using the mandate's explicit weights, such as price, reliability, delivery and credit. Display score factors and evidence.

## 13. Proactivity and persistent memory

### FR-MEM-01 — Proactive trigger (P0)

Demonstrate at least one scheduled/seeded event that initiates a Telegram alert without a new user prompt, such as approaching Diwali deadline or low stock.

### FR-MEM-02 — Cross-session memory (P0)

Persist verified supplier events and outcomes across tasks. Example: a recorded late delivery influences future reliability ranking.

### FR-MEM-03 — Memory provenance (P0)

Every remembered fact stores source event, timestamp, principal scope and confidence/evidence. Users can inspect and correct disputed records. Do not create hidden model-only memory.

## 14. Trust and security

### FR-SEC-01 — Prompt injection defence (P0)

- Never include buyer maximum budget in seller-facing context.
- Parse commercial terms from structured fields.
- Treat seller free text as untrusted.
- Use a tool-less extraction/classification stage for free text.
- Instructions in seller content must never modify system instructions, tools, mandate or payment authority.

### FR-SEC-02 — Fake discount detection (P0)

- Maintain seeded reference/benchmark prices.
- Compare seller claimed original price and offer price against reference.
- Flag discounts that are inconsistent with trusted benchmark data.
- Display evidence and rule that triggered the flag.

### FR-SEC-03 — Collusion signals (P0 basic)

- Flag suspicious identical floor prices or synchronised counteroffers across distinct seller principals.
- Use this as a review signal, not an automatic finding of collusion.
- Agents owned by the same principal are grouped before cross-seller collusion analysis.

### FR-SEC-04 — Reputation separation (P0)

Keep separate:

- Market rating: verified transaction outcomes.
- Trust confidence: strength/coverage of available evidence.
- Security status: cryptographic and policy incidents.

A security alert does not automatically rewrite market rating.

### FR-SEC-05 — Security event visibility (P0)

Display attack, evidence, detection rule, action taken and seller security status in marketplace activity and Decision Replay.

## 15. Deal approval and mock settlement

### FR-DEAL-01 — Deal lock (P0)

A deal locks only after buyer and seller agents accept matching final structured terms.

### FR-DEAL-02 — Human-readable summary (P0)

Show buyer, seller, products, quantities, total, delivery, payment/credit terms, expiry and relevant trust/security warnings.

### FR-DEAL-03 — Approval binding (P0)

Approval binds to exact deal ID/version, buyer, seller, amount, currency, line items, payment destination, expiry and one-time nonce. Any material change invalidates approval.

### FR-DEAL-04 — Mock UPI (P0)

After valid human approval, run a simulated payment workflow and generate a clearly labelled mock receipt. No real funds move.

## 16. India Open Rails alignment

- UPI: simulated settlement only.
- ONDC/Beckn: map relevant internal lifecycle events to concepts such as `search`, `on_search`, `init`, `confirm`; do not claim ONDC integration or conformance.
- Account Aggregator: use synthetic creditworthiness credential only; do not connect to AA or access actual financial data.
- A2A/MCP: implement a documented subset of structured agent messages and tool interfaces; do not claim full conformance unless tested.

## 17. Non-functional requirements

- Security: least privilege, server-side authorisation, signed agent messages, replay protection.
- Reliability: seller failures/timeouts do not stop other parallel negotiations.
- Auditability: all material events recorded with actor, timestamp, entity and outcome.
- Explainability: ranking and security decisions expose evidence/rules.
- Performance: seeded demo completes predictably; target under 90 seconds for the main negotiation sequence where practical.
- Repeatability: deterministic policies, seeded fixtures, reset command and recorded fallback.
- Privacy: synthetic personal/business data in demo; secrets never committed.
- Usability: key marketplace actions accessible without reading raw logs.

## 18. Demo acceptance criteria

A judge can:

1. Register a demo business and see simulated verification.
2. Link Telegram.
3. Create/view an Agent Passport.
4. Open the marketplace and inspect seller profiles.
5. Launch a 40-distinct-SKU restock mandate.
6. Observe parallel RFQs to at least three distinct seller principals.
7. See at least two negotiation rounds or a clearly explained single-round acceptance when appropriate.
8. Compare price, credit and delivery terms.
9. See the seller strategies behave differently.
10. Observe a malicious seller's fake discount and prompt injection being flagged/blocked.
11. See signed identity verification and security status.
12. Receive a proactive Telegram alert.
13. See a previous supplier event influence a later ranking.
14. Approve the exact deal.
15. See mock UPI settlement and receipt.
16. Inspect Decision Replay.

## 19. Scope priorities

### P0 — Required demo

Registration portal with simulated verification; Telegram linking; multi-agent ownership model; Agent Passport; marketplace web app; focused Bot/Mini App; 40-SKU basket; parallel negotiation; seller strategies; signature verification; fake discount and prompt-injection defence; basic collusion signal; rankings; proactive alert; persistent supplier memory; approval; mock UPI; event log and replay.

### P1 — Valuable extensions

More advanced marketplace analytics, additional buyer-agent orchestration, richer Mini App component system, public web search, more extensive seller discovery, contact exchange and deeper supplier intelligence.

### P2 — Future product

Real KYC, real ONDC/Beckn integration, real AA, real UPI, production fraud detection, voice, native mobile apps, decentralised identity and advanced trust graph.

## 20. Open implementation details

The implementation team must choose concrete providers/libraries and document versions. Do not treat a proposed stack or mock integration as already implemented.
