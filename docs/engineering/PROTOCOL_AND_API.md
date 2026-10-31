# VANIK — Protocol and API Contracts

## Contract status

Health, registration, principals, verification, Telegram linking and persistent agent identity/lifecycle are implemented. Their schemas are in [`packages/shared-schemas/v1`](../../packages/shared-schemas/v1); see [API conventions](API_CONVENTIONS.md) and the [Agent Passport handoff](../../teammateB/AGENT_PASSPORT_HANDOFF.md).

The negotiation and commerce examples below remain proposals. Identity signing primitives do not yet enforce task mandates, message expiry or nonce/replay checks. All resource identifiers use UUID strings; money uses decimal strings in JSON.

## 1. Message envelope

All agent messages use a canonical envelope similar to:

```json
{
  "message_id": "50000000-0000-4000-8000-000000000001",
  "protocol_version": "vanik.a2a.v1",
  "message_type": "REQUEST_FOR_QUOTE",
  "sender_agent_id": "30000000-0000-4000-8000-000000000001",
  "recipient_agent_id": "30000000-0000-4000-8000-000000000002",
  "sender_principal_id": "20000000-0000-4000-8000-000000000001",
  "negotiation_id": "60000000-0000-4000-8000-000000000001",
  "task_id": "70000000-0000-4000-8000-000000000001",
  "created_at": "2026-10-31T10:00:00Z",
  "nonce": "single-use-random-value",
  "payload": {},
  "payload_hash": "sha256:...",
  "signature": "base64-ed25519-signature"
}
```

The signature covers canonical serialisation of all security-relevant fields except the signature itself. Verify sender-agent ownership and public key before processing. Reject duplicate nonces and expired messages.

## 2. Message types

- `REQUEST_FOR_QUOTE`
- `OFFER`
- `COUNTER_OFFER`
- `ACCEPT`
- `REJECT`
- `WITHDRAW`
- `FINAL_OFFER`
- `EXPIRE`
- `SECURITY_REPORT`

## 3. Offer payload

```json
{
  "offer_id": "80000000-0000-4000-8000-000000000001",
  "currency": "INR",
  "lines": [
    {
      "sku": "RICE-25KG",
      "quantity": 10,
      "unit": "bag",
      "unit_price": "1180.00",
      "discount": "0.00",
      "line_total": "11800.00"
    }
  ],
  "delivery": {
    "date": "2026-11-05",
    "terms": "Delivered to buyer address"
  },
  "payment_terms": {
    "type": "credit_net_15",
    "credit_days": 15,
    "upfront_pct": 20,
    "balance_due_days": 15
  },
  "expires_at": "2026-10-31T11:00:00Z",
  "seller_note": "Optional untrusted free text"
}
```

Allowed payment types should be enumerated and validated. Examples: `advance_upi`, `partial_advance`, `credit_net_7`, `credit_net_15`, `credit_net_30`.

## 4. Negotiation state machine

`created → rfq_sent → offer_received → evaluating → counter_pending → accepted → deal_locked`

Terminal states: `rejected`, `withdrawn`, `expired`, `cancelled`, `invalid`.

Only valid transitions are accepted. Both sides must accept matching final terms before deal lock.

## 5. Suggested API groups

### Auth and registration

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/principals`
- `POST /v1/principals/{principal_id}/identifiers`
- `POST /v1/principals/{principal_id}/verification/demo`
- `POST /v1/telegram/link/start`
- `POST /v1/telegram/link/complete`

### Agents and Passports

- `POST /v1/principals/{principal_id}/agents`
- `GET /v1/principals/{principal_id}/agents`
- `GET /v1/agents/{agent_id}/passport`
- `POST /v1/agents/{agent_id}/revoke`

### Marketplace

- `GET /v1/marketplace/overview`
- `GET /v1/marketplace/sellers`
- `GET /v1/principals/{principal_id}`
- `GET /v1/agents/{agent_id}`
- `GET /v1/marketplace/activity`
- `GET /v1/marketplace/rankings`

### Catalogue and inventory

- `GET /v1/catalogue/products`
- `GET /v1/principals/{principal_id}/inventory`
- `POST /v1/principals/{principal_id}/inventory`

### Tasks and negotiation

- `POST /v1/tasks`
- `GET /v1/tasks/{task_id}`
- `POST /v1/tasks/{task_id}/launch`
- `GET /v1/tasks/{task_id}/negotiations`
- `GET /v1/negotiations/{negotiation_id}`
- `POST /v1/negotiations/{negotiation_id}/counter`
- `POST /v1/negotiations/{negotiation_id}/accept`

### Deals and payments

- `GET /v1/deals`
- `GET /v1/deals/{deal_id}`
- `POST /v1/deals/{deal_id}/approval-challenge`
- `POST /v1/deals/{deal_id}/approve`
- `POST /v1/deals/{deal_id}/mock-settlement`

### Events and replay

- `GET /v1/events`
- `GET /v1/tasks/{task_id}/replay`

## 6. Open Rails mapping (conceptual only)

| VANIK event | Beckn/ONDC-inspired concept |
| --- | --- |
| Discover seller/catalogue | `search` |
| Seller catalogue response | `on_search` |
| Initiate transaction | `init` |
| Confirm transaction | `confirm` |

This is conceptual mapping only. It does not make the prototype ONDC integrated or certified.
