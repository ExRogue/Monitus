'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  Settings,
  Building2,
  Palette,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  User,
  LogOut,
  AlertTriangle,
  Link2,
  Linkedin,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

interface Company {
  id: string;
  name: string;
  type: string;
  niche: string;
  description: string;
  industry?: string;
  target_audience?: string;
  brand_voice: string;
  brand_tone: string;
  compliance_frameworks: string;
}

interface Branding {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_css: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

interface SaveStatus {
  type: 'idle' | 'success' | 'error';
  message?: string;
}

const COMPANY_TYPES = [
  { value: 'mga', label: 'Managing General Agent (MGA)' },
  { value: 'insurtech', label: 'Insurtech' },
  { value: 'broker', label: 'Insurance Broker' },
  { value: 'insurer', label: 'Insurer' },
  { value: 'reinsurer', label: 'Reinsurer' },
  { value: 'carrier', label: 'Carrier' },
  { value: 'other', label: 'Other' },
];

const BRAND_VOICES = [
  { value: 'professional', label: 'Professional', desc: 'Authoritative, polished, business-focused' },
  { value: 'friendly', label: 'Friendly', desc: 'Approachable, conversational, accessible' },
  { value: 'authoritative', label: 'Thought Leader', desc: 'Insightful, forward-looking, expert' },
  { value: 'technical', label: 'Technical', desc: 'Precise, data-driven, analytical' },
  { value: 'conversational', label: 'Conversational', desc: 'Casual, relatable, human-centred' },
  { value: 'challenger', label: 'Challenger', desc: 'Bold, disruptive, category-defining' },
];

const COMPLIANCE_OPTIONS = [
  { id: 'FCA', label: 'FCA', desc: 'Financial Conduct Authority (UK)' },
  { id: 'GDPR', label: 'GDPR', desc: 'General Data Protection Regulation (EU/UK)' },
  { id: 'Solvency II', label: 'Solvency II', desc: 'EU/UK prudential regulation for insurers & reinsurers' },
  { id: 'State DOI', label: 'State DOI', desc: 'State Department of Insurance (US)' },
  { id: 'FTC', label: 'FTC', desc: 'Federal Trade Commission (US)' },
  { id: 'NAIC', label: 'NAIC', desc: 'National Association of Insurance Commissioners (US)' },
  { id: 'APRA', label: 'APRA', desc: 'Australian Prudential Regulation Authority' },
  { id: 'TCFD', label: 'TCFD', desc: 'Task Force on Climate-related Financial Disclosures' },
];

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ type: 'idle' });
  // hasChanges is derived via useMemo below
  const [activeTab, setActiveTab] = useState('account');
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [linkedInLoading, setLinkedInLoading] = useState(false);

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('mga');
  const [niche, setNiche] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [description, setDescription] = useState('');
  const [brandVoice, setBrandVoice] = useState('professional');
  const [brandTone, setBrandTone] = useState('');
  const [complianceFrameworks, setComplianceFrameworks] = useState<string[]>(['FCA']);

  // Branding fields
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#14B8A6');
  const [secondaryColor, setSecondaryColor] = useState('#5EEAD4');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [customCss, setCustomCss] = useState('');
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  // Track original values for change detection
  const [originalValues, setOriginalValues] = useState({
    companyName: '',
    companyType: 'mga',
    niche: '',
    industry: '',
    targetAudience: '',
    description: '',
    brandVoice: 'professional',
    brandTone: '',
    complianceFrameworks: ['FCA'],
    logoUrl: '',
    primaryColor: '#14B8A6',
    secondaryColor: '#5EEAD4',
    accentColor: '#10B981',
    customCss: '',
  });

  const hasChanges = useMemo(() =>
    companyName !== originalValues.companyName ||
    companyType !== originalValues.companyType ||
    niche !== originalValues.niche ||
    industry !== originalValues.industry ||
    targetAudience !== originalValues.targetAudience ||
    description !== originalValues.description ||
    brandVoice !== originalValues.brandVoice ||
    brandTone !== originalValues.brandTone ||
    JSON.stringify(complianceFrameworks) !== JSON.stringify(originalValues.complianceFrameworks) ||
    logoUrl !== originalValues.logoUrl ||
    primaryColor !== originalValues.primaryColor ||
    secondaryColor !== originalValues.secondaryColor ||
    accentColor !== originalValues.accentColor ||
    customCss !== originalValues.customCss,
  [companyName, companyType, niche, industry, targetAudience, description, brandVoice, brandTone, complianceFrameworks, logoUrl, primaryColor, secondaryColor, accentColor, customCss, originalValues]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError(null);
        const [authRes, companyRes, brandingRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/company'),
          fetch('/api/company/branding'),
        ]);

        if (!authRes.ok) throw new Error('Failed to load user info');
        if (!companyRes.ok) throw new Error('Failed to load company settings');

        const authData = await authRes.json();
        const companyData = await companyRes.json();
        const brandingData = brandingRes.ok ? await brandingRes.json() : { branding: {} };

        if (authData.user) setUser(authData.user);

        if (companyData.company) {
          const c = companyData.company;
          const b = brandingData.branding || {};
          const newValues = {
            companyName: c.name || '',
            companyType: c.type || 'mga',
            niche: c.niche || '',
            industry: c.industry || '',
            targetAudience: c.target_audience || '',
            description: c.description || '',
            brandVoice: c.brand_voice || 'professional',
            brandTone: c.brand_tone || '',
            complianceFrameworks: (() => {
              try {
                const parsed = JSON.parse(c.compliance_frameworks || '["FCA"]');
                return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['FCA'];
              } catch {
                return ['FCA'];
              }
            })(),
            logoUrl: b.logo_url || '',
            primaryColor: b.primary_color || '#14B8A6',
            secondaryColor: b.secondary_color || '#5EEAD4',
            accentColor: b.accent_color || '#10B981',
            customCss: b.custom_css || '',
          };

          setCompanyName(newValues.companyName);
          setCompanyType(newValues.companyType);
          setNiche(newValues.niche);
          setIndustry(newValues.industry);
          setTargetAudience(newValues.targetAudience);
          setDescription(newValues.description);
          setBrandVoice(newValues.brandVoice);
          setBrandTone(newValues.brandTone);
          setComplianceFrameworks(newValues.complianceFrameworks);
          setLogoUrl(newValues.logoUrl);
          setPrimaryColor(newValues.primaryColor);
          setSecondaryColor(newValues.secondaryColor);
          setAccentColor(newValues.accentColor);
          setCustomCss(newValues.customCss);
          setOriginalValues(newValues);
          setBrandingLoaded(true);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load settings';
        setLoadError(message);
        console.error('Settings load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const validateForm = (): string | null => {
    if (!companyName.trim()) return 'Company name is required';
    if (!description.trim()) return 'Company description is required';
    if (complianceFrameworks.length === 0) return 'Select at least one compliance framework';
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setSaveStatus({ type: 'error', message: validationError });
      setTimeout(() => setSaveStatus({ type: 'idle' }), 4000);
      return;
    }

    setSaving(true);
    setSaveStatus({ type: 'idle' });

    try {
      const [companyRes, brandingRes] = await Promise.all([
        fetch('/api/company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: companyName,
            type: companyType,
            niche,
            industry,
            target_audience: targetAudience,
            description,
            brand_voice: brandVoice,
            brand_tone: brandTone,
            compliance_frameworks: complianceFrameworks,
          }),
        }),
        fetch('/api/company/branding', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logo_url: logoUrl,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            accent_color: accentColor,
            custom_css: customCss,
          }),
        }),
      ]);

      if (companyRes.ok && brandingRes.ok) {
        setOriginalValues({
          companyName,
          companyType,
          niche,
          industry,
          targetAudience,
          description,
          brandVoice,
          brandTone,
          complianceFrameworks,
          logoUrl,
          primaryColor,
          secondaryColor,
          accentColor,
          customCss,
        });
        setOriginalValues({ companyName, companyType, niche, industry, targetAudience, description, brandVoice, brandTone, complianceFrameworks, logoUrl, primaryColor, secondaryColor, accentColor, customCss });
        setSaveStatus({ type: 'success', message: 'Settings saved successfully' });
      } else {
        const failedRes = !companyRes.ok ? companyRes : brandingRes;
        const errorData = await failedRes.json().catch(() => ({}));
        setSaveStatus({
          type: 'error',
          message: errorData.message || errorData.error || 'Failed to save settings',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      setSaveStatus({ type: 'error', message });
      console.error('Save error:', error);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus({ type: 'idle' }), 4000);
    }
  };

  const toggleFramework = (id: string) => {
    setComplianceFrameworks((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      } else {
        console.error('Logout failed');
        // Still redirect after a brief delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even on network error
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-[var(--text-secondary)] mt-3">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="font-semibold text-[var(--text-primary)]">Failed to load settings</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-red-400 hover:text-red-300 font-medium underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Configure your company profile, brand voice, and compliance rules
          </p>
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges}
          className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <Save className="w-4 h-4 mr-2" />
          {hasChanges ? 'Save Changes' : 'No changes'}
        </Button>
      </div>

      {/* Save status toast */}
      {saveStatus.type !== 'idle' && (
        <div
          className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
            saveStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
          )}
          <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
            {saveStatus.message || (saveStatus.type === 'success' ? 'Settings saved successfully' : 'Failed to save settings')}
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-1 overflow-x-auto">
        {[
          { id: 'account', label: 'Account', icon: User },
          { id: 'company', label: 'Company', icon: Building2 },
          { id: 'voice', label: 'Brand Voice', icon: Settings },
          { id: 'compliance', label: 'Compliance', icon: Shield },
          { id: 'branding', label: 'Visual Branding', icon: Palette },
          { id: 'integrations', label: 'Integrations', icon: Link2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Account section */}
      {activeTab === 'account' && (
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Account</h2>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm sm:text-base">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] truncate">{user?.name || 'Unknown'}</p>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] truncate">{user?.email || ''}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Company profile section */}
      {activeTab === 'company' && (
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Company Profile</h2>
          {hasChanges && <Badge variant="purple" className="ml-auto text-xs">Unsaved</Badge>}
        </div>
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <Input
                id="companyName"
                label="Company name"
                placeholder="Acme Insurance"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              {!companyName.trim() && (
                <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Required field
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Company type
              </label>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              >
                {COMPANY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Input
              id="niche"
              label="Market niche"
              placeholder="e.g. Specialty lines, Cyber insurance"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
            <Input
              id="industry"
              label="Industry"
              placeholder="e.g. Financial services, InsurTech"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          <Input
            id="targetAudience"
            label="Target audience"
            placeholder="e.g. Brokers, MGAs, Enterprises"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Company description <span className="text-red-400">*</span>
            </label>
            <textarea
              placeholder="Brief description of your company, target market, and key differentiators..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            />
            {!description.trim() && (
              <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Required field
              </p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Brand voice section */}
      {activeTab === 'voice' && (
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
          <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--purple)] flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Brand Voice</h2>
        </div>
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Voice style
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              {BRAND_VOICES.map((voice) => (
                <button
                  key={voice.value}
                  onClick={() => setBrandVoice(voice.value)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    brandVoice === voice.value
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 ring-1 ring-[var(--accent)]/20'
                      : 'bg-[var(--navy)] border-[var(--border)] hover:border-[var(--accent)]/20'
                  }`}
                >
                  <p className={`text-sm font-semibold ${brandVoice === voice.value ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                    {voice.label}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{voice.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Custom tone notes
            </label>
            <textarea
              placeholder="Any additional instructions for content tone, e.g. 'Avoid jargon', 'Use UK English', 'Include data points where possible'..."
              value={brandTone}
              onChange={(e) => setBrandTone(e.target.value)}
              rows={2}
              className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>
      )}

      {/* Compliance section */}
      {activeTab === 'compliance' && (
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Compliance Frameworks</h2>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-3 sm:mb-4">
            Select frameworks that apply to your business. Generated content will be checked against these rules.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {COMPLIANCE_OPTIONS.map((framework) => {
              const active = complianceFrameworks.includes(framework.id);
              return (
                <button
                  key={framework.id}
                  onClick={() => toggleFramework(framework.id)}
                  className={`flex items-center gap-3 text-left p-4 rounded-xl border transition-all ${
                    active
                      ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : 'bg-[var(--navy)] border-[var(--border)] hover:border-emerald-500/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border)]'
                    }`}
                  >
                    {active && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                      {framework.label}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{framework.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {complianceFrameworks.length === 0 && (
            <p className="text-xs text-amber-400 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Select at least one compliance framework for content checking.
            </p>
          )}
        </div>
      </div>
      )}

      {activeTab === 'branding' && (
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
          <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Visual Branding</h2>
        </div>
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          <div>
            <Input
              id="logoUrl"
              label="Logo URL"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              Provide a public URL to your company logo for use in generated content
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Primary color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg cursor-pointer border border-[var(--border)]"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#14B8A6"
                  className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Secondary color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-10 rounded-lg cursor-pointer border border-[var(--border)]"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#5EEAD4"
                  className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Accent color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border border-[var(--border)]"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#10B981"
                className="flex-1 bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Color preview
            </label>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg border border-[var(--border)] space-y-2">
                <div className="text-xs text-[var(--text-secondary)] font-medium">Primary</div>
                <div className="w-full h-8 rounded" style={{ backgroundColor: primaryColor }} />
                <div className="text-xs text-[var(--text-secondary)]">{primaryColor}</div>
              </div>
              <div className="p-4 rounded-lg border border-[var(--border)] space-y-2">
                <div className="text-xs text-[var(--text-secondary)] font-medium">Secondary</div>
                <div className="w-full h-8 rounded" style={{ backgroundColor: secondaryColor }} />
                <div className="text-xs text-[var(--text-secondary)]">{secondaryColor}</div>
              </div>
              <div className="p-4 rounded-lg border border-[var(--border)] space-y-2">
                <div className="text-xs text-[var(--text-secondary)] font-medium">Accent</div>
                <div className="w-full h-8 rounded" style={{ backgroundColor: accentColor }} />
                <div className="text-xs text-[var(--text-secondary)]">{accentColor}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Custom CSS <span className="text-xs text-[var(--text-secondary)]">(optional)</span>
            </label>
            <textarea
              placeholder="Add custom CSS rules to style generated content. Max 2000 characters."
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              rows={3}
              className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none font-mono"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
              {customCss.length}/2000 characters
            </p>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'integrations' && (
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
          <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent)] flex-shrink-0" />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Integrations</h2>
        </div>
        <div className="p-4 sm:p-5 space-y-6">
          {/* LinkedIn */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 bg-[var(--navy)] rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center flex-shrink-0">
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">LinkedIn</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {linkedInConnected
                    ? 'Your LinkedIn account is connected'
                    : 'Connect your LinkedIn account to post directly from Monitus'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {linkedInConnected ? (
                <>
                  <Badge variant="success">Connected</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      setLinkedInLoading(true);
                      try {
                        await fetch('/api/auth/linkedin/disconnect', { method: 'POST' });
                        setLinkedInConnected(false);
                      } catch (err) {
                        console.error('Disconnect failed:', err);
                      } finally {
                        setLinkedInLoading(false);
                      }
                    }}
                    disabled={linkedInLoading}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <a
                  href="/api/auth/linkedin"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  Connect LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Bottom save bar */}
      <div className="sticky bottom-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--text-secondary)] flex-shrink-0" />
          <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {complianceFrameworks.length} framework{complianceFrameworks.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[var(--text-secondary)] hidden sm:inline">·</span>
          <Badge variant="purple" className="text-xs">{BRAND_VOICES.find((v) => v.value === brandVoice)?.label || brandVoice}</Badge>
          {hasChanges && (
            <>
              <span className="text-[var(--text-secondary)] hidden sm:inline">·</span>
              <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Unsaved
              </span>
            </>
          )}
        </div>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges}
          className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
