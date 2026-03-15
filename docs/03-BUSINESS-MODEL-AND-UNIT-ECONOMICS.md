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
