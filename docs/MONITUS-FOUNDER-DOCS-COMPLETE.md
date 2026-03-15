# MONITUS — Complete Founder Documentation Suite

**Version**: 1.0 | **Date**: 15 March 2026 | **Status**: Live Product

> This document contains 10 sections. In Google Docs, use **Insert → Tab** to split each numbered section into its own tab.

---


---

<!-- NEW TAB: PRODUCT-REQUIREMENTS -->

# Monitus — Product Requirements Document (PRD)

**Version**: 1.0
**Date**: 15 March 2026
**Authors**: Founders
**Status**: Live (v1 shipped)

---

## 1. Product Vision

**Monitus is a growth intelligence platform for specialist insurance companies.** It monitors the market, defines the company's narrative, produces channel-specific content, and learns what works — so insurers, brokers, MGAs, and insurtechs see you consistently saying smart things about their world.

### One-Liner
> "The growth intelligence engine for insurance companies that don't have a 10-person marketing team."

### Problem Statement
Specialist insurance companies (MGAs, brokers, insurtechs, niche carriers) know their market deeply but struggle to communicate that expertise consistently. They either:
- **Hire expensive agencies** that don't understand insurance jargon or regulatory constraints (£5-15k/month)
- **Rely on founders/underwriters** to write content sporadically between their day jobs
- **Do nothing** and lose positioning to competitors who are more visible

### Solution
An AI-powered platform purpose-built for insurance that:
1. **Monitors** insurance news from 13+ RSS feeds (FCA, Insurance Times, Artemis, AM Best, etc.)
2. **Defines** the company's messaging narrative through a conversational brand interview
3. **Produces** compliant, department-targeted content in 6 formats
4. **Distributes** across LinkedIn, email, and trade media channels
5. **Learns** from user edits to improve voice accuracy over time

---

## 2. Target Users

### Primary ICP: Specialist Insurance Marketing Leaders
- **Company size**: 10-2,000 employees
- **Company types**: MGAs, specialty brokers, insurtechs, niche carriers, reinsurers
- **Buyer titles**: Head of Marketing, VP Communications, Managing Director (at smaller firms), CSO
- **Budget**: £500-2,000/month (replaces £5-15k/month agency spend)
- **Geography**: UK-first, expanding to DACH/Nordics

### User Personas

| Persona | Title | Company Size | Key Need | Plan |
|---------|-------|-------------|----------|------|
| Solo Marketer | Head of Marketing | 10-50 | Weekly LinkedIn + newsletter | Starter |
| Content Team Lead | VP Communications | 50-500 | Multi-department content, reports | Growth |
| Strategy Executive | CSO/CMO | 200-2,000 | Competitor intel, board briefings, trade media | Intelligence |
| Technical Founder | CTO/CEO | 5-30 | Replace hiring a content person | Trial → Starter |

---

## 3. Feature Specifications

### 3.1 Narrative Interview (Star Feature ⭐)
**Priority**: P0 — Core differentiator
**Avg user rating**: 5.0/5

A conversational AI interview that extracts brand positioning and voice preferences through natural dialogue. Two phases:
- **Phase A: Positioning Discovery** (5+ exchanges) — Company overview, target audiences, competitors, differentiators, challenges, growth ambitions
- **Phase B: Voice & Tone Discovery** (5+ exchanges) — Tone spectrum (formal↔casual, technical↔accessible, bold↔measured), admired brands, words to use/avoid, content goals

**Output**: Structured messaging bible with target audiences, competitors, differentiators, messaging pillars, brand voice guide. Auto-saved to database on completion.

**API**: `POST /api/messaging-bible/interview`

### 3.2 Content Generation
**Priority**: P0 — Core value
**Avg user rating**: 4.2/5

Generates insurance-industry content from news articles in 6 formats:

| Format | Tiers | Max Tokens | Avg Cost |
|--------|-------|------------|----------|
| Newsletter | All | 4,096 + 256 (tags) | ~$0.08 |
| LinkedIn | All | 4,096 + 256 (tags) | ~$0.08 |
| Podcast script | Growth+ | 4,096 + 256 (tags) | ~$0.08 |
| Email | Growth+ | 4,096 + 256 (tags) | ~$0.08 |
| Briefing (5 formats) | Intelligence | 4,096 + 256 (tags) | ~$0.08 |
| Trade media pitch | Intelligence | 4,096 + 256 (tags) | ~$0.08 |

**Department targeting**: c-suite, underwriting, claims, technology, compliance, operations, marketing, sales — meaningfully changes tone and focus.

**Compliance checking**: Auto-checks against declared compliance frameworks (FCA, PRA, GDPR, Solvency II, TCFD, etc.)

**API**: `POST /api/generate`

### 3.3 News Monitoring (Radar)
**Priority**: P1
**Avg user rating**: 2.8/5

Aggregates insurance news from 13 RSS feeds across 4 tiers:
- **Tier 1 (UK specialty)**: Insurance Times, Insurance Business UK, Insurance Age, FCA
- **Tier 2 (Reinsurance/ILS)**: Reinsurance News, Artemis
- **Tier 3 (General)**: Insurance Journal, Commercial Risk, Carrier Management, AM Best, Reuters Insurance
- **Tier 4 (Podcast)**: The Voice of Insurance

Daily cron at 7 AM UTC. Search via `?q=` or `?search=` parameter.

**API**: `GET /api/news`

### 3.4 Distribution & Scheduling
**Priority**: P1
**Avg user rating**: 3.2/5

Schedule content for publication across channels:
- **LinkedIn**: Draft scheduling (OAuth integration planned)
- **Email**: Newsletter scheduling
- **Trade media**: Pitch scheduling

Tracks engagement metrics (clicks, views, reactions) when manually updated.

**API**: `POST /api/distribution`, `PUT /api/distribution`

### 3.5 Briefing Builder
**Priority**: P2 (Intelligence tier)
**Avg user rating**: 3.5/5

5 briefing formats:
1. **Client Briefing** — For client-facing market updates
2. **Board Pack** — Executive summary with risk/opportunity matrix
3. **Regulatory Alert** — Compliance-focused regulatory changes
4. **Team Update** — Department-specific action items
5. **Meeting Briefing** — Pre-meeting intelligence summaries

**API**: `POST /api/briefing`

### 3.6 Competitor Monitoring
**Priority**: P2 (Intelligence tier)
**Avg user rating**: 2.5/5

Scans news articles for mentions of declared competitors. Currently uses string matching (NLP entity recognition planned).

**API**: `GET /api/competitive`

### 3.7 Reports Dashboard
**Priority**: P2
**Avg user rating**: 3.0/5

Content stats by type, distribution by channel, voice learning stats, usage summary. Sub-reports: monthly, quarterly, recommendations.

**API**: `GET /api/reports`

### 3.8 Content Library
**Priority**: P1
**Avg user rating**: 3.5/5

Central repository of all generated content + briefings. Search, type filter, pagination. Includes content from both `generated_content` and `intelligence_reports` tables.

**API**: `GET /api/content/library`

### 3.9 Voice Learning
**Priority**: P2
**Avg user rating**: N/A (background feature)

When users edit generated content, the original and edited versions are stored as `voice_edits`. These edits train the system to match the user's preferred style over time. Last 100 edits loaded as context for generation.

**API**: `POST /api/content/edit`

### 3.10 Team Management
**Priority**: P2
**Avg user rating**: 4.0/5

Invite team members by email with role-based access (owner, editor, viewer). Limits enforced by tier.

**API**: `POST /api/team/invite`, `POST /api/team/accept`

---

## 4. Technical Constraints

| Constraint | Detail |
|-----------|--------|
| **Vercel Hobby timeout** | 10-second function execution limit. Content generation typically takes 3-7 seconds per piece. Chaining 2+ Claude calls risks timeout. |
| **Serverless cold starts** | First request after idle period takes 1-3 seconds longer |
| **Rate limiting** | In-memory only (per-instance). Not distributed across serverless invocations. |
| **Database** | Vercel Postgres (Neon). Connection pooling via `@vercel/postgres`. |
| **AI model** | Claude Sonnet 4 via Anthropic API. ~$0.08 per content generation call. |
| **RSS parsing** | 5-second timeout per feed. Some feeds may be down/slow. |

---

## 5. Non-Functional Requirements

| Requirement | Target | Current |
|-------------|--------|---------|
| Uptime | 99.5% | Vercel SLA |
| Response time (API) | < 2s (non-AI) | ✅ Met |
| Content generation time | < 10s | ⚠️ Sometimes 7-9s, close to timeout |
| Concurrent users | 100+ | Not load tested |
| Data retention | Indefinite | Indefinite |
| GDPR compliance | Required | Account export + delete implemented |
| FCA content compliance | Auto-checked | ✅ Implemented |

---

## 6. Roadmap

### Phase 1: Foundation (Complete ✅)
- [x] User authentication (email + Google OAuth)
- [x] Narrative interview with 2-phase AI conversation
- [x] Content generation in 6 formats
- [x] News monitoring from 13 RSS feeds
- [x] Tier-based access control with 4 plans
- [x] Stripe billing integration
- [x] Content library with search
- [x] Distribution scheduling
- [x] Briefing builder (5 formats)
- [x] Reports dashboard
- [x] Compliance checking
- [x] Voice learning from edits
- [x] Team management

### Phase 2: Growth (Next 30 days)
- [ ] Custom RSS feed management (user-added sources)
- [ ] LinkedIn OAuth integration (direct posting)
- [ ] Content calendar view (visual timeline)
- [ ] Content versioning with diff view
- [ ] Custom topic generation (from briefs, not just articles)

### Phase 3: Differentiation (30-60 days)
- [ ] FCA compliance rule engine (sentence-level flagging)
- [ ] Bulk content generation (multi-department from one article)
- [ ] Approval workflows
- [ ] Knowledge base upload (company docs as context)
- [ ] A/B headline testing

### Phase 4: Scale (60-90 days)
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Multi-language support (DE, FR, NL)
- [ ] Distributed rate limiting (Vercel KV)
- [ ] Board presentation export (PowerPoint/PDF)
- [ ] Webhook API for async notifications
- [ ] AI-assisted editing (instruction-based rewrites)

### Phase 5: Enterprise (90-180 days)
- [ ] SOC 2 audit logging
- [ ] Multi-region deployment (EU data residency)
- [ ] API versioning (v2)
- [ ] Custom compliance rules
- [ ] White-label embedding
- [ ] SSO/SAML


---

<!-- NEW TAB: TECHNICAL-ARCHITECTURE -->

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


---

<!-- NEW TAB: BUSINESS-MODEL-AND-UNIT-ECONOMICS -->

# Monitus — Business Model & Unit Economics

**Version**: 1.0
**Date**: 15 March 2026

---

## 1. Revenue Model

### Subscription Tiers (GBP)

| Plan | Monthly | Annual | Annual Discount | Target Customer |
|------|---------|--------|----------------|-----------------|
| **Free Trial** | £0 | — | — | Evaluation (14 days) |
| **Starter** | £500/mo | £4,800/yr (£400/mo) | 20% | Solo marketer at MGA/broker |
| **Growth** | £1,200/mo | £11,520/yr (£960/mo) | 20% | Content team at mid-tier insurer |
| **Intelligence** | £2,000/mo | £19,200/yr (£1,600/mo) | 20% | CSO/CMO at top-20 insurer |

### Usage Limits by Tier

| Resource | Trial | Starter | Growth | Intelligence |
|----------|-------|---------|--------|-------------|
| Articles/month | 50 | 100 | Unlimited | Unlimited |
| Content pieces/month | 15 | 15 | 100 | Unlimited |
| Team members | 1 | 1 | 3 | Unlimited |
| Content formats | 2 (newsletter, LinkedIn) | 2 | 5 (+podcast, briefing, email) | 6 (+trade media) |
| Briefing builder | ❌ | ❌ | ❌ | ✅ |
| Competitor monitoring | ❌ | ❌ | ❌ | ✅ |
| Trade media pitches | ❌ | ❌ | ❌ | ✅ |
| Monthly reports | ❌ | ❌ | ✅ | ✅ |
| Quarterly reviews | ❌ | ❌ | ❌ | ✅ |

---

## 2. Claude API Cost Model

*Based on your Google Doc cost analysis:*

### Per-Feature API Costs

| Feature | Max Output Tokens | Est. Cost/Use | Monthly Usage (Active User) | Monthly Cost |
|---------|-------------------|---------------|---------------------------|-------------|
| Narrative Interview | 1,500/call × ~12 calls + 800 summary + 3,000 extract | ~$0.25 | 1-2× | $0.25–$0.50 |
| Narrative Generation | 8,000 | ~$0.15 | 1-2× | $0.15–$0.30 |
| Content Generation | 4,096 + 256 (tags) | ~$0.08 | 8-12× | $0.64–$0.96 |
| Daily Briefing | 3,000 | ~$0.06 | 20× | $1.20 |
| News Angles | 1,000 + 3,000 | ~$0.06 | 4-8× | $0.24–$0.48 |
| Dry Spell Analysis | 1,500 | ~$0.03 | 2-4× | $0.06–$0.12 |
| Competitive Intel | 2,000 | ~$0.04 | 2-4× | $0.08–$0.16 |
| Monthly Report | 4,000 | ~$0.08 | 1× | $0.08 |
| Quarterly Report | 4,000 | ~$0.08 | 0.33× | $0.03 |
| Live Demo | 2,000 | ~$0.04 | Varies | Varies |

### **Estimated Monthly AI Cost Per Active User: $2.50–$4.00** (~£2.00–£3.20)

---

## 3. Unit Economics by Tier

### Starter (£500/mo)

| Item | Monthly Cost |
|------|-------------|
| AI API costs | £3.00 |
| Vercel hosting (pro-rated) | £1.50 |
| Neon Postgres (pro-rated) | £0.50 |
| Stripe fees (2.9% + 20p) | £14.70 |
| Resend email (pro-rated) | £0.20 |
| **Total COGS** | **£19.90** |
| **Gross Profit** | **£480.10** |
| **Gross Margin** | **96.0%** |

### Growth (£1,200/mo)

| Item | Monthly Cost |
|------|-------------|
| AI API costs (heavier usage) | £5.00 |
| Vercel hosting (pro-rated) | £2.00 |
| Neon Postgres (pro-rated) | £1.00 |
| Stripe fees | £35.00 |
| Resend email | £0.50 |
| **Total COGS** | **£43.50** |
| **Gross Profit** | **£1,156.50** |
| **Gross Margin** | **96.4%** |

### Intelligence (£2,000/mo)

| Item | Monthly Cost |
|------|-------------|
| AI API costs (full features) | £8.00 |
| Vercel hosting (pro-rated) | £3.00 |
| Neon Postgres (pro-rated) | £2.00 |
| Stripe fees | £58.20 |
| Resend email | £1.00 |
| **Total COGS** | **£72.20** |
| **Gross Profit** | **£1,927.80** |
| **Gross Margin** | **96.4%** |

---

## 4. Revenue Scenarios

### Conservative (Year 1)

| Month | Trial | Starter | Growth | Intel | MRR | ARR |
|-------|-------|---------|--------|-------|-----|-----|
| 1 | 10 | 2 | 0 | 0 | £1,000 | £12,000 |
| 3 | 25 | 5 | 1 | 0 | £3,700 | £44,400 |
| 6 | 40 | 10 | 3 | 1 | £10,600 | £127,200 |
| 9 | 50 | 15 | 5 | 2 | £17,500 | £210,000 |
| 12 | 60 | 20 | 8 | 3 | £25,600 | £307,200 |

### Moderate (Year 1)

| Month | Trial | Starter | Growth | Intel | MRR | ARR |
|-------|-------|---------|--------|-------|-----|-----|
| 3 | 50 | 8 | 2 | 1 | £8,400 | £100,800 |
| 6 | 80 | 20 | 6 | 3 | £23,200 | £278,400 |
| 12 | 120 | 40 | 15 | 8 | £54,000 | £648,000 |

---

## 5. Key Business Metrics to Track

### Revenue Metrics
- **MRR** (Monthly Recurring Revenue)
- **ARR** (Annual Recurring Revenue)
- **ARPU** (Average Revenue Per User) — Target: £800+/mo
- **Net Revenue Retention** — Target: 110%+ (upgrades outweigh churn)
- **Expansion Revenue** — % from tier upgrades

### Customer Metrics
- **Trial → Paid Conversion** — Target: 15-25%
- **Monthly Churn Rate** — Target: < 3% logo, < 2% revenue
- **Time to Value** — First content generated within 30 minutes
- **NPS** — Target: 40+

### Product Metrics
- **Content pieces generated/user/month**
- **Interview completion rate** — Target: 80%+
- **Content edit rate** — Higher = more voice learning
- **Feature adoption by tier** — Which features drive upgrades

### Cost Metrics
- **AI cost per user per month** — Target: < £5
- **Blended COGS** — Target: < 10% of revenue
- **CAC** (Customer Acquisition Cost)
- **LTV:CAC ratio** — Target: > 3:1

---

## 6. Pricing Strategy Considerations

### Recommended Changes (from testing)

1. **Add a "Startup" tier at £99/mo** — Bridge gap for pre-revenue insurtechs. 20 content pieces, all basic formats, 1 user. Multiple test personas requested this.

2. **Increase Starter content limit to 20** — 15 pieces is too tight for weekly cadence (4 newsletters + 4 LinkedIn = 8/month, leaving only 7 for experiments).

3. **Consider annual-only for Intelligence** — At £2,000/mo, annual commitment (£19,200/yr) provides revenue certainty and reduces churn risk.

### Competitor Pricing Context
- **Full-service insurance PR agency**: £5,000-15,000/month
- **Generic AI writing tools (Jasper, Copy.ai)**: $50-500/month (but no insurance specialisation)
- **Insurance content consultants**: £2,000-5,000/month
- **Monitus value prop**: Agency-quality output at 10-20% of agency cost, with insurance-specific compliance

---

## 7. Fixed Costs (Monthly)

| Item | Cost | Notes |
|------|------|-------|
| Vercel Hosting | £0 (Hobby) → £16 (Pro) | Upgrade when hitting limits |
| Neon Postgres | £0 (Free tier) → £19 (Launch) | Upgrade at ~100 users |
| Anthropic API | Variable | ~£3/user/month |
| Stripe | 2.9% + 20p per transaction | No monthly fee |
| Resend | £0 (100/day free) → £16 (5k/mo) | Upgrade at ~50 users |
| Domain (monitus.ai) | £3/mo amortised | Annual registration |
| **Total fixed (pre-revenue)** | **~£35/mo** | |
| **Total fixed (100 users)** | **~£500/mo** | Excluding AI variable costs |


---

<!-- NEW TAB: API-DOCUMENTATION -->

# Monitus API Documentation

> Comprehensive reference for all 57 API endpoints in the Monitus platform.
> Last updated: March 2026

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Tier System & Feature Gates](#tier-system--feature-gates)
5. [Error Handling](#error-handling)
6. [API Domains](#api-domains)
   - [Auth](#1-auth-9-endpoints)
   - [Account](#2-account-2-endpoints)
   - [Admin](#3-admin-7-endpoints)
   - [Billing](#4-billing-6-endpoints)
   - [Webhooks](#5-webhooks-1-endpoint)
   - [Company](#6-company-4-endpoints)
   - [Messaging Bible](#7-messaging-bible-narrative-6-endpoints)
   - [News](#8-news--pipeline-6-endpoints)
   - [Content Generation](#9-content-generation-6-endpoints)
   - [Content Library & Templates](#10-content-library--templates-6-endpoints)
   - [Distribution](#11-distribution-5-endpoints)
   - [Intelligence & Reports](#12-intelligence--reports-8-endpoints)
   - [Team Management](#13-team-management-4-endpoints)
   - [Notifications](#14-notifications-2-endpoints)
   - [API Keys](#15-api-keys-3-endpoints)
   - [Public API v1](#16-public-api-v1-2-endpoints)
   - [Onboarding](#17-onboarding-2-endpoints)
   - [Demo & Utilities](#18-demo--utilities-4-endpoints)

---

## Architecture Overview

Monitus is a **Next.js 14** application using the **App Router**. All API routes live under `src/app/api/` as `route.ts` files following Next.js conventions.

- **Runtime:** Node.js (Vercel serverless functions)
- **Database:** PostgreSQL via `@vercel/postgres`
- **AI:** Anthropic Claude (claude-sonnet-4-20250514) for content generation, analysis, and interviews
- **Payments:** Stripe (checkout sessions, billing portal, webhooks)
- **Email:** Resend (welcome, verification, password reset, team invites)

---

## Authentication

Monitus uses **JWT-based authentication** via an HTTP-only cookie named `monitus_token`.

| Auth Level | Description |
|-----------|-------------|
| **Public** | No authentication required |
| **Protected** | Requires valid `monitus_token` cookie (any logged-in user) |
| **Admin** | Requires `monitus_token` + user must have `role = 'admin'` |
| **API Key** | Requires `tlm_` prefixed key via `Authorization: Bearer <key>` or `X-API-Key` header |
| **Cron** | Requires `Authorization: Bearer <CRON_SECRET>` header |

The cookie is set on login/register with these properties:
- `httpOnly: true`
- `secure: true` (production)
- `sameSite: lax`
- `maxAge: 7 days`
- `path: /`

---

## Rate Limiting

Rate limiting is applied per-IP or per-user using an in-memory store. Format: `X requests per Y seconds`.

| Category | Limit | Window |
|----------|-------|--------|
| Login | 10 req | 60s (per IP) |
| Register | 5 req | 60s (per IP) |
| Forgot password | 5 req | 300s (per IP) |
| Reset password | 10 req | 300s (global) |
| Content generation | 10 req | 60s (per user) |
| Content editing | 30 req | 60s (per user) |
| Billing checkout | 5 req | 60s (per user) |
| Subscribe | 5 req | 60s (per user) |
| Bible generation | 3 req | 300s (per user) |
| Interview chat | 30 req | 60s (per user) |
| News refresh (admin) | 3 req | 300s (per IP) |
| Monthly report | 3 req | 300s (per user) |
| Quarterly review | 2 req | 600s (per user) |
| Briefing generation | 5 req | 120s (per user) |
| API v1 (articles) | 30 req | 60s (per user) |
| API v1 (generate) | 20 req | 60s (per user) |

---

## Tier System & Feature Gates

Monitus has four subscription tiers, each unlocking progressively more features:

| Tier | Plan ID | Monthly Price | Key Features |
|------|---------|---------------|--------------|
| **Free Trial** | `plan-trial` | Free (7 days) | Newsletter + LinkedIn content only |
| **Starter** | `plan-starter` | £500/mo | Newsletter + LinkedIn, basic limits |
| **Growth** | `plan-professional` | £1,200/mo | All content formats, monthly reports, LinkedIn API, email export |
| **Intelligence** | `plan-enterprise` | £2,000/mo | Briefing builder, competitor monitoring, quarterly reviews, trade media |

### Feature Gate Matrix

| Feature | Trial | Starter | Growth | Intelligence |
|---------|-------|---------|--------|-------------|
| Newsletter + LinkedIn content | Yes | Yes | Yes | Yes |
| Podcast, briefing, email content | No | No | Yes | Yes |
| Monthly intelligence reports | No | No | Yes | Yes |
| LinkedIn distribution tools | No | No | Yes | Yes |
| Email export | No | No | Yes | Yes |
| All content formats | No | No | Yes | Yes |
| Briefing builder | No | No | No | Yes |
| Competitor monitoring | No | No | No | Yes |
| Quarterly positioning reviews | No | No | No | Yes |
| Trade media content | No | No | No | Yes |

Usage is also gated by plan limits on articles viewed, content pieces generated, and team size. When a limit is reached, the API returns `403` with an upgrade prompt.

---

## Error Handling

All endpoints return JSON with consistent error structure:

```json
{
  "error": "Human-readable error message"
}
```

Standard HTTP status codes:

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `302` | Redirect (OAuth flows, email verification) |
| `400` | Bad request / validation error |
| `401` | Not authenticated |
| `403` | Forbidden (wrong role, tier, or usage limit) |
| `404` | Resource not found |
| `429` | Rate limited |
| `500` | Server error |
| `503` | AI service unavailable |

---

## API Domains

---

### 1. Auth (9 endpoints)

#### POST `/api/auth/register`
Create a new account with a 7-day free trial.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | 5/min per IP |

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "name": "Jane Smith"
}
```

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "user" }
}
```

Sets `monitus_token` cookie. Creates a trial subscription (`plan-trial`) with Starter-level access for 7 days. Sends welcome email and email verification link (24h expiry).

**Validation:** Email format, password strength (via `validatePassword`), name sanitisation.

---

#### POST `/api/auth/login`
Authenticate with email and password.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | 10/min per IP |

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "user" }
}
```

Sets `monitus_token` cookie (7-day expiry).

---

#### POST `/api/auth/logout`
Clear the auth session.

| Property | Value |
|----------|-------|
| Auth | Public (cookie-based) |
| Rate limit | None |

**Response (200):**
```json
{ "success": true }
```

Deletes `monitus_token` cookie.

---

#### GET `/api/auth/me`
Get the currently authenticated user.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "user" }
}
```

---

#### POST `/api/auth/forgot-password`
Request a password reset email.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | 5/5min per IP |

**Request body:**
```json
{ "email": "user@example.com" }
```

**Response (200):**
```json
{ "message": "If an account with that email exists, a password reset link has been sent." }
```

Always returns success to prevent email enumeration. Reset token expires in 1 hour.

---

#### POST `/api/auth/reset-password`
Reset password using a token from the reset email.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | 10/5min (global) |

**Request body:**
```json
{
  "token": "hex-token-from-email",
  "password": "NewSecureP@ss123"
}
```

**Response (200):**
```json
{ "message": "Password has been reset. You can now log in." }
```

---

#### GET `/api/auth/verify-email?token=<token>`
Verify a user's email address. Redirects to `/login` with query params.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | None |

**Query params:** `token` (required)

**Redirects to:**
- `/login?verified=true` on success
- `/login?error=expired-token` if expired
- `/login?error=invalid-token` if missing

---

#### GET `/api/auth/google`
Initiate Google OAuth flow. Redirects to Google's consent screen.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | None |

Sets a `google_oauth_state` CSRF cookie (10-min expiry).

---

#### GET `/api/auth/google/callback`
Handle Google OAuth callback. Creates account if new user (with 7-day trial).

| Property | Value |
|----------|-------|
| Auth | Public (OAuth callback) |
| Rate limit | None |

**Query params:** `code`, `state`, `error` (from Google)

Redirects to `/dashboard` on success or `/login?error=<code>` on failure.

---

### 2. Account (2 endpoints)

#### POST `/api/account/delete`
Permanently delete a user account (GDPR-compliant).

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Request body:**
```json
{ "confirmation": "DELETE MY ACCOUNT" }
```

**Response (200):**
```json
{ "message": "Account deleted successfully" }
```

Cascade deletes: subscriptions, content, templates, team members, API keys, notifications, invoices, usage events. Anonymises the user record for audit trail. Clears auth cookie.

---

#### GET `/api/account/export`
Export all user data as JSON (GDPR data portability).

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response:** JSON file download containing user profile, companies, subscriptions, generated content, usage events, notifications, and invoices.

Content-Disposition: `attachment; filename="monitus-data-export-<id>.json"`

---

### 3. Admin (7 endpoints)

All admin endpoints require `role = 'admin'` and return `403` for non-admin users.

#### GET `/api/admin/stats`
Platform-wide usage statistics.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Response (200):** Aggregated platform usage stats from `getUsageStats()`.

---

#### GET `/api/admin/analytics?metric=<metric>`
Detailed analytics by metric type.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Query params:**

| Param | Values | Description |
|-------|--------|-------------|
| `metric` | `user-growth` | Daily user signups (30d) with cumulative totals |
| | `content-generated` | Content by type per day (30d) |
| | `popular-content-types` | All-time content type ranking |
| | `api-usage` | Usage event trends by type (30d) |
| | `subscription-breakdown` | Active subscriptions by plan |

---

#### GET `/api/admin/content`
Get all editable site content with metadata.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Response (200):**
```json
{ "content": { "key": { "value": "...", "default": "...", "updated_at": "..." } } }
```

---

#### PUT `/api/admin/content`
Bulk update site content.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Request body:**
```json
{ "entries": [{ "key": "hero_title", "value": "New Title" }] }
```

---

#### DELETE `/api/admin/content`
Reset a site content key to its default value.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Request body:**
```json
{ "key": "hero_title" }
```

---

#### GET `/api/admin/users?page=1&limit=50`
List all users with pagination.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Query params:** `page` (default 1), `limit` (default 50, max 100)

**Response (200):**
```json
{
  "users": [{ "id": "...", "email": "...", "name": "...", "role": "...", "created_at": "..." }],
  "pagination": { "page": 1, "limit": 50, "total": 120, "pages": 3 }
}
```

---

#### GET `/api/admin/users/:id`
Get detailed user profile with subscription info.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Response (200):**
```json
{
  "user": { "id": "...", "email": "...", "name": "...", "role": "...", "disabled": false, "sub_status": "active", "plan_name": "Growth", "plan_slug": "professional" }
}
```

---

#### PATCH `/api/admin/users/:id`
Update a user's role, status, or subscription.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Request body (all optional):**
```json
{
  "role": "admin",
  "disabled": true,
  "cancelSubscription": true,
  "planSlug": "professional"
}
```

Cannot modify your own account. Returns the updated user object and list of changes applied.

---

#### GET `/api/admin/subscriptions`
List all subscriptions across the platform.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

---

#### PATCH `/api/admin/subscriptions/:id`
Update a specific subscription.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | None |

**Request body (one of):**
```json
{ "status": "cancelled" }
{ "status": "active" }
{ "plan_id": "plan-professional" }
```

---

### 4. Billing (6 endpoints)

#### GET `/api/billing/plans`
List all available subscription plans.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | None |

**Response (200):** Array of plan objects from `getPlans()`.

---

#### POST `/api/billing/checkout`
Create a Stripe checkout session for a plan.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 5/min per user |

**Request body:**
```json
{
  "planSlug": "starter",
  "interval": "monthly"
}
```

| Param | Values |
|-------|--------|
| `planSlug` | `starter`, `professional`, `enterprise` |
| `interval` | `monthly`, `yearly` |

**Response (200):**
```json
{ "url": "https://checkout.stripe.com/..." }
```

---

#### POST `/api/billing/subscribe`
Create a subscription directly (non-Stripe path).

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 5/min per user |

**Request body:**
```json
{ "planId": "plan-starter" }
```

---

#### GET `/api/billing/usage`
Get the current user's usage summary against their plan limits.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):** Usage summary including `articles_used`, `articles_limit`, `content_pieces_used`, `content_pieces_limit`, `users_limit`, and `plan_name`.

---

#### GET `/api/billing/invoices?id=<optional>`
List all invoices or get a specific invoice.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Query params:** `id` (optional, for single invoice)

**Response (200):**
```json
{ "invoices": [{ "id": "...", "amount": 50000, "currency": "GBP", "status": "paid", "invoice_number": "INV-2026-03-abc123", "period_start": "...", "period_end": "..." }] }
```

---

#### POST `/api/billing/portal`
Create a Stripe billing portal session.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{ "url": "https://billing.stripe.com/..." }
```

Requires an active Stripe customer ID. Returns `400` if user has never subscribed via Stripe.

---

### 5. Webhooks (1 endpoint)

#### POST `/api/webhooks/stripe`
Handle Stripe webhook events. Verified via `stripe-signature` header.

| Property | Value |
|----------|-------|
| Auth | Stripe signature verification |
| Rate limit | None |

**Handled events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Creates subscription, invoice, sends confirmation email, creates notification |
| `customer.subscription.updated` | Syncs subscription status, period dates, cancel_at_period_end |
| `customer.subscription.deleted` | Cancels subscription, creates notification |
| `invoice.payment_succeeded` | Creates invoice record |
| `invoice.payment_failed` | Creates billing alert notification |

Idempotent: checks for existing subscription before creating duplicates on `checkout.session.completed`.

---

### 6. Company (4 endpoints)

#### GET `/api/company`
Get the current user's company profile.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{ "company": { "id": "...", "name": "...", "type": "mga", "niche": "...", "description": "...", "brand_voice": "...", "brand_tone": "...", "compliance_frameworks": "[\"FCA\"]" } }
```

Returns `null` if no company exists.

---

#### POST `/api/company`
Create or update the company profile.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 10/min per user |

**Request body:**
```json
{
  "name": "Acme Insurance",
  "type": "mga",
  "niche": "Cyber insurance",
  "description": "Leading MGA specialising in...",
  "brand_voice": "authority",
  "brand_tone": "Confident but accessible",
  "compliance_frameworks": ["FCA", "PRA"]
}
```

| Field | Valid Values |
|-------|-------------|
| `type` | `broker`, `mga`, `insurer`, `reinsurer`, `insurtech`, `other` |
| `brand_voice` | `professional`, `conversational`, `authoritative`, `friendly`, `technical`, `authority`, `challenger`, `advisor`, `insider`, `innovator` |
| `compliance_frameworks` | `FCA`, `PRA`, `State DOI`, `GDPR`, `FTC`, `Solvency II`, `NAIC`, `APRA`, `TCFD` |

Creates the company on first call; updates on subsequent calls (upsert behaviour).

---

#### GET `/api/company/branding`
Get company branding settings (colours, logo).

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{
  "branding": {
    "logo_url": "",
    "primary_color": "#4A9E96",
    "secondary_color": "#7DC4BD",
    "accent_color": "#3AAF7C",
    "custom_css": ""
  }
}
```

---

#### PUT `/api/company/branding`
Update company branding settings.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 10/min per user |

**Request body:**
```json
{
  "logo_url": "https://...",
  "primary_color": "#4A9E96",
  "secondary_color": "#7DC4BD",
  "accent_color": "#3AAF7C",
  "custom_css": ".header { ... }"
}
```

Colours must be valid hex (`#RGB` or `#RRGGBB`). Custom CSS limited to 2,000 characters.

---

### 7. Messaging Bible / Narrative (6 endpoints)

The Messaging Bible (branded as "Narrative") is the core positioning document that drives all content generation.

#### GET `/api/messaging-bible`
Get the current company's messaging bible and company profile.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{
  "bible": { "id": "...", "company_description": "...", "target_audiences": "[]", "competitors": "[]", "differentiators": "[]", "messaging_pillars": "[]", "full_document": "...", "status": "complete" },
  "company": { ... }
}
```

---

#### POST `/api/messaging-bible`
Save structured messaging bible data (from the form wizard).

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Request body:**
```json
{
  "companyDescription": "...",
  "targetAudiences": [{ "name": "...", "role": "...", "painPoints": "..." }],
  "competitors": [{ "name": "...", "difference": "..." }],
  "differentiators": ["..."],
  "keyChallenges": ["..."],
  "departments": [{ "name": "...", "focus": "strategic" }],
  "channels": ["linkedin", "email", "trade_media"],
  "voiceArchetypeId": "authority"
}
```

Creates or updates the bible. Also creates/updates the company profile if needed.

---

#### POST `/api/messaging-bible/generate`
Generate the full Narrative document using AI.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 3/5min per user |

**Request body:**
```json
{ "bibleId": "uuid" }
```

Generates a comprehensive 10-section Narrative document covering: executive summary, brand voice guidelines, elevator pitches, tagline options, ICPs, messaging pillars, department messaging, channel guidelines, competitive differentiation, and do's/don'ts.

Sets bible status to `complete`. Falls back to a template if no Anthropic API key is configured.

---

#### GET `/api/messaging-bible/interview`
Get the current interview session or initial greeting.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{
  "sessionId": "uuid | null",
  "phase": "positioning | voice",
  "messages": [{ "role": "user | assistant", "content": "..." }],
  "status": "active | complete | none",
  "progressHint": "3 of 5 key topics covered",
  "initialGreeting": "Hi there! ..."
}
```

---

#### POST `/api/messaging-bible/interview`
Send a message in the conversational interview flow.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 30/min per user |

**Request body:**
```json
{
  "message": "We're an MGA focused on cyber insurance...",
  "sessionId": "uuid (optional, creates new if omitted)",
  "phase": "positioning | voice (optional)"
}
```

**Response (200):**
```json
{
  "reply": "AI strategist response...",
  "sessionId": "uuid",
  "phase": "positioning | voice",
  "phaseComplete": false,
  "interviewComplete": false,
  "status": "active | complete",
  "progressHint": "Covered: company overview, audience. Still exploring: competition.",
  "extractedData": { ... }
}
```

Two-phase interview:
1. **Positioning Discovery** (min 5 exchanges): Company overview, audiences, competitors, differentiators, challenges
2. **Voice & Tone Discovery** (min 5 exchanges): Tone spectrum, brand inspiration, language preferences, content goals

On completion, automatically extracts structured data and saves a messaging bible draft.

---

#### POST `/api/messaging-bible/upload`
Upload files to extract company information for the bible wizard.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Request:** `multipart/form-data` with `files` field

**Response (200):**
```json
{
  "extractedText": { "companyName": "...", "rawContent": "..." },
  "fileCount": 2
}
```

Extracts basic company info from uploaded text files (brand decks, positioning docs, etc.).

---

### 8. News / Pipeline (6 endpoints)

#### GET `/api/news?q=<query>&category=<cat>&limit=<n>&timeframe=<tf>`
Fetch news articles with optional filtering.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None (usage-tracked) |
| Tier | All tiers (subject to article view limits) |

**Query params:**

| Param | Description |
|-------|-------------|
| `q` / `search` | Full-text search query |
| `category` | Filter by category (default: `all`) |
| `limit` | Results to return (default 20, max 100) |
| `timeframe` | Time-based filter |

Returns `403` when monthly article limit is reached.

---

#### POST `/api/news`
Manually trigger a news feed refresh.

| Property | Value |
|----------|-------|
| Auth | Admin |
| Rate limit | 3/5min per IP |

**Response (200):**
```json
{ "fetched": 42, "errors": [] }
```

---

#### POST `/api/news/angles`
Analyse a single article using the 17 News Values framework, or bulk-score articles for relevance.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 20/min per user |

**Single article analysis:**
```json
{ "articleId": "uuid" }
```

**Response:**
```json
{
  "newsValues": [{ "name": "Impact", "score": 4, "rationale": "..." }, ...],
  "angles": [
    { "type": "contrarian", "headline": "...", "angle": "...", "channel": "linkedin", "spokesperson_quote": "..." },
    { "type": "expert", ... },
    { "type": "newsworthy", ... }
  ],
  "relevanceScore": 75
}
```

**Bulk relevance scoring:**
```json
{ "articleIds": ["uuid1", "uuid2", ...], "scoreOnly": true }
```

**Response:**
```json
{
  "relevanceScores": { "uuid1": "high", "uuid2": "medium", "uuid3": "low" }
}
```

Uses company context and messaging bible for scoring. Falls back to deterministic scoring without Anthropic API key.

---

#### GET `/api/news/bulk?action=bookmarks`
Get bookmarked or dismissed article IDs.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Query params:** `action` = `bookmarks` or `dismissals`

---

#### POST `/api/news/bulk`
Bulk bookmark, unbookmark, dismiss, or undismiss articles.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Request body:**
```json
{
  "action": "bookmark | unbookmark | dismiss | undismiss",
  "articleIds": ["uuid1", "uuid2"]
}
```

---

#### GET `/api/news/dry-spell`
Check for news dry spells and get alternative content suggestions.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 10/min per user |

**Response (200):**
```json
{
  "isDrySpell": true,
  "recentArticleCount": 0,
  "daysSinceLastArticle": 3,
  "suggestions": [
    { "id": "suggestion-1", "type": "evergreen | thought_leadership | event_based | trend_analysis | hot_take", "title": "...", "description": "...", "suggestedChannel": "linkedin" }
  ]
}
```

A "dry spell" is defined as no articles published in the last 3 days. Generates 5 AI-powered content suggestions tailored to the company's positioning.

---

### 9. Content Generation (6 endpoints)

#### POST `/api/generate`
Generate content from selected articles.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 10/min per user |
| Tier | Newsletter + LinkedIn: all tiers. Podcast, briefing, email: Growth+. Trade media: Intelligence. |

**Request body:**
```json
{
  "articleIds": ["uuid1", "uuid2"],
  "contentTypes": ["linkedin", "newsletter", "podcast"],
  "channel": "optional-target-channel",
  "department": "optional-target-department"
}
```

| Content Type | Min Tier |
|-------------|----------|
| `newsletter` | Trial/Starter |
| `linkedin` | Trial/Starter |
| `podcast` | Growth |
| `briefing` | Growth |
| `email` | Growth |
| `trade_media` | Intelligence |

**Limits:** 1-20 articles per request. Subject to monthly content piece limits per plan.

**Response (200):**
```json
{ "content": [{ "id": "uuid", "content_type": "linkedin", "title": "...", "content": "...", "compliance_status": "passed" }] }
```

Tracks usage, creates notifications, and checks usage alert thresholds.

---

#### GET `/api/generate?type=<type>&search=<q>&limit=<n>`
List previously generated content for the current company.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Query params:** `type` (filter by content type), `search` (full-text), `limit` (default 50, max 100)

---

#### POST `/api/briefing`
Generate an intelligence briefing from selected articles.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 5/2min per user |
| Tier | Intelligence only (`briefing_builder` gate) |

**Request body:**
```json
{
  "articleIds": ["uuid1", "uuid2", ...],
  "format": "client_briefing | board_pack | team_update | regulatory_alert | meeting_briefing",
  "notes": { "article-uuid": "Custom analyst note for this article" },
  "meetingContext": {
    "meetingWith": "CEO of Aviva",
    "meetingRole": "Chief Executive",
    "meetingType": "Business development",
    "agendaTopics": "Partnership opportunities",
    "meetingDate": "2026-03-20"
  }
}
```

**Limits:** 1-30 articles per briefing.

**Briefing formats:**
- `client_briefing` -- External-facing, polished client update
- `board_pack` -- Strategic board summary with risk/opportunity matrix
- `team_update` -- Internal operational update with action items
- `regulatory_alert` -- Compliance-focused alert with deadlines
- `meeting_briefing` -- Meeting prep with conversation starters (accepts `meetingContext`)

**Response (200):**
```json
{
  "briefing": { "id": "uuid", "title": "Client Briefing: 15 March 2026", "content": "# markdown...", "format": "client_briefing", "metadata": "...", "created_at": "..." }
}
```

---

#### GET `/api/briefing`
List saved briefings.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Tier | Intelligence only |

**Response (200):**
```json
{ "briefings": [{ "id": "...", "title": "...", "content": "...", "metadata": "...", "created_at": "..." }] }
```

---

#### GET `/api/content` (site content)
Get public site content (CMS values). Used by the marketing site.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | None |

**Response (200):** Key-value map of site content.

---

#### POST `/api/demo/live`
Run a live demo: finds a relevant article and generates LinkedIn + trade media content.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 5/5min per user |

**Request body:**
```json
{
  "companyName": "Acme Insurance",
  "companyType": "mga",
  "niche": "cyber insurance",
  "companyDescription": "...",
  "brandVoice": "authority"
}
```

**Response (200):**
```json
{
  "article": { "id": "...", "title": "...", "summary": "...", "source": "...", "source_url": "..." },
  "linkedinDraft": "Full LinkedIn post text...",
  "tradePitch": "Full trade media pitch text...",
  "relevanceExplanation": "Why this article matters..."
}
```

Searches for articles matching the company's niche, then generates content using AI.

---

### 10. Content Library & Templates (6 endpoints)

#### GET `/api/content/library?type=<type>&search=<q>&limit=<n>`
Browse the content library with filtering and search.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Query params:** `type` (`newsletter`, `linkedin`, `podcast`, `briefing`, `trade_media`, `email`), `search`, `limit` (default 50, max 100)

Includes both generated_content and intelligence_reports (briefings).

---

#### POST `/api/content/edit` / PUT `/api/content/edit`
Edit generated content and record the edit for voice learning.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 30/min per user |

**Request body:**
```json
{
  "content_id": "uuid",
  "edited_text": "Updated content text..."
}
```

**Response (200):**
```json
{
  "message": "Content updated and voice edit recorded",
  "content_id": "uuid",
  "edit_id": "uuid"
}
```

Saves a `voice_edit` record comparing original vs edited text. These edits feed the voice profile learning system.

---

#### POST `/api/content/bulk`
Bulk operations on content items.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Request body:**
```json
{
  "action": "delete | update_status | export",
  "contentIds": ["uuid1", "uuid2"],
  "status": "draft | published"
}
```

For `export` action, returns a CSV file download.

---

#### GET `/api/content/voice-profile`
Analyse all voice edits to build a user's writing preference profile.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 20/min per user |

**Response (200):**
```json
{
  "voice_profile": {
    "preferred_tone": "concise",
    "words_to_use": ["strategic", "innovative"],
    "words_to_avoid": ["synergy", "leverage"],
    "style_notes": ["Prefers concise writing (65% of edits shorten content)", "Prefers active voice (40% of edits convert passive constructions)"],
    "edit_count": 47,
    "common_additions": ["market shift", "client focused"],
    "common_removals": ["going forward", "best in class"],
    "tone_shifts": [{ "from": "verbose", "to": "concise", "frequency": 31 }]
  }
}
```

Analyses up to 200 most recent edits. Detects patterns in: word additions/removals, phrase preferences, tone shifts (formal/casual, concise/detailed), voice preference (active/passive), and sentence length.

---

#### GET `/api/templates`
List custom content templates for the current company.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

---

#### POST `/api/templates`
Create a custom content template.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 10/min per user |

**Request body:**
```json
{
  "name": "Weekly Market Update",
  "content_type": "newsletter",
  "prompt_template": "Generate a market update covering...",
  "variables": ["topic", "audience"]
}
```

---

#### PUT `/api/templates`
Update an existing template.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Request body:**
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "prompt_template": "Updated prompt...",
  "variables": ["topic"]
}
```

---

#### DELETE `/api/templates?id=<uuid>`
Delete a template.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

---

### 11. Distribution (5 endpoints)

#### GET `/api/distribution?status=<s>&channel=<c>&limit=<n>`
List content distributions with analytics.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 30/min per user |

**Query params:** `status` (`draft`, `scheduled`, `published`, `cancelled`), `channel` (`linkedin`, `email`, `trade_media`), `limit` (default 50, max 200)

**Response (200):**
```json
{
  "distributions": [{ "id": "...", "content_id": "...", "channel": "linkedin", "status": "published", "content_title": "...", "engagement_clicks": 42 }],
  "available_content": [{ "id": "...", "title": "...", "content_type": "..." }],
  "analytics": {
    "published_this_month": 12,
    "scheduled_count": 3,
    "total_clicks": 450,
    "total_views": 2100,
    "total_reactions": 89,
    "channel_breakdown": [{ "channel": "linkedin", "count": 8, "clicks": 300, "views": 1500, "reactions": 65 }],
    "best_performing": [{ ... }]
  }
}
```

---

#### POST `/api/distribution`
Schedule or publish content to a channel.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 20/min per user |

**Request body:**
```json
{
  "content_id": "uuid",
  "channel": "linkedin | email | trade_media",
  "scheduled_at": "2026-03-20T09:00:00Z",
  "notes": "For the weekly newsletter"
}
```

If `scheduled_at` is in the past, content is marked as published immediately. Accepts both `scheduled_at` and `scheduled_for`.

---

#### PUT `/api/distribution`
Update a distribution's status, engagement metrics, or metadata.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 30/min per user |

**Request body:**
```json
{
  "id": "uuid",
  "status": "published",
  "external_url": "https://linkedin.com/posts/...",
  "engagement_clicks": 42,
  "engagement_views": 200,
  "engagement_reactions": 15,
  "notes": "Updated notes"
}
```

---

#### GET `/api/distribution/linkedin`
Get LinkedIn posting history.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Tier | Growth+ (`linkedin_api` gate) |

**Response (200):**
```json
{
  "posts": [{ "id": "...", "contentTitle": "...", "contentType": "linkedin", "postedAt": "..." }]
}
```

---

#### POST `/api/distribution/linkedin`
LinkedIn-specific actions: format content, format by ID, or mark as posted.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 30/min per user |
| Tier | Growth+ (`linkedin_api` gate) |

**Format raw content:**
```json
{ "action": "format", "content": "Raw LinkedIn post text with #hashtags..." }
```

**Response:** Formatted content with character count, hashtag optimisation, hook line extraction, and status (`ok`, `warning`, `over_limit`). LinkedIn char limit: 3,000. Optimal: 1,300.

**Format from content ID:**
```json
{ "action": "format_by_id", "content_id": "uuid" }
```

**Mark as posted:**
```json
{ "action": "mark_posted", "content_id": "uuid" }
```

---

### 12. Intelligence & Reports (8 endpoints)

#### GET `/api/reports`
Get a comprehensive reporting dashboard with usage stats, content breakdown, and available reports.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{
  "company": { "id": "...", "name": "...", "niche": "..." },
  "summary": { "total_content_pieces": 150, "plan": "Growth", "usage": { "articles": { "used": 200, "limit": 500 }, "content": { "used": 45, "limit": 100 } } },
  "content_by_type": [{ "content_type": "linkedin", "count": 50, "compliant": 48, "flagged": 2, "this_month": 12, "this_week": 3 }],
  "distribution_by_channel": [...],
  "voice_learning": { "total_edits": 47, "edits_this_month": 12 },
  "available_reports": [...]
}
```

---

#### GET `/api/reports/monthly`
Get the latest monthly intelligence report.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Tier | Growth+ (`monthly_report` gate) |

---

#### POST `/api/reports/monthly`
Generate a monthly intelligence report.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 3/5min per user |
| Tier | Growth+ (`monthly_report` gate) |

Analyses all articles and generated content from the current month. AI generates: executive summary, key market themes, content performance summary, emerging trends, and recommended actions.

**Response (200):**
```json
{
  "report": { "id": "uuid", "report_type": "monthly", "title": "Monthly Intelligence Report: March 2026", "content": "# markdown...", "period_start": "...", "period_end": "...", "metadata": "..." }
}
```

---

#### GET `/api/reports/quarterly`
Get the latest quarterly positioning review.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Tier | Intelligence (`quarterly_review` gate) |

---

#### POST `/api/reports/quarterly`
Generate a quarterly positioning review.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 2/10min per user |
| Tier | Intelligence (`quarterly_review` gate) |

Analyses up to 500 articles and all content from the quarter. AI generates: positioning health score (1-10 across 5 dimensions), messaging pillar alignment analysis, ICP coverage gaps, market shifts, competitor landscape update, and recommended bible updates.

---

#### GET `/api/reports/recommendations?reportId=<uuid>`
Get recommendation action statuses for a report.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

---

#### POST `/api/reports/recommendations`
Update a recommendation's action status.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Request body:**
```json
{
  "reportId": "uuid",
  "recommendationIndex": 0,
  "status": "accepted | dismissed | deferred",
  "notes": "Planning to implement next week"
}
```

---

#### GET `/api/competitive?range=7d|30d|90d`
Competitive intelligence dashboard.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 20/min per user |
| Tier | Intelligence (`competitor_monitoring` gate) |

Scans articles for mentions of the company and its competitors (from messaging bible). Uses AI for sentiment analysis on up to 100 mentions.

**Response (200):**
```json
{
  "competitors": ["Competitor A", "Competitor B"],
  "company_name": "Acme Insurance",
  "share_of_voice": {
    "Acme Insurance": { "count": 15, "positive": 8, "neutral": 5, "negative": 2 },
    "Competitor A": { "count": 10, "positive": 3, "neutral": 6, "negative": 1 }
  },
  "timeline": [{ "date": "2026-03-01", "mentions": { "Acme Insurance": 3, "Competitor A": 1 } }],
  "recent_mentions": [{ "competitor_name": "...", "article_title": "...", "mention_context": "...", "sentiment": "positive" }],
  "article_count": 500,
  "cached": false
}
```

Caches mentions in the `competitive_mentions` table. Subsequent requests return cached data.

---

### 13. Team Management (4 endpoints)

#### GET `/api/team`
List team members and pending invites.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{
  "members": [
    { "id": "owner", "email": "...", "name": "...", "role": "owner" },
    { "id": "uuid", "email": "...", "name": "...", "role": "editor" }
  ],
  "invites": [{ "id": "uuid", "email": "...", "role": "editor", "expires_at": "..." }]
}
```

---

#### DELETE `/api/team?memberId=<uuid>` or `?inviteId=<uuid>`
Remove a team member or cancel a pending invite.

| Property | Value |
|----------|-------|
| Auth | Protected (company owner) |
| Rate limit | None |

---

#### POST `/api/team/invite`
Invite a user to join the team.

| Property | Value |
|----------|-------|
| Auth | Protected (company owner) |
| Rate limit | 10/min per user |

**Request body:**
```json
{
  "email": "colleague@example.com",
  "role": "editor | viewer"
}
```

Checks team size against plan limits (`users_limit`). Sends invitation email with a 7-day expiry token. Prevents duplicate invites.

---

#### GET `/api/team/accept?token=<token>`
Accept a team invite. Redirects after processing.

| Property | Value |
|----------|-------|
| Auth | Public (token-based) |
| Rate limit | None |

**Redirects to:**
- `/dashboard?team=joined` on success
- `/register?invite=<token>&email=<email>` if user doesn't exist yet
- `/login?error=expired-invite` if token expired

---

### 14. Notifications (2 endpoints)

#### GET `/api/notifications?unread=true`
List notifications for the current user.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Query params:** `unread` = `true` (optional, only unread)

**Response (200):**
```json
{
  "notifications": [{ "id": "uuid", "type": "content_generated", "title": "...", "message": "...", "link": "/content", "read": false, "created_at": "..." }],
  "unreadCount": 5
}
```

**Notification types:** `news_update`, `content_generated`, `subscription_changed`, `billing_alert`, `usage_alert`

---

#### POST `/api/notifications`
Mark notifications as read.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Mark specific notifications:**
```json
{ "action": "mark_read", "notificationIds": ["uuid1", "uuid2"] }
```

**Mark all as read:**
```json
{ "action": "mark_all_read" }
```

---

### 15. API Keys (3 endpoints)

API keys provide programmatic access to the v1 API endpoints. Keys use the `tlm_` prefix.

#### GET `/api/keys`
List all API keys for the current user (prefix only, never the full key).

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{
  "keys": [{ "id": "uuid", "name": "Production Key", "key_prefix": "tlm_abc1234...", "permissions": "[\"read\",\"generate\"]", "last_used_at": "...", "revoked_at": null }]
}
```

---

#### POST `/api/keys`
Create a new API key. Returns the full key exactly once.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | 5/min per user |
| Tier | Growth+ (Professional or Enterprise plan required) |

**Request body:**
```json
{ "name": "Production Key" }
```

**Response (200):**
```json
{
  "key": { "id": "uuid", "name": "Production Key", "key": "tlm_abc123...(full key)", "key_prefix": "tlm_abc1234...", "created_at": "..." },
  "message": "Save this API key now. It cannot be shown again."
}
```

Maximum 5 active keys per user.

---

#### DELETE `/api/keys?id=<uuid>`
Revoke an API key.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

---

### 16. Public API v1 (2 endpoints)

These endpoints use API key authentication instead of cookies, enabling programmatic/machine access.

#### GET `/api/v1/articles?category=<cat>&limit=<n>`
Fetch news articles via API key.

| Property | Value |
|----------|-------|
| Auth | API Key (`tlm_` prefix) |
| Rate limit | 30/min per user |

**Headers:** `Authorization: Bearer tlm_...` or `X-API-Key: tlm_...`

**Query params:** `category` (optional), `limit` (default 50, max 100)

**Response (200):**
```json
{
  "articles": [{ "id": "...", "title": "...", "summary": "...", "source": "...", "category": "...", "tags": "...", "published_at": "..." }],
  "count": 50
}
```

---

#### POST `/api/v1/generate`
Generate content via API key.

| Property | Value |
|----------|-------|
| Auth | API Key (`tlm_` prefix) |
| Rate limit | 20/min per user |

**Request body:**
```json
{
  "articleIds": ["uuid1", "uuid2"],
  "contentTypes": ["linkedin", "newsletter"]
}
```

**Valid content types:** `newsletter`, `linkedin`, `podcast`, `briefing`

**Limits:** 1-20 articles. Subject to plan content piece limits.

---

### 17. Onboarding (2 endpoints)

#### GET `/api/onboarding`
Get onboarding checklist progress.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{
  "dismissed": false,
  "steps": [
    { "id": "company", "label": "Set up your company", "href": "/settings", "complete": true },
    { "id": "bible", "label": "Generate your Narrative", "href": "/messaging-bible", "complete": false },
    { "id": "news", "label": "Fetch industry news", "href": "/pipeline", "complete": true },
    { "id": "content", "label": "Create your first content", "href": "/pipeline", "complete": false },
    { "id": "voice", "label": "Review & refine your voice", "href": "/content", "complete": false }
  ],
  "completedCount": 2,
  "totalSteps": 5
}
```

---

#### POST `/api/onboarding`
Dismiss the onboarding checklist.

| Property | Value |
|----------|-------|
| Auth | Protected |
| Rate limit | None |

**Response (200):**
```json
{ "success": true }
```

---

### 18. Demo & Utilities (4 endpoints)

#### GET `/api/health`
System health check.

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | None |

**Response (200 or 503):**
```json
{
  "status": "ok | degraded",
  "timestamp": "2026-03-15T10:00:00Z",
  "database": "connected | disconnected",
  "stripe": "configured | not_configured",
  "resend": "configured | not_configured",
  "anthropic": "configured | not_configured"
}
```

---

#### POST `/api/waitlist`
Join the waitlist (pre-launch).

| Property | Value |
|----------|-------|
| Auth | Public |
| Rate limit | 3/min per IP |

**Request body:**
```json
{
  "email": "user@example.com",
  "company_name": "Acme Insurance",
  "company_type": "mga"
}
```

Deduplicates by email. Returns success even if already on the list.

---

#### GET `/api/cron/news`
Automated news feed fetch (called by Vercel Cron).

| Property | Value |
|----------|-------|
| Auth | Cron (`Bearer CRON_SECRET`) |
| Rate limit | None |
| Max duration | 60s |

**Response (200):**
```json
{
  "success": true,
  "fetched": 42,
  "errors": 0,
  "duration_ms": 3200,
  "timestamp": "2026-03-15T06:00:00Z"
}
```

Notifies all users with company profiles when new articles are fetched.

---

#### POST `/api/demo/live`
Live demo content generation (documented in [Content Generation](#9-content-generation-6-endpoints) section above).

---

## Endpoint Count Summary

| Domain | Endpoints |
|--------|-----------|
| Auth | 9 |
| Account | 2 |
| Admin | 7 (across 5 route files) |
| Billing | 6 |
| Webhooks | 1 |
| Company | 4 |
| Messaging Bible | 6 |
| News / Pipeline | 6 |
| Content Generation | 6 |
| Content Library & Templates | 6 |
| Distribution | 5 |
| Intelligence & Reports | 8 |
| Team Management | 4 |
| Notifications | 2 |
| API Keys | 3 |
| Public API v1 | 2 |
| Onboarding | 2 |
| Demo & Utilities | 4 |
| **Total** | **83 methods across 62 route files** |

> Note: Several route files export multiple HTTP methods (GET + POST, GET + POST + PUT + DELETE, etc.), bringing the total method count above the 57 route file count.


---

<!-- NEW TAB: SECURITY-AND-COMPLIANCE -->

# Monitus Security & Compliance

> Last updated: 2026-03-15
> Platform: [monitus.ai](https://www.monitus.ai) — AI-powered insurance content platform

---

## Table of Contents

1. [Authentication Architecture](#1-authentication-architecture)
2. [Authorization Model](#2-authorization-model)
3. [Data Protection](#3-data-protection)
4. [GDPR Compliance](#4-gdpr-compliance)
5. [FCA & Insurance Regulatory Compliance](#5-fca--insurance-regulatory-compliance)
6. [Security Headers & CSP Policy](#6-security-headers--csp-policy)
7. [Rate Limiting](#7-rate-limiting)
8. [Stripe Payment Security](#8-stripe-payment-security)
9. [Known Security Gaps & Remediation Plan](#9-known-security-gaps--remediation-plan)
10. [Incident Response Procedures](#10-incident-response-procedures)

---

## 1. Authentication Architecture

Monitus supports two authentication methods: email/password credentials and Google OAuth 2.0. Both flows issue a signed JWT stored in an HttpOnly cookie.

### 1.1 Email/Password Authentication

| Aspect | Implementation |
|---|---|
| Hashing algorithm | bcrypt via `bcryptjs` with a cost factor of **12** |
| Token format | JSON Web Token (HS256) |
| Token lifetime | 7 days (`maxAge: 604800s`) |
| Token storage | `monitus_token` HttpOnly cookie, `Secure` in production, `SameSite=Lax` |
| Secret management | `JWT_SECRET` env var; hard-fails in production if unset; dev-only fallback for local development |

**Registration flow** (`/api/auth/register`):
1. Rate-limit check (5 requests/min per IP).
2. Validate email format, password strength, and sanitise name.
3. Check for duplicate email (parameterised query).
4. Hash password with bcrypt (cost 12), store user record.
5. Issue JWT, set HttpOnly cookie.
6. Create 7-day free trial subscription.
7. Send welcome email and verification token (non-blocking).

**Login flow** (`/api/auth/login`):
1. Rate-limit check (10 requests/min per IP).
2. Validate email format.
3. Look up user by email; reject if disabled.
4. Detect Google-only accounts (`password_hash = '__google_oauth__'`) and direct user to OAuth flow.
5. Compare password with bcrypt hash.
6. Issue JWT, set HttpOnly cookie.

**Password reset** (`/api/auth/forgot-password`, `/api/auth/reset-password`):
- Rate-limited (5 requests per 5 minutes per IP for forgot; 10 per 5 minutes global for reset).
- Generates a `crypto.randomBytes(32)` hex token, stored in `password_resets` table.
- Token expires after 1 hour and is single-use.
- Response is always the same to prevent email enumeration.
- New password must pass the same strength validation as registration.

### 1.2 Google OAuth 2.0

| Aspect | Implementation |
|---|---|
| Scopes | `openid email profile` |
| CSRF protection | Random 32-byte state token stored in HttpOnly cookie (`google_oauth_state`, 10-min TTL) |
| Account linking | If the email already exists in the database, the Google ID is linked to the existing account |
| New accounts | Created with `password_hash = '__google_oauth__'` and `email_verified = true` |

**Callback flow** (`/api/auth/google/callback`):
1. Verify CSRF state matches stored cookie value.
2. Exchange authorization code for tokens with Google.
3. Fetch user info from Google's userinfo endpoint.
4. Create or link user account via `googleLogin()`.
5. Set up 7-day trial for new users.
6. Issue JWT, set HttpOnly cookie, clear OAuth state cookie.

### 1.3 Session Management

- `getCurrentUser()` reads the `monitus_token` cookie, verifies the JWT signature, then fetches the user from the database (confirming the account is not disabled).
- Logout deletes the `monitus_token` cookie.
- There is no server-side session store; the JWT is the sole session token.

---

## 2. Authorization Model

Monitus enforces a two-layer authorization model: **role-based** and **tier-based**.

### 2.1 Role-Based Access Control (RBAC)

| Role | Scope |
|---|---|
| `user` | Default role assigned at registration. Standard platform access. |
| `admin` | Full platform access including user management, content management, and admin dashboard features. |

- Roles are stored in the `users.role` column.
- `isAdmin()` checks the role at the database level (not from the JWT claims).
- `setUserRole()` allows admin-level role changes.

### 2.2 Tier-Based Access Control

Features are gated by subscription tier via `checkTierAccess()` in `src/lib/tier-gate.ts`.

**Tier hierarchy** (lowest to highest):

| Tier ID | Display Name | Monthly Price |
|---|---|---|
| `plan-trial` | Free Trial | Free (7 days) |
| `plan-starter` | Starter | £500/mo |
| `plan-professional` | Growth | £1,200/mo |
| `plan-enterprise` | Intelligence | £2,000/mo |

**Feature gating map:**

| Feature | Minimum Tier |
|---|---|
| `briefing_builder`, `competitor_monitoring`, `quarterly_review`, `trade_media` | Intelligence |
| `monthly_report`, `linkedin_api`, `email_export`, `daily_monitoring`, `all_content_formats` | Growth |
| All other features | Ungated (available on all tiers) |

Access check logic: the user's current tier index is compared against the required tier index in the hierarchy array. Features not present in the gating map are implicitly allowed.

### 2.3 Middleware-Level Protection

The Next.js middleware (`src/middleware.ts`) enforces authentication at the edge:

- **Public paths** (login, register, forgot-password, reset-password, billing plans, webhooks, health checks, etc.) are accessible without authentication.
- **Protected paths**: if no `monitus_token` cookie is present, API routes return `401 Unauthorized` and page routes redirect to `/login` with a `redirect` query parameter.
- All responses (public and protected) receive security headers.

### 2.4 Team-Level Access

The database schema supports team-level access via `team_members` and `team_invites` tables:
- Team members have roles (`editor` by default).
- Invitations use unique tokens with expiry timestamps.
- Companies are scoped to their owning user via `companies.user_id`.

---

## 3. Data Protection

### 3.1 SQL Injection Prevention

All database queries use **parameterised queries** via Vercel Postgres tagged template literals (`sql\`...\``). User input is never interpolated into query strings. Examples:

```
sql`SELECT * FROM users WHERE email = ${email}`
sql`INSERT INTO users (id, email, ...) VALUES (${id}, ${email}, ...)`
```

This approach ensures that all values are passed as query parameters, not string-concatenated.

### 3.2 Input Validation & Sanitisation

Defined in `src/lib/validation.ts`:

| Function | Purpose |
|---|---|
| `isValidEmail()` | Regex-based email format check; max 254 characters |
| `validatePassword()` | Enforces: 8-128 chars, at least one uppercase, one lowercase, one digit |
| `sanitizeString()` | Strips HTML tags, trims whitespace, enforces max length (default 500) |
| `sanitizeName()` | Calls `sanitizeString()` with 100-char limit |
| `escapeHtml()` | Encodes `& < > " '` for safe HTML output |
| `safeParseJson()` | Wraps `request.json()` in try/catch to prevent crashes from malformed bodies |

### 3.3 XSS Prevention

- React's JSX auto-escapes output by default.
- `sanitizeString()` strips `<tags>` from user input before storage.
- `escapeHtml()` is available for contexts where manual escaping is needed.
- Content Security Policy headers restrict script and style sources (see section 6).

### 3.4 CSRF Protection

- Authentication cookies use `SameSite=Lax`, which prevents cross-site form submissions from sending the cookie.
- Google OAuth uses a dedicated CSRF state token validated on callback.
- Stripe webhooks use signature verification (see section 8).

### 3.5 Sensitive Data Handling

- Passwords are never stored in plaintext; only bcrypt hashes (cost factor 12).
- Google OAuth accounts store a sentinel value (`__google_oauth__`) instead of a password hash.
- API keys are stored as hashes (`api_keys.key_hash`) with only a prefix retained for display (`key_prefix`).
- JWT secrets and Stripe keys are environment variables, never committed to source.
- Error messages in authentication routes are generic ("Invalid email or password") to prevent information leakage.

### 3.6 Database Schema Security

- Foreign key constraints enforce referential integrity (e.g., `subscriptions.user_id REFERENCES users(id)`).
- Unique constraints prevent duplicate entries (e.g., `users.email`, `subscription_plans.slug`, `invoices.invoice_number`).
- The `disabled` flag on users prevents login and API access without deleting the record.
- Password reset tokens are single-use (`used BOOLEAN`) with expiry timestamps.

---

## 4. GDPR Compliance

### 4.1 Data Subject Rights Implementation

**Right of Access / Data Portability** (`/api/account/export`):
- Authenticated users can download a complete JSON export of their data.
- Export includes: user profile, companies, subscriptions, generated content, usage events, notifications, and invoices.
- Served as a downloadable `application/json` file with `Content-Disposition: attachment`.

**Right to Erasure** (`/api/account/delete`):
- Requires explicit confirmation: user must submit `"DELETE MY ACCOUNT"` as the confirmation string.
- Deletion process:
  1. Disables the user account immediately.
  2. Cancels all active subscriptions.
  3. Deletes company-scoped data: generated content, custom templates, team members, team invites.
  4. Deletes user-scoped data: article actions, API keys, password resets, email verifications, notifications, usage events, usage alerts, invoices, subscriptions, companies.
  5. Anonymises the user record (email replaced with `deleted-{id}@deleted.monitus.ai`, name set to "Deleted User", password hash set to "DELETED").
  6. Clears the authentication cookie.
- The user record is retained in anonymised form for audit trail purposes.

### 4.2 Consent & Legal Basis

- The platform provides a Privacy Policy page (`/privacy`) and Terms of Service page (`/terms`).
- Email verification is implemented (token-based, 24-hour expiry).
- Registration constitutes consent for account creation and trial subscription.

### 4.3 Content-Level GDPR Checks

The compliance engine (`src/lib/compliance.ts`) includes GDPR-specific rules applied to generated insurance content:

- **Unsubscribe Mechanism** (`gdpr-unsubscribe`): Warns if newsletter/email content lacks unsubscribe language.
- **PII Check** (`gdpr-pii`): Detects email addresses and UK phone numbers in generated content; filters out generic template addresses.

### 4.4 Data Retention

- Password reset tokens expire after 1 hour.
- Email verification tokens expire after 24 hours.
- Google OAuth state cookies expire after 10 minutes.
- Free trial subscriptions expire after 7 days.
- Deleted accounts are anonymised, not hard-deleted, preserving the audit trail while removing personal data.

### 4.5 Known GDPR Gaps

- No automated data retention policy for expired tokens or stale usage events.
- No cookie consent banner for tracking/analytics cookies (if any are added in future).
- No Data Processing Agreement (DPA) template for enterprise customers.
- Data export does not include messaging bibles, interview sessions, or voice edits (these are associated via company, not directly queried in the export).

---

## 5. FCA & Insurance Regulatory Compliance

Monitus includes a built-in compliance engine specifically designed for insurance content. This is a key differentiator: all AI-generated content is checked against regulatory frameworks before publication.

### 5.1 Compliance Engine Architecture

The engine is defined in `src/lib/compliance.ts` and applies rule-based checks against content text. Each rule has:
- A **framework** (FCA, State DOI, GDPR, FTC, Quality).
- A **severity** level: `error` (blocks approval), `warning` (flags for review), or `info` (advisory).
- A **check function** that analyses content and returns pass/fail with a message.
- An overall **compliance score** (percentage of passed checks).

### 5.2 FCA (UK Financial Conduct Authority) Rules

| Rule | Severity | Description |
|---|---|---|
| Fair, Clear and Not Misleading | Error | Detects phrases like "guaranteed returns", "risk-free", "cannot lose" per COBS 4.2 |
| Regulatory Disclaimer Present | Warning | Checks for FCA disclaimer or "informational purposes" language |
| Balanced Presentation | Warning | Ensures benefits are balanced with risk context |
| Consumer Duty Alignment | Info | Checks for client/customer/policyholder-focused language |

### 5.3 US State DOI Rules

| Rule | Severity | Description |
|---|---|---|
| Unfair Trade Practices Check | Error | Detects "best price guaranteed", "lowest rates", "cheapest coverage" |
| Proper Disclosure | Warning | Checks for informational/not-a-solicitation disclosure |

### 5.4 FTC (US Federal Trade Commission) Rules

| Rule | Severity | Description |
|---|---|---|
| Endorsement Disclosure | Warning | Detects testimonials/endorsements without paid/sponsored disclosure |

### 5.5 Quality Checks

| Rule | Severity | Description |
|---|---|---|
| No Speculative Claims | Warning | Flags unhedged predictive language ("will definitely", "guaranteed to") |

### 5.6 Content Compliance Workflow

1. Content is generated by the AI engine.
2. The compliance engine runs all rules for the user's selected frameworks.
3. Content receives a `compliance_status` (`pending`, `pending_review`, `approved`).
4. If any `error`-severity rule fails, the content cannot be auto-approved.
5. Users can review compliance notes and address flagged issues before publishing.
6. Companies can configure their applicable compliance frameworks via the settings page (`compliance_frameworks` field).

### 5.7 Available Frameworks

| Framework | Jurisdiction | Description |
|---|---|---|
| FCA | UK | Financial Conduct Authority insurance regulation |
| State DOI | US | State Department of Insurance regulation |
| GDPR | EU/UK | General Data Protection Regulation |
| FTC | US | Federal Trade Commission advertising standards |

---

## 6. Security Headers & CSP Policy

All responses are processed through `addSecurityHeaders()` in the Next.js middleware.

### 6.1 Headers Applied

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframes |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter (for older browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unnecessary browser APIs |

### 6.2 Content Security Policy

```
default-src 'self';
script-src  'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com;
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com;
font-src    'self' https://fonts.gstatic.com;
img-src     'self' data: blob: https:;
connect-src 'self' https://api.stripe.com https://accounts.google.com https://oauth2.googleapis.com;
frame-src   https://js.stripe.com https://accounts.google.com;
```

**Notable policy decisions:**
- `unsafe-inline` and `unsafe-eval` are allowed for scripts due to Next.js runtime requirements and Google's OAuth library. This is a known trade-off (see section 9).
- `img-src` allows `https:` broadly to support external images in news articles.
- `connect-src` is restricted to self, Stripe API, and Google OAuth endpoints.
- `frame-src` allows only Stripe's payment iframe and Google's sign-in iframe.

---

## 7. Rate Limiting

### 7.1 Current Implementation

Rate limiting is implemented as an **in-memory token bucket** in `src/lib/validation.ts`.

```
rateLimit(key: string, maxRequests: number, windowMs: number)
```

| Endpoint | Key | Max Requests | Window |
|---|---|---|---|
| Login | `login:{ip}` | 10 | 60 seconds |
| Registration | `register:{ip}` | 5 | 60 seconds |
| Forgot Password | `forgot-password:{ip}` | 5 | 5 minutes |
| Reset Password | `reset-password` (global) | 10 | 5 minutes |
| Checkout | `checkout:{userId}` | 5 | 60 seconds |
| Subscribe | `subscribe:{userId}` | 5 | 60 seconds |

### 7.2 Memory Management

A cleanup interval runs every 5 minutes (`setInterval`) to remove expired entries from the rate limit map, preventing unbounded memory growth.

### 7.3 Known Limitations

- **Per-instance only**: On Vercel's serverless architecture, each function instance maintains its own in-memory map. A determined attacker can bypass limits by hitting different instances.
- **No distributed state**: There is no Redis or external store backing the rate limiter.
- **IP-based keying**: The `x-forwarded-for` header is used, which can be spoofed in some configurations (Vercel's edge network mitigates this somewhat).
- **No progressive backoff**: Failed login attempts do not trigger escalating lockout periods.

See section 9 for the remediation plan.

---

## 8. Stripe Payment Security

### 8.1 Architecture

Monitus uses Stripe Checkout (hosted payment page) rather than collecting card details directly. This means:

- **No card data touches Monitus servers.** All payment details are collected by Stripe's PCI-DSS Level 1 certified infrastructure.
- Checkout sessions are created server-side via the Stripe SDK.
- The Stripe Customer Portal is used for subscription management (card updates, cancellations, invoice history).

### 8.2 Webhook Verification

The Stripe webhook endpoint (`/api/webhooks/stripe`) verifies every incoming event:

1. Reads the raw request body as text (not parsed JSON).
2. Extracts the `stripe-signature` header.
3. Calls `stripe.webhooks.constructEvent(body, signature, webhookSecret)` which validates the HMAC-SHA256 signature using the `STRIPE_WEBHOOK_SECRET` environment variable.
4. Rejects the request with `400` if the signature is missing or invalid.

### 8.3 Webhook Event Handling

| Event | Action |
|---|---|
| `checkout.session.completed` | Creates subscription record, generates invoice, sends confirmation email. Includes idempotency check (skips if `stripe_subscription_id` already exists). |
| `customer.subscription.updated` | Syncs subscription status, cancellation flag, and billing period dates. |
| `customer.subscription.deleted` | Marks subscription as cancelled, notifies user. |
| `invoice.payment_succeeded` | Creates invoice record in the database. |
| `invoice.payment_failed` | Sends notification to user to update payment method. |

### 8.4 PCI Compliance

- **PCI-DSS scope**: Monitus is out of scope for PCI-DSS because card data never enters our systems. Stripe Checkout handles all card collection.
- **SAQ A eligible**: As a merchant using only hosted payment pages (Stripe Checkout) and iframes (Stripe.js), Monitus qualifies for the simplest PCI self-assessment questionnaire.
- Stripe API keys are stored as environment variables and never exposed to the client.
- The CSP `frame-src` directive restricts payment iframes to `https://js.stripe.com`.

---

## 9. Known Security Gaps & Remediation Plan

### Priority 1 — High (target: next 30 days)

| Gap | Risk | Remediation |
|---|---|---|
| CSP allows `unsafe-inline` and `unsafe-eval` | Weakens XSS protection | Migrate to nonce-based CSP. Requires Next.js configuration changes to inject nonces into inline scripts. |
| Rate limiting is per-instance only | Brute-force attacks can bypass limits across serverless instances | Implement Redis-backed rate limiting via Vercel KV or Upstash Redis. |
| No account lockout after repeated failures | Credential stuffing risk | Add progressive lockout: 5 failures = 15-min lock, 10 failures = 1-hour lock, with email notification. |
| JWT has no revocation mechanism | Compromised tokens remain valid for 7 days | Implement a token blocklist (Redis) or reduce token lifetime and add refresh token rotation. |

### Priority 2 — Medium (target: next 60 days)

| Gap | Risk | Remediation |
|---|---|---|
| No CSRF token on state-changing POST endpoints | SameSite=Lax mitigates this for cross-origin, but same-site attacks are possible | Add a synchroniser token pattern or double-submit cookie for sensitive operations. |
| Data export incomplete | Missing messaging bibles, interview sessions, voice edits, content distributions | Extend `/api/account/export` to query all company-associated tables. |
| No audit logging | Difficult to investigate security incidents | Implement an append-only `audit_log` table recording auth events, role changes, data access, and admin actions. |
| No MFA / 2FA support | Single-factor authentication for email/password users | Add TOTP-based 2FA (Google Authenticator, Authy) with backup codes. |
| `img-src https:` is overly broad | Could allow image-based tracking or content injection | Restrict to known image sources or proxy external images. |

### Priority 3 — Low (target: next 90 days)

| Gap | Risk | Remediation |
|---|---|---|
| No automated token/data cleanup | Expired tokens accumulate in the database | Add a scheduled job (Vercel Cron) to purge expired password resets, email verifications, and OAuth state entries. |
| No Data Processing Agreement template | Enterprise customers may require DPAs for GDPR compliance | Create a standard DPA document and make it available in settings. |
| No cookie consent mechanism | May be required if analytics/tracking cookies are added | Implement a cookie consent banner with granular opt-in. |
| Compliance engine uses keyword matching only | May miss subtle regulatory violations or produce false positives | Enhance with AI-powered compliance analysis using LLM review of content against full regulatory text. |
| No penetration testing programme | Unknown vulnerabilities may exist | Engage a third-party security firm for annual penetration testing. |

---

## 10. Incident Response Procedures

### 10.1 Severity Classification

| Level | Description | Examples | Response Time |
|---|---|---|---|
| **SEV-1 Critical** | Active data breach or complete service compromise | Database credentials leaked, mass data exfiltration, authentication bypass | Immediate (< 1 hour) |
| **SEV-2 High** | Significant vulnerability with no evidence of exploitation | SQL injection discovered, XSS in production, exposed API keys | < 4 hours |
| **SEV-3 Medium** | Vulnerability with limited impact or partial mitigation in place | Rate limiting bypass, information disclosure in error messages | < 24 hours |
| **SEV-4 Low** | Minor issue or hardening opportunity | Missing security header on a non-sensitive endpoint, dependency with known low-severity CVE | < 1 week |

### 10.2 Response Workflow

**Detection & Triage**
1. Alert received (monitoring, user report, dependency scan, or Vercel deployment log).
2. On-call engineer assesses severity using the classification above.
3. Create incident record with timestamp, reporter, and initial assessment.

**Containment**
- **SEV-1/2**: Immediately disable affected accounts, rotate compromised credentials, and deploy emergency patches via Vercel.
  - If JWT secret is compromised: rotate `JWT_SECRET` (invalidates all sessions).
  - If database credentials are compromised: rotate Vercel Postgres connection string.
  - If Stripe keys are compromised: rotate keys in Stripe dashboard and Vercel env vars.
- **SEV-3/4**: Document the issue and schedule a fix within the response window.

**User Account Compromise**
1. Set `disabled = true` on the affected user record (immediately prevents all API access).
2. Invalidate sessions by rotating the JWT secret if widespread, or wait for token expiry if isolated.
3. Trigger password reset flow for the affected account.
4. Notify the user via email.

**Communication**
- SEV-1: Notify all affected users within 72 hours (GDPR requirement for data breaches). Notify the ICO if UK personal data is involved.
- SEV-2: Notify affected users if their data was at risk.
- SEV-3/4: Internal documentation only unless user data was accessed.

**Recovery & Post-Mortem**
1. Verify the fix resolves the vulnerability.
2. Review logs for evidence of exploitation (Vercel runtime logs, database query logs).
3. Write post-mortem within 5 business days covering: timeline, root cause, impact assessment, remediation steps, and preventive measures.
4. Update this security document if procedures or architecture changed.

### 10.3 Key Contacts & Credentials Rotation

| Asset | Rotation Procedure |
|---|---|
| `JWT_SECRET` | Update in Vercel environment variables; triggers redeploy; all active sessions are invalidated |
| `STRIPE_SECRET_KEY` | Rotate in Stripe Dashboard > Developers > API keys; update in Vercel env vars |
| `STRIPE_WEBHOOK_SECRET` | Rotate in Stripe Dashboard > Webhooks; update in Vercel env vars |
| `GOOGLE_CLIENT_SECRET` | Rotate in Google Cloud Console > Credentials; update in Vercel env vars |
| Vercel Postgres connection | Rotate via Vercel dashboard > Storage > Connection details |

### 10.4 Dependency Security

- Monitor dependencies for known vulnerabilities using `npm audit` and automated tools (Dependabot / Snyk).
- Pin major dependency versions in `package.json` to prevent unexpected breaking changes.
- Review and update dependencies on a monthly cadence.

---

## Appendix A: Environment Variables (Security-Relevant)

| Variable | Purpose | Required in Production |
|---|---|---|
| `JWT_SECRET` | Signs and verifies JWT authentication tokens | Yes (hard-fails if missing) |
| `STRIPE_SECRET_KEY` | Server-side Stripe API access | Yes |
| `STRIPE_WEBHOOK_SECRET` | Validates Stripe webhook signatures | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client identifier | Yes (for Google login) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes (for Google login) |
| `STRIPE_PRICE_*` | Stripe Price IDs for each plan/interval | Yes (for checkout) |
| `NEXT_PUBLIC_APP_URL` | Base URL for OAuth redirects | Yes |

## Appendix B: Database Tables with Security Implications

| Table | Security Relevance |
|---|---|
| `users` | Stores bcrypt password hashes, roles, disabled flags, Google IDs |
| `password_resets` | Time-limited, single-use tokens for password recovery |
| `email_verifications` | Time-limited, single-use tokens for email verification |
| `api_keys` | Stores hashed API keys with permissions and revocation timestamps |
| `subscriptions` | Stripe customer and subscription IDs |
| `team_invites` | Token-based invitations with expiry |
| `generated_content` | Includes `compliance_status` and `compliance_notes` fields |

## Appendix C: Public Paths (No Authentication Required)

The following paths are accessible without a valid session, as defined in `src/middleware.ts`:

```
/                           Landing page
/login                      Login page
/register                   Registration page
/forgot-password            Password recovery
/reset-password             Password reset
/terms                      Terms of Service
/privacy                    Privacy Policy
/api/auth/*                 Auth endpoints (login, register, logout, OAuth, password flows)
/api/billing/plans          Public plan listing
/api/waitlist               Waitlist signup
/api/webhooks/stripe        Stripe webhook receiver
/api/content                Public content endpoint
/api/cron                   Scheduled job endpoint
/api/health                 Health check
/api/v1                     Public API
/sitemap.xml                SEO sitemap
/robots.txt                 SEO robots
```

All other paths require a valid `monitus_token` cookie.


---

<!-- NEW TAB: GO-TO-MARKET-PLAYBOOK -->

# Monitus — Go-to-Market Playbook

**Version**: 1.0
**Date**: 15 March 2026
**Status**: Pre-launch

---

## 1. Market Analysis & TAM/SAM/SOM

### UK Specialist Insurance Landscape

The UK insurance market generates approximately £95 billion in gross written premiums annually, with London remaining the global hub for specialty and reinsurance. Within this market, specialist insurance — encompassing MGAs, specialty brokers, insurtechs, niche carriers, and reinsurers — represents a distinct and underserved segment for marketing technology.

### Market Sizing

#### Total Addressable Market (TAM): £180M/year

All specialist insurance companies globally that could benefit from AI-powered marketing and growth intelligence.

| Segment | Companies (Global) | Avg Potential Spend | Annual Value |
|---------|--------------------|---------------------|-------------|
| MGAs | ~3,000 | £12,000/yr | £36M |
| Specialty brokers | ~8,000 | £10,000/yr | £80M |
| Insurtechs | ~2,500 | £8,000/yr | £20M |
| Niche carriers | ~1,500 | £15,000/yr | £22.5M |
| Reinsurers | ~500 | £20,000/yr | £10M |
| Lloyd's syndicates & coverholders | ~400 | £18,000/yr | £7.2M |
| **Total** | **~15,900** | | **~£175.7M** |

#### Serviceable Addressable Market (SAM): £32M/year

UK-based specialist insurance companies with 10-2,000 employees and an active need for marketing content.

| Segment | UK Companies | Avg Monitus Spend | Annual Value |
|---------|-------------|-------------------|-------------|
| MGAs | ~350 | £9,600/yr (Growth) | £3.4M |
| Specialty brokers | ~1,200 | £6,000/yr (Starter) | £7.2M |
| Insurtechs | ~400 | £6,000/yr (Starter) | £2.4M |
| Niche carriers | ~200 | £14,400/yr (Growth) | £2.9M |
| Reinsurers | ~80 | £24,000/yr (Intelligence) | £1.9M |
| Lloyd's syndicates & coverholders | ~300 | £14,400/yr (Growth) | £4.3M |
| Insurance consultancies & TPAs | ~600 | £6,000/yr (Starter) | £3.6M |
| **Total** | **~3,130** | | **~£25.7M** |

Adjusting upward for multi-seat deployments and tier upgrades: **~£32M SAM**.

#### Serviceable Obtainable Market (SOM): £650K Year 1 / £3.2M Year 3

Based on conservative customer acquisition modelling with a two-person founding team:

| Timeframe | Paid Customers | Avg MRR/Customer | ARR |
|-----------|---------------|------------------|-----|
| Year 1 (end) | 31 (20 Starter + 8 Growth + 3 Intelligence) | £826 | £307K |
| Year 2 (end) | 95 | £900 | £1.03M |
| Year 3 (end) | 250 | £1,050 | £3.15M |

**Market penetration at Year 3: 8% of UK SAM by customer count, 10% by revenue.**

### Market Dynamics Favouring Monitus

1. **MGA explosion**: FCA-authorised MGAs grew from ~200 to ~350 between 2020-2025, each needing to differentiate
2. **Insurtech maturity**: Wave-one insurtechs (2016-2020) now have products but not brand — marketing is their bottleneck
3. **Agency disillusionment**: Insurance marketing leaders consistently report agencies "don't get insurance"
4. **Content velocity arms race**: LinkedIn algorithm changes reward 3-5x weekly posting; manual creation cannot keep pace
5. **Regulatory complexity**: Generic AI tools produce content that fails FCA compliance review, creating liability risk

---

## 2. ICP Deep Dive

### Firmographic Profile

| Attribute | Primary ICP | Secondary ICP |
|-----------|------------|---------------|
| **Company type** | MGA, specialty broker, insurtech | Niche carrier, reinsurer, Lloyd's coverholder |
| **Employee count** | 10-200 | 200-2,000 |
| **Revenue** | £2M-£50M GWP | £50M-£500M GWP |
| **Marketing team** | 0-2 people | 2-8 people |
| **Current marketing** | Founder-led or single marketer | Small team, possibly with agency |
| **Tech sophistication** | Medium-high (SaaS-comfortable) | Variable |
| **Budget authority** | MD/CEO or Head of Marketing | VP Marketing/CMO with procurement |
| **Geography** | London, Manchester, Birmingham | UK-wide, some Lloyd's international |

### Buying Triggers

Ranked by frequency and urgency:

1. **Agency contract renewal** (highest intent) — Existing agency relationship ending or underperforming. Typical renewal windows: January, April, September.
2. **New product launch** — Need to build awareness for a new line of business or MGA launch. 60-90 day urgency.
3. **Competitor visibility spike** — A rival starts appearing everywhere on LinkedIn and in trade press. Emotional trigger, fast decision.
4. **Marketing hire failure** — Cannot recruit or retain a marketing person. Common in sub-50 employee firms outside London.
5. **Board/investor pressure** — "We need more market visibility" appearing in board minutes. Quarterly trigger.
6. **Regulatory change** — New FCA rules create a window to establish thought leadership (e.g., Consumer Duty, ESG disclosures).
7. **Funding round** — Pre-Series A insurtechs need to build brand before fundraising.

### Decision Process by Company Size

#### Sub-50 Employees (Starter Tier)
- **Decision maker**: CEO/MD or solo marketer
- **Process**: Individual evaluation, credit card purchase
- **Timeline**: 1-2 weeks from trial start
- **Blockers**: "Is this a real tool or a toy?" — needs social proof from known insurance brands
- **Budget**: Personal authority up to ~£1,000/month

#### 50-200 Employees (Growth Tier)
- **Decision maker**: Head of Marketing with MD sign-off
- **Process**: Trial by marketing lead, demo to MD, procurement light-touch
- **Timeline**: 3-6 weeks
- **Blockers**: "How does this fit with our existing tools?" and "Will it understand our specific niche?"
- **Budget**: Marketing budget allocation, typically quarterly review

#### 200+ Employees (Intelligence Tier)
- **Decision maker**: CMO/CSO with CFO approval
- **Process**: Formal evaluation, security review, possibly RFP
- **Timeline**: 2-4 months
- **Blockers**: Data security, integration requirements, "we need to see ROI projections"
- **Budget**: Annual budget cycle, procurement involved

### Pain-Point Mapping by Persona

| Persona | Top Pain | Second Pain | Third Pain |
|---------|----------|-------------|------------|
| Solo Marketer | "I can't produce enough content for all our channels" | "I spend 3 hours writing one LinkedIn post because compliance rewrites it" | "I don't know what's happening in our market fast enough" |
| Content Team Lead | "Each department wants different content but we can't customise at scale" | "Our agency doesn't understand the difference between an MGA and a broker" | "I can't prove content ROI to the board" |
| Strategy Executive | "We're invisible compared to competitors who are 1/10th our size" | "I need board-ready market intelligence, not blog posts" | "Our PR agency costs £10k/month and I can't tell what we're getting" |
| Technical Founder | "I'm the CEO, CTO, and accidental content writer" | "I can't hire a marketer who understands both insurance and technology" | "We need to look established before our Series A" |

---

## 3. Positioning & Messaging

### Core Positioning Statement

> Monitus is the growth intelligence platform that gives specialist insurance companies the marketing capability of a firm ten times their size — at a tenth of the cost of an agency.

### Positioning by Tier

#### Trial (£0 / 14 days)
**Promise**: See what your marketing could look like in 30 minutes.
**Message**: "Run the Narrative Interview. Get your first LinkedIn post. See if the AI actually understands insurance. No card required."
**Proof point**: 5.0/5 user rating on Narrative Interview.

#### Starter (£500/month)
**Promise**: Consistent, compliant content every week without hiring anyone.
**Message**: "Your insurance expertise deserves to be seen. Monitus monitors your market, writes in your voice, and checks FCA compliance — so you publish weekly instead of quarterly."
**Proof point**: Replaces 8-10 hours/week of content creation. 10% of agency cost.
**Objection handling**: "£500/month vs. £6,000/month agency or £45k/year marketing hire."

#### Growth (£1,200/month)
**Promise**: Multi-channel, multi-department content at scale with performance visibility.
**Message**: "Your underwriting team needs different messaging than your broker network. Monitus generates department-targeted content across 5 formats, with monthly performance reports your CMO will actually read."
**Proof point**: 100 content pieces/month across 5 formats. 3 team seats.
**Objection handling**: "One Growth subscription replaces a junior content writer AND a market monitoring service."

#### Intelligence (£2,000/month)
**Promise**: Strategic growth intelligence that makes you the best-informed company in your niche.
**Message**: "Competitor monitoring. Board-ready briefing packs. Trade media pitches that actually get published. Monitus Intelligence is the CSO's unfair advantage."
**Proof point**: Board pack + competitor monitoring + trade media = capabilities only £15k/month agencies offer.
**Objection handling**: "Your current agency charges £10-15k for the same deliverables. And they still email you asking what an MGA is."

### Messaging Pillars

1. **Insurance-native intelligence**: "Built for insurance, not bolted on." 13 RSS feeds, FCA compliance checking, department-specific targeting, insurance jargon that's actually correct.

2. **Your voice, amplified**: "It writes like you, not like an AI." Narrative Interview extracts real positioning. Voice learning improves with every edit. Content sounds like it came from your team.

3. **Agency output, SaaS price**: "What your agency delivers monthly, Monitus delivers daily." 96%+ gross margins mean the savings pass to customers. 10-20% of agency cost.

4. **Speed to market**: "From news event to published commentary in minutes, not weeks." 13 RSS feeds monitored daily. Real-time content generation. First-mover advantage on every market development.

### Tagline Options

- Primary: **"Growth intelligence for insurance."**
- Alternative: **"The marketing department your insurance company deserves."**
- Technical: **"AI-powered content, compliance-checked, insurance-native."**

---

## 4. Sales Motion

### Dual-Motion Model

Monitus operates a **product-led growth (PLG) engine** for Trial/Starter/Growth tiers, with a **lightweight enterprise sales motion** for Intelligence tier.

### PLG Funnel (Trial → Starter → Growth)

```
Website Visit → Free Trial (no card) → Narrative Interview → First Content
     ↓                                        ↓
  LinkedIn/       ←──── Activation ────→   "Wow Moment"
  Insurance media       (Day 1)            (Interview output)
     ↓                                        ↓
  Retargeting     ←──── Engagement ───→   Weekly usage
  (email drip)          (Days 2-13)        (content generation)
     ↓                                        ↓
  Conversion      ←──── Conversion ────→   Paid subscription
  email sequence        (Day 10-14)        (Starter £500/mo)
     ↓                                        ↓
  Upgrade         ←──── Expansion ────→   Growth tier
  prompts               (Month 3-6)        (£1,200/mo)
```

#### Key PLG Metrics

| Stage | Target | Measurement |
|-------|--------|-------------|
| Visit → Trial | 8-12% | Sign-up rate |
| Trial → Narrative Interview completed | 70% | Day-1 activation |
| Narrative Interview → First content | 80% | Feature adoption |
| Trial → Paid (any tier) | 15-25% | Conversion rate |
| Starter → Growth (within 6 months) | 20% | Expansion rate |
| Monthly logo churn | < 3% | Retention |

#### Activation Sequence (14-Day Trial)

| Day | Action | Channel |
|-----|--------|---------|
| 0 | Welcome email + "Start your Narrative Interview" CTA | Email |
| 1 | If no Interview: reminder email with 60-second video | Email |
| 2 | If Interview done: "Your first content piece is ready" prompt | In-app |
| 4 | "3 articles about your market published today — see your angle" | Email |
| 7 | Weekly digest: "Here's what you'd have published this week" | Email |
| 10 | "Your trial is ending — here's what you'll lose access to" | Email + in-app |
| 12 | Case study email from similar company type | Email |
| 13 | "Last day" + direct founder message | Email |
| 14 | Trial expires. Downgrade to read-only. | System |

### Enterprise Sales Motion (Intelligence Tier)

Intelligence tier buyers require a human touch. This is a **founder-led sales** motion initially.

#### Pipeline Stages

| Stage | Action | Owner | Timeline |
|-------|--------|-------|----------|
| **Identify** | Target top-50 UK specialist insurers/reinsurers by GWP | Founder | Ongoing |
| **Warm** | Connect on LinkedIn, comment on their content, attend same events | Founder | 2-4 weeks |
| **Engage** | Share relevant Monitus-generated insight about their market segment | Founder | 1-2 weeks |
| **Demo** | 30-min tailored demo using their actual competitors and market | Founder | 1 hour |
| **Trial** | 14-day trial with white-glove onboarding (run Interview together) | Founder | 2 weeks |
| **Proposal** | Annual contract proposal with ROI comparison vs. current agency | Founder | 1 week |
| **Close** | Negotiate, handle procurement/security review | Founder | 2-6 weeks |
| **Onboard** | Dedicated onboarding: Interview, content calendar, team setup | Founder | 2 weeks |

#### Enterprise Deal Economics

| Metric | Target |
|--------|--------|
| Average deal size | £19,200/year (annual Intelligence) |
| Sales cycle | 6-12 weeks |
| Win rate (demo → close) | 25-30% |
| CAC (fully loaded) | £3,000-5,000 |
| LTV (24-month avg tenure) | £38,400 |
| LTV:CAC ratio | 8-13x |

### Upsell Triggers (Starter → Growth → Intelligence)

| Signal | Action | Target Tier |
|--------|--------|-------------|
| Hitting content limit (15/mo) consistently | In-app: "You've used 14/15 pieces. Growth gives you 100." | Growth |
| Inviting team members (blocked on Starter) | In-app: "Add your colleague — upgrade to Growth for 3 seats." | Growth |
| Requesting podcast or briefing format | In-app: "Podcast scripts available on Growth." | Growth |
| Asking about competitor mentions | Email: "See what [competitor] published this week — Intelligence tier." | Intelligence |
| Requesting board reports | Demo: "Let me show you the Board Pack briefing format." | Intelligence |
| 6+ months on Growth, active weekly | Founder outreach: "You're getting great results. Let's talk Intelligence." | Intelligence |

---

## 5. Channel Strategy

### Channel Priority Matrix

| Channel | Effort | Cost | Expected CAC | Timeline to ROI | Priority |
|---------|--------|------|-------------|----------------|----------|
| LinkedIn (organic) | High | £0 | £50-100 | 2-3 months | P0 |
| Insurance conferences | Medium | £2-5K/event | £500-1,000 | 1-3 months | P0 |
| Insurance trade media | Medium | £0-500 | £200-500 | 3-6 months | P1 |
| SEO / content marketing | High | £0 | £100-300 | 6-12 months | P1 |
| LinkedIn Ads | Low | £2-5K/mo | £300-800 | 1-2 months | P2 |
| Insurance association partnerships | Medium | £1-3K/yr | £200-400 | 3-6 months | P1 |
| Broker network referrals | Low | Rev share | £0 (rev share) | 6-12 months | P2 |
| Google Ads (branded + category) | Low | £1-3K/mo | £400-1,000 | 1-2 months | P3 |
| Cold email outreach | Medium | £200/mo tooling | £300-600 | 1-2 months | P2 |

### Channel 1: LinkedIn (P0)

LinkedIn is where insurance professionals live. 85%+ of UK insurance decision-makers are active on LinkedIn weekly.

#### Organic Strategy

- **Founder personal brand**: 4-5 posts/week from founder account. Mix of:
  - Insurance market commentary (generated by Monitus — eating own dog food)
  - Behind-the-scenes product development
  - "This is what Monitus generated from today's news" screenshots
  - Customer wins and use cases (anonymised initially)
  - Contrarian takes on insurance marketing ("Your agency doesn't understand your market")

- **Monitus company page**: 3 posts/week. Product updates, industry insights, case studies.

- **Engagement strategy**: Comment thoughtfully on posts by target ICP (insurance CMOs, MGA founders, broker MDs). 30 minutes/day minimum.

- **Content formats**: Carousel posts showing before/after (agency brief vs. Monitus output), short video demos, polls about insurance marketing pain points.

#### Paid LinkedIn Strategy (Month 3+)

- **Budget**: £2,000-5,000/month
- **Targeting**: Job titles (Head of Marketing, MD, CEO) + Industries (Insurance) + Company size (11-200) + Geography (UK)
- **Ad formats**: Sponsored content (case study carousels), Message ads (demo invitations), Lead gen forms (whitepaper downloads)
- **Expected CPL**: £30-80 for marketing-qualified lead

### Channel 2: Insurance Conferences (P0)

Physical presence at insurance events builds credibility that digital alone cannot achieve.

#### Tier 1 Events (Must Attend)

| Event | When | Attendees | Approach | Budget |
|-------|------|-----------|----------|--------|
| BIBA Conference | May | 3,000+ brokers | Exhibition stand (if budget) or attend + network | £2,000-5,000 |
| Insurtech Insights London | June | 5,000+ | Exhibition stand (startup tier) | £3,000-5,000 |
| Insurance Times Awards | November | 1,000+ | Attend ceremony, network at after-party | £500-1,000 |
| London Market Conference | September | 800+ | Attend + speak (pitch for panel on AI in insurance) | £500-1,000 |

#### Tier 2 Events (Attend Selectively)

- MGA Conference (quarterly MGAA events)
- Lloyd's Lab Demo Day (if applicable)
- CII conferences and regional events
- InsurTech Rising
- Airmic Annual Conference

#### Conference Playbook

1. **Pre-event** (2 weeks before): Connect with speakers and attendees on LinkedIn. Post "I'll be at [event] — who else is going?"
2. **At event**: Run live demos from phone/tablet. Collect business cards. Offer "I'll run your Narrative Interview right now — takes 5 minutes."
3. **Post-event** (48 hours after): Connect with everyone met. Send personalised follow-up with Monitus trial link. Post event recap on LinkedIn.

### Channel 3: Insurance Trade Media (P1)

Earned media in insurance publications builds credibility and drives high-intent traffic.

#### Target Publications

| Publication | Readership | Content Angle |
|-------------|-----------|---------------|
| Insurance Times | UK brokers, insurers | "How AI is changing insurance marketing" |
| Insurance Post | London market | "MGA marketing on a bootstrap budget" |
| Insurance Business UK | Broad insurance | Product features, case studies |
| The Insurer | Specialty/reinsurance | Intelligence tier capabilities |
| Intelligent Insurer | Innovation-focused | AI technology deep-dive |
| Artemis | ILS/reinsurance | Reinsurance-specific features |

#### Media Approach

- **Thought leadership articles**: Pitch 1-2 bylines/month on insurance marketing trends (written using Monitus, naturally)
- **Product announcements**: New feature launches, customer milestones
- **Data stories**: "We analysed 10,000 insurance LinkedIn posts — here's what works" (aggregate anonymised data)
- **Awards entries**: Enter Insurance Times Awards (Marketing Innovation), British Insurance Awards, etc.

### Channel 4: SEO & Content Marketing (P1)

Long-tail SEO targeting insurance marketing-specific queries. Low competition, high intent.

#### Priority Keywords

| Keyword Cluster | Monthly Search (UK) | Difficulty | Content Type |
|----------------|--------------------:|-----------|-------------|
| "insurance marketing" | 720 | Medium | Pillar page |
| "MGA marketing strategy" | 90 | Low | Guide |
| "insurance content marketing" | 170 | Low | Blog series |
| "insurance PR agency" | 210 | Medium | Comparison page |
| "insurance LinkedIn strategy" | 50 | Low | Tutorial |
| "FCA compliant marketing" | 140 | Low | Compliance guide |
| "insurtech marketing" | 110 | Low | Guide |
| "insurance thought leadership" | 70 | Low | Blog series |

#### Content Assets

- **Pillar page**: "The Complete Guide to Insurance Marketing in 2026" (3,000+ words, ungated)
- **Comparison pages**: "Monitus vs. Insurance PR Agencies", "Monitus vs. Jasper for Insurance"
- **Blog cadence**: 2 posts/week (generated by Monitus, edited for meta-quality)
- **Lead magnets**: "Insurance Marketing Benchmark Report", "FCA-Compliant Content Checklist"

### Channel 5: Cold Outreach (P2)

Targeted outbound to high-value Intelligence tier prospects.

- **List**: Top 100 UK specialist insurers by GWP, filtered for companies with <5 person marketing team
- **Tool**: Apollo/Lemlist for sequencing
- **Sequence**: 4 emails over 3 weeks, each containing a Monitus-generated insight about the prospect's market segment
- **Volume**: 20-30 new prospects/week
- **Expected reply rate**: 5-8%
- **Expected demo rate**: 2-3%

---

## 6. Content Marketing Strategy

### The Meta-Strategy: Using Monitus to Market Monitus

The single most powerful proof point is demonstrating the product by using it. Every piece of Monitus marketing content should be generated (or at minimum drafted) by Monitus itself.

#### Implementation

1. **Monitus has its own Monitus account** — Narrative Interview completed for Monitus-the-company
2. **All LinkedIn posts** are drafted by Monitus from insurance news, then edited for founder voice
3. **All newsletter content** is generated by Monitus, with a footer: "This newsletter was written with Monitus. Try it free."
4. **Case studies** include a "Content generated by Monitus" badge
5. **Conference presentations** show live Monitus content generation

### Content Calendar (Monthly)

| Content Type | Frequency | Channel | Generated by Monitus? |
|-------------|-----------|---------|----------------------|
| LinkedIn posts (founder) | 4-5/week | LinkedIn | Yes (drafted) |
| LinkedIn posts (company) | 3/week | LinkedIn | Yes |
| Newsletter | Weekly | Email (Resend) | Yes |
| Blog post | 2/week | monitus.ai/blog | Yes (drafted) |
| Insurance market commentary | Daily | LinkedIn + newsletter | Yes |
| Case study | 1/month | Website + LinkedIn | Partially |
| Trade media byline | 1-2/month | Insurance Times etc. | Yes (drafted) |
| Webinar/video | 1/month | LinkedIn Live + YouTube | No (but Monitus provides talking points) |
| Whitepaper/guide | 1/quarter | Website (gated) | Partially |

### Content Themes by Month

| Month | Theme | Rationale |
|-------|-------|-----------|
| 1 (Launch) | "Insurance companies deserve better than agencies that don't get it" | Provocative, challenges status quo |
| 2 | "What 13 RSS feeds tell us about insurance market trends" | Data-driven, demonstrates monitoring |
| 3 | "The solo insurance marketer's survival guide" | Persona-specific, empathy-driven |
| 4 | "FCA compliance and AI content: what you need to know" | Regulatory angle, builds trust |
| 5 | "How MGAs are punching above their weight on LinkedIn" | Segment-specific, aspirational |
| 6 | "6 months of Monitus: what we've learned about insurance content" | Transparency, self-referential |

### Newsletter: "The Insurance Signal"

A weekly newsletter positioned as essential reading for insurance marketing leaders.

- **Format**: 3-5 curated insurance news stories + Monitus's take on each + 1 marketing tip
- **Generated by**: Monitus (naturally)
- **CTA**: "Want content like this for your company? Try Monitus free."
- **Growth target**: 500 subscribers in 3 months, 2,000 in 12 months
- **Distribution**: Resend (existing tech stack), sign-up via monitus.ai

---

## 7. Partnership Strategy

### Partnership Tiers

#### Tier 1: Insurance Associations (Credibility + Distribution)

| Association | Members | Partnership Model | Value to Monitus |
|-------------|---------|------------------|-----------------|
| MGAA (Managing General Agents' Association) | 120+ MGAs | Member benefit: discounted Monitus. Sponsor newsletter. | Direct access to primary ICP |
| BIBA (British Insurance Brokers' Association) | 1,800+ brokers | Content partnership: Monitus-generated market reports for members | Massive broker reach |
| CII (Chartered Insurance Institute) | 125,000 members | CPD content: AI in insurance marketing module | Credibility, thought leadership |
| Insurtech UK | 100+ insurtechs | Startup partner: discounted tier for members | Insurtech access |
| Lloyd's Lab | Alumni network | Portfolio company benefit | Lloyd's market credibility |

**Approach**: Offer free Intelligence-tier access to the association itself, in exchange for member communications and event speaking slots.

#### Tier 2: Compliance Consultants (Referral Partners)

Insurance compliance consultants regularly hear clients say "we need to do more marketing but we're worried about compliance." Monitus's FCA compliance checking makes it a natural referral.

| Partner Type | Referral Model | Commission |
|-------------|---------------|------------|
| FCA compliance consultants | Refer clients needing compliant content | 15% of first-year revenue |
| Insurance regulatory lawyers | Recommend to clients launching new products | 10% of first-year revenue |
| Actuarial consultants | Cross-sell to clients needing market positioning | 10% of first-year revenue |

**Target**: 10-15 active referral partners generating 2-3 referrals/month by Month 6.

#### Tier 3: PR Agencies (Co-opetition)

Counter-intuitive but strategic: position Monitus as a tool that makes agencies more profitable, not one that replaces them.

| Model | Description | Revenue Impact |
|-------|-------------|---------------|
| **Agency white-label** (Phase 2) | Agencies use Monitus to serve insurance clients more efficiently | £500-2,000/mo per agency |
| **Agency referral** | Agencies refer clients too small for their minimum retainer | 15% referral commission |
| **Agency replacement** | Direct — clients leaving agencies switch to Monitus | £500-2,000/mo per client |

**Reality**: Most agencies will view Monitus as a threat. The referral model works for agencies with £5k+ minimums who turn away smaller clients. Target 5-8 agency partnerships.

#### Tier 4: Technology Partners (Integration-Driven)

| Partner | Integration | Value |
|---------|------------|-------|
| HubSpot | CRM sync (Phase 4 roadmap) | Content-to-pipeline attribution |
| Salesforce | CRM sync (Phase 4 roadmap) | Enterprise requirement |
| Mailchimp/Brevo | Newsletter distribution | Reduce content-to-publish friction |
| Canva | Visual content templates for insurance | Design layer Monitus lacks |

### Partnership Revenue Target

| Quarter | Active Partners | Monthly Referral Revenue |
|---------|----------------|------------------------|
| Q1 | 3-5 | £500-1,000 |
| Q2 | 8-12 | £2,000-4,000 |
| Q3 | 15-20 | £5,000-8,000 |
| Q4 | 20-30 | £8,000-15,000 |

---

## 8. Pricing Defence

### Vs. Insurance PR Agencies (£5,000-15,000/month)

| Dimension | Agency | Monitus (Growth) | Advantage |
|-----------|--------|------------------|-----------|
| Monthly cost | £5,000-15,000 | £1,200 | 75-92% savings |
| Content pieces/month | 4-8 | 100 | 12-25x more output |
| Time to first draft | 5-10 business days | 2-5 minutes | 1,000x faster |
| Insurance knowledge | Variable (usually weak) | Built-in (13 RSS feeds, insurance-specific prompts) | Monitus |
| FCA compliance check | Manual (if at all) | Automatic | Monitus |
| Department targeting | Rare | 8 department options | Monitus |
| Voice consistency | Depends on writer turnover | AI-learned, never leaves | Monitus |
| Reporting | Monthly PDF, often late | Real-time dashboard | Monitus |
| **When agency wins** | High-touch media relations, crisis comms, event management | | |

**Key line**: "We're not replacing your agency relationship manager. We're replacing the £8,000/month you spend on someone Googling 'what is an MGA' before writing your LinkedIn posts."

### Vs. Generic AI Tools (Jasper, Copy.ai, ChatGPT — £40-400/month)

| Dimension | Generic AI | Monitus (Starter) | Advantage |
|-----------|-----------|-------------------|-----------|
| Monthly cost | £40-400 | £500 | Generic is cheaper |
| Insurance knowledge | None | 13 RSS feeds, insurance-specific training | Monitus |
| FCA compliance | None | Automatic checking | Monitus |
| Brand voice | Generic tone settings | Narrative Interview + voice learning | Monitus |
| Insurance jargon | Often incorrect | Correct usage of MGA, GWP, ILS, etc. | Monitus |
| Content formats | Generic templates | Insurance-specific (briefings, trade pitches) | Monitus |
| Market monitoring | None | Daily insurance news aggregation | Monitus |
| Competitor intelligence | None | Built-in (Intelligence tier) | Monitus |
| Department targeting | None | 8 insurance departments | Monitus |
| **When generic wins** | Non-insurance content, ad copy, social media for non-regulated industries | | |

**Key line**: "ChatGPT can write a LinkedIn post. It cannot write a LinkedIn post that sounds like an insurance underwriter, references today's FCA announcement, avoids regulatory red flags, and matches your brand voice. Monitus can."

### Vs. Insurance Content Consultants (£2,000-5,000/month)

| Dimension | Consultant | Monitus (Growth) | Advantage |
|-----------|-----------|-------------------|-----------|
| Monthly cost | £2,000-5,000 | £1,200 | 40-76% savings |
| Output volume | 4-8 pieces | 100 pieces | Monitus |
| Availability | Business hours, holidays | 24/7 | Monitus |
| Scalability | Limited by hours | Unlimited | Monitus |
| Insurance expertise | Usually strong | Built-in | Tie |
| Strategic thinking | Strong | Emerging (Intelligence tier) | Consultant (for now) |
| **When consultant wins** | Pure strategy work, brand positioning workshops, crisis response | | |

### Vs. Doing Nothing (£0/month)

The most common "competitor." 60%+ of specialist insurers do minimal marketing.

| Dimension | Doing Nothing | Monitus (Starter) |
|-----------|-------------|-------------------|
| Monthly cost | £0 | £500 |
| Content output | 0-2 sporadic posts | 15 consistent pieces |
| Market visibility | Declining | Growing |
| Talent attraction | Harder each year | "We saw your content and wanted to talk" |
| Broker/client retention | Reactive only | Proactive positioning |
| Competitor gap | Widening | Closing/leading |
| Cost of inaction | £50-200K/year in lost business (est.) | £6,000/year |

**Key line**: "The cost of Monitus is £500/month. The cost of silence is the next broker who Googles your company and finds nothing."

---

## 9. Launch Phases

### Phase 0: Pre-Launch (Weeks -8 to -2)

**Objective**: Build waitlist and validate positioning with real insurance buyers.

| Activity | Detail | Target |
|----------|--------|--------|
| Waitlist landing page | monitus.ai with email capture, Narrative Interview teaser | 200 sign-ups |
| Founder LinkedIn campaign | Daily posts about insurance marketing problems | 50+ engagements/post |
| 1:1 conversations | DM 50 insurance marketing leaders for beta feedback | 20 beta commitments |
| Trade media seeding | Pitch "AI comes to insurance marketing" story to Insurance Times | 1-2 articles |
| Content bank | Generate 30 days of Monitus-created content for launch period | 60+ pieces ready |

### Phase 1: Soft Launch (Weeks 1-4)

**Objective**: Onboard first 10-20 paying customers. Validate product-market fit. Fix critical issues.

| Week | Activity | Success Metric |
|------|----------|---------------|
| 1 | Invite waitlist (batch 1: 50 people). Founder personally onboards each. | 30+ trials started |
| 2 | Invite waitlist (batch 2: 100 people). First customer case study interview. | 5+ paid conversions |
| 3 | Open trial to all waitlist. Begin LinkedIn paid promotion (£500 test). | 50+ trials, 10+ paid |
| 4 | First customer testimonial published. Insurance Times feature if secured. | 15+ paid customers |

**Soft launch rules**:
- No public pricing page (invite-only trial links)
- Founder responds to every support request within 2 hours
- Weekly user feedback calls (15 min each)
- Ship fixes/improvements daily based on feedback

### Phase 2: Public Launch (Weeks 5-12)

**Objective**: Open to all. Hit £10K MRR. Establish market presence.

| Week | Activity | Success Metric |
|------|----------|---------------|
| 5-6 | Public launch: pricing page live, self-serve trial, Product Hunt launch | 100+ trials |
| 7-8 | First conference appearance (or webinar if timing doesn't align) | 20+ in-person demos |
| 9-10 | Partnership announcements (first association deal) | 1-2 partnerships signed |
| 11-12 | First quarterly metrics published. "State of Insurance Marketing" report. | £10K+ MRR |

**Public launch checklist**:
- [ ] Pricing page with tier comparison
- [ ] 3+ customer testimonials with real names and company logos
- [ ] Product demo video (3 minutes)
- [ ] Comparison pages (vs. agencies, vs. generic AI)
- [ ] SEO pillar page live
- [ ] Weekly newsletter launched ("The Insurance Signal")
- [ ] LinkedIn company page optimised
- [ ] G2/Capterra listing created

### Phase 3: Growth (Months 4-6)

**Objective**: Reach £25K MRR. Prove unit economics. First Intelligence tier customers.

| Activity | Detail |
|----------|--------|
| Conference circuit | Attend 2-3 insurance events with booth/demo station |
| Enterprise outreach | Target top-20 list for Intelligence tier |
| Content engine | 2 blog posts/week, weekly newsletter, daily LinkedIn |
| Partnership expansion | 10+ active referral partners |
| Product expansion | LinkedIn OAuth, content calendar, custom RSS feeds (per roadmap) |

### Phase 4: Expansion (Months 7-12)

**Objective**: Reach £50K MRR. Begin international exploration.

| Activity | Detail |
|----------|--------|
| DACH/Nordics research | Identify 5-10 pilot customers in Germany, Switzerland, Sweden |
| Multi-language prep | German and French content generation testing |
| Agency white-label | Pilot with 2-3 insurance PR agencies |
| Enterprise features | SSO, approval workflows, CRM integration |
| Team hire | First non-founder hire (Customer Success or Growth Marketing) |

---

## 10. Key Metrics & Milestones

### Month 1 Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Trials started | 50-80 | Database count |
| Paid customers | 5-10 | Stripe subscriptions |
| MRR | £2,500-5,000 | Stripe dashboard |
| Narrative Interviews completed | 40+ | Database count |
| Content pieces generated | 300+ | Database count |
| NPS (from trial users) | 30+ | Survey |
| LinkedIn followers (founder) | +500 | LinkedIn analytics |
| Newsletter subscribers | 100+ | Resend list |

### Month 3 Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Trials started (cumulative) | 200-300 | Database |
| Paid customers | 15-25 | Stripe |
| MRR | £8,000-15,000 | Stripe |
| Trial → Paid conversion | 15%+ | Funnel analysis |
| Monthly churn | < 5% (early stage acceptable) | Stripe |
| Intelligence tier customers | 1-2 | Stripe |
| Active referral partners | 5-8 | Partner tracking |
| LinkedIn followers (founder) | +1,500 | LinkedIn |
| Newsletter subscribers | 500+ | Resend |
| Trade media mentions | 3-5 | Manual tracking |

### Month 6 Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Paid customers | 30-50 | Stripe |
| MRR | £20,000-30,000 | Stripe |
| ARR run rate | £240,000-360,000 | Calculated |
| Trial → Paid conversion | 18%+ | Funnel |
| Monthly churn | < 3% | Stripe |
| Net revenue retention | 105%+ | Calculated |
| Intelligence tier customers | 3-5 | Stripe |
| Customer logos (publishable) | 10+ | Permission tracking |
| LinkedIn followers (founder) | +3,000 | LinkedIn |
| Newsletter subscribers | 1,500+ | Resend |
| Conference appearances | 3-5 | Calendar |
| SEO ranking keywords (page 1) | 10+ | Ahrefs/SEMrush |

### Month 12 Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Paid customers | 60-100 | Stripe |
| MRR | £40,000-65,000 | Stripe |
| ARR | £480,000-780,000 | Calculated |
| Trial → Paid conversion | 20%+ | Funnel |
| Monthly churn | < 2.5% | Stripe |
| Net revenue retention | 110%+ | Calculated |
| ARPU | £650-800/mo | Calculated |
| LTV:CAC | 5:1+ | Calculated |
| Intelligence tier customers | 5-10 | Stripe |
| Active referral partners | 20-30 | Partner tracking |
| International pilot customers | 5-10 | Database |
| Team size | 3-5 (founders + hires) | Headcount |
| LinkedIn followers (founder) | +5,000 | LinkedIn |
| Newsletter subscribers | 3,000+ | Resend |

### Key Leading Indicators

Monitor these weekly — they predict future revenue:

1. **Trial starts/week** — Leading indicator of pipeline (target: 15-25/week by Month 6)
2. **Narrative Interview completion rate** — Strongest predictor of conversion (target: 70%+)
3. **Content pieces generated in trial** — Second strongest conversion predictor (target: 5+ per trial)
4. **Weekly active users (WAU)** — Retention signal (target: 60%+ of paid users)
5. **Founder LinkedIn post engagement** — Brand awareness proxy (target: 2%+ engagement rate)

---

## 11. Budget Allocation (First 12 Months)

### Total Marketing Budget: £60,000-80,000

Assumes bootstrapped or pre-seed. Lean spend with heavy emphasis on organic and founder-led activity.

### Monthly Budget Breakdown

| Category | Monthly (M1-3) | Monthly (M4-6) | Monthly (M7-12) | 12-Month Total |
|----------|---------------|----------------|-----------------|---------------|
| **LinkedIn Ads** | £500 | £2,000 | £3,000 | £24,000 |
| **Conference attendance** | £500 | £1,500 | £1,000 | £12,000 |
| **Trade media/PR** | £0 | £200 | £500 | £4,200 |
| **SEO tooling** (Ahrefs/SEMrush) | £80 | £80 | £80 | £960 |
| **Email tooling** (beyond Resend) | £0 | £50 | £100 | £900 |
| **Outbound tooling** (Apollo/Lemlist) | £100 | £200 | £200 | £1,800 |
| **Design** (Canva Pro / freelance) | £100 | £300 | £300 | £2,700 |
| **Video production** | £0 | £200 | £500 | £4,200 |
| **Partnership commissions** | £0 | £300 | £1,000 | £7,800 |
| **Swag/collateral** | £0 | £200 | £100 | £1,200 |
| **Contingency** | £200 | £500 | £500 | £4,200 |
| **Total** | **£1,480** | **£5,530** | **£7,280** | **~£63,960** |

### Budget Allocation by Objective

| Objective | % of Budget | Annual Spend |
|-----------|------------|-------------|
| Demand generation (ads, outbound, conferences) | 55% | £35,000 |
| Brand building (content, PR, video) | 20% | £13,000 |
| Tooling & infrastructure | 10% | £6,500 |
| Partnerships & commissions | 10% | £6,500 |
| Contingency | 5% | £3,000 |

### Unit Economics of Marketing Spend

| Channel | 12-Month Spend | Expected Customers | CAC | Avg LTV (24mo) | LTV:CAC |
|---------|---------------|-------------------|-----|----------------|---------|
| LinkedIn organic | £0 (time only) | 15-20 | £0 cash | £19,200 | Infinite |
| LinkedIn Ads | £24,000 | 15-25 | £960-1,600 | £14,400 | 9-15x |
| Conferences | £12,000 | 8-12 | £1,000-1,500 | £14,400 | 10-14x |
| SEO/content | £960 | 10-15 | £64-96 | £14,400 | 150-225x |
| Partnerships | £7,800 | 10-15 | £520-780 | £14,400 | 18-28x |
| Outbound | £1,800 | 5-8 | £225-360 | £24,000 | 67-107x |
| **Blended** | **£63,960** | **63-95** | **£673-1,015** | **£16,800** | **17-25x** |

### Revenue vs. Marketing Spend Trajectory

| Month | Cumulative Revenue | Cumulative Marketing Spend | Revenue/Spend Ratio |
|-------|-------------------|---------------------------|-------------------|
| 3 | £12,000-25,000 | £4,500 | 2.7-5.6x |
| 6 | £60,000-120,000 | £20,000 | 3.0-6.0x |
| 9 | £150,000-280,000 | £40,000 | 3.8-7.0x |
| 12 | £300,000-500,000 | £64,000 | 4.7-7.8x |

**Payback period on marketing spend: 3-4 months** (due to high-margin SaaS model and low per-customer acquisition cost).

---

## 12. Competitive Landscape

### Competitive Map

```
                        HIGH INSURANCE EXPERTISE
                               ▲
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    │  Insurance PR      │
                    │  Agencies          │  Insurance
                    │  (£5-15K/mo)       │  Content
                    │          │          │  Consultants
                    │          │          │  (£2-5K/mo)
                    │          │          │
  LOW TECH ◄───────┼──────────┼──────────┼──────────► HIGH TECH
                    │          │          │
                    │          │  ╔═══════╗│
                    │  In-house│  ║MONITUS║│
                    │  marketers  ║£0.5-2K║│
                    │  (hire)  │  ╚═══════╝│
                    │          │          │
                    │  Generic AI Tools   │
                    │  (Jasper, Copy.ai)  │
                    │  (£40-400/mo)       │
                    │          │          │
                    └──────────┼──────────┘
                               │
                               ▼
                        LOW INSURANCE EXPERTISE
```

### Competitor Deep Dive

#### 1. Insurance PR Agencies

**Examples**: Headland Consultancy, Luther Pendragon, Haggie Partners, Rostrum, MPC (insurance specialist), Perception (insurance specialist)

| Factor | Assessment |
|--------|-----------|
| **Market share** | Dominant for 200+ employee insurers |
| **Strength** | Relationships with journalists, crisis management, strategic counsel |
| **Weakness** | Expensive, slow, high staff turnover means inconsistent quality, often lack deep insurance knowledge |
| **Monitus threat level** | Medium-term. Monitus won't replace agency relationships overnight, but will erode the content production portion of agency retainers |
| **Counter-strategy** | Position as complementary initially ("Your agency does strategy, Monitus does execution"). Then expand scope as product matures. |
| **Vulnerable segment** | Sub-£5K/month clients that agencies serve reluctantly |

#### 2. Generic AI Writing Tools

**Examples**: Jasper ($49-125/month), Copy.ai ($49-249/month), Writer ($18-60/user/month), ChatGPT ($20/month)

| Factor | Assessment |
|--------|-----------|
| **Market share** | Growing rapidly in general marketing, minimal in insurance |
| **Strength** | Low price, broad feature set, large user base, brand recognition |
| **Weakness** | No insurance expertise, no compliance checking, no market monitoring, generic brand voice |
| **Monitus threat level** | Low. These tools solve a different problem. Insurance professionals who try them quickly discover the compliance and accuracy gaps. |
| **Counter-strategy** | "Built for insurance" positioning. Feature comparison showing what generic tools cannot do. Never compete on price — compete on value and specificity. |
| **Vulnerable segment** | Insurtechs who currently use ChatGPT because they don't know a specialist option exists |

#### 3. Insurance Content Consultants

**Examples**: Independent consultants, ex-insurance journalists, small content agencies with insurance specialism

| Factor | Assessment |
|--------|-----------|
| **Market share** | Small but loyal client bases |
| **Strength** | Deep insurance knowledge, personal relationships, strategic thinking |
| **Weakness** | Cannot scale (hours-limited), expensive per piece, availability constraints, no technology layer |
| **Monitus threat level** | High. Monitus directly replaces the content production function at 1/3 the cost. |
| **Counter-strategy** | Partner with consultants (referral program). Position as "the tool that makes your consultant 5x more productive." Some consultants will become Monitus power users and champions. |
| **Vulnerable segment** | Their clients who need more volume than the consultant can provide |

#### 4. In-House Marketing Hires

**Examples**: Hiring a marketing manager or content writer

| Factor | Assessment |
|--------|-----------|
| **Market share** | Default choice for companies with £40-60K hiring budget |
| **Strength** | Dedicated resource, deep company knowledge over time, can attend meetings |
| **Weakness** | £40-60K salary + benefits = £50-75K/year. 3-6 month ramp. Holiday/sick cover gap. Retention challenges in insurance marketing roles. |
| **Monitus threat level** | Medium. Monitus replaces the content production portion of a marketing role but not strategy, events, or relationship management. |
| **Counter-strategy** | "Monitus + part-time marketing contractor" costs less than a full-time hire and produces more. Or: "Give your marketer Monitus and watch them produce 10x more." |
| **Vulnerable segment** | Companies that have tried and failed to hire, or cannot offer competitive London salaries |

#### 5. Doing Nothing

**Examples**: 60%+ of specialist insurance companies

| Factor | Assessment |
|--------|-----------|
| **Market share** | The largest "competitor" by volume |
| **Strength** | Free. No effort. No risk of saying something wrong. |
| **Weakness** | Invisible in market. Losing talent to more visible competitors. Missing broker relationships. Board increasingly asking "why aren't we more visible?" |
| **Monitus threat level** | This is the biggest opportunity. Converting "do nothing" to "Monitus Starter" is the primary growth motion. |
| **Counter-strategy** | Education-led marketing. Show the cost of inaction. Case studies of small insurers who grew visibility dramatically. Make the first step frictionless (free trial, no card). |

### Competitive Moats (Building Over Time)

1. **Data moat** (Month 6+): Aggregated (anonymised) data on what insurance content performs. "We've analysed 50,000 insurance content pieces — here's what works."
2. **Voice moat** (Month 3+): Each customer's voice model improves with every edit. Switching cost increases with usage.
3. **Network moat** (Month 12+): Insurance association partnerships and trade media relationships create distribution Jasper/Copy.ai cannot replicate.
4. **Domain moat** (Day 1): 13 RSS feeds, FCA compliance rules, department targeting, insurance-specific prompts. Months of work to replicate.
5. **Brand moat** (Month 6+): Becoming known as "the insurance marketing tool" — category creation.

### Competitive Response Scenarios

| Scenario | Likelihood | Response |
|----------|-----------|----------|
| Jasper launches "Insurance" vertical | Low (too niche for them) | Emphasise depth vs. breadth. "They added a template. We built a platform." |
| Insurance agency builds own AI tool | Medium | Move faster. Their tool will be locked to their clients. Monitus is independent. |
| New startup copies Monitus | Medium (12+ months out) | First-mover advantage, voice moat, data moat, partnerships already locked. |
| ChatGPT/Claude gets so good it doesn't matter | Low-medium | Monitus value is workflow + data + compliance, not raw generation. Raw AI is a commodity; orchestration is the product. |

---

## Appendix A: 90-Day Sprint Plan

### Days 1-30: Foundation

- [ ] Finalise pricing page copy and design
- [ ] Record 3-minute product demo video
- [ ] Write 3 comparison pages (vs. agencies, vs. generic AI, vs. doing nothing)
- [ ] Launch waitlist with LinkedIn campaign (founder posts daily)
- [ ] Reach out to 30 insurance marketing leaders for beta access
- [ ] Submit speaker proposals for next 3 insurance conferences
- [ ] Set up Apollo for outbound prospect list (top 100 insurers)
- [ ] Create partnership pitch deck for insurance associations
- [ ] Configure LinkedIn Ads account with initial £500 test budget

### Days 31-60: Soft Launch

- [ ] Invite first 50 waitlist members to trial
- [ ] Personally onboard each trial user (founder calls)
- [ ] Collect 3-5 testimonials with permission to use names/logos
- [ ] Publish first 4 blog posts (SEO pillar page + 3 supporting)
- [ ] Launch "The Insurance Signal" weekly newsletter
- [ ] Attend first insurance event (MGAA meeting or similar)
- [ ] Sign first referral partnership (compliance consultant or association)
- [ ] Hit 10 paid customers

### Days 61-90: Public Launch

- [ ] Open self-serve trial to public
- [ ] Publish case study with named customer
- [ ] LinkedIn Ads scaled to £2,000/month
- [ ] Product Hunt launch
- [ ] First trade media coverage (Insurance Times or equivalent)
- [ ] Hit 25 paid customers / £10K MRR
- [ ] First Intelligence tier customer signed
- [ ] G2/Capterra profiles live with first reviews

---

## Appendix B: Messaging Cheat Sheet

### Elevator Pitch (10 seconds)
"Monitus is AI-powered marketing for insurance companies. We monitor your market, write in your voice, and check FCA compliance — at 10% of what an agency costs."

### Conference Pitch (30 seconds)
"You know how insurance companies either spend £10K a month on a PR agency that doesn't understand the difference between an MGA and a broker — or they do nothing and become invisible? Monitus fixes that. We're an AI platform built specifically for insurance. It monitors 13 insurance news sources, learns your brand voice through a conversational interview, and generates compliant content for LinkedIn, newsletters, trade media, and board briefings. Companies are getting agency-quality output for £500-2,000 a month."

### Email Subject Lines (Outbound)
- "Your competitors published 12 LinkedIn posts this month. You published 0."
- "[Company name]'s market is moving — here's what we spotted"
- "The FCA just announced X — your clients need to hear from you"
- "Replacing your insurance PR agency with AI (case study)"
- "What if your MGA had a marketing department?"

### Objection Responses

| Objection | Response |
|-----------|----------|
| "AI content won't sound like us" | "That's exactly why we built the Narrative Interview. It's a 15-minute AI conversation that extracts your actual positioning and voice. Users rate it 5.0 out of 5. Try it — if the output doesn't sound like you, don't subscribe." |
| "We need a human relationship" | "Agreed — for strategy and media relations. But do you need a human to write your fourth LinkedIn post of the week? Monitus handles the volume. Your agency or consultant handles the strategy." |
| "We're too small for marketing" | "You're too small NOT to market. Your competitors with 5x your headcount are publishing weekly. Monitus is £500/month — less than a day of consultant time — and it produces content every day." |
| "AI content will get us in trouble with the FCA" | "Generic AI, yes. Monitus has built-in FCA, PRA, GDPR, and Solvency II compliance checking. Every piece of content is automatically reviewed against your declared regulatory frameworks before you publish." |
| "We tried Jasper/ChatGPT and it was rubbish" | "Because those tools don't know insurance. They don't know what an MGA is, they don't track FCA announcements, and they can't tell the difference between a broker and a carrier. Monitus was built from day one for specialist insurance." |
| "£500/month is expensive for AI" | "It's £500/month vs. £5,000/month for an agency, £4,000/month for a consultant, or £50,000/year for a marketing hire. Monitus is the cheapest way to have a consistent marketing presence." |


---

<!-- NEW TAB: OPERATIONAL-RUNBOOK -->

# Monitus — Operational Runbook

**Version**: 1.0
**Date**: 15 March 2026
**Audience**: Founding team (on-call operators)
**Platform**: monitus.ai

---

## Table of Contents

1. [Deployment Procedures](#1-deployment-procedures)
2. [Environment Configuration](#2-environment-configuration)
3. [Database Management](#3-database-management)
4. [Cron Job Management](#4-cron-job-management)
5. [Monitoring & Alerting](#5-monitoring--alerting)
6. [Common Issues & Troubleshooting](#6-common-issues--troubleshooting)
7. [Incident Response Playbook](#7-incident-response-playbook)
8. [Scaling Guide](#8-scaling-guide)
9. [Backup & Recovery](#9-backup--recovery)
10. [On-call Procedures](#10-on-call-procedures)
11. [Cost Management](#11-cost-management)
12. [Release Process](#12-release-process)

---

## 1. Deployment Procedures

### 1.1 How Deployment Works

Monitus uses **Vercel Git Deployment**. Every push to the `main` branch triggers a production deployment automatically. Pull request branches create preview deployments.

```
git push origin main  →  Vercel build  →  Production (monitus.ai)
git push origin feat  →  Vercel build  →  Preview (feat-xxx.vercel.app)
```

**Build command**: `next build` (defined in `package.json`)
**Output directory**: `.next` (Next.js default)
**Runtime**: Node.js 20.x
**Typical build time**: ~30 seconds

### 1.2 Vercel Configuration

The project uses a minimal `vercel.json` that only defines the cron schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/news",
      "schedule": "0 7 * * *"
    }
  ]
}
```

No custom build settings, rewrites, or function configurations are needed — Next.js App Router handles routing natively.

### 1.3 Deploying a New Version

**Standard deployment (recommended):**
```bash
git checkout main
git pull origin main
git merge feature-branch
git push origin main
# Vercel automatically builds and deploys
```

**Manual deployment (emergency):**
```bash
npx vercel --prod
```

**Verify deployment:**
```bash
curl https://monitus.ai/api/health
# Expected: {"status":"ok","timestamp":"...","database":"connected","stripe":"configured","resend":"configured","anthropic":"configured"}
```

### 1.4 Rollback Procedure

1. Open **Vercel Dashboard** > **Deployments**
2. Find the last known-good deployment
3. Click the three-dot menu > **Promote to Production**
4. Verify via the health endpoint

Alternatively, revert the commit in Git:
```bash
git revert HEAD
git push origin main
```

### 1.5 First-Time Setup

1. **Create Vercel project**: Link the GitHub repository via the Vercel dashboard
2. **Connect Neon database**: Use the Vercel Postgres integration (auto-populates `POSTGRES_*` env vars)
3. **Set environment variables**: See Section 2 below — add all required vars in Vercel project settings
4. **Deploy**: Push to `main`; the first request to any API route will trigger `initDb()` which creates all 22 tables and seeds subscription plans + admin account
5. **Verify**: Hit `/api/health` to confirm database connectivity

---

## 2. Environment Configuration

### 2.1 Required Variables

| Variable | Purpose | Where to Get It |
|----------|---------|-----------------|
| `POSTGRES_URL` | Neon pooled connection string | Vercel Postgres integration (auto-set) |
| `POSTGRES_URL_NON_POOLING` | Neon direct connection (for migrations) | Vercel Postgres integration (auto-set) |
| `DATABASE_URL` | Alias for pooled connection | Vercel Postgres integration (auto-set) |
| `DATABASE_URL_UNPOOLED` | Alias for direct connection | Vercel Postgres integration (auto-set) |
| `JWT_SECRET` | Signing key for auth tokens (min 64 chars) | Generate: `openssl rand -hex 64` |
| `ANTHROPIC_API_KEY` | Claude Sonnet 4 API access | [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_APP_URL` | Canonical URL (e.g., `https://monitus.ai`) | Your domain |
| `ADMIN_SEED_PASSWORD` | Password for the initial `admin@monitus.ai` account | Choose a strong password |
| `CRON_SECRET` | Bearer token for cron job authentication | Generate: `openssl rand -hex 32` |

### 2.2 Optional Variables (Feature-Gated)

| Variable | Purpose | When Needed |
|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Stripe payment processing | When billing is live |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | When billing is live |
| `STRIPE_PRICE_STARTER_MONTHLY` | Stripe Price ID for Starter monthly | When billing is live |
| `STRIPE_PRICE_STARTER_YEARLY` | Stripe Price ID for Starter yearly | When billing is live |
| `STRIPE_PRICE_PROFESSIONAL_MONTHLY` | Stripe Price ID for Growth monthly | When billing is live |
| `STRIPE_PRICE_PROFESSIONAL_YEARLY` | Stripe Price ID for Growth yearly | When billing is live |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Stripe Price ID for Intelligence monthly | When billing is live |
| `STRIPE_PRICE_ENTERPRISE_YEARLY` | Stripe Price ID for Intelligence yearly | When billing is live |
| `RESEND_API_KEY` | Transactional email via Resend | When email is live |
| `EMAIL_FROM` | Sender address (default: `Monitus <noreply@monitus.ai>`) | Optional override |
| `GOOGLE_CLIENT_ID` | Google OAuth sign-in | When Google login is live |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | When Google login is live |

### 2.3 Neon Auto-Set Variables

The Vercel Postgres integration automatically sets these additional variables. Do not modify them manually:

`PGDATABASE`, `PGHOST`, `PGHOST_UNPOOLED`, `PGPASSWORD`, `PGUSER`, `POSTGRES_DATABASE`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NO_SSL`, `POSTGRES_USER`, `NEON_PROJECT_ID`

### 2.4 Environment Variable Safety

- **Never commit `.env.local`** — it is in `.gitignore`
- All secrets should be set exclusively through the Vercel dashboard
- Use separate values for Preview vs Production environments in Vercel
- Rotate `JWT_SECRET` and `CRON_SECRET` quarterly (this will invalidate all active sessions)
- Rotate API keys immediately if a breach is suspected

---

## 3. Database Management

### 3.1 Architecture

- **Provider**: Neon Postgres (Serverless)
- **Region**: EU West 2 (London) — `eu-west-2.aws.neon.tech`
- **Connection pooling**: PgBouncer via `-pooler` hostname (used by `POSTGRES_URL`)
- **Direct connection**: Non-pooler hostname (used for migrations and `ALTER TABLE`)
- **ORM**: None — raw SQL via `@vercel/postgres` `sql` template literals

### 3.2 Schema Initialization

The database schema is managed by `src/lib/db.ts` via `initDb()`. This function:

1. Creates all 22 tables using `CREATE TABLE IF NOT EXISTS`
2. Runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations
3. Creates the unique index on `news_articles.source_url`
4. Seeds subscription plans (4 tiers: Trial, Starter, Growth, Intelligence)
5. Seeds the admin account from `src/lib/seed-admin.ts`
6. Seeds demo data in non-production environments

**The init is idempotent** — it is safe to run repeatedly. It executes on the first API request after a cold start via the `getDb()` singleton pattern.

### 3.3 Tables (22 total)

| Table | Purpose |
|-------|---------|
| `users` | User accounts with bcrypt password hashes |
| `companies` | Company profiles linked to users |
| `news_articles` | Ingested RSS articles (unique on `source_url`) |
| `generated_content` | AI-generated content pieces |
| `subscription_plans` | Plan definitions (seeded) |
| `subscriptions` | Active user subscriptions |
| `usage_events` | Usage tracking per feature |
| `notifications` | In-app notifications |
| `invoices` | Billing invoice records |
| `usage_alerts` | Usage threshold alerts |
| `password_resets` | Password reset tokens |
| `email_verifications` | Email verification tokens |
| `custom_templates` | User-created content templates |
| `team_members` | Team membership |
| `team_invites` | Pending team invitations |
| `api_keys` | REST API key management |
| `messaging_bibles` | Brand messaging documents |
| `interview_sessions` | AI interview state/history |
| `voice_edits` | Voice calibration edit history |
| `content_distributions` | Content distribution tracking |
| `user_article_actions` | User interactions with articles |
| `site_content` | CMS-editable site content |
| `intelligence_reports` | Generated intelligence reports |
| `competitive_mentions` | Competitor tracking data |

### 3.4 Running Manual Queries

Connect directly via the Neon console or `psql`:

```bash
psql "postgresql://neondb_owner:<password>@<host>.neon.tech/neondb?sslmode=require"
```

**Useful diagnostic queries:**

```sql
-- Total users
SELECT COUNT(*) FROM users;

-- Articles fetched in last 24h
SELECT COUNT(*) FROM news_articles WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Active subscriptions by plan
SELECT sp.name, COUNT(s.id) FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active'
GROUP BY sp.name;

-- Content generated this month
SELECT COUNT(*) FROM generated_content WHERE created_at >= DATE_TRUNC('month', NOW());

-- Database size
SELECT pg_size_pretty(pg_database_size('neondb'));
```

### 3.5 Connection Pooling

- The pooled connection (`POSTGRES_URL`) routes through PgBouncer and should be used for all standard queries
- The non-pooled connection (`DATABASE_URL_UNPOOLED`) is for DDL operations (schema changes)
- Neon's serverless driver handles connection lifecycle automatically — no pool size configuration needed
- Cold starts may add ~100-200ms for the initial connection

### 3.6 Backup Strategy

**Neon provides:**
- **Point-in-time recovery (PITR)**: Available on Neon Pro plans — restore to any point in the last 7-30 days
- **Branching**: Create instant database branches for testing without affecting production
- **Free tier**: No automated backups — must export manually

**Manual backup (recommended weekly):**
```bash
pg_dump "postgresql://neondb_owner:<password>@<non-pooler-host>.neon.tech/neondb?sslmode=require" \
  --no-owner --no-acl --clean > backup-$(date +%Y%m%d).sql
```

**Restore from backup:**
```bash
psql "postgresql://neondb_owner:<password>@<non-pooler-host>.neon.tech/neondb?sslmode=require" \
  < backup-20260315.sql
```

---

## 4. Cron Job Management

### 4.1 News Fetch Cron

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/cron/news` |
| **Schedule** | `0 7 * * *` (daily at 07:00 UTC) |
| **Runtime** | Node.js |
| **Max duration** | 60 seconds (`maxDuration = 60`) |
| **Auth** | `Authorization: Bearer <CRON_SECRET>` |
| **Defined in** | `vercel.json` and `src/app/api/cron/news/route.ts` |

### 4.2 What It Does

1. Authenticates via `CRON_SECRET` bearer token
2. Fetches articles from 13 RSS feeds in parallel (5-second timeout per feed)
3. Deduplicates by `source_url` using `ON CONFLICT DO NOTHING`
4. Takes up to 15 items per feed
5. Logs fetch count and errors
6. Notifies all users who have a company profile about new articles
7. Returns JSON with `fetched`, `errors`, `duration_ms`

### 4.3 RSS Feed Sources (13 feeds)

**Tier 1 — UK Market & Specialty:**
- Insurance Times, Insurance Business UK, Insurance Age, FCA

**Tier 2 — Reinsurance & ILS:**
- Reinsurance News, Artemis

**Tier 3 — General/International:**
- Insurance Journal (2 feeds), Commercial Risk, Carrier Management, AM Best, Reuters Insurance (via Google News RSS)

**Podcast:**
- The Voice of Insurance (Buzzsprout)

### 4.4 Monitoring the Cron

**Check Vercel logs after 07:00 UTC for:**
```
[cron/news] Fetched 87 articles in 4523ms. Errors: 2
```

**Manual trigger for testing:**
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" https://monitus.ai/api/cron/news
```

**Expected response:**
```json
{
  "success": true,
  "fetched": 87,
  "errors": 2,
  "duration_ms": 4523,
  "timestamp": "2026-03-15T07:00:04.523Z"
}
```

### 4.5 Vercel Hobby Cron Limitations

- **1 cron job** allowed on the Hobby plan
- Cron executions count toward the 100k/month serverless execution limit
- Vercel does not guarantee exact execution time — expect +/- a few minutes
- Upgrading to Pro allows 5 cron jobs (could add content digest emails, competitor scans, etc.)

### 4.6 Failure Modes

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| `401 Unauthorized` | `CRON_SECRET` mismatch | Verify env var in Vercel dashboard |
| 0 articles fetched, many errors | RSS feeds down or blocking | Check feed URLs manually; timeout is 5s per feed |
| Function timeout (>60s) | Too many feeds slow to respond | Reduce `items.slice(0, 15)` or add tighter timeouts |
| Duplicate articles | Index issue | Verify `idx_news_articles_source_url` exists |

---

## 5. Monitoring & Alerting

### 5.1 Health Endpoint

**Endpoint**: `GET /api/health`
**Auth**: Public (no authentication required)

**Healthy response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-03-15T12:00:00.000Z",
  "database": "connected",
  "stripe": "configured",
  "resend": "configured",
  "anthropic": "configured"
}
```

**Degraded response (503):**
```json
{
  "status": "degraded",
  "timestamp": "2026-03-15T12:00:00.000Z",
  "database": "disconnected",
  "stripe": "configured",
  "resend": "configured",
  "anthropic": "configured"
}
```

The health check performs `SELECT 1` against the database and verifies that API keys are configured in the environment. It does not test whether third-party APIs are reachable.

### 5.2 Recommended Uptime Monitoring

Set up an external monitor to poll `/api/health` every 5 minutes:

| Tool | Free Tier | Setup |
|------|-----------|-------|
| **Better Uptime** (recommended) | 10 monitors, 3-min checks | Point at `https://monitus.ai/api/health`, alert on non-200 |
| **UptimeRobot** | 50 monitors, 5-min checks | Same as above |
| **Vercel Analytics** | Built-in | Enable in Vercel dashboard |

Configure alerts to notify both founders via SMS/Slack/email.

### 5.3 Vercel Logs

- **Access**: Vercel Dashboard > Project > Logs
- **Retention**: 1 hour on Hobby (1 day on Pro, 3 days on Enterprise)
- All `console.error()` calls in catch blocks appear here
- Filter by: Function name, status code, timeframe

**Key log patterns to watch for:**
```
[cron/news] Failed after XXXms:          → Cron failure
Webhook error:                            → Stripe webhook processing failure
Failed to send welcome email:             → Resend API issue
JWT_SECRET must be set in production      → Missing environment variable
STRIPE_SECRET_KEY environment variable    → Stripe not configured
```

### 5.4 Recommended Observability Stack

| Tool | Purpose | Priority |
|------|---------|----------|
| **Sentry** | Error tracking with stack traces and context | High |
| **Vercel Analytics Pro** | Web Vitals, function duration, cold starts | Medium |
| **Better Uptime** | External availability monitoring | High |
| **Neon Dashboard** | Database metrics (connections, query stats) | Medium |
| **Stripe Dashboard** | Payment success/failure rates | Medium |
| **Anthropic Console** | API usage, rate limits, costs | Medium |

### 5.5 Key Metrics to Track

| Metric | Target | Where to Find |
|--------|--------|---------------|
| Uptime | >99.5% | Better Uptime / UptimeRobot |
| Health check response | `status: ok` | `/api/health` |
| Cron success rate | 100% | Vercel logs at 07:00 UTC |
| API error rate | <1% | Vercel logs / Sentry |
| Function cold start time | <2s | Vercel Analytics |
| Database connection time | <300ms | Health endpoint latency |
| Anthropic API latency | <10s | Vercel function logs |
| Stripe webhook success | 100% | Stripe Dashboard |

---

## 6. Common Issues & Troubleshooting

### 6.1 Vercel Function Timeouts

**Symptom**: 504 Gateway Timeout or function killed after 10s
**Root cause**: Hobby tier has a 10-second function timeout (except cron which has `maxDuration = 60`)

**Content generation timeouts:**
- The Claude API call for content generation requests up to 4,096 tokens — this typically completes in 3-8 seconds
- If Anthropic is slow, the function will time out at 10s
- The codebase has template-based fallbacks when `ANTHROPIC_API_KEY` is not set, but no timeout fallback when the API is slow

**Resolution:**
1. Check Anthropic status page: [status.anthropic.com](https://status.anthropic.com)
2. If persistent, consider upgrading to Vercel Pro (60-second timeout)
3. For immediate relief, retry the request — cold starts contribute to timeouts

### 6.2 API Rate Limits

**In-app rate limiting** is per-serverless-instance via `src/lib/validation.ts`:

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Auth (login, register) | 5 req | 1 min |
| Admin routes | 30 req | 1 min |
| Billing | 10 req | 1 min |
| Content/News | 30 req | 1 min |
| Generate | 10 req | 1 min |

Note: Because rate limiting is in-memory and serverless functions are ephemeral, limits reset on cold starts and are per-instance. This provides basic protection but is not foolproof.

**External API rate limits:**

| Service | Limit | What Happens |
|---------|-------|-------------|
| Anthropic Claude | Varies by tier (typically 50-1000 RPM) | 429 error, retry with backoff |
| Stripe | 100 read/s, 25 write/s | 429 error |
| Resend | 100 emails/day (free), 50k/month (Pro) | 429 error |
| RSS feeds | Varies per source | Connection timeout or 429 |

### 6.3 RSS Feed Failures

**Symptom**: Cron returns `fetched: 0` or high error count
**Diagnosis**: Check Vercel logs for specific feed errors

**Common causes:**
- Feed URL changed or domain moved
- Feed temporarily down
- IP-based rate limiting from feed provider
- SSL certificate issues

**Resolution:**
1. Test each feed URL individually: `curl -L <feed-url> | head -50`
2. Update broken URLs in `src/lib/news.ts` in the `INSURANCE_FEEDS` array
3. Feed failures are isolated — `Promise.allSettled()` ensures one broken feed does not block others
4. If a feed consistently fails, consider removing it or replacing it

### 6.4 Stripe Webhook Failures

**Symptom**: Payments succeed in Stripe but subscriptions are not created in the database
**Diagnosis**: Check Vercel logs for `Webhook error:` messages

**Handled webhook events:**
- `checkout.session.completed` — Creates subscription + invoice
- `customer.subscription.updated` — Updates subscription status
- `customer.subscription.deleted` — Marks subscription cancelled
- `invoice.payment_succeeded` — Creates invoice record
- `invoice.payment_failed` — Sends payment failure notification

**Common causes:**
1. **`STRIPE_WEBHOOK_SECRET` mismatch**: Verify the secret matches the Stripe webhook endpoint
2. **Webhook endpoint not configured**: In Stripe Dashboard, the webhook URL must be `https://monitus.ai/api/webhooks/stripe`
3. **Signature verification failure**: Clock skew or body parsing issue
4. **Database error during processing**: Check for SQL errors in logs

**Resolution:**
1. Go to Stripe Dashboard > Webhooks > check recent deliveries
2. Failed events can be manually retried from the Stripe Dashboard
3. For persistent failures, re-create the webhook endpoint in Stripe and update `STRIPE_WEBHOOK_SECRET`

**Idempotency note**: The `checkout.session.completed` handler checks for existing `stripe_subscription_id` before creating a new subscription, making it safe to replay events.

### 6.5 Database Connection Errors

**Symptom**: Health check shows `database: disconnected` or API routes return 500

**Common causes:**
- Neon instance auto-suspended (free tier suspends after 5 min inactivity)
- Connection pooler at capacity
- Region outage

**Resolution:**
1. Check Neon dashboard for the project status
2. First request after suspension has ~1-2s cold start — this is normal
3. If persistent, check [Neon status page](https://neonstatus.com)
4. Verify `POSTGRES_URL` env var is correctly set in Vercel

### 6.6 Authentication Issues

**Symptom**: Users cannot log in or get redirected to `/login` unexpectedly

**Common causes:**
- `JWT_SECRET` was rotated — all existing tokens are invalidated
- Cookie `monitus_token` not being set (check `Secure` flag and domain)
- User account disabled (`disabled = true`)

**Resolution:**
1. Check if `JWT_SECRET` was recently changed
2. Verify cookie settings match the domain
3. Check user record: `SELECT disabled, email_verified FROM users WHERE email = '<email>'`

---

## 7. Incident Response Playbook

### 7.1 Severity Levels

| Level | Definition | Examples | Response Time |
|-------|-----------|----------|---------------|
| **SEV-1 (Critical)** | Platform completely down | Database unreachable, Vercel outage, domain DNS failure | Immediate (within 15 min) |
| **SEV-2 (Major)** | Core feature broken for all users | Content generation failing, auth broken, Stripe webhooks down | Within 1 hour |
| **SEV-3 (Minor)** | Feature degraded or broken for some users | One RSS feed failing, slow API responses, email delivery delayed | Within 4 hours |
| **SEV-4 (Low)** | Cosmetic or non-urgent | UI glitch, non-critical log errors | Next business day |

### 7.2 Incident Response Steps

**1. Detect**
- Health check alert fires
- User reports issue
- Monitoring shows anomaly

**2. Assess**
```bash
# Quick health check
curl https://monitus.ai/api/health

# Check Vercel deployment status
# → Vercel Dashboard > Deployments

# Check recent errors
# → Vercel Dashboard > Logs > filter by 5xx
```

**3. Communicate**
- SEV-1/2: Post status update at the domain's status page (if configured) or notify users via email
- SEV-3/4: Internal tracking only

**4. Mitigate**
- If the issue is a bad deployment: **Rollback** (see Section 1.4)
- If the issue is a third-party outage: Document and wait, or activate fallbacks
- If the issue is data corruption: Stop writes, assess scope, restore from backup

**5. Resolve**
- Deploy fix or confirm third-party recovery
- Verify via health check and manual testing

**6. Post-mortem** (SEV-1/2 only)
- Document: timeline, root cause, impact, resolution
- Identify preventive actions
- Update this runbook if needed

### 7.3 Escalation Path

```
Founder 1 (primary on-call)
    ↓ (if unreachable after 15 min)
Founder 2 (secondary on-call)
    ↓ (if infrastructure issue)
Vercel Support (for platform issues)
Neon Support (for database issues)
Stripe Support (for payment issues)
```

### 7.4 Third-Party Status Pages

| Service | Status Page |
|---------|------------|
| Vercel | [vercel-status.com](https://www.vercel-status.com) |
| Neon | [neonstatus.com](https://neonstatus.com) |
| Anthropic | [status.anthropic.com](https://status.anthropic.com) |
| Stripe | [status.stripe.com](https://status.stripe.com) |
| Resend | [status.resend.com](https://status.resend.com) |

---

## 8. Scaling Guide

### 8.1 Current Limits (Vercel Hobby — $0/month)

| Resource | Limit | Current Usage |
|----------|-------|---------------|
| Function timeout | 10 seconds | Content gen uses 3-8s |
| Function memory | 1024 MB | Well within limits |
| Bandwidth | 100 GB/month | Minimal (text-based app) |
| Serverless executions | 100k/month | Monitor as users grow |
| Cron jobs | 1/day | Fully consumed (news fetch) |
| Build time | 45 min max | ~30s actual |
| Concurrent builds | 1 | Sufficient for now |

### 8.2 Upgrade Triggers

**Upgrade to Vercel Pro ($20/month) when:**
- [ ] Content generation regularly times out (need 60s timeout)
- [ ] You need more than 1 cron job (e.g., weekly digest emails, competitor scans)
- [ ] Log retention of 1 hour is insufficient for debugging
- [ ] You need password-protected preview deployments
- [ ] Serverless executions approach 100k/month

**Upgrade to Neon Pro ($19/month) when:**
- [ ] You need point-in-time recovery (PITR) for data safety
- [ ] Database branches for staging/testing
- [ ] Auto-scaling compute beyond free tier limits
- [ ] More than 0.5 GB storage

**Upgrade Anthropic tier when:**
- [ ] Rate limits are hit during peak usage
- [ ] Need higher throughput for concurrent content generation

### 8.3 Pro Tier Benefits

| Feature | Hobby | Pro ($20/mo) |
|---------|-------|-------------|
| Function timeout | 10s | 60s |
| Cron jobs | 1/day | 5 cron jobs |
| Log retention | 1 hour | 1 day |
| Bandwidth | 100 GB | 1 TB |
| Serverless executions | 100k/mo | 1M/mo |
| Preview protection | No | Yes |
| DDoS mitigation | Basic | Advanced |
| Support | Community | Email |

### 8.4 Architecture Scaling Considerations

**Current architecture handles ~50-100 concurrent users well.** Beyond that:

- **Database**: Neon auto-scales connections via its pooler; no action needed until storage limits hit
- **Serverless functions**: Vercel auto-scales instances; no configuration needed
- **Rate limiting**: Current in-memory rate limiting is per-instance; for strict global rate limiting, consider Vercel KV or Upstash Redis
- **Content generation**: Claude API is the bottleneck — consider request queuing for >50 concurrent generation requests
- **RSS ingestion**: Currently processes 13 feeds sequentially per article; scales linearly with feed count

---

## 9. Backup & Recovery

### 9.1 Database Backups

**Automated (Neon):**
- Free tier: History retained for 24 hours (but no self-service restore without branching)
- Pro tier: 7-30 day PITR with instant restore

**Manual (recommended until on Neon Pro):**
```bash
# Weekly backup script
pg_dump "$DATABASE_URL_UNPOOLED" \
  --no-owner --no-acl --clean \
  --format=custom \
  > monitus-backup-$(date +%Y%m%d).dump

# Store in a secure location (e.g., encrypted S3 bucket, Google Drive)
```

**Restore:**
```bash
pg_restore --no-owner --no-acl --clean \
  -d "$DATABASE_URL_UNPOOLED" \
  monitus-backup-20260315.dump
```

### 9.2 Code Backups

- **Primary**: GitHub repository (all code, including infrastructure config)
- **Secondary**: Vercel retains all deployment artifacts
- Ensure all environment variables are documented (never stored in code)

### 9.3 Configuration Backups

Export environment variables periodically:
```bash
# Via Vercel CLI
vercel env ls --environment production
vercel env pull .env.production.backup --environment production
```

Store the backup file encrypted and separate from the code repository.

### 9.4 Recovery Scenarios

| Scenario | Recovery Steps | RTO |
|----------|---------------|-----|
| Bad deployment | Rollback in Vercel (Section 1.4) | 2-5 minutes |
| Deleted database table | Restore from pg_dump backup | 15-30 minutes |
| Corrupted data | Restore from backup + replay missed cron runs | 30-60 minutes |
| Lost environment variables | Restore from encrypted backup | 5-10 minutes |
| Vercel account compromised | Rotate all secrets, redeploy from GitHub | 1-2 hours |
| Full database loss | Restore from backup; first request re-runs `initDb()` for schema | 30-60 minutes |

---

## 10. On-call Procedures

### 10.1 On-call Schedule (2-Person Team)

**Recommended rotation:** Alternate weeks.

| Week | Primary | Secondary |
|------|---------|-----------|
| Odd weeks | Founder A | Founder B |
| Even weeks | Founder B | Founder A |

### 10.2 On-call Responsibilities

**Primary on-call:**
- Respond to all alerts within 15 minutes (SEV-1/2) or 4 hours (SEV-3)
- Perform the daily check at ~08:00 UTC (after cron runs at 07:00 UTC)
- Own incident resolution and communication

**Secondary on-call:**
- Available for escalation if primary is unreachable
- Available for pair-debugging on SEV-1 issues

### 10.3 Daily Check (2 minutes)

Run this each morning after the cron job:

```bash
# 1. Health check
curl -s https://monitus.ai/api/health | python3 -m json.tool

# 2. Check cron ran successfully (in Vercel Dashboard > Logs, filter for /api/cron/news)
# Look for: "[cron/news] Fetched X articles in Yms"

# 3. Quick Stripe check (if billing is live)
# → Stripe Dashboard > Payments > check for failed payments
```

### 10.4 Alert Configuration

Set up alerts for:
1. **Health endpoint down** (Better Uptime / UptimeRobot)
2. **Stripe payment failures** (Stripe email notifications)
3. **Anthropic usage approaching limits** (Anthropic Console alerts)
4. **Neon database issues** (Neon dashboard alerts)

Deliver alerts via:
- SMS for SEV-1/2
- Email/Slack for SEV-3/4

---

## 11. Cost Management

### 11.1 Infrastructure Costs

| Service | Plan | Monthly Cost | Notes |
|---------|------|-------------|-------|
| Vercel | Hobby | $0 | Free tier; $20/mo for Pro |
| Neon Postgres | Free | $0 | 0.5 GB storage; $19/mo for Pro |
| Domain | Annual | ~$12/yr (~$1/mo) | monitus.ai |
| **Total infrastructure** | | **~$1/mo** | |

### 11.2 Variable Costs (Usage-Based)

| Service | Cost Model | Estimated Monthly (10 active users) |
|---------|-----------|-------------------------------------|
| Anthropic Claude (Sonnet 4) | ~$0.08/content piece | $5-15/mo |
| Resend | Free up to 100 emails/day | $0 (then $20/mo) |
| Stripe | 2.9% + 30c per transaction | Scales with revenue |

### 11.3 Anthropic API Cost Breakdown

From the business model document, per active user per month:

| Feature | Est. Cost/Use | Monthly Uses | Monthly Cost |
|---------|--------------|-------------|-------------|
| Content Generation | $0.08 | 8-12 | $0.64-$0.96 |
| Daily Briefing | $0.06 | 20 | $1.20 |
| Narrative Interview | $0.25 | 1-2 | $0.25-$0.50 |
| News Angles | $0.06 | 4-8 | $0.24-$0.48 |
| Competitive Intel | $0.04 | 2-4 | $0.08-$0.16 |
| **Total per user** | | | **$2.41-$3.30** |

**Cost monitoring**: Check the [Anthropic Console](https://console.anthropic.com) usage dashboard weekly. Set billing alerts at $50, $100, $200 thresholds.

### 11.4 Cost Optimization Strategies

1. **Anthropic**: Content generation fallback templates exist for when the API key is unset — these could be extended as a cost-saving measure for low-value operations
2. **Neon**: The free tier suspends after inactivity, which saves compute but adds cold-start latency; acceptable at low scale
3. **Vercel**: Hobby tier is sufficient until function timeouts become an issue
4. **Resend**: Batch digest emails instead of individual notifications to stay within free tier

### 11.5 Revenue vs Cost Targets

At minimum viable scale (10 Starter customers at GBP 500/mo):
- **Monthly revenue**: GBP 5,000
- **Infrastructure cost**: ~$20 (if upgraded to Pro tiers)
- **API cost**: ~$30
- **Gross margin**: >99%

Monitor the ratio of API costs to revenue monthly. Alert if API cost per customer exceeds $10/month.

---

## 12. Release Process

### 12.1 Branch Strategy

```
main (production)
  └── feature/xyz (development)
  └── fix/abc (bug fixes)
```

- `main` is always deployable — every merge triggers a production deployment
- Feature branches get Vercel preview deployments automatically
- No separate staging environment (preview deployments serve this purpose)

### 12.2 Pre-Release Checklist

Before merging to `main`:

- [ ] Code changes tested locally (`npm run dev`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Preview deployment tested on Vercel (check the PR preview URL)
- [ ] Database migrations are backwards-compatible (uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`)
- [ ] New environment variables added to Vercel project settings
- [ ] No secrets committed to the repository
- [ ] Health endpoint returns `status: ok` on the preview deployment

### 12.3 Deployment Workflow

```
1. Push feature branch → Vercel preview deployment created
2. Test preview URL manually
3. Merge PR to main → Vercel production deployment triggered
4. Verify: curl https://monitus.ai/api/health
5. Smoke test: log in, check key features
```

### 12.4 Rollback

If issues are discovered post-deployment:

**Option A — Vercel instant rollback (preferred):**
1. Vercel Dashboard > Deployments
2. Find the previous healthy deployment
3. Three-dot menu > Promote to Production
4. Takes effect in seconds

**Option B — Git revert:**
```bash
git revert HEAD
git push origin main
# Wait ~30s for Vercel to build and deploy
```

### 12.5 Feature Flags

The codebase uses **tier-gating** as a de facto feature flag system via `src/lib/tier-gate.ts`:

| Feature | Required Tier |
|---------|--------------|
| `briefing_builder` | Intelligence |
| `competitor_monitoring` | Intelligence |
| `quarterly_review` | Intelligence |
| `trade_media` | Intelligence |
| `monthly_report` | Growth |
| `linkedin_api` | Growth |
| `email_export` | Growth |
| `daily_monitoring` | Growth |
| `all_content_formats` | Growth |

For non-tier feature flags, use environment variables:
```
FEATURE_XYZ_ENABLED=true
```

Check in code:
```typescript
if (process.env.FEATURE_XYZ_ENABLED === 'true') { ... }
```

### 12.6 Database Migrations in Production

The schema is managed via `initDb()` in `src/lib/db.ts`. All migrations use idempotent patterns:

- `CREATE TABLE IF NOT EXISTS` — safe to re-run
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — safe to re-run
- `CREATE UNIQUE INDEX IF NOT EXISTS` — safe to re-run
- `ON CONFLICT DO NOTHING` / `ON CONFLICT DO UPDATE` — for seed data

**Adding a new table or column:**
1. Add the `CREATE TABLE IF NOT EXISTS` or `ALTER TABLE ADD COLUMN IF NOT EXISTS` statement to `initDb()` in `src/lib/db.ts`
2. Deploy — the migration runs automatically on the first API request
3. No separate migration tool or step needed

**Destructive migrations** (dropping tables/columns) are not currently supported by this pattern. If needed:
1. Run the destructive SQL manually via the Neon console or `psql`
2. Then deploy the code that no longer references the dropped entity

---

## Appendix A: Quick Reference Commands

```bash
# Health check
curl -s https://monitus.ai/api/health | python3 -m json.tool

# Trigger news cron manually
curl -H "Authorization: Bearer <CRON_SECRET>" https://monitus.ai/api/cron/news

# Local development
cd /Users/steven/Desktop/Monitus
npm run dev    # starts at http://localhost:3000

# Build locally
npm run build

# Database shell
psql "$DATABASE_URL_UNPOOLED"

# Export env vars from Vercel
vercel env pull .env.local

# Deploy manually
npx vercel --prod

# Check Vercel deployment status
npx vercel ls
```

## Appendix B: Key File Paths

| File | Purpose |
|------|---------|
| `vercel.json` | Cron schedule configuration |
| `package.json` | Dependencies and scripts |
| `src/middleware.ts` | Auth middleware, security headers, public routes |
| `src/lib/db.ts` | Database schema, migrations, seed data |
| `src/lib/auth.ts` | Authentication (JWT, bcrypt, Google OAuth) |
| `src/lib/stripe.ts` | Stripe integration (checkout, portal, webhooks) |
| `src/lib/news.ts` | RSS feed ingestion (13 feeds) |
| `src/lib/email.ts` | Resend email templates |
| `src/lib/generate.ts` | Claude AI content generation |
| `src/lib/tier-gate.ts` | Feature tier gating |
| `src/lib/validation.ts` | Input validation, rate limiting |
| `src/app/api/cron/news/route.ts` | Cron job handler |
| `src/app/api/health/route.ts` | Health check endpoint |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |

## Appendix C: Incident Log Template

```
## Incident: [Title]
**Date**: YYYY-MM-DD
**Severity**: SEV-X
**Duration**: X minutes/hours
**Impact**: [Who was affected and how]

### Timeline
- HH:MM — Alert triggered / Issue discovered
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Service restored

### Root Cause
[What went wrong]

### Resolution
[What was done to fix it]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
```


---

<!-- NEW TAB: INVESTOR-ONE-PAGER -->

# Monitus — Investor One-Pager

**The growth intelligence engine for specialist insurance companies.**
www.monitus.ai

---

## The Problem

Specialist insurers (MGAs, brokers, insurtechs) know their markets deeply but cannot communicate that expertise consistently. Their options today:

- **Hire an agency** that doesn't understand insurance jargon or regulatory constraints: **£5-15k/month**
- **Rely on founders** to write content sporadically between underwriting and client work
- **Do nothing** and lose positioning to more visible competitors

There are **2,500+ specialist insurance companies in the UK alone**, most with zero dedicated content capability.

---

## The Solution

Monitus is an AI platform **purpose-built for insurance** that replaces the agency model:

1. **Monitors** the market via 13 insurance news feeds (FCA, Insurance Times, Artemis, AM Best, etc.)
2. **Defines** the company narrative through a conversational AI interview (rated 5.0/5 by users)
3. **Produces** compliant content in 6 formats (newsletter, LinkedIn, podcast, email, briefings, trade media)
4. **Distributes** across channels with scheduling and tracking
5. **Learns** the company's voice from every edit, improving over time

Built-in compliance checking for FCA, PRA, GDPR, and Solvency II. No other AI content tool does this.

---

## Market Opportunity

| | |
|---|---|
| **UK target companies** | 2,500+ specialist insurers |
| **Expansion markets** | DACH and Nordics (Phase 2) |
| **Price vs. incumbents** | £500-2,000/mo vs. £5-15k/mo agency spend |
| **Buyer** | Head of Marketing, VP Comms, Managing Director |

Generic AI writing tools (Jasper, Copy.ai) lack insurance domain knowledge and compliance guardrails. Agencies are 10-30x more expensive and slower to produce.

---

## Traction & Product Status

- **Live product** at www.monitus.ai — fully built and tested
- 57 API endpoints, 22 database tables, 22 pages
- Complete feature set: narrative interview, content generation, news monitoring, briefings, reports, team management, Stripe billing
- Star feature (Narrative Interview) rated **5.0/5** by test users
- Entering GTM phase

---

## Business Model

| Tier | Price | Target |
|------|-------|--------|
| Trial | £0 (14 days) | Evaluation |
| Starter | £500/mo | Solo marketer at MGA/broker |
| Growth | £1,200/mo | Content team, mid-tier insurer |
| Intelligence | £2,000/mo | CSO/CMO, top-20 insurer |

**Unit economics:** 96%+ gross margins across all paid tiers. AI cost per user is approximately £3/month — under 0.6% of Starter revenue.

**Revenue projections (Year 1):**
- Conservative: £307k ARR (20 Starter, 8 Growth, 3 Intelligence)
- Moderate: £648k ARR (40 Starter, 15 Growth, 8 Intelligence)

---

## Team

Two co-founders. Bootstrapped to date. Product fully built and live without external funding.

---

## The Ask

Seeking pre-seed investment to fund:

- **Go-to-market execution** — Sales hire, insurance conference presence, partnership development
- **Product expansion** — LinkedIn OAuth integration, CRM integrations, multi-language support for DACH/Nordics
- **Compliance certification** — SOC 2 audit, EU data residency for enterprise buyers

---

**Contact:** hello@thatotheragency.co.uk | www.monitus.ai


---

<!-- NEW TAB: PITCH-DECK-OUTLINE -->

# Monitus — Pitch Deck Outline

**Target duration:** 15 minutes (12 core slides + appendix)
**Audience:** Pre-seed / seed investors

---

## Slide 1: Title

**Title:** Monitus — Growth Intelligence for Insurance

**Key message:** The AI platform that replaces the marketing agency for specialist insurance companies.

**Supporting data:**
- www.monitus.ai — live product
- Tagline: "The growth intelligence engine for insurance companies that don't have a 10-person marketing team."

**Visual:** Product screenshot (dashboard or narrative interview in progress) with the Monitus logo. Clean, professional. No stock photography.

---

## Slide 2: The Problem

**Title:** Specialist Insurers Have an Expertise Communication Gap

**Key message:** These companies know their markets better than anyone but cannot turn that knowledge into consistent visibility. The current options are all broken.

**Supporting data:**
- Option A: Agencies cost £5-15k/month and don't understand insurance terminology, regulation, or market structure
- Option B: Founders write content sporadically — inconsistent cadence, no strategy, competes with core responsibilities
- Option C: Do nothing — lose positioning, miss distribution opportunities, appear less credible to brokers and partners
- Insurance content requires domain knowledge (London Market, treaty vs. facultative, ILS, Lloyd's syndicate structures) that general-purpose tools and agencies lack
- Regulatory compliance (FCA, PRA, Solvency II, GDPR) means generic content is actively risky

**Visual:** Three-column layout showing each option with cost, quality, and consistency rated. All three fail on at least two dimensions.

---

## Slide 3: The Market

**Title:** 2,500+ Specialist Insurance Companies in the UK. Most Have Zero Content Capability.

**Key message:** Large addressable market of companies that are underserved by existing solutions, with clear expansion path to continental Europe.

**Supporting data:**
- UK: 2,500+ MGAs, specialty brokers, insurtechs, niche carriers, and reinsurers
- Average company size: 10-2,000 employees — too small for an in-house content team, too specialised for a generic agency
- Expansion markets: DACH (Germany, Austria, Switzerland) and Nordics — similar market structures, same communication gap
- Buyer: Head of Marketing, VP Communications, Managing Director, CSO/CMO
- Budget: £500-2,000/month replacing £5-15k/month agency spend

**Visual:** Map of UK with density markers for specialist insurance hubs (London/EC3, Manchester, Birmingham, Edinburgh). Expansion arrows to Frankfurt, Zurich, Copenhagen.

---

## Slide 4: The Solution

**Title:** AI Purpose-Built for Insurance — From News to Published Content in Minutes

**Key message:** Monitus is a complete content intelligence pipeline, not a generic writing tool. Five integrated capabilities working together.

**Supporting data:**
1. **Monitor** — 13 RSS feeds covering UK specialty, reinsurance, ILS, and regulatory sources. Daily cron at 7 AM UTC.
2. **Define** — Conversational AI narrative interview extracts brand positioning and voice (rated 5.0/5). Two-phase: positioning discovery, then voice and tone calibration.
3. **Produce** — 6 content formats (newsletter, LinkedIn, podcast script, email, briefings, trade media pitches). Department-targeted. Compliance-checked.
4. **Distribute** — Schedule and track across channels with engagement metrics.
5. **Learn** — Every user edit trains the voice model. Last 100 edits loaded as generation context.

**Visual:** Horizontal pipeline diagram: Monitor -> Define -> Produce -> Distribute -> Learn (with a feedback loop arrow from Learn back to Produce).

---

## Slide 5: Product Demo / Screenshots

**Title:** Live Product — Fully Built, Fully Tested

**Key message:** This is not a prototype or mockup. Monitus is live at www.monitus.ai with complete infrastructure.

**Supporting data:**
- 57 API endpoints, 22 database tables, 22 pages
- Complete feature set shipped: narrative interview, content generation, news radar, briefing builder, reports dashboard, content library, team management, Stripe billing
- Tech stack: Next.js, Vercel, Neon Postgres, Claude Sonnet 4
- GDPR: account export and delete implemented
- FCA compliance checking: automated at generation time

**Visual:** 3-4 product screenshots arranged in a grid: (1) Narrative interview conversation, (2) Content generation with compliance badges, (3) News radar feed, (4) Reports dashboard. Actual UI, not mockups.

---

## Slide 6: The Star Feature — Narrative Interview

**Title:** 5.0/5 User Rating — The Feature That Makes Everything Else Work

**Key message:** The narrative interview is the moat. It extracts deep domain positioning that generic AI tools cannot replicate, and it produces a structured messaging bible that governs all downstream content.

**Supporting data:**
- Conversational AI interview across two phases (~10+ exchanges total)
- Phase A: Positioning Discovery — company overview, target audiences, competitors, differentiators, challenges, growth ambitions
- Phase B: Voice and Tone — formal vs. casual, technical vs. accessible, bold vs. measured, admired brands, words to use and avoid
- Output: structured messaging bible with audiences, competitors, pillars, and voice guide — auto-saved to database
- Every piece of content generated references this narrative, ensuring consistency across all formats and departments
- Users describe it as "like having a brand strategist on call"

**Visual:** Side-by-side: the interview conversation on the left, the resulting messaging bible output on the right. Highlight the transformation from natural conversation to structured strategy document.

---

## Slide 7: Competitive Landscape

**Title:** The Only AI Content Platform Built for Insurance Compliance

**Key message:** Generic AI tools lack domain knowledge. Agencies lack scalability and affordability. Monitus occupies a unique position.

**Supporting data:**

| | Generic AI (Jasper, Copy.ai) | PR/Content Agency | Insurance Consultant | **Monitus** |
|---|---|---|---|---|
| **Monthly cost** | £40-400 | £5,000-15,000 | £2,000-5,000 | £500-2,000 |
| **Insurance domain knowledge** | None | Minimal | Deep | Deep (AI-encoded) |
| **Compliance checking** | None | Manual | Manual | Automated (FCA, GDPR, Solvency II) |
| **Content consistency** | User-dependent | Variable | Good | Systematic (narrative-driven) |
| **Scalability** | High | Low | Low | High |
| **Time to first output** | Minutes | Weeks | Days | Minutes |

**Visual:** 2x2 matrix with axes "Insurance Expertise" (low to high) and "Cost Efficiency" (low to high). Monitus sits in the top-right quadrant alone.

---

## Slide 8: Business Model

**Title:** SaaS with 96%+ Gross Margins

**Key message:** High-margin subscription model with clear upgrade path. AI costs are negligible relative to revenue.

**Supporting data:**

| Tier | Monthly | Annual | Target Customer |
|------|---------|--------|-----------------|
| Trial | £0 (14 days) | — | Evaluation |
| Starter | £500/mo | £4,800/yr | Solo marketer at MGA/broker |
| Growth | £1,200/mo | £11,520/yr | Content team, mid-tier insurer |
| Intelligence | £2,000/mo | £19,200/yr | CSO/CMO, top-20 insurer |

- AI cost per user: approximately £3/month (0.6% of Starter revenue)
- Total COGS at Starter tier: £19.90/month (96.0% gross margin)
- Total COGS at Intelligence tier: £72.20/month (96.4% gross margin)
- Net revenue retention target: 110%+ (tier upgrades outweigh churn)

**Visual:** Stacked bar chart showing revenue vs. COGS for each tier. The COGS slice should be barely visible, emphasising the margin story.

---

## Slide 9: Revenue Projections

**Title:** Path to £300k-£650k ARR in Year 1

**Key message:** Conservative model requires only 31 paying customers by month 12. Moderate model requires 63.

**Supporting data:**

**Conservative scenario:**

| Month | Starter | Growth | Intelligence | MRR | ARR |
|-------|---------|--------|-------------|-----|-----|
| 3 | 5 | 1 | 0 | £3,700 | £44,400 |
| 6 | 10 | 3 | 1 | £10,600 | £127,200 |
| 12 | 20 | 8 | 3 | £25,600 | £307,200 |

**Moderate scenario:**

| Month | Starter | Growth | Intelligence | MRR | ARR |
|-------|---------|--------|-------------|-----|-----|
| 3 | 8 | 2 | 1 | £8,400 | £100,800 |
| 6 | 20 | 6 | 3 | £23,200 | £278,400 |
| 12 | 40 | 15 | 8 | £54,000 | £648,000 |

- Target addressable market: 2,500+ companies. Moderate scenario captures 2.5% in Year 1.
- Trial to paid conversion target: 15-25%
- Monthly churn target: less than 3%

**Visual:** Line chart showing MRR growth over 12 months for both scenarios. Shaded area between the two lines represents the likely range.

---

## Slide 10: Go-to-Market Strategy

**Title:** Insurance-Native Distribution — We Go Where They Already Are

**Key message:** Concentrated, high-trust market with clear gathering points. Not a spray-and-pray SaaS launch.

**Supporting data:**
- **Conference presence:** Insurance industry events (BIBA, Airmic, ILS Bermuda, InsurTech Connect) — decision-makers attend in person
- **Trade media partnerships:** Insurance Times, Insurance Post, The Insurer — content-for-exposure arrangements
- **LinkedIn thought leadership:** Insurance LinkedIn is highly active; decision-makers engage with specialist content daily
- **Partnership channel:** Insurance technology consultants, compliance advisors, and Lloyd's service providers as referral partners
- **Product-led growth:** 14-day free trial with narrative interview as the hook — users experience the star feature immediately
- **Time to value:** First content generated within 30 minutes of signup

**Visual:** Funnel diagram: Awareness (conferences, trade media, LinkedIn) -> Trial (14-day free, narrative interview) -> Conversion (content generation, voice learning) -> Expansion (tier upgrades, team seats).

---

## Slide 11: Team

**Title:** Two Founders. Bootstrapped. Product Shipped.

**Key message:** Small team that has already built and shipped a complete product without external funding. Every pound of investment goes directly to growth.

**Supporting data:**
- Two co-founders with complementary skills
- Bootstrapped to date — product fully built and live
- 57 API endpoints, 22 database tables, 22 pages shipped
- Complete billing, authentication, team management, and compliance infrastructure
- Demonstrated ability to build production-grade software at minimal cost (fixed costs under £35/month pre-revenue)

**Visual:** Founder photos with brief bios. Below: a timeline showing key build milestones leading to the current live product.

---

## Slide 12: The Ask

**Title:** Pre-Seed Round — Fuel the GTM Engine

**Key message:** The product is built. Investment accelerates customer acquisition and market expansion.

**Supporting data:**
- **Use of funds:**
  - Go-to-market execution: first sales hire, insurance conference circuit, partnership development
  - Product expansion: LinkedIn OAuth (direct posting), CRM integrations (HubSpot, Salesforce), content calendar
  - International preparation: multi-language support (DE, FR, NL) for DACH/Nordics expansion
  - Enterprise readiness: SOC 2 audit logging, EU data residency, SSO/SAML
- **Key milestones funded by this round:**
  - First 50 paying customers
  - £500k+ ARR run rate
  - DACH market entry validated
  - Enterprise feature set complete

**Visual:** Pie chart of fund allocation. Timeline below showing milestones at 6, 12, and 18 months post-investment.

---

## Slide 13: Closing / Contact

**Title:** The Agency Model Is Broken. Monitus Fixes It.

**Key message:** Live product. Massive margin. Concentrated market. Insurance-specific moat. Ready to scale.

**Supporting data:**
- www.monitus.ai — try the product
- hello@thatotheragency.co.uk
- Key stats recap: 96%+ margins, 2,500+ target companies, £500-2k/mo price point, product live and tested

**Visual:** Single product screenshot with contact details and QR code linking to www.monitus.ai.

---

---

# Appendix Slides

*For deep-dive questions during Q&A or follow-up meetings.*

---

## Appendix A: Technical Architecture

**Title:** Modern Stack, Minimal Infrastructure Cost

**Key data:**
- Next.js (React) on Vercel serverless — auto-scaling, zero DevOps
- Neon Postgres (serverless) — connection pooling, scales with demand
- Claude Sonnet 4 via Anthropic API — state-of-the-art language model
- Stripe for billing — PCI compliant, handles subscriptions and metering
- Resend for transactional email
- 13 RSS feeds via daily cron job
- Fixed infrastructure costs: under £35/month pre-revenue, approximately £500/month at 100 users

**Visual:** Architecture diagram showing data flow between components.

---

## Appendix B: Detailed Unit Economics

**Title:** Cost Breakdown by Tier

**Key data:**

| | Starter (£500/mo) | Growth (£1,200/mo) | Intelligence (£2,000/mo) |
|---|---|---|---|
| AI API costs | £3.00 | £5.00 | £8.00 |
| Hosting | £1.50 | £2.00 | £3.00 |
| Database | £0.50 | £1.00 | £2.00 |
| Stripe fees | £14.70 | £35.00 | £58.20 |
| Email | £0.20 | £0.50 | £1.00 |
| **Total COGS** | **£19.90** | **£43.50** | **£72.20** |
| **Gross margin** | **96.0%** | **96.4%** | **96.4%** |

- AI costs scale sub-linearly with usage — heavier users generate more content but the per-call cost remains fixed
- Stripe fees are the largest COGS component, not AI

**Visual:** Waterfall chart showing revenue minus each cost component, arriving at gross profit.

---

## Appendix C: Feature Roadmap

**Title:** 180-Day Product Roadmap

**Key data:**
- **Phase 2 (Next 30 days):** Custom RSS feeds, LinkedIn OAuth, content calendar, content versioning, custom topic generation
- **Phase 3 (30-60 days):** FCA compliance rule engine (sentence-level), bulk generation, approval workflows, knowledge base upload, A/B headline testing
- **Phase 4 (60-90 days):** CRM integrations, multi-language (DE, FR, NL), board presentation export, webhook API, AI-assisted editing
- **Phase 5 (90-180 days):** SOC 2 audit logging, multi-region EU deployment, custom compliance rules, white-label embedding, SSO/SAML

**Visual:** Gantt-style timeline with phases colour-coded and key features called out.

---

## Appendix D: Compliance and Regulatory Detail

**Title:** Built for Regulated Industries from Day One

**Key data:**
- Automated compliance checking against declared frameworks: FCA, PRA, GDPR, Solvency II, TCFD
- Content flagged for regulatory risk before publication
- GDPR: full account data export and deletion implemented
- Roadmap: sentence-level FCA compliance rule engine (Phase 3), SOC 2 audit logging (Phase 5), EU data residency (Phase 5)
- Insurance-specific: content never makes performance claims, avoids misleading statements about coverage, respects regulatory boundaries on financial promotions

**Visual:** Compliance framework logos with checkmarks for implemented vs. planned status.

---

## Appendix E: Competitive Deep Dive

**Title:** Why Generic AI Tools Fail in Insurance

**Key data:**
- **Jasper / Copy.ai / ChatGPT:** No insurance training data, no compliance checking, no narrative persistence, no news monitoring. Users must prompt-engineer every output. Cannot maintain consistent voice across formats.
- **Insurance PR agencies (Luther Pendragon, Haggie Partners, etc.):** Deep domain knowledge but £5-15k/month, 2-4 week turnaround for content, limited scalability, single point of failure on account manager.
- **Insurance content consultants:** £2-5k/month, good quality but manual process, no technology leverage, limited formats.
- **In-house team:** Effective but requires £150k+ annual salary cost for a single content hire, plus management overhead. Only viable for companies with 200+ employees.
- **Monitus advantage:** Combines agency-level domain knowledge with AI scalability at 10-20% of agency cost, with automated compliance that no competitor offers.

**Visual:** Feature comparison matrix with colour-coded cells (green/yellow/red) across 8-10 evaluation criteria.

---

## Appendix F: Key Metrics and Targets

**Title:** What We Will Measure and Report to Investors

**Key data:**
- **Revenue:** MRR, ARR, ARPU (target £800+/month), net revenue retention (target 110%+)
- **Customers:** Trial-to-paid conversion (target 15-25%), monthly logo churn (target under 3%), revenue churn (target under 2%)
- **Product:** Content pieces generated per user per month, interview completion rate (target 80%+), content edit rate, feature adoption by tier
- **Costs:** AI cost per user (target under £5/month), blended COGS (target under 10%), CAC, LTV:CAC ratio (target above 3:1)
- **Time to value:** First content generated within 30 minutes of signup

**Visual:** Dashboard mockup showing the key metrics in a monthly investor report format.


---

<!-- NEW TAB: CUSTOMER-JOURNEY-MAP -->

# Monitus — Customer Journey Map

**Version**: 1.0
**Date**: 15 March 2026

---

## Visual Journey Map Overview

```
STAGE        AWARENESS          EVALUATION         PURCHASE          ONBOARDING         ADOPTION           RETENTION          EXPANSION          ADVOCACY
             (Week -4 to 0)     (Day 1-14)         (Day 10-17)       (Day 1-7 paid)     (Day 7-30 paid)    (Month 2+)         (Month 3+)         (Month 6+)
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

TOUCHPOINTS  LinkedIn posts     Sign-up page        Pricing page      Welcome email       Weekly digest      Monthly report     Upgrade prompt     NPS survey
             Conference talk    Onboarding wizard    Tier comparison    Setup checklist     Feature tips       QBR (Intel)        Feature teaser     Case study ask
             Trade media ad     Narrative Interview  Objection FAQ     Day 3 check-in      Team invite        Usage alert         ROI calculator    Referral program
             Peer referral      First content gen    Sales call        Day 7 milestone     Content calendar   CSM outreach        Limit nudge       Conference slot
             SEO article        Content library      Stripe checkout   Feature walkthrough Workflow guide     Health score        Success story      Community invite

EMOTION      Curious            Impressed            Cautious          Supported           Confident          Reliant             Ambitious          Proud
             Sceptical          Surprised (speed)    Comparing         Slightly overwhelmed Productive        Habitual            Excited            Evangelical
             Intrigued          Excited (quality)    Reassured         Capable             Empowered          Dependent           Justified          Loyal

USER         Reads LinkedIn     Completes signup     Compares tiers    Configures feeds    Publishes weekly   Reviews reports     Hits usage limit   Recommends
ACTION       Attends event      Runs Interview       Reads case study  Invites team        Edits content      Schedules content   Explores features  Writes review
             Clicks ad          Generates content    Talks to sales    Explores library    Sets cadence       Refines voice       Requests demo      Speaks at event
             Searches Google    Explores dashboard   Selects plan      Watches tutorials   Uses distribution  Monitors competitors Upgrades tier     Refers peer

KPI          Impressions        Trial sign-ups       Conversion rate   Feature activation  WAU/MAU ratio      Monthly churn       Expansion MRR      NPS score
             CTR                Interview complete    Time to purchase  Onboarding score    Content/user/mo    Revenue churn       Upgrade rate       Referral rate
             CPL                Time to first value   ARPU             Day 7 retention     Edit rate           Health score        Net revenue ret.   Case studies
             Brand mentions     Aha moment rate      Annual %          Support tickets     Team adoption       Reactivation rate   Feature adoption   Reviews posted
```

---

## 1. Awareness Stage

**Goal**: Generate qualified interest from UK specialist insurance decision-makers who currently overspend on agencies or underinvest in marketing.

**Timeline**: 4 weeks before trial signup (on average)

### 1.1 Channel Strategy

| Channel | Tactic | Budget Allocation | Expected CPL |
|---------|--------|-------------------|-------------|
| **LinkedIn (organic)** | 3x/week thought leadership on insurance marketing, AI compliance, content ROI | £0 (founder time) | £0 |
| **LinkedIn (paid)** | Sponsored posts targeting insurance job titles in UK; lead gen forms | 40% of paid budget | £25-50 |
| **Insurance conferences** | Speaking slots at BIBA, Airmic, IIL events; demo booth at InsurTech Connect | 25% of paid budget | £80-150 |
| **Trade media** | Bylines in Insurance Times, Insurance Post; sponsored content in InsurTech Insider | 15% of paid budget | £40-80 |
| **SEO/Content** | Blog posts: "insurance content marketing", "MGA marketing strategy", "FCA compliant content" | 10% of paid budget | £15-30 |
| **Word of mouth** | Referral programme; NPS-driven asks | 0% (programme cost only) | £10-20 |
| **Partnerships** | Insurance associations (CII, MGAA); compliance consultants; insurance tech vendors | 10% of paid budget | £30-60 |

### 1.2 Key Messages by Persona

**Solo Marketer (Head of Marketing at MGA/broker)**
- "Stop spending 40 hours a month writing content that sounds like everyone else."
- "Your underwriters know your market. Monitus turns that knowledge into a publishing machine."
- "Agency-quality insurance content for 5% of the agency fee."

**Content Team Lead (VP Comms at mid-tier insurer)**
- "One platform, six content formats, every department covered."
- "Your team generates more content in a week than most insurers produce in a quarter."
- "FCA-checked, compliance-aware content your legal team will actually approve."

**Strategy Executive (CSO/CMO at top-20 insurer)**
- "Know what your competitors are saying before your board asks."
- "Board briefings, competitor intelligence, and trade media strategy in one platform."
- "The growth intelligence layer your strategy team is missing."

**Technical Founder (CTO/CEO at insurtech)**
- "Replace hiring a content person. Ship your first article in 30 minutes."
- "Built for insurance. Not another generic AI writing tool."
- "From zero content to weekly publishing cadence in one afternoon."

### 1.3 Awareness Stage KPIs

| Metric | Target (Month 3) | Target (Month 6) | Target (Month 12) |
|--------|------------------|-------------------|---------------------|
| LinkedIn followers | 500 | 2,000 | 5,000 |
| Monthly website visitors | 1,000 | 4,000 | 10,000 |
| Trial sign-ups/month | 25 | 40 | 60 |
| Brand mentions (trade media) | 2/month | 5/month | 10/month |
| Blended CPL | £60 | £45 | £35 |

---

## 2. Evaluation Stage (Trial Experience)

**Goal**: Deliver an "aha moment" within 30 minutes. Demonstrate that Monitus understands insurance and produces content the user would actually publish.

**Timeline**: 14-day free trial

### 2.1 First 30 Minutes — Step by Step

```
MINUTE 0-2      MINUTE 2-5         MINUTE 5-15              MINUTE 15-25            MINUTE 25-30
───────────      ─────────           ────────────              ────────────             ────────────
Registration     Company Setup       Narrative Interview       First Content            Aha Moment
                                                               Generation

Email + pass     Company name        Phase A: Positioning      Select news article      Review generated
  OR             Company type         (5 exchanges)            Choose format             content
Google OAuth     Sub-sector          Phase B: Voice & Tone     (LinkedIn or             "This sounds like
                 Website URL          (5 exchanges)             newsletter)              us"
                 Employee count      Auto-generates            See compliance            Edit and refine
                 Compliance           messaging bible           check results            Save to library
                  frameworks                                   Generated in <10s
```

### 2.2 Detailed Trial Flow

**Minutes 0-2: Registration**
- Email/password or Google OAuth
- No credit card required
- Single CTA: "Start your free trial"
- Confirmation email with getting-started link

**Minutes 2-5: Company Setup**
- Company name (auto-suggested from email domain)
- Company type: MGA / Broker / Insurtech / Carrier / Reinsurer
- Sub-sector: Specialty lines, cyber, marine, property, casualty, life, health, etc.
- Website URL (for context extraction)
- Employee count range
- Compliance frameworks (FCA, PRA, GDPR, Solvency II, TCFD — multi-select)
- Progress bar: "Step 1 of 3"

**Minutes 5-15: Narrative Interview (Star Feature)**
- Conversational AI interview (not a form)
- Phase A — Positioning Discovery (5+ exchanges):
  - "Tell me about your company and what makes you different."
  - "Who are your ideal clients?"
  - "Who do you compete with?"
  - "What are your biggest growth challenges?"
  - "Where do you want to be in 12 months?"
- Phase B — Voice & Tone Discovery (5+ exchanges):
  - "How formal should your content sound?"
  - "What brands do you admire for their communication?"
  - "Any words or phrases you want to use or avoid?"
  - "What topics should your company own?"
  - "What is the one thing readers should remember about you?"
- Output: Structured messaging bible auto-saved
- Progress bar: "Step 2 of 3"

**Minutes 15-25: First Content Generation**
- Dashboard populated with today's insurance news (13 RSS feeds)
- Guided prompt: "Pick an article that matters to your market"
- Format selection: LinkedIn post or newsletter (available on trial)
- Department targeting: Select audience (e.g., c-suite, underwriting)
- Generate button: Content produced in 3-7 seconds
- Side-by-side: Article summary + generated content
- Compliance check results displayed inline
- Progress bar: "Step 3 of 3 — You're set up!"

**Minutes 25-30: The Aha Moment**
- User reads content that sounds like their company (not generic AI slop)
- Content uses their specific positioning, tone, and market terminology
- Compliance check flags relevant frameworks
- CTA: "Edit this, then publish it. Your first piece of thought leadership is ready."

### 2.3 Trial Days 2-14 — Guided Discovery

| Day | Email/In-App | Content | Goal |
|-----|-------------|---------|------|
| 2 | Email | "Your news feed is updated — 3 articles match your market" | Drive return visit |
| 3 | In-app banner | "Try generating a different format" | Format exploration |
| 5 | Email | "You've generated X pieces. Here's how top users get more value" | Social proof |
| 7 | In-app | "Halfway through your trial — see your content stats" | Progress awareness |
| 9 | Email | "Explore distribution: schedule your content for next week" | Feature discovery |
| 11 | Email | "3 days left. Here's what you'll keep on a paid plan" | Urgency + value |
| 13 | Email | "Tomorrow is your last day. Upgrade now to keep your library" | Conversion push |
| 14 | Email | "Your trial has ended. Your content library is saved for 30 days" | Grace period |

### 2.4 Friction Points and Solutions

| Friction Point | Impact | Solution |
|---------------|--------|----------|
| Interview feels too long | Abandonment at Phase B | Show progress ("3 of 10 questions"), allow "Skip for now" on Phase B, complete later |
| Generated content too generic | Low aha moment rate | Pre-load messaging bible excerpts in generation prompt; show before/after (with vs. without Interview) |
| News feed irrelevant | Perceived low value | Auto-filter by company sub-sector; let user pin/dismiss articles; add "not relevant" feedback |
| Confusion about tier limits | Frustration on hitting limits | Clear tier badge in header; soft limit warnings at 80%; "Upgrade for more" inline prompts |
| Compliance check unclear | Ignored or confusing | Tooltips explaining each flag; link to FCA guidance; "Why this was flagged" explanations |
| Slow content generation | Perceived as broken | Loading animation with "Analysing article... Applying your brand voice... Checking compliance..." progress steps |
| No team members on trial | Cannot demo to boss | Allow read-only sharing via link; shareable content preview pages |

### 2.5 Evaluation Stage KPIs

| Metric | Target |
|--------|--------|
| Registration → Company Setup completion | 90% |
| Company Setup → Interview start | 85% |
| Interview start → Interview completion | 80% |
| Interview completion → First content generated | 90% |
| Time to first content (median) | < 30 minutes |
| Trial users generating 3+ content pieces | 60% |
| Trial users returning Day 3+ | 50% |
| Trial users active in Week 2 | 35% |

---

## 3. Purchase Stage (Trial to Paid Conversion)

**Goal**: Convert 15-25% of trial users to paid subscriptions, with appropriate tier selection.

**Timeline**: Day 10-17 (late trial through first days post-trial)

### 3.1 Tier Selection Guidance

| Signal | Recommended Tier | Reasoning |
|--------|-----------------|-----------|
| 1 user, < 15 content pieces needed, MGA/broker with < 50 staff | **Starter (£500/mo)** | Covers weekly LinkedIn + newsletter cadence |
| 2-3 users, needs podcast/email formats, mid-size insurer | **Growth (£1,200/mo)** | Multi-format, monthly reports, team collaboration |
| Needs competitor monitoring, briefings, trade media, board reporting | **Intelligence (£2,000/mo)** | Full feature set for strategic communications |
| Pre-revenue insurtech, exploring product-market fit | **Starter (£500/mo)** | Lowest barrier; upgrade path clear |

### 3.2 Pricing Page Optimisation

**Page structure:**
1. Headline: "Insurance-grade content intelligence. Choose your tier."
2. Tier comparison table (feature matrix — see PRD for limits)
3. Highlight "Most Popular" badge on Growth tier
4. Annual toggle showing 20% discount
5. Social proof: "Trusted by X specialist insurance companies"
6. FAQ section addressing common objections
7. CTA per tier: "Start with Starter" / "Go Growth" / "Get Intelligence"

**Conversion elements:**
- ROI calculator: "You spend £X/month on agencies. Monitus costs £Y. Save £Z."
- Comparison: "Agency vs. Monitus" table (cost, turnaround, compliance, consistency)
- Guarantee: "Cancel anytime. No long-term contracts on monthly plans."
- Trial data: "You generated X pieces during your trial. On [tier], you can do Y."

### 3.3 Common Objections and Responses

| Objection | Response |
|-----------|----------|
| "AI content won't sound like us" | "Your Narrative Interview trained Monitus on your exact positioning and voice. Edit a few pieces and Voice Learning adapts further. Most users say it sounds like them within a week." |
| "We need compliance review before publishing" | "Every piece runs through automated compliance checks against your declared frameworks (FCA, PRA, GDPR, Solvency II). It flags issues before you see them — not after." |
| "We already have an agency" | "Most customers use Monitus alongside their agency. You control the always-on content (LinkedIn, newsletters) while the agency handles big campaigns. Average saving: £3-8k/month." |
| "£500/month is a lot for a content tool" | "That's one day of agency fees. In the trial you generated X pieces. At Starter, you get 15/month — roughly £33 per publish-ready article with compliance checking." |
| "What if we outgrow Starter?" | "Upgrade instantly from your dashboard. No data loss, no re-setup. Your messaging bible, content library, and voice learning carry forward." |
| "Our legal team won't approve AI content" | "Share the compliance check output with legal. Every piece flags regulatory frameworks and provides audit trails. Several Lloyd's syndicates and FCA-regulated brokers use Monitus." |
| "We need to involve our IT team" | "Monitus is a web application — no installation, no API integration, no IT deployment. SSO/SAML is on the enterprise roadmap if needed later." |
| "Can we get a discount?" | "Annual plans save 20% (e.g., Starter: £400/mo billed annually). For Intelligence tier, we offer custom annual agreements." |

### 3.4 Conversion Triggers

**In-app triggers (Day 10-14):**
- Banner: "You've generated X pieces in your trial. Keep going on Starter."
- Limit hit: "You've reached your trial content limit. Upgrade to generate more."
- Feature gate: "Podcast scripts are available on Growth. See what you're missing."
- Library prompt: "Your content library will be saved for 30 days after trial ends."

**Email triggers:**
- Day 11: "Your top-performing content piece" (engagement data if available)
- Day 13: "Final day tomorrow — here's your trial summary"
- Day 14: "Trial ended. Upgrade within 72 hours to keep your library."
- Day 17: "We saved your content. Come back anytime."
- Day 30: "Last chance — your content library expires in 48 hours."

### 3.5 Purchase Stage KPIs

| Metric | Target |
|--------|--------|
| Trial → Paid conversion (overall) | 15-25% |
| Pricing page → Checkout initiated | 40% |
| Checkout initiated → Completed | 80% |
| Annual plan selection rate | 30% |
| Average time from trial start to purchase | 12 days |
| Tier distribution: Starter / Growth / Intelligence | 60% / 30% / 10% |
| ARPU at purchase | £800+/mo |

---

## 4. Onboarding Stage (First 7 Days as Paying Customer)

**Goal**: Activate key features for the customer's tier. Establish the foundation for a weekly content workflow.

**Timeline**: Days 1-7 after payment

### 4.1 Day 1-7 Email Sequence

| Day | Subject Line | Content | CTA |
|-----|-------------|---------|-----|
| 0 (purchase) | "Welcome to Monitus [Tier]. Here's your setup checklist." | Tier-specific feature list, 3-step quick start, support contact | Complete setup checklist |
| 1 | "Your news feed is personalised. Here's today's top story." | Highlight a relevant article from their sub-sector; show how to generate content from it | Generate your first paid-tier content |
| 2 | "Pro tip: [Tier-specific feature] saves our users 3 hours/week" | Feature spotlight with 60-second video walkthrough | Try [feature] now |
| 3 | "How's your first week going? Quick check-in." | Survey: "What's your #1 goal with Monitus?" (3 options) | Reply or take survey |
| 5 | "Your content this week: [X] pieces generated" | Weekly activity summary, comparison to "top users at your tier" | Set up your weekly cadence |
| 7 | "Week 1 milestone: You're officially a Monitus publisher" | Celebration email; content stats; next-week recommendations | Explore [next feature] |

### 4.2 Feature Discovery Path by Tier

**Starter (£500/mo) — Days 1-7:**
```
Day 1: Generate content from news article (LinkedIn or newsletter)
Day 2: Edit generated content → triggers Voice Learning
Day 3: Explore Content Library (search, filter, organise)
Day 4: Schedule content via Distribution
Day 5: Review news feed, generate second piece this week
Day 6: Re-run Narrative Interview to refine messaging (optional)
Day 7: Check weekly content stats on dashboard
```

**Growth (£1,200/mo) — Days 1-7:**
```
Day 1: Generate content in multiple formats (LinkedIn + newsletter + email)
Day 2: Invite team members (up to 3 seats)
Day 3: Explore podcast script and email formats
Day 4: Set up Distribution schedule for multiple channels
Day 5: Generate department-targeted content (underwriting vs. c-suite)
Day 6: Review Monthly Reports dashboard
Day 7: Establish weekly content calendar with team
```

**Intelligence (£2,000/mo) — Days 1-7:**
```
Day 1: Generate multi-format content; explore all 6 formats
Day 2: Set up Competitor Monitoring (declare competitors)
Day 3: Build first Board Briefing using Briefing Builder
Day 4: Invite full team (unlimited seats); assign roles
Day 5: Generate trade media pitch from relevant article
Day 6: Review Competitive Intelligence dashboard
Day 7: Schedule weekly briefing cadence; plan first quarterly review
```

### 4.3 Success Milestones (Day 7)

| Milestone | Starter | Growth | Intelligence |
|-----------|---------|--------|-------------|
| Content pieces generated | 3+ | 5+ | 8+ |
| Formats used | 1+ | 2+ | 3+ |
| Content edited (Voice Learning) | 2+ | 3+ | 4+ |
| Team members invited | N/A | 1+ | 2+ |
| Distribution scheduled | 1+ | 2+ | 3+ |
| Briefings created | N/A | N/A | 1+ |
| Competitors declared | N/A | N/A | 2+ |

### 4.4 Onboarding Stage KPIs

| Metric | Target |
|--------|--------|
| Day 1 activation (any feature used) | 95% |
| Day 3 activation (tier-specific feature used) | 80% |
| Day 7 milestone completion rate | 70% |
| Onboarding email open rate | 55% |
| Onboarding email CTR | 15% |
| Support tickets in first 7 days | < 0.5 per customer |
| Day 7 satisfaction (survey) | 4.2+/5 |

---

## 5. Adoption Stage (First 30 Days)

**Goal**: Establish a repeatable weekly content workflow. Achieve "habit formation" — the user returns without prompts.

**Timeline**: Days 7-30 after payment

### 5.1 Weekly Workflow Establishment

**Recommended weekly rhythm (all tiers):**

```
MONDAY          TUESDAY         WEDNESDAY       THURSDAY        FRIDAY
────────         ────────         ──────────       ─────────        ──────
Review news     Generate         Edit + refine    Schedule         Review
feed            content          content          distribution     performance

Scan top        Pick 2-3         Apply edits      Set publish      Check content
articles        articles,        (trains Voice    dates/times      stats, note
from weekend    generate in      Learning)        for LinkedIn,    what resonated
                chosen formats                    newsletter, etc.
```

### 5.2 Content Cadence Recommendations by Tier

**Starter (15 pieces/month):**

| Channel | Frequency | Pieces/Month | Notes |
|---------|-----------|-------------|-------|
| LinkedIn post | 2x/week | 8 | Tuesday + Thursday publish |
| Newsletter | 1x/week | 4 | Friday publish, weekend read |
| Buffer/experiment | — | 3 | Test different topics, angles |
| **Total** | | **15** | |

**Growth (100 pieces/month):**

| Channel | Frequency | Pieces/Month | Notes |
|---------|-----------|-------------|-------|
| LinkedIn post | 3x/week | 12 | Mon/Wed/Fri |
| Newsletter | 1x/week | 4 | Industry roundup format |
| Email campaigns | 2x/month | 2 | Client-facing market updates |
| Podcast script | 2x/month | 2 | Bi-weekly episode |
| Multi-department variants | As needed | 10-15 | Same article, different audiences |
| Buffer/experiment | — | 15+ | New formats, A/B testing |
| **Total** | | **45-50** | Well within 100 limit |

**Intelligence (unlimited):**

| Channel | Frequency | Pieces/Month | Notes |
|---------|-----------|-------------|-------|
| LinkedIn post | Daily (weekdays) | 20 | Consistent daily presence |
| Newsletter | 1x/week | 4 | Flagship weekly publication |
| Email campaigns | Weekly | 4 | Segment by client type |
| Podcast script | Weekly | 4 | Weekly episode |
| Board briefing | Monthly | 1 | Pre-board meeting |
| Client briefings | 2x/month | 2 | Market update briefings |
| Trade media pitches | 2x/month | 2 | Byline and comment opportunities |
| Regulatory alerts | As needed | 2-4 | FCA/PRA changes |
| Team updates | Weekly | 4 | Department-specific |
| Competitive reports | Monthly | 1 | Competitor activity digest |
| **Total** | | **45-65** | |

### 5.3 Team Onboarding (Growth and Intelligence)

**Week 1-2: Team invitation and role setup**
- Owner invites team members by email
- Assign roles: Owner (full access), Editor (create/edit/schedule), Viewer (read-only)
- Each team member takes 5-minute platform tour
- Share messaging bible with team for alignment

**Week 2-3: Workflow distribution**
- Assign content ownership by format or department
- Example: "Sarah owns LinkedIn, James owns newsletters, Alex owns briefings"
- Set up shared content calendar (external tool integration until calendar view ships)
- Establish review/approval process (manual until approval workflows ship)

**Week 3-4: Quality calibration**
- Team edits content collaboratively (all edits feed Voice Learning)
- Review first month's output together
- Identify best-performing content and replicate patterns
- Refine Narrative Interview if messaging has evolved

### 5.4 Adoption Stage KPIs

| Metric | Target |
|--------|--------|
| WAU (Weekly Active Users) as % of total | 70%+ |
| Content pieces generated per user per month | 10+ (Starter), 30+ (Growth), 50+ (Intelligence) |
| Content edit rate | 40%+ (indicates engagement, feeds Voice Learning) |
| Multi-format usage (Growth/Intelligence) | 3+ formats used |
| Team seat utilisation (Growth/Intelligence) | 80%+ of available seats |
| Distribution feature adoption | 50%+ of generated content scheduled |
| Return visits without email prompt | 60%+ |
| Day 30 retention | 90%+ |

---

## 6. Retention Stage (Ongoing Value)

**Goal**: Maintain <3% monthly logo churn and <2% monthly revenue churn. Make Monitus indispensable to the weekly workflow.

**Timeline**: Month 2 onwards

### 6.1 Monthly Touchpoints

| Touchpoint | Channel | Audience | Content |
|------------|---------|----------|---------|
| Monthly activity report | Email | All tiers | Content stats, voice learning progress, usage vs. limit, top-performing piece |
| Feature release notes | In-app + email | All tiers | New features, improvements, bug fixes |
| Insurance market digest | Email | All tiers | Curated industry trends (positions Monitus as market expert) |
| Quarterly Business Review | Video call | Intelligence | Usage analytics, ROI review, strategy alignment, roadmap preview |
| Renewal reminder (annual) | Email | Annual plans | 30/14/7 days before renewal; renewal value summary |
| CSM check-in | Email/call | Growth + Intelligence | Proactive outreach based on usage patterns |

### 6.2 Usage Health Scoring

Each customer receives a weekly health score (0-100) calculated from weighted signals:

| Signal | Weight | Healthy | At Risk | Critical |
|--------|--------|---------|---------|----------|
| Login frequency | 20% | 3+/week | 1-2/week | 0/week |
| Content generated this week | 25% | 3+ pieces | 1-2 pieces | 0 pieces |
| Content edited (Voice Learning) | 15% | 2+/week | 1/week | 0/week |
| Distribution scheduled | 15% | 2+/week | 1/week | 0/week |
| News feed viewed | 10% | 3+/week | 1-2/week | 0/week |
| Team activity (Growth/Intel) | 10% | Multiple users active | Owner only | No activity |
| Feature breadth | 5% | 3+ features used | 1-2 features | 0 features |

**Health score thresholds:**
- **80-100 (Healthy)**: No intervention needed. Candidate for expansion.
- **60-79 (Moderate)**: Automated feature tip emails. Gentle re-engagement nudge.
- **40-59 (At Risk)**: CSM outreach within 48 hours. Usage review call offered.
- **0-39 (Critical)**: Immediate CSM contact. Executive sponsor outreach. Offer training session.

### 6.3 Churn Risk Indicators and Interventions

| Risk Indicator | Detection | Intervention | Timeline |
|---------------|-----------|-------------|----------|
| No login for 7+ days | Automated alert | Email: "Your news feed has X articles waiting" | Day 7 |
| No content generated for 14+ days | Automated alert | Email: "Here's a content idea based on this week's news" with pre-selected article | Day 14 |
| No login for 21+ days | CSM alert | Personal email from CSM: "Is everything okay? Can we help?" | Day 21 |
| Health score drops below 40 | Dashboard flag | Phone call from CSM; offer 30-minute training session | Within 48 hours |
| Support ticket unresolved for 48+ hours | Escalation | Priority resolution; follow-up from account manager | Within 4 hours |
| Credit card payment failed | Automated dunning | 3-attempt retry over 7 days; email notification each attempt | Immediate |
| Cancel button clicked | In-app survey | Exit survey with save offer: "Would a 1-month discount help? 50% off next month." | Immediate |
| Competitor mentioned in exit survey | CSM alert | Personal outreach with competitive comparison and custom offer | Within 24 hours |
| Annual renewal approaching (60 days) | Automated email | Renewal value summary: "In the past year, you generated X pieces, saved Y hours, published Z articles" | Day -60, -30, -14, -7 |

### 6.4 Retention Programmes

**Voice Learning Stickiness**:
The longer a customer uses Monitus, the more accurate voice matching becomes. After 100+ edits, content requires minimal revision. This creates natural switching costs — communicate this: "Your Monitus voice profile has learned from 147 edits. Content accuracy: 94%."

**Content Library Lock-in**:
All generated content lives in the Content Library. Ensure customers see library value: "You have 234 pieces in your library — a searchable archive of your company's thought leadership."

**Workflow Integration**:
Encourage integration into existing workflows: content calendars, editorial meetings, distribution schedules. The deeper the integration, the higher the switching cost.

### 6.5 Retention Stage KPIs

| Metric | Target |
|--------|--------|
| Monthly logo churn | < 3% |
| Monthly revenue churn | < 2% |
| Net Revenue Retention | 110%+ |
| Average customer health score | 75+ |
| Customers in "Critical" health | < 5% |
| Time from risk detection to intervention | < 48 hours |
| Save rate (cancel flow) | 20%+ |
| Annual renewal rate | 85%+ |
| NPS | 40+ |

---

## 7. Expansion Stage (Tier Upgrades)

**Goal**: Drive expansion revenue through natural tier progression. Target net revenue retention of 110%+.

**Timeline**: Month 3 onwards (earliest reasonable upgrade window)

### 7.1 Upgrade Triggers by Tier Transition

**Trial to Starter (£0 to £500/mo)**
- See Section 3 (Purchase Stage)

**Starter to Growth (£500/mo to £1,200/mo)**

| Trigger | Detection | Nudge |
|---------|-----------|-------|
| Hitting 15 content pieces/month limit | Usage tracking | "You've used all 15 pieces this month. Growth gives you 100." |
| Requesting podcast/email format | Feature gate click | "Podcast scripts are available on Growth. See a sample?" |
| Asking about team access | Support ticket or UI click | "Need your team on Monitus? Growth includes 3 seats." |
| Asking about reports | Feature gate click | "Monthly reports track your content performance. Available on Growth." |
| Generating content for multiple departments | Content analysis | "You're creating content for 3 departments. Growth's multi-format tools make this faster." |

**Growth to Intelligence (£1,200/mo to £2,000/mo)**

| Trigger | Detection | Nudge |
|---------|-----------|-------|
| Requesting competitor monitoring | Feature gate or support | "See what your competitors are publishing. Intelligence includes competitor monitoring." |
| Needing briefing formats | Feature gate click | "Board packs, client briefings, regulatory alerts — Intelligence has 5 briefing formats." |
| Requesting trade media support | Feature gate click | "Trade media pitches are Intelligence-tier. Ready to get published in Insurance Times?" |
| Needing unlimited team seats | Hitting 3-seat limit | "Your team has outgrown Growth. Intelligence has unlimited seats." |
| Asking about quarterly reviews | Support or CSM call | "Intelligence includes quarterly business reviews with our team." |

### 7.2 Feature Teasers and Gentle Nudges

**In-app teaser strategy:**
- Locked features shown as greyed-out menu items with tier badge
- Clicking locked feature shows 15-second preview + "Available on [tier]" modal
- No aggressive upsell — information only; user chooses when to upgrade
- Monthly "Feature spotlight" email showing one locked feature in detail

**Nudge cadence:**
- Maximum 1 upgrade nudge per week (in-app or email, not both)
- Nudges pause for 30 days after user dismisses an upgrade prompt
- Nudges stop entirely if user has been on current tier for < 60 days

**ROI justification templates:**

*Starter to Growth:*
> "You generated 15 pieces this month on Starter (£500). On Growth (£1,200), you'd get 100 pieces across 5 formats — that's £12 per piece vs. £33 per piece. Plus team access and monthly reports."

*Growth to Intelligence:*
> "Your Growth plan produces great content. Intelligence adds the strategic layer: competitor monitoring, board briefings, and trade media pitches. At £2,000/mo, it replaces a £5-15k/month agency retainer."

### 7.3 Expansion Revenue Playbook

**Step 1: Identify expansion candidates**
- Health score > 80 for 60+ consecutive days
- Hitting or approaching tier limits regularly
- Engaging with locked feature prompts
- Team seat utilisation at maximum
- Positive NPS response (9-10)

**Step 2: Personalised upgrade proposal**
- CSM sends personalised email with:
  - Current usage data ("You generated 14/15 pieces last month")
  - Feature gap analysis ("You clicked on Briefing Builder 4 times")
  - ROI projection ("Upgrading saves £X vs. outsourcing briefings")
  - Offer: "Try Growth free for 7 days, then decide"

**Step 3: Frictionless upgrade**
- One-click upgrade from dashboard (no new signup flow)
- Prorated billing (charge difference for remaining billing cycle)
- All data, content, voice learning, and messaging bible preserved
- Immediate access to new features
- Follow-up email: "Welcome to [tier]. Here's what's new for you."

**Step 4: Post-upgrade onboarding**
- Tier-specific feature tour (in-app walkthrough)
- CSM call for Growth and Intelligence upgrades
- Updated onboarding checklist for new features
- 14-day check-in: "How are the new features working for you?"

### 7.4 Expansion Stage KPIs

| Metric | Target |
|--------|--------|
| Monthly expansion MRR | 5%+ of total MRR |
| Starter → Growth upgrade rate (annual) | 20% |
| Growth → Intelligence upgrade rate (annual) | 15% |
| Average time to first upgrade | 4-6 months |
| Upgrade trial conversion (7-day trial of next tier) | 50% |
| Post-upgrade 30-day retention | 95% |
| Net Revenue Retention | 110%+ |

---

## 8. Advocacy Stage (Referrals and Testimonials)

**Goal**: Turn happy customers into active promoters. Build a referral engine that reduces CAC over time.

**Timeline**: Month 6 onwards (after sufficient value realised)

### 8.1 NPS Programme

**Survey cadence:**
- First NPS survey: Day 30 (post-purchase)
- Recurring NPS survey: Every 90 days
- Trigger NPS: After milestone events (100th content piece, 6-month anniversary, upgrade)

**Survey format (in-app):**
- "How likely are you to recommend Monitus to a colleague in the insurance industry?" (0-10)
- Follow-up: "What's the main reason for your score?" (free text)
- If 9-10: "Would you be open to sharing your experience? We'd love to feature you."
- If 7-8: "What would make Monitus a 10 for you?" (free text)
- If 0-6: Immediate CSM alert; personal follow-up within 24 hours

**NPS response actions:**

| Score | Classification | Action |
|-------|---------------|--------|
| 9-10 | Promoter | Thank-you email; referral programme invite; case study request; G2/Capterra review ask |
| 7-8 | Passive | Feature request collection; "What would make us a 10?" follow-up; product feedback loop |
| 0-6 | Detractor | CSM outreach within 24 hours; executive sponsor if needed; issue resolution + follow-up NPS |

### 8.2 Case Study Development

**Identification criteria:**
- NPS score 9-10
- Customer for 3+ months
- Measurable results (content volume, time saved, engagement metrics)
- Willing to be named (or anonymised "specialist MGA" format)

**Case study process:**
1. **Ask** (Month 3+): CSM identifies candidates from NPS and health score data
2. **Interview** (30 minutes): Structured conversation covering challenge, solution, results
3. **Draft** (1 week): Written case study — problem, solution, results, quote
4. **Review** (1 week): Customer approval with compliance/legal review
5. **Publish** (ongoing): Website, LinkedIn, email campaigns, sales collateral, conference materials

**Case study template:**
- Company profile (type, size, sub-sector)
- Challenge: What they were doing before Monitus
- Solution: How they use Monitus (features, workflow, team setup)
- Results: Quantified outcomes (content volume, time saved, cost reduction, engagement)
- Quote: Named spokesperson endorsement

**Target**: 2 case studies per quarter; 8 per year covering different company types and tiers.

### 8.3 Referral Programme Design

**Programme name**: "Monitus Partners"

**Structure:**

| Element | Detail |
|---------|--------|
| **Who can refer** | Any paying customer (Starter, Growth, Intelligence) |
| **Reward for referrer** | 1 month free (credit applied to next invoice) per successful referral |
| **Reward for referee** | Extended 30-day trial (instead of 14 days) |
| **Definition of "successful"** | Referee becomes a paying customer for at least 30 days |
| **Referral limit** | Unlimited (but rewards cap at 6 months free per year) |
| **Tracking** | Unique referral link per customer; dashboard showing referral status |

**Referral programme launch:**
- Invite customers with NPS 9-10 first (Month 6)
- Expand to all paying customers (Month 8)
- Promote via in-app banner, email campaign, and monthly activity reports

**Referral touchpoints:**
- Dashboard widget: "Know someone who'd benefit? Share your referral link."
- Post-NPS (9-10): "You rated us 10/10 — share the love with a colleague."
- Monthly report footer: "Refer a peer and get a month free."
- Case study page: "Join [company] and X other insurers on Monitus."

### 8.4 Additional Advocacy Channels

**G2 and Capterra reviews:**
- Ask NPS promoters to leave reviews
- Provide direct links in follow-up emails
- Target: 10+ reviews on G2 within first year; 4.5+ star average

**Conference speaking:**
- Invite top customers to co-present at insurance conferences
- Joint session: "How [company] transformed their content strategy with AI"
- Customer gets speaking platform; Monitus gets credibility and leads

**Insurance community engagement:**
- Insurance Subreddit, LinkedIn Groups, CII forums
- Encourage customers to share Monitus-generated content (with attribution optional)
- Offer "Powered by Monitus" badge for newsletters (optional, never required)

**Customer advisory board:**
- Invite 5-8 top customers to quarterly advisory board
- Input on roadmap, pricing, features
- Creates ownership and deepens loyalty
- Members get early access to new features

### 8.5 Advocacy Stage KPIs

| Metric | Target |
|--------|--------|
| NPS score | 40+ |
| NPS response rate | 50%+ |
| Referral programme participation | 20% of paying customers |
| Referrals per participating customer per year | 1.5+ |
| Referral conversion rate (referee trial → paid) | 25-35% |
| Case studies published per quarter | 2+ |
| G2/Capterra review count (Year 1) | 10+ |
| G2/Capterra average rating | 4.5+ |
| Customer advisory board participation | 5-8 members |

---

## Appendix A: Journey Map by Persona

### Solo Marketer (Starter Path)

```
Week -2        Day 1          Day 3          Day 10         Day 14         Month 1        Month 3        Month 6
────────        ─────           ─────           ──────          ──────          ───────         ───────         ───────
Sees LinkedIn  Signs up       Generates      Hits 10        Upgrades to    Weekly rhythm   Considers      Refers
post about     Completes      3rd piece      pieces,        Starter        established     Growth         colleague
insurance AI   Interview in   Shares one     reviews        (£500/mo)      (8 LinkedIn +   (wants         at another
content        12 minutes     with boss      pricing                       4 newsletters   podcast        MGA
                                                                           per month)      format)
```

### Content Team Lead (Growth Path)

```
Week -4        Day 1          Day 5          Day 12         Day 14         Month 1        Month 2        Month 6
────────        ─────           ─────           ──────          ──────          ───────         ───────         ───────
Attends BIBA   Signs up       Invites 2      Generates      Upgrades to    Team producing  Explores all   Provides
conference     Completes      team members   content in     Growth         30+ pieces/     5 formats      case study
demo           Interview      Explores       3 formats      (£1,200/mo)    month across    Reports to     for website
               with VP Comms  multi-format                                 departments     board monthly
```

### Strategy Executive (Intelligence Path)

```
Week -3        Day 1          Day 7          Day 10         Day 14         Month 1        Month 3        Month 6
────────        ─────           ─────           ──────          ──────          ───────         ───────         ───────
Reads trade    Signs up       Reviews        Requests       Upgrades to    Full team       First QBR      Joins
media article  Delegates      competitor     demo call      Intelligence   onboarded       with CSM       advisory
about Monitus  Interview to   monitoring     with sales     (£2,000/mo)    Board briefings ROI review     board
               marketing team output                                       established     + expansion
```

---

## Appendix B: Technology and Tooling Requirements

| Stage | Tool/System | Purpose | Priority |
|-------|-------------|---------|----------|
| Awareness | LinkedIn Ads Manager | Paid campaign management | P0 |
| Awareness | Google Analytics | Website traffic and conversion tracking | P0 |
| Awareness | SEO tool (Ahrefs/Semrush) | Keyword tracking and content optimisation | P1 |
| Evaluation | In-app analytics (PostHog/Mixpanel) | Trial behaviour tracking, funnel analysis | P0 |
| Evaluation | Transactional email (Resend) | Trial onboarding sequence | P0 |
| Purchase | Stripe | Payment processing, subscription management | P0 (shipped) |
| Purchase | In-app upgrade flow | Tier selection and checkout | P0 (shipped) |
| Onboarding | Transactional email (Resend) | Onboarding email sequence | P0 |
| Onboarding | In-app checklists | Feature discovery guidance | P1 |
| Adoption | Usage analytics (internal) | Content generation, login, feature usage tracking | P0 |
| Retention | Health score engine (internal) | Automated risk detection | P1 |
| Retention | CRM (HubSpot) | CSM workflow, customer records, outreach tracking | P1 |
| Expansion | In-app upgrade prompts | Feature teaser modals, limit notifications | P1 |
| Advocacy | NPS tool (Delighted/in-app) | Survey delivery and analysis | P2 |
| Advocacy | Referral tracking (internal) | Unique links, conversion tracking, credit application | P2 |

---

## Appendix C: Cross-Stage Metrics Dashboard

The following metrics should be tracked in a unified dashboard, reviewed weekly by the founding team:

| Metric | Stage | Formula | Target |
|--------|-------|---------|--------|
| Trial sign-ups | Awareness → Evaluation | New trials this week | 10+/week (Month 6) |
| Time to first content | Evaluation | Median minutes from signup to first generation | < 30 min |
| Interview completion rate | Evaluation | Completed interviews / Started interviews | 80%+ |
| Trial → Paid conversion | Evaluation → Purchase | Paid customers / Expired trials (rolling 30d) | 15-25% |
| Day 7 activation rate | Onboarding | Customers hitting Day 7 milestones / New customers | 70%+ |
| WAU/MAU ratio | Adoption | Weekly active / Monthly active | 70%+ |
| Content per user per month | Adoption | Total content generated / Active users | 10+ |
| Monthly logo churn | Retention | Churned customers / Start-of-month customers | < 3% |
| Monthly revenue churn | Retention | Lost MRR / Start-of-month MRR | < 2% |
| Net Revenue Retention | Retention + Expansion | (Start MRR + Expansion - Contraction - Churn) / Start MRR | 110%+ |
| Expansion MRR | Expansion | MRR from upgrades this month | 5%+ of total |
| NPS | Advocacy | Standard NPS calculation | 40+ |
| Referral conversion | Advocacy | Referred trials converting to paid | 25-35% |
| Customer health score (avg) | All | Weighted usage signals (see Section 6.2) | 75+ |
| LTV:CAC ratio | All | Customer lifetime value / Acquisition cost | > 3:1 |

