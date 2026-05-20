'use client';
/**
 * Company Profile — the system's working understanding of the user's company.
 * Replaces the Narrative page in the new IA.
 *
 * Sections:
 *   1. Overview        — category, one-line, product description
 *   2. Narrative       — core narrative, problem frame, category language
 *   3. ICP & buyers    — target customers, buyer personas, named customers
 *   4. Commercial      — differentiation, proof points, claims made/avoided, hooks, objections
 *   5. Intelligence    — priority topics, excluded topics, insurance segments, regulatory areas
 *
 * Edit flow:
 *   View → Edit → Save (PATCH /api/company-profile)
 *   Each section can be edited independently — TagList for array fields,
 *   <textarea> for string fields.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, Pencil, X, Plus, Check, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

interface CompanyProfile {
  id: string;
  companyId: string;
  category: string;
  oneLineDescription: string;
  productDescription: string;
  targetMarkets: string[];
  targetGeographies: string[];
  targetCustomers: string[];
  buyerPersonas: string[];
  products: string[];
  workflows: string[];
  coreNarrative: string;
  enemyProblemFrame: string;
  categoryLanguage: string;
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
  scanDate: string | null;
  updatedAt: string;
}

type EditMode = 'overview' | 'narrative' | 'icp' | 'commercial' | 'intelligence' | null;

// Section labels keyed to EditMode so the review-banner can point users at
// the section that contains a particular missing field.
const SECTION_LABELS: Record<Exclude<EditMode, null>, string> = {
  overview: 'Overview',
  narrative: 'Narrative & positioning',
  icp: 'ICP & buyers',
  commercial: 'Commercial context',
  intelligence: 'Intelligence focus',
};

// Map each profile field onto its parent section so we can summarise gaps
// by section in the banner.
const FIELD_SECTIONS: Record<string, Exclude<EditMode, null>> = {
  category: 'overview', oneLineDescription: 'overview', productDescription: 'overview',
  coreNarrative: 'narrative', enemyProblemFrame: 'narrative', categoryLanguage: 'narrative',
  targetMarkets: 'icp', targetGeographies: 'icp', targetCustomers: 'icp',
  buyerPersonas: 'icp', namedCustomers: 'icp', namedPartners: 'icp',
  differentiation: 'commercial', proofPoints: 'commercial', claimsMade: 'commercial',
  claimsAvoided: 'commercial', commercialHooks: 'commercial', likelyObjections: 'commercial',
  products: 'commercial', workflows: 'commercial',
  priorityTopics: 'intelligence', excludedTopics: 'intelligence',
  insuranceSegments: 'intelligence', regulatoryAreas: 'intelligence',
};

// The fields we expect users to fill in for a complete profile. Confidence/
// scanDate/id/timestamps are not user-fillable so they're excluded.
const REVIEWABLE_FIELDS: (keyof CompanyProfile)[] = [
  'category', 'oneLineDescription', 'productDescription',
  'coreNarrative', 'enemyProblemFrame', 'categoryLanguage',
  'targetMarkets', 'targetGeographies', 'targetCustomers', 'buyerPersonas',
  'namedCustomers', 'namedPartners',
  'differentiation', 'proofPoints', 'claimsMade', 'claimsAvoided',
  'commercialHooks', 'likelyObjections', 'products', 'workflows',
  'priorityTopics', 'excludedTopics', 'insuranceSegments', 'regulatoryAreas',
];

function isFieldEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [draft, setDraft] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [preview, setPreview] = useState(false);
  // When the user lands here straight from /onboarding we show a "review
  // what we found" banner. Dismissable so it doesn't nag on every revisit.
  const [fromOnboarding, setFromOnboarding] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const demo = url.searchParams.get('companyId') === 'demo';
    setDemoMode(demo);
    setFromOnboarding(url.searchParams.get('from') === 'onboarding');
    const fetchUrl = demo ? '/api/company-profile?companyId=demo' : '/api/company-profile';
    fetch(fetchUrl)
      .then(r => r.json())
      .then(data => {
        setProfile(data.profile);
        setDraft(data.profile);
        setPreview(Boolean(data.preview));
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  // Which reviewable fields are still empty? Used for both the banner count
  // and the in-place amber highlight on "— not set".
  const missingFields = useMemo(() => {
    if (!profile) return new Set<string>();
    return new Set(
      REVIEWABLE_FIELDS.filter(field => isFieldEmpty(profile[field])).map(String)
    );
  }, [profile]);

  // Group the missing fields by section so the banner can say
  // "3 in ICP, 5 in Commercial" instead of dumping 15 field names.
  const missingBySection = useMemo(() => {
    const acc: Record<Exclude<EditMode, null>, number> = {
      overview: 0, narrative: 0, icp: 0, commercial: 0, intelligence: 0,
    };
    for (const field of missingFields) {
      const section = FIELD_SECTIONS[field];
      if (section) acc[section] += 1;
    }
    return acc;
  }, [missingFields]);

  // Onboarding banner shows only when ?from=onboarding is set, we have a
  // real (not demo) profile, and the user hasn't dismissed it this session.
  const showReviewBanner = fromOnboarding && !preview && !bannerDismissed && missingFields.size > 0;
  const totalReviewable = REVIEWABLE_FIELDS.length;
  const filledCount = totalReviewable - missingFields.size;
  const completionPct = Math.round((filledCount / totalReviewable) * 100);

  const startEdit = (section: EditMode) => {
    setDraft(profile);
    setEditMode(section);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setEditMode(null);
  };

  const saveEdit = async () => {
    if (!draft) return;
    if (demoMode) {
      // Demo mode: skip the network call and just close
      setProfile(draft);
      setEditMode(null);
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/company-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await r.json();
      if (data?.profile) {
        setProfile(data.profile);
        setDraft(data.profile);
        setEditMode(null);
      } else if (data?.error) {
        alert(data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof CompanyProfile>(field: K, value: CompanyProfile[K]) => {
    if (!draft) return;
    setDraft({ ...draft, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="max-w-3xl mx-auto p-8 mt-16 text-center">
        <Building2 className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-6 opacity-60" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Set up your Company Profile</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Run onboarding to generate your Company Profile from your website.
        </p>
        <a href="/onboarding" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Start onboarding
        </a>
      </div>
    );
  }

  const isEditing = (section: EditMode) => editMode === section;
  const data = isEditing(null) ? profile : draft;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {preview && (
        <div className="mb-6 p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-sm text-[var(--accent)]">
          Preview mode — showing the Supercede demo. Set up your own profile to edit.
        </div>
      )}

      {showReviewBanner && (
        <div className="mb-6 rounded-xl border border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/10 via-[var(--navy-light)] to-[var(--purple)]/10 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  We drafted your profile from your website. Review and fill in what we couldn't find.
                </h2>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="text-[var(--text-secondary)]/60 hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                The richer your profile, the better we score signals, cluster conversations, and draft content in your voice. <strong className="text-[var(--text-primary)]">{filledCount} of {totalReviewable} fields filled ({completionPct}%)</strong> — {missingFields.size} still to review.
              </p>

              {/* Progress bar */}
              <div className="h-1.5 bg-[var(--navy)] rounded overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] transition-all"
                  style={{ width: `${Math.max(completionPct, 4)}%` }}
                />
              </div>

              {/* Missing-by-section chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(Object.entries(missingBySection) as [Exclude<EditMode, null>, number][]).map(([section, count]) => {
                  if (count === 0) return null;
                  return (
                    <button
                      key={section}
                      onClick={() => {
                        const el = document.getElementById(`section-${section}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          startEdit(section);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {SECTION_LABELS[section]} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
                <span className="text-[var(--text-secondary)]">When you're done:</span>
                <Link
                  href="/market-brief"
                  className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline"
                >
                  Go to Market Brief <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">
          Company Profile
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          The system's working understanding of your company. Everything you edit here flows into how we score signals, cluster conversations, and draft content.
        </p>
        <div className="flex items-center gap-3 mt-4 text-xs text-[var(--text-secondary)]/70">
          <span>Last updated {new Date(profile.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {profile.confidence > 0 && (
            <>
              <span>·</span>
              <span>Confidence {Math.round(profile.confidence * 100)}%</span>
            </>
          )}
        </div>
      </header>

      <div className="space-y-6">
        {/* Section 1 — Overview */}
        <SectionCard
          id="section-overview"
          title="Overview"
          subtitle="What your company does, in plain English."
          editing={isEditing('overview')}
          onEdit={() => startEdit('overview')}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <FieldRow label="Category" editing={isEditing('overview')}
            value={data.category}
            onChange={(v) => updateField('category', v)}
            placeholder="e.g. Reinsurance Intelligence Technology"
            missing={fromOnboarding && missingFields.has('category')} />
          <FieldRow label="One-line description" editing={isEditing('overview')}
            value={data.oneLineDescription}
            onChange={(v) => updateField('oneLineDescription', v)}
            placeholder="The single sentence that explains what you do" multiline
            missing={fromOnboarding && missingFields.has('oneLineDescription')} />
          <FieldRow label="Product description" editing={isEditing('overview')}
            value={data.productDescription}
            onChange={(v) => updateField('productDescription', v)}
            placeholder="A fuller description of the product" multiline
            missing={fromOnboarding && missingFields.has('productDescription')} />
        </SectionCard>

        {/* Section 2 — Narrative */}
        <SectionCard
          id="section-narrative"
          title="Narrative & positioning"
          subtitle="The story we tell to score signals against."
          editing={isEditing('narrative')}
          onEdit={() => startEdit('narrative')}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <FieldRow label="Core narrative" editing={isEditing('narrative')}
            value={data.coreNarrative}
            onChange={(v) => updateField('coreNarrative', v)}
            placeholder="The narrative document or its core thesis"
            multiline tall
            missing={fromOnboarding && missingFields.has('coreNarrative')} />
          <FieldRow label="Enemy / problem frame" editing={isEditing('narrative')}
            value={data.enemyProblemFrame}
            onChange={(v) => updateField('enemyProblemFrame', v)}
            placeholder="The status quo or problem you're fighting against" multiline
            missing={fromOnboarding && missingFields.has('enemyProblemFrame')} />
          <FieldRow label="Category language" editing={isEditing('narrative')}
            value={data.categoryLanguage}
            onChange={(v) => updateField('categoryLanguage', v)}
            placeholder="The category you want to own (e.g. 'placement intelligence')" multiline
            missing={fromOnboarding && missingFields.has('categoryLanguage')} />
        </SectionCard>

        {/* Section 3 — ICP & Buyers */}
        <SectionCard
          id="section-icp"
          title="ICP & buyers"
          subtitle="Who you're selling to."
          editing={isEditing('icp')}
          onEdit={() => startEdit('icp')}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <TagListRow label="Target markets" editing={isEditing('icp')}
            value={data.targetMarkets}
            onChange={(v) => updateField('targetMarkets', v)}
            placeholder="e.g. Reinsurance, Lloyd's market"
            missing={fromOnboarding && missingFields.has('targetMarkets')} />
          <TagListRow label="Target geographies" editing={isEditing('icp')}
            value={data.targetGeographies}
            onChange={(v) => updateField('targetGeographies', v)}
            placeholder="e.g. UK, US, Bermuda"
            missing={fromOnboarding && missingFields.has('targetGeographies')} />
          <TagListRow label="Target customers" editing={isEditing('icp')}
            value={data.targetCustomers}
            onChange={(v) => updateField('targetCustomers', v)}
            placeholder="e.g. Reinsurance brokers, Cedents"
            missing={fromOnboarding && missingFields.has('targetCustomers')} />
          <TagListRow label="Buyer personas" editing={isEditing('icp')}
            value={data.buyerPersonas}
            onChange={(v) => updateField('buyerPersonas', v)}
            placeholder="Full persona descriptions (one per chip)"
            missing={fromOnboarding && missingFields.has('buyerPersonas')} />
          <TagListRow label="Named customers" editing={isEditing('icp')}
            value={data.namedCustomers}
            onChange={(v) => updateField('namedCustomers', v)}
            placeholder="Public references"
            missing={fromOnboarding && missingFields.has('namedCustomers')} />
          <TagListRow label="Named partners" editing={isEditing('icp')}
            value={data.namedPartners}
            onChange={(v) => updateField('namedPartners', v)}
            placeholder="Partner organisations"
            missing={fromOnboarding && missingFields.has('namedPartners')} />
        </SectionCard>

        {/* Section 4 — Commercial context */}
        <SectionCard
          id="section-commercial"
          title="Commercial context"
          subtitle="The arguments you make, the proof you bring, and the objections you face."
          editing={isEditing('commercial')}
          onEdit={() => startEdit('commercial')}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <TagListRow label="Differentiation" editing={isEditing('commercial')}
            value={data.differentiation}
            onChange={(v) => updateField('differentiation', v)}
            placeholder="What makes you different"
            missing={fromOnboarding && missingFields.has('differentiation')} />
          <TagListRow label="Proof points" editing={isEditing('commercial')}
            value={data.proofPoints}
            onChange={(v) => updateField('proofPoints', v)}
            placeholder="Evidence we can point to"
            missing={fromOnboarding && missingFields.has('proofPoints')} />
          <TagListRow label="Claims made" editing={isEditing('commercial')}
            value={data.claimsMade}
            onChange={(v) => updateField('claimsMade', v)}
            placeholder="Things you actively claim publicly"
            missing={fromOnboarding && missingFields.has('claimsMade')} />
          <TagListRow label="Claims avoided" editing={isEditing('commercial')}
            value={data.claimsAvoided}
            onChange={(v) => updateField('claimsAvoided', v)}
            placeholder="Things you deliberately don't claim"
            missing={fromOnboarding && missingFields.has('claimsAvoided')} />
          <TagListRow label="Commercial hooks" editing={isEditing('commercial')}
            value={data.commercialHooks}
            onChange={(v) => updateField('commercialHooks', v)}
            placeholder="Hooks that land in sales conversations"
            missing={fromOnboarding && missingFields.has('commercialHooks')} />
          <TagListRow label="Likely objections" editing={isEditing('commercial')}
            value={data.likelyObjections}
            onChange={(v) => updateField('likelyObjections', v)}
            placeholder="Objections buyers raise"
            missing={fromOnboarding && missingFields.has('likelyObjections')} />
          <TagListRow label="Products" editing={isEditing('commercial')}
            value={data.products}
            onChange={(v) => updateField('products', v)}
            placeholder="Your products / platform pieces"
            missing={fromOnboarding && missingFields.has('products')} />
          <TagListRow label="Workflows" editing={isEditing('commercial')}
            value={data.workflows}
            onChange={(v) => updateField('workflows', v)}
            placeholder="Workflows your product touches"
            missing={fromOnboarding && missingFields.has('workflows')} />
        </SectionCard>

        {/* Section 5 — Intelligence focus */}
        <SectionCard
          id="section-intelligence"
          title="Intelligence focus"
          subtitle="What topics we should prioritise, ignore, and watch for regulatory exposure."
          editing={isEditing('intelligence')}
          onEdit={() => startEdit('intelligence')}
          onCancel={cancelEdit}
          onSave={saveEdit}
          saving={saving}
        >
          <TagListRow label="Priority topics" editing={isEditing('intelligence')}
            value={data.priorityTopics}
            onChange={(v) => updateField('priorityTopics', v)}
            placeholder="Topics we should weight highly"
            missing={fromOnboarding && missingFields.has('priorityTopics')} />
          <TagListRow label="Excluded topics" editing={isEditing('intelligence')}
            value={data.excludedTopics}
            onChange={(v) => updateField('excludedTopics', v)}
            placeholder="Topics to ignore"
            missing={fromOnboarding && missingFields.has('excludedTopics')} />
          <TagListRow label="Insurance segments" editing={isEditing('intelligence')}
            value={data.insuranceSegments}
            onChange={(v) => updateField('insuranceSegments', v)}
            placeholder="Specialty / reinsurance / commercial / etc."
            missing={fromOnboarding && missingFields.has('insuranceSegments')} />
          <TagListRow label="Regulatory areas" editing={isEditing('intelligence')}
            value={data.regulatoryAreas}
            onChange={(v) => updateField('regulatoryAreas', v)}
            placeholder="Regulators / regulations to track"
            missing={fromOnboarding && missingFields.has('regulatoryAreas')} />
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  id, title, subtitle, editing, onEdit, onCancel, onSave, saving, children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden scroll-mt-6">
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--border)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-md transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({
  label, value, editing, onChange, placeholder, multiline = false, tall = false, missing = false,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  tall?: boolean;
  /** When true (typically from /onboarding handoff) AND the value is empty,
   *  render the empty state with an amber tint so the user can spot gaps. */
  missing?: boolean;
}) {
  const isEmpty = !value || value.trim().length === 0;
  const showMissingHint = missing && isEmpty && !editing;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase">
          {label}
        </div>
        {showMissingHint && (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-400 uppercase tracking-wider">
            <AlertCircle className="w-2.5 h-2.5" />
            Fill in
          </span>
        )}
      </div>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={tall ? 8 : 3}
            className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-vertical"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        )
      ) : (
        <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
          {value || (
            <span className={showMissingHint ? 'text-amber-400/80' : 'text-[var(--text-secondary)]/50'}>
              — not set
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function TagListRow({
  label, value, editing, onChange, placeholder, missing = false,
}: {
  label: string;
  value: string[];
  editing: boolean;
  onChange: (v: string[]) => void;
  placeholder?: string;
  /** When true (typically from /onboarding handoff) AND the list is empty,
   *  render the empty state with an amber tint so the user can spot gaps. */
  missing?: boolean;
}) {
  const [input, setInput] = useState('');
  const isEmpty = value.length === 0;
  const showMissingHint = missing && isEmpty && !editing;

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase">
          {label}
        </div>
        {showMissingHint && (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-400 uppercase tracking-wider">
            <AlertCircle className="w-2.5 h-2.5" />
            Fill in
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {value.length === 0 && !editing && (
          <span className={`text-sm ${showMissingHint ? 'text-amber-400/80' : 'text-[var(--text-secondary)]/50'}`}>— not set</span>
        )}
        {value.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]"
          >
            <span>{tag}</span>
            {editing && (
              <button
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                className="hover:text-[var(--text-primary)] transition-colors"
                aria-label="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {editing && (
        <div className="flex items-center gap-1.5 mt-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={placeholder}
            className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={addTag}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      )}
    </div>
  );
}
