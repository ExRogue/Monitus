# Monitus — Technical Architecture Document

**Version**: 1.0
**Date**: 15 March 2026

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONITUS PLATFORM                          │
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  Next.js  │───▶│  Vercel Edge │───▶│  Vercel Serverless   │   │
│  │  Frontend │    │  Middleware   │    │  Functions (API)     │   │
│  │  (React)  │    │  (Auth/CSP)  │    │  57 routes           │   │
│  └──────────┘    └──────────────┘    └──────────┬───────────┘   │
│                                                  │               │
│                     ┌────────────────────────────┼──────┐        │
│                     │                            │      │        │
│              ┌──────▼──────┐  ┌──────────┐  ┌───▼────┐ │        │
│              │  Anthropic  │  │  Stripe   │  │ Neon   │ │        │
│              │  Claude API │  │  Payments │  │Postgres│ │        │
│              │  (Sonnet 4) │  │           │  │  (DB)  │ │        │
│              └─────────────┘  └──────────┘  └────────┘ │        │
│                     │                                    │        │
│              ┌──────▼──────┐  ┌──────────┐              │        │
│              │   Resend    │  │ RSS Feeds │              │        │
│              │   (Email)   │  │ (13 srcs) │              │        │
│              └─────────────┘  └──────────┘              │        │
│                                                          │        │
└─────────────────────────────────────────────────────────┘        │
```

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js | 14.2.35 | Full-stack React framework |
| **Runtime** | Node.js | 20.x | Server-side execution |
| **Language** | TypeScript | 5.x | Type safety |
| **Hosting** | Vercel | Hobby | Serverless deployment |
| **Database** | Neon Postgres | — | Vercel Postgres integration |
| **AI** | Anthropic Claude | Sonnet 4 | Content generation, interviews |
| **Payments** | Stripe | 14.10.0 | Subscription billing |
| **Email** | Resend | 3.0.0 | Transactional email |
| **Auth** | bcryptjs + JWT | — | Password hashing + tokens |
| **RSS** | rss-parser | 3.13.0 | News feed ingestion |
| **PDF** | jsPDF | 2.5.1 | Report export |
| **CSS** | Tailwind CSS | 3.4.1 | Utility-first styling |

---

## 3. Database Schema (22 Tables)

### Core Entities
```
users (id, email, password_hash, name, role, google_id, email_verified, trial_ends_at)
  ├── companies (id, user_id, name, type, niche, brand_voice, brand_tone, compliance_frameworks)
  │     ├── messaging_bibles (id, company_id, target_audiences, competitors, differentiators, messaging_pillars, brand_voice_guide)
  │     ├── generated_content (id, company_id, article_ids, content_type, title, content, compliance_status, pillar_tags)
  │     ├── intelligence_reports (id, company_id, report_type, title, content)
  │     ├── content_distributions (id, content_id, company_id, channel, status, scheduled_at, engagement_*)
  │     ├── competitive_mentions (id, company_id, competitor_name, article_id, sentiment)
  │     ├── voice_edits (id, company_id, content_id, original_text, edited_text)
  │     └── custom_templates (id, company_id, content_type, prompt_template)
  │
  ├── subscriptions (id, user_id, plan_id, status, stripe_subscription_id, period_start/end)
  ├── usage_events (id, user_id, event_type, metadata)
  ├── notifications (id, user_id, type, title, message, read)
  ├── api_keys (id, user_id, name, key_hash, permissions)
  └── team_members (id, company_id, user_id, role)

news_articles (id, title, summary, content, source, source_url [UNIQUE], category, tags, published_at)
subscription_plans (id, name, slug, price_monthly, price_yearly, features, limits_*)
```

### Key Indexes
- `news_articles.source_url` — UNIQUE (prevents duplicate articles)
- `subscriptions.user_id` — Foreign key with cascade
- `generated_content.company_id` — For library queries

---

## 4. Authentication & Security

### Auth Flow
1. Registration: `email + password → bcrypt(12 rounds) → JWT(7 days) → HttpOnly cookie`
2. Login: `email + password → verify bcrypt → JWT → cookie`
3. Google OAuth: `redirect → callback → store google_id → JWT → cookie`

### Cookie Configuration
```
Name: monitus_token
HttpOnly: true
Secure: true (production)
SameSite: lax
MaxAge: 7 days
Path: /
```

### Security Headers (All Responses)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### Input Validation
- `sanitizeString()` — Trims, truncates, strips HTML tags via regex
- `safeParseJson()` — Graceful JSON parsing, returns 400 not 500
- `rateLimit()` — In-memory per-endpoint rate limiting (per serverless instance)
- All SQL queries use parameterized `sql` template literals (no injection risk)

---

## 5. API Architecture

### Route Structure (57 endpoints)

| Domain | Count | Auth | Rate Limit |
|--------|-------|------|-----------|
| Auth | 9 | Public | 5 req/min |
| Admin | 7 | Admin only | 30 req/min |
| Billing | 6 | Protected | 10 req/min |
| Content | 5 | Protected | 30 req/min |
| News | 4 | Protected | 30 req/min |
| Messaging Bible | 4 | Protected | 30 req/min |
| Reports | 4 | Protected | 10 req/min |
| Distribution | 2 | Protected | 20 req/min |
| Team | 3 | Protected | 10 req/min |
| Company | 2 | Protected | 10 req/min |
| Generate | 1 | Protected | 10 req/min |
| Other | 10 | Mixed | Varies |

### Key API Patterns
- All protected routes call `getCurrentUser()` first
- Company-scoped data: Always filters by `company_id` derived from `user_id`
- Tier gating: `checkTierAccess(userId, feature)` → `tierDeniedResponse(gate)` with pricing
- Usage tracking: `trackUsage(userId, eventType, metadata)` after successful operations

---

## 6. AI Integration

### Anthropic Claude API Usage

| Feature | Model | Max Tokens | Calls/Request |
|---------|-------|------------|---------------|
| Content Generation | claude-sonnet-4 | 4,096 + 256 | 1-2 (gen + tag) |
| Narrative Interview | claude-sonnet-4 | 1,500 | 1 per message |
| Positioning Summary | claude-sonnet-4 | 800 | 1 on phase complete |
| Data Extraction | claude-sonnet-4 | 3,000 | 1 on interview complete |
| Pillar Tagging | claude-sonnet-4 | 256 | 1 per content piece |
| Briefing Generation | claude-sonnet-4 | 4,096 | 1 per briefing |
| News Angles | claude-sonnet-4 | 1,000 | 1 per article set |
| Competitive Analysis | claude-sonnet-4 | 2,000 | 1 per scan |

### Fallback Behaviour
When `ANTHROPIC_API_KEY` is not set:
- Content generation uses template-based fallbacks
- Interview uses scripted question sequences
- All features remain functional with reduced quality

---

## 7. Cron Jobs

| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| News fetch | Daily 07:00 UTC | `/api/cron/news` | Fetches from 13 RSS feeds, deduplicates, stores articles |

---

## 8. Infrastructure Limits (Vercel Hobby)

| Limit | Value | Impact |
|-------|-------|--------|
| Function timeout | 10 seconds | Content generation must complete in single call |
| Function memory | 1024 MB | Sufficient for current load |
| Bandwidth | 100 GB/month | Sufficient |
| Serverless executions | 100k/month | Monitor at scale |
| Cron jobs | 1 per day | Only news fetch |
| Build time | 45 minutes | ~30 seconds currently |

### Upgrade Path
- **Vercel Pro** ($20/month): 60s timeout, 5 cron jobs, 1TB bandwidth
- **Vercel Enterprise**: Custom limits, SLA, dedicated support

---

## 9. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `POSTGRES_URL` | Yes | Neon pooled connection |
| `POSTGRES_URL_NON_POOLING` | Yes | Neon direct connection |
| `JWT_SECRET` | Yes | Token signing |
| `ANTHROPIC_API_KEY` | Yes | AI content generation |
| `STRIPE_SECRET_KEY` | For billing | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | For billing | Webhook verification |
| `RESEND_API_KEY` | For email | Transactional email |
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend URL |
| `ADMIN_SEED_PASSWORD` | Yes | Initial admin account |
| `GOOGLE_CLIENT_ID` | For OAuth | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | For OAuth | Google sign-in |

---

## 10. Monitoring & Observability

### Current
- `console.error()` on all catch blocks (visible in Vercel logs)
- Health endpoint: `GET /api/health`
- Vercel built-in analytics

### Recommended
- [ ] Sentry for error tracking
- [ ] Vercel Analytics Pro for performance monitoring
- [ ] Custom dashboard for API cost tracking
- [ ] Uptime monitoring (Pingdom/Better Uptime)
