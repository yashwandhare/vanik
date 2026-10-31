# Marketplace and Catalogue Backend Handoff

This contract pack replaces mock catalogue, seller discovery and inventory views after the backend feature reaches `main`.

## Available endpoints

| Route | Response and behavior |
| --- | --- |
| `GET /v1/catalogue/products` | `ProductListResponse`; `limit` default 40/max 100, `offset`, optional `category` and `query` |
| `GET /v1/marketplace/sellers` | `SellerListResponse`; optional `category`, `coverage`, `min_credit_days`, `max_delivery_days`, `query`; default limit 20/max 100 |
| `GET /v1/marketplace/sellers/{id}` | `SellerProfileResponse`; public business details, agent roster and public policies |
| `POST /v1/principals/{id}/seller-profile` | `SellerProfileRequest` -> `SellerProfileResponse`; session, Origin, CSRF, owner/admin membership and an active verified seller agent required |
| `GET /v1/principals/{id}/agents/{agent_id}/inventory` | `InventoryResponse`; public free-to-sell quantities for a matching active verified seller agent |
| `POST /v1/principals/{id}/agents/{agent_id}/inventory` | `InventoryUpdateRequest` -> `InventoryLineResponse`; session, Origin, CSRF and owner/admin/operator membership required |

Quantity and money values serialize as decimal strings. Public inventory `available_qty` means **on-hand minus reserved**. Internal reserved quantities are not returned. Inventory updates use `stock_qty` for total on-hand stock and cannot reduce stock below an existing reservation (`409`). Viewers cannot update stock (`403`).

Only active, verified seller principals with active, policy-valid agents and current active signing keys are listed. Seller summaries aggregate stock by **principal**, not by individual agent. No private signing material or seller negotiation policy is returned.

## Demo data

`make seed` creates missing synthetic records without overwriting lifecycle state, permission ceilings, passwords or stock reservations:

- Exactly 40 distinct products across staples, edible oils, dry fruits, confectionery and spices.
- One buyer principal/agent and four distinct seller principals/agents.
- Margin, clearance, payment-risk and adversarial seller strategy profiles.
- Five usable synthetic owner accounts.
- 160 seller/product inventory records.

Configure `AGENT_KEY_ENCRYPTION_SECRET` (32+ high-entropy characters) and `DEMO_ACCOUNT_PASSWORD` (12+ synthetic demo-only characters) in the uncommitted backend environment before seeding. No password or private key is printed or returned.

Account emails:

- `buyer-kirana@example.com`
- `seller-margin@example.com`
- `seller-clearance@example.com`
- `seller-risk@example.com`
- `seller-adversarial@example.com`

Seeded IDs are deterministic UUIDs; do not hard-code them in UI flows. Discover sellers and agents through responses. The principal and Agent Passport endpoints remain available to their documented audiences.

New seeded sellers are **unrated** (`reliability_score: null`, evidence count 0) until outcome/memory records are implemented. Do not invent ratings or treat a security restriction as a market rating.

## Client work

1. Replace catalogue arrays with the real product list and render all 40 returned SKUs.
2. Wire seller filters and show returned counts, delivery/credit terms and limited-history state.
3. Wire public inventory using seller principal/agent IDs from discovery.
4. Wire seller stock edits only for an authenticated member; keep `401`/`403`/`404`/`409`/`422` visible.
5. Never fall back to fixtures on an implemented request failure.
6. Task mandates, task-specific ranking, negotiations and approvals will arrive in the next contract pack; do not guess their wire fields.
