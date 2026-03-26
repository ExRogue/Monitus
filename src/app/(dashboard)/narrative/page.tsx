'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BookOpen, MessageSquare, Users, Send, Upload, RefreshCw,
  Sparkles, CheckCircle, Loader2, ArrowRight, Plus, Target,
  Brain, Shield, Zap, Eye, FileText, ChevronLeft, ChevronRight,
  Edit, Download, ChevronDown, Trash2, Star, Globe, FileUp,
  X, Check, Pencil, TrendingUp, BarChart3, Pen, ExternalLink, Crosshair, AlertTriangle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import ExportPdfButton from '@/components/ExportPdfButton';

type SubView = 'interview' | 'narrative' | 'buyers' | 'whatworks' | 'competitors';
type OnboardingStep = 'website' | 'upload' | 'interview';

interface Narrative {
  id: string;
  company_id: string;
  name: string;
  is_default: boolean;
  bible_status?: string;
  has_document?: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
}

interface InterviewBlock {
  key: string;
  label: string;
  description: string;
  questions: string[];
}

interface ICP {
  name: string;
  role?: string;
  pains?: string[];
  attentionTriggers?: string[];
  credibilitySignals?: string[];
  scepticismTriggers?: string[];
  successCriteria?: string[];
}

interface Competitor {
  name: string;
  website?: string;
  description?: string;
}

type BuyingRole = 'champion' | 'blocker' | 'approver' | 'evaluator' | 'user';

interface Stakeholder {
  role: string;
  primaryConcern: string;
  successCriteria: string;
  messageFocus: string;
  proofTypes: string[];
  languageToUse: string[];
  languageToAvoid: string[];
  scepticismTriggers: string[];
  likelyBlockers: string[];
  buyingRole: BuyingRole;
}

const BUYING_ROLES: BuyingRole[] = ['champion', 'blocker', 'approver', 'evaluator', 'user'];

const DEFAULT_STAKEHOLDER_ROLES = [
  'CTO/CIO',
  'Chief Underwriting Officer',
  'CFO',
  'CEO/MD',
  'Head of Distribution',
  'Head of Claims',
  'Chief Actuary',
  'Head of Operations',
  'Data / Analytics Leadership',
  'Innovation / Transformation',
];

function generateDefaultMatrix(icpProfiles: ICP[], companyType?: string): Stakeholder[] {
  const roleDefaults: Record<string, Partial<Stakeholder>> = {
    'CTO/CIO': {
      primaryConcern: 'Technology integration, data security, system reliability',
      successCriteria: 'Seamless integration, minimal IT overhead, measurable efficiency gains',
      messageFocus: 'Technical architecture, API capabilities, security compliance',
      proofTypes: ['Technical case studies', 'Security certifications', 'Integration demos'],
      languageToUse: ['Integration', 'Scalable', 'Secure', 'API-first', 'Automated'],
      languageToAvoid: ['Revolutionary', 'Disruptive', 'Magic'],
      scepticismTriggers: ['No technical documentation', 'Vague security claims'],
      likelyBlockers: ['Integration complexity', 'Security concerns', 'Vendor lock-in'],
      buyingRole: 'evaluator',
    },
    'Chief Underwriting Officer': {
      primaryConcern: 'Portfolio performance, risk selection accuracy, combined ratio',
      successCriteria: 'Improved loss ratios, better risk selection, faster underwriting',
      messageFocus: 'Underwriting accuracy, data-driven insights, portfolio optimisation',
      proofTypes: ['Loss ratio improvements', 'Portfolio analytics', 'Peer benchmarks'],
      languageToUse: ['Risk selection', 'Portfolio', 'Combined ratio', 'Capacity'],
      languageToAvoid: ['Disruption', 'Replace underwriters', 'Black box'],
      scepticismTriggers: ['No insurance domain expertise', 'Generic claims'],
      likelyBlockers: ['Regulatory concerns', 'Model explainability', 'Data quality'],
      buyingRole: 'champion',
    },
    'CFO': {
      primaryConcern: 'ROI, cost efficiency, revenue impact, budget justification',
      successCriteria: 'Clear ROI within 12 months, cost reduction, revenue growth',
      messageFocus: 'Financial impact, cost-benefit analysis, payback period',
      proofTypes: ['ROI calculations', 'Financial case studies', 'Total cost of ownership'],
      languageToUse: ['ROI', 'Efficiency', 'Cost reduction', 'Revenue', 'Margin'],
      languageToAvoid: ['Investment', 'Long-term', 'Intangible benefits'],
      scepticismTriggers: ['No clear ROI', 'Hidden costs', 'Unclear pricing'],
      likelyBlockers: ['Budget constraints', 'Competing priorities', 'Unclear payback'],
      buyingRole: 'approver',
    },
    'CEO/MD': {
      primaryConcern: 'Strategic growth, market position, competitive advantage',
      successCriteria: 'Market differentiation, growth acceleration, board-ready outcomes',
      messageFocus: 'Strategic value, competitive positioning, market leadership',
      proofTypes: ['Market research', 'Competitor analysis', 'Board-level case studies'],
      languageToUse: ['Strategic', 'Growth', 'Market position', 'Competitive edge'],
      languageToAvoid: ['Tactical', 'Incremental', 'Feature-level detail'],
      scepticismTriggers: ['No strategic vision', 'Too operational', 'No market proof'],
      likelyBlockers: ['Board alignment', 'Strategic fit', 'Timing'],
      buyingRole: 'approver',
    },
    'Head of Distribution': {
      primaryConcern: 'GWP growth, broker relationships, distribution efficiency',
      successCriteria: 'New distribution channels, improved broker satisfaction, GWP targets',
      messageFocus: 'Distribution reach, broker enablement, market access',
      proofTypes: ['Distribution metrics', 'Broker testimonials', 'Market access data'],
      languageToUse: ['GWP', 'Distribution', 'Broker', 'Market access', 'Pipeline'],
      languageToAvoid: ['Direct-to-consumer', 'Disintermediate', 'Replace brokers'],
      scepticismTriggers: ['Threatens broker relationships', 'No distribution experience'],
      likelyBlockers: ['Broker pushback', 'Channel conflict', 'Market readiness'],
      buyingRole: 'champion',
    },
    'Head of Claims': {
      primaryConcern: 'Claims efficiency, customer satisfaction, fraud detection, cost control',
      successCriteria: 'Faster settlement, reduced leakage, improved customer experience',
      messageFocus: 'Claims automation, fraud detection, customer outcomes',
      proofTypes: ['Claims metrics', 'Settlement time improvements', 'Customer satisfaction scores'],
      languageToUse: ['Settlement', 'Leakage', 'Customer experience', 'Automation'],
      languageToAvoid: ['Replace adjusters', 'Fully automated', 'No human oversight'],
      scepticismTriggers: ['No claims domain knowledge', 'Over-automation claims'],
      likelyBlockers: ['Regulatory requirements', 'Adjuster adoption', 'System integration'],
      buyingRole: 'evaluator',
    },
    'Chief Actuary': {
      primaryConcern: 'Model accuracy, data quality, regulatory compliance, reserving',
      successCriteria: 'Improved pricing accuracy, better reserving, regulatory approval',
      messageFocus: 'Data quality, model validation, actuarial rigour',
      proofTypes: ['Model validation reports', 'Backtesting results', 'Regulatory approvals'],
      languageToUse: ['Actuarial', 'Model', 'Validation', 'Reserving', 'Pricing'],
      languageToAvoid: ['AI magic', 'Black box', 'Replace actuaries'],
      scepticismTriggers: ['No model transparency', 'Unvalidated claims', 'No actuarial input'],
      likelyBlockers: ['Model governance', 'Data availability', 'Regulatory approval'],
      buyingRole: 'evaluator',
    },
    'Head of Operations': {
      primaryConcern: 'Process efficiency, operational costs, staff productivity, scalability',
      successCriteria: 'Reduced manual processes, improved throughput, cost savings',
      messageFocus: 'Operational efficiency, process automation, scalability',
      proofTypes: ['Process improvement metrics', 'Time savings data', 'Scalability benchmarks'],
      languageToUse: ['Efficiency', 'Automation', 'Throughput', 'Scalable', 'Process'],
      languageToAvoid: ['Headcount reduction', 'Replace staff', 'Overnight transformation'],
      scepticismTriggers: ['Change management concerns', 'Implementation risk'],
      likelyBlockers: ['Staff resistance', 'Legacy systems', 'Training requirements'],
      buyingRole: 'user',
    },
    'Data / Analytics Leadership': {
      primaryConcern: 'Data quality, analytics maturity, insight generation, data governance',
      successCriteria: 'Better data-driven decisions, improved analytics capability, clean data pipelines',
      messageFocus: 'Data enrichment, analytics capabilities, insight quality, governance compliance',
      proofTypes: ['Data quality metrics', 'Analytics case studies', 'Integration architecture'],
      languageToUse: ['Data-driven', 'Insight', 'Analytics', 'Governance', 'Enrichment'],
      languageToAvoid: ['Big data hype', 'AI washing', 'Silver bullet'],
      scepticismTriggers: ['No data governance story', 'Unclear data lineage', 'Generic analytics claims'],
      likelyBlockers: ['Data quality concerns', 'Integration with existing BI stack', 'Privacy/GDPR'],
      buyingRole: 'evaluator',
    },
    'Innovation / Transformation': {
      primaryConcern: 'Digital transformation, innovation pipeline, market disruption, future-proofing',
      successCriteria: 'Accelerated innovation cycles, successful pilots, measurable transformation outcomes',
      messageFocus: 'Innovation enablement, transformation acceleration, competitive advantage',
      proofTypes: ['Innovation case studies', 'Pilot results', 'Transformation roadmaps', 'Market trend data'],
      languageToUse: ['Innovation', 'Transformation', 'Future-proof', 'Pilot', 'Accelerate'],
      languageToAvoid: ['Disrupt everything', 'Rip and replace', 'Year-zero thinking'],
      scepticismTriggers: ['No proven track record', 'All vision no execution', 'Innovation theatre'],
      likelyBlockers: ['Budget for innovation', 'Cultural resistance', 'Competing transformation programmes'],
      buyingRole: 'champion',
    },
  };

  return DEFAULT_STAKEHOLDER_ROLES.map(role => ({
    role,
    primaryConcern: roleDefaults[role]?.primaryConcern || '',
    successCriteria: roleDefaults[role]?.successCriteria || '',
    messageFocus: roleDefaults[role]?.messageFocus || '',
    proofTypes: roleDefaults[role]?.proofTypes || [''],
    languageToUse: roleDefaults[role]?.languageToUse || [''],
    languageToAvoid: roleDefaults[role]?.languageToAvoid || [''],
    scepticismTriggers: roleDefaults[role]?.scepticismTriggers || [''],
    likelyBlockers: roleDefaults[role]?.likelyBlockers || [''],
    buyingRole: roleDefaults[role]?.buyingRole || 'evaluator',
  }));
}

interface MessagingBible {
  id: string;
  status: string;
  full_document: string;
  company_description: string;
  messaging_pillars: string;
  icp_profiles: string;
  brand_voice_guide: string;
  elevator_pitch: string;
  tagline: string;
  narrative_pillars: string;
  icp_resonance_models: string;
  voice_rules: string;
  excluded_language: string;
  competitor_relationships: string;
  competitors: string;
  stakeholder_matrix: string;
}

interface WebsiteExtracted {
  company_name: string;
  what_they_do: string;
  target_market: string;
  value_proposition: string;
  key_differentiators: string;
  competitors_mentioned: string;
  tone_of_voice: string;
  product_features: string;
  team_info: string;
  summary: string;
}

interface UploadExtracted {
  company_name?: string;
  what_they_do?: string;
  target_buyers?: string;
  key_differentiators?: string;
  market_position?: string;
  competitors?: string;
  value_proposition?: string;
  tone_and_voice?: string;
  key_messages?: string;
  summary?: string;
  rawContent?: string;
}

const BLOCKS: InterviewBlock[] = [
  {
    key: 'framing',
    label: 'A. Category & Company Framing',
    description: 'How your company is currently understood -- and how it should be.',
    questions: [
      "How would your ideal buyer currently describe what you do?",
      "How do you wish they'd describe it?",
      "What category are you really competing in?",
    ],
  },
  {
    key: 'buyers',
    label: 'B. Buyer & Pain Extraction',
    description: 'Real commercial pain in buyer language.',
    questions: [
      "What keeps your buyers up at night?",
      "What do they say to their boss when justifying a purchase like yours?",
      "What's the difference between the buyer who gets it immediately vs the one who never does?",
    ],
  },
  {
    key: 'value',
    label: 'C. Value & Proof',
    description: 'Concrete outcomes, not abstract claims.',
    questions: [
      "What's the most concrete, specific outcome you've delivered for a client?",
      "If a client called a reference, what would they say?",
      "What do you do that your competitors can't easily copy?",
    ],
  },
  {
    key: 'competitive',
    label: 'D. Competitive Positioning',
    description: 'Real alternatives and real differentiation.',
    questions: [
      "Who do buyers actually compare you to?",
      "What's the real reason you win deals?",
      "What's the honest reason you lose deals?",
    ],
  },
  {
    key: 'voice',
    label: 'E. Voice & Point of View',
    description: 'How you sound when being candid.',
    questions: [
      "Finish this sentence: Most people in this market think X, but we believe Y.",
      "What's the one thing you'd say if you knew you wouldn't be judged?",
      "What would you never say, even if it might help you win?",
    ],
  },
];

const STEP_LABELS = [
  { key: 'website' as OnboardingStep, label: 'Website', icon: Globe },
  { key: 'upload' as OnboardingStep, label: 'Documents', icon: FileUp },
  { key: 'interview' as OnboardingStep, label: 'Questions', icon: MessageSquare },
];

export default function NarrativePage() {
  const [activeTab, setActiveTab] = useState<SubView>('interview');
  const [bible, setBible] = useState<MessagingBible | null>(null);
  const [bibleLoading, setBibleLoading] = useState(true);

  // Multi-narrative state
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [activeNarrativeId, setActiveNarrativeId] = useState<string | null>(null);
  const [narrativesLoading, setNarrativesLoading] = useState(true);
  const [showNarrativeDropdown, setShowNarrativeDropdown] = useState(false);
  const [showAddNarrative, setShowAddNarrative] = useState(false);
  const [newNarrativeName, setNewNarrativeName] = useState('');
  const [addingNarrative, setAddingNarrative] = useState(false);
  const [deletingNarrativeId, setDeletingNarrativeId] = useState<string | null>(null);
  const narrativeDropdownRef = useRef<HTMLDivElement>(null);

  // Onboarding step state
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('website');

  // Website scan state
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [websiteData, setWebsiteData] = useState<WebsiteExtracted | null>(null);
  const [websiteRawText, setWebsiteRawText] = useState('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploadData, setUploadData] = useState<UploadExtracted | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interview state
  const [blockIndex, setBlockIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [allBlocksComplete, setAllBlocksComplete] = useState(false);
  const [blockAnswers, setBlockAnswers] = useState<Record<string, string[]>>({});
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [interviewPhase, setInterviewPhase] = useState<string>('positioning');
  const [interviewProgress, setInterviewProgress] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const quickStartFileRef = useRef<HTMLInputElement>(null);

  // Quick-start onboarding flow state
  const [useOldOnboarding, setUseOldOnboarding] = useState(false);
  const [quickStartUrl, setQuickStartUrl] = useState('');
  const [quickStartRunning, setQuickStartRunning] = useState(false);
  const [quickStartError, setQuickStartError] = useState('');
  const [quickStartSteps, setQuickStartSteps] = useState<{ key: string; label: string; status: 'pending' | 'active' | 'done' }[]>([]);
  const [quickStartResult, setQuickStartResult] = useState<any>(null);
  const [showWelcomeView, setShowWelcomeView] = useState(false);

  // Buyers expanded
  const [expandedIcp, setExpandedIcp] = useState<number | null>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [editingIcpProfiles, setEditingIcpProfiles] = useState<ICP[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Competitor form state
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [newCompetitorWebsite, setNewCompetitorWebsite] = useState('');
  const [newCompetitorDescription, setNewCompetitorDescription] = useState('');
  const [savingCompetitors, setSavingCompetitors] = useState(false);

  // Stakeholder matrix state
  const [stakeholderMatrix, setStakeholderMatrix] = useState<Stakeholder[]>([]);
  const [editingStakeholders, setEditingStakeholders] = useState<Stakeholder[] | null>(null);
  const [savingStakeholders, setSavingStakeholders] = useState(false);
  const [expandedStakeholder, setExpandedStakeholder] = useState<number | null>(null);
  const [newStakeholderRole, setNewStakeholderRole] = useState('');
  const [generatingAiMatrix, setGeneratingAiMatrix] = useState(false);
  const [aiMatrixError, setAiMatrixError] = useState<string | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeNarrative = narratives.find(n => n.id === activeNarrativeId) || null;

  // Build combined known context from website + uploads
  const buildKnownContext = useCallback((): string => {
    const parts: string[] = [];

    if (websiteData) {
      const fields = [
        websiteData.company_name && `Company: ${websiteData.company_name}`,
        websiteData.what_they_do && `What they do: ${websiteData.what_they_do}`,
        websiteData.target_market && `Target market: ${websiteData.target_market}`,
        websiteData.value_proposition && `Value proposition: ${websiteData.value_proposition}`,
        websiteData.key_differentiators && `Differentiators: ${websiteData.key_differentiators}`,
        websiteData.competitors_mentioned && `Competitors: ${websiteData.competitors_mentioned}`,
        websiteData.tone_of_voice && `Tone: ${websiteData.tone_of_voice}`,
        websiteData.product_features && `Products/features: ${websiteData.product_features}`,
        websiteData.team_info && `Team: ${websiteData.team_info}`,
      ].filter(Boolean);
      if (fields.length > 0) {
        parts.push('FROM WEBSITE:\n' + fields.join('\n'));
      }
    }

    if (uploadData) {
      const fields = [
        uploadData.company_name && `Company: ${uploadData.company_name}`,
        uploadData.what_they_do && `What they do: ${uploadData.what_they_do}`,
        uploadData.target_buyers && `Target buyers: ${uploadData.target_buyers}`,
        uploadData.value_proposition && `Value proposition: ${uploadData.value_proposition}`,
        uploadData.key_differentiators && `Differentiators: ${uploadData.key_differentiators}`,
        uploadData.competitors && `Competitors: ${uploadData.competitors}`,
        uploadData.tone_and_voice && `Tone: ${uploadData.tone_and_voice}`,
        uploadData.key_messages && `Key messages: ${uploadData.key_messages}`,
        uploadData.market_position && `Market position: ${uploadData.market_position}`,
      ].filter(Boolean);
      if (fields.length > 0) {
        parts.push('FROM UPLOADED DOCUMENTS:\n' + fields.join('\n'));
      }
    }

    return parts.join('\n\n');
  }, [websiteData, uploadData]);

  // Build a summary for the opening chat message
  const buildKnownSummary = useCallback((): string => {
    const items: string[] = [];
    if (websiteData?.company_name) items.push(`You are **${websiteData.company_name}**`);
    if (websiteData?.what_they_do) items.push(websiteData.what_they_do);
    if (websiteData?.target_market) items.push(`Target market: ${websiteData.target_market}`);
    if (websiteData?.value_proposition) items.push(`Value prop: ${websiteData.value_proposition}`);
    if (websiteData?.key_differentiators) items.push(`Differentiators: ${websiteData.key_differentiators}`);
    if (uploadData?.summary) items.push(uploadData.summary);
    return items.join('. ');
  }, [websiteData, uploadData]);

  // Load narratives
  const loadNarratives = useCallback(async () => {
    setNarrativesLoading(true);
    try {
      const res = await fetch('/api/narratives');
      if (res.ok) {
        const data = await res.json();
        let items: Narrative[] = data.narratives || [];

        // Auto-create a default narrative if none exist
        if (items.length === 0) {
          try {
            const companyRes = await fetch('/api/company');
            const companyData = companyRes.ok ? await companyRes.json() : null;
            const companyName = companyData?.company?.name || 'My Company';
            const createRes = await fetch('/api/narratives', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: companyName }),
            });
            if (createRes.ok) {
              const created = await createRes.json();
              items = [created.narrative];
            }
          } catch {}
        }

        setNarratives(items);
        if (items.length > 0 && !activeNarrativeId) {
          const defaultNarrative = items.find(n => n.is_default) || items[0];
          setActiveNarrativeId(defaultNarrative.id);
        }
      }
    } catch {}
    finally { setNarrativesLoading(false); }
  }, [activeNarrativeId]);

  useEffect(() => { loadNarratives(); }, []);

  const loadBible = useCallback(async () => {
    setBibleLoading(true);
    try {
      // Try with narrative_id first, then fall back to company-level bible
      const url = activeNarrativeId
        ? `/api/messaging-bible?narrative_id=${activeNarrativeId}`
        : '/api/messaging-bible';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.bible) {
          setBible(data.bible);
        } else if (activeNarrativeId) {
          // Fallback: try without narrative_id (quick-start saves at company level)
          const fallbackRes = await fetch('/api/messaging-bible');
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            setBible(fallbackData.bible || null);
          } else {
            setBible(null);
          }
        } else {
          setBible(null);
        }
      }
    } catch {}
    finally { setBibleLoading(false); }
  }, [activeNarrativeId]);

  useEffect(() => { loadBible(); }, [loadBible]);

  // Reset interview state when switching narratives
  useEffect(() => {
    setBlockIndex(0);
    setQuestionIndex(0);
    setMessages([]);
    setBlockAnswers({});
    setAllBlocksComplete(false);
    setInterviewSessionId(null);
    setInterviewPhase('positioning');
    setOnboardingStep('website');
    setWebsiteData(null);
    setWebsiteRawText('');
    setUploadData(null);
    setUploadedFiles([]);
    setWebsiteUrl('');
    setScanError('');
    // Reset quick-start state
    setQuickStartUrl('');
    setQuickStartRunning(false);
    setQuickStartError('');
    setQuickStartSteps([]);
    setQuickStartResult(null);
    setShowWelcomeView(false);
    setUseOldOnboarding(false);
  }, [activeNarrativeId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (narrativeDropdownRef.current && !narrativeDropdownRef.current.contains(e.target as Node)) {
        setShowNarrativeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddNarrative = async () => {
    if (!newNarrativeName.trim() || addingNarrative) return;
    setAddingNarrative(true);
    try {
      const res = await fetch('/api/narratives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newNarrativeName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNarratives(prev => [...prev, data.narrative]);
        setActiveNarrativeId(data.narrative.id);
        setNewNarrativeName('');
        setShowAddNarrative(false);
      }
    } catch {}
    finally { setAddingNarrative(false); }
  };

  const handleDeleteNarrative = async (id: string) => {
    if (deletingNarrativeId) return;
    setDeletingNarrativeId(id);
    try {
      const res = await fetch(`/api/narratives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNarratives(prev => prev.filter(n => n.id !== id));
        if (activeNarrativeId === id) {
          const remaining = narratives.filter(n => n.id !== id);
          setActiveNarrativeId(remaining[0]?.id || null);
        }
      }
    } catch {}
    finally { setDeletingNarrativeId(null); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/narratives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      if (res.ok) {
        setNarratives(prev => prev.map(n => ({ ...n, is_default: n.id === id })));
      }
    } catch {}
  };

  // === Inline editing save handler ===
  const handleSaveField = async (field: string, value: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/messaging-bible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative_id: activeNarrativeId,
          [field]: value,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bible) {
          setBible(data.bible);
        }
        setEditingField(null);
        setEditValue('');
        setSaveSuccess(field);
        setTimeout(() => setSaveSuccess(null), 1500);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIcpProfiles = async (profiles: ICP[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/messaging-bible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative_id: activeNarrativeId,
          icp_profiles: JSON.stringify(profiles),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bible) {
          setBible(data.bible);
        }
        setEditingIcpProfiles(null);
        setSaveSuccess('icp_profiles');
        setTimeout(() => setSaveSuccess(null), 1500);
      }
    } catch (err) {
      console.error('Save ICP failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const startEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setEditingIcpProfiles(null);
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim()) return;
    setSavingCompetitors(true);
    try {
      const updated = [
        ...competitorsList,
        {
          name: newCompetitorName.trim(),
          website: newCompetitorWebsite.trim() || undefined,
          description: newCompetitorDescription.trim() || undefined,
        },
      ];
      const res = await fetch('/api/messaging-bible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative_id: activeNarrativeId,
          competitors: JSON.stringify(updated),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bible) setBible(data.bible);
        setNewCompetitorName('');
        setNewCompetitorWebsite('');
        setNewCompetitorDescription('');
        setSaveSuccess('competitors');
        setTimeout(() => setSaveSuccess(null), 1500);
      }
    } catch (err) {
      console.error('Add competitor failed:', err);
    } finally {
      setSavingCompetitors(false);
    }
  };

  // Parse stakeholder matrix from bible
  useEffect(() => {
    try {
      const parsed = JSON.parse(bible?.stakeholder_matrix || '[]');
      setStakeholderMatrix(Array.isArray(parsed) ? parsed : []);
    } catch {
      setStakeholderMatrix([]);
    }
  }, [bible?.stakeholder_matrix]);

  const handleGenerateDefaultMatrix = async () => {
    const defaults = generateDefaultMatrix(icpProfiles);
    setSavingStakeholders(true);
    try {
      const res = await fetch('/api/messaging-bible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative_id: activeNarrativeId,
          stakeholder_matrix: JSON.stringify(defaults),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bible) setBible(data.bible);
        showToast('Default stakeholder matrix generated');
      }
    } catch (err) {
      console.error('Generate default matrix failed:', err);
    } finally {
      setSavingStakeholders(false);
    }
  };

  const handleSaveStakeholders = async (stakeholders: Stakeholder[]) => {
    setSavingStakeholders(true);
    try {
      const res = await fetch('/api/messaging-bible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative_id: activeNarrativeId,
          stakeholder_matrix: JSON.stringify(stakeholders),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bible) setBible(data.bible);
        setEditingStakeholders(null);
        setSaveSuccess('stakeholder_matrix');
        setTimeout(() => setSaveSuccess(null), 1500);
        showToast('Stakeholder matrix saved');
      }
    } catch (err) {
      console.error('Save stakeholders failed:', err);
    } finally {
      setSavingStakeholders(false);
    }
  };

  const handleDeleteStakeholder = async (index: number) => {
    if (deleteConfirmIndex !== index) {
      setDeleteConfirmIndex(index);
      return;
    }
    setDeleteConfirmIndex(null);
    if (editingStakeholders) {
      const updated = editingStakeholders.filter((_, i) => i !== index);
      setEditingStakeholders(updated);
      if (expandedStakeholder === index) setExpandedStakeholder(null);
    } else {
      const updated = stakeholderMatrix.filter((_, i) => i !== index);
      await handleSaveStakeholders(updated);
    }
  };

  const handleAddStakeholder = () => {
    const roleName = newStakeholderRole.trim() || 'New Stakeholder';
    const newStakeholder: Stakeholder = {
      role: roleName,
      primaryConcern: '',
      successCriteria: '',
      messageFocus: '',
      proofTypes: [''],
      languageToUse: [''],
      languageToAvoid: [''],
      scepticismTriggers: [''],
      likelyBlockers: [''],
      buyingRole: 'evaluator',
    };
    const current = editingStakeholders || stakeholderMatrix;
    const updated = [...current, newStakeholder];
    setEditingStakeholders(updated);
    setExpandedStakeholder(updated.length - 1);
    setNewStakeholderRole('');
  };

  const handleAiGenerateMatrix = async () => {
    setGeneratingAiMatrix(true);
    setAiMatrixError(null);
    try {
      const res = await fetch('/api/messaging-bible/stakeholder-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrative_id: activeNarrativeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAiMatrixError(data.error || 'Failed to generate matrix');
        return;
      }
      const data = await res.json();
      if (data.matrix && Array.isArray(data.matrix)) {
        // Put the AI-generated matrix into editing mode so users can review/edit before saving
        setEditingStakeholders(data.matrix);
        setExpandedStakeholder(0);
        showToast('AI matrix generated — review and save when ready');
      }
    } catch (err) {
      console.error('AI matrix generation failed:', err);
      setAiMatrixError('Failed to connect to AI service');
    } finally {
      setGeneratingAiMatrix(false);
    }
  };

  const handleDeleteCompetitor = async (index: number) => {
    setSavingCompetitors(true);
    try {
      const updated = competitorsList.filter((_, i) => i !== index);
      const res = await fetch('/api/messaging-bible', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative_id: activeNarrativeId,
          competitors: JSON.stringify(updated),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bible) setBible(data.bible);
        setSaveSuccess('competitors');
        setTimeout(() => setSaveSuccess(null), 1500);
      }
    } catch (err) {
      console.error('Delete competitor failed:', err);
    } finally {
      setSavingCompetitors(false);
    }
  };

  // === STEP 1: Website Scan ===
  const handleScanWebsite = async () => {
    if (!websiteUrl.trim() || scanning) return;
    setScanning(true);
    setScanError('');
    setWebsiteData(null);

    try {
      const res = await fetch('/api/messaging-bible/scan-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        setScanError(err.error || 'Failed to scan website. Please check the URL.');
        return;
      }

      const data = await res.json();
      setWebsiteData(data.extracted);
      setWebsiteRawText(data.rawText || '');
    } catch {
      setScanError('Network error. Please check your connection and try again.');
    } finally {
      setScanning(false);
    }
  };

  // === STEP 2: File Upload ===
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files.length || uploading) return;
    setUploading(true);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      // Also add first file as 'file' for backwards compatibility
      formData.append('file', files[0]);

      const res = await fetch('/api/messaging-bible/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Upload failed');
        return;
      }

      const data = await res.json();
      const extracted = data.extractedText || {};
      setUploadData(extracted);
      setUploadedFiles(prev => [
        ...prev,
        ...Array.from(files).map((f: File) => f.name),
      ]);
    } catch {
      showToast('Failed to process file. Try a .txt or .md file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  // === STEP 3: Interview (gap-filling) ===
  // Seed the interview when entering step 3
  useEffect(() => {
    if (onboardingStep !== 'interview') return;
    if (activeTab !== 'interview') return;
    if (messages.length > 0) return;

    const knownContext = buildKnownContext();
    const summary = buildKnownSummary();

    // Try to resume an existing interview session
    const loadSession = async () => {
      try {
        const res = await fetch('/api/messaging-bible/interview');
        if (res.ok) {
          const data = await res.json();
          if (data.sessionId && data.messages && data.messages.length > 0) {
            setInterviewSessionId(data.sessionId);
            setInterviewPhase(data.phase || 'positioning');
            const chatMessages: ChatMessage[] = data.messages.map((m: any) => ({
              role: m.role === 'user' ? 'user' as const : 'ai' as const,
              text: m.content,
            }));
            setMessages(chatMessages);

            if (data.status === 'complete') {
              setAllBlocksComplete(true);
              setBlockIndex(BLOCKS.length - 1);
            }
            return;
          }
        }
      } catch {}

      // No existing session -- show context summary then ask a real question
      if (knownContext) {
        const sources: string[] = [];
        if (websiteData) sources.push('your website');
        if (uploadData) sources.push('your documents');
        const sourceText = sources.join(' and ');

        // Show context summary as the first message while we fetch the AI's question
        const summaryMsg: ChatMessage = {
          role: 'ai' as const,
          text: `I've reviewed ${sourceText}. Here's what I understand so far:\n\n${summary}\n\nLet me ask you a few questions to fill in the gaps...`,
        };
        setMessages([summaryMsg]);
        setSending(true);

        try {
          const res = await fetch('/api/messaging-bible/interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'I\'ve provided my website and documents. What do you need to know to complete my Narrative?',
              knownContext,
              websiteContext: websiteData?.summary || '',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setInterviewSessionId(data.sessionId);
            setInterviewPhase(data.phase || 'positioning');
            // Append the AI's first real question after the summary
            setMessages([summaryMsg, { role: 'ai' as const, text: data.reply }]);
          }
        } catch {}
        finally { setSending(false); }
        return;
      } else {
        // Fallback: no context gathered
        const block = BLOCKS[0];
        setMessages([
          {
            role: 'ai',
            text: `Let's build your Narrative -- the strategic foundation that drives everything else in Monitus.\n\nWe'll work through a focused conversation in two phases. I'll ask the questions, you answer honestly.\n\n**${block.label}**\n${block.description}\n\n${block.questions[0]}`,
          },
        ]);
      }
    };

    loadSession();
  }, [onboardingStep, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const userText = inputText.trim();
    setInputText('');
    setSending(true);

    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);

    const block = BLOCKS[blockIndex];
    setBlockAnswers(prev => ({
      ...prev,
      [block.key]: [...(prev[block.key] || []), userText],
    }));

    try {
      const knownContext = buildKnownContext();
      const res = await fetch('/api/messaging-bible/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          sessionId: interviewSessionId,
          phase: interviewPhase,
          knownContext: knownContext || undefined,
          websiteContext: websiteRawText || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.sessionId) {
          setInterviewSessionId(data.sessionId);
        }
        if (data.phase) {
          setInterviewPhase(data.phase);
        }
        if (data.progressHint) {
          setInterviewProgress(data.progressHint);
        }

        const aiReply = data.reply || '';

        if (data.interviewComplete || data.status === 'complete') {
          setAllBlocksComplete(true);
          setBlockIndex(BLOCKS.length - 1);
          setMessages(prev => [
            ...prev,
            {
              role: 'ai',
              text: aiReply || "That's everything. The interview is complete.\n\nClick **Generate Narrative** to produce your Narrative Definition -- positioning, pillars, voice, competitive framing, ICP profiles, and more.",
            },
          ]);
        } else if (data.phaseComplete) {
          setBlockIndex(3);
          setQuestionIndex(0);
          setMessages(prev => [
            ...prev,
            {
              role: 'ai',
              text: aiReply || "Great, positioning discovery is complete. Let's move on to your brand voice and tone.",
            },
          ]);
        } else {
          const userMsgCount = newMessages.filter(m => m.role === 'user').length;
          if (data.phase === 'positioning') {
            const estimatedBlock = Math.min(Math.floor(userMsgCount / 2), 2);
            setBlockIndex(estimatedBlock);
          } else if (data.phase === 'voice') {
            const voiceUserMsgs = userMsgCount;
            const estimatedBlock = Math.min(3 + Math.floor(Math.max(0, voiceUserMsgs - 6) / 3), 4);
            setBlockIndex(estimatedBlock);
          }

          setMessages(prev => [
            ...prev,
            { role: 'ai', text: aiReply },
          ]);
        }
      } else {
        advanceLocally(newMessages, block);
      }
    } catch {
      advanceLocally(newMessages, block);
    } finally {
      setSending(false);
    }
  };

  const advanceLocally = (_newMessages: ChatMessage[], block: InterviewBlock) => {
    const nextQuestionIndex = questionIndex + 1;
    const nextBlockIndex = blockIndex + 1;
    const isLastQuestion = nextQuestionIndex >= block.questions.length;
    const isLastBlock = isLastQuestion && nextBlockIndex >= BLOCKS.length;

    if (isLastBlock) {
      setAllBlocksComplete(true);
      setMessages(prev => [...prev, { role: 'ai', text: "You've completed all blocks. Click **Generate Narrative** to produce your Narrative Definition." }]);
    } else if (isLastQuestion) {
      const nextBlock = BLOCKS[nextBlockIndex];
      setBlockIndex(nextBlockIndex);
      setQuestionIndex(0);
      setMessages(prev => [...prev, { role: 'ai', text: `**${nextBlock.label}**\n${nextBlock.description}\n\n${nextBlock.questions[0]}` }]);
    } else {
      setQuestionIndex(nextQuestionIndex);
      setMessages(prev => [...prev, { role: 'ai', text: block.questions[nextQuestionIndex] }]);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const bibleUrl = activeNarrativeId
        ? `/api/messaging-bible?narrative_id=${activeNarrativeId}`
        : '/api/messaging-bible';
      const bibleRes = await fetch(bibleUrl);
      let bibleId = bible?.id;
      if (bibleRes.ok) {
        const bibleData = await bibleRes.json();
        if (bibleData.bible?.id) {
          bibleId = bibleData.bible.id;
          setBible(bibleData.bible);
        }
      }

      if (!bibleId) {
        const createRes = await fetch('/api/messaging-bible', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyDescription: Object.values(blockAnswers).flat().join(' ').substring(0, 2000),
            targetAudiences: [{ name: 'From interview', role: '', painPoints: '' }],
            narrative_id: activeNarrativeId,
          }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          bibleId = createData.bible?.id;
          setBible(createData.bible);
        }
      }

      if (!bibleId) {
        console.error('Could not find or create bible record for generation');
        return;
      }

      const res = await fetch('/api/messaging-bible/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibleId, narrative_id: activeNarrativeId }),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream')) {
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let fullDoc = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.text) fullDoc += parsed.text;
                  } catch {}
                }
              }
            }
          }
        }
        await loadBible();
        setActiveTab('narrative');
      }
    } catch (err) {
      console.error('Generation error:', err);
    }
    finally { setGenerating(false); }
  };

  const hasNarrative = !!(bible?.full_document);

  const [showRefine, setShowRefine] = useState(false);

  const tabs: { key: SubView; label: string }[] = hasNarrative && !showRefine
    ? [
        { key: 'narrative', label: 'Narrative' },
        { key: 'buyers', label: 'Buyers' },
        { key: 'whatworks', label: 'What Works' },
        { key: 'competitors', label: 'Competitors' },
      ]
    : [
        { key: 'interview', label: 'Interview' },
        { key: 'narrative', label: 'Narrative' },
        { key: 'buyers', label: 'Buyers' },
        { key: 'whatworks', label: 'What Works' },
        { key: 'competitors', label: 'Competitors' },
      ];

  const icpProfiles: ICP[] = (() => {
    try {
      const raw = JSON.parse(bible?.icp_profiles || '[]');
      // Map old extraction format to current ICP interface
      return raw.map((p: any) => ({
        name: p.name || '',
        role: p.role || '',
        pains: p.pains || p.pain_points || [],
        attentionTriggers: p.attentionTriggers || p.what_they_care_about || [],
        credibilitySignals: p.credibilitySignals || p.key_messages || [],
        scepticismTriggers: p.scepticismTriggers || p.objections || [],
        successCriteria: p.successCriteria || [],
      }));
    } catch { return []; }
  })();

  const competitorsList: Competitor[] = (() => {
    try { return JSON.parse(bible?.competitors || '[]'); } catch { return []; }
  })();

  const pillars: string[] = (() => {
    try {
      const p = JSON.parse(bible?.messaging_pillars || bible?.narrative_pillars || '[]');
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  })();

  // Default to Narrative tab when narrative exists (not interview)
  useEffect(() => {
    if (hasNarrative && activeTab === 'interview' && !showRefine) {
      setActiveTab('narrative');
    }
  }, [hasNarrative, activeTab, showRefine]);

  if (bibleLoading) {
    return (
      <div className="flex items-center justify-center min-h-64 text-[var(--text-secondary)]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Narrative...
      </div>
    );
  }

  // === Quick-Start Flow (60-second onboarding) ===
  const handleQuickStart = async (urlOverride?: string, uploadDataOverride?: any) => {
    if (quickStartRunning) return;
    const targetUrl = urlOverride || quickStartUrl.trim();
    if (!targetUrl && !uploadDataOverride) return;
    setQuickStartRunning(true);
    setQuickStartError('');
    setQuickStartResult(null);

    const steps = [
      { key: 'scanning', label: 'Scanning website...', status: 'pending' as const },
      { key: 'extracting', label: 'Extracting positioning...', status: 'pending' as const },
      { key: 'building_narrative', label: 'Building draft narrative...', status: 'pending' as const },
      { key: 'generating', label: 'Writing your narrative...', status: 'pending' as const },
      { key: 'extracting_fields', label: 'Identifying pillars and profiles...', status: 'pending' as const },
      { key: 'analyzing_signals', label: 'Scanning market intelligence...', status: 'pending' as const },
      { key: 'generating_content', label: 'Drafting sample content...', status: 'pending' as const },
    ];
    setQuickStartSteps(steps);

    try {
      const res = await fetch('/api/onboarding/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          narrativeId: activeNarrativeId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setQuickStartError(err.error || 'Failed to start. Please try again.');
        setQuickStartRunning(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        let receivedResult = false;
        let receivedError = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const parsed = JSON.parse(line.slice(6));

              if (parsed.error) {
                setQuickStartError(parsed.error);
                setQuickStartRunning(false);
                receivedError = true;
                return;
              }

              if (parsed.step) {
                const isDone = parsed.step.endsWith('_done');
                const baseKey = isDone ? parsed.step.replace('_done', '') : parsed.step;

                setQuickStartSteps(prev => prev.map(s => {
                  if (s.key === baseKey) {
                    return { ...s, status: isDone ? 'done' : 'active' };
                  }
                  return s;
                }));
              }

              if (parsed.done) {
                receivedResult = true;
                setQuickStartResult(parsed);
                setQuickStartRunning(false);
                setShowWelcomeView(true);
                // Reload bible data
                await loadBible();
                // Phase 2: trigger background signal scanning (non-blocking)
                if (parsed.phase2Required) {
                  fetch('/api/onboarding/bootstrap', { method: 'POST' })
                    .then(r => r.json())
                    .then(d => {
                      if (d.signalCount > 0) {
                        setQuickStartResult((prev: any) => ({
                          ...prev,
                          signalCount: d.signalCount,
                          bootstrapOpportunities: d.opportunities,
                        }));
                      }
                    })
                    .catch(() => {}); // Non-blocking — signals populate in background
                }
              }
            } catch {}
          }
        }
        // SSE connection dropped without a result or error
        if (!receivedResult && !receivedError) {
          setQuickStartError('Connection lost. Please try again.');
          setQuickStartRunning(false);
        }
      }
    } catch {
      setQuickStartError('Something went wrong. Please check the URL is correct and try again.');
      setQuickStartRunning(false);
    }
  };

  // Handle file upload for quick-start (PDF pitch deck)
  const handleQuickStartUpload = async (files: FileList | File[]) => {
    if (!files.length) return;
    setQuickStartRunning(true);
    setQuickStartError('');

    // First upload the file to extract data
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('file', files[0]);

    try {
      const res = await fetch('/api/messaging-bible/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        setQuickStartError(err.error || 'Upload failed');
        setQuickStartRunning(false);
        return;
      }

      const data = await res.json();
      const extracted = data.extractedText || {};

      // Now use the extracted data to run the quick-start pipeline
      // We'll construct websiteData-like object from the upload
      const websiteDataFromUpload = {
        company_name: extracted.company_name || '',
        what_they_do: extracted.what_they_do || '',
        target_market: extracted.target_buyers || '',
        value_proposition: extracted.value_proposition || '',
        key_differentiators: extracted.key_differentiators || '',
        competitors_mentioned: extracted.competitors || '',
        tone_of_voice: extracted.tone_and_voice || '',
        product_features: '',
        team_info: '',
        summary: extracted.summary || '',
      };

      // Run quick-start with the upload data
      setQuickStartRunning(false);
      setWebsiteData(websiteDataFromUpload);
      setUploadData(extracted);
      setUploadedFiles(Array.from(files).map((f: File) => f.name));

      // Now trigger the pipeline
      const steps = [
        { key: 'scanning', label: 'Processing uploaded document...', status: 'done' as const },
        { key: 'extracting', label: 'Extracting positioning...', status: 'done' as const },
        { key: 'building_narrative', label: 'Building draft narrative...', status: 'pending' as const },
        { key: 'generating', label: 'Writing your narrative...', status: 'pending' as const },
        { key: 'extracting_fields', label: 'Identifying pillars and profiles...', status: 'pending' as const },
        { key: 'analyzing_signals', label: 'Scanning market intelligence...', status: 'pending' as const },
        { key: 'generating_content', label: 'Drafting sample content...', status: 'pending' as const },
      ];
      setQuickStartSteps(steps);
      setQuickStartRunning(true);

      const qsRes = await fetch('/api/onboarding/quick-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: '',
          websiteData: websiteDataFromUpload,
          websiteRawText: extracted.rawContent || '',
          narrativeId: activeNarrativeId,
        }),
      });

      if (!qsRes.ok) {
        const err = await qsRes.json();
        setQuickStartError(err.error || 'Failed to generate narrative.');
        setQuickStartRunning(false);
        return;
      }

      const reader = qsRes.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const parsed = JSON.parse(line.slice(6));

              if (parsed.error) {
                setQuickStartError(parsed.error);
                setQuickStartRunning(false);
                return;
              }

              if (parsed.step) {
                const isDone = parsed.step.endsWith('_done');
                const baseKey = isDone ? parsed.step.replace('_done', '') : parsed.step;
                setQuickStartSteps(prev => prev.map(s => {
                  if (s.key === baseKey) return { ...s, status: isDone ? 'done' : 'active' };
                  return s;
                }));
              }

              if (parsed.done) {
                setQuickStartResult(parsed);
                setQuickStartRunning(false);
                setShowWelcomeView(true);
                await loadBible();
                // Phase 2: trigger background signal scanning
                if (parsed.phase2Required) {
                  fetch('/api/onboarding/bootstrap', { method: 'POST' })
                    .then(r => r.json())
                    .then(d => {
                      if (d.signalCount > 0) {
                        setQuickStartResult((prev: any) => ({
                          ...prev,
                          signalCount: d.signalCount,
                          bootstrapOpportunities: d.opportunities,
                        }));
                      }
                    })
                    .catch(() => {});
                }
              }
            } catch {}
          }
        }
      }
    } catch {
      setQuickStartError('Failed to process file. Try a PDF or text file.');
      setQuickStartRunning(false);
    }
  };

  // Render the quick-start onboarding (first-time users)
  const renderQuickStart = () => (
    <div className="max-w-xl mx-auto pt-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-[var(--accent)]/20">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
          Your AI Growth Team is ready.
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-md mx-auto">
          Enter your website and we'll start working. Narrative, signals, and content in under 60 seconds.
        </p>
      </div>

      {/* URL Input */}
      {!quickStartRunning && !showWelcomeView && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--navy-light)] p-8 space-y-5">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] pointer-events-none" />
              <input
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                value={quickStartUrl}
                onChange={e => { setQuickStartUrl(e.target.value); setQuickStartError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleQuickStart(); }}
                placeholder="https://yourcompany.com"
                className="w-full pl-12 pr-4 py-3 md:py-4 text-base bg-[var(--navy-light)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                autoFocus
              />
            </div>
            <Button
              variant="primary"
              onClick={() => handleQuickStart()}
              disabled={!quickStartUrl.trim()}
              className="flex items-center gap-2 px-6 py-4 text-base font-semibold"
            >
              <Sparkles className="w-5 h-5" />
              Scan & Start
            </Button>
          </div>

          {quickStartError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{quickStartError}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <button
            onClick={() => quickStartFileRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--navy)]/50 transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Upload className="w-5 h-5" />
            <span className="text-sm font-medium">Upload a pitch deck (PDF)</span>
          </button>
          <input
            ref={quickStartFileRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,.md"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) {
                handleQuickStartUpload(e.target.files);
              }
            }}
          />
        </div>
      )}

      {/* Progress Animation */}
      {quickStartRunning && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--navy-light)] p-8">
          <div className="space-y-4">
            {quickStartSteps.map((step) => (
              <div key={step.key} className="flex items-center gap-3">
                {step.status === 'done' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] flex-shrink-0" />
                )}
                <span className={`text-sm font-medium transition-colors ${
                  step.status === 'done'
                    ? 'text-emerald-400'
                    : step.status === 'active'
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]/50'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Animated progress bar */}
          <div className="mt-6">
            <div className="h-1.5 bg-[var(--navy-lighter)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.round(
                    (quickStartSteps.filter(s => s.status === 'done').length /
                      quickStartSteps.length) *
                      100
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render the Welcome Intelligence view (after quick-start completes)
  const renderWelcomeIntelligence = () => {
    if (!quickStartResult) return null;
    const {
      companyName,
      elevatorPitch,
      icpCount,
      pillarCount,
      signalCount,
      topSignals,
      samplePost,
    } = quickStartResult;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-4">
            <CheckCircle className="w-4 h-4" />
            Your AI team is online
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Here's what we found for {companyName}
          </h1>
        </div>

        {/* Narrative Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Narrative</h3>
                <p className="text-xs text-[var(--text-secondary)]">Draft generated from your website</p>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">Draft</span>
          </div>

          {elevatorPitch && (
            <p className="text-sm text-[var(--text-primary)] leading-relaxed border-l-2 border-[var(--accent)]/30 pl-4 italic">
              "{elevatorPitch}"
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Elevator pitch generated</span>
            </div>
            {pillarCount > 0 && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{pillarCount} messaging pillars</span>
              </div>
            )}
            {icpCount > 0 && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{icpCount} buyer profiles</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setShowWelcomeView(false);
                setActiveTab('narrative');
              }}
              className="flex items-center gap-2"
            >
              View full narrative <ArrowRight className="w-4 h-4" />
            </Button>
            <button
              onClick={() => {
                setShowWelcomeView(false);
                setUseOldOnboarding(true);
                setActiveTab('interview');
                setOnboardingStep('interview');
              }}
              className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" /> Refine with interview
            </button>
          </div>
        </div>

        {/* Signals Card */}
        {signalCount > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--purple)]/10 border border-[var(--purple)]/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[var(--purple)]" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Market Signals</h3>
                <p className="text-xs text-[var(--text-secondary)]">{signalCount} articles from the past 7 days</p>
              </div>
            </div>

            {topSignals && topSignals.length > 0 && (
              <div className="space-y-3">
                {topSignals.slice(0, 3).map((signal: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--navy)]/50 border border-[var(--border)]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--purple)]/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-[var(--purple)]">{signal.narrative_fit || 0}%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{signal.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{signal.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <a
              href="/signals"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
            >
              View all signals <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Sample Content Card */}
        {samplePost && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Pen className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Sample LinkedIn Post</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Generated from your narrative</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[var(--navy)]/50 border border-[var(--border)] p-4">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                {samplePost}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/content"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
              >
                Generate more content <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Next Steps Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">What's next</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setShowWelcomeView(false);
                setUseOldOnboarding(true);
                setActiveTab('interview');
                setOnboardingStep('interview');
              }}
              className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--navy)]/50 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 transition-all text-left"
            >
              <MessageSquare className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Refine your narrative</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Answer a few questions to sharpen positioning</p>
              </div>
            </button>
            <a
              href="/opportunities"
              className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--navy)]/50 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 transition-all text-left"
            >
              <TrendingUp className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Explore your pipeline</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">See signals, opportunities, and create content</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    );
  };

  // Render the step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((step, i) => {
        const Icon = step.icon;
        const isActive = step.key === onboardingStep;
        const isComplete =
          (step.key === 'website' && (onboardingStep === 'upload' || onboardingStep === 'interview')) ||
          (step.key === 'upload' && onboardingStep === 'interview');

        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div className={`w-12 h-px mx-2 transition-colors ${
                isComplete ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
              }`} />
            )}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isComplete
                  ? 'bg-[var(--accent)] text-white'
                  : isActive
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] ring-2 ring-[var(--accent)]/40'
                  : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)]'
              }`}>
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-sm font-medium transition-colors ${
                isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              }`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render the website scan step
  const renderWebsiteStep = () => (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7 text-[var(--accent)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Let's build your Narrative
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          Start by entering your company website. We'll extract what we can and only ask about what's missing.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-4">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Enter your company website
        </label>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={websiteUrl}
              onChange={e => { setWebsiteUrl(e.target.value); setScanError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleScanWebsite(); }}
              placeholder="https://yourcompany.com"
              className="w-full pl-10 pr-4 py-3 text-base bg-[var(--navy-light)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              autoFocus
            />
          </div>
          <Button
            variant="primary"
            onClick={handleScanWebsite}
            disabled={scanning || !websiteUrl.trim()}
            className="flex items-center gap-2 px-5 py-3"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Scan
          </Button>
        </div>

        {scanError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">{scanError}</p>
          </div>
        )}

        {scanning && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20">
            <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Scanning {websiteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}...
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Fetching pages and extracting company information
              </p>
            </div>
          </div>
        )}

        {websiteData && !scanning && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Website scanned successfully
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--navy)] p-4 space-y-3">
              {websiteData.company_name && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Company</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{websiteData.company_name}</p>
                </div>
              )}
              {websiteData.what_they_do && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">What you do</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{websiteData.what_they_do}</p>
                </div>
              )}
              {websiteData.target_market && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Target market</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{websiteData.target_market}</p>
                </div>
              )}
              {websiteData.value_proposition && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Value proposition</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{websiteData.value_proposition}</p>
                </div>
              )}
              {websiteData.key_differentiators && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Differentiators</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{websiteData.key_differentiators}</p>
                </div>
              )}
              {websiteData.product_features && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Products / features</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{websiteData.product_features}</p>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              onClick={() => setOnboardingStep('upload')}
              className="w-full flex items-center justify-center gap-2"
            >
              Looks good, continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Render the upload step
  const renderUploadStep = () => (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Got any supporting documents?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          Upload pitch decks, sales materials, or brand guides. We'll extract additional context to make your Narrative even stronger.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-6 space-y-4">
        {/* Drag and drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            dragActive
              ? 'border-[var(--accent)] bg-[var(--accent)]/5'
              : 'border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--navy)]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx,.md"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files) handleFileUpload(e.target.files);
            }}
          />
          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                <p className="text-sm text-[var(--text-primary)] font-medium">Processing files...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    PDF, DOCX, TXT, MD supported
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            {uploadedFiles.map((name, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--navy)] border border-[var(--border)]">
                <FileText className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-sm text-[var(--text-primary)] flex-1">{name}</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
            ))}
          </div>
        )}

        {/* Extracted info from upload */}
        {uploadData && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--navy)] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Information extracted
            </div>
            {uploadData.summary && (
              <p className="text-sm text-[var(--text-primary)]">{uploadData.summary}</p>
            )}
            {uploadData.key_differentiators && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Key differentiators</p>
                <p className="text-sm text-[var(--text-primary)] mt-0.5">{uploadData.key_differentiators}</p>
              </div>
            )}
            {uploadData.target_buyers && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Target buyers</p>
                <p className="text-sm text-[var(--text-primary)] mt-0.5">{uploadData.target_buyers}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="primary"
            onClick={() => setOnboardingStep('interview')}
            className="w-full flex items-center justify-center gap-2"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
          {!uploadData && uploadedFiles.length === 0 && (
            <button
              onClick={() => setOnboardingStep('interview')}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Skip this step
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Calculate interview progress percentage
  const getInterviewProgressPercent = (): number => {
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    if (allBlocksComplete) return 100;
    if (interviewPhase === 'voice') {
      // Phase 2: 50-100%
      const hasKC = !!(websiteData || uploadData);
      const expectedVoiceQs = hasKC ? 3 : 5;
      return Math.min(50 + Math.round((userMsgCount > 0 ? Math.min(userMsgCount, expectedVoiceQs) / expectedVoiceQs : 0) * 50), 99);
    }
    // Phase 1: 0-50%
    const hasKC = !!(websiteData || uploadData);
    const expectedPositioningQs = hasKC ? 3 : 6;
    return Math.min(Math.round((userMsgCount > 0 ? Math.min(userMsgCount, expectedPositioningQs) / expectedPositioningQs : 0) * 50), 49);
  };

  // Render the interview step (gap-filling)
  const renderInterviewStep = () => {
    const progressPercent = getInterviewProgressPercent();
    const phaseLabel = allBlocksComplete ? 'Complete' : interviewPhase === 'voice' ? 'Phase 2: Voice & Tone' : 'Phase 1: Positioning';

    return (
    <div className="space-y-6">
      {/* Interview progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)] font-medium">{phaseLabel}</span>
          <span className="text-[var(--text-secondary)]">{progressPercent}%{interviewProgress ? ` — ${interviewProgress}` : ''}</span>
        </div>
        <div className="h-2 bg-[var(--navy-lighter)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>Positioning</span>
          <span>Voice & Tone</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Chat */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
        <div className="h-96 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
              )}
              <div className={`max-w-lg rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'ai'
                  ? 'bg-[var(--navy-lighter)] text-[var(--text-primary)]'
                  : 'bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--text-primary)]'
              }`}>
                <SimpleMarkdown content={msg.text} />
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
              </div>
              <div className="bg-[var(--navy-lighter)] rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {allBlocksComplete ? (
          <div className="p-4 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-medium text-[var(--text-primary)]">Interview complete. Ready to generate your Narrative.</p>
            </div>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Narrative
            </Button>
          </div>
        ) : (
          <div className="p-4 border-t border-[var(--border)] space-y-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Your answer
            </label>
            <div className="flex gap-3">
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type your answer here... (Shift+Enter for new line)"
                rows={3}
                className="flex-1 px-4 py-3 text-sm bg-[var(--navy)] border-2 border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                autoFocus
              />
              <Button
                variant="primary"
                onClick={sendMessage}
                disabled={sending || !inputText.trim()}
                className="flex-shrink-0 self-end flex items-center gap-1.5 px-4 py-3"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  };

  // First-time user: show quick-start flow instead of the old 3-step onboarding.
  // Once the user has explicitly entered the old flow (scanned website via old step, moved to upload/interview),
  // OR has a narrative already, fall through to the original UI.
  const isFirstTimeUser = !hasNarrative && onboardingStep === 'website' && !websiteData && !scanning && !useOldOnboarding;

  if ((showWelcomeView || (!hasNarrative && (quickStartRunning || isFirstTimeUser))) && activeTab === 'interview') {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {showWelcomeView ? renderWelcomeIntelligence() : renderQuickStart()}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white text-sm font-medium px-5 py-3 rounded-lg shadow-lg border border-red-400/50 flex items-center gap-2">
          {toastMessage}
          <button onClick={() => setToastMessage(null)} className="ml-2 p-0.5 hover:bg-white/20 rounded">
            &times;
          </button>
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[var(--accent)]" /> Narrative
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            How your company should be understood by the market — the foundation for everything Monitus does
          </p>
        </div>
        {hasNarrative && (
          <ExportPdfButton title="Narrative Definition" companyName="" content={bible?.full_document || ''} filename="narrative-definition" />
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {tab.key === 'narrative' && !hasNarrative && (
              <span className="ml-1.5 text-[10px] text-[var(--text-secondary)]/60">-- complete interview first</span>
            )}
          </button>
        ))}
      </div>

      {/* Interview Tab - New 3-Step Onboarding */}
      {activeTab === 'interview' && (
        <div className="space-y-6">
          {/* Step Indicator */}
          {!hasNarrative && renderStepIndicator()}

          {/* Step Content */}
          {hasNarrative ? (
            // User already has a narrative -- show recalibration interview directly
            renderInterviewStep()
          ) : onboardingStep === 'website' ? (
            renderWebsiteStep()
          ) : onboardingStep === 'upload' ? (
            renderUploadStep()
          ) : (
            renderInterviewStep()
          )}
        </div>
      )}

      {/* Narrative tab */}
      {activeTab === 'narrative' && (
        <div className="space-y-5">
          {!hasNarrative ? (
            <div className="text-center py-16 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="font-medium text-[var(--text-secondary)]">No Narrative yet</p>
              <p className="text-sm text-[var(--text-secondary)]/60 max-w-sm mx-auto">Complete the interview to generate your Narrative Definition.</p>
              <button onClick={() => setActiveTab('interview')} className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
                Start interview <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Narrative completion status */}
              {(() => {
                const checks = [
                  { label: 'Narrative document', done: !!bible?.full_document },
                  { label: 'Elevator pitch', done: !!bible?.elevator_pitch },
                  { label: 'Buyer profiles', done: icpProfiles.length > 0 && icpProfiles.some((p: ICP) => (p.pains?.length || 0) > 0) },
                  { label: 'Messaging pillars', done: !!bible?.messaging_pillars && bible.messaging_pillars.length > 20 },
                  { label: 'Competitors', done: competitorsList.length > 0 },
                ];
                const doneCount = checks.filter(c => c.done).length;
                const allDone = doneCount === checks.length;
                const incomplete = checks.filter(c => !c.done);

                if (allDone) {
                  return (
                    <div className="flex items-center justify-between rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[var(--accent)]" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">Narrative Definition active</span>
                        <span className="text-xs text-[var(--text-muted)]">{doneCount}/{checks.length} complete</span>
                      </div>
                      <button
                        onClick={() => { setShowRefine(true); setActiveTab('interview'); }}
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Refine
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">Narrative needs attention</span>
                        <span className="text-xs text-amber-400 font-medium">{doneCount}/{checks.length} complete</span>
                      </div>
                      <button
                        onClick={() => { setShowRefine(true); setActiveTab('interview'); }}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        Complete now
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {checks.map(c => (
                        <span key={c.label} className={`text-xs px-2 py-1 rounded-md ${c.done ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-gray-800 text-[var(--text-muted)]'}`}>
                          {c.done ? '✓' : '○'} {c.label}
                        </span>
                      ))}
                    </div>
                    {incomplete.length > 0 && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Missing: {incomplete.map(c => c.label.toLowerCase()).join(', ')}. Complete these to improve signal accuracy and content quality.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Elevator pitch */}
              {bible?.elevator_pitch && (
                <div className={`group rounded-xl border bg-[var(--navy-light)] p-5 space-y-2 transition-colors ${saveSuccess === 'elevator_pitch' ? 'border-green-500/50' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Elevator pitch</p>
                    {editingField !== 'elevator_pitch' && (
                      <button
                        onClick={() => startEditField('elevator_pitch', bible.elevator_pitch)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--accent)]/10"
                        title="Edit elevator pitch"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      </button>
                    )}
                  </div>
                  {editingField === 'elevator_pitch' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] p-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y min-h-[80px]"
                        rows={3}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-[var(--border)] transition-colors" disabled={saving}>
                          <X className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleSaveField('elevator_pitch', editValue)}
                          className="p-1.5 rounded hover:bg-green-500/20 transition-colors"
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" /> : <Check className="w-4 h-4 text-green-500" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">{bible.elevator_pitch}</p>
                  )}
                </div>
              )}

              {/* Messaging pillars */}
              {pillars.length > 0 && (
                <div className={`group rounded-xl border bg-[var(--navy-light)] p-5 space-y-3 transition-colors ${saveSuccess === 'messaging_pillars' ? 'border-green-500/50' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Messaging pillars</p>
                    {editingField !== 'messaging_pillars' && (
                      <button
                        onClick={() => startEditField('messaging_pillars', JSON.stringify(pillars))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--accent)]/10"
                        title="Edit messaging pillars"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      </button>
                    )}
                  </div>
                  {editingField === 'messaging_pillars' ? (
                    <div className="space-y-2">
                      {(() => {
                        let editPillars: string[] = [];
                        try { editPillars = JSON.parse(editValue); } catch { editPillars = pillars.map((p: any) => typeof p === 'string' ? p : p.name || JSON.stringify(p)); }
                        return (
                          <>
                            {editPillars.map((pillar: string, i: number) => (
                              <div key={i} className="flex gap-2 items-center">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                <input
                                  value={pillar}
                                  onChange={(e) => {
                                    const updated = [...editPillars];
                                    updated[i] = e.target.value;
                                    setEditValue(JSON.stringify(updated));
                                  }}
                                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                />
                                <button
                                  onClick={() => {
                                    const updated = editPillars.filter((_: string, j: number) => j !== i);
                                    setEditValue(JSON.stringify(updated));
                                  }}
                                  className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const updated = [...editPillars, ''];
                                setEditValue(JSON.stringify(updated));
                              }}
                              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline mt-1"
                            >
                              <Plus className="w-3 h-3" /> Add pillar
                            </button>
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-[var(--border)] transition-colors" disabled={saving}>
                                <X className="w-4 h-4 text-[var(--text-secondary)]" />
                              </button>
                              <button
                                onClick={() => handleSaveField('messaging_pillars', editValue)}
                                className="p-1.5 rounded hover:bg-green-500/20 transition-colors"
                                disabled={saving}
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" /> : <Check className="w-4 h-4 text-green-500" />}
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pillars.map((pillar: any, i: number) => (
                        <div key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <p className="text-sm text-[var(--text-primary)]">{typeof pillar === 'string' ? pillar : pillar.name || JSON.stringify(pillar)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Brand voice */}
              {bible?.brand_voice_guide && (
                <div className={`group rounded-xl border bg-[var(--navy-light)] p-5 space-y-2 transition-colors ${saveSuccess === 'brand_voice_guide' ? 'border-green-500/50' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Brand voice</p>
                    {editingField !== 'brand_voice_guide' && (
                      <button
                        onClick={() => startEditField('brand_voice_guide', bible.brand_voice_guide)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--accent)]/10"
                        title="Edit brand voice"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      </button>
                    )}
                  </div>
                  {editingField === 'brand_voice_guide' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] p-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y min-h-[120px] font-mono"
                        rows={6}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-[var(--border)] transition-colors" disabled={saving}>
                          <X className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <button
                          onClick={() => handleSaveField('brand_voice_guide', editValue)}
                          className="p-1.5 rounded hover:bg-green-500/20 transition-colors"
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" /> : <Check className="w-4 h-4 text-green-500" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose-content text-sm">
                      <SimpleMarkdown content={bible.brand_voice_guide} />
                    </div>
                  )}
                </div>
              )}

              {/* Full document */}
              {bible?.full_document && (
                <div className={`group rounded-xl border bg-[var(--navy-light)] p-5 space-y-3 transition-colors ${saveSuccess === 'full_document' ? 'border-green-500/50' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Full Narrative document</p>
                    {editingField !== 'full_document' && (
                      <button
                        onClick={() => startEditField('full_document', bible.full_document)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--accent)]/10"
                        title="Edit full document"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      </button>
                    )}
                  </div>
                  {editingField === 'full_document' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] p-3 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y min-h-[400px] font-mono"
                        rows={20}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-secondary)]">{editValue.length.toLocaleString()} characters</span>
                        <div className="flex items-center gap-2">
                          <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-[var(--border)] transition-colors" disabled={saving}>
                            <X className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                          <button
                            onClick={() => handleSaveField('full_document', editValue)}
                            className="p-1.5 rounded hover:bg-green-500/20 transition-colors"
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" /> : <Check className="w-4 h-4 text-green-500" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="prose-content max-h-[500px] overflow-y-auto">
                      <SimpleMarkdown content={bible.full_document} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Buyers tab */}
      {activeTab === 'buyers' && (
        <div className="space-y-4">
          {!hasNarrative ? (
            <div className="text-center py-16 space-y-3">
              <Users className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="font-medium text-[var(--text-secondary)]">No ICP profiles yet</p>
              <p className="text-sm text-[var(--text-secondary)]/60 max-w-sm mx-auto">Complete the interview to generate buyer profiles with full resonance models.</p>
              <button onClick={() => setActiveTab('interview')} className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
                Start interview <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : icpProfiles.length === 0 && !editingIcpProfiles ? (
            <div className="text-center py-16 space-y-2">
              <Users className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="text-sm text-[var(--text-secondary)]">No ICP profiles found in your Narrative.</p>
              <button onClick={() => { setShowRefine(true); setActiveTab('interview'); }} className="text-sm text-[var(--accent)] hover:underline">
                Refine your Narrative
              </button>
              <div className="pt-2">
                <button
                  onClick={() => setEditingIcpProfiles([{ name: '', role: '', pains: [''], attentionTriggers: [''], credibilitySignals: [''], scepticismTriggers: [''], successCriteria: [''] }])}
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add ICP manually
                </button>
              </div>
            </div>
          ) : (
            <div className={`space-y-4 transition-colors ${saveSuccess === 'icp_profiles' ? 'ring-1 ring-green-500/30 rounded-xl' : ''}`}>
              {(editingIcpProfiles || icpProfiles).map((icp: ICP, i: number) => {
                const isEditing = !!editingIcpProfiles;
                const profiles = editingIcpProfiles || icpProfiles;

                return (
                  <div key={i} className="group rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
                    <div className="w-full p-5 flex items-center justify-between gap-4">
                      <button
                        onClick={() => setExpandedIcp(expandedIcp === i ? null : i)}
                        className="flex-1 text-left"
                      >
                        {isEditing ? (
                          <div className="flex gap-3">
                            <input
                              value={icp.name}
                              onChange={(e) => {
                                const updated = [...profiles];
                                updated[i] = { ...updated[i], name: e.target.value };
                                setEditingIcpProfiles(updated);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="ICP Name"
                              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-base font-semibold text-[var(--text-primary)] px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            />
                            <input
                              value={icp.role || ''}
                              onChange={(e) => {
                                const updated = [...profiles];
                                updated[i] = { ...updated[i], role: e.target.value };
                                setEditingIcpProfiles(updated);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Role / Title"
                              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-secondary)] px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            />
                          </div>
                        ) : (
                          <div>
                            <p className="text-base font-semibold text-[var(--text-primary)]">{icp.name}</p>
                            {icp.role && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{icp.role}</p>}
                          </div>
                        )}
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingIcpProfiles(icpProfiles.map(p => ({ ...p })));
                              setExpandedIcp(i);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--accent)]/10"
                            title="Edit ICP"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          </button>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => {
                              const updated = profiles.filter((_: ICP, j: number) => j !== i);
                              setEditingIcpProfiles(updated);
                              if (expandedIcp === i) setExpandedIcp(null);
                            }}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                            title="Delete ICP"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                        <button onClick={() => setExpandedIcp(expandedIcp === i ? null : i)} className="text-[var(--text-secondary)]">
                          {expandedIcp === i ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {expandedIcp === i && (
                      <div className="px-5 pb-5 border-t border-[var(--border)] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {([
                          { label: 'Key pains', key: 'pains' as const },
                          { label: 'Attention triggers', key: 'attentionTriggers' as const },
                          { label: 'Credibility signals', key: 'credibilitySignals' as const },
                          { label: 'Scepticism triggers', key: 'scepticismTriggers' as const },
                          { label: 'Success criteria', key: 'successCriteria' as const },
                        ] as const).map(({ label, key }) => {
                          const items = icp[key] || [];
                          if (!isEditing && items.length === 0) return null;

                          return (
                            <div key={label} className="space-y-2">
                              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
                              {isEditing ? (
                                <div className="space-y-1.5">
                                  {items.map((item: string, j: number) => (
                                    <div key={j} className="flex gap-2 items-center">
                                      <span className="text-[var(--accent)] flex-shrink-0">·</span>
                                      <input
                                        value={item}
                                        onChange={(e) => {
                                          const updated = [...profiles];
                                          const updatedItems = [...(updated[i][key] || [])];
                                          updatedItems[j] = e.target.value;
                                          updated[i] = { ...updated[i], [key]: updatedItems };
                                          setEditingIcpProfiles(updated);
                                        }}
                                        className="flex-1 rounded border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                      />
                                      <button
                                        onClick={() => {
                                          const updated = [...profiles];
                                          const updatedItems = (updated[i][key] || []).filter((_: string, k: number) => k !== j);
                                          updated[i] = { ...updated[i], [key]: updatedItems };
                                          setEditingIcpProfiles(updated);
                                        }}
                                        className="p-0.5 rounded hover:bg-red-500/20 transition-colors"
                                      >
                                        <X className="w-3 h-3 text-red-400" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const updated = [...profiles];
                                      const updatedItems = [...(updated[i][key] || []), ''];
                                      updated[i] = { ...updated[i], [key]: updatedItems };
                                      setEditingIcpProfiles(updated);
                                    }}
                                    className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </button>
                                </div>
                              ) : (
                                <ul className="space-y-1">
                                  {items.map((item: string, j: number) => (
                                    <li key={j} className="text-sm text-[var(--text-primary)] flex gap-2">
                                      <span className="text-[var(--accent)] flex-shrink-0">·</span>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add New ICP / Save / Cancel buttons */}
              {editingIcpProfiles ? (
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      setEditingIcpProfiles([
                        ...editingIcpProfiles,
                        { name: '', role: '', pains: [''], attentionTriggers: [''], credibilitySignals: [''], scepticismTriggers: [''], successCriteria: [''] },
                      ]);
                      setExpandedIcp(editingIcpProfiles.length);
                    }}
                    className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add new ICP
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveIcpProfiles(editingIcpProfiles)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save profiles
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingIcpProfiles([
                      ...icpProfiles.map(p => ({ ...p })),
                      { name: '', role: '', pains: [''], attentionTriggers: [''], credibilitySignals: [''], scepticismTriggers: [''], successCriteria: [''] },
                    ]);
                    setExpandedIcp(icpProfiles.length);
                  }}
                  className="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline pt-2"
                >
                  <Plus className="w-4 h-4" /> Add new ICP
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* What Works tab */}
      {activeTab === 'whatworks' && (
        <div className="space-y-8">
          {!hasNarrative ? (
            <div className="text-center py-16 space-y-3">
              <Target className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="font-medium text-[var(--text-secondary)]">Complete your narrative first</p>
              <p className="text-sm text-[var(--text-secondary)]/60 max-w-sm mx-auto">The &quot;What Works&quot; tab uses your narrative and buyer profiles to build a stakeholder messaging matrix.</p>
              <button onClick={() => setActiveTab('interview')} className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
                Start interview <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Section A: Stakeholder Messaging Matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-[var(--accent)]" />
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Stakeholder Messaging Matrix</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {stakeholderMatrix.length > 0 && !editingStakeholders && (
                      <>
                        <button
                          onClick={handleAiGenerateMatrix}
                          disabled={generatingAiMatrix}
                          className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline disabled:opacity-50"
                        >
                          {generatingAiMatrix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                          Auto-generate
                        </button>
                        <span className="text-[var(--border)]">|</span>
                        <button
                          onClick={() => { setEditingStakeholders(stakeholderMatrix.map(s => ({ ...s }))); setDeleteConfirmIndex(null); }}
                          className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit matrix
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Tailored messaging for each stakeholder in your buyer&apos;s organisation — what to say, what to avoid, and how to prove value.</p>

                {/* AI generation error */}
                {aiMatrixError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3">
                    <Shield className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-400">{aiMatrixError}</p>
                    </div>
                    <button onClick={() => setAiMatrixError(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                  </div>
                )}

                {/* AI generating indicator */}
                {generatingAiMatrix && (
                  <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-6 text-center space-y-3">
                    <Loader2 className="w-8 h-8 mx-auto text-[var(--accent)] animate-spin" />
                    <p className="text-sm font-medium text-[var(--text-primary)]">Generating tailored stakeholder matrix with AI...</p>
                    <p className="text-xs text-[var(--text-secondary)]">Analysing your narrative and buyer profiles to create stakeholder-specific messaging. This may take 15-30 seconds.</p>
                  </div>
                )}

                {stakeholderMatrix.length === 0 && !editingStakeholders && !generatingAiMatrix ? (
                  <div className="text-center py-10 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--navy-light)]">
                    <Target className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-40" />
                    <p className="text-sm text-[var(--text-secondary)]">No stakeholder matrix defined yet.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={handleAiGenerateMatrix}
                        disabled={generatingAiMatrix}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {generatingAiMatrix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                        Auto-generate with AI
                      </button>
                      <span className="text-xs text-[var(--text-secondary)]">or</span>
                      <button
                        onClick={handleGenerateDefaultMatrix}
                        disabled={savingStakeholders}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors disabled:opacity-50"
                      >
                        {savingStakeholders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Use default template
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]/60">AI auto-generate uses your narrative and buyer profiles. Default template uses standard insurance roles.</p>
                  </div>
                ) : !generatingAiMatrix ? (
                  <>
                    <div className={`space-y-3 transition-colors ${saveSuccess === 'stakeholder_matrix' ? 'ring-1 ring-green-500/30 rounded-xl' : ''}`}>
                      {(editingStakeholders || stakeholderMatrix).map((sh, i) => {
                        const isEditing = !!editingStakeholders;
                        const stakeholders = editingStakeholders || stakeholderMatrix;
                        const isExpanded = expandedStakeholder === i;

                        return (
                          <div key={i} className="group rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
                            <div className="w-full p-5 flex items-center justify-between gap-4">
                              <button
                                onClick={() => { setExpandedStakeholder(isExpanded ? null : i); setDeleteConfirmIndex(null); }}
                                className="flex-1 text-left"
                              >
                                <div className="flex items-center gap-3">
                                  {isEditing ? (
                                    <input
                                      value={sh.role}
                                      onChange={(e) => {
                                        const updated = [...stakeholders];
                                        updated[i] = { ...updated[i], role: e.target.value };
                                        setEditingStakeholders(updated);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Role / Title"
                                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-base font-semibold text-[var(--text-primary)] px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                    />
                                  ) : (
                                    <p className="text-base font-semibold text-[var(--text-primary)]">{sh.role}</p>
                                  )}
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                                    sh.buyingRole === 'champion' ? 'bg-green-500/20 text-green-400' :
                                    sh.buyingRole === 'blocker' ? 'bg-red-500/20 text-red-400' :
                                    sh.buyingRole === 'approver' ? 'bg-blue-500/20 text-blue-400' :
                                    sh.buyingRole === 'evaluator' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {sh.buyingRole}
                                  </span>
                                </div>
                                {!isExpanded && sh.primaryConcern && (
                                  <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-1">{sh.primaryConcern}</p>
                                )}
                              </button>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isEditing && (
                                  deleteConfirmIndex === i ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-red-400">Delete?</span>
                                      <button
                                        onClick={() => handleDeleteStakeholder(i)}
                                        className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setDeleteConfirmIndex(null)}
                                        className="px-2 py-0.5 rounded text-xs border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteStakeholder(i)}
                                      className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                      title="Delete stakeholder"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                  )
                                )}
                                <button onClick={() => setExpandedStakeholder(isExpanded ? null : i)} className="text-[var(--text-secondary)]">
                                  {isExpanded ? '▲' : '▼'}
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-5 pb-5 border-t border-[var(--border)] pt-4 space-y-4">
                                {/* Buying role selector */}
                                {isEditing && (
                                  <div>
                                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">Buying role</p>
                                    <div className="flex flex-wrap gap-2">
                                      {BUYING_ROLES.map(role => (
                                        <button
                                          key={role}
                                          onClick={() => {
                                            const updated = [...stakeholders];
                                            updated[i] = { ...updated[i], buyingRole: role };
                                            setEditingStakeholders(updated);
                                          }}
                                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                            sh.buyingRole === role
                                              ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]'
                                              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
                                          }`}
                                        >
                                          {role}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Text fields */}
                                {([
                                  { label: 'Primary concern', key: 'primaryConcern' as const },
                                  { label: 'Success criteria', key: 'successCriteria' as const },
                                  { label: 'Message focus', key: 'messageFocus' as const },
                                ] as const).map(({ label, key }) => (
                                  <div key={key}>
                                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">{label}</p>
                                    {isEditing ? (
                                      <input
                                        value={sh[key] as string}
                                        onChange={(e) => {
                                          const updated = [...stakeholders];
                                          updated[i] = { ...updated[i], [key]: e.target.value };
                                          setEditingStakeholders(updated);
                                        }}
                                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                      />
                                    ) : (
                                      <p className="text-sm text-[var(--text-primary)]">{sh[key] as string || '—'}</p>
                                    )}
                                  </div>
                                ))}

                                {/* Array fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {([
                                    { label: 'Proof types that resonate', key: 'proofTypes' as const },
                                    { label: 'Language to use', key: 'languageToUse' as const },
                                    { label: 'Language to avoid', key: 'languageToAvoid' as const },
                                    { label: 'Scepticism triggers', key: 'scepticismTriggers' as const },
                                    { label: 'Likely blockers', key: 'likelyBlockers' as const },
                                  ] as const).map(({ label, key }) => {
                                    const items = sh[key] || [];
                                    if (!isEditing && items.length === 0) return null;

                                    return (
                                      <div key={key} className="space-y-1.5">
                                        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
                                        {isEditing ? (
                                          <div className="space-y-1.5">
                                            {items.map((item: string, j: number) => (
                                              <div key={j} className="flex gap-2 items-center">
                                                <span className="text-[var(--accent)] flex-shrink-0">·</span>
                                                <input
                                                  value={item}
                                                  onChange={(e) => {
                                                    const updated = [...stakeholders];
                                                    const updatedItems = [...(updated[i][key] || [])];
                                                    updatedItems[j] = e.target.value;
                                                    updated[i] = { ...updated[i], [key]: updatedItems };
                                                    setEditingStakeholders(updated);
                                                  }}
                                                  className="flex-1 rounded border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                                />
                                                <button
                                                  onClick={() => {
                                                    const updated = [...stakeholders];
                                                    const updatedItems = (updated[i][key] || []).filter((_: string, k: number) => k !== j);
                                                    updated[i] = { ...updated[i], [key]: updatedItems };
                                                    setEditingStakeholders(updated);
                                                  }}
                                                  className="p-0.5 rounded hover:bg-red-500/20 transition-colors"
                                                >
                                                  <X className="w-3 h-3 text-red-400" />
                                                </button>
                                              </div>
                                            ))}
                                            <button
                                              onClick={() => {
                                                const updated = [...stakeholders];
                                                const updatedItems = [...(updated[i][key] || []), ''];
                                                updated[i] = { ...updated[i], [key]: updatedItems };
                                                setEditingStakeholders(updated);
                                              }}
                                              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                                            >
                                              <Plus className="w-3 h-3" /> Add
                                            </button>
                                          </div>
                                        ) : (
                                          <ul className="space-y-0.5">
                                            {items.map((item: string, j: number) => (
                                              <li key={j} className="text-sm text-[var(--text-primary)] flex gap-2">
                                                <span className={key === 'languageToAvoid' || key === 'scepticismTriggers' ? 'text-red-400' : 'text-[var(--accent)]'}>·</span>
                                                {item}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add stakeholder + save/cancel */}
                    {editingStakeholders ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            value={newStakeholderRole}
                            onChange={(e) => setNewStakeholderRole(e.target.value)}
                            placeholder="New stakeholder role, e.g. Head of Compliance"
                            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddStakeholder(); }}
                          />
                          <button
                            onClick={handleAddStakeholder}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Stakeholder
                          </button>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingStakeholders(null); setExpandedStakeholder(null); setDeleteConfirmIndex(null); }}
                            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors"
                            disabled={savingStakeholders}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveStakeholders(editingStakeholders)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
                            disabled={savingStakeholders}
                          >
                            {savingStakeholders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save matrix
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {/* Info note */}
                <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 flex items-start gap-3">
                  <Zap className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Your AI team uses this matrix to tailor content and opportunities by audience. Use &quot;Auto-generate&quot; to create a matrix personalised to your narrative.
                  </p>
                </div>
              </div>

              {/* Section B: Buyer Resonance */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--accent)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Buyer Resonance</h2>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">How each buyer persona responds to your messaging — strongest triggers, weak signals, and message fit.</p>

                {icpProfiles.length === 0 ? (
                  <div className="text-center py-10 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--navy-light)]">
                    <Users className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-40" />
                    <p className="text-sm text-[var(--text-secondary)]">No buyer profiles defined yet.</p>
                    <button
                      onClick={() => setActiveTab('buyers')}
                      className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
                    >
                      Go to Buyers tab <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Strongest Triggers summary */}
                    {(() => {
                      const allTriggers = icpProfiles.flatMap(icp => icp.attentionTriggers || []).filter(Boolean);
                      const allPains = icpProfiles.flatMap(icp => icp.pains || []).filter(Boolean);
                      const allCredibility = icpProfiles.flatMap(icp => icp.credibilitySignals || []).filter(Boolean);
                      const allScepticism = icpProfiles.flatMap(icp => icp.scepticismTriggers || []).filter(Boolean);
                      const hasAnyData = allTriggers.length > 0 || allPains.length > 0;

                      if (!hasAnyData) return null;

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Strongest Triggers */}
                          {allTriggers.length > 0 && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-400" />
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Strongest Triggers</p>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">What gets attention across all buyer personas.</p>
                              <ul className="space-y-1">
                                {[...new Set(allTriggers)].slice(0, 6).map((t, j) => (
                                  <li key={j} className="text-sm text-[var(--text-primary)] flex gap-2">
                                    <span className="text-green-400 flex-shrink-0">·</span>{t}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Weak Signals */}
                          {allCredibility.length > 0 && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-yellow-400" />
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Weak Signals</p>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">Indicates interest but needs reinforcement.</p>
                              <ul className="space-y-1">
                                {[...new Set(allCredibility)].slice(0, 6).map((c, j) => (
                                  <li key={j} className="text-sm text-[var(--text-primary)] flex gap-2">
                                    <span className="text-yellow-400 flex-shrink-0">·</span>{c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Scepticism Risks */}
                          {allScepticism.length > 0 && (
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-red-400" />
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Scepticism Risks</p>
                              </div>
                              <p className="text-xs text-[var(--text-secondary)]">What makes buyers suspicious — avoid these.</p>
                              <ul className="space-y-1">
                                {[...new Set(allScepticism)].slice(0, 6).map((s, j) => (
                                  <li key={j} className="text-sm text-[var(--text-primary)] flex gap-2">
                                    <span className="text-red-400 flex-shrink-0">·</span>{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Message Fit Assessment per buyer */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-[var(--accent)]" />
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Message Fit per Buyer</p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {icpProfiles.map((icp, i) => {
                          const hasPains = (icp.pains?.length || 0) > 0;
                          const hasTriggers = (icp.attentionTriggers?.length || 0) > 0;
                          const hasCredibility = (icp.credibilitySignals?.length || 0) > 0;
                          const hasScepticism = (icp.scepticismTriggers?.length || 0) > 0;
                          const hasSuccess = (icp.successCriteria?.length || 0) > 0;

                          const dataPoints = [hasPains, hasTriggers, hasCredibility, hasScepticism, hasSuccess];
                          const filledCount = dataPoints.filter(Boolean).length;
                          const fitScore = Math.round((filledCount / dataPoints.length) * 100);

                          // Find matching stakeholder for this buyer
                          const matchingStakeholder = stakeholderMatrix.find(sh =>
                            icp.role && sh.role.toLowerCase().includes(icp.role.toLowerCase().split(' ')[0])
                          );

                          return (
                            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-base font-semibold text-[var(--text-primary)]">{icp.name}</p>
                                  {icp.role && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{icp.role}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  {matchingStakeholder && (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                                      matchingStakeholder.buyingRole === 'champion' ? 'bg-green-500/20 text-green-400' :
                                      matchingStakeholder.buyingRole === 'blocker' ? 'bg-red-500/20 text-red-400' :
                                      matchingStakeholder.buyingRole === 'approver' ? 'bg-blue-500/20 text-blue-400' :
                                      matchingStakeholder.buyingRole === 'evaluator' ? 'bg-yellow-500/20 text-yellow-400' :
                                      'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {matchingStakeholder.buyingRole}
                                    </span>
                                  )}
                                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    fitScore >= 80 ? 'bg-green-500/20 text-green-400' :
                                    fitScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {fitScore}% fit
                                  </div>
                                </div>
                              </div>

                              {/* Fit progress bar */}
                              <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    fitScore >= 80 ? 'bg-green-400' :
                                    fitScore >= 40 ? 'bg-yellow-400' :
                                    'bg-red-400'
                                  }`}
                                  style={{ width: `${fitScore}%` }}
                                />
                              </div>

                              {/* Data completeness checklist */}
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  { label: 'Key pains', filled: hasPains },
                                  { label: 'Attention triggers', filled: hasTriggers },
                                  { label: 'Credibility signals', filled: hasCredibility },
                                  { label: 'Scepticism triggers', filled: hasScepticism },
                                  { label: 'Success criteria', filled: hasSuccess },
                                ].map(({ label, filled }) => (
                                  <div key={label} className="flex items-center gap-1.5">
                                    {filled ? (
                                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                                    ) : (
                                      <div className="w-3 h-3 rounded-full border border-[var(--border)] flex-shrink-0" />
                                    )}
                                    <span className={`text-xs ${filled ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/60'}`}>
                                      {label}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {filledCount < dataPoints.length && (
                                <button
                                  onClick={() => setActiveTab('buyers')}
                                  className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
                                >
                                  Complete profile <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Section C: Strongest Triggers by Stakeholder */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Strongest Triggers</h2>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Which themes and topics trigger the most engagement per stakeholder.</p>
                {stakeholderMatrix.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stakeholderMatrix.filter(sh => sh.proofTypes.length > 0 || sh.languageToUse.length > 0).slice(0, 6).map((sh, i) => (
                      <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">{sh.role}</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-wide ${
                            sh.buyingRole === 'champion' ? 'bg-green-500/20 text-green-400' :
                            sh.buyingRole === 'blocker' ? 'bg-red-500/20 text-red-400' :
                            sh.buyingRole === 'approver' ? 'bg-blue-500/20 text-blue-400' :
                            sh.buyingRole === 'evaluator' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {sh.buyingRole}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[...sh.proofTypes, ...sh.languageToUse].filter(Boolean).slice(0, 5).map((tag, j) => (
                            <span key={j} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {sh.messageFocus && (
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{sh.messageFocus}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--navy-light)]">
                    <BarChart3 className="w-8 h-8 mx-auto text-[var(--text-secondary)] opacity-40" />
                    <p className="text-sm text-[var(--text-secondary)]">Generate your stakeholder matrix to see trigger analysis</p>
                    <p className="text-xs text-[var(--text-secondary)]/60">Trigger data is derived from your stakeholder messaging matrix.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Competitors tab */}
      {activeTab === 'competitors' && (
        <div className="space-y-6">
          {!hasNarrative ? (
            <div className="text-center py-16 space-y-3">
              <Crosshair className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="font-medium text-[var(--text-secondary)]">No competitors defined yet</p>
              <p className="text-sm text-[var(--text-secondary)]/60 max-w-sm mx-auto">Complete the interview first, then define your competitors so your AI team can track their market activity.</p>
              <button onClick={() => setActiveTab('interview')} className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
                Start interview <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Add competitor form */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add a Competitor</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Company name *</label>
                    <input
                      value={newCompetitorName}
                      onChange={(e) => setNewCompetitorName(e.target.value)}
                      placeholder="e.g. Acme Insurance"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Website URL</label>
                    <input
                      value={newCompetitorWebsite}
                      onChange={(e) => setNewCompetitorWebsite(e.target.value)}
                      placeholder="e.g. https://acme-insurance.com"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Why they compete</label>
                  <input
                    value={newCompetitorDescription}
                    onChange={(e) => setNewCompetitorDescription(e.target.value)}
                    placeholder="e.g. Competes on cyber MGA space"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--navy-dark)] text-sm text-[var(--text-primary)] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
                <button
                  onClick={handleAddCompetitor}
                  disabled={!newCompetitorName.trim() || savingCompetitors}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingCompetitors ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Competitor
                </button>
              </div>

              {/* Competitor list */}
              {competitorsList.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Crosshair className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
                  <p className="font-medium text-[var(--text-secondary)]">No competitors defined yet</p>
                  <p className="text-sm text-[var(--text-secondary)]/60 max-w-md mx-auto">
                    Define your competitors so your AI team can track their market activity.
                  </p>
                </div>
              ) : (
                <div className={`space-y-3 transition-colors ${saveSuccess === 'competitors' ? 'ring-1 ring-green-500/30 rounded-xl' : ''}`}>
                  {competitorsList.map((comp, i) => (
                    <div key={i} className="group rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-base font-semibold text-[var(--text-primary)]">{comp.name}</p>
                        {comp.website && (
                          <a
                            href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {comp.website}
                          </a>
                        )}
                        {comp.description && (
                          <p className="text-sm text-[var(--text-secondary)]">{comp.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteCompetitor(i)}
                        disabled={savingCompetitors}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-500/20 flex-shrink-0"
                        title="Remove competitor"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Info note */}
              <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 flex items-start gap-3">
                <Zap className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Your Market Analyst will track these competitors across all sources.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
