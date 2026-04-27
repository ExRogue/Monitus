/**
 * News Saturation Discovery
 *
 * For each story (grouped by story_signature), compute three pillars:
 * - Volume saturation: raw mention count across rolling windows (6h / 24h / 7d)
 * - Breadth saturation: distinct sources, weighted by source_tier
 *   - Tier 0 (regulators) = 4x weight
 *   - Tier 1 (top trade press) = 3x
 *   - Tier 2 = 2x
 *   - Tier 3+ = 1x
 * - Competitive saturation: % of coverage mentioning the client vs named competitors
 *
 * Plus phase classification (emerging / peaking / fading) from volume trajectory,
 * and a composable composite score with adjustable weights.
 *
 * Threshold defaults from the spec:
 * - 45+ mentions in 24h => high saturation
 * - 4x acceleration in 6h vs prior 6h => spike alert
 */

import { sql } from '@vercel/postgres';

// ── Types ─────────────────────────────────────────────────────────────

export interface VolumeSaturation {
  count_6h: number;
  count_24h: number;
  count_7d: number;
  /** mentions per hour over the last 6h */
  velocity_6h: number;
  /** mentions per hour over the last 24h */
  velocity_24h: number;
  /** ratio of last 6h velocity to prior 6h velocity (acceleration). 1.0 = flat. */
  acceleration: number;
}

export interface BreadthSaturation {
  distinct_sources: number;
  tier0_count: number; // regulators
  tier1_count: number; // top trade press
  tier2_count: number;
  tier3_count: number;
  /** Weighted breadth score, 0-100 normalised. */
  weighted_score: number;
}

export interface CompetitiveSaturation {
  /** Total articles in the story */
  total_articles: number;
  /** Articles mentioning the client by name */
  client_mentions: number;
  /** % of articles that mention the client (0-100) */
  client_share_pct: number;
  /** Map of competitor name -> mention count */
  competitor_mentions: Record<string, number>;
  /** True if at least one competitor is in the story but the client is not */
  client_at_risk: boolean;
  /** True if the client is in the story but no competitor is yet */
  client_only_opportunity: boolean;
}

export type SaturationPhase = 'emerging' | 'peaking' | 'fading' | 'inactive';

export interface StorySaturation {
  story_signature: string;
  sample_title: string;
  phase: SaturationPhase;
  volume: VolumeSaturation;
  breadth: BreadthSaturation;
  competitive: CompetitiveSaturation;
  /** 0-100 composite score combining the three pillars. */
  composite_score: number;
  /** True if the story crossed any spike threshold this cycle. */
  triggered_alert: boolean;
  alert_reason?: string;
}

export interface SaturationWeights {
  volume: number; // default 0.4
  breadth: number; // default 0.4
  competitive: number; // default 0.2
}

const DEFAULT_WEIGHTS: SaturationWeights = { volume: 0.4, breadth: 0.4, competitive: 0.2 };

// ── Thresholds (from feature spec) ────────────────────────────────────

const SPIKE_24H_THRESHOLD = 45; // 45+ mentions in 24h => high saturation flag
const ACCELERATION_THRESHOLD = 4.0; // 4x acceleration => spike alert
const PHASE_FADING_RATIO = 0.4; // last-6h velocity < 40% of 24h velocity => fading
const PHASE_EMERGING_RATIO = 1.5; // last-6h velocity > 150% of 24h velocity => emerging

// ── Public API ────────────────────────────────────────────────────────

/**
 * Get full saturation snapshot for a single story signature.
 * If companyId is provided, includes competitive saturation against that company's competitors.
 */
export async function getStorySaturation(
  storySignature: string,
  companyId?: string,
  weights: SaturationWeights = DEFAULT_WEIGHTS
): Promise<StorySaturation | null> {
  if (!storySignature) return null;

  // Fetch all articles for this story in the last 7 days
  const articlesResult = await sql`
    SELECT id, title, source, source_tier, published_at, summary, content
    FROM news_articles
    WHERE story_signature = ${storySignature}
      AND published_at >= NOW() - INTERVAL '7 days'
    ORDER BY published_at DESC
  `;

  if (articlesResult.rows.length === 0) return null;

  const articles = articlesResult.rows;
  const now = Date.now();
  const sixHoursAgo = now - 6 * 3600 * 1000;
  const twelveHoursAgo = now - 12 * 3600 * 1000;
  const twentyFourHoursAgo = now - 24 * 3600 * 1000;

  // ── Volume ─────────────────────────────────────────────────────────
  let count_6h = 0, count_24h = 0;
  let count_prev_6h = 0; // 6-12h ago, for acceleration
  for (const a of articles) {
    const t = new Date(a.published_at as string).getTime();
    if (t >= sixHoursAgo) count_6h++;
    if (t >= twentyFourHoursAgo) count_24h++;
    if (t < sixHoursAgo && t >= twelveHoursAgo) count_prev_6h++;
  }
  const count_7d = articles.length;
  const velocity_6h = count_6h / 6;
  const velocity_24h = count_24h / 24;
  const prevVelocity = count_prev_6h / 6;
  const acceleration = prevVelocity > 0 ? velocity_6h / prevVelocity : (velocity_6h > 0 ? 999 : 0);

  const volume: VolumeSaturation = {
    count_6h,
    count_24h,
    count_7d,
    velocity_6h: round(velocity_6h, 2),
    velocity_24h: round(velocity_24h, 2),
    acceleration: round(acceleration, 2),
  };

  // ── Breadth ────────────────────────────────────────────────────────
  const sourceMap = new Map<string, number>(); // source -> tier
  let tier0 = 0, tier1 = 0, tier2 = 0, tier3 = 0;
  for (const a of articles) {
    const src = String(a.source || 'unknown');
    const tier = Number(a.source_tier ?? 3);
    if (!sourceMap.has(src)) {
      sourceMap.set(src, tier);
      if (tier === 0) tier0++;
      else if (tier === 1) tier1++;
      else if (tier === 2) tier2++;
      else tier3++;
    }
  }
  // Weighted score: t0 x 4 + t1 x 3 + t2 x 2 + t3 x 1, normalised so 10 distinct sources at avg tier 2 -> ~50
  const rawWeighted = tier0 * 4 + tier1 * 3 + tier2 * 2 + tier3 * 1;
  const weighted_score = Math.min(100, rawWeighted * 5);

  const breadth: BreadthSaturation = {
    distinct_sources: sourceMap.size,
    tier0_count: tier0,
    tier1_count: tier1,
    tier2_count: tier2,
    tier3_count: tier3,
    weighted_score: round(weighted_score, 1),
  };

  // ── Competitive ────────────────────────────────────────────────────
  let competitive: CompetitiveSaturation = {
    total_articles: articles.length,
    client_mentions: 0,
    client_share_pct: 0,
    competitor_mentions: {},
    client_at_risk: false,
    client_only_opportunity: false,
  };

  if (companyId) {
    const ctx = await getCompanyCompetitiveContext(companyId);
    if (ctx) {
      const clientPattern = buildNamePattern(ctx.companyName);
      const competitorPatterns: { name: string; pattern: RegExp }[] = ctx.competitors
        .filter(c => c.length >= 3)
        .map(c => ({ name: c, pattern: buildNamePattern(c) }));

      let clientMentions = 0;
      const compMentions: Record<string, number> = {};
      for (const a of articles) {
        const haystack = `${a.title || ''} ${a.summary || ''} ${(a.content || '').slice(0, 2000)}`;
        if (clientPattern.test(haystack)) clientMentions++;
        for (const cp of competitorPatterns) {
          if (cp.pattern.test(haystack)) {
            compMentions[cp.name] = (compMentions[cp.name] || 0) + 1;
          }
        }
      }
      const competitorTotal = Object.values(compMentions).reduce((a, b) => a + b, 0);
      const sharePct = articles.length > 0 ? (clientMentions / articles.length) * 100 : 0;

      competitive = {
        total_articles: articles.length,
        client_mentions: clientMentions,
        client_share_pct: round(sharePct, 1),
        competitor_mentions: compMentions,
        client_at_risk: clientMentions === 0 && competitorTotal > 0,
        client_only_opportunity: clientMentions > 0 && competitorTotal === 0,
      };
    }
  }

  // ── Phase ──────────────────────────────────────────────────────────
  const phase = classifyPhase(volume);

  // ── Composite score ───────────────────────────────────────────────
  // Volume component: log-scaled to handle viral stories without saturating
  const volumeComponent = Math.min(100, Math.log10(count_24h + 1) * 40);
  const breadthComponent = breadth.weighted_score;
  const competitiveComponent = companyId
    ? (competitive.client_at_risk ? 80 : competitive.client_only_opportunity ? 100 : 50)
    : 50;
  const composite =
    volumeComponent * weights.volume +
    breadthComponent * weights.breadth +
    competitiveComponent * weights.competitive;

  // ── Alert thresholds ──────────────────────────────────────────────
  let triggered = false;
  let alertReason: string | undefined;
  if (count_24h >= SPIKE_24H_THRESHOLD) {
    triggered = true;
    alertReason = `${count_24h} mentions in 24h crossed saturation threshold`;
  } else if (acceleration >= ACCELERATION_THRESHOLD && count_6h >= 4) {
    triggered = true;
    alertReason = `${acceleration.toFixed(1)}x acceleration in 6h (${count_6h} mentions)`;
  } else if (competitive.client_at_risk && count_24h >= 5) {
    triggered = true;
    alertReason = `Competitors visible in story but you are not`;
  }

  return {
    story_signature: storySignature,
    sample_title: String(articles[0].title || ''),
    phase,
    volume,
    breadth,
    competitive,
    composite_score: round(composite, 1),
    triggered_alert: triggered,
    alert_reason: alertReason,
  };
}

/**
 * List the top N most saturated stories for a company in the last `windowHours`.
 * Used by the Today dashboard and the spike alert cron.
 */
export async function getTopSaturatedStories(
  companyId: string | undefined,
  limit = 10,
  windowHours = 24
): Promise<StorySaturation[]> {
  const result = await sql`
    SELECT story_signature, COUNT(*) as cnt, MAX(title) as sample_title
    FROM news_articles
    WHERE story_signature != ''
      AND published_at >= NOW() - INTERVAL '${windowHours.toString()} hours'::interval
    GROUP BY story_signature
    HAVING COUNT(*) >= 2
    ORDER BY cnt DESC
    LIMIT ${limit * 3}
  `;

  const stories: StorySaturation[] = [];
  for (const row of result.rows) {
    const sat = await getStorySaturation(String(row.story_signature), companyId);
    if (sat) stories.push(sat);
  }
  // Sort by composite descending, return top N
  stories.sort((a, b) => b.composite_score - a.composite_score);
  return stories.slice(0, limit);
}

/**
 * Stash the snapshot in saturation_snapshots so the Signals page can render
 * without recomputing on every load. Caller should treat as best-effort.
 */
export async function persistSnapshot(
  sat: StorySaturation,
  companyId: string | undefined
): Promise<void> {
  try {
    const id = `${sat.story_signature}_${companyId || 'global'}`;
    await sql`
      INSERT INTO saturation_snapshots (
        id, story_signature, company_id, phase,
        volume_6h, volume_24h, volume_7d,
        breadth_score, distinct_sources, tier1_sources,
        client_share_pct, composite_score, computed_at
      ) VALUES (
        ${id}, ${sat.story_signature}, ${companyId || null}, ${sat.phase},
        ${sat.volume.count_6h}, ${sat.volume.count_24h}, ${sat.volume.count_7d},
        ${sat.breadth.weighted_score}, ${sat.breadth.distinct_sources}, ${sat.breadth.tier1_count + sat.breadth.tier0_count},
        ${sat.competitive.client_share_pct}, ${sat.composite_score}, NOW()
      )
      ON CONFLICT (story_signature, company_id) DO UPDATE SET
        phase = EXCLUDED.phase,
        volume_6h = EXCLUDED.volume_6h,
        volume_24h = EXCLUDED.volume_24h,
        volume_7d = EXCLUDED.volume_7d,
        breadth_score = EXCLUDED.breadth_score,
        distinct_sources = EXCLUDED.distinct_sources,
        tier1_sources = EXCLUDED.tier1_sources,
        client_share_pct = EXCLUDED.client_share_pct,
        composite_score = EXCLUDED.composite_score,
        computed_at = NOW()
    `;
  } catch (err) {
    console.error('persistSnapshot failed:', err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function classifyPhase(v: VolumeSaturation): SaturationPhase {
  if (v.count_24h === 0) return 'inactive';
  // If recent velocity is much higher than 24h average, story is emerging
  if (v.velocity_24h > 0 && v.velocity_6h / v.velocity_24h >= PHASE_EMERGING_RATIO && v.count_6h >= 3) {
    return 'emerging';
  }
  // If recent velocity has dropped well below the 24h average, story is fading
  if (v.velocity_24h > 0 && v.velocity_6h / v.velocity_24h <= PHASE_FADING_RATIO) {
    return 'fading';
  }
  return 'peaking';
}

interface CompetitiveContext {
  companyName: string;
  competitors: string[];
}

async function getCompanyCompetitiveContext(companyId: string): Promise<CompetitiveContext | null> {
  try {
    const companyResult = await sql`SELECT name FROM companies WHERE id = ${companyId}`;
    const company = companyResult.rows[0];
    if (!company) return null;

    const bibleResult = await sql`
      SELECT competitors FROM messaging_bibles WHERE company_id = ${companyId} ORDER BY updated_at DESC LIMIT 1
    `;
    let competitors: string[] = [];
    const raw = bibleResult.rows[0]?.competitors;
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          competitors = parsed.map(c => typeof c === 'string' ? c : (c?.name || '')).filter(Boolean);
        }
      } catch {
        // raw was a string list -- best effort
      }
    }
    return { companyName: String(company.name), competitors };
  } catch {
    return null;
  }
}

/**
 * Word-boundary regex for a brand name. Escapes regex chars and matches as a whole word
 * (case-insensitive) to avoid partial matches like "AIA" inside "AIA Group" matching "aia".
 */
function buildNamePattern(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

function round(n: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(n * factor) / factor;
}

export const SATURATION_THRESHOLDS = {
  spike24h: SPIKE_24H_THRESHOLD,
  acceleration: ACCELERATION_THRESHOLD,
  fading: PHASE_FADING_RATIO,
  emerging: PHASE_EMERGING_RATIO,
};
