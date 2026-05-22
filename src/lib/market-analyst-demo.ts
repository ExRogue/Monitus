/**
 * Demo adapter — bridges the prototype's Supercede dataset (in
 * `market-analyst-demo-source.ts`) into Monitus's first-class types so the
 * Market Brief / Market View / Company Profile / Conversation Detail pages
 * can render a full demo when companyId === 'demo'.
 *
 * Activation: every Market Analyst API route checks `companyId === 'demo'`
 * before hitting the database, and returns these adapted demo objects instead.
 * No DB read, no Claude call. Safe for sales demos and marketing live previews.
 */
import type { CompanyProfile } from './company-profile';
import type {
  MarketConversation,
  ConversationScores,
  ConversationInterpretation,
  ConversationViewStatus,
} from './market-conversations';
import type {
  MarketBrief,
  MarketRead,
  CommercialImplications,
  MarketBriefScanStats,
} from './market-brief';
import type { RecommendedAction } from './recommended-actions';
import {
  DEMO_COMPANY_PROFILE as DEMO_CP_SOURCE,
  DEMO_CONVERSATIONS as DEMO_CONVS_SOURCE,
  type MarketConversationData,
  type ConversationScoreData,
  type ConversationInterpretationData,
} from './market-analyst-demo-source';

export const DEMO_COMPANY_ID = 'demo';

function adaptScores(s?: ConversationScoreData): ConversationScores | undefined {
  if (!s) return undefined;
  return {
    marketAttention: s.marketAttention,
    momentum: s.momentum,
    saturation: s.saturation,
    coverageQuality: s.coverageQuality,
    companyRelevance: s.companyRelevance,
  };
}

function adaptInterpretation(i?: ConversationInterpretationData): ConversationInterpretation | undefined {
  if (!i) return undefined;
  return {
    executiveSummary: i.executiveSummary,
    whatChanged: i.whatChanged,
    whatMarketIsSaying: i.whatMarketIsSaying,
    whatIsMissing: i.whatIsMissing,
    whyThisMatters: i.whyThisMatters,
    whyIncluded: i.whyIncluded,
    confidenceLevel: i.confidenceLevel,
    confidenceReason: i.confidenceReason,
    narrativeFit: i.narrativeFit,
    commercialImplications: i.commercialImplications,
    recommendedNextMove: i.recommendedNextMove,
    recommendedActions: i.recommendedActions,
    risksOrLimitations: i.risksOrLimitations,
    sourceCitations: i.sourceCitations,
  };
}

function adaptConversation(c: MarketConversationData): MarketConversation {
  const sourceMix: Record<string, number> = {};
  if (c.sourceMix) {
    for (const [k, v] of Object.entries(c.sourceMix)) {
      sourceMix[k] = typeof v === 'number' ? v : Number(v) || 0;
    }
  }
  return {
    id: c.id || '',
    companyId: DEMO_COMPANY_ID,
    title: c.title,
    summary: c.summary || '',
    firstDetectedAt: c.firstDetectedAt ? new Date(c.firstDetectedAt).toISOString() : '',
    latestCoverageAt: c.latestCoverageAt ? new Date(c.latestCoverageAt).toISOString() : '',
    sourceMix,
    dominantEntities: c.dominantEntities || [],
    dominantTopics: c.dominantTopics || [],
    angleMap: c.angleMap || [],
    confidence: c.confidence ?? 0,
    isDemo: true,
    viewStatus: (c.viewStatus || 'tracked_not_prioritised') as ConversationViewStatus,
    marketSignal: c.marketSignal || '',
    whyItIsHere: c.whyItIsHere || '',
    suggestedUse: c.suggestedUse || [],
    archived: false,
    isFollowed: false,
    score: adaptScores(c.score),
    interpretation: adaptInterpretation(c.interpretation),
    evidenceSummary: c.evidenceSummary,
    items: (c.items || []).map(item => ({
      signalAnalysisId: `demo-sa-${item.title.slice(0, 30)}`,
      articleId: `demo-art-${item.title.slice(0, 30)}`,
      role: 'supporting',
      relevanceToCluster: item.relevanceScore || 0.7,
      title: item.title,
      source: item.sourceName || '',
      sourceUrl: item.url,
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : undefined,
      snippet: (item.snippet || '').slice(0, 300),
    })),
  };
}

export function getDemoCompanyProfile(): CompanyProfile {
  const p = DEMO_CP_SOURCE;
  return {
    id: 'demo-profile',
    companyId: DEMO_COMPANY_ID,
    category: p.category || '',
    oneLineDescription: p.oneLineDescription || '',
    productDescription: p.productDescription || '',
    targetMarkets: p.targetMarkets,
    targetGeographies: p.targetGeographies,
    targetCustomers: p.targetCustomers,
    buyerPersonas: p.buyerPersonas,
    products: p.products,
    workflows: p.workflows,
    coreNarrative: p.coreNarrative || '',
    enemyProblemFrame: p.enemyProblemFrame || '',
    categoryLanguage: p.categoryLanguage || '',
    differentiation: p.differentiation,
    proofPoints: p.proofPoints,
    claimsMade: p.claimsMade,
    claimsAvoided: p.claimsAvoided,
    likelyObjections: p.likelyObjections,
    commercialHooks: p.commercialHooks,
    priorityTopics: p.priorityTopics,
    excludedTopics: p.excludedTopics,
    insuranceSegments: p.insuranceSegments,
    regulatoryAreas: p.regulatoryAreas,
    namedCustomers: p.namedCustomers,
    namedPartners: p.namedPartners,
    confidence: p.confidence,
    sourceSummary: p.sourceSummary,
    scanDate: p.scanDate ? new Date(p.scanDate).toISOString() : null,
    updatedAt: new Date().toISOString(),
  };
}

export function getDemoConversations(): MarketConversation[] {
  return DEMO_CONVS_SOURCE.map(adaptConversation);
}

export function getDemoConversation(conversationId: string): MarketConversation | null {
  const match = DEMO_CONVS_SOURCE.find(c => c.id === conversationId);
  return match ? adaptConversation(match) : null;
}

function buildDemoActions(): RecommendedAction[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'demo-act-1',
      companyId: DEMO_COMPANY_ID,
      marketBriefId: 'demo-brief',
      conversationId: 'demo-conv-data-quality',
      title: 'Commission a primary research report on reinsurance data quality',
      description: 'Position Supercede as the authoritative voice on the problem it solves. Use the PRA consultation as a timing hook. Target Insurance Insider or The Insurer for distribution.',
      category: 'pr',
      priority: 'high',
      urgency: 'now',
      status: 'not_started',
      ownerUserId: null,
      dueDate: null,
      createdFrom: 'demo_seed',
      rank: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-act-2',
      companyId: DEMO_COMPANY_ID,
      marketBriefId: 'demo-brief',
      conversationId: 'demo-conv-broker-value',
      title: 'Publish founder content on what defensible broker value actually means',
      description: 'Reference the Aon survey (78% want structured placement data) and Insurance Insider fee compression piece. Practitioner-grade, not marketing copy.',
      category: 'founder_content',
      priority: 'high',
      urgency: 'this-week',
      status: 'not_started',
      ownerUserId: null,
      dueDate: null,
      createdFrom: 'demo_seed',
      rank: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-act-3',
      companyId: DEMO_COMPANY_ID,
      marketBriefId: 'demo-brief',
      conversationId: 'demo-conv-data-quality',
      title: 'Launch a Reinsurance Data Readiness Assessment campaign',
      description: 'Structured diagnostic for cedents to evaluate placement data quality against PRA expectations. 6-week campaign before consultation closes.',
      category: 'campaign',
      priority: 'high',
      urgency: 'this-week',
      status: 'not_started',
      ownerUserId: null,
      dueDate: null,
      createdFrom: 'demo_seed',
      rank: 3,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-act-4',
      companyId: DEMO_COMPANY_ID,
      marketBriefId: 'demo-brief',
      conversationId: 'demo-conv-broker-value',
      title: 'Sales: open broker discovery calls with the Aon 78% stat',
      description: '"How are you providing that structured data today?" — the gap between expectation and reality is where Supercede fits.',
      category: 'sales',
      priority: 'medium',
      urgency: 'this-week',
      status: 'not_started',
      ownerUserId: null,
      dueDate: null,
      createdFrom: 'demo_seed',
      rank: 4,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-act-5',
      companyId: DEMO_COMPANY_ID,
      marketBriefId: 'demo-brief',
      conversationId: 'demo-conv-ai-governance',
      title: 'Monitor Lloyd\'s AI governance for placement documentation requirements',
      description: 'If audit trail requirements extend to placement workflows, Supercede has a natural story to tell. Track quarterly.',
      category: 'monitor',
      priority: 'low',
      urgency: 'monitor',
      status: 'not_started',
      ownerUserId: null,
      dueDate: null,
      createdFrom: 'demo_seed',
      rank: 5,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildDemoMarketRead(): MarketRead {
  return {
    tldr: {
      headline: 'Reinsurance data quality is escalating from operational nuisance to regulatory liability — and Supercede is the operational answer.',
      whyItMatters: 'The PRA consultation gives the data-quality conversation external teeth. Combined with Swiss Re\'s systemic-risk framing and the cedent survey data, the buying context for Supercede is being built by the market itself, in real time.',
      signals: [
        'PRA consultation on reinsurance counterparty data — UK cedents now exposed',
        'Swiss Re Institute frames data quality as systemic risk, not workflow problem',
        '78% of cedents want structured placement data from brokers (Aon survey)',
        'Lloyd\'s digital-first placement guidance creates 2025 deadline pressure',
        'Insurance Insider CUO quote: "five different formats with contradictory data"',
      ],
    },
    analystRead:
      'The reinsurance data quality and broker defensibility conversations are now converging into one operating reality — placement visibility is becoming a regulatory and commercial requirement, not just an efficiency play. Supercede\'s timing is optimal: the market is articulating the problem in the same language Supercede uses for its product. The window to establish category leadership is open, and external regulatory pressure means the urgency is not something Supercede has to manufacture in the sales cycle.',
    researchBriefing: {
      analystThesis:
        'The reinsurance market is rapidly building consensus that data quality is a systemic risk requiring structured, defensible placement infrastructure. Supercede operates in the heart of that consensus.',
      whatChanged:
        'The PRA consultation gave the data-quality conversation a regulatory deadline. Cedent survey data made buyer demand concrete (78% want structured placement data). Swiss Re framed the issue as systemic risk, escalating it from ops desk to board level.',
      whatMarketIsSaying:
        'Brokers must demonstrate evidenced value, not just market access. Cedents must demonstrate real-time tracking of reinsurance counterparties. Reinsurers want better submission quality. All three demands point to the same operational gap.',
      whatIsMissing:
        'No coverage describes what operational change looks like at the placement workflow level. The market defines the problem with increasing precision but lacks examples of solutions that work at scale. Supercede has not yet inserted itself publicly into this conversation.',
      sourcePattern:
        'Cross-sector consensus from regulatory (PRA, Lloyd\'s), independent research (Swiss Re Institute), and premium trade press (Insurance Insider x2, The Insurer, Artemis) — same conclusion from different angles.',
      whyItMatters:
        'Supercede\'s commercial opportunity is being articulated, word-for-word, by the market. Inserting Supercede as the operational answer is now a question of execution, not category creation.',
      sourceEvidence: [
        { source: 'PRA', signal: 'Consultation on reinsurance counterparty data requirements', type: 'regulator' },
        { source: 'Swiss Re Institute', signal: 'Systemic risks from poor reinsurance data infrastructure', type: 'analyst' },
        { source: 'Insurance Insider', signal: '"Reinsurers losing confidence in submission quality" — direct CUO quote', type: 'trade press' },
        { source: 'Aon', signal: '78% of cedents want structured placement data from brokers', type: 'broker research' },
        { source: "Lloyd's of London", signal: 'Digital-first placement guidance — 2025 deadline', type: 'regulator' },
      ],
      confidence: 'High — multiple independent premium sources covering the same theme with consistent direction.',
      limitations: 'The brief cannot yet quantify pipeline conversion. Regulatory consultation outcomes may shift the framing. Some premium coverage is paywalled and may not reach all of Supercede\'s prospects.',
    },
  };
}

function buildDemoCommercialImplications(): CommercialImplications {
  return {
    positioning: 'Sharpen the "defensible placement infrastructure" language. Lean into the regulatory framing (PRA, Lloyd\'s) when speaking to risk and compliance audiences; lean into operational efficiency (40% manual reconciliation) for ops audiences.',
    sales: 'Open broker discovery with the Aon 78% stat. Open cedent discovery with the PRA consultation angle. Open reinsurer discovery with the Insurance Insider submission-quality quote. All three are pre-qualifying questions, not pitch deck slides.',
    content: 'Publish founder content on what defensible broker value actually means operationally. Submit a constructive response to the PRA consultation that doubles as a thought-leadership piece. Pitch Insurance Insider on a comment piece from the CEO.',
    pipeline: 'Re-engage UK cedent heads of reinsurance who paused last cycle — the PRA framing gives a new compelling event. Target CFOs and CROs at the same accounts where the buying conversation has historically been operational.',
  };
}

function buildDemoScanStats(): MarketBriefScanStats {
  return {
    sourcesScanned: 16,
    itemsReviewed: 38,
    conversationsClustered: 4,
    itemsFiltered: 21,
    confidence: 'Medium-high',
    lastScanAt: new Date().toISOString(),
    nextScanIn: '17m',
  };
}

export function getDemoMarketBrief(): MarketBrief {
  const conversations = getDemoConversations();
  // Brief includes the two top conversations (relevance/momentum-prioritised)
  const includedTitles = ['Reinsurance Data Quality and Decision Confidence', 'Broker Value Under Pressure'];
  const briefConversations = conversations.filter(c => includedTitles.includes(c.title));

  const now = new Date();
  const dow = now.getUTCDay();
  const daysToMonday = (dow + 6) % 7;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToMonday));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  return {
    id: 'demo-brief',
    companyId: DEMO_COMPANY_ID,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    marketRead: buildDemoMarketRead(),
    commercialImplications: buildDemoCommercialImplications(),
    recommendedNextMoves: buildDemoActions(),
    conversations: briefConversations,
    scanStats: buildDemoScanStats(),
    isDemo: true,
    createdAt: new Date().toISOString(),
  };
}

export function getDemoActions(): RecommendedAction[] {
  return buildDemoActions();
}
