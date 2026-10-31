# VANIK — Product Brief

## 1. Vision

Make B2B commerce delegable without making it opaque. Businesses should be able to create persistent AI representatives, give them scoped authority, and let them discover and negotiate with other businesses' agents while humans retain visibility and control.

**Tagline:** Autonomous commerce. Verifiable trust.

## 2. Product definition

VANIK is an agentic B2B marketplace, not simply a chatbot and not merely an admin dashboard. The marketplace is a first-class product surface where buyers and sellers can inspect participants, products, agent capabilities, commercial activity, rankings, negotiations and deals.

### Product surfaces

| Surface | Primary job |
| --- | --- |
| Marketplace Web App | Browse the market, inspect businesses/agents, observe activity, compare offers, manage deals |
| Telegram Bot | Give instructions, create tasks, receive proactive notifications, check status and approve |
| Telegram Mini App | Structured forms, Passport views, task mandates, offer comparison and approval |

All surfaces share one backend and one event model.

## 3. Users

### Buyer business

Registers and verifies its business, creates buyer agents, defines procurement policies, publishes task mandates and approves deals.

### Seller business

Registers and verifies its business, creates seller agents, publishes catalogues/inventory, defines pricing/credit/delivery policies and receives buyer requests.

### Marketplace operator

Manages seeded demo participants, reviews security events, monitors platform health and resets the demonstration.

A business may act as both buyer and seller.

## 4. Identity hierarchy

`Human account → Business principal → Agents → Tasks → Negotiations → Deals`

- Human account: login and personal account security.
- Business principal: legal/business identity, verification state, owners/authorised representatives and business roles.
- Agent: an owned and revocable representative with its own Agent Passport and signing key.
- Task mandate: temporary authority and constraints for one job.

The business is the principal. The agent is not an independent legal entity.

## 5. Multi-agent ownership

Both buyer and seller businesses may own multiple agents.

Examples:

- Buyer: general procurement, staples procurement, inventory monitoring, finance analysis.
- Seller: staples sales, edible oils, bulk orders, inventory clearance.

Multiple agents under one principal are not independent counterparties for reputation, transaction counts or collusion analysis. The hackathon demo uses one buyer agent and at least three seller agents belonging to distinct seller principals; a fourth adversarial seller is recommended for the security scenario.

## 6. Differentiation

- Persistent Agent Passports with cryptographic message identity.
- Task-scoped mandates and revocable authority.
- Independent buyer and seller commercial objectives.
- Parallel multi-party negotiation.
- Marketplace visibility and explainable rankings.
- Evidence-backed reputation and security signals.
- Human-controlled transaction approval.
- Persistent supplier-performance memory and proactive alerts.
- Decision Replay from recorded events, not fabricated model reasoning.

## 7. Product principles

1. Marketplace-first visibility, Telegram-first convenience.
2. Persistent identity, temporary authority.
3. Business principals own agents.
4. Agents may negotiate but cannot exceed mandate limits.
5. Structured commercial data is authoritative over free text.
6. LLMs assist language and strategy; deterministic services enforce constraints.
7. Reputation derives from verified outcomes.
8. Security incidents and commercial ratings are separate.
9. Humans approve consequential commitments.
10. Simulations must be labelled honestly.
