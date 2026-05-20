/**
 * Clustering engine — groups scored signal_analyses into market_conversations.
 *
 * Monitus already has the hard part: RSS ingestion, deduplication, per-article
 * Claude scoring on 8 dimensions, theme tag extraction. This module takes a
 * batch of recent signal_analyses for one company and uses a cheap Claude pass
 * to cluster them into the prototype's MarketConversation model.
 *
 * Algorithm:
 *   1. Pull recent (last 14d) signal_analyses for the company, joined with
 *      news_articles for title/source/published_at. Filter to usefulness_score >= 4
 *      or narrative_fit >= 30 — anything below is ignored at the article level
 *      and won't be promoted to a conversation.
 *   2. For signals not already attached to a conversation, ask Claude to group
 *      them into clusters by underlying story. We pass titles + theme tags +
 *      one-sentence summaries; Claude returns cluster assignments.
 *   3. For each cluster:
 *        - If a similar existing conversation exists (matched by overlap of
 *          dominant_topics / dominant_entities OR by Jaccard similarity of
 *          theme tags >= 0.5), attach new signals to it and refresh metadata.
 *        - Otherwise create a new conversation.
 *   4. Recompute dominant_topics / dominant_entities / source_mix from all
 *      attached signals.
 *
 * Cost: one Haiku call per ~25 unclustered signals. Cheap.
 *
 * The conversation_scores + conversation_interpretations passes run separately
 * (in conversation-interpreter.ts) so that re-running clustering doesn't waste
 * a Sonnet call.
 */
import Anthropic from '@anthropic-ai/sdk';
import { sql } from '@vercel/postgres';
import { getDb } from './db';
import {
  attachItemsToConversation,
  createConversation,
  type MarketConversation,
} from './market-conversations';
import { reportClaudeError } from './monitoring';
import { logClaudeUsage } from './claude-cost';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Minimum usefulness_score needed for an article to be a candidate for clustering.
const MIN_USEFULNESS = 4;
// Fallback for legacy rows: narrative_fit threshold (was the old 0-100 scale).
const MIN_NARRATIVE_FIT_LEGACY = 30;

interface UnclusteredSignal {
  signalAnalysisId: string;
  articleId: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  usefulnessScore: number;
  narrativeFit: number;
  themes: string[];
  whyItMatters: string;
}

async function fetchUnclusteredSignals(companyId: string, lookbackDays = 14): Promise<UnclusteredSignal[]> {
  const cutoff = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();
  // We filter by na.published_at (article publication) not sa.created_at
  // (when our scoring row was written). For legacy signal_analyses rows
  // that got re-scored via ON CONFLICT UPDATE, sa.created_at is months
  // old but the underlying article is recent — using sa.created_at would
  // make those invisible to clustering. published_at is the right
  // semantic anchor.
  const r = await sql`
    SELECT sa.id          AS signal_analysis_id,
           sa.article_id  AS article_id,
           sa.usefulness_score,
           sa.narrative_fit,
           sa.themes,
           sa.why_it_matters,
           na.title,
           na.summary,
           na.source,
           na.published_at
    FROM signal_analyses sa
    JOIN news_articles na ON na.id = sa.article_id
    WHERE sa.company_id = ${companyId}
      AND na.published_at >= ${cutoff}
      AND (sa.usefulness_score IS NULL OR sa.usefulness_score >= ${MIN_USEFULNESS}
           OR sa.narrative_fit >= ${MIN_NARRATIVE_FIT_LEGACY})
      AND NOT EXISTS (
        SELECT 1 FROM conversation_items ci WHERE ci.signal_analysis_id = sa.id
      )
    ORDER BY na.published_at DESC
    LIMIT 60
  `;

  return r.rows.map(row => ({
    signalAnalysisId: String(row.signal_analysis_id),
    articleId: String(row.article_id),
    title: String(row.title || ''),
    summary: String(row.summary || ''),
    source: String(row.source || ''),
    publishedAt: row.published_at ? new Date(row.published_at as string) : new Date(),
    usefulnessScore: Number(row.usefulness_score || 0),
    narrativeFit: Number(row.narrative_fit || 0),
    themes: (() => {
      try {
        const parsed = JSON.parse(String(row.themes || '[]'));
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    })(),
    whyItMatters: String(row.why_it_matters || ''),
  }));
}

interface ClaudeCluster {
  cluster_id: string;
  title: string;
  summary: string;
  dominant_topics: string[];
  dominant_entities: string[];
  signal_indices: number[];
}

async function clusterWithClaude(signals: UnclusteredSignal[], companyId?: string): Promise<ClaudeCluster[]> {
  if (!anthropic || signals.length === 0) return [];

  // Compact representation — Claude doesn't need full article bodies.
  const signalLines = signals.map((s, i) => {
    const themes = s.themes.slice(0, 4).join(', ');
    return `[${i}] "${s.title}" (${s.source}, ${s.publishedAt.toISOString().slice(0, 10)}). Themes: ${themes}. ${s.whyItMatters.slice(0, 200)}`;
  }).join('\n');

  const prompt = `You are clustering insurance/insurtech market news into conversations. A "conversation" is one underlying market story — multiple articles can be in the same conversation even if they have different angles or sources, as long as they're about the same development.

GROUP these ${signals.length} signals into 3-12 distinct conversations. Be generous with grouping — if three articles are about Lloyd's Q1 results from different sources, they're one conversation.

Signals:
${signalLines}

Return ONLY valid JSON (no markdown, no code fences) as an array of clusters:
[
  {
    "cluster_id": "stable-slug-id (lowercase-with-hyphens, 2-5 words)",
    "title": "Compelling title for the conversation, 60-90 chars",
    "summary": "1-2 sentences describing what the conversation is about",
    "dominant_topics": ["theme tag", "theme tag", "theme tag"],
    "dominant_entities": ["company/regulator/person if mentioned", "..."],
    "signal_indices": [0, 3, 5]
  }
]

Rules:
- Every signal index must appear in exactly one cluster.
- Cluster IDs must be unique within the response.
- If a signal is genuinely standalone (no overlap with anything else), it gets its own single-signal cluster.
- Do NOT use generic titles like "Insurance Market Update" — use specific titles that describe the story.`;

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });
    void logClaudeUsage(resp, { route: 'clustering.cluster', companyId });
    const text = resp.content[0]?.type === 'text' ? resp.content[0].text : '[]';
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((c: any) => c && Array.isArray(c.signal_indices) && c.title)
      .map((c: any) => ({
        cluster_id: String(c.cluster_id || '').slice(0, 80),
        title: String(c.title).slice(0, 200),
        summary: String(c.summary || '').slice(0, 1000),
        dominant_topics: Array.isArray(c.dominant_topics) ? c.dominant_topics.map(String).slice(0, 8) : [],
        dominant_entities: Array.isArray(c.dominant_entities) ? c.dominant_entities.map(String).slice(0, 8) : [],
        signal_indices: c.signal_indices.filter((i: unknown) => typeof i === 'number' && i >= 0 && i < signals.length),
      }));
  } catch (err) {
    console.error('[clustering] Claude clustering failed:', err);
    void reportClaudeError(err, 'clustering.clusterWithClaude');
    return [];
  }
}

interface ExistingConversationLite {
  id: string;
  title: string;
  dominantTopics: string[];
  dominantEntities: string[];
}

async function fetchOpenConversations(companyId: string, lookbackDays = 30): Promise<ExistingConversationLite[]> {
  const cutoff = new Date(Date.now() - lookbackDays * 86_400_000).toISOString();
  const r = await sql`
    SELECT id, title, dominant_topics, dominant_entities
    FROM market_conversations
    WHERE company_id = ${companyId}
      AND archived = false
      AND latest_coverage_at >= ${cutoff}
  `;
  return r.rows.map(row => ({
    id: String(row.id),
    title: String(row.title),
    dominantTopics: (() => { try { return JSON.parse(String(row.dominant_topics || '[]')); } catch { return []; } })(),
    dominantEntities: (() => { try { return JSON.parse(String(row.dominant_entities || '[]')); } catch { return []; } })(),
  }));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const sa = new Set(a.map(s => s.toLowerCase().trim()).filter(Boolean));
  const sb = new Set(b.map(s => s.toLowerCase().trim()).filter(Boolean));
  if (sa.size === 0 && sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function findMatchingExistingConversation(
  cluster: ClaudeCluster,
  existing: ExistingConversationLite[],
): ExistingConversationLite | null {
  const SIMILARITY_THRESHOLD = 0.5;
  let bestMatch: ExistingConversationLite | null = null;
  let bestScore = SIMILARITY_THRESHOLD;
  for (const conv of existing) {
    const topicSim = jaccardSimilarity(cluster.dominant_topics, conv.dominantTopics);
    const entitySim = jaccardSimilarity(cluster.dominant_entities, conv.dominantEntities);
    // Weighted: topics dominate, entities tie-break.
    const combined = topicSim * 0.7 + entitySim * 0.3;
    if (combined > bestScore) {
      bestScore = combined;
      bestMatch = conv;
    }
  }
  return bestMatch;
}

function buildSourceMix(signals: UnclusteredSignal[]): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const s of signals) {
    if (s.source) mix[s.source] = (mix[s.source] || 0) + 1;
  }
  return mix;
}

/**
 * Main entry point — runs the clustering pass for one company.
 * Returns the IDs of conversations that were created or updated.
 *
 * lookbackDays defaults to 14 (right for the incremental news cron path).
 * Pass 30+ for first-time backfill where you want to grab older articles too.
 */
export async function runClusteringPass(companyId: string, lookbackDays: number = 14): Promise<{
  created: number;
  updated: number;
  signalsClustered: number;
}> {
  await getDb();

  const unclustered = await fetchUnclusteredSignals(companyId, lookbackDays);
  if (unclustered.length === 0) {
    return { created: 0, updated: 0, signalsClustered: 0 };
  }

  const clusters = await clusterWithClaude(unclustered, companyId);
  if (clusters.length === 0) {
    return { created: 0, updated: 0, signalsClustered: 0 };
  }

  const existing = await fetchOpenConversations(companyId);
  let created = 0;
  let updated = 0;
  let signalsClustered = 0;

  for (const cluster of clusters) {
    const clusterSignals = cluster.signal_indices
      .map(i => unclustered[i])
      .filter(Boolean);
    if (clusterSignals.length === 0) continue;

    const match = findMatchingExistingConversation(cluster, existing);
    let conversationId: string;
    const latestCoverageAt = clusterSignals.reduce(
      (max, s) => (s.publishedAt > max ? s.publishedAt : max),
      clusterSignals[0].publishedAt,
    );

    if (match) {
      // Update existing — keep title, refresh metadata, merge dominant topics
      conversationId = match.id;
      const mergedTopics = Array.from(
        new Set([...match.dominantTopics, ...cluster.dominant_topics].map(t => t.toLowerCase().trim())),
      ).slice(0, 10);
      const mergedEntities = Array.from(
        new Set([...match.dominantEntities, ...cluster.dominant_entities].map(t => t.trim())),
      ).slice(0, 10);
      const sourceMix = buildSourceMix(clusterSignals);
      await sql`
        UPDATE market_conversations
        SET latest_coverage_at = ${latestCoverageAt.toISOString()},
            dominant_topics = ${JSON.stringify(mergedTopics)},
            dominant_entities = ${JSON.stringify(mergedEntities)},
            source_mix = ${JSON.stringify(sourceMix)},
            updated_at = NOW()
        WHERE id = ${match.id}
      `;
      updated++;
    } else {
      // Create new conversation
      conversationId = await createConversation({
        companyId,
        title: cluster.title,
        summary: cluster.summary,
        dominantEntities: cluster.dominant_entities,
        dominantTopics: cluster.dominant_topics,
        confidence: 0.6, // Default; interpretation pass refines this
        viewStatus: 'tracked_not_prioritised',
        firstDetectedAt: clusterSignals.reduce(
          (min, s) => (s.publishedAt < min ? s.publishedAt : min),
          clusterSignals[0].publishedAt,
        ),
        latestCoverageAt,
        sourceMix: buildSourceMix(clusterSignals),
      });
      created++;
    }

    await attachItemsToConversation(
      conversationId,
      clusterSignals.map((s, idx) => ({
        signalAnalysisId: s.signalAnalysisId,
        articleId: s.articleId,
        role: idx === 0 ? 'primary' : 'supporting',
        relevanceToCluster: Math.max(s.usefulnessScore / 10, s.narrativeFit / 100),
      })),
    );
    signalsClustered += clusterSignals.length;
  }

  return { created, updated, signalsClustered };
}
