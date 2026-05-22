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
  // Official / regulatory
  'fca': 'official',
  'pra': 'official',
  'bank of england': 'official',
  'lloyd\'s': 'official',
  'lloyds': 'official',
  'naic': 'official',
  'naic newsroom': 'official',
  'eiopa': 'official',
  'iais': 'official',
  // Market infrastructure
  'aon': 'market_infra',
  'guy carpenter': 'market_infra',
  'munich re': 'market_infra',
  'swiss re': 'market_infra',
  'swiss re institute': 'market_infra',
  'gallagher re': 'market_infra',
  'howden re': 'market_infra',
  // Premium trade press
  'insurance insider': 'premium_trade',
  'the insurer': 'premium_trade',
  'reinsurance news': 'premium_trade',
  'artemis': 'premium_trade',
  // Trade press
  'insurance times': 'trade_press',
  'insurance business uk': 'trade_press',
  'insurance journal': 'trade_press',
  'insurance day': 'trade_press',
  'business insurance': 'trade_press',
  // Legal / regulatory commentary
  'lexology': 'legal_regulatory',
  'law360': 'legal_regulatory',
  // Press releases
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
}

export function summariseEvidence(items: EvidenceItem[]): EvidenceSummary {
  const seenSources = new Set<string>();
  const tierCounts: Record<SourceTier, number> = {
    official: 0, market_infra: 0, premium_trade: 0, trade_press: 0,
    legal_regulatory: 0, event: 0, press_release: 0, syndication: 0, excluded: 0,
  };
  let weightedSourceScore = 0;

  for (const item of items) {
    const tier = tierFor(item.source);
    if (tier === 'excluded') continue;
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
 * Display labels are mapped client-side (see Market Brief / Market View pages).
 */
export type ViewStatus =
  | 'included_in_brief'
  | 'action_recommended'
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
 * Gating order (most → least selective):
 *   - included_in_brief — established evidence + high relevance + (rising
 *     momentum OR official source OR strong coverage quality)
 *   - action_recommended — forming/established + high relevance, but missing
 *     one of the brief-inclusion ingredients
 *   - monitor_only — saturated, low relevance, or limited actionability
 *   - tracked_not_prioritised — everything else (evidence is thin or relevance
 *     is low)
 */
export function decideViewStatus(input: StatusInput): StatusDecision {
  const decision = decideEvidenceLevel(input.evidence);
  const momentum = labelToBucket(input.momentumLabel);
  const saturation = labelToBucket(input.saturationLabel);
  const coverage = labelToBucket(input.coverageQualityLabel);
  const relevance = input.companyRelevanceValue;

  const highRelevance = relevance >= 7;
  const veryHighRelevance = relevance >= 8.5;

  // Included in brief — strongest gate.
  // Requires either:
  //   - Established evidence + high relevance + (rising momentum OR official source OR high coverage quality)
  //   - Forming evidence + very high relevance + rising momentum
  if (
    decision.level === 'established' &&
    highRelevance &&
    (momentum === 'high' || input.evidence.hasOfficial || coverage === 'high')
  ) {
    return {
      status: 'included_in_brief',
      explanation: `${decision.explanation} High company relevance (${relevance.toFixed(1)}/10). Included in this week's brief.`,
      evidenceLevel: decision.level,
    };
  }
  if (
    decision.level === 'forming' &&
    veryHighRelevance &&
    momentum === 'high'
  ) {
    return {
      status: 'included_in_brief',
      explanation: `${decision.explanation} Very high company relevance (${relevance.toFixed(1)}/10) with rising momentum — included in this week's brief.`,
      evidenceLevel: decision.level,
    };
  }

  // Action recommended — relevance is high but we're missing brief-inclusion
  // ingredients. Worth surfacing for user judgement.
  if (highRelevance && (decision.level === 'forming' || decision.level === 'established')) {
    return {
      status: 'action_recommended',
      explanation: `${decision.explanation} High company relevance (${relevance.toFixed(1)}/10) — flagged for review.`,
      evidenceLevel: decision.level,
    };
  }

  // Monitor only — saturated coverage or low actionability.
  if (saturation === 'high' || relevance < 4) {
    return {
      status: 'monitor_only',
      explanation: saturation === 'high'
        ? 'Coverage is saturated — monitoring but not currently worth acting on.'
        : `Low company relevance (${relevance.toFixed(1)}/10) — monitoring only.`,
      evidenceLevel: decision.level,
    };
  }

  // Default — tracked. Evidence is thin or relevance is middling.
  return {
    status: 'tracked_not_prioritised',
    explanation: decision.explanation,
    evidenceLevel: decision.level,
  };
}
