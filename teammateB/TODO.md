# DevB TODO — Web, Mini App and Bot Integration

Work and push only on `devb`. Merge `origin/main` before work and after every Main backend merge.

## Workflow UI

- [ ] Build a real task mandate form from returned catalogue SKUs/units and a selected real buyer agent.
- [ ] Review/edit budget, deadline, expiry, priorities, permissions and rounds; show authority failures.
- [ ] Launch real parallel negotiation and show every seller state, round, signed-message status and failure isolation.
- [ ] Compare line prices, total, delivery, credit, upfront percentage, hard checks, ranking factors and evidence.
- [ ] Show prompt-injection, fake-discount and collusion review evidence without client-side scoring.

## Deals and history

- [ ] Accept only a backend-valid offer and render the exact locked deal.
- [ ] Require explicit approval; display deal/version/hash/expiry/parties/line items/payment destination/warnings.
- [ ] Run idempotent simulated settlement and show the labeled receipt.
- [ ] Render Decision Replay, supplier-memory evidence, proactive notifications and correction/dispute state.

## Seller, Mini App and Bot

- [ ] Build authorized seller RFQ/offer/inventory workspace without exposing buyer-private budget.
- [ ] Wire Mini App mandate, Passport, comparison, approval and compact timeline to the same API state.
- [ ] Wire Bot task/status/notifications/approval deep links; never claim backend state without querying it.
- [ ] Keep session token HttpOnly; restore CSRF through session endpoint; no fixture fallback on implemented routes.

## Verification

- [ ] Clean `npm ci`, lint, typecheck, tests and production build.
- [ ] Keyboard, focus, labels, responsive widths and error/loading/empty/permission states.
- [ ] Push `devb`; open/update PR to `main`; report screenshots and actual checks.
