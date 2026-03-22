'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BookOpen, MessageSquare, Users, Send, Upload, RefreshCw,
  Sparkles, CheckCircle, Loader2, ArrowRight, Plus, Target,
  Brain, Shield, Zap, Eye, FileText, ChevronLeft, ChevronRight,
  Edit, Download, ChevronDown, Trash2, Star,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import ExportPdfButton from '@/components/ExportPdfButton';

type SubView = 'interview' | 'narrative' | 'buyers';

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

const BLOCKS: InterviewBlock[] = [
  {
    key: 'framing',
    label: 'A. Category & Company Framing',
    description: 'How your company is currently understood — and how it should be.',
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

  // Upload state
  const [uploading, setUploading] = useState(false);

  // Buyers expanded
  const [expandedIcp, setExpandedIcp] = useState<number | null>(null);

  const activeNarrative = narratives.find(n => n.id === activeNarrativeId) || null;

  // Load narratives
  const loadNarratives = useCallback(async () => {
    setNarrativesLoading(true);
    try {
      const res = await fetch('/api/narratives');
      if (res.ok) {
        const data = await res.json();
        const items: Narrative[] = data.narratives || [];
        setNarratives(items);
        // Auto-select default or first narrative
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
          // Do NOT set allBlocksComplete here — that is driven by the interview flow,
          // not by whether a bible document already exists.
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

  // Load existing interview session or seed opening question
  useEffect(() => {
    if (activeTab !== 'interview') return;
    if (messages.length > 0) return;

    // Try to resume an existing interview session from the API
    const loadSession = async () => {
      try {
        const res = await fetch('/api/messaging-bible/interview');
        if (res.ok) {
          const data = await res.json();
          if (data.sessionId && data.messages && data.messages.length > 0) {
            setInterviewSessionId(data.sessionId);
            setInterviewPhase(data.phase || 'positioning');
            // Convert API message format to ChatMessage format
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
          // No existing session — show initial greeting
          if (data.initialGreeting) {
            const block = BLOCKS[0];
            setMessages([
              {
                role: 'ai',
                text: `Let's build your Narrative -- the strategic foundation that drives everything else in Monitus.\n\nWe'll work through a focused conversation in two phases. I'll ask the questions, you answer honestly.\n\n**${block.label}**\n${block.description}\n\n${block.questions[0]}`,
              },
            ]);
            return;
          }
        }
      } catch {
        // Fallback: seed with opening question
      }

      // Fallback seed
      const block = BLOCKS[blockIndex];
      setMessages([
        {
          role: 'ai',
          text: `Let's build your Narrative -- the strategic foundation that drives everything else in Monitus.\n\nWe'll work through 5 blocks. Each one is a focused conversation.\n\n**${block.label}**\n${block.description}\n\n${block.questions[0]}`,
        },
      ]);
    };

    loadSession();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Record answer for current block/question
    const block = BLOCKS[blockIndex];
    setBlockAnswers(prev => ({
      ...prev,
      [block.key]: [...(prev[block.key] || []), userText],
    }));

    try {
      // Send to the conversational interview API
      const res = await fetch('/api/messaging-bible/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          sessionId: interviewSessionId,
          phase: interviewPhase,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Store session ID for continuity
        if (data.sessionId) {
          setInterviewSessionId(data.sessionId);
        }

        // Track phase transitions
        if (data.phase) {
          setInterviewPhase(data.phase);
        }

        const aiReply = data.reply || '';

        // Check if the interview is fully complete (both phases done)
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
          // Phase A complete, moving to Phase B
          // Advance block index to reflect progress (blocks 0-2 = positioning, 3-4 = voice)
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
          // Normal follow-up question from the AI
          // Estimate block progress from the conversation length and phase
          const userMsgCount = newMessages.filter(m => m.role === 'user').length;
          if (data.phase === 'positioning') {
            // Roughly map user messages to blocks A-C (3 blocks, ~2 msgs each)
            const estimatedBlock = Math.min(Math.floor(userMsgCount / 2), 2);
            setBlockIndex(estimatedBlock);
          } else if (data.phase === 'voice') {
            // Blocks D-E
            const voiceUserMsgs = userMsgCount; // total msgs in session
            const estimatedBlock = Math.min(3 + Math.floor(Math.max(0, voiceUserMsgs - 6) / 3), 4);
            setBlockIndex(estimatedBlock);
          }

          setMessages(prev => [
            ...prev,
            { role: 'ai', text: aiReply },
          ]);
        }
      } else {
        // API error — fallback to local question progression
        advanceLocally(newMessages, block);
      }
    } catch {
      // Network error — fallback to local question progression
      advanceLocally(newMessages, block);
    } finally {
      setSending(false);
    }
  };

  // Fallback local progression when API is unavailable
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
      // First ensure we have a bible record (the interview API auto-creates one on completion)
      // Reload bible to get the latest ID
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
        // No bible exists yet — create one from block answers via the wizard POST endpoint
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

      // Now call the generate endpoint with the bible ID
      const res = await fetch('/api/messaging-bible/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibleId, narrative_id: activeNarrativeId }),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream')) {
          // Handle streaming response
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let fullDoc = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              // Parse SSE events
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.text) fullDoc += parsed.text;
                    if (parsed.done) {
                      // Generation complete
                    }
                  } catch {}
                }
              }
            }
          }
        }
        // Reload bible to get the generated document
        await loadBible();
        setActiveTab('narrative');
      }
    } catch (err) {
      console.error('Generation error:', err);
    }
    finally { setGenerating(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/messaging-bible/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Upload failed');
        return;
      }
      const data = await res.json();
      const extracted = data.extractedText || {};
      const summary = extracted.summary || extracted.what_they_do || '';
      if (summary) {
        setMessages(prev => [
          ...prev,
          { role: 'ai' as const, text: `I've extracted information from "${file.name}":\n\n${summary}${extracted.key_differentiators ? `\n\n**Key differentiators:** ${extracted.key_differentiators}` : ''}${extracted.target_buyers ? `\n\n**Target buyers:** ${extracted.target_buyers}` : ''}${extracted.value_proposition ? `\n\n**Value proposition:** ${extracted.value_proposition}` : ''}\n\nI'll use this as context. Let's continue — how would your ideal buyer currently describe what you do?` },
        ]);
      }
    } catch {
      alert('Failed to process file. Try a .txt or .md file.');
    }
    finally { setUploading(false); }
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

      {/* Narrative Selector */}
      <div className="flex items-center gap-3">
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
              <span className="ml-1.5 text-[10px] text-[var(--text-secondary)]/60">— complete interview first</span>
            )}
          </button>
        ))}
      </div>

      {/* Interview */}
      {activeTab === 'interview' && (
        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>
                {allBlocksComplete
                  ? `${BLOCKS.length} of ${BLOCKS.length} complete`
                  : `Block ${blockIndex + 1} of ${BLOCKS.length}`}
              </span>
              <span>
                {allBlocksComplete
                  ? 'All blocks complete'
                  : BLOCKS[blockIndex]?.label}
              </span>
            </div>
            <div className="flex gap-1">
              {BLOCKS.map((b, i) => {
                const isComplete = allBlocksComplete || i < blockIndex;
                const isCurrent = !allBlocksComplete && i === blockIndex;
                const hasStarted = isCurrent && messages.filter(m => m.role === 'user').length > 0;
                return (
                  <div
                    key={b.key}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      isComplete ? 'bg-[var(--accent)]' :
                      hasStarted ? 'bg-[var(--accent)]/50' :
                      isCurrent ? 'bg-[var(--accent)]/25' : 'bg-[var(--navy-lighter)]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Upload option */}
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Already have documents?</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Upload a pitch deck, website copy, or sales deck to supplement the interview.</p>
            </div>
            <label className="cursor-pointer">
              <input type="file" accept=".txt,.pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--navy-lighter)] transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload
              </span>
            </label>
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
                <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Elevator pitch</p>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">{bible.elevator_pitch}</p>
                </div>
              )}

              {/* Messaging pillars */}
              {pillars.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Messaging pillars</p>
                  <div className="space-y-2">
                    {pillars.map((pillar: any, i: number) => (
                      <div key={i} className="flex gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <p className="text-sm text-[var(--text-primary)]">{typeof pillar === 'string' ? pillar : pillar.name || JSON.stringify(pillar)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand voice */}
              {bible?.brand_voice_guide && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Brand voice</p>
                  <div className="prose-content text-sm">
                    <SimpleMarkdown content={bible.brand_voice_guide} />
                  </div>
                </div>
              )}

              {/* Full document */}
              {bible?.full_document && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] p-5 space-y-3">
                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Full Narrative document</p>
                  <div className="prose-content max-h-[500px] overflow-y-auto">
                    <SimpleMarkdown content={bible.full_document} />
                  </div>
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
          ) : icpProfiles.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Users className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-40" />
              <p className="text-sm text-[var(--text-secondary)]">No ICP profiles found in your Narrative.</p>
              <button onClick={() => setActiveTab('interview')} className="text-sm text-[var(--accent)] hover:underline">
                Recalibrate your Narrative
              </button>
            </div>
          ) : (
            icpProfiles.map((icp: ICP, i: number) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--navy-light)] overflow-hidden">
                <button
                  onClick={() => setExpandedIcp(expandedIcp === i ? null : i)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left"
                >
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">{icp.name}</p>
                    {icp.role && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{icp.role}</p>}
                  </div>
                  <span className="text-[var(--text-secondary)] flex-shrink-0">
                    {expandedIcp === i ? '▲' : '▼'}
                  </span>
                </button>

                {expandedIcp === i && (
                  <div className="px-5 pb-5 border-t border-[var(--border)] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      { label: 'Key pains', items: icp.pains },
                      { label: 'Attention triggers', items: icp.attentionTriggers },
                      { label: 'Credibility signals', items: icp.credibilitySignals },
                      { label: 'Scepticism triggers', items: icp.scepticismTriggers },
                      { label: 'Success criteria', items: icp.successCriteria },
                    ].map(({ label, items }) =>
                      items?.length ? (
                        <div key={label} className="space-y-2">
                          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{label}</p>
                          <ul className="space-y-1">
                            {items.map((item, j) => (
                              <li key={j} className="text-sm text-[var(--text-primary)] flex gap-2">
                                <span className="text-[var(--accent)] flex-shrink-0">·</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
