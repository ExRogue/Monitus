import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import { NewsArticle } from './news';
import { checkCompliance, ComplianceResult } from './compliance';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  type: string;
  niche: string;
  description: string;
  brand_voice: string;
  brand_tone: string;
  compliance_frameworks: string;
}

export interface GeneratedContent {
  id: string;
  company_id: string;
  article_ids: string;
  content_type: string;
  title: string;
  content: string;
  compliance_status: string;
  compliance_notes: string;
  status: string;
  created_at: string;
}

type ContentType = 'newsletter' | 'linkedin' | 'podcast' | 'briefing';

// --- CONTENT GENERATION ENGINE ---
// This uses template-based generation with intelligent content assembly.
// In production, you'd swap the generateXXX functions to call Claude/GPT API.
// The templates are designed to produce realistic, insurance-specific content.

export async function generateContent(
  articles: NewsArticle[],
  company: Company,
  contentTypes: ContentType[]
): Promise<GeneratedContent[]> {
  const results: GeneratedContent[] = [];
  await getDb();
  const articleIds = JSON.stringify(articles.map(a => a.id));
  const frameworks = JSON.parse(company.compliance_frameworks || '["FCA"]');

  for (const type of contentTypes) {
    let title = '';
    let content = '';

    switch (type) {
      case 'newsletter':
        ({ title, content } = generateNewsletter(articles, company));
        break;
      case 'linkedin':
        ({ title, content } = generateLinkedIn(articles, company));
        break;
      case 'podcast':
        ({ title, content } = generatePodcast(articles, company));
        break;
      case 'briefing':
        ({ title, content } = generateBriefing(articles, company));
        break;
    }

    // Run compliance check
    const compliance = checkCompliance(content, frameworks);
    const complianceStatus = compliance.passed ? 'passed' : 'flagged';

    const id = uuidv4();
    const complianceNotes = JSON.stringify(compliance);

    await sql`
      INSERT INTO generated_content (id, company_id, article_ids, content_type, title, content, compliance_status, compliance_notes, status)
      VALUES (${id}, ${company.id}, ${articleIds}, ${type}, ${title}, ${content}, ${complianceStatus}, ${complianceNotes}, 'draft')
    `;

    results.push({
      id, company_id: company.id, article_ids: articleIds, content_type: type,
      title, content, compliance_status: complianceStatus,
      compliance_notes: complianceNotes, status: 'draft',
      created_at: new Date().toISOString()
    });
  }

  return results;
}

function generateNewsletter(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const today = new Date();
  const weekNum = getWeekNumber(today);
  const niche = company.niche || 'Specialty Insurance';

  const title = `${company.name} Market Intelligence — Week ${weekNum}`;

  const articleSections = articles.map((a, i) => {
    const tags = JSON.parse(a.tags || '[]');
    const tagLabels = tags.map((t: string) => `#${t}`).join(' ');

    return `### ${i + 1}. ${a.title}

${a.summary}

**Why this matters for ${niche}:** ${generateInsight(a, company)}

${tagLabels}`;
  }).join('\n\n---\n\n');

  const content = `# ${title}

*Your weekly intelligence briefing from ${company.name}*
*${today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*

---

## This Week's Key Developments

${articleSections}

---

## Market Outlook

The developments covered this week signal continued evolution in the ${niche.toLowerCase()} market. We recommend that our clients and partners review their exposure to these emerging trends and consider how they may impact renewal strategies in the coming quarters.

${company.name} continues to monitor these developments and will provide updates as market conditions evolve.

---

*This newsletter is prepared by ${company.name} for informational purposes only. It does not constitute advice or a recommendation. ${company.name} is authorised and regulated by the Financial Conduct Authority.*

*To unsubscribe, reply to this email or contact us at info@${company.name.toLowerCase().replace(/\s+/g, '')}.com*`;

  return { title, content };
}

function generateLinkedIn(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const mainArticle = articles[0];
  const niche = company.niche || 'insurance';

  const posts = articles.slice(0, 2).map((article, i) => {
    const hook = generateHook(article);
    const insight = generateInsight(article, company);
    const tags = JSON.parse(article.tags || '[]');
    const hashtags = tags.map((t: string) => `#${t}`).join(' ');

    return `## Post ${i + 1}: ${article.title}

${hook}

${article.summary}

Here's our take: ${insight}

The ${niche.toLowerCase()} market needs to stay ahead of developments like this. At ${company.name}, we're helping our clients navigate exactly these kinds of shifts.

What's your view? How is this impacting your book?

${hashtags} #insurance #${company.type} #marketintelligence

---`;
  });

  const content = posts.join('\n\n');
  return { title: `LinkedIn Posts — ${mainArticle.title.substring(0, 50)}...`, content };
}

function generatePodcast(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const niche = company.niche || 'Specialty Insurance';
  const title = `${company.name} Market Pulse — Episode Script`;

  const topicSegments = articles.slice(0, 3).map((a, i) => {
    const insight = generateInsight(a, company);
    return `### Segment ${i + 1}: ${a.title}
**Duration:** 4-5 minutes

**Host script:**

"Our ${i === 0 ? 'first' : i === 1 ? 'second' : 'final'} story this week takes us to ${a.source}${a.category === 'uk_market' ? ' and the London Market' : ''}."

"${a.summary}"

**Key discussion points:**
- What this means for ${niche.toLowerCase()} specifically
- ${insight}
- How market participants should be positioning themselves

**Suggested guest clip:** *[Insert 30-second clip from industry expert on this topic]*

**Transition:** "${i < articles.length - 1 ? 'Moving on to our next development...' : 'And that brings us to the end of this week\'s key stories.'}"`;
  });

  const content = `# ${title}

## Episode Overview
**Format:** Weekly market intelligence podcast
**Duration:** 15-20 minutes
**Produced by:** ${company.name}
**Niche focus:** ${niche}

---

## Cold Open
**Duration:** 1-2 minutes

**Host script:**

"Welcome to ${company.name} Market Pulse, your weekly briefing on the developments shaping the ${niche.toLowerCase()} market. I'm [Host Name], and this week we've got ${articles.length} key stories that every ${company.type === 'mga' ? 'MGA' : company.type === 'broker' ? 'broker' : 'insurtech'} professional needs to know about."

"Let's dive straight in."

---

${topicSegments.join('\n\n---\n\n')}

---

## Wrap-Up
**Duration:** 1-2 minutes

**Host script:**

"That's your market intelligence for this week. If any of these developments impact your portfolio or if you'd like to discuss how ${company.name} can help you navigate these market shifts, reach out to us directly."

"Don't forget to subscribe so you never miss an update. Until next time, stay sharp and stay informed."

**Outro music and legal disclaimer:**
*"${company.name} Market Pulse is produced for informational purposes only and does not constitute insurance advice. ${company.name} is authorised and regulated by the Financial Conduct Authority."*`;

  return { title, content };
}

function generateBriefing(articles: NewsArticle[], company: Company): { title: string; content: string } {
  const today = new Date();
  const niche = company.niche || 'Specialty Insurance';
  const title = `${company.name} — Client Market Briefing`;

  const developments = articles.map((a, i) => {
    const insight = generateInsight(a, company);
    const tags = JSON.parse(a.tags || '[]');

    return `### ${i + 1}. ${a.title}

**Source:** ${a.source} | **Classification:** ${tags.map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}

${a.summary}

**Impact Assessment for ${niche}:**
${insight}

**Recommended Action:** ${generateAction(a, company)}`;
  });

  const content = `# ${title}

**Classification:** For Client Distribution
**Date:** ${today.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
**Prepared by:** ${company.name} Market Intelligence
**Niche Focus:** ${niche}

---

## Executive Summary

This briefing covers ${articles.length} key market developments relevant to ${niche.toLowerCase()} from the past week. The developments covered span ${[...new Set(articles.flatMap(a => JSON.parse(a.tags || '[]')))].slice(0, 4).join(', ')} — areas with direct implications for our clients' risk profiles and placement strategies.

---

## Key Developments

${developments.join('\n\n---\n\n')}

---

## Forward Look

Based on the developments outlined above, we anticipate continued market attention on these themes through the upcoming renewal season. ${company.name} is actively monitoring these trends and will provide further updates as material developments emerge.

For any questions regarding this briefing or to discuss specific implications for your programme, please contact your ${company.name} representative directly.

---

*This document is prepared by ${company.name} for the exclusive use of its clients and business partners. The information contained herein is based on sources believed to be reliable but is not guaranteed. This briefing does not constitute insurance or financial advice.*

*${company.name} is authorised and regulated by the Financial Conduct Authority. FRN: [Your FRN]*`;

  return { title, content };
}

// --- HELPER FUNCTIONS ---

function generateHook(article: NewsArticle): string {
  const hooks = [
    `🔔 Breaking development in the insurance market that every underwriter should be watching closely.`,
    `The market is shifting. Here's what you need to know about the latest development.`,
    `This is going to reshape how the industry approaches risk. Pay attention.`,
    `📊 New data just dropped that has significant implications for the specialty market.`,
    `Important regulatory update that will impact how we all do business.`,
  ];
  const tags = JSON.parse(article.tags || '[]');
  if (tags.includes('regulation')) return hooks[4];
  if (tags.includes('ils') || tags.includes('reinsurance')) return hooks[3];
  if (tags.includes('cyber')) return hooks[0];
  return hooks[Math.floor(Math.random() * hooks.length)];
}

function generateInsight(article: NewsArticle, company: Company): string {
  const tags = JSON.parse(article.tags || '[]');
  const niche = company.niche || 'specialty insurance';

  const insights: Record<string, string> = {
    cyber: `For ${niche} specialists, this development directly impacts how cyber risk is assessed, priced, and transferred. We expect this to influence policy wordings and coverage terms across the market in the coming months.`,
    regulation: `Regulatory shifts like this require immediate attention from ${company.type === 'mga' ? 'MGAs' : company.type === 'broker' ? 'brokers' : 'insurtech firms'} in the ${niche} space. Compliance teams should review their current frameworks against these new requirements.`,
    lloyds: `As a ${niche} specialist operating in the London Market, this Lloyd's development has direct implications for how we structure and place risk. Capacity deployment and syndicate strategies will need to adapt.`,
    reinsurance: `The reinsurance market dynamics described here will flow through to the ${niche} market via pricing, capacity availability, and treaty terms. Our clients should expect these themes to feature prominently at upcoming renewals.`,
    climate: `Climate risk continues to reshape the insurance landscape. For ${niche} practitioners, the intersection of physical risk modelling and portfolio management is becoming impossible to ignore.`,
    insurtech: `The technology evolution in insurance continues to accelerate. For established ${company.type === 'mga' ? 'MGAs' : company.type === 'broker' ? 'brokers' : 'carriers'}, the key question is how to leverage these innovations to improve underwriting outcomes and client service.`,
    ils: `The convergence of traditional and alternative risk transfer creates new opportunities. Understanding how ILS developments impact ${niche} pricing and capacity is essential for informed decision-making.`,
  };

  for (const tag of tags) {
    if (insights[tag]) return insights[tag];
  }

  return `This development has implications across the ${niche} market. We recommend monitoring how it evolves and considering the potential impact on current and prospective risk positions.`;
}

function generateAction(article: NewsArticle, company: Company): string {
  const tags = JSON.parse(article.tags || '[]');

  if (tags.includes('regulation')) return 'Review compliance framework and update internal processes to reflect new requirements. Schedule a briefing with your compliance team.';
  if (tags.includes('cyber')) return 'Assess current cyber exposure and review policy wordings against the latest market developments. Consider portfolio impact analysis.';
  if (tags.includes('climate')) return 'Review natural catastrophe exposure models and consider updating accumulation scenarios. Engage with brokers on available risk transfer options.';
  if (tags.includes('lloyds')) return 'Monitor capacity provider communications and prepare for potential underwriting guideline changes. Review current Lloyd\'s placement strategy.';
  if (tags.includes('reinsurance')) return 'Evaluate reinsurance programme structure in light of market shifts. Consider early engagement with reinsurance partners ahead of renewal.';

  return 'Monitor developments and assess potential impact on current portfolio and business strategy. No immediate action required but keep this on the radar.';
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function getContentByCompany(companyId: string, type?: string): Promise<GeneratedContent[]> {
  await getDb();
  if (type) {
    const result = await sql`
      SELECT * FROM generated_content WHERE company_id = ${companyId} AND content_type = ${type} ORDER BY created_at DESC
    `;
    return result.rows as unknown as GeneratedContent[];
  }
  const result = await sql`
    SELECT * FROM generated_content WHERE company_id = ${companyId} ORDER BY created_at DESC
  `;
  return result.rows as unknown as GeneratedContent[];
}
