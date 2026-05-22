/**
 * Deterministic evidence-threshold rules for conversation status assignment.
 *
 * Previously these rules lived inside the Claude prompt for the conversation
 * interpreter — we asked the LLM to apply them and trusted it. That worked
 * "usually" but wasn't auditable: a customer asking "why is this Forming?"
 * couldn't be answered with proof.
 *
 * Now Claude only produces the *facts* about a conversation (which articles,
 * which sources, what kind). This file applies the rules to those facts and
 * returns a status that is:
 *   - Deterministic — same inputs always produce the same output.
 *   - Auditable — every status has an explanation string that names the
 *     specific rule it matched.
 *
 * Spec source: the Market View logic the user pasted on 2026-05-20 (see
 * conversation history). Update SOURCE_WEIGHTS and the threshold functions
 * if the spec evolves.
 */

// ─── Source weighting ──────────────────────────────────────────────────────

/**
 * Tier of a single source. Used to weight conversation evidence so that
 * 3 supermarket-tier blog posts can't promote a conversation to "Forming",
 * but 1 PRA consultation + 1 Insurance Insider analysis can.
 */
export type SourceTier =
  | 'official'         // PRA, FCA, NAIC, Bank of England, Lloyd's, regulators
  | 'market_infra'     // Aon, Guy Carpenter, Munich Re, Swiss Re — market makers
  | 'premium_trade'    // Insurance Insider, Reinsurance News deep analysis
  | 'trade_press'      // Insurance Times, Insurance Business UK, news-style
  | 'legal_regulatory' // law firm commentary, regulatory deep-reads
  | 'event'            // Monte Carlo, Baden-Baden, Rendez-Vous agendas
  | 'press_release'    // PR Newswire, BusinessWire, vendor announcements
  | 'syndication'      // low-quality re-publishers
  | 'excluded';        // competitor blogs, vendor blogs — discarded entirely

/**
 * Numeric weight per tier. Used when we need a single "weighted source count"
 * — we sum the weights of the sources backing a conversation. A conversation
 * with one official source (weight 4) is "stronger" than three press-release
 * sources (weight 1 each = 3).
 */
export const TIER_WEIGHT: Record<SourceTier, number> = {
  official: 4,
  market_infra: 4,
  premium_trade: 3,
  trade_press: 2,
  legal_regulatory: 2,
  event: 1.5,
  press_release: 1,
  syndication: 0.5,
  excluded: 0,
};

/**
 * Source-name → tier mapping. Anything not listed defaults to 'trade_press'
 * (the safest middle assumption). Add new sources here as we add them.
 * Keys are matched case-insensitively against the article's `source` field.
 */
const SOURCE_TIER_MAP: Record<string, SourceTier> = {
  // ─── Official / regulatory ─────────────────────────────────────────────
  // UK
  'fca': 'official',
  'pra': 'official',
  'bank of england': 'official',
  'boe': 'official',
  'lloyd\'s': 'official',
  'lloyds': 'official',
  'lloyd\'s of london': 'official',
  // EU
  'eiopa': 'official',
  'iais': 'official',
  'european commission': 'official',
  // US
  'naic': 'official',
  'naic newsroom': 'official',
  'state dois': 'official',
  'new york department of financial services': 'official',
  'nydfs': 'official',
  'florida office of insurance regulation': 'official',
  'california department of insurance': 'official',
  'nist': 'official',
  'sec': 'official',
  // Bermuda
  'bma': 'official',
  'bermuda monetary authority': 'official',
  // ─── Market infrastructure ────────────────────────────────────────────
  // Brokers / carriers with serious research arms
  'aon': 'market_infra',
  'guy carpenter': 'market_infra',
  'gallagher re': 'market_infra',
  'howden re': 'market_infra',
  'howden': 'market_infra',
  'wtw': 'market_infra',
  'willis towers watson': 'market_infra',
  'bms': 'market_infra',
  'mcgill': 'market_infra',
  'mcgill and partners': 'market_infra',
  'munich re': 'market_infra',
  'swiss re': 'market_infra',
  'swiss re institute': 'market_infra',
  'hannover re': 'market_infra',
  'scor': 'market_infra',
  'lloyd\'s market association': 'market_infra',
  'iua': 'market_infra',
  // ─── Premium trade press ──────────────────────────────────────────────
  'insurance insider': 'premium_trade',
  'the insurer': 'premium_trade',
  'reinsurance news': 'premium_trade',
  'artemis': 'premium_trade',
  's&p global market intelligence': 'premium_trade',
  's&p market intelligence': 'premium_trade',
  // ─── Trade press ──────────────────────────────────────────────────────
  'insurance times': 'trade_press',
  'insurance business uk': 'trade_press',
  'insurance business america': 'trade_press',
  'insurance business': 'trade_press',
  'insurance journal': 'trade_press',
  'insurance day': 'trade_press',
  'business insurance': 'trade_press',
  'commercial risk': 'trade_press',
  'coverager': 'trade_press',
  'insurtech news': 'trade_press',
  // ─── Legal / regulatory commentary ────────────────────────────────────
  'lexology': 'legal_regulatory',
  'law360': 'legal_regulatory',
  'mondaq': 'legal_regulatory',
  // ─── Event / agenda sources ───────────────────────────────────────────
  'monte carlo rendez-vous': 'event',
  'baden-baden': 'event',
  'baden baden': 'event',
  'rvs': 'event',
  'itc vegas': 'event',
  // ─── Press releases ───────────────────────────────────────────────────
  'pr newswire': 'press_release',
  'businesswire': 'press_release',
  'business wire': 'press_release',
  'globenewswire': 'press_release',
};

export function tierFor(sourceName: string | undefined | null): SourceTier {
  if (!sourceName) return 'trade_press';
  const key = sourceName.trim().toLowerCase();
  return SOURCE_TIER_MAP[key] ?? 'trade_press';
}

// ─── Aggregated evidence ──────────────────────────────────────────────────

export interface EvidenceItem {
  /** Source name as it appears on news_articles.source */
  source: string;
  /** Role of this item in the cluster: primary / supporting / tangential */
  role?: 'primary' | 'supporting' | 'tangential';
}

export interface EvidenceSummary {
  /** Total number of items in the cluster */
  itemCount: number;
  /** Distinct source-names in the cluster */
  distinctSources: number;
  /** Distinct source tiers represented (e.g. 2 if both official + trade press) */
  distinctTierCount: number;
  /** Has at least one source classified as official/regulatory */
  hasOfficial: boolean;
  /** Has at least one source classified as market_infrastructure */
  hasMarketInfra: boolean;
  /** Weighted sum of source-tier scores, deduped by source name */
  weightedSourceScore: number;
  /** Number of independent credible sources (premium_trade + trade_press + market_infra, dedup by name) */
  independentCredibleSources: number;
  /** Tier breakdown for the explanation string */
  tierCounts: Record<SourceTier, number>;
  /** Number of "analysis pieces" — items from premium_trade, legal_regulatory,
   *  or market_infra tiers. The spec wants this surfaced on the card as
   *  "14 items · 8 sources · 3 analysis pieces" because three substantive
   *  analyses beat thirty syndicated wire copies. */
  analysisPieces: number;
}

export function summariseEvidence(items: EvidenceItem[]): EvidenceSummary {
  const seenSources = new Set<string>();
  const tierCounts: Record<SourceTier, number> = {
    official: 0, market_infra: 0, premium_trade: 0, trade_press: 0,
    legal_regulatory: 0, event: 0, press_release: 0, syndication: 0, excluded: 0,
  };
  let weightedSourceScore = 0;
  // Analysis pieces counts ITEMS, not distinct sources — a Lloyd's report and
  // a follow-up Lloyd's analyst note each count separately because each is
  // substantive analysis.
  let analysisPieces = 0;

  for (const item of items) {
    const tier = tierFor(item.source);
    if (tier === 'excluded') continue;
    if (tier === 'premium_trade' || tier === 'legal_regulatory' || tier === 'market_infra') {
      analysisPieces += 1;
    }
    const key = item.source.trim().toLowerCase();
    if (!seenSources.has(key)) {
      seenSources.add(key);
      tierCounts[tier] += 1;
      weightedSourceScore += TIER_WEIGHT[tier];
    }
  }

  const distinctTierCount = (Object.values(tierCounts) as number[]).filter((c) => c > 0).length;
  const independentCredibleSources =
    tierCounts.premium_trade + tierCounts.trade_press + tierCounts.market_infra;

  return {
    itemCount: items.length,
    distinctSources: seenSources.size,
    distinctTierCount,
    hasOfficial: tierCounts.official > 0,
    hasMarketInfra: tierCounts.market_infra > 0,
    weightedSourceScore,
    independentCredibleSources,
    tierCounts,
    analysisPieces,
  };
}

// ─── Evidence-level + status decision ─────────────────────────────────────

/**
 * Coarse evidence level — how strong the proof for this conversation is.
 * Drives the recommended display status but is also useful as a UI label
 * separate from status (a conversation can be "Forming" but the user has
 * still chosen to ignore it).
 */
export type EvidenceLevel =
  | 'tracked'    // 1 official source standing alone — record it but don't promote
  | 'emerging'   // ≥2 independent credible sources OR 1 official + 1 supporting
  | 'forming'    // ≥3 independent credible sources OR 2 independent + 1 official
  | 'established'; // 4+ items, 3+ distinct sources, 2+ tiers — solid coverage

export interface EvidenceDecision {
  level: EvidenceLevel;
  /** Explanation that names which threshold rule fired. */
  explanation: string;
  /** Whether this conversation meets the "high influence" criteria (4+ items,
   *  3+ sources, 2+ tiers, plus high company relevance — relevance is checked
   *  by the caller since it's not in the evidence summary). */
  meetsHighInfluence: boolean;
}

export function decideEvidenceLevel(summary: EvidenceSummary): EvidenceDecision {
  const meetsHighInfluence =
    summary.itemCount >= 4 &&
    summary.distinctSources >= 3 &&
    summary.distinctTierCount >= 2;

  // Established — strongest tier. 4+ items, 3+ sources, 2+ tiers.
  if (meetsHighInfluence) {
    return {
      level: 'established',
      explanation: `${summary.itemCount} items across ${summary.distinctSources} sources in ${summary.distinctTierCount} tiers — solid coverage.`,
      meetsHighInfluence,
    };
  }

  // Forming — 3+ independent credible sources OR 2 independent + 1 official.
  if (summary.independentCredibleSources >= 3) {
    return {
      level: 'forming',
      explanation: `${summary.independentCredibleSources} independent credible sources — conversation is forming.`,
      meetsHighInfluence: false,
    };
  }
  if (summary.independentCredibleSources >= 2 && summary.hasOfficial) {
    return {
      level: 'forming',
      explanation: `${summary.independentCredibleSources} credible sources plus an official source — conversation is forming.`,
      meetsHighInfluence: false,
    };
  }

  // Emerging — 2 independent credible sources OR 1 official + 1 supporting.
  if (summary.independentCredibleSources >= 2) {
    return {
      level: 'emerging',
      explanation: `${summary.independentCredibleSources} independent credible sources — emerging story.`,
      meetsHighInfluence: false,
    };
  }
  if (summary.hasOfficial && summary.itemCount >= 2) {
    return {
      level: 'emerging',
      explanation: 'One official source plus supporting coverage — emerging story.',
      meetsHighInfluence: false,
    };
  }

  // Tracked — only one official source standing alone, or a single trade item.
  return {
    level: 'tracked',
    explanation: summary.hasOfficial
      ? 'One official source standing alone — tracking until corroboration arrives.'
      : `Only ${summary.itemCount} item${summary.itemCount === 1 ? '' : 's'} from ${summary.distinctSources} source${summary.distinctSources === 1 ? '' : 's'} — tracking but evidence is thin.`,
    meetsHighInfluence: false,
  };
}

// ─── View status decision ──────────────────────────────────────────────────

/**
 * The four view statuses currently stored in market_conversations.view_status.
 *
 * Spec (cofounder's Market View v2, 2026-05-22):
 *   - included_in_brief — shaped the current Market Brief.
 *   - needs_review      — signal may matter, confidence limited or judgement
 *                         needed. ('action_recommended' was renamed to this
 *                         per the spec; Market View must not surface action
 *                         language.)
 *   - monitor_only      — visible but not currently worth acting on
 *                         (saturated / low relevance / low actionability).
 *   - tracked_not_prioritised — relevant enough to track but evidence is
 *                               still forming. UI label: "Watching".
 *   - (ignored)         — derived from the archived flag, not a fifth value.
 */
export type ViewStatus =
  | 'included_in_brief'
  | 'needs_review'
  | 'monitor_only'
  | 'tracked_not_prioritised';

export interface StatusInput {
  evidence: EvidenceSummary;
  /** Claude-produced company relevance score for this conversation, 0-10. */
  companyRelevanceValue: number;
  /** Claude-produced momentum label (e.g. "rising", "stable", "fading"). */
  momentumLabel: string;
  /** Claude-produced saturation label (e.g. "low", "moderate", "high"). */
  saturationLabel?: string;
  /** Claude-produced coverage-quality label (e.g. "low", "moderate", "high"). */
  coverageQualityLabel?: string;
}

export interface StatusDecision {
  status: ViewStatus;
  /** Why this status was chosen — names which gate fired. */
  explanation: string;
  /** Evidence level that was computed along the way, for the UI. */
  evidenceLevel: EvidenceLevel;
}

function labelToBucket(label?: string): 'low' | 'moderate' | 'high' {
  const l = (label || '').toLowerCase();
  if (l.includes('high') || l.includes('rising') || l.includes('accelerating')) return 'high';
  if (l.includes('low') || l.includes('fading') || l.includes('stable')) return 'low';
  return 'moderate';
}

/**
 * Pick a view status given the evidence and Claude's scoring labels.
 *
 * Implements the cofounder's Market View v2 gates (2026-05-22):
 *
 *   included_in_brief
 *     Relevance High or Critical, coverage quality Moderate+, AND at least
 *     one of: rising momentum, high attention, official source involved,
 *     strong commercial implication. (Exception: a single official source
 *     with very high relevance can be included as an "official signal".)
 *
 *   needs_review
 *     One high-authority source standalone, ambiguous evidence, or unclear
 *     company fit. ("Action recommended" is no longer a status — actions
 *     belong in Market Brief, not Market View.)
 *
 *   monitor_only
 *     2+ sources but high saturation, low actionability, or low relevance.
 *     Visible but not currently worth acting on.
 *
 *   tracked_not_prioritised  (display label: "Watching")
 *     Default: relevant enough to track, evidence is still forming.
 */
export function decideViewStatus(input: StatusInput): StatusDecision {
  const decision = decideEvidenceLevel(input.evidence);
  const momentum = labelToBucket(input.momentumLabel);
  const saturation = labelToBucket(input.saturationLabel);
  const coverage = labelToBucket(input.coverageQualityLabel);
  const relevance = input.companyRelevanceValue;

  // Spec thresholds — Relevance High = 7+, Critical = 9+, Medium = 4-6.
  const highRelevance = relevance >= 7;
  const criticalRelevance = relevance >= 9;
  const moderateOrHigherCoverage = coverage !== 'low';

  // ── Included in brief ───────────────────────────────────────────────
  // Established evidence + High/Critical relevance + Moderate+ coverage AND
  // at least one of: rising momentum, high attention, official source.
  if (
    decision.level === 'established' &&
    highRelevance &&
    moderateOrHigherCoverage &&
    (momentum === 'high' || input.evidence.hasOfficial || coverage === 'high')
  ) {
    return {
      status: 'included_in_brief',
      explanation: `${decision.explanation} High company relevance (${relevance.toFixed(1)}/10). Included in this week's brief.`,
      evidenceLevel: decision.level,
    };
  }
  // Forming evidence + Critical relevance + rising momentum.
  if (
    decision.level === 'forming' &&
    criticalRelevance &&
    momentum === 'high' &&
    moderateOrHigherCoverage
  ) {
    return {
      status: 'included_in_brief',
      explanation: `${decision.explanation} Critical company relevance (${relevance.toFixed(1)}/10) with rising momentum. Included in this week's brief.`,
      evidenceLevel: decision.level,
    };
  }
  // Exception: a single highly-relevant official source can be included as
  // an "official signal" even without supporting evidence. Spec section 4D.
  if (
    decision.level === 'tracked' &&
    input.evidence.hasOfficial &&
    criticalRelevance
  ) {
    return {
      status: 'included_in_brief',
      explanation: 'Official source standing alone with critical company relevance — included as an official signal (not yet market convergence).',
      evidenceLevel: decision.level,
    };
  }

  // ── Needs review ────────────────────────────────────────────────────
  // Single high-authority source where the rest of the market hasn't moved
  // yet, OR ambiguous evidence at meaningful relevance. The user has to
  // judge. (This used to be "Action recommended" — spec renamed it because
  // actions are not Market View's job.)
  if (decision.level === 'tracked' && input.evidence.hasOfficial && relevance >= 5) {
    return {
      status: 'needs_review',
      explanation: 'One high-authority source standing alone — worth tracking, but evidence is thin. User judgement required.',
      evidenceLevel: decision.level,
    };
  }
  if (
    (decision.level === 'forming' || decision.level === 'established') &&
    highRelevance
  ) {
    // Forming + high relevance but missing the brief-inclusion ingredients
    // (no rising momentum, no official source, soft coverage quality).
    return {
      status: 'needs_review',
      explanation: `${decision.explanation} High company relevance (${relevance.toFixed(1)}/10) but missing rising momentum / official source / strong coverage — review before promoting.`,
      evidenceLevel: decision.level,
    };
  }

  // ── Monitor only ───────────────────────────────────────────────────
  // 2+ sources but saturated, low actionability, or low relevance.
  if (
    input.evidence.distinctSources >= 2 &&
    (saturation === 'high' || relevance < 4)
  ) {
    return {
      status: 'monitor_only',
      explanation: saturation === 'high'
        ? 'Coverage is saturated — monitoring but not currently worth acting on.'
        : `Low company relevance (${relevance.toFixed(1)}/10) — monitoring only.`,
      evidenceLevel: decision.level,
    };
  }

  // ── Watching (default) ──────────────────────────────────────────────
  return {
    status: 'tracked_not_prioritised',
    explanation: decision.explanation,
    evidenceLevel: decision.level,
  };
}
