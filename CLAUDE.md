# Monitus — Claude Code Context

**Last updated:** 2026-03-22
**Status:** Production. All infra configured. AI intelligence pipeline live.

---

## What Is This

Monitus is an AI-powered growth intelligence platform for specialist insurance companies (MGAs, Lloyd's brokers, reinsurers, carriers). Built with Next.js 14 + TypeScript + Vercel Postgres + Anthropic Claude SDK.

Live site: https://www.monitus.ai

---

## Where We Got To

### Sessions completed:
1. **Brand/GTM alignment** — site copy, "See it in action" section, contact form to Loops
2. **5 rounds of persona stress testing** — 56 bugs fixed across P0/P1/P2
3. **Infrastructure hardening** — rate limiting, CSRF, JWT revocation, encryption, migrations
4. **Performance pass** — DB indexes, parallel queries, N+1 elimination
5. **Test infrastructure** — Vitest + Playwright
6. **P1 features** — LinkedIn posting, calendar, weekly auto-generate, email distribution, PDF export
7. **Full production setup** — All env vars configured (Stripe, Loops, LinkedIn, Google OAuth, Cron)
8. **AI intelligence pipeline** — Real Claude-powered signal analysis, auto-opportunities, auto-themes, weekly briefings, competitive intel, learning loop. Zero demo data remaining.
9. **60-second onboarding** — Enter website URL → auto-generate narrative → show scored signals + drafted LinkedIn post. No interview required.
10. **Engagement features** — "What You Missed" modal, daily intelligence email (7am cron), one-click LinkedIn publish, live activity counter
11. **US market expansion** — en-US locale toggle, USD pricing auto-detect, 7 US regulatory feeds (NAIC, State DOIs, NIST)
12. **Branded PDF export** — Company logo, colors, cover page on all exports

### Current state of the backlog:

**P0 — ALL DONE**
- [x] ~~Stripe configured~~ — monthly + yearly prices, webhooks active, test mode
- [x] ~~Loops configured~~ — all 9 templates, sending domain active
- [x] ~~LinkedIn OAuth configured~~ — Client ID/Secret set, redirect URL registered
- [x] ~~Login fix~~ — missing company_id column in usage_events crashed DB init

**P1 — Remaining**
- [ ] Content approval workflow (compliance sign-off before distribution)
- [ ] Signal alerts / push notifications (retention — nobody logs in daily without prompts)
- [x] ~~PDF/Word export~~ — done
- [x] ~~Email distribution~~ — done

**P2 — Remaining**
- [ ] Team management UI (invite members, set roles)
- [ ] Content calendar drag-and-drop
- [ ] LinkedIn Analytics pull (import engagement data)
- [x] ~~Board-ready PDF export with company branding~~ — done
- [ ] Deeper competitive monitoring (PR wire feeds, LinkedIn company tracking)
- [ ] Multi-practice area support (for Lloyd's brokers — hidden for single-narrative users)

**P3 — Enterprise**
- [ ] SOC 2 audit (sign up for Vanta, 3-6 month process)
- [x] ~~SSO/SAML~~ — available on Intelligence tier
- [x] ~~API key authentication~~ — done
- [x] ~~Webhooks~~ — done
- [x] ~~Structured error codes~~ — done

---

## Key Architecture Notes

- **Auth**: JWT in httpOnly cookies. Middleware at `src/middleware.ts` protects `/dashboard/*` and `/api/*`.
- **Database**: Vercel Postgres. Schema at **v12**. Migrations in `src/lib/db.ts` via `initDb()` on cold start.
- **Signal Pipeline**: `src/lib/signals.ts` — Claude scores each article against company narrative. Cached in `signal_analyses` table.
- **Onboarding**: `/api/onboarding/quick-start` — SSE-streaming: website scan → auto-narrative → signal check → sample post. 60 seconds, zero questions.
- **AI**: Anthropic Claude SDK. `src/lib/generate.ts` (content), `src/lib/signals.ts` (analysis), `src/lib/opportunities.ts` (auto-opportunities), `src/lib/themes.ts` (auto-themes).
- **Tiers**: Trial (free/14d) → Starter (£500/mo) → Growth (£1,200/mo) → Intelligence (£2,000/mo). Yearly at 20% discount.
- **Billing**: Stripe. Webhooks at `/api/webhooks/stripe`. Monthly + yearly prices configured. Test mode.
- **Email**: Loops.so. All 9 templates configured. Daily intelligence brief cron at 7am UTC.
- **LinkedIn OAuth**: Fully configured. Client ID `78r7qnk70at8p0`. Users connect via Settings → Integrations.
- **Locale**: `en-GB` (default) or `en-US`. Affects content generation spelling, pricing display (£/$ toggle), and feed selection (US regulatory feeds auto-enabled).
- **Key tables**: `signal_analyses`, `opportunities`, `themes`, `weekly_priority_views`, `messaging_bibles`, `generated_content`, `content_distributions`.

---

## Gotchas & Patterns

- **DB schema version**: Bump `SCHEMA_VERSION` in `src/lib/db.ts` when adding migrations. Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for safety.
- **DB init crash = everything breaks**: If `initDb()` throws (e.g., missing column referenced by index), ALL endpoints fail including login. The `getDb()` wrapper retries on failure.
- **Vercel Hobby timeout**: 10s default, 60s with `maxDuration = 60`. AI-heavy routes MUST set maxDuration.
- **Loops reserved fields**: `email` is a contact property — use `senderEmail` for data variables in transactional templates.
- **Don't create test users with fake emails**: Loops sends real emails, they bounce, Loops suspends your domain. Use `@example.com` for testing.
- **NEXT_PUBLIC_ vars must be type `plain`** in Vercel, not `encrypted` — otherwise empty at build time.
- **Claude API costs**: ~$5-50/month per user depending on tier. 98%+ gross margin at all tiers.
- **Rate limiting**: Use `rateLimit()` from `src/lib/validation.ts` on all mutating endpoints. Pattern: `rateLimit('endpoint:${user.id}', limit, windowMs)`.

---

## Running Locally

```bash
npm install
cp .env.example .env.local  # fill in required vars
npm run dev
```

Required env vars: `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`
Optional: `STRIPE_SECRET_KEY`, `LOOPS_API_KEY`, `LINKEDIN_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `CRON_SECRET`

---

## Testing

```bash
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E (requires dev server running)
npm run build         # Type-check + build
npx tsc --noEmit      # Quick type check (src/ errors only matter — test/ errors are pre-existing)
```

---

## Vercel Project

- **Team:** exrogues-projects (`team_5emRLDTueSRqah44xsLeIs1a`)
- **Project:** monitus (`prj_AkapW9y2j2IlUMYXTrinEIbECUUC`)
- **Domain:** www.monitus.ai
- **GitHub:** ExRogue/Monitus (auto-deploys on push to main)

---

## Docs

All product/technical docs are in `/docs/`:

| File | Contents |
|------|----------|
| `01-PRODUCT-REQUIREMENTS.md` | PRD — features, users, priorities |
| `02-TECHNICAL-ARCHITECTURE.md` | Stack, DB schema, API patterns |
| `03-BUSINESS-MODEL-AND-UNIT-ECONOMICS.md` | Pricing, CAC/LTV |
| `04-API-DOCUMENTATION.md` | Full REST API reference (89+ endpoints) |
| `05-SECURITY-AND-COMPLIANCE.md` | Security measures, audit logging |
| `06-GO-TO-MARKET-PLAYBOOK.md` | GTM strategy, positioning, channels |
| `07-OPERATIONAL-RUNBOOK.md` | Deployment, monitoring, incident response |

---

## Immediate Next Steps

1. **Deeper competitive monitoring** — PR wire RSS feeds (Phase A, 3 days), LinkedIn tracking via Google Alerts (Phase B, 1 week)
2. **SOC 2 audit** — Sign up for Vanta, run gap assessment, engage Type I auditor
3. **Content approval workflows** — Enterprise requirement for teams >3
4. **Signal alerts / push notifications** — Retention driver
5. **Multi-practice area support** — For Lloyd's brokers (hidden for single-narrative users)
