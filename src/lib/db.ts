import { sql } from '@vercel/postgres';

// Initialize database tables
export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT DEFAULT '',
      niche TEXT DEFAULT '',
      description TEXT DEFAULT '',
      brand_voice TEXT DEFAULT '',
      brand_tone TEXT DEFAULT '',
      compliance_frameworks TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS news_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '',
      source TEXT DEFAULT '',
      source_url TEXT DEFAULT '',
      category TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      published_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Clean up duplicates BEFORE creating unique index
  await sql`
    DELETE FROM news_articles
    WHERE id NOT IN (
      SELECT MIN(id) FROM news_articles
      WHERE source_url IS NOT NULL AND source_url != '' AND source_url != '#'
      GROUP BY source_url
    )
    AND source_url IS NOT NULL AND source_url != '' AND source_url != '#'
  `;

  // Add unique constraint on source_url for deduplication (idempotent)
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_source_url
    ON news_articles (source_url)
    WHERE source_url IS NOT NULL AND source_url != '' AND source_url != '#'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS generated_content (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      article_ids TEXT DEFAULT '[]',
      content_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      compliance_status TEXT DEFAULT 'pending',
      compliance_notes TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      company_name TEXT DEFAULT '',
      company_type TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      price_monthly INTEGER NOT NULL DEFAULT 0,
      price_yearly INTEGER NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'GBP',
      features TEXT DEFAULT '[]',
      limits_articles INTEGER DEFAULT 50,
      limits_content_pieces INTEGER DEFAULT 10,
      limits_users INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
      status TEXT DEFAULT 'active',
      current_period_start TIMESTAMP DEFAULT NOW(),
      current_period_end TIMESTAMP,
      cancel_at_period_end BOOLEAN DEFAULT false,
      stripe_subscription_id TEXT,
      stripe_customer_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS usage_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      event_type TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Seed demo articles
  await seedDemoArticles();
  await seedPlans();
}

let initialized = false;

export async function getDb() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
  return sql;
}

async function seedDemoArticles() {
  const articles = [
    {
      id: 'demo-article-1',
      title: "Lloyd's Syndicates Adopt New Cyber War Exclusion Clauses Ahead of 2026 Renewals",
      summary: "The Lloyd's Market Association has released updated model cyber war exclusion clauses that will become mandatory for all syndicates writing cyber risks from 1 April 2026.",
      category: 'cyber',
      tags: ['cyber', 'lloyds', 'regulation'],
      source: 'Insurance Times',
    },
    {
      id: 'demo-article-2',
      title: "SEC Finalises Cyber Incident Disclosure Rules: What Insurers Need to Know",
      summary: "The Securities and Exchange Commission has adopted final rules requiring public companies to disclose material cybersecurity incidents within four business days.",
      category: 'cyber',
      tags: ['cyber', 'regulation'],
      source: 'Insurance Journal',
    },
    {
      id: 'demo-article-3',
      title: "Catastrophe Bond Market Hits Record $48bn as Cyber ILS Emerges",
      summary: "The insurance-linked securities market has reached a record $48 billion in outstanding cat bonds, with the first dedicated cyber catastrophe bonds successfully placed in Q1 2026.",
      category: 'ils',
      tags: ['cyber', 'ils', 'reinsurance'],
      source: 'Artemis',
    },
    {
      id: 'demo-article-4',
      title: "London Market MGAs Report 15% Premium Growth in Specialty Lines",
      summary: "Managing General Agents operating in the London Market have reported robust premium growth of 15% year-over-year in specialty lines including cyber, D&O, and professional indemnity.",
      category: 'specialty',
      tags: ['lloyds', 'manda'],
      source: 'The Insurer',
    },
    {
      id: 'demo-article-5',
      title: "FCA Launches Review of Insurance Distribution Chain Following Consumer Duty Concerns",
      summary: "The Financial Conduct Authority has announced a thematic review of insurance distribution chains, focusing on how Consumer Duty obligations are being met across the delegated authority ecosystem.",
      category: 'uk_market',
      tags: ['regulation', 'lloyds'],
      source: 'Insurance Times',
    },
    {
      id: 'demo-article-6',
      title: "Climate Risk Modelling: How AI is Transforming Nat Cat Underwriting",
      summary: "Leading reinsurers are deploying machine learning models alongside traditional catastrophe models from RMS and AIR to improve natural catastrophe risk assessment.",
      category: 'reinsurance',
      tags: ['climate', 'reinsurance', 'insurtech'],
      source: 'Reinsurance News',
    },
    {
      id: 'demo-article-7',
      title: "Insurtech Funding Rebounds: $2.1bn Raised in Q1 2026",
      summary: "Global insurtech funding has bounced back strongly with $2.1 billion raised in Q1 2026, marking a 45% increase from Q4 2025.",
      category: 'general',
      tags: ['insurtech', 'manda'],
      source: 'Insurance Journal',
    },
    {
      id: 'demo-article-8',
      title: "Professional Indemnity Market Hardens as Claims Surge in Construction Sector",
      summary: "The professional indemnity market is experiencing significant rate hardening with increases of 15-25% at renewal for construction-related risks.",
      category: 'specialty',
      tags: ['liability', 'property'],
      source: 'Commercial Risk',
    },
    {
      id: 'demo-article-9',
      title: "Marine Insurance: Global Trade Disruptions Create New Opportunities for Specialty Carriers",
      summary: "Ongoing geopolitical tensions and trade route disruptions continue to create opportunities in the marine insurance market.",
      category: 'specialty',
      tags: ['marine', 'property'],
      source: 'The Insurer',
    },
    {
      id: 'demo-article-10',
      title: "Delegated Authority: Coverholder Oversight Technologies See Rapid Adoption",
      summary: "New technology platforms for managing coverholder relationships and delegated authority oversight are seeing rapid adoption across the London Market.",
      category: 'uk_market',
      tags: ['lloyds', 'insurtech', 'regulation'],
      source: 'Insurance Times',
    },
  ];

  const now = new Date();
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const pubDate = new Date(now.getTime() - i * 3600000 * 8).toISOString();
    await sql`
      INSERT INTO news_articles (id, title, summary, content, source, source_url, category, tags, published_at)
      VALUES (${a.id}, ${a.title}, ${a.summary}, ${a.summary}, ${a.source}, ${'#'}, ${a.category}, ${JSON.stringify(a.tags)}, ${pubDate})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

async function seedPlans() {
  const plans = [
    {
      id: 'plan-starter',
      name: 'Starter',
      slug: 'starter',
      price_monthly: 49,
      price_yearly: 470,
      features: JSON.stringify(['Up to 50 articles/month', '10 content pieces/month', '1 user', 'Email support', 'FCA compliance checks']),
      limits_articles: 50,
      limits_content_pieces: 10,
      limits_users: 1,
      sort_order: 1,
    },
    {
      id: 'plan-professional',
      name: 'Professional',
      slug: 'professional',
      price_monthly: 149,
      price_yearly: 1430,
      features: JSON.stringify(['Unlimited articles', '50 content pieces/month', 'Up to 5 users', 'Priority support', 'All compliance frameworks', 'Custom brand voice', 'API access']),
      limits_articles: 9999,
      limits_content_pieces: 50,
      limits_users: 5,
      sort_order: 2,
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise',
      slug: 'enterprise',
      price_monthly: 399,
      price_yearly: 3830,
      features: JSON.stringify(['Unlimited everything', 'Unlimited users', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'White-label options', 'SSO/SAML']),
      limits_articles: 99999,
      limits_content_pieces: 99999,
      limits_users: 99999,
      sort_order: 3,
    },
  ];

  for (const p of plans) {
    await sql`
      INSERT INTO subscription_plans (id, name, slug, price_monthly, price_yearly, features, limits_articles, limits_content_pieces, limits_users, sort_order)
      VALUES (${p.id}, ${p.name}, ${p.slug}, ${p.price_monthly}, ${p.price_yearly}, ${p.features}, ${p.limits_articles}, ${p.limits_content_pieces}, ${p.limits_users}, ${p.sort_order})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export default getDb;
