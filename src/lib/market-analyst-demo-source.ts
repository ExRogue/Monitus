/**
 * Supercede demo dataset, ported verbatim from the Market Analyst prototype.
 *
 * Loaded when companyId === 'demo' so the Market Brief / Market View / Company
 * Profile pages render with realistic insurance-industry content without
 * hitting the database or burning Claude tokens. Used for sales demos and
 * marketing-site live previews.
 *
 * Adapter to Monitus's first-class types lives in src/lib/market-analyst-demo.ts.
 * This file owns the data + the prototype's own interface shape; do not edit
 * the data here without intent.
 */

// ─── Prototype interfaces (kept local so this file stays self-contained) ───
//
// These shapes match the Market Analyst handoff types.ts. The Monitus app uses
// its own CompanyProfile / MarketConversation interfaces from company-profile.ts
// and market-conversations.ts — the adapter file converts between them.

export interface ScoreEntry {
  value: number;
  label: string;
  explanation: string;
}

export interface ConversationScoreData {
  marketAttention: ScoreEntry;
  momentum: ScoreEntry;
  saturation: ScoreEntry;
  coverageQuality: ScoreEntry;
  companyRelevance: ScoreEntry;
}

export interface ConversationInterpretationData {
  executiveSummary: string;
  whatChanged: string;
  whatMarketIsSaying: string;
  whatIsMissing: string;
  whyThisMatters: string;
  whyIncluded: string[];
  confidenceLevel: 'low' | 'moderate' | 'high';
  confidenceReason: string;
  narrativeFit: string;
  commercialImplications: string[];
  recommendedNextMove: string;
  recommendedActions: {
    Sales?: string;
    Outbound?: string;
    FounderContent?: string;
    Website?: string;
    PR?: string;
    CampaignPlanning?: string;
    PodcastWebinar?: string;
    MonitorOnly?: string;
  };
  risksOrLimitations: string[];
  sourceCitations?: string[];
}

export interface CompanyProfileData {
  id?: string;
  companyId?: string;
  category?: string;
  oneLineDescription?: string;
  productDescription?: string;
  targetMarkets: string[];
  targetGeographies: string[];
  targetCustomers: string[];
  buyerPersonas: string[];
  products: string[];
  workflows: string[];
  coreNarrative?: string;
  enemyProblemFrame?: string;
  categoryLanguage?: string;
  differentiation: string[];
  proofPoints: string[];
  claimsMade: string[];
  claimsAvoided: string[];
  likelyObjections: string[];
  commercialHooks: string[];
  priorityTopics: string[];
  excludedTopics: string[];
  insuranceSegments: string[];
  regulatoryAreas: string[];
  namedCustomers: string[];
  namedPartners: string[];
  confidence: number;
  sourceSummary: Record<string, unknown>;
  scanDate?: string | Date;
}

export type ConversationViewStatus =
  | 'included_in_brief'
  | 'action_recommended'
  | 'monitor_only'
  | 'tracked_not_prioritised';

export interface ConversationEvidenceSummary {
  itemCount: number;
  sourceCount: number;
  analysisPieces?: number;
  lastUpdated: string;
}

export interface MarketItemData {
  id?: string;
  sourceId?: string;
  title: string;
  url: string;
  canonicalUrl?: string;
  author?: string;
  publishedAt?: string | Date;
  discoveredAt?: string | Date;
  snippet?: string;
  fullText?: string;
  sourceCategory?: string;
  sourceWeight: number;
  paywallFlag: boolean;
  fetchMethod: string;
  contentHash?: string;
  language: string;
  rawMetadata?: Record<string, unknown>;
  status: string;
  topics?: string[];
  entities?: string[];
  articleType?: string;
  coverageType?: string;
  relevanceScore?: number;
  sourceName?: string;
}

export interface SourceData {
  id?: string;
  name: string;
  url: string;
  category: string;
  weight: number;
  geography?: string;
  segmentTags: string[];
  fetchMethod: string;
  priority: number;
  paywallLikelihood: string;
  rssUrl?: string;
  active?: boolean;
  fetchFrequency?: string;
}

export interface MarketConversationData {
  id?: string;
  companyId?: string;
  title: string;
  summary?: string;
  firstDetectedAt?: string | Date;
  latestCoverageAt?: string | Date;
  sourceMix?: Record<string, unknown>;
  dominantEntities?: string[];
  dominantTopics?: string[];
  angleMap?: string[];
  confidence?: number;
  isDemo?: boolean;
  items?: MarketItemData[];
  score?: ConversationScoreData;
  interpretation?: ConversationInterpretationData;
  viewStatus?: ConversationViewStatus;
  marketSignal?: string;
  whyItIsHere?: string;
  suggestedUse?: string[];
  evidenceSummary?: ConversationEvidenceSummary;
}

// ============================================================================
// DEMO COMPANY PROFILE — Supercede
// ============================================================================
export const DEMO_COMPANY_PROFILE: CompanyProfileData = {
  category: 'Reinsurance Intelligence Technology',
  oneLineDescription:
    'Supercede makes reinsurance placement visible, organised, and defensible while deals are still live.',
  productDescription:
    'Supercede is a reinsurance technology platform that digitises and structures the reinsurance placement process for brokers, cedents, and reinsurers. The platform provides live deal tracking, structured data management, and workflow tools that bring order to complex treaty and facultative placements — delivering visibility that today only exists after the deal is done.',
  targetMarkets: ['Reinsurance', 'London Market', 'Global Specialty Insurance'],
  targetGeographies: ['United Kingdom', 'Europe', 'United States', 'Bermuda'],
  targetCustomers: [
    'Reinsurance brokers',
    'Cedents (primary insurers placing reinsurance)',
    'Reinsurers',
    "Lloyd's managing agents",
    'Captive managers',
  ],
  buyerPersonas: [
    'Head of Reinsurance at a mid-sized insurer (cedent) who is accountable for placement outcomes but has limited visibility into live deals',
    'Placing broker at a global reinsurance intermediary who needs to demonstrate structured value to justify their fee',
    'Head of Reinsurance Operations at a broker who wants to reduce manual data reconciliation',
    'Chief Underwriting Officer at a reinsurer who wants better quality submissions and real-time capacity tracking',
    'CFO at a cedent who questions whether the broker fee represents fair value',
  ],
  products: [
    'Reinsurance placement platform',
    'Live deal tracking and visibility dashboard',
    'Structured data capture and submission management',
    'Capacity tracking and market indication tools',
    'Slip and document production',
    'Renewal workflow management',
    'Audit trail and defensibility reporting',
  ],
  workflows: [
    'Treaty reinsurance placement',
    'Facultative reinsurance placement',
    'Annual renewal management',
    'Mid-year amendment tracking',
    'Capacity allocation tracking',
    'Slip version control',
    'Cedent progress reporting',
  ],
  coreNarrative:
    'Supercede makes reinsurance placement visible, organised, and defensible while deals are still live.',
  enemyProblemFrame:
    'Reinsurance placement is invisible — brokers, cedents, and reinsurers lack live visibility into complex deals as they evolve, leading to errors, version control failures, defensibility gaps, and the systemic inefficiency of managing a multi-billion dollar market on spreadsheets and email.',
  categoryLanguage: 'Reinsurance intelligence technology',
  differentiation: [
    'Live deal tracking during placement, not just post-placement reporting',
    'Structured data capture that works with existing broker workflows rather than replacing them',
    'Neutral platform trusted by all three sides of the market: brokers, cedents, and reinsurers',
    'Built specifically for the complexity of reinsurance — not an insurance tool adapted for reinsurance',
    'Audit trail and defensibility tools built in from day one',
  ],
  proofPoints: [
    'Used by reinsurance brokers in the London Market',
    'Handles both treaty and facultative lines',
    'Processes billions in reinsurance premium through the platform',
    'Trusted by cedents and reinsurers as well as brokers',
  ],
  claimsMade: [
    'Makes placement visible while deals are live',
    'Reduces placement errors and version control failures',
    'Improves data quality and defensibility for all market participants',
    'Provides structured workflow without disrupting existing broker processes',
    'Enables brokers to demonstrate structured value to cedents',
  ],
  claimsAvoided: [
    'AI-powered (avoids overpromising on AI)',
    'Disrupting or replacing brokers',
    'Automating the placement process end-to-end',
    'Becoming the system of record for the entire London Market',
  ],
  likelyObjections: [
    "We already use spreadsheets and they work well enough",
    'Integration with our existing TOM and systems will be complex',
    'Our brokers will not change their workflow',
    'Data security and confidentiality concerns with a shared platform',
    "We're already committed to Lloyd's Blueprint Two tools",
  ],
  commercialHooks: [
    'Broker defensibility — demonstrating structured value to cedents who question fees',
    'Reducing errors in the placement process that cause E&O exposure',
    "Lloyd's digitalisation requirements and Blueprint Two compliance",
    'Data quality for better underwriting decisions by reinsurers',
    'Cedent oversight — giving primary insurers visibility into live deals',
    'Regulatory defensibility — maintaining audit trails for PRA and FCA inquiries',
  ],
  priorityTopics: [
    'Reinsurance placement technology and digitisation',
    'Broker value and defensibility under market pressure',
    "Lloyd's market modernisation and Blueprint Two",
    'Reinsurance data quality and submission standards',
    'Insurtech funding and B2B reinsurance technology investment',
    'AI governance in reinsurance and specialty markets',
    'Cedent-broker relationship dynamics',
    'Reinsurance market hardening and pricing',
  ],
  excludedTopics: [
    'Personal lines insurance',
    'Claims technology and claims management',
    'Consumer-facing insurtech',
    'Health insurance technology',
    'Auto insurance telematics',
  ],
  insuranceSegments: ['Reinsurance', 'London Market', 'Specialty', 'Property Catastrophe'],
  regulatoryAreas: [
    "Lloyd's Blueprint Two",
    'FCA supervision of insurance intermediaries',
    'PRA reinsurance counterparty rules',
    'EIOPA reinsurance reporting',
  ],
  namedCustomers: [],
  namedPartners: [],
  confidence: 0.88,
  sourceSummary: {
    pagesAnalysed: 9,
    primarySource: 'homepage + /about + /product + /customers',
    scanMethod: 'demo',
  },
  scanDate: new Date('2024-11-16').toISOString(),
}

// ============================================================================
// DEMO MARKET ITEMS
// ============================================================================
const now = new Date('2024-11-16')
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString()

const BROKER_VALUE_ITEMS: MarketItemData[] = [
  {
    title: 'Broker value under pressure as markets harden and clients question fees',
    url: 'https://www.insuranceinsider.com/article/broker-value-under-pressure',
    snippet:
      'Reinsurance brokers are facing mounting pressure to demonstrate clear value as cedents question the fees they pay amid a hardening market. The debate around broker defensibility has intensified as data and analytics capabilities are increasingly seen as table stakes, not differentiators.',
    publishedAt: daysAgo(3),
    discoveredAt: daysAgo(1),
    sourceCategory: 'trade_press',
    sourceWeight: 1.0,
    paywallFlag: true,
    fetchMethod: 'search',
    language: 'en',
    status: 'raw',
    sourceName: 'Insurance Insider',
    topics: ['broker value', 'reinsurance', 'market hardening', 'fees'],
  },
  {
    title: 'How brokers are fighting back against disintermediation threats',
    url: 'https://www.theinsurer.com/brokers-fight-disintermediation',
    snippet:
      'Major brokers are investing heavily in proprietary data platforms to ward off threats of disintermediation. The race to build tech-enabled placement capabilities is reshaping the competitive dynamics of the London Market as cedents ask harder questions about what they are paying for.',
    publishedAt: daysAgo(5),
    discoveredAt: daysAgo(2),
    sourceCategory: 'trade_press',
    sourceWeight: 1.0,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'The Insurer',
    topics: ['broker value', 'disintermediation', 'technology', 'data platforms'],
  },
  {
    title: 'Willis Re chief on broker value proposition in the digital age',
    url: 'https://www.reinsurancene.ws/willis-re-broker-value',
    snippet:
      'The head of Willis Re argues that brokers who can combine market access with structured data and analytics will be the ones that survive the next decade. Those relying on relationships alone face an existential challenge as cedents increasingly demand evidence of value delivered, not just access to capacity.',
    publishedAt: daysAgo(8),
    discoveredAt: daysAgo(3),
    sourceCategory: 'trade_press',
    sourceWeight: 0.9,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Reinsurance News',
    topics: ['broker value', 'data analytics', 'reinsurance', 'digital'],
  },
  {
    title: 'Cedent views on reinsurance broker value: survey results 2024',
    url: 'https://www.intelligentinsurer.com/cedent-survey-broker-value',
    snippet:
      'A survey of 200 cedents reveals that 67% believe their reinsurance broker adds clear value, but 41% say they could place some business direct if the technology existed. The findings raise fundamental questions about the long-term sustainability of fee-based brokerage models where value cannot be clearly evidenced.',
    publishedAt: daysAgo(12),
    discoveredAt: daysAgo(5),
    sourceCategory: 'trade_press',
    sourceWeight: 0.8,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Intelligent Insurer',
    topics: ['broker value', 'cedent survey', 'direct placement', 'fees'],
  },
  {
    title: 'Gallagher Re annual broker report: transparency as the new competitive edge',
    url: 'https://www.ajg.com/gallagherRe/insights/broker-report-2024',
    snippet:
      'Gallagher Re publishes its annual review of reinsurance broker performance, finding that transparency and data quality are now the top two criteria cedents use to evaluate broker value. Brokers who provide real-time visibility into placement progress score significantly higher on client satisfaction metrics.',
    publishedAt: daysAgo(18),
    discoveredAt: daysAgo(8),
    sourceCategory: 'broker_research',
    sourceWeight: 0.9,
    paywallFlag: false,
    fetchMethod: 'search',
    language: 'en',
    status: 'raw',
    sourceName: 'Gallagher Re',
    topics: ['broker value', 'transparency', 'data quality', 'client satisfaction'],
  },
  {
    title: 'Aon survey: reinsurance buyers want more from their brokers',
    url: 'https://www.aon.com/reinsurance/insights/buyer-survey-2024',
    snippet:
      'Aon\'s annual reinsurance buyer survey reveals that 78% of cedents want more structured data from their brokers during the placement process. The survey highlights a gap between what brokers deliver and what cedents expect in terms of real-time deal visibility.',
    publishedAt: daysAgo(22),
    discoveredAt: daysAgo(10),
    sourceCategory: 'broker_research',
    sourceWeight: 0.9,
    paywallFlag: false,
    fetchMethod: 'search',
    language: 'en',
    status: 'raw',
    sourceName: 'Aon',
    topics: ['broker value', 'cedent expectations', 'data', 'placement visibility'],
  },
  {
    title: 'Insurance Insider analysis: the fee compression threat to reinsurance brokers',
    url: 'https://www.insuranceinsider.com/fee-compression-reinsurance',
    snippet:
      'Fee compression is emerging as a structural challenge for reinsurance brokers as cedents benchmark brokerage costs against demonstrable outcomes. The analysis identifies technology-enabled transparency as the primary lever brokers can pull to justify existing fee levels.',
    publishedAt: daysAgo(28),
    discoveredAt: daysAgo(14),
    sourceCategory: 'trade_press',
    sourceWeight: 1.0,
    paywallFlag: true,
    fetchMethod: 'search',
    language: 'en',
    status: 'raw',
    sourceName: 'Insurance Insider',
    topics: ['broker fees', 'fee compression', 'technology', 'transparency'],
  },
]

const REINSURANCE_DATA_ITEMS: MarketItemData[] = [
  {
    title: 'Data quality crisis in reinsurance placement threatens market efficiency',
    url: 'https://www.artemis.bm/news/data-quality-reinsurance-placement',
    snippet:
      'A new study from the London Market Group highlights systemic data quality issues in reinsurance placement that cost the industry an estimated £2 billion annually in inefficiencies. Brokers and cedents are increasingly calling for standardised data schemas as the minimum requirement for effective placement.',
    publishedAt: daysAgo(2),
    discoveredAt: daysAgo(1),
    sourceCategory: 'trade_press',
    sourceWeight: 0.9,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Artemis',
    topics: ['data quality', 'reinsurance placement', 'efficiency', 'data standards'],
  },
  {
    title: 'Reinsurers losing confidence in submission quality as market complexity grows',
    url: 'https://www.insuranceinsider.com/reinsurer-submission-quality',
    snippet:
      'Senior underwriters at major reinsurers report declining confidence in the quality of submissions received from brokers. The proliferation of spreadsheets and email-based placement processes is seen as the root cause, with one CUO describing submissions as "arriving in five different formats with contradictory data in each."',
    publishedAt: daysAgo(4),
    discoveredAt: daysAgo(2),
    sourceCategory: 'trade_press',
    sourceWeight: 1.0,
    paywallFlag: true,
    fetchMethod: 'search',
    language: 'en',
    status: 'raw',
    sourceName: 'Insurance Insider',
    topics: ['data quality', 'submissions', 'underwriting', 'spreadsheets'],
  },
  {
    title: "Lloyd's calls for digital-first placement to address persistent data gaps",
    url: 'https://www.theinsurer.com/lloyds-digital-placement-data',
    snippet:
      "Lloyd's of London has issued updated guidance encouraging market participants to move towards digital-first placement workflows by 2025. The initiative aims to address persistent data quality and transparency issues that hamper effective underwriting decisions and create reconciliation overhead for all parties.",
    publishedAt: daysAgo(10),
    discoveredAt: daysAgo(4),
    sourceCategory: 'trade_press',
    sourceWeight: 1.0,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'The Insurer',
    topics: ["lloyd's", 'data quality', 'digital placement', 'blueprint two'],
  },
  {
    title: 'The hidden cost of spreadsheet-based reinsurance placement',
    url: 'https://www.reinsurancene.ws/spreadsheet-placement-cost',
    snippet:
      'Research from a leading management consultancy reveals that reinsurance brokers spend an average of 40% of placement time on manual data reconciliation tasks. The opportunity cost of this inefficiency is estimated to run into billions of dollars across the global market, representing a structural drag on broker profitability.',
    publishedAt: daysAgo(16),
    discoveredAt: daysAgo(7),
    sourceCategory: 'trade_press',
    sourceWeight: 0.9,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Reinsurance News',
    topics: ['spreadsheets', 'placement efficiency', 'data reconciliation', 'cost'],
  },
  {
    title: 'Making reinsurance data trustworthy: a framework for the London Market',
    url: 'https://www.intelligentinsurer.com/reinsurance-data-framework',
    snippet:
      'Insurtech thought leaders outline a framework for establishing data trust in reinsurance placement. The proposal involves standardised data models, independent verification of key data points, and real-time audit trails covering all placement activity from first indication through to final bound slip.',
    publishedAt: daysAgo(24),
    discoveredAt: daysAgo(11),
    sourceCategory: 'trade_press',
    sourceWeight: 0.8,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Intelligent Insurer',
    topics: ['data quality', 'data standards', 'audit trail', 'london market'],
  },
  {
    title: 'Swiss Re warns of systemic risks from poor reinsurance data infrastructure',
    url: 'https://www.swissre.com/institute/research/reinsurance-data-risk',
    snippet:
      'Swiss Re Institute publishes a working paper arguing that inadequate data infrastructure in reinsurance placement creates systemic risks for the global reinsurance system. The paper calls for industry-wide investment in structured data standards comparable to those seen in equity and fixed income markets.',
    publishedAt: daysAgo(30),
    discoveredAt: daysAgo(15),
    sourceCategory: 'research',
    sourceWeight: 1.0,
    paywallFlag: false,
    fetchMethod: 'search',
    language: 'en',
    status: 'raw',
    sourceName: 'Swiss Re Institute',
    topics: ['data infrastructure', 'systemic risk', 'reinsurance', 'data standards'],
  },
  {
    title: 'PRA consultation: reinsurance counterparty data requirements',
    url: 'https://www.bankofengland.co.uk/prudential-regulation/reinsurance-data-consultation',
    snippet:
      'The Prudential Regulation Authority has launched a consultation on enhanced data requirements for reinsurance counterparty management. UK insurers would be required to demonstrate real-time tracking of reinsurance recoverable positions, pushing demand for structured placement data.',
    publishedAt: daysAgo(35),
    discoveredAt: daysAgo(18),
    sourceCategory: 'regulatory',
    sourceWeight: 1.0,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'PRA',
    topics: ['regulatory', 'PRA', 'data requirements', 'reinsurance counterparty'],
  },
]

const AI_GOVERNANCE_ITEMS: MarketItemData[] = [
  {
    title: 'FCA sets out expectations for AI governance in insurance underwriting',
    url: 'https://www.fca.org.uk/publications/ai-governance-insurance',
    snippet:
      'The Financial Conduct Authority has published a discussion paper outlining its expectations for how insurers and reinsurers should govern the use of artificial intelligence in underwriting and pricing decisions. Firms are expected to demonstrate human oversight, explainability, and model risk management consistent with fair treatment of customers.',
    publishedAt: daysAgo(6),
    discoveredAt: daysAgo(2),
    sourceCategory: 'regulatory',
    sourceWeight: 1.0,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'FCA',
    topics: ['AI governance', 'FCA', 'underwriting', 'regulatory'],
  },
  {
    title: 'AI in insurance: governance frameworks struggle to keep pace with adoption',
    url: 'https://www.insuranceinsider.com/ai-governance-insurance',
    snippet:
      'The rapid adoption of AI tools across the insurance and reinsurance industry is outpacing the development of governance frameworks. Senior regulatory figures in the UK and EU are watching closely as firms navigate the tension between competitive innovation and accountability to regulators and policyholders.',
    publishedAt: daysAgo(8),
    discoveredAt: daysAgo(3),
    sourceCategory: 'trade_press',
    sourceWeight: 1.0,
    paywallFlag: true,
    fetchMethod: 'search',
    language: 'en',
    status: 'raw',
    sourceName: 'Insurance Insider',
    topics: ['AI governance', 'technology', 'regulatory risk', 'innovation'],
  },
  {
    title: "Lloyd's launches AI governance guidelines for managing agents",
    url: 'https://www.theinsurer.com/lloyds-ai-governance',
    snippet:
      "Lloyd's of London has released a comprehensive set of AI governance guidelines for managing agents operating in the Lloyd's market. The guidelines require firms to maintain documentation of AI model decisions and provide regulators with audit trails on request, effective from Q1 2025.",
    publishedAt: daysAgo(12),
    discoveredAt: daysAgo(5),
    sourceCategory: 'trade_press',
    sourceWeight: 1.0,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'The Insurer',
    topics: ["lloyd's", 'AI governance', 'managing agents', 'compliance', 'audit trail'],
  },
  {
    title: 'Insurers face reputational risk from ungoverned AI deployment, warns Airmic',
    url: 'https://www.insurancepost.com/airmic-ai-risk-warning',
    snippet:
      'The Association of Insurance and Risk Managers has warned members that insurers face significant reputational and regulatory risk from the deployment of AI systems without adequate governance frameworks. The association is urging members to conduct independent AI risk audits before the end of the financial year.',
    publishedAt: daysAgo(18),
    discoveredAt: daysAgo(9),
    sourceCategory: 'trade_press',
    sourceWeight: 0.8,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Insurance Post',
    topics: ['AI governance', 'reputational risk', 'risk management', 'Airmic'],
  },
  {
    title: 'EIOPA issues guidance on AI use in insurance across EU member states',
    url: 'https://www.eiopa.europa.eu/publications/ai-governance-guidance',
    snippet:
      'EIOPA has published supervisory guidance on the use of artificial intelligence in insurance across EU member states. The guidance aligns with the EU AI Act and sets expectations for governance, testing, and documentation of AI tools used in underwriting, pricing, and claims management.',
    publishedAt: daysAgo(22),
    discoveredAt: daysAgo(11),
    sourceCategory: 'regulatory',
    sourceWeight: 0.9,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'EIOPA',
    topics: ['AI governance', 'EIOPA', 'EU AI Act', 'regulatory', 'European market'],
  },
]

const INSURTECH_FUNDING_ITEMS: MarketItemData[] = [
  {
    title: 'Insurtech funding recovers in Q3 2024 after two years of sustained decline',
    url: 'https://www.artemis.bm/news/insurtech-funding-q3-2024',
    snippet:
      'Global insurtech funding rose 34% in Q3 2024 compared to the same period last year, reaching $1.4 billion across 87 deals. The recovery is being led by B2B infrastructure plays and AI-enabled underwriting tools rather than consumer-facing neo-insurers — a structural shift that investors believe signals a more durable market than the 2020-2022 boom.',
    publishedAt: daysAgo(18),
    discoveredAt: daysAgo(8),
    sourceCategory: 'trade_press',
    sourceWeight: 0.9,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Artemis',
    topics: ['insurtech funding', 'venture capital', 'B2B insurtech', 'investment'],
  },
  {
    title: 'VC appetite for insurtech returns as market matures past the consumer phase',
    url: 'https://www.reinsurancene.ws/vc-insurtech-funding-recovery',
    snippet:
      'Venture capital investors are returning to the insurtech sector with renewed focus on enterprise software and reinsurance technology. The strategic shift away from consumer-facing plays reflects hard lessons learned from the 2020-2022 boom and bust cycle, with investors now demanding clear unit economics and paths to profitability from day one.',
    publishedAt: daysAgo(24),
    discoveredAt: daysAgo(12),
    sourceCategory: 'trade_press',
    sourceWeight: 0.9,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Reinsurance News',
    topics: ['insurtech funding', 'venture capital', 'reinsurance technology', 'B2B'],
  },
  {
    title: 'London insurtech ecosystem shows resilience as global funding volumes recover',
    url: 'https://www.intelligentinsurer.com/london-insurtech-funding',
    snippet:
      'London remains a top-three global hub for insurtech investment despite global funding headwinds earlier in the year. Infrastructure and data companies are attracting disproportionate investor interest as the market seeks sustainable business models built on genuine underwriting value rather than growth-at-all-costs.',
    publishedAt: daysAgo(32),
    discoveredAt: daysAgo(16),
    sourceCategory: 'trade_press',
    sourceWeight: 0.8,
    paywallFlag: false,
    fetchMethod: 'rss',
    language: 'en',
    status: 'raw',
    sourceName: 'Intelligent Insurer',
    topics: ['insurtech funding', 'london market', 'infrastructure', 'data'],
  },
  {
    title: 'CB Insights: reinsurance technology attracts 40% of specialist insurtech investment in H1 2024',
    url: 'https://www.cbinsights.com/research/reinsurance-tech-investment-h1-2024',
    snippet:
      'CB Insights analysis shows that reinsurance technology companies attracted 40% of all specialist insurtech investment in H1 2024, up from 24% in the same period last year. The report identifies data and workflow infrastructure as the category driving the most interest among institutional investors.',
    publishedAt: daysAgo(38),
    discoveredAt: daysAgo(19),
    sourceCategory: 'research',
    sourceWeight: 0.8,
    paywallFlag: true,
    fetchMethod: 'search',
    language: 'en',
    status: 'raw',
    sourceName: 'CB Insights',
    topics: ['insurtech funding', 'reinsurance technology', 'investment data', 'market analysis'],
  },
]

// ============================================================================
// DEMO CONVERSATION SCORES
// ============================================================================
const BROKER_VALUE_SCORE: ConversationScoreData = {
  marketAttention: {
    value: 8.5,
    label: 'High',
    explanation:
      '7 articles from 5 high-weight sources including Insurance Insider (x2), The Insurer, Reinsurance News, and broker research reports. Strong editorial focus across the trade press.',
  },
  momentum: {
    value: 7.0,
    label: 'Rising',
    explanation:
      '71% of articles published in the last 14 days. The most recent article appeared 3 days ago. Topic is actively accelerating in coverage volume.',
  },
  saturation: {
    value: 5.5,
    label: 'Moderate',
    explanation:
      '7 articles from 5 distinct sources. Moderate angle diversity — most coverage takes the same framing of pressure on brokers, with limited counter-arguments represented.',
  },
  coverageQuality: {
    value: 8.0,
    label: 'High',
    explanation:
      'Average source weight 0.94 across premium trade press. 43% of articles from paywalled premium publications, indicating professional audience and editorial rigour.',
  },
  companyRelevance: {
    value: 9.5,
    label: 'High',
    explanation:
      '9 of 11 topic signals directly match Supercede\'s core narrative around broker defensibility, placement visibility, and data quality. This conversation is the primary commercial context for Supercede\'s market positioning.',
  },
}

const AI_GOVERNANCE_SCORE: ConversationScoreData = {
  marketAttention: {
    value: 7.0,
    label: 'Moderate',
    explanation:
      '5 articles from 4 sources including FCA, EIOPA, Insurance Insider and The Insurer. Regulatory source weight elevates overall signal.',
  },
  momentum: {
    value: 5.5,
    label: 'Stable',
    explanation:
      '60% of articles published in last 14 days. Steady regulatory drumbeat but not rapidly accelerating.',
  },
  saturation: {
    value: 6.0,
    label: 'Moderate',
    explanation:
      '5 articles from 4 distinct sources. Good angle diversity — regulatory, trade press, and risk management perspectives all represented.',
  },
  coverageQuality: {
    value: 8.5,
    label: 'High',
    explanation:
      'High regulatory source weight (FCA, EIOPA). 20% paywall content. Official regulatory publications carry strong signal weight.',
  },
  companyRelevance: {
    value: 4.0,
    label: 'Medium',
    explanation:
      '4 of 11 topic signals match — primarily through the Lloyd\'s market angle and audit trail themes which intersect with Supercede\'s defensibility positioning.',
  },
}

const REINSURANCE_DATA_SCORE: ConversationScoreData = {
  marketAttention: {
    value: 9.0,
    label: 'High',
    explanation:
      '7 articles from 6 high-weight sources including Swiss Re Institute, PRA, Insurance Insider, Artemis, and The Insurer. Cross-sector consensus signal.',
  },
  momentum: {
    value: 8.5,
    label: 'Rising',
    explanation:
      '57% of articles in last 14 days with latest article just 2 days old. Regulatory consultation deadline driving acceleration.',
  },
  saturation: {
    value: 4.5,
    label: 'Moderate',
    explanation:
      '7 articles from 6 sources. Good angle diversity — research, regulatory, and trade press providing different framings of the same underlying issue.',
  },
  coverageQuality: {
    value: 9.0,
    label: 'High',
    explanation:
      'Average source weight 0.96 including Swiss Re Institute and PRA. 14% paywall content. Combination of authoritative regulatory and independent research sources.',
  },
  companyRelevance: {
    value: 10.0,
    label: 'High',
    explanation:
      'All 11 topic signals match Supercede\'s core offering. This conversation is the direct market articulation of the problem Supercede was built to solve.',
  },
}

const INSURTECH_FUNDING_SCORE: ConversationScoreData = {
  marketAttention: {
    value: 5.5,
    label: 'Moderate',
    explanation:
      '4 articles from 4 sources. Meaningful market conversation but not the dominant narrative in current coverage.',
  },
  momentum: {
    value: 3.5,
    label: 'Stable',
    explanation:
      '25% of articles in last 14 days. Coverage is spreading over a longer timeframe — not an acute spike.',
  },
  saturation: {
    value: 4.0,
    label: 'Low',
    explanation:
      '4 articles from 4 distinct sources. Good angle diversity for the volume. Not yet a crowded narrative.',
  },
  coverageQuality: {
    value: 7.0,
    label: 'High',
    explanation:
      'Average source weight 0.9. CB Insights paywall report included. Strong research foundation underneath trade press coverage.',
  },
  companyRelevance: {
    value: 2.5,
    label: 'Low',
    explanation:
      '2 of 11 topic signals match — primarily the reinsurance technology angle. Funding news is market context rather than a direct commercial signal for Supercede.',
  },
}

// ============================================================================
// DEMO CONVERSATION INTERPRETATIONS
// ============================================================================
const BROKER_VALUE_INTERPRETATION: ConversationInterpretationData = {
  executiveSummary:
    "The reinsurance broker value debate has moved from theoretical to urgent. Cedents are actively questioning fees, data transparency is now a commercial requirement not a nice-to-have, and brokers who cannot demonstrate structured, evidenced value are losing mandates. This is precisely the commercial context Supercede was built for — and the window to establish category leadership is open now.",
  whatChanged:
    "The debate has shifted from 'will brokers face disintermediation?' to 'what does defensible broker value actually look like in a data-driven world?' Cedents are asking harder questions at renewal, and brokers are responding by investing in data platforms. The Aon buyer survey makes this concrete: 78% of cedents want structured placement data from their brokers, not just outcomes.",
  whatMarketIsSaying:
    "Brokers need to demonstrate structured, evidenced value through the placement process itself — not just through outcomes achieved after the fact. Transparency, real-time visibility, and data quality are now the primary metrics cedents use to evaluate broker performance. Brokers who cannot provide these are at risk of fee compression or lost mandates.",
  whatIsMissing:
    "Almost no coverage addresses how brokers can improve defensibility during live deals — as opposed to post-placement reporting tools or annual benchmarking surveys. The market is defining the problem but not yet articulating the operational solution. There is also very limited cedent voice in the coverage — most articles are written from the broker perspective.",
  whyThisMatters:
    "This conversation is Supercede's commercial opportunity in real time. The market is creating the buying context that makes Supercede's pitch land — and doing so at senior levels (CFOs questioning fees, CUOs demanding better submissions). Supercede can insert itself into this conversation as the operational answer to a question the market is actively asking.",
  whyIncluded: [
    "Directly maps to Supercede's core narrative around making placement visible and defensible",
    "7 articles from 5 premium sources in 28 days signals a sustained and escalating market conversation",
    "Cedent survey data (Aon, Intelligent Insurer) provides hard evidence that buyer behaviour is shifting in ways Supercede is positioned to address",
  ],
  confidenceLevel: 'high',
  confidenceReason:
    "Multiple independent premium sources (Insurance Insider, The Insurer, Aon, Gallagher Re) covering the same theme from different angles — trade press editorial, broker research, and buyer survey data — all pointing to the same conclusion. High consistency and source diversity.",
  narrativeFit:
    "Perfect fit. Supercede's core narrative ('making reinsurance placement visible, organised, and defensible while deals are still live') is a direct operational response to the problem the market is describing. The market is articulating the enemy problem frame that Supercede uses in its own positioning.",
  commercialImplications: [
    "Broker outbound is particularly well-timed right now — the market conversation is creating urgency that Supercede can leverage in first meetings",
    "Cedent messaging should acknowledge the pressure they are putting on brokers and position Supercede as the tool that makes broker accountability possible",
    "Thought leadership on what 'broker defensibility' actually means operationally would differentiate Supercede from general market commentary",
    "The fee compression narrative creates urgency for broker buyers — Supercede should frame its ROI case around fee protection, not just efficiency",
    "Survey data (41% of cedents would go direct with the right technology) is both a threat narrative for brokers and a commercial hook Supercede can use",
  ],
  recommendedNextMove:
    "Publish founder content on what 'broker defensibility' actually means operationally — not conceptually. Reference the Aon survey and Insurance Insider coverage directly to establish credibility. Frame it as a practitioner's response to the market conversation, not a product pitch.",
  recommendedActions: {
    Sales:
      "Use the Aon survey stat (78% of cedents want structured placement data) as an opening in broker discovery calls. Ask: 'How are you providing that structured data today?' The gap between expectation and reality is where Supercede fits.",
    Outbound:
      "Target heads of reinsurance at mid-sized cedents (£500m-£5bn GWP) with messaging about holding their brokers to account with better data. Frame it as a cedent visibility tool, not a broker tool.",
    FounderContent:
      "Write a LinkedIn article: 'What does defensible broker value actually look like in 2025?' Reference the Aon survey, the Insurance Insider fee compression piece, and the Gallagher Re transparency findings. Make it practitioner-grade, not marketing copy.",
    Website:
      "Add a 'Broker Defensibility' section to the product page. Include specific language about live deal visibility vs post-placement reporting. Use 'defensibility' as a keyword throughout.",
    PR:
      "Pitch Insurance Insider or The Insurer on a comment piece from the Supercede CEO on what operational broker defensibility looks like — in response to the ongoing fee compression debate.",
    CampaignPlanning:
      "Develop a 'Broker Defensibility Audit' offer — a structured conversation about how brokers demonstrate value today, and where Supercede plugs the gaps. Use this as a top-of-funnel lead generation tool.",
    PodcastWebinar:
      "Propose a webinar: 'Broker Value in 2025: What Does Defensibility Actually Mean?' Panel: Supercede CEO, a placing broker, a cedent head of reinsurance. Pitch to Instech London or Intelligent Insurer.",
  },
  risksOrLimitations: [
    "Some key coverage (Insurance Insider x2) is behind paywalls — Supercede may be citing articles its prospects haven't read",
    "The broker value debate may shift if market conditions soften significantly — harder markets create more urgency on broker defensibility",
    "Risk of appearing opportunistic if Supercede inserts itself into the debate too aggressively without genuine practitioner credibility",
  ],
  sourceCitations: [
    'Insurance Insider — Broker value under pressure (Nov 2024)',
    'The Insurer — How brokers are fighting back against disintermediation',
    'Aon — Reinsurance buyer survey 2024',
    'Intelligent Insurer — Cedent views on broker value survey',
    'Gallagher Re — Annual broker report 2024',
  ],
}

const AI_GOVERNANCE_INTERPRETATION: ConversationInterpretationData = {
  executiveSummary:
    "Regulators across the UK and EU are setting explicit AI governance expectations for insurance and reinsurance firms, with Lloyd's leading the market in operational requirements. While AI governance is not Supercede's primary market, the audit trail and defensibility themes that run through the conversation intersect with Supercede's core positioning.",
  whatChanged:
    "AI governance has moved from a risk management discussion to a regulatory requirement with operational deadlines. Lloyd's Q1 2025 guidelines and the FCA discussion paper are no longer forward-looking — they are firm requirements that managing agents and insurance firms must respond to.",
  whatMarketIsSaying:
    "Insurers and reinsurers must demonstrate human oversight, audit trails, and explainability for any AI tool used in underwriting or pricing. The emphasis on documentation and defensibility of decisions is becoming a hard regulatory requirement rather than a governance best practice.",
  whatIsMissing:
    "Coverage focuses almost entirely on AI in underwriting and pricing. There is very limited coverage of AI governance requirements for placement tools, workflow software, or broker-facing platforms — which is where Supercede sits.",
  whyThisMatters:
    "The audit trail and defensibility language in the AI governance conversation closely mirrors the positioning Supercede uses for its placement platform. Supercede can legitimately associate itself with the broader 'defensible decisions' narrative being established by regulators — without claiming to be an AI company.",
  whyIncluded: [
    "The Lloyd's AI governance guidelines explicitly reference audit trail requirements that Supercede already provides for placement",
    "Regulatory emphasis on defensibility of decisions creates an adjacent market context that supports Supercede's positioning",
    "FCA and EIOPA coverage signals sustained regulatory attention on the London and European markets Supercede serves",
  ],
  confidenceLevel: 'moderate',
  confidenceReason:
    "Strong regulatory source quality (FCA, EIOPA, Lloyd's) but moderate relevance to Supercede's core product. The connection is real but requires careful positioning to avoid overclaiming.",
  narrativeFit:
    "Partial fit. Supercede's audit trail and defensibility positioning aligns with the regulatory language around AI governance, but Supercede is not an AI company and should not position itself as one. The fit is strongest on the 'defensible decisions' and 'audit trail' dimensions.",
  commercialImplications: [
    "Supercede can legitimately reference the regulatory emphasis on defensibility and audit trails as context for why structured placement data matters",
    "Lloyd's Q1 2025 AI governance deadline creates urgency for managing agents to review their documentation practices broadly",
    "The 'explainability' language in the FCA paper parallels Supercede's 'visibility during live deals' positioning — a narrative connection worth developing",
  ],
  recommendedNextMove:
    "Monitor this conversation but do not prioritise action. If Lloyd's AI governance guidelines create demand for placement audit tools, Supercede should be prepared to position its audit trail features as a response.",
  recommendedActions: {
    MonitorOnly:
      "Track Lloyd's AI governance implementation for any explicit requirements around placement process documentation. If audit trail requirements extend to placement workflows, Supercede has a natural story to tell.",
    FounderContent:
      "Optional: a piece on 'Why defensibility matters beyond AI — the case for structured placement data' could connect the regulatory AI narrative to Supercede's broader positioning without overclaiming.",
  },
  risksOrLimitations: [
    "Risk of overclaiming — Supercede is not an AI company and should not position itself as one in the context of this conversation",
    "Regulatory focus is on underwriting AI, not placement technology — the connection is indirect",
    "The conversation may not translate into direct commercial urgency for Supercede's current product",
  ],
  sourceCitations: [
    "FCA — Discussion paper on AI governance in insurance",
    "Lloyd's — AI governance guidelines for managing agents",
    "The Insurer — AI governance frameworks under pressure",
  ],
}

const REINSURANCE_DATA_INTERPRETATION: ConversationInterpretationData = {
  executiveSummary:
    "The reinsurance industry is reaching a consensus that data quality in placement is not just a workflow problem — it is a systemic risk and regulatory issue. Seven articles from six premium sources in 35 days, including PRA regulatory consultation and Swiss Re Institute research, confirm that this conversation is escalating to board level. This is the primary commercial context for Supercede's market, and the urgency is real.",
  whatChanged:
    "The conversation has shifted from 'data quality is an operational inconvenience' to 'data quality is a financial and regulatory risk.' The PRA consultation on reinsurance counterparty data requirements gives this concrete regulatory teeth — cedents that cannot demonstrate real-time tracking of reinsurance recoverables face supervisory scrutiny. Swiss Re's systemic risk framing elevates the stakes further.",
  whatMarketIsSaying:
    "Reinsurance data infrastructure is inadequate for the complexity and risk levels of the current market. Brokers, cedents, and reinsurers all acknowledge the problem but lack the operational tools to address it. Industry consensus is building that structured data standards — not just better spreadsheets — are required.",
  whatIsMissing:
    "Almost no coverage discusses what operational change looks like at the placement workflow level. The conversation describes the problem with increasing precision and urgency but does not yet have examples of solutions that have worked at scale. Supercede is positioned to provide that example — but has not yet inserted itself into this conversation publicly.",
  whyThisMatters:
    "This is the most commercially significant market conversation Supercede monitors. The industry is actively building the buying rationale for Supercede's product — and the regulatory dimension (PRA consultation, Lloyd's guidance) means urgency is coming from outside the procurement process. Supercede's timing is optimal.",
  whyIncluded: [
    "Every article in this cluster is directly about the problem Supercede was built to solve",
    "Regulatory sources (PRA, Lloyd's) alongside research (Swiss Re Institute) signal the conversation has moved beyond industry commentary to policy",
    "8.5/10 momentum score driven by the PRA consultation timeline — urgency is externally imposed and escalating",
  ],
  confidenceLevel: 'high',
  confidenceReason:
    "Highest confidence rating in this intelligence cycle. Cross-sector consensus from regulatory, research, and trade press sources covering the same problem from independent angles. All 11 topic signals match Supercede's core positioning.",
  narrativeFit:
    "Supercede's enemy problem frame — 'reinsurance placement is invisible, brokers and cedents lack live visibility into complex deals' — is being articulated word-for-word in this coverage. The Swiss Re systemic risk framing and the Insurance Insider CUO quote about 'five different formats with contradictory data' are direct validations of Supercede's founding thesis.",
  commercialImplications: [
    "Regulatory pressure (PRA consultation) creates urgent demand among UK cedents for structured placement data capabilities — this is a near-term pipeline catalyst",
    "The Swiss Re systemic risk framing gives Supercede language to use with board-level and CFO audiences who may not engage with operational efficiency arguments",
    "The Insurance Insider CUO quote ('five different formats') is a perfect reference point for reinsurer-side conversations about submission quality",
    "Lloyd's digital-first placement guidance creates urgency for managing agents to demonstrate structured data capabilities by 2025",
    "The consultancy research (40% of placement time on manual reconciliation) provides a quantified ROI anchor for Supercede's commercial conversations",
  ],
  recommendedNextMove:
    "Commission and publish a structured primary research report on reinsurance data quality — positioning Supercede as the authoritative voice on the problem it solves. Target Insurance Insider or The Insurer as distribution partners. Use the PRA consultation as a hook for timing.",
  recommendedActions: {
    Sales:
      "Use the PRA consultation on reinsurance counterparty data as a trigger for outreach to UK cedent heads of reinsurance. Frame it as: 'The PRA is now asking about your reinsurance recoverable tracking — are you confident in your data?' Supercede is the operational answer.",
    Outbound:
      "Target CFOs and CROs at UK cedents with the PRA consultation angle. This is a regulatory risk conversation that belongs at C-suite level, not just with heads of reinsurance operations.",
    FounderContent:
      "Write: 'Why the PRA consultation on reinsurance data should concern every UK cedent' — a technical but accessible piece that frames the regulatory risk and positions Supercede's audit trail as the response. Publish on LinkedIn and submit to Insurance Post.",
    Website:
      "Add a 'Data Quality and Regulatory Compliance' section to the website. Reference the PRA consultation, Lloyd's digital-first guidance, and the Swiss Re systemic risk framing as market context for why Supercede exists.",
    PR:
      "Pitch a two-page response to the PRA consultation on behalf of Supercede, positioning the company as a constructive voice in the regulatory debate. Copy to Insurance Insider and The Insurer as a news hook.",
    CampaignPlanning:
      "Develop a 'Reinsurance Data Readiness Assessment' — a structured diagnostic for cedents to evaluate their placement data quality against PRA expectations. Use as a top-of-funnel lead generation tool with a 6-week campaign timeline before the PRA consultation closes.",
    PodcastWebinar:
      "Propose a webinar: 'The PRA Consultation on Reinsurance Data — What it Means for Cedents' with panellists from a law firm, a cedent risk officer, and Supercede. Pitch to Insurance Post or Clyde & Co for co-hosting.",
  },
  risksOrLimitations: [
    "The PRA consultation may not result in hard rules — monitoring the outcome before building the entire campaign around it",
    "Risk of leading with regulatory framing for a product that competes on operational efficiency — the two narratives must be carefully integrated",
    "Some target buyers (broker heads of placement) may resist the regulatory urgency framing if they feel it implies they are currently non-compliant",
  ],
  sourceCitations: [
    "Artemis — Data quality crisis in reinsurance placement (Nov 2024)",
    "Insurance Insider — Reinsurers losing confidence in submission quality",
    "The Insurer — Lloyd's calls for digital-first placement",
    "Swiss Re Institute — Systemic risks from poor reinsurance data infrastructure",
    "PRA — Consultation on reinsurance counterparty data requirements",
  ],
}

const INSURTECH_FUNDING_INTERPRETATION: ConversationInterpretationData = {
  executiveSummary:
    "Global insurtech funding is recovering, led by B2B reinsurance technology and AI-enabled infrastructure plays. While this is positive market context for Supercede, the conversation is primarily a macro signal rather than a direct commercial opportunity. Awareness of the investor narrative is useful for fundraising positioning and competitive intelligence.",
  whatChanged:
    "Funding has shifted structurally from consumer-facing to B2B enterprise plays, and reinsurance technology is now capturing 40% of specialist insurtech investment (up from 24%). This is market validation for Supercede's category positioning — but it also signals that competitors may be better capitalised than before.",
  whatMarketIsSaying:
    "B2B insurtech with clear unit economics and genuine underwriting value is fundable again. Infrastructure and data companies are attracting disproportionate investor interest. The market has learned from the 2020-2022 cycle and is backing sustainable models.",
  whatIsMissing:
    "Almost no coverage identifies specific reinsurance technology companies winning investment — the coverage is macro-level. Competitive intelligence at the company level would require primary research.",
  whyThisMatters:
    "Useful context for Supercede's fundraising narrative and competitive awareness, but not a direct commercial signal. The 40% reinsurance technology share of specialist insurtech investment is notable validation for the category Supercede operates in.",
  whyIncluded: [
    "Reinsurance technology investment share (40%) is a useful data point for Supercede's investor narrative",
    "The structural shift to B2B validates Supercede's enterprise model against consumer-facing competitors",
    "London hub resilience is relevant for Supercede's London Market positioning",
  ],
  confidenceLevel: 'moderate',
  confidenceReason:
    "Reliable sources (CB Insights, Artemis) with quantitative data, but low direct commercial relevance for Supercede's near-term priorities.",
  narrativeFit:
    "Indirect fit. Supercede benefits from the B2B reinsurance technology narrative but is not a primary subject of this conversation.",
  commercialImplications: [
    "Competitor capitalisation may be increasing — Supercede should monitor funding announcements in the reinsurance technology space",
    "The CB Insights 40% reinsurance technology figure is a useful investor narrative point for Supercede's fundraising materials",
    "Recovery in London hub investment is positive context for Supercede's home market positioning",
  ],
  recommendedNextMove:
    "Monitor the funding landscape for competitive intelligence. Use the macro funding recovery narrative as supporting evidence in investor conversations, not as a primary market signal.",
  recommendedActions: {
    MonitorOnly:
      "Set up alerts for reinsurance technology funding announcements. Track CB Insights and Artemis quarterly for competitive capitalisation data. Review and update Supercede's competitive landscape assessment if significant funding rounds are announced.",
  },
  risksOrLimitations: [
    "Macro funding data does not identify specific competitors — primary research needed for meaningful competitive intelligence",
    "Funding recovery may not translate into customer budget availability — these are separate signals",
  ],
  sourceCitations: [
    "Artemis — Insurtech funding Q3 2024 recovery",
    "CB Insights — Reinsurance technology investment H1 2024",
    "Intelligent Insurer — London insurtech ecosystem resilience",
  ],
}

// ============================================================================
// DEMO CONVERSATIONS
// ============================================================================
export const DEMO_CONVERSATIONS: MarketConversationData[] = [
  {
    id: 'demo-conv-data-quality',
    title: 'Reinsurance Data Quality and Decision Confidence',
    summary:
      "Industry-wide recognition that reinsurance data quality is a systemic risk, not just an operational inconvenience. PRA regulatory consultation, Swiss Re Institute research, and multiple trade press investigations confirm that the problem is escalating from an efficiency issue to a financial and regulatory liability — the exact problem Supercede was built to solve.",
    firstDetectedAt: daysAgo(35),
    latestCoverageAt: daysAgo(0),
    sourceMix: {
      Artemis: 1,
      'Insurance Insider': 1,
      'The Insurer': 1,
      'Reinsurance News': 1,
      'Intelligent Insurer': 1,
      'Swiss Re Institute': 1,
      PRA: 1,
      'London Market Group': 1,
    },
    dominantEntities: ["Lloyd's of London", 'PRA', 'Swiss Re Institute', 'London Market Group'],
    dominantTopics: ['data quality', 'submission standards', 'placement efficiency', 'regulatory compliance', 'data infrastructure'],
    angleMap: ['regulatory', 'research', 'trade press', 'market commentary'],
    confidence: 0.95,
    isDemo: true,
    items: REINSURANCE_DATA_ITEMS,
    score: REINSURANCE_DATA_SCORE,
    interpretation: REINSURANCE_DATA_INTERPRETATION,
    viewStatus: 'included_in_brief',
    marketSignal: 'Data quality is being framed as decision confidence and regulatory exposure.',
    whyItIsHere: 'Rising momentum, high company relevance, and official-source involvement.',
    suggestedUse: ['Positioning', 'Sales narrative', 'Cedent messaging'],
    evidenceSummary: { itemCount: 14, sourceCount: 8, analysisPieces: 3, lastUpdated: 'today' },
  },
  {
    id: 'demo-conv-broker-value',
    title: 'Broker Value Under Pressure',
    summary:
      "Reinsurance brokers are facing mounting pressure from cedents to demonstrate structured, evidenced value beyond market access. Fee compression, disintermediation risk, and demand for data transparency are reshaping the broker-cedent relationship — creating the primary commercial context for Supercede's market positioning.",
    firstDetectedAt: daysAgo(28),
    latestCoverageAt: daysAgo(1),
    sourceMix: {
      'Insurance Insider': 2,
      'The Insurer': 1,
      'Reinsurance News': 1,
      'Intelligent Insurer': 1,
      'Gallagher Re': 1,
      Aon: 1,
    },
    dominantEntities: ['Willis Re', 'Aon', 'Gallagher Re'],
    dominantTopics: ['broker value', 'defensibility', 'fee compression', 'data transparency', 'disintermediation'],
    angleMap: ['broker perspective', 'cedent perspective', 'analyst research', 'broker research'],
    confidence: 0.88,
    isDemo: true,
    items: BROKER_VALUE_ITEMS,
    score: BROKER_VALUE_SCORE,
    interpretation: BROKER_VALUE_INTERPRETATION,
    viewStatus: 'action_recommended',
    marketSignal: 'Broker value is shifting from relationship and access language to evidence and defensibility.',
    whyItIsHere: 'Strong fit with the company narrative and low saturation — the angle is not yet crowded.',
    suggestedUse: ['Broker messaging', 'Objection handling', 'Founder POV'],
    evidenceSummary: { itemCount: 9, sourceCount: 6, analysisPieces: 2, lastUpdated: 'yesterday' },
  },
  {
    id: 'demo-conv-ai-governance',
    title: 'AI Governance in Insurance',
    summary:
      "Regulators are setting hard AI governance requirements for insurance and reinsurance firms, with Lloyd's leading the market in audit trail and explainability obligations. The conversation intersects with Supercede's defensibility positioning but is not a direct commercial signal — relevance depends on how far governance requirements extend to placement workflow tools.",
    firstDetectedAt: daysAgo(22),
    latestCoverageAt: daysAgo(0),
    sourceMix: {
      FCA: 1,
      'Insurance Insider': 1,
      'The Insurer': 1,
      'Insurance Post': 1,
      EIOPA: 1,
    },
    dominantEntities: ['FCA', 'EIOPA', "Lloyd's of London", 'Airmic'],
    dominantTopics: ['AI governance', 'audit trail', 'explainability', 'regulatory compliance', 'managing agents'],
    angleMap: ['regulatory', 'risk management', 'trade press', 'market commentary'],
    confidence: 0.75,
    isDemo: true,
    items: AI_GOVERNANCE_ITEMS,
    score: AI_GOVERNANCE_SCORE,
    interpretation: AI_GOVERNANCE_INTERPRETATION,
    viewStatus: 'monitor_only',
    marketSignal: 'AI governance remains highly visible, but generic commentary is crowded.',
    whyItIsHere: 'Moderate relevance, high saturation, and a possible connection to audit trails and placement workflow.',
    suggestedUse: ['Monitor', 'Avoid generic commentary'],
    evidenceSummary: { itemCount: 22, sourceCount: 11, lastUpdated: 'today' },
  },
  {
    id: 'demo-conv-insurtech-funding',
    title: 'Insurtech Funding Recovery',
    summary:
      "Global insurtech funding is recovering after a two-year decline, led by B2B reinsurance technology and AI-enabled infrastructure plays. Reinsurance technology now captures 40% of specialist insurtech investment. This is useful macro context for Supercede's investor narrative and competitive awareness, but a low-urgency commercial signal for near-term sales activity.",
    firstDetectedAt: daysAgo(38),
    latestCoverageAt: daysAgo(18),
    sourceMix: {
      Artemis: 1,
      'Reinsurance News': 1,
      'Intelligent Insurer': 1,
      'CB Insights': 1,
    },
    dominantEntities: [],
    dominantTopics: ['insurtech funding', 'B2B insurtech', 'reinsurance technology', 'venture capital', 'infrastructure'],
    angleMap: ['market data', 'investor perspective', 'trade press'],
    confidence: 0.65,
    isDemo: true,
    items: INSURTECH_FUNDING_ITEMS,
    score: INSURTECH_FUNDING_SCORE,
    interpretation: INSURTECH_FUNDING_INTERPRETATION,
    viewStatus: 'tracked_not_prioritised',
    marketSignal: 'Funding coverage is improving, but not shaping the current commercial narrative.',
    whyItIsHere: 'Useful market context. Low company relevance and stale coverage keep it out of the brief.',
    suggestedUse: ['Monitor for investor narrative only'],
    evidenceSummary: { itemCount: 12, sourceCount: 7, lastUpdated: 'this week' },
  },
]

// ============================================================================
// DEMO SOURCES
// ============================================================================
export const DEMO_SOURCES: SourceData[] = [
  {
    name: 'Insurance Insider',
    url: 'https://www.insuranceinsider.com',
    category: 'trade_press',
    weight: 1.0,
    geography: 'global',
    segmentTags: ['reinsurance', 'london_market', 'specialty'],
    fetchMethod: 'search',
    priority: 1,
    paywallLikelihood: 'high',
  },
  {
    name: 'The Insurer',
    url: 'https://www.theinsurer.com',
    category: 'trade_press',
    weight: 1.0,
    geography: 'global',
    segmentTags: ['reinsurance', 'london_market', 'specialty'],
    fetchMethod: 'rss',
    priority: 1,
    paywallLikelihood: 'medium',
    rssUrl: 'https://www.theinsurer.com/feed/',
  },
  {
    name: 'Reinsurance News',
    url: 'https://www.reinsurancene.ws',
    category: 'trade_press',
    weight: 0.9,
    geography: 'global',
    segmentTags: ['reinsurance', 'specialty'],
    fetchMethod: 'rss',
    priority: 1,
    paywallLikelihood: 'low',
    rssUrl: 'https://www.reinsurancene.ws/feed/',
  },
  {
    name: 'Artemis',
    url: 'https://www.artemis.bm',
    category: 'trade_press',
    weight: 0.9,
    geography: 'global',
    segmentTags: ['reinsurance', 'ils', 'catastrophe'],
    fetchMethod: 'rss',
    priority: 1,
    paywallLikelihood: 'low',
    rssUrl: 'https://www.artemis.bm/feed/',
  },
  {
    name: 'Intelligent Insurer',
    url: 'https://www.intelligentinsurer.com',
    category: 'trade_press',
    weight: 0.8,
    geography: 'global',
    segmentTags: ['reinsurance', 'specialty', 'technology'],
    fetchMethod: 'rss',
    priority: 2,
    paywallLikelihood: 'medium',
    rssUrl: 'https://www.intelligentinsurer.com/rss/news',
  },
  {
    name: "Lloyd's Market Bulletins",
    url: 'https://www.lloyds.com/market-resources/market-bulletins',
    category: 'market_intelligence',
    weight: 1.0,
    geography: 'uk',
    segmentTags: ["lloyd's", 'london_market', 'regulatory'],
    fetchMethod: 'rss',
    priority: 1,
    paywallLikelihood: 'none',
    rssUrl: 'https://www.lloyds.com/market-resources/market-bulletins/rss',
  },
  {
    name: 'FCA Publications',
    url: 'https://www.fca.org.uk/publications',
    category: 'regulatory',
    weight: 1.0,
    geography: 'uk',
    segmentTags: ['regulatory', 'uk_market', 'compliance'],
    fetchMethod: 'rss',
    priority: 1,
    paywallLikelihood: 'none',
    rssUrl: 'https://www.fca.org.uk/rss.xml',
  },
  {
    name: 'PRA Publications',
    url: 'https://www.bankofengland.co.uk/prudential-regulation',
    category: 'regulatory',
    weight: 1.0,
    geography: 'uk',
    segmentTags: ['regulatory', 'uk_market', 'solvency', 'reinsurance_regulation'],
    fetchMethod: 'rss',
    priority: 1,
    paywallLikelihood: 'none',
    rssUrl: 'https://www.bankofengland.co.uk/rss/publications',
  },
  {
    name: 'Swiss Re Institute',
    url: 'https://www.swissre.com/institute/',
    category: 'research',
    weight: 1.0,
    geography: 'global',
    segmentTags: ['reinsurance', 'research', 'market_data', 'catastrophe'],
    fetchMethod: 'search',
    priority: 1,
    paywallLikelihood: 'low',
  },
  {
    name: 'Instech London',
    url: 'https://www.instech.london',
    category: 'insurtech',
    weight: 0.8,
    geography: 'uk',
    segmentTags: ['insurtech', 'london_market', 'technology'],
    fetchMethod: 'rss',
    priority: 2,
    paywallLikelihood: 'low',
    rssUrl: 'https://www.instech.london/feed/',
  },
]
