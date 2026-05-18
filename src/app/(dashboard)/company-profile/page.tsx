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
import { useEffect, useState } from 'react';
import { Building2, Loader2, Pencil, X, Plus, Check } from 'lucide-react';

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

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [draft, setDraft] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const demo = url.searchParams.get('companyId') === 'demo';
    setDemoMode(demo);
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
            placeholder="e.g. Reinsurance Intelligence Technology" />
          <FieldRow label="One-line description" editing={isEditing('overview')}
            value={data.oneLineDescription}
            onChange={(v) => updateField('oneLineDescription', v)}
            placeholder="The single sentence that explains what you do" multiline />
          <FieldRow label="Product description" editing={isEditing('overview')}
            value={data.productDescription}
            onChange={(v) => updateField('productDescription', v)}
            placeholder="A fuller description of the product" multiline />
        </SectionCard>

        {/* Section 2 — Narrative */}
        <SectionCard
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
            multiline tall />
          <FieldRow label="Enemy / problem frame" editing={isEditing('narrative')}
            value={data.enemyProblemFrame}
            onChange={(v) => updateField('enemyProblemFrame', v)}
            placeholder="The status quo or problem you're fighting against" multiline />
          <FieldRow label="Category language" editing={isEditing('narrative')}
            value={data.categoryLanguage}
            onChange={(v) => updateField('categoryLanguage', v)}
            placeholder="The category you want to own (e.g. 'placement intelligence')" multiline />
        </SectionCard>

        {/* Section 3 — ICP & Buyers */}
        <SectionCard
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
            placeholder="e.g. Reinsurance, Lloyd's market" />
          <TagListRow label="Target geographies" editing={isEditing('icp')}
            value={data.targetGeographies}
            onChange={(v) => updateField('targetGeographies', v)}
            placeholder="e.g. UK, US, Bermuda" />
          <TagListRow label="Target customers" editing={isEditing('icp')}
            value={data.targetCustomers}
            onChange={(v) => updateField('targetCustomers', v)}
            placeholder="e.g. Reinsurance brokers, Cedents" />
          <TagListRow label="Buyer personas" editing={isEditing('icp')}
            value={data.buyerPersonas}
            onChange={(v) => updateField('buyerPersonas', v)}
            placeholder="Full persona descriptions (one per chip)" />
          <TagListRow label="Named customers" editing={isEditing('icp')}
            value={data.namedCustomers}
            onChange={(v) => updateField('namedCustomers', v)}
            placeholder="Public references" />
          <TagListRow label="Named partners" editing={isEditing('icp')}
            value={data.namedPartners}
            onChange={(v) => updateField('namedPartners', v)}
            placeholder="Partner organisations" />
        </SectionCard>

        {/* Section 4 — Commercial context */}
        <SectionCard
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
            placeholder="What makes you different" />
          <TagListRow label="Proof points" editing={isEditing('commercial')}
            value={data.proofPoints}
            onChange={(v) => updateField('proofPoints', v)}
            placeholder="Evidence we can point to" />
          <TagListRow label="Claims made" editing={isEditing('commercial')}
            value={data.claimsMade}
            onChange={(v) => updateField('claimsMade', v)}
            placeholder="Things you actively claim publicly" />
          <TagListRow label="Claims avoided" editing={isEditing('commercial')}
            value={data.claimsAvoided}
            onChange={(v) => updateField('claimsAvoided', v)}
            placeholder="Things you deliberately don't claim" />
          <TagListRow label="Commercial hooks" editing={isEditing('commercial')}
            value={data.commercialHooks}
            onChange={(v) => updateField('commercialHooks', v)}
            placeholder="Hooks that land in sales conversations" />
          <TagListRow label="Likely objections" editing={isEditing('commercial')}
            value={data.likelyObjections}
            onChange={(v) => updateField('likelyObjections', v)}
            placeholder="Objections buyers raise" />
          <TagListRow label="Products" editing={isEditing('commercial')}
            value={data.products}
            onChange={(v) => updateField('products', v)}
            placeholder="Your products / platform pieces" />
          <TagListRow label="Workflows" editing={isEditing('commercial')}
            value={data.workflows}
            onChange={(v) => updateField('workflows', v)}
            placeholder="Workflows your product touches" />
        </SectionCard>

        {/* Section 5 — Intelligence focus */}
        <SectionCard
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
            placeholder="Topics we should weight highly" />
          <TagListRow label="Excluded topics" editing={isEditing('intelligence')}
            value={data.excludedTopics}
            onChange={(v) => updateField('excludedTopics', v)}
            placeholder="Topics to ignore" />
          <TagListRow label="Insurance segments" editing={isEditing('intelligence')}
            value={data.insuranceSegments}
            onChange={(v) => updateField('insuranceSegments', v)}
            placeholder="Specialty / reinsurance / commercial / etc." />
          <TagListRow label="Regulatory areas" editing={isEditing('intelligence')}
            value={data.regulatoryAreas}
            onChange={(v) => updateField('regulatoryAreas', v)}
            placeholder="Regulators / regulations to track" />
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  title, subtitle, editing, onEdit, onCancel, onSave, saving, children,
}: {
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
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
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
  label, value, editing, onChange, placeholder, multiline = false, tall = false,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  tall?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-1.5">
        {label}
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
          {value || <span className="text-[var(--text-secondary)]/50">— not set</span>}
        </p>
      )}
    </div>
  );
}

function TagListRow({
  label, value, editing, onChange, placeholder,
}: {
  label: string;
  value: string[];
  editing: boolean;
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };

  return (
    <div>
      <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase mb-1.5">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {value.length === 0 && !editing && (
          <span className="text-sm text-[var(--text-secondary)]/50">— not set</span>
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
