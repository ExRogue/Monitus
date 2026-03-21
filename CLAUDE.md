# Monitus — Claude Code Context

**Last updated:** 2026-03-21
**Status:** Feature-complete v1. Production-ready pending Stripe/Resend configuration.

---

## What Is This

Monitus is an AI-powered growth intelligence platform for specialist insurance companies (MGAs, Lloyd's brokers, reinsurers, carriers). Built with Next.js 14 + TypeScript + Vercel Postgres + Anthropic Claude SDK.

Live site: https://www.monitus.ai

---

## Where We Got To

### Sessions completed:
1. **Brand/GTM alignment** — aligned site copy with brand outline, added "See it in action" section, wired contact form to Loops.so
2. **5 rounds of persona stress testing + bug fixes** — 21 + 10 + 10 + 10 + 5 bugs fixed across P0/P1/P2 severity
3. **Infrastructure hardening** — rate limiting, CSRF protection, JWT revocation, encryption at rest, DB migrations
4. **Performance pass** — DB indexes, parallel queries, N+1 loops eliminated
5. **Test infrastructure** — Vitest unit tests + Playwright E2E tests added
6. **P1 features shipped** — LinkedIn direct posting, calendar rescheduling, weekly auto-generate, email distribution, PDF export fixes

### Current state of the backlog (`PERSONA-TEST-REPORT.md`):

**P0 — BLOCKING revenue (must do before launch)**
- [ ] Configure **Stripe** in production env — users cannot upgrade tiers
- [ ] Configure **Resend** in production env — welcome/verification emails fail silently

**P1 — High priority (user retention)**
- [ ] Content approval workflow (compliance sign-off before distribution)
- [x] ~~PDF/Word export~~ — done (wired in latest session)
- [x] ~~Email distribution~~ — done
- [x] ~~News source diversity~~ — done
- [x] ~~Subscription info in /api/auth/me~~ — done

**P2 — Growth features**
- [ ] Team management UI (invite members, set roles)
- [ ] Content calendar drag-and-drop (currently view-only)
- [ ] LinkedIn Analytics pull (import engagement data)
- [ ] Board-ready PDF export with company branding

**P3 — Enterprise (Intelligence tier retention)**
- [ ] SSO/SAML integration
- [ ] API key authentication for programmatic access
- [ ] Webhook notifications for async generation
- [ ] Structured error codes in API responses (`{"error": "...", "code": "REG_001"}`)
- [ ] Public status page

Full detail in `PERSONA-TEST-REPORT.md` — includes all persona feedback and improvement suggestions.

---

## Key Architecture Notes

- **Auth**: JWT stored in httpOnly cookies. Middleware at `src/middleware.ts` protects all `/dashboard/*` and `/api/*` routes.
- **Database**: Vercel Postgres. Schema migrations are in `src/lib/migrations.ts` and run on startup.
- **AI**: Anthropic Claude SDK (`src/lib/generate.ts`). All prompts enforce zero-hallucination rules.
- **Tiers**: Trial (free/7d) → Starter (£500/mo) → Growth (£1,200/mo) → Intelligence (£2,000/mo). Tier gating enforced server-side in API routes.
- **Billing**: Stripe. Webhooks at `/api/webhooks/stripe`. **Not yet configured in production.**
- **Email**: Resend. **Not yet configured in production.**
- **LinkedIn OAuth**: Scaffolded but OAuth flow not yet wired end-to-end.

---

## Running Locally

```bash
npm install
cp .env.example .env.local  # fill in required vars
npm run dev
```

Required env vars: `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`
Optional (feature flags): `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `LINKEDIN_CLIENT_ID/SECRET`

---

## Testing

```bash
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E (requires dev server running)
npm run build         # Type-check + build
```

---

## Docs

All product/technical docs are in `/docs/`:

| File | Contents |
|------|----------|
| `01-PRODUCT-REQUIREMENTS.md` | PRD — features, users, priorities |
| `02-TECHNICAL-ARCHITECTURE.md` | Stack, DB schema, API patterns |
| `03-BUSINESS-MODEL-AND-UNIT-ECONOMICS.md` | Pricing, CAC/LTV |
| `04-API-DOCUMENTATION.md` | Full REST API reference (77 endpoints) |
| `05-SECURITY-AND-COMPLIANCE.md` | Security measures, audit logging |
| `06-GO-TO-MARKET-PLAYBOOK.md` | GTM strategy, positioning, channels |
| `07-OPERATIONAL-RUNBOOK.md` | Deployment, monitoring, incident response |
| `PERSONA-TEST-REPORT.md` | Test results + prioritised backlog |

---

## Immediate Next Steps

1. **Configure Stripe + Resend** in Vercel environment variables — these are the only P0 blockers
2. Pick up the P2 backlog: team management UI is the highest-value feature for retention
3. Complete LinkedIn OAuth end-to-end (client ID/secret env vars are already scaffolded)
