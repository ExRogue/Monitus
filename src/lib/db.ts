import { sql } from '@vercel/postgres';

const SCHEMA_VERSION = 20; // Increment when adding new migrations

// Initialize database tables
export async function initDb() {
  // Check schema version to skip migrations if already applied
  try {
    await sql`CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT)`;
    const versionResult = await sql`SELECT value FROM schema_meta WHERE key = 'schema_version'`;
    const currentVersion = parseInt(versionResult.rows[0]?.value || '0');
    if (currentVersion >= SCHEMA_VERSION) return; // Already up to date
  } catch {
    // Table doesn't exist yet, proceed with full init
  }

  // Core tables
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      disabled BOOLEAN DEFAULT false
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT false`;

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
      logo_url TEXT DEFAULT '',
      primary_color TEXT DEFAULT '#14B8A6',
      secondary_color TEXT DEFAULT '#5EEAD4',
      accent_color TEXT DEFAULT '#10B981',
      custom_css TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT DEFAULT ''`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS topics TEXT DEFAULT ''`;

  // Migrate data: split niche fields that contain ' | http' (website was previously concatenated into niche)
  await sql`
    UPDATE companies SET
      website = SUBSTRING(niche FROM POSITION(' | http' IN niche) + 3),
      niche = SUBSTRING(niche FROM 1 FOR POSITION(' | http' IN niche) - 1)
    WHERE niche LIKE '% | http%' AND (website IS NULL OR website = '')
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL,
      role TEXT DEFAULT 'editor', invited_by TEXT, created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS team_invites (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL, email TEXT NOT NULL,
      role TEXT DEFAULT 'editor', token TEXT UNIQUE NOT NULL, invited_by TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL, accepted BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL, used BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW()
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

  // Deduplicate articles by source_url
  await sql`
    DELETE FROM news_articles
    WHERE id NOT IN (
      SELECT MIN(id) FROM news_articles
      WHERE source_url IS NOT NULL AND source_url != '' AND source_url != '#'
      GROUP BY source_url
    )
    AND source_url IS NOT NULL AND source_url != '' AND source_url != '#'
  `;

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
      pillar_tags TEXT DEFAULT '[]',
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
      company_id TEXT,
      event_type TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT DEFAULT '',
      link TEXT DEFAULT '',
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      subscription_id TEXT REFERENCES subscriptions(id),
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'GBP',
      status TEXT DEFAULT 'draft',
      invoice_number TEXT UNIQUE NOT NULL,
      period_start TIMESTAMP NOT NULL,
      period_end TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS usage_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      alert_type TEXT NOT NULL,
      threshold_percent INTEGER NOT NULL,
      limit_type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // New feature tables
  await sql`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_invalidated_at TIMESTAMP`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gdpr_consent_at TIMESTAMP`;

  // Rate limit events table for database-backed rate limiting on serverless
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limit_events (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time ON rate_limit_events (key, created_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS custom_templates (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      invited_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS team_invites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'editor',
      token TEXT UNIQUE NOT NULL,
      invited_by TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      accepted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      permissions TEXT DEFAULT '["read","generate"]',
      last_used_at TIMESTAMP,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS messaging_bibles (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      company_description TEXT DEFAULT '',
      target_audiences TEXT DEFAULT '[]',
      competitors TEXT DEFAULT '[]',
      differentiators TEXT DEFAULT '[]',
      key_challenges TEXT DEFAULT '[]',
      departments TEXT DEFAULT '[]',
      channels TEXT DEFAULT '["linkedin","email","trade_media"]',
      brand_voice_guide TEXT DEFAULT '',
      messaging_pillars TEXT DEFAULT '[]',
      icp_profiles TEXT DEFAULT '[]',
      department_messaging TEXT DEFAULT '[]',
      elevator_pitch TEXT DEFAULT '',
      tagline TEXT DEFAULT '',
      full_document TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      company_id TEXT,
      phase TEXT DEFAULT 'positioning',
      messages TEXT DEFAULT '[]',
      extracted_data TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS voice_edits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      company_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      original_text TEXT NOT NULL,
      edited_text TEXT NOT NULL,
      edit_type TEXT DEFAULT 'manual',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS content_distributions (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      scheduled_at TIMESTAMP,
      published_at TIMESTAMP,
      external_url TEXT DEFAULT '',
      engagement_clicks INTEGER DEFAULT 0,
      engagement_views INTEGER DEFAULT 0,
      engagement_reactions INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_article_actions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, article_id, action)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      section TEXT NOT NULL DEFAULT 'general',
      label TEXT NOT NULL DEFAULT '',
      field_type TEXT NOT NULL DEFAULT 'text',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Migrations: add columns if missing
  await sql`
    CREATE TABLE IF NOT EXISTS intelligence_reports (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      period_start TIMESTAMP NOT NULL,
      period_end TIMESTAMP NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS competitive_mentions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      competitor_name TEXT NOT NULL,
      article_id TEXT,
      mention_context TEXT DEFAULT '',
      sentiment TEXT DEFAULT 'neutral',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Phase 2: Custom RSS feeds
  await sql`
    CREATE TABLE IF NOT EXISTS custom_feeds (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      url TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'custom',
      status TEXT DEFAULT 'active',
      last_fetched_at TIMESTAMP,
      last_error TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(company_id, url)
    )
  `;

  // Phase 2: OAuth connections (LinkedIn etc)
  await sql`
    CREATE TABLE IF NOT EXISTS oauth_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT DEFAULT '',
      access_token TEXT NOT NULL,
      refresh_token TEXT DEFAULT '',
      token_expires_at TIMESTAMP,
      scopes TEXT DEFAULT '[]',
      profile_name TEXT DEFAULT '',
      profile_url TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Phase 2: Content versioning
  await sql`
    CREATE TABLE IF NOT EXISTS content_versions (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      change_summary TEXT DEFAULT '',
      created_by TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(content_id, version_number)
    )
  `;

  // Phase 2: Add source_type and topic_brief to generated_content
  await sql`ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'articles'`;
  await sql`ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS topic_brief TEXT DEFAULT ''`;

  // Add pillar_tags to generated_content
  try {
    await sql`ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS pillar_tags TEXT DEFAULT '[]'`;
  } catch (e) {
    // Column may already exist
  }

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT ''`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#14B8A6'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#5EEAD4'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#10B981'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_css TEXT DEFAULT ''`;

  // Performance indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_generated_content_company_id ON generated_content(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_generated_content_company_created ON generated_content(company_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_generated_content_company_status ON generated_content(company_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_content_distributions_company_id ON content_distributions(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_content_distributions_company_status ON content_distributions(company_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_content_distributions_content_id ON content_distributions(content_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_article_actions_user_id ON user_article_actions(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_article_actions_user_action ON user_article_actions(user_id, action)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_usage_events_user_type_created ON usage_events(user_id, event_type, created_at)`;
  await sql`ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS company_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS idx_usage_events_company_created ON usage_events(company_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messaging_bibles_company_id ON messaging_bibles(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_competitive_mentions_company_created ON competitive_mentions(company_id, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_custom_feeds_company_id ON custom_feeds(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_voice_edits_company_id ON voice_edits(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_voice_edits_user_id ON voice_edits(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC)`;

  // Seed data
  await seedPlans();
  await seedAdminAccount();
  if (process.env.NODE_ENV !== 'production') {
    await seedDemoArticles();
    await seedDemoNotifications();
    await seedDemoInvoices();
    await seedDemoContent();
  }

  // ── Schema v8: Themes, Opportunities, Weekly Priority Views ──────────────

  // Source tier tracking on news articles
  await sql`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS source_tier INTEGER DEFAULT 3`;
  await sql`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS theme_cluster_ids TEXT DEFAULT '[]'`;
  await sql`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS icp_relevance_score NUMERIC DEFAULT 0`;
  await sql`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS narrative_similarity_score NUMERIC DEFAULT 0`;
  await sql`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS competitor_relevance_score NUMERIC DEFAULT 0`;
  await sql`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS source_diversity_contribution NUMERIC DEFAULT 0`;

  // Themes table — tracked topics with weighted scores and time-window momentum
  await sql`
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      classification TEXT DEFAULT 'Building',
      score NUMERIC DEFAULT 0,
      momentum_7d NUMERIC DEFAULT 0,
      momentum_30d NUMERIC DEFAULT 0,
      momentum_90d NUMERIC DEFAULT 0,
      momentum_180d NUMERIC DEFAULT 0,
      source_diversity NUMERIC DEFAULT 0,
      competitor_activity NUMERIC DEFAULT 0,
      icp_relevance NUMERIC DEFAULT 0,
      narrative_fit NUMERIC DEFAULT 0,
      recommended_action TEXT DEFAULT 'monitor',
      article_ids TEXT DEFAULT '[]',
      last_updated TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_themes_company_id ON themes(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_themes_company_score ON themes(company_id, score DESC)`;

  // Opportunities table — structured editorial opportunities
  await sql`
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      type TEXT DEFAULT 'signal-led',
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      source_signal_ids TEXT DEFAULT '[]',
      theme_id TEXT,
      why_it_matters TEXT DEFAULT '',
      why_it_matters_to_buyers TEXT DEFAULT '',
      competitor_context TEXT DEFAULT '',
      buyer_relevance TEXT DEFAULT '',
      recommended_angle TEXT DEFAULT '',
      recommended_format TEXT DEFAULT '',
      urgency_score NUMERIC DEFAULT 0,
      opportunity_score NUMERIC DEFAULT 0,
      narrative_pillar TEXT DEFAULT '',
      target_icp TEXT DEFAULT '',
      stage TEXT DEFAULT 'monitor',
      dismissed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_opportunities_company_id ON opportunities(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_opportunities_company_stage ON opportunities(company_id, stage)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_opportunities_company_score ON opportunities(company_id, opportunity_score DESC)`;

  // Weekly Priority Views — auto-generated weekly intelligence summaries
  await sql`
    CREATE TABLE IF NOT EXISTS weekly_priority_views (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      week_start TIMESTAMP NOT NULL,
      week_end TIMESTAMP NOT NULL,
      top_themes TEXT DEFAULT '[]',
      recommended_angles TEXT DEFAULT '[]',
      competitor_move TEXT DEFAULT '',
      content_mix TEXT DEFAULT '[]',
      thing_to_ignore TEXT DEFAULT '',
      full_content TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_weekly_priority_views_company ON weekly_priority_views(company_id, week_start DESC)`;

  // Extend messaging_bibles with structured internal model fields
  await sql`ALTER TABLE messaging_bibles ADD COLUMN IF NOT EXISTS narrative_pillars TEXT DEFAULT '[]'`;
  await sql`ALTER TABLE messaging_bibles ADD COLUMN IF NOT EXISTS icp_resonance_models TEXT DEFAULT '[]'`;
  await sql`ALTER TABLE messaging_bibles ADD COLUMN IF NOT EXISTS voice_rules TEXT DEFAULT '[]'`;
  await sql`ALTER TABLE messaging_bibles ADD COLUMN IF NOT EXISTS excluded_language TEXT DEFAULT '[]'`;
  await sql`ALTER TABLE messaging_bibles ADD COLUMN IF NOT EXISTS competitor_relationships TEXT DEFAULT '[]'`;
  await sql`ALTER TABLE messaging_bibles ADD COLUMN IF NOT EXISTS interview_blocks TEXT DEFAULT '{}'`;

  // Add content lineage to generated_content
  await sql`ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS opportunity_id TEXT`;
  await sql`ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS theme_id TEXT`;
  await sql`ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS signal_id TEXT`;

  // ── Schema v9: Onboarding drip queue + user webhooks ──────────────────────

  // Onboarding drip queue — rows created at registration, fired by cron
  await sql`
    CREATE TABLE IF NOT EXISTS onboarding_drip_queue (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      drip_day INTEGER NOT NULL,
      scheduled_for TIMESTAMP NOT NULL,
      email TEXT NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, drip_day)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_drip_queue_scheduled ON onboarding_drip_queue(scheduled_for) WHERE sent_at IS NULL`;

  // User-defined webhook endpoints — notified on content events
  await sql`
    CREATE TABLE IF NOT EXISTS user_webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT DEFAULT '["content.generated","content.approved","content.published"]',
      secret TEXT NOT NULL,
      active BOOLEAN DEFAULT true,
      last_fired_at TIMESTAMP,
      last_status INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, url)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_webhooks_user_id ON user_webhooks(user_id)`;

  // ── Schema v10: Multi-narrative support ─────────────────────────────────

  // Narratives table — allows multiple practice-area narratives per company
  await sql`
    CREATE TABLE IF NOT EXISTS narratives (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default BOOLEAN DEFAULT false,
      messaging_bible_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_narratives_company_id ON narratives(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_narratives_company_default ON narratives(company_id, is_default)`;

  // Link messaging_bibles to narratives
  await sql`ALTER TABLE messaging_bibles ADD COLUMN IF NOT EXISTS narrative_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messaging_bibles_narrative_id ON messaging_bibles(narrative_id)`;

  // Link interview_sessions to narratives
  await sql`ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS narrative_id TEXT`;

  // Link generated_content to narratives
  await sql`ALTER TABLE generated_content ADD COLUMN IF NOT EXISTS narrative_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS idx_generated_content_narrative_id ON generated_content(narrative_id)`;

  // Link opportunities to narratives
  await sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS narrative_id TEXT`;
  await sql`CREATE INDEX IF NOT EXISTS idx_opportunities_narrative_id ON opportunities(narrative_id)`;

  // Link voice_edits to narratives
  await sql`ALTER TABLE voice_edits ADD COLUMN IF NOT EXISTS narrative_id TEXT`;

  // Locale support — per-company language preference (en-GB or en-US)
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-GB'`;

  // ── Schema v12: Signal analyses — per-company AI scoring of articles ────
  await sql`
    CREATE TABLE IF NOT EXISTS signal_analyses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      narrative_fit INTEGER DEFAULT 0,
      urgency INTEGER DEFAULT 0,
      why_it_matters TEXT DEFAULT '',
      why_it_matters_to_buyers TEXT DEFAULT '',
      recommended_action TEXT DEFAULT 'monitor',
      competitor_context TEXT DEFAULT '',
      themes TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(company_id, article_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_analyses_company_id ON signal_analyses(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_analyses_company_article ON signal_analyses(company_id, article_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_analyses_company_fit ON signal_analyses(company_id, narrative_fit DESC)`;

  // ── Schema v13: Stakeholder messaging matrix on messaging_bibles ────
  await sql`ALTER TABLE messaging_bibles ADD COLUMN IF NOT EXISTS stakeholder_matrix TEXT DEFAULT '[]'`;

  // ── Schema v14: Stakeholder fit columns for signal analyses and opportunities ────
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS stakeholder_fit TEXT DEFAULT '{}'`;
  await sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS strongest_stakeholder_fit TEXT DEFAULT ''`;

  // ── Schema v15: 6-digit email verification codes on users table ────
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP`;

  // ── Schema v16: Enhanced 8-dimension signal scoring + Strategy Partner recommendation fields ────

  // New columns on signal_analyses for 8-dimension scoring
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS icp_fit SMALLINT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS stakeholder_fit_score SMALLINT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS right_to_say SMALLINT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS strategic_significance SMALLINT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS timeliness SMALLINT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS competitor_relevance SMALLINT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS actionability SMALLINT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS usefulness_score REAL`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS strongest_stakeholder TEXT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS secondary_stakeholder TEXT`;
  await sql`ALTER TABLE signal_analyses ADD COLUMN IF NOT EXISTS reasoning TEXT`;

  // Index on usefulness_score for fast retrieval of top signals
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_analyses_company_usefulness ON signal_analyses(company_id, usefulness_score DESC)`;

  // New columns on opportunities for Strategy Partner recommendation
  await sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS why_now TEXT DEFAULT ''`;
  await sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS recommended_proof_type TEXT DEFAULT ''`;
  await sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS strongest_stakeholder TEXT DEFAULT ''`;
  await sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS secondary_stakeholder TEXT DEFAULT ''`;
  await sql`ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS core_argument TEXT DEFAULT ''`;

  // ── Schema v17: Source registry + notification preferences ──────────────

  // Source registry — replaces hardcoded INSURANCE_FEEDS array
  await sql`
    CREATE TABLE IF NOT EXISTS source_registry (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      source_type TEXT DEFAULT 'rss',
      priority TEXT DEFAULT 'standard',
      trust_weight SMALLINT DEFAULT 5,
      geography TEXT,
      segment TEXT,
      classification TEXT DEFAULT 'trade',
      scan_cadence_minutes INTEGER DEFAULT 30,
      last_checked TIMESTAMP,
      next_check TIMESTAMP,
      last_surfaced_signal TIMESTAMP,
      total_signals INTEGER DEFAULT 0,
      avg_usefulness REAL DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      company_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_source_registry_active ON source_registry(is_active) WHERE is_active = true`;
  await sql`CREATE INDEX IF NOT EXISTS idx_source_registry_next_check ON source_registry(next_check) WHERE is_active = true`;
  await sql`CREATE INDEX IF NOT EXISTS idx_source_registry_company_id ON source_registry(company_id)`;

  // Notification preferences on companies
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS weekly_email_enabled BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS monthly_email_enabled BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS notification_time TEXT DEFAULT '07:00'`;

  // === Schema v18: Signal alerts, shared items ===

  // Alert preferences on companies
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT DEFAULT ''`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 8`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS alert_channels TEXT DEFAULT 'email'`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT ''`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT DEFAULT ''`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS alert_email_enabled BOOLEAN DEFAULT true`;

  // Signal alerts audit log
  await sql`CREATE TABLE IF NOT EXISTS signal_alerts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    signal_analysis_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_alerts_company ON signal_alerts(company_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signal_alerts_signal ON signal_alerts(signal_analysis_id)`;

  // Shared items (share with team)
  await sql`CREATE TABLE IF NOT EXISTS shared_items (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    personal_note TEXT DEFAULT '',
    viewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shared_items_token ON shared_items(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shared_items_user ON shared_items(user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shared_items_company ON shared_items(company_id, created_at DESC)`;

  // === Schema v19: Slack OAuth columns ===
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS slack_channel_id TEXT DEFAULT ''`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS slack_channel_name TEXT DEFAULT ''`;
  await sql`ALTER TABLE companies ADD COLUMN IF NOT EXISTS slack_team_name TEXT DEFAULT ''`;

  // === Schema v20: Website scraping support ===
  await sql`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'rss'`;

  // Seed source_registry from INSURANCE_FEEDS if empty
  await seedSourceRegistry();

  // Record schema version so subsequent cold starts skip migrations
  await sql`
    INSERT INTO schema_meta (key, value) VALUES ('schema_version', ${String(SCHEMA_VERSION)})
    ON CONFLICT (key) DO UPDATE SET value = ${String(SCHEMA_VERSION)}
  `;
}

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function getDb() {
  if (!initialized) {
    // Deduplicate concurrent init calls (e.g. parallel API routes on cold start)
    if (!initPromise) {
      initPromise = initDb()
        .then(() => { initialized = true; })
        .catch((err) => {
          // Clear the cached promise so the next call can retry
          initPromise = null;
          throw err;
        });
    }
    await initPromise;
  }

  return sql;
}

async function seedAdminAccount() {
  const { seedAdmin } = await import('./seed-admin');
  await seedAdmin();
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
      id: 'plan-trial',
      name: 'Free Trial',
      slug: 'trial',
      price_monthly: 0,
      price_yearly: 0,
      features: JSON.stringify(['7-day full access', 'Narrative', 'Weekly monitoring', '3 LinkedIn drafts/week', 'Basic engagement tracking']),
      limits_articles: 50,
      limits_content_pieces: 15,
      limits_users: 1,
      sort_order: 0,
    },
    {
      id: 'plan-starter',
      name: 'Starter',
      slug: 'starter',
      price_monthly: 500,
      price_yearly: 4800,
      features: JSON.stringify(['Narrative', 'Weekly monitoring', '3 LinkedIn drafts/week', 'Basic engagement tracking', 'Email support']),
      limits_articles: 50,
      limits_content_pieces: 20,
      limits_users: 3,
      sort_order: 1,
    },
    {
      id: 'plan-professional',
      name: 'Growth',
      slug: 'professional',
      price_monthly: 1200,
      price_yearly: 11520,
      features: JSON.stringify(['Everything in Starter', 'Daily monitoring', 'All 3 content formats', 'LinkedIn posting via API', 'Email export', 'Monthly intelligence report', 'Up to 3 users']),
      limits_articles: 200,
      limits_content_pieces: 100,
      limits_users: 3,
      sort_order: 2,
    },
    {
      id: 'plan-enterprise',
      name: 'Intelligence',
      slug: 'enterprise',
      price_monthly: 2000,
      price_yearly: 19200,
      features: JSON.stringify(['Everything in Growth', 'Competitor tracking & positioning', 'Weekly Priority View', 'Quarterly positioning review', 'Briefing builder', 'Trade media pitches', 'Unlimited users']),
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
      ON CONFLICT (id) DO UPDATE SET name = ${p.name}, price_monthly = ${p.price_monthly}, price_yearly = ${p.price_yearly}, features = ${p.features}, limits_articles = ${p.limits_articles}, limits_content_pieces = ${p.limits_content_pieces}, limits_users = ${p.limits_users}
    `;
  }
}

async function seedDemoNotifications() {
  // Get the demo user ID from the admin seed
  const userResult = await sql`SELECT id FROM users WHERE email = 'admin@monitus.ai' LIMIT 1`;
  if (!userResult.rows[0]) return;

  const userId = userResult.rows[0].id;
  const now = new Date();

  const notifications = [
    {
      id: 'demo-notif-1',
      type: 'content_generated',
      title: 'Content Generated Successfully',
      message: 'Your article brief "Lloyd\'s Cyber Exclusions 2026" has been processed and generated content is ready for review.',
      link: '/content',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-notif-2',
      type: 'usage_alert',
      title: 'Usage Alert: 80% of Monthly Articles Used',
      message: 'You\'ve used 40 of 50 articles this month. Consider upgrading your plan to avoid hitting the limit.',
      link: '/billing',
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-notif-3',
      type: 'subscription_changed',
      title: 'Subscription Updated',
      message: 'Your subscription has been upgraded to Professional plan. Enjoy unlimited articles and 50 content pieces per month.',
      link: '/billing',
      created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const n of notifications) {
    await sql`
      INSERT INTO notifications (id, user_id, type, title, message, link, read, created_at)
      VALUES (${n.id}, ${userId}, ${n.type}, ${n.title}, ${n.message}, ${n.link}, false, ${n.created_at})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

async function seedDemoInvoices() {
  // Get the demo user ID and their subscription
  const userResult = await sql`SELECT id FROM users WHERE email = 'admin@monitus.ai' LIMIT 1`;
  if (!userResult.rows[0]) return;

  const userId = userResult.rows[0].id;

  // Get or create a subscription for the demo user
  const subResult = await sql`
    SELECT id FROM subscriptions WHERE user_id = ${userId} LIMIT 1
  `;

  let subscriptionId = subResult.rows[0]?.id;
  if (!subscriptionId) {
    subscriptionId = `sub-demo-${Date.now()}`;
    await sql`
      INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end)
      VALUES (${subscriptionId}, ${userId}, 'plan-professional', 'active', NOW(), NOW() + INTERVAL '1 month')
      ON CONFLICT (id) DO NOTHING
    `;
  }

  const now = new Date();
  const invoices = [
    {
      id: 'demo-invoice-1',
      invoice_number: 'INV-2025-001',
      amount: 14900, // £149.00
      status: 'paid',
      period_start: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
      period_end: new Date(now.getFullYear(), now.getMonth() - 1, 0).toISOString(),
      created_at: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-invoice-2',
      invoice_number: 'INV-2025-002',
      amount: 14900, // £149.00
      status: 'paid',
      period_start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      period_end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString(),
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-invoice-3',
      invoice_number: 'INV-2025-003',
      amount: 14900, // £149.00
      status: 'draft',
      period_start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      period_end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      created_at: now.toISOString(),
    },
  ];

  for (const inv of invoices) {
    await sql`
      INSERT INTO invoices (id, user_id, subscription_id, amount, currency, status, invoice_number, period_start, period_end, created_at)
      VALUES (${inv.id}, ${userId}, ${subscriptionId}, ${inv.amount}, 'GBP', ${inv.status}, ${inv.invoice_number}, ${inv.period_start}, ${inv.period_end}, ${inv.created_at})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

async function seedDemoContent() {
  // Get the demo company ID
  const companyResult = await sql`
    SELECT c.id FROM companies c
    JOIN users u ON c.user_id = u.id
    WHERE u.email = 'admin@monitus.ai'
    LIMIT 1
  `;

  if (!companyResult.rows[0]) return;

  const companyId = companyResult.rows[0].id;
  const now = new Date();

  const contentPieces = [
    {
      id: 'demo-content-1',
      content_type: 'article_brief',
      title: 'Lloyd\'s Cyber War Exclusion Clauses: Key Changes for April 2026',
      content: 'The Lloyd\'s Market Association has mandated new cyber war exclusion clauses effective 1 April 2026. Key changes include revised definitions of "cyber war" and enhanced exclusion language. Insurers writing cyber risks must implement these new clauses across all policies. The changes come in response to increased geopolitical tensions and the need to clarify coverage boundaries in conflict zones. Market intelligence suggests these clauses will become standard across the London Market within 6 months.',
      compliance_status: 'approved',
      article_ids: JSON.stringify(['demo-article-1']),
      created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-content-2',
      content_type: 'compliance_summary',
      title: 'SEC Cyber Disclosure Rules: Implementation Roadmap for Insurers',
      content: 'The SEC\'s final cyber incident disclosure rules require public companies to report material cybersecurity incidents within 4 business days. For insurers, this creates new opportunities and challenges. Carriers writing cyber liability must understand the expanded disclosure requirements and their impact on claims reporting. The rules take effect 2 months after publication. Insurers should review their claims procedures and consider updates to policy language to align with SEC requirements. Early adoption of these procedures may provide competitive advantage.',
      compliance_status: 'pending_review',
      article_ids: JSON.stringify(['demo-article-2']),
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-content-3',
      content_type: 'market_brief',
      title: 'Cat Bonds Hit Record: New Cyber ILS Opportunities Emerge',
      content: 'The catastrophe bond market has reached $48 billion in outstanding value. Notably, the first cyber catastrophe bonds have been successfully placed, marking a significant expansion of the ILS market into cyber risk. This development reflects growing investor appetite for alternative risk transfer mechanisms. For insurers and reinsurers, cyber cat bonds offer new capacity alternatives and potential cost benefits. The emergence of cyber ILS is expected to mature significantly over the next 2-3 years, creating additional hedging opportunities.',
      compliance_status: 'approved',
      article_ids: JSON.stringify(['demo-article-3']),
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-content-4',
      content_type: 'regulatory_update',
      title: 'FCA Distribution Chain Review: What MGAs Need to Know',
      content: 'The Financial Conduct Authority has launched a thematic review of the insurance distribution chain, focusing on Consumer Duty compliance. This review will examine how delegated authority frameworks meet new consumer protection standards. MGAs and managing agents should prepare for potential regulatory changes. Key areas of focus include: conflict of interest management, suitability of advice, and transparency in the delegated authority relationship. Compliance teams should conduct internal audits and consider whether existing procedures adequately address Consumer Duty requirements.',
      compliance_status: 'approved',
      article_ids: JSON.stringify(['demo-article-5']),
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const content of contentPieces) {
    await sql`
      INSERT INTO generated_content (id, company_id, article_ids, content_type, title, content, compliance_status, created_at, updated_at)
      VALUES (${content.id}, ${companyId}, ${content.article_ids}, ${content.content_type}, ${content.title}, ${content.content}, ${content.compliance_status}, ${content.created_at}, ${content.created_at})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

/**
 * Seed source_registry from the hardcoded INSURANCE_FEEDS array in news.ts.
 * Only inserts rows that don't already exist (keyed on url).
 */
async function seedSourceRegistry() {
  // Check if already seeded
  const countResult = await sql`SELECT COUNT(*) as cnt FROM source_registry WHERE company_id IS NULL`;
  if (Number(countResult.rows[0]?.cnt) > 0) return; // Already seeded

  // Mapping from feed metadata to source_registry columns
  const feedMeta: {
    url: string; name: string; category: string; locale?: string;
    priority: string; classification: string; trustWeight: number;
    geography: string | null; segment: string | null;
  }[] = [
    // Tier 1 — UK market & specialty
    { url: 'https://www.insurancetimes.co.uk/rss', name: 'Insurance Times', category: 'uk_market', locale: 'en-GB', priority: 'high', classification: 'trade', trustWeight: 8, geography: 'uk', segment: 'specialty' },
    { url: 'https://www.insurancebusinessmag.com/uk/rss/', name: 'Insurance Business UK', category: 'uk_market', locale: 'en-GB', priority: 'high', classification: 'trade', trustWeight: 7, geography: 'uk', segment: 'specialty' },
    { url: 'https://www.insuranceage.co.uk/feeds/rss', name: 'Insurance Age', category: 'uk_market', locale: 'en-GB', priority: 'high', classification: 'trade', trustWeight: 7, geography: 'uk', segment: 'specialty' },
    { url: 'https://www.theinsurer.com/feed/', name: 'The Insurer', category: 'specialty', priority: 'high', classification: 'trade', trustWeight: 8, geography: 'global', segment: 'specialty' },
    { url: 'https://www.postonline.co.uk/rss', name: 'Post Magazine', category: 'uk_market', locale: 'en-GB', priority: 'high', classification: 'trade', trustWeight: 7, geography: 'uk', segment: 'specialty' },
    { url: 'https://www.globalreinsurance.com/feed/', name: 'Global Reinsurance', category: 'reinsurance', priority: 'high', classification: 'trade', trustWeight: 7, geography: 'global', segment: 'reinsurance' },

    // UK regulatory
    { url: 'https://www.fca.org.uk/news/rss.xml', name: 'FCA', category: 'regulation_uk', locale: 'en-GB', priority: 'critical', classification: 'regulator', trustWeight: 10, geography: 'uk', segment: null },
    { url: 'https://www.bankofengland.co.uk/rss/news', name: 'Bank of England', category: 'regulation_uk', locale: 'en-GB', priority: 'critical', classification: 'regulator', trustWeight: 10, geography: 'uk', segment: null },
    { url: 'https://www.bankofengland.co.uk/rss/prudential-regulation', name: 'PRA', category: 'regulation_uk', locale: 'en-GB', priority: 'critical', classification: 'regulator', trustWeight: 10, geography: 'uk', segment: null },

    // US regulatory
    { url: 'https://content.naic.org/feed', name: 'NAIC Newsroom', category: 'regulation_us', locale: 'en-US', priority: 'critical', classification: 'regulator', trustWeight: 10, geography: 'us', segment: null },
    { url: 'https://www.insurance.ca.gov/0400-news/RSS/index.cfm', name: 'California DOI', category: 'regulation_us', locale: 'en-US', priority: 'critical', classification: 'regulator', trustWeight: 9, geography: 'us', segment: null },
    { url: 'https://www.dfs.ny.gov/rss.xml', name: 'New York DFS', category: 'regulation_us', locale: 'en-US', priority: 'critical', classification: 'regulator', trustWeight: 9, geography: 'us', segment: null },
    { url: 'https://www.tdi.texas.gov/rss/news.xml', name: 'Texas DOI', category: 'regulation_us', locale: 'en-US', priority: 'critical', classification: 'regulator', trustWeight: 9, geography: 'us', segment: null },
    { url: 'https://www.floir.com/rss', name: 'Florida OIR', category: 'regulation_us', locale: 'en-US', priority: 'critical', classification: 'regulator', trustWeight: 9, geography: 'us', segment: null },
    { url: 'https://home.treasury.gov/system/files/feed.xml', name: 'US Treasury (FIO)', category: 'regulation_us', locale: 'en-US', priority: 'critical', classification: 'regulator', trustWeight: 8, geography: 'us', segment: null },
    { url: 'https://www.nist.gov/blogs/cybersecurity-insights/rss.xml', name: 'NIST Cybersecurity', category: 'regulation_us', locale: 'en-US', priority: 'critical', classification: 'regulator', trustWeight: 9, geography: 'us', segment: 'cyber' },

    // Reinsurance & ILS
    { url: 'https://www.reinsurancene.ws/feed/', name: 'Reinsurance News', category: 'reinsurance', priority: 'high', classification: 'trade', trustWeight: 7, geography: 'global', segment: 'reinsurance' },
    { url: 'https://www.artemis.bm/feed/', name: 'Artemis', category: 'ils', priority: 'high', classification: 'trade', trustWeight: 8, geography: 'global', segment: 'reinsurance' },

    // General / international
    { url: 'https://www.insurancejournal.com/feed/', name: 'Insurance Journal', category: 'general', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'us', segment: null },
    { url: 'https://www.insurancejournal.com/newsfeed/', name: 'Insurance Journal Newswire', category: 'general', priority: 'standard', classification: 'trade', trustWeight: 5, geography: 'us', segment: null },
    { url: 'https://www.commercialriskonline.com/feed/', name: 'Commercial Risk', category: 'commercial', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'global', segment: 'specialty' },
    { url: 'https://www.carriermanagement.com/feed/', name: 'Carrier Management', category: 'general', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'us', segment: null },
    { url: 'https://www3.ambest.com/ambv/bestwirefeed/', name: 'AM Best', category: 'general', priority: 'standard', classification: 'analyst', trustWeight: 8, geography: 'global', segment: null },
    { url: 'https://news.google.com/rss/search?q=when:7d+allinurl:reuters.com+insurance&ceid=US:en&hl=en-US&gl=US', name: 'Reuters Insurance', category: 'general', priority: 'standard', classification: 'trade', trustWeight: 7, geography: 'global', segment: null },

    // Marine
    { url: 'https://www.tradewindsnews.com/rss', name: 'TradeWinds', category: 'marine', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'global', segment: 'specialty' },

    // Podcasts
    { url: 'https://feeds.buzzsprout.com/2063104.rss', name: 'The Voice of Insurance', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'uk', segment: null },
    { url: 'https://anchor.fm/s/7e741c8c/podcast/rss', name: 'The Reinsurance Podcast', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'global', segment: 'reinsurance' },
    { url: 'https://feeds.feedblitz.com/insuranceday-all&x=1', name: 'The Insurance Day Podcast', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'uk', segment: null },
    { url: 'https://feed.podbean.com/instechlondon/feed.xml', name: 'InsTech', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'uk', segment: 'insurtech' },
    { url: 'https://feeds.soundcloud.com/users/soundcloud:users:1008690196/sounds.rss', name: 'Insurance Uncut', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'uk', segment: null },
    { url: 'https://feeds.acast.com/public/shows/62822c55f7114f0012f2582a', name: 'The Leadership in Insurance Podcast', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'uk', segment: null },
    { url: 'https://feeds.acast.com/public/shows/5e565361dcbf6d9f50734ff8', name: 'Insurance Post Podcast', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'uk', segment: null },
    { url: 'https://rss.buzzsprout.com/2317674.rss', name: 'Insurance Insider - Behind the Headlines', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'uk', segment: null },
    { url: 'https://feeds.acast.com/public/shows/insurance-covered', name: 'Insurance Covered', category: 'podcast', priority: 'standard', classification: 'podcast', trustWeight: 5, geography: 'uk', segment: null },

    // InsurTech
    { url: 'https://coverager.com/feed/', name: 'Coverager', category: 'insurtech', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'global', segment: 'insurtech' },
    { url: 'https://www.insurtechinsights.com/feed/', name: 'Insurtech Insights', category: 'insurtech', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'global', segment: 'insurtech' },
    { url: 'https://www.dig-in.com/feed', name: 'Digital Insurance', category: 'insurtech', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'us', segment: 'insurtech' },
    { url: 'https://www.intelligentinsurer.com/rss', name: 'Intelligent Insurer', category: 'insurtech', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'global', segment: 'insurtech' },
    { url: 'https://www.insuranceinsider.com/feed', name: 'The Insurance Insider', category: 'insurtech', priority: 'high', classification: 'trade', trustWeight: 8, geography: 'uk', segment: 'insurtech' },

    // Cyber / Security
    { url: 'https://www.darkreading.com/rss.xml', name: 'Dark Reading', category: 'cyber', priority: 'standard', classification: 'trade', trustWeight: 7, geography: 'global', segment: 'cyber' },
    { url: 'https://feeds.feedburner.com/securityweek', name: 'SecurityWeek', category: 'cyber', priority: 'standard', classification: 'trade', trustWeight: 7, geography: 'global', segment: 'cyber' },
    { url: 'https://www.cisa.gov/news.xml', name: 'CISA Alerts', category: 'cyber', priority: 'high', classification: 'regulator', trustWeight: 9, geography: 'us', segment: 'cyber' },
    { url: 'https://www.bleepingcomputer.com/feed/', name: 'Bleeping Computer', category: 'cyber', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'global', segment: 'cyber' },

    // Specialty Lines
    { url: 'https://www.lloyds.com/news-and-insights/rss', name: "Lloyd's of London", category: 'specialty', priority: 'high', classification: 'trade', trustWeight: 9, geography: 'uk', segment: 'specialty' },
    { url: 'https://www.ainonline.com/feed', name: 'Aviation International News', category: 'specialty', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'global', segment: 'specialty' },
    { url: 'https://www.constructiondive.com/feeds/news/', name: 'Construction Dive', category: 'specialty', priority: 'standard', classification: 'trade', trustWeight: 5, geography: 'us', segment: 'specialty' },

    // Climate / Cat Risk
    { url: 'https://www.swissre.com/rss/institute.rss', name: 'Swiss Re Institute', category: 'climate', priority: 'high', classification: 'analyst', trustWeight: 9, geography: 'global', segment: 'reinsurance' },
    { url: 'https://www.munichre.com/topics-online/en/rss-feed.rss', name: 'Munich Re Topics', category: 'climate', priority: 'high', classification: 'analyst', trustWeight: 9, geography: 'global', segment: 'reinsurance' },

    // US Market
    { url: 'https://www.propertycasualty360.com/feed/', name: 'PropertyCasualty360', category: 'us_market', locale: 'en-US', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'us', segment: null },
    { url: 'https://insurtechnews.com/feed/', name: 'InsurTech News', category: 'us_market', locale: 'en-US', priority: 'standard', classification: 'trade', trustWeight: 5, geography: 'us', segment: 'insurtech' },
    { url: 'https://riskandinsurance.com/feed/', name: 'Risk & Insurance', category: 'us_market', locale: 'en-US', priority: 'standard', classification: 'trade', trustWeight: 6, geography: 'us', segment: null },

    // Asia Pacific / International
    { url: 'https://www.asiainsurancereview.com/rss', name: 'Asia Insurance Review', category: 'international', priority: 'standard', classification: 'trade', trustWeight: 5, geography: 'apac', segment: null },
    { url: 'https://www.meinsurancereview.com/rss', name: 'Middle East Insurance Review', category: 'international', priority: 'standard', classification: 'trade', trustWeight: 5, geography: 'mena', segment: null },

    // PR Wire / Deal Flow
    { url: 'https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeGVJSVg==', name: 'BusinessWire Insurance', category: 'deal_flow', priority: 'standard', classification: 'competitor', trustWeight: 4, geography: 'global', segment: null },
    { url: 'https://www.globenewswire.com/RssFeed/subjectcode/12-Insurance/feedTitle/GlobeNewswire%20-%20Insurance', name: 'GlobeNewswire Insurance', category: 'deal_flow', priority: 'standard', classification: 'competitor', trustWeight: 4, geography: 'global', segment: null },

    // Consulting / Strategy
    { url: 'https://www.mckinsey.com/industries/financial-services/our-insights/insurance/rss', name: 'McKinsey Insurance', category: 'strategy', priority: 'standard', classification: 'analyst', trustWeight: 8, geography: 'global', segment: null },

    // VC / Funding
    { url: 'https://fintech.global/insurtech/feed/', name: 'FinTech Global InsurTech', category: 'funding', priority: 'standard', classification: 'trade', trustWeight: 5, geography: 'global', segment: 'insurtech' },

    // EU Regulation
    { url: 'https://ec.europa.eu/commission/presscorner/api/rss', name: 'European Commission', category: 'regulation_eu', priority: 'high', classification: 'regulator', trustWeight: 8, geography: 'eu', segment: null },

    // Social / Sentiment — removed (consumer noise, not professional intelligence)

    // Industry Reports
    { url: 'https://www.genre.com/knowledge/blog.html?rss=true', name: 'Gen Re Knowledge', category: 'reinsurance', priority: 'standard', classification: 'analyst', trustWeight: 7, geography: 'global', segment: 'reinsurance' },
    { url: 'https://www.willistowerswatson.com/en-GB/Insights/rss', name: 'WTW Insights', category: 'strategy', priority: 'standard', classification: 'analyst', trustWeight: 7, geography: 'global', segment: null },
  ];

  // Cadence mapping: critical = 15min, high = 30min, standard = 60min, low = 120min
  const cadenceMap: Record<string, number> = {
    critical: 15,
    high: 30,
    standard: 60,
    low: 120,
  };

  for (const feed of feedMeta) {
    const id = `src-${feed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`;
    const cadence = cadenceMap[feed.priority] || 60;

    await sql`
      INSERT INTO source_registry (id, name, url, source_type, priority, trust_weight, geography, segment, classification, scan_cadence_minutes, is_active, company_id)
      VALUES (${id}, ${feed.name}, ${feed.url}, 'rss', ${feed.priority}, ${feed.trustWeight}, ${feed.geography}, ${feed.segment}, ${feed.classification}, ${cadence}, true, NULL)
      ON CONFLICT (url) DO NOTHING
    `;
  }
}

export default getDb;
