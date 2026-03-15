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
