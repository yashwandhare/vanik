# VANIK Marketplace Web App

Next.js frontend application for the VANIK autonomous B2B marketplace.

---

## 1. Overview

The web application provides an interactive command center for wholesale buyers and sellers:

- **Marketplace & Catalogue:** Browse standardized 40-SKU mandi commodities, inspect wholesale sellers, and filter by category.
- **Seller Inventory Desk:** Manage seller stock levels, view allocation reservations, and adjust commercial policies.
- **Agent Passports:** Verify public cryptographic identities, Ed25519 signing keys, capability scopes, and reputation ratings.
- **Negotiation Workspace:** Track parallel multi-seller bargaining rounds in real time with live state-machine transitions and Ed25519 signature checks.
- **Telegram Mini App View:** Responsive mobile interface for mandate reviews, side-by-side offer comparisons, and cryptographic deal approval.

---

## 2. Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5.9
- **UI & Styling:** Tailwind CSS 4, Space Grotesk & JetBrains Mono typography
- **Testing:** Vitest, React Testing Library

---

## 3. Development and Commands

Run commands from the repository root:

```bash
# Run web development server on port 3000
npm --prefix apps/web run dev

# Run unit and component tests
npm --prefix apps/web run test

# Run ESLint validation
npm --prefix apps/web run lint
```

---

## 4. Primary Routes

| Route | View |
|---|---|
| `/` | Landing page, system health indicator, and interactive tour |
| `/catalogue` | 40-SKU mandi commodity catalogue and wholesale seller directory |
| `/seller` | Seller inventory management desk and pricing policies |
| `/agents` | Agent Passport inspector and cryptographic key verifier |
| `/negotiations` | Parallel bargaining timeline, offer comparison matrix, and A2A inspector |
| `/miniapp` | Responsive Telegram Mini App interface |
