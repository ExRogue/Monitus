'use client';
/**
 * Conversation Detail — one Market Conversation in full, four tabs:
 *   Story         — executive summary, what changed, what's missing, why it matters
 *   Coverage      — the underlying items, source mix, evidence
 *   Actions       — recommended actions per category, each with a "Draft this" button
 *                   that opens Content Producer pre-loaded with conversation context
 *   Company View  — narrative fit + commercial implications + risks
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, ExternalLink,
  Sparkles, FileText, ThumbsDown, ThumbsUp, Archive, Shuffle,
  AlertCircle,
} from 'lucide-react';
import { tierFor } from '@/lib/evidence-rules';

type ConfidenceLevel = 'low' | 'medium' | 'medium-high' | 'high';

interface ScoreEntry { value: number; label: string; explanation: string; }

interface Conversation {
  id: string;
  title: string;
  summary?: string;
  firstDetectedAt?: string;
  latestCoverageAt?: string;
  sourceMix?: Record<string, number>;
  dominantEntities?: string[];
  dominantTopics?: string[];
  angleMap?: string[];
  confidence?: number;
  viewStatus?: string;
  marketSignal?: string;
  whyItIsHere?: string;
  suggestedUse?: string[];
  score?: {
    marketAttention: ScoreEntry; momentum: ScoreEntry; saturation: ScoreEntry;
    coverageQuality: ScoreEntry; companyRelevance: ScoreEntry;
  };
  interpretation?: {
    executiveSummary: string;
    whatChanged: string;
    whatMarketIsSaying: string;
    whatIsMissing: string;
    whyThisMatters: string;
    whyIncluded: string[];
    confidenceLevel: ConfidenceLevel;
    confidenceReason: string;
    narrativeFit: string;
    commercialImplications: string[];
    recommendedNextMove: string;
    recommendedActions: Partial<Record<
      'Sales' | 'Outbound' | 'FounderContent' | 'Website' | 'PR' | 'CampaignPlanning' | 'PodcastWebinar' | 'MonitorOnly',
      string
    >>;
    risksOrLimitations: string[];
    sourceCitations?: string[];
  };
  items?: Array<{
    signalAnalysisId: string;
    articleId: string;
    role: 'primary' | 'supporting' | 'tangential';
    title?: string;
    source?: string;
    sourceUrl?: string;
    publishedAt?: string;
    snippet?: string;
  }>;
  evidenceSummary?: { itemCount: number; sourceCount: number; lastUpdated: string };
}

type Tab = 'story' | 'company-view' | 'coverage' | 'actions';

// Tab order per the conversation-detail redesign (cofounder's mockup,
// 2026-05-22): Story → Company View → Coverage Map → Recommended Actions.
// Recommended Actions sits last so the page reads as "what happened → why
// it matters to us → what we know about it → what to do".
const TAB_ORDER: Tab[] = ['story', 'company-view', 'coverage', 'actions'];
const TAB_LABEL: Record<Tab, string> = {
  story: 'Story',
  'company-view': 'Company View',
  coverage: 'Coverage Map',
  actions: 'Recommended Actions',
};

// Confidence pill styling. Maps the four spec confidence buckets to the
// chip background + text colour shown above the conversation title.
const CONFIDENCE_PILL: Record<string, { label: string; classes: string }> = {
  low: {
    label: 'Low Confidence',
    classes: 'bg-[var(--navy-light)] text-[var(--text-secondary)] border-[var(--border)]',
  },
  medium: {
    label: 'Medium Confidence',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  'medium-high': {
    label: 'Medium-High Confidence',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  high: {
    label: 'High Confidence',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
};

const ACTION_CATEGORY_LABELS: Record<string, { label: string; channel: string; format: string }> = {
  Sales: { label: 'Sales', channel: 'Internal', format: 'Sales script / talking point' },
  Outbound: { label: 'Outbound', channel: 'Email / LinkedIn DM', format: 'Outreach copy' },
  FounderContent: { label: 'Founder Content', channel: 'LinkedIn', format: 'LinkedIn post' },
  Website: { label: 'Website', channel: 'Site', format: 'Page / section copy' },
  PR: { label: 'PR', channel: 'Trade media', format: 'Trade media pitch' },
  CampaignPlanning: { label: 'Campaign Planning', channel: 'Internal', format: 'Campaign brief' },
  PodcastWebinar: { label: 'Podcast / Webinar', channel: 'Event', format: 'Episode brief' },
  MonitorOnly: { label: 'Monitor', channel: '—', format: '—' },
};

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('story');
  const [demoMode, setDemoMode] = useState(false);
  const [draftingCategory, setDraftingCategory] = useState<string | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const demo = url.searchParams.get('companyId') === 'demo';
    setDemoMode(demo);
    const fetchUrl = demo
      ? `/api/market-view/conversations/${params.id}?companyId=demo`
      : `/api/market-view/conversations/${params.id}`;
    fetch(fetchUrl)
      .then(r => r.json())
      .then(data => setConversation(data.conversation))
      .catch(() => setConversation(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleFeedback = async (feedbackType: 'helpful' | 'not_relevant' | 'wrong_cluster' | 'low_quality') => {
    if (demoMode) {
      setFeedbackSent(feedbackType);
      return;
    }
    setFeedbackSubmitting(true);
    try {
      const r = await fetch(`/api/conversations/${params.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackType }),
      });
      const data = await r.json();
      if (data?.ok) {
        setFeedbackSent(feedbackType);
        // For negative feedback we archive the conversation — bounce back to Market View
        if (feedbackType !== 'helpful') {
          setTimeout(() => router.push('/market-view'), 1200);
        }
      } else if (data?.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Feedback failed:', err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleDraft = async (category: string, prompt: string) => {
    if (demoMode) {
      // Demo mode: route to content producer with a query param
      router.push(`/content?fromConversation=${params.id}&action=${encodeURIComponent(category)}&companyId=demo`);
      return;
    }
    setDraftingCategory(category);
    try {
      const r = await fetch('/api/content/draft-from-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: params.id,
          action: category,
          guidance: prompt,
        }),
      });
      const data = await r.json();
      if (data?.contentId) {
        router.push(`/content?id=${data.contentId}`);
      } else if (data?.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Draft failed:', err);
      alert('Failed to start a draft. Please try again.');
    } finally {
      setDraftingCategory(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-3xl mx-auto p-8 mt-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Conversation not found</h1>
        <Link href="/market-view" className="text-[var(--accent)] hover:underline">
          Back to Market View
        </Link>
      </div>
    );
  }

  const i = conversation.interpretation;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Back */}
      <Link
        href={demoMode ? '/market-view?companyId=demo' : '/market-view'}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Market View
      </Link>

      {/* Header — confidence pill + meta line, then the conversation title */}
      <header className="mb-6">
        {(() => {
          const level = conversation.interpretation?.confidenceLevel;
          const pill = level ? CONFIDENCE_PILL[level] : null;
          const itemCount = conversation.evidenceSummary?.itemCount;
          const latest = conversation.latestCoverageAt
            ? new Date(conversation.latestCoverageAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
          return (
            <div className="flex items-center gap-3 mb-3">
              {pill && (
                <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${pill.classes}`}>
                  {pill.label}
                </span>
              )}
              {(itemCount || latest) && (
                <span className="text-xs text-[var(--text-secondary)]/70">
                  {typeof itemCount === 'number' && `${itemCount} item${itemCount === 1 ? '' : 's'}`}
                  {typeof itemCount === 'number' && latest && ' · '}
                  {latest}
                </span>
              )}
            </div>
          );
        })()}
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2 leading-tight">
          {conversation.title}
        </h1>
        {conversation.marketSignal && (
          <p className="text-sm text-[var(--text-secondary)]">{conversation.marketSignal}</p>
        )}
      </header>

      {/* Thin-evidence banner — when the cluster is built on 1-2 items or
          1-2 sources, the scores below can't honestly carry full weight.
          Make that obvious so users don't read "Coverage Quality: High" on
          a single source as gospel. */}
      {(() => {
        const ev = conversation.evidenceSummary;
        if (!ev) return null;
        const isThin = ev.itemCount <= 2 || ev.sourceCount <= 2;
        if (!isThin) return null;
        const lowConfidence = conversation.interpretation?.confidenceLevel === 'low'
          || conversation.interpretation?.confidenceLevel === 'medium';
        return (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-amber-400 mb-1">
                  Limited evidence — {ev.itemCount} item{ev.itemCount === 1 ? '' : 's'} · {ev.sourceCount} source{ev.sourceCount === 1 ? '' : 's'}
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  This conversation has been clustered from a small number of items. The metrics below have been capped to reflect the underlying evidence — Coverage Quality and Attention scores are bounded by source count, not by Claude's read of the article body.
                  {lowConfidence && ' Confidence is set to Low/Medium until more coverage arrives.'}
                </p>
                {conversation.interpretation?.confidenceReason && (
                  <p className="text-[11px] text-[var(--text-secondary)]/70 mt-1.5">
                    {conversation.interpretation.confidenceReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Score bar — solid coloured pills per the redesign mockup. Order
          follows the v2 spec (Relevance → Momentum → Attention → Saturation
          → Coverage quality). Labels are now uppercase above the value. */}
      {conversation.score && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
          <ScoreBadge label="Relevance" entry={conversation.score.companyRelevance} />
          <ScoreBadge label="Momentum" entry={conversation.score.momentum} />
          <ScoreBadge label="Attention" entry={conversation.score.marketAttention} />
          <ScoreBadge label="Saturation" entry={conversation.score.saturation} />
          <ScoreBadge label="Quality" entry={conversation.score.coverageQuality} />
        </div>
      )}

      {/* Tabs — Story / Company View / Coverage Map / Recommended Actions
          (the redesign mockup ordering, 2026-05-22). */}
      <div className="flex border-b border-[var(--border)] mb-6 overflow-x-auto">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? 'text-[var(--accent)] border-[var(--accent)]'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            {TAB_LABEL[tab]}
          </button>
        ))}
      </div>

      {/* Story tab */}
      {activeTab === 'story' && i && (
        <div className="space-y-6">
          <Section label="Executive summary" text={i.executiveSummary} primary />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section label="What changed" text={i.whatChanged} />
            <Section label="What the market is saying" text={i.whatMarketIsSaying} />
            <Section label="What is missing" text={i.whatIsMissing} />
            <Section label="Why this matters" text={i.whyThisMatters} />
          </div>

          {i.whyIncluded && i.whyIncluded.length > 0 && (
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
              <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-2">
                Why we're tracking this
              </div>
              <ul className="space-y-1.5">
                {i.whyIncluded.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                    <span className="text-[var(--accent)] mt-0.5">·</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {i.recommendedNextMove && (
            <div className="bg-[var(--accent)]/5 border border-[var(--accent)]/30 rounded-xl p-5">
              <div className="flex items-center gap-2 text-[var(--accent)] text-[10px] font-semibold tracking-widest uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Recommended next move
              </div>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">{i.recommendedNextMove}</p>
            </div>
          )}

          {(i.risksOrLimitations || []).length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-2">
                Risks or limitations
              </div>
              <ul className="space-y-1.5">
                {i.risksOrLimitations.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="text-amber-500 mt-0.5">·</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recommended Actions tab */}
      {activeTab === 'actions' && i && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Specific moves you can make, organised by channel. Click <strong>Draft this</strong> to open the Content Producer with this conversation pre-loaded as context.
          </p>
          {Object.entries(i.recommendedActions)
            .filter(([_, suggestion]) => suggestion && suggestion.trim())
            .map(([category, suggestion]) => {
              const meta = ACTION_CATEGORY_LABELS[category] || { label: category, channel: '—', format: '—' };
              const isMonitor = category === 'MonitorOnly';
              return (
                <div
                  key={category}
                  className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-[var(--text-primary)]">{meta.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/60">
                        {meta.channel}
                      </span>
                    </div>
                    {!isMonitor && (
                      <button
                        onClick={() => handleDraft(category, suggestion!)}
                        disabled={draftingCategory === category}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white rounded-md transition-opacity"
                      >
                        {draftingCategory === category ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Drafting…
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            Draft this
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{suggestion}</p>
                </div>
              );
            })}
        </div>
      )}

      {/* Coverage Map tab — dashboard view of the evidence behind this
          conversation. Per the redesign mockup (2026-05-22): stat tiles,
          coverage window, publication breakdown, angle map, then the
          underlying items at the bottom. */}
      {activeTab === 'coverage' && (() => {
        const items = conversation.items || [];
        const itemCount = items.length;
        const sourceCounts = new Map<string, number>();
        let analysisCount = 0;
        for (const it of items) {
          const src = (it.source || '').trim();
          if (src) sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
          const tier = tierFor(src);
          // "Analysis" = items from tiers that publish substantive analysis
          // (premium trade, market infrastructure research, legal commentary).
          // Excludes regulators (those are official signals, not analysis)
          // and wire syndication.
          if (tier === 'premium_trade' || tier === 'market_infra' || tier === 'legal_regulatory') {
            analysisCount += 1;
          }
        }
        const publicationCount = sourceCounts.size;
        // Opinion classification needs richer metadata we don't have yet —
        // surfacing 0 honestly rather than faking the number.
        const opinionCount = 0;
        // Today every item we ingest goes through an RSS feed. When we add
        // direct-fetch sources we'll need a per-item flag.
        const viaRssCount = itemCount;

        const firstDetected = conversation.firstDetectedAt
          ? new Date(conversation.firstDetectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : null;
        const latest = conversation.latestCoverageAt
          ? new Date(conversation.latestCoverageAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : null;

        const publicationRows = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1]);

        return (
          <div className="space-y-4">
            {/* Stat tiles — 5 numbers across the top */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <CoverageStat label="Total Items" value={itemCount} />
              <CoverageStat label="Publications" value={publicationCount} />
              <CoverageStat label="Analysis" value={analysisCount} />
              <CoverageStat label="Opinion" value={opinionCount} />
              <CoverageStat label="Via RSS" value={viaRssCount} />
            </div>

            {/* Coverage window */}
            {(firstDetected || latest) && (
              <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-3">
                  Coverage window
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {firstDetected && (
                    <span className="text-[var(--text-primary)]">
                      <span className="text-[var(--text-secondary)]/70">First detected:</span> {firstDetected}
                    </span>
                  )}
                  {firstDetected && latest && (
                    <span className="text-[var(--text-secondary)]/40">→</span>
                  )}
                  {latest && (
                    <span className="text-[var(--text-primary)]">
                      <span className="text-[var(--text-secondary)]/70">Latest:</span> {latest}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Publication breakdown — distinct sources + item counts */}
            {publicationRows.length > 0 && (
              <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-3">
                  Publication breakdown
                </div>
                <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]/50 pb-2 border-b border-[var(--border)]/60">
                  <span>Publication</span>
                  <span>Items</span>
                </div>
                <div className="divide-y divide-[var(--border)]/40">
                  {publicationRows.map(([pub, count]) => (
                    <div key={pub} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-[var(--text-primary)]">{pub}</span>
                      <span className="text-sm text-[var(--text-secondary)] tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Angle map — chips of the conversation's coverage angles. We
               surface dominantTopics ∪ angleMap so the user gets the full
               set of topical lenses without seeing duplicates. */}
            {((conversation.angleMap || []).length > 0 || (conversation.dominantTopics || []).length > 0) && (
              <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-3">
                  Angle map
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set([
                    ...(conversation.angleMap || []),
                    ...(conversation.dominantTopics || []),
                  ])).map((t, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--navy)] text-[var(--text-secondary)]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dominant entities — kept from the previous Coverage tab because
               they're useful and not duplicated by the dashboard above. */}
            {conversation.dominantEntities && conversation.dominantEntities.length > 0 && (
              <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-3">
                  Dominant entities
                </div>
                <div className="flex flex-wrap gap-2">
                  {conversation.dominantEntities.map((e, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Underlying items — links to the actual articles */}
            {items.length > 0 && (
              <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
                <div className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-3">
                  Underlying items
                </div>
                <div className="space-y-2">
                  {items.map((it) => (
                    <a
                      key={it.signalAnalysisId}
                      href={it.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-[var(--navy)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--accent)]/40 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug flex-1">
                          {it.title}
                        </h4>
                        <ExternalLink className="w-3.5 h-3.5 text-[var(--text-secondary)]/40 flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]/70">
                        <span>{it.source}</span>
                        {it.publishedAt && (
                          <>
                            <span>·</span>
                            <span>{new Date(it.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </>
                        )}
                        <span>·</span>
                        <span className="uppercase tracking-wider">{it.role}</span>
                      </div>
                      {it.snippet && (
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mt-1.5">
                          {it.snippet}
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Feedback widget — always visible regardless of tab */}
      <div className="mt-10 pt-6 border-t border-[var(--border)]">
        {feedbackSent ? (
          <div className="text-center text-sm text-[var(--text-secondary)]">
            {feedbackSent === 'helpful'
              ? 'Thanks — noted. We\'ll weight similar conversations more highly.'
              : 'Got it. This conversation has been archived and we\'ll use the feedback to improve clustering.'}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Was this conversation useful?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <FeedbackButton
                onClick={() => handleFeedback('helpful')}
                disabled={feedbackSubmitting}
                icon={ThumbsUp}
                label="Helpful"
                tone="positive"
              />
              <FeedbackButton
                onClick={() => handleFeedback('not_relevant')}
                disabled={feedbackSubmitting}
                icon={ThumbsDown}
                label="Not relevant"
              />
              <FeedbackButton
                onClick={() => handleFeedback('wrong_cluster')}
                disabled={feedbackSubmitting}
                icon={Shuffle}
                label="Wrong cluster"
              />
              <FeedbackButton
                onClick={() => handleFeedback('low_quality')}
                disabled={feedbackSubmitting}
                icon={Archive}
                label="Low quality"
              />
            </div>
          </div>
        )}
      </div>

      {/* Company View tab */}
      {activeTab === 'company-view' && i && (
        <div className="space-y-6">
          <Section label="Narrative fit" text={i.narrativeFit} primary />

          {i.commercialImplications.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-3">
                Commercial implications
              </div>
              <div className="space-y-2">
                {i.commercialImplications.map((impl, idx) => (
                  <div key={idx} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] leading-relaxed">
                    {impl}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
            <Section label="Confidence" text={`${i.confidenceLevel.toUpperCase()} — ${i.confidenceReason}`} />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, text, primary = false }: { label: string; text: string; primary?: boolean }) {
  if (!text) return null;
  return (
    <div className={primary ? 'bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5' : ''}>
      <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-2">
        {label}
      </div>
      <p className="text-sm text-[var(--text-primary)] leading-relaxed">{text}</p>
    </div>
  );
}

/**
 * Solid-pill score badge per the redesign mockup. Each pill carries a tonal
 * background tied to the value (emerald = High/Critical, amber = Rising/
 * Moderate, blue = Medium, slate = Low). Label sits above the value.
 */
function ScoreBadge({ label, entry }: { label: string; entry: ScoreEntry }) {
  const color = (() => {
    const l = (entry.label || '').toLowerCase();
    // Critical is bigger than High — call it out in red.
    if (l.includes('critical')) {
      return {
        wrap: 'bg-red-500/10 border-red-500/30',
        label: 'text-red-300/80',
        value: 'text-red-400',
      };
    }
    // High / Very high
    if (l.includes('very high') || l.includes('high') || l.includes('strong')) {
      return {
        wrap: 'bg-emerald-500/10 border-emerald-500/30',
        label: 'text-emerald-300/80',
        value: 'text-emerald-400',
      };
    }
    // Saturation Over-saturated is bad — red
    if (l.includes('over-saturat')) {
      return {
        wrap: 'bg-red-500/10 border-red-500/30',
        label: 'text-red-300/80',
        value: 'text-red-400',
      };
    }
    // Rising / Emerging / Moderate — amber
    if (l.includes('rising') || l.includes('accelerating') || l.includes('emerging') || l.includes('moderate')) {
      return {
        wrap: 'bg-amber-500/10 border-amber-500/30',
        label: 'text-amber-300/80',
        value: 'text-amber-400',
      };
    }
    // Medium
    if (l.includes('medium') || l.includes('recurring')) {
      return {
        wrap: 'bg-blue-500/10 border-blue-500/30',
        label: 'text-blue-300/80',
        value: 'text-blue-400',
      };
    }
    // Low / Fading / Stable
    return {
      wrap: 'bg-[var(--navy-light)] border-[var(--border)]',
      label: 'text-[var(--text-secondary)]/60',
      value: 'text-[var(--text-secondary)]',
    };
  })();
  return (
    <div className={`rounded-md border ${color.wrap} px-3 py-2`} title={entry.explanation}>
      <div className={`text-[9px] font-bold uppercase tracking-widest leading-none mb-1.5 ${color.label}`}>
        {label}
      </div>
      <div className={`text-sm font-semibold leading-none ${color.value}`}>
        {entry.label || '—'}
      </div>
    </div>
  );
}

/**
 * Coverage Map stat tile — large number above a small label, per the
 * dashboard mockup. The number reads at a glance; the label sits below.
 */
function CoverageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 text-center">
      <div className="text-3xl font-bold text-[var(--text-primary)] tabular-nums leading-none mb-1.5">
        {value}
      </div>
      <div className="text-[11px] text-[var(--text-secondary)]/70">{label}</div>
    </div>
  );
}

function FeedbackButton({
  onClick, disabled, icon: Icon, label, tone = 'neutral',
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: 'positive' | 'neutral';
}) {
  const styles = tone === 'positive'
    ? 'hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'
    : 'hover:bg-[var(--navy-lighter)] hover:text-[var(--text-primary)]';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--navy-light)] border border-[var(--border)] rounded-md transition-colors disabled:opacity-50 ${styles}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
