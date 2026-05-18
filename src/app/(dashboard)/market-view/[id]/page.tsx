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
  ArrowLeft, ChevronRight, Loader2, ExternalLink,
  Sparkles, FileText, Hash,
} from 'lucide-react';

type ConfidenceLevel = 'low' | 'moderate' | 'high';

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

type Tab = 'story' | 'coverage' | 'actions' | 'company-view';

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

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2 leading-tight">
          {conversation.title}
        </h1>
        {conversation.marketSignal && (
          <p className="text-sm text-[var(--text-secondary)]">{conversation.marketSignal}</p>
        )}
      </header>

      {/* Score bar */}
      {conversation.score && (
        <div className="flex flex-wrap gap-2 mb-6">
          <ScoreBadge label="Relevance" entry={conversation.score.companyRelevance} />
          <ScoreBadge label="Momentum" entry={conversation.score.momentum} />
          <ScoreBadge label="Attention" entry={conversation.score.marketAttention} />
          <ScoreBadge label="Saturation" entry={conversation.score.saturation} />
          <ScoreBadge label="Quality" entry={conversation.score.coverageQuality} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] mb-6">
        {(['story', 'actions', 'coverage', 'company-view'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-[var(--accent)] border-[var(--accent)]'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
            }`}
          >
            {tab === 'story' ? 'Story' : tab === 'actions' ? 'Recommended Actions' : tab === 'coverage' ? 'Coverage' : 'Company View'}
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

      {/* Coverage tab */}
      {activeTab === 'coverage' && (
        <div className="space-y-6">
          {conversation.evidenceSummary && (
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Items" value={String(conversation.evidenceSummary.itemCount)} />
              <StatTile label="Sources" value={String(conversation.evidenceSummary.sourceCount)} />
              <StatTile label="Last update" value={conversation.evidenceSummary.lastUpdated} />
            </div>
          )}

          {conversation.dominantTopics && conversation.dominantTopics.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-2">
                Dominant topics
              </div>
              <div className="flex flex-wrap gap-2">
                {conversation.dominantTopics.map((t, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-[var(--navy-light)] border border-[var(--border)] text-[var(--text-primary)]">
                    <Hash className="w-3 h-3 opacity-60" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {conversation.dominantEntities && conversation.dominantEntities.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-2">
                Dominant entities
              </div>
              <div className="flex flex-wrap gap-2">
                {conversation.dominantEntities.map((e, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {conversation.items && conversation.items.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-3">
                Underlying items
              </div>
              <div className="space-y-2">
                {conversation.items.map((it) => (
                  <a
                    key={it.signalAnalysisId}
                    href={it.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-[var(--navy-light)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--accent)]/40 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug flex-1">
                        {it.title}
                      </h4>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--text-secondary)]/40 flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]/70 mb-1">
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
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                        {it.snippet}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

function ScoreBadge({ label, entry }: { label: string; entry: ScoreEntry }) {
  const color = (() => {
    const l = entry.label.toLowerCase();
    if (l.includes('high') || l.includes('strong') || l.includes('very high'))
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (l.includes('rising') || l.includes('accelerating') || l.includes('emerging') || l.includes('moderate'))
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (l.includes('over-saturat'))
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (l.includes('low') || l.includes('fading') || l.includes('declining'))
      return 'bg-[var(--navy-lighter)] text-[var(--text-secondary)] border-[var(--border)]';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  })();
  return (
    <div className={`inline-flex flex-col px-3 py-1.5 rounded-md border ${color} min-w-0`}>
      <span className="text-[9px] font-medium uppercase tracking-wider opacity-70 leading-none mb-0.5">{label}</span>
      <span className="text-xs font-semibold leading-none">{entry.label}</span>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]/60 mb-1">{label}</div>
      <div className="text-lg font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
