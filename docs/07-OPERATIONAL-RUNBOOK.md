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
