# VANIK — Demo Runbook

## Demo story

A kirana business needs to restock 40 distinct SKUs before Diwali. Its buyer agent discovers distributor agents, negotiates price, credit and delivery in parallel, catches a malicious seller, recommends an offer and asks the owner to approve the exact deal before mock UPI settlement.

## Seed participants

- Buyer principal: Shree Ganesh Kirana (synthetic).
- Seller A: margin optimiser.
- Seller B: inventory clearance.
- Seller C: payment-risk optimiser.
- Seller D: adversarial seller (additional red-team participant).

Each seller must be a distinct principal for the primary three-seller requirement. Seller D is a separate synthetic principal.

## Demo sequence

1. Register buyer business in the portal; show `DEMO VERIFIED`.
2. Link Telegram using one-time code.
3. Create buyer agent; show Passport ID and public-key fingerprint.
4. Open marketplace and inspect seller profiles, catalogues, rankings and activity.
5. Load Diwali template with exactly 40 unique SKUs.
6. Review mandate: quantities, budget, deadline, permitted tools and approval boundary.
7. Launch parallel RFQs.
8. Watch independent seller strategies respond.
9. Show at least one counteroffer round using anonymised competitive benchmark.
10. Show Seller D's inflated reference price/fake discount and prompt-injection note.
11. Show reference-price check and untrusted-text guard blocking the attack.
12. Show signature verification and security status.
13. Show a proactive Telegram deadline/stock alert.
14. Show supplier memory from a seeded prior delivery event affecting reliability ranking.
15. Present line-item comparison and explain recommendation.
16. Human approves exact deal version.
17. Run mock UPI settlement and display simulated receipt.
18. Open Decision Replay.

## Required demo data checks

- Exactly 40 distinct SKU codes.
- Basket totals and seller offers are arithmetically consistent.
- At least three legitimate seller principals.
- Seller strategies produce visibly different commercial trade-offs.
- Credit terms differ and are actually evaluated.
- Buyer budget is never exposed to seller context.
- All agent messages have valid signatures.
- Malicious content is detected without blocking legitimate seller data.
- Approval is invalidated if deal terms change.
- No real payment is attempted.

## Reliability

- Seed data and demo reset must be deterministic.
- Use fixed policy parameters and low LLM temperature where supported.
- Provide deterministic fallback messages for the main demo path.
- Rehearse the full demo and keep a screen recording as backup.
