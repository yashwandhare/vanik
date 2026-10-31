# VANIK — Architecture

## 1. Architectural style

Use a modular monolith for the hackathon. One backend owns identity, marketplace, negotiation, trust, deals and events. Web, Telegram Bot and Telegram Mini App are clients of the same API.

## 2. Logical components

1. Identity and Access: human accounts, business principals, memberships and Telegram linking.
2. Verification: simulated business/official-ID checks with explicit demo status.
3. Agent Registry: agent lifecycle, Passport, capabilities and signing keys.
4. Mandate Service: task-specific authority and constraints.
5. Marketplace Registry: seller principals, agent listings, catalogues, inventory and discovery.
6. Agent Runtime: buyer/seller orchestration and tool invocation.
7. Negotiation Engine: message protocol, concurrent rounds, state machine and validation.
8. Trust and Security: signature verification, replay protection, reference prices, injection defence, collusion signals and reputation.
9. Deal Service: matching final acceptance, approval binding and mock UPI.
10. Event/Audit Service: append-only material event history and Decision Replay.
11. Notification Service: Telegram notifications and proactive triggers.

## 3. Runtime flow

1. Human creates account and business principal.
2. Principal completes simulated verification and selects buyer/seller roles.
3. Human links Telegram through a one-time code.
4. Principal creates one or more agents.
5. Agent Registry creates Passport and Ed25519 keypair.
6. Principal creates a task; Mandate Service validates it against principal authority.
7. Buyer agent discovers seller agents from Marketplace Registry.
8. Negotiation Engine concurrently sends signed RFQs.
9. Seller agents apply deterministic policies and return signed structured offers.
10. Trust/Security validates signatures, replay protection, structured terms, benchmark prices and untrusted notes.
11. Buyer evaluates eligible offers and may send anonymised counter-benchmarks in next round.
12. Matching acceptance locks a deal.
13. Deal Service creates approval challenge bound to exact deal version.
14. Human approves via web or Telegram.
15. Mock UPI executes only after server validates approval.
16. Events update marketplace activity, ranking evidence and persistent memory.

## 4. Concurrency

Use asynchronous per-seller negotiation tasks. A seller timeout or malformed response must not cancel other seller negotiations. Apply global and per-principal rate limits. Keep seller-specific state isolated.

## 5. LLM boundary

LLM responsibilities:

- Parse natural-language purchase requests into candidate task fields.
- Ask clarifying questions.
- Generate natural-language negotiation messages.
- Summarise offer differences and explain recommendations from recorded evidence.
- Classify seller free text as commercial note, irrelevant content or suspicious instruction.

Deterministic service responsibilities:

- Validate schema and signatures.
- Enforce mandate/principal authority.
- Validate inventory, prices, budgets, credit and delivery.
- Advance negotiation state.
- Calculate totals and ranking.
- Lock deals and validate approvals.
- Execute mock payment state transition.

LLM output is always untrusted input to deterministic validation.

## 6. UI architecture

Marketplace Web App is the primary visual marketplace. Telegram Bot is conversational. Mini App is a compact structured interface.

For agent-generated surfaces, use a fixed safe component catalogue for P0: `metric`, `card`, `table`, `timeline`, `approval`. Agent output is declarative JSON only. Never execute arbitrary HTML, JavaScript or CSS from an agent. Every action ID maps to a server-defined action and is authorised server-side.

## 7. Deployment topology

Local development:

- PostgreSQL
- Optional Redis
- FastAPI API
- Next.js web app
- Telegram Bot worker

The API and bot worker share database and service modules. Use Docker Compose for infrastructure. Deploy the web app and API to HTTPS-capable hosting for Telegram Mini App testing.
