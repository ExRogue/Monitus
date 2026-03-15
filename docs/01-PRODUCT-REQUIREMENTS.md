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
