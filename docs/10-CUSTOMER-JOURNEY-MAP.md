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
