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
