'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BookOpen, MessageSquare, Users, Send, Upload, RefreshCw,
  Sparkles, CheckCircle, Loader2, ArrowRight, Plus, Target,
  Brain, Shield, Zap, Eye, FileText, ChevronLeft, ChevronRight,
  Edit, Download, ChevronDown, Trash2, Star, Globe, FileUp,
  X, Check, Pencil,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import ExportPdfButton from '@/components/ExportPdfButton';

type SubView = 'interview' | 'narrative' | 'buyers';
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Buyers expanded
  const [expandedIcp, setExpandedIcp] = useState<number | null>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [editingIcpProfiles, setEditingIcpProfiles] = useState<ICP[] | null>(null);

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
      const url = activeNarrativeId
        ? `/api/messaging-bible?narrative_id=${activeNarrativeId}`
        : '/api/messaging-bible';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.bible) {
          setBible(data.bible);
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
        alert(err.error || 'Upload failed');
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
      alert('Failed to process file. Try a .txt or .md file.');
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

      // No existing session -- seed with context-aware opening
      if (knownContext) {
        const sources: string[] = [];
        if (websiteData) sources.push('your website');
        if (uploadData) sources.push('your documents');
        const sourceText = sources.join(' and ');

        setMessages([
          {
            role: 'ai',
            text: `I've reviewed ${sourceText}. Here's what I know so far:\n\n${summary}\n\nI just need to clarify a few things to complete your Narrative. Let's start.`,
          },
        ]);
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

  const hasNarrative = !!(bible?.full_document || bible?.company_description);

  const tabs: { key: SubView; label: string }[] = [
    { key: 'interview', label: 'Interview' },
    { key: 'narrative', label: 'Narrative' },
    { key: 'buyers', label: 'Buyers' },
  ];

  const icpProfiles: ICP[] = (() => {
    try { return JSON.parse(bible?.icp_profiles || '[]'); } catch { return []; }
  })();

  const pillars: string[] = (() => {
    try {
      const p = JSON.parse(bible?.messaging_pillars || bible?.narrative_pillars || '[]');
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  })();

  if (bibleLoading) {
    return (
      <div className="flex items-center justify-center min-h-64 text-[var(--text-secondary)]">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Narrative...
      </div>
    );
  }

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
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="url"
              value={websiteUrl}
              onChange={e => { setWebsiteUrl(e.target.value); setScanError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleScanWebsite(); }}
              placeholder="https://yourcompany.com"
              className="w-full pl-10 pr-4 py-3 text-sm bg-[var(--navy)] border-2 border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
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

  // Render the interview step (gap-filling)
  const renderInterviewStep = () => (
    <div className="space-y-6">
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
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

      {/* Narrative Selector — only show when user has 2+ narratives */}
      {narratives.length > 1 && <div className="flex items-center gap-3">
        <div className="relative" ref={narrativeDropdownRef}>
          <button
            onClick={() => setShowNarrativeDropdown(!showNarrativeDropdown)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--navy-light)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors min-w-[180px]"
          >
            {narrativesLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {activeNarrative?.is_default && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                <span className="truncate">{activeNarrative?.name || 'Select narrative'}</span>
                <ChevronDown className="w-4 h-4 ml-auto flex-shrink-0 text-[var(--text-secondary)]" />
              </>
            )}
          </button>

          {showNarrativeDropdown && (
            <div className="absolute z-50 mt-1 w-72 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {narratives.map(n => (
                  <div key={n.id} className="group flex items-center gap-2">
                    <button
                      onClick={() => { setActiveNarrativeId(n.id); setShowNarrativeDropdown(false); }}
                      className={`flex-1 flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                        n.id === activeNarrativeId
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--navy-lighter)]'
                      }`}
                    >
                      {n.is_default && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      <span className="truncate">{n.name}</span>
                      {n.has_document && <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0 ml-auto" />}
                    </button>
                    <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.is_default && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSetDefault(n.id); }}
                            title="Set as default"
                            className="p-1 rounded text-[var(--text-secondary)] hover:text-amber-400 transition-colors"
                          >
                            <Star className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNarrative(n.id); }}
                            title="Delete narrative"
                            className="p-1 rounded text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                          >
                            {deletingNarrativeId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {narratives.length === 0 && !narrativesLoading && (
                  <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">No narratives yet. Create one to get started.</p>
                )}
              </div>
              <div className="border-t border-[var(--border)]">
                {showAddNarrative ? (
                  <div className="p-3 space-y-2">
                    <input
                      type="text"
                      value={newNarrativeName}
                      onChange={e => setNewNarrativeName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddNarrative(); if (e.key === 'Escape') setShowAddNarrative(false); }}
                      placeholder="e.g. Marine, Aviation, Political Risk"
                      className="w-full px-3 py-1.5 text-sm bg-[var(--navy)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={handleAddNarrative} disabled={!newNarrativeName.trim() || addingNarrative}>
                        {addingNarrative ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setShowAddNarrative(false); setNewNarrativeName(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddNarrative(true)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--accent)] hover:bg-[var(--navy-lighter)] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Narrative
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {activeNarrative && (
          <span className="text-xs text-[var(--text-secondary)]">
            {activeNarrative.is_default ? 'Default narrative' : 'Practice area'}
          </span>
        )}
      </div>}

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
              {/* Status */}
              <div className="flex items-center justify-between rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Narrative Definition active</span>
                </div>
                <button
                  onClick={() => setActiveTab('interview')}
                  className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" /> Recalibrate
                </button>
              </div>

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
              <button onClick={() => setActiveTab('interview')} className="text-sm text-[var(--accent)] hover:underline">
                Recalibrate your Narrative
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
    </div>
  );
}
