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
