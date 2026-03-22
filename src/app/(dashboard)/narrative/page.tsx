'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BookOpen, MessageSquare, Users, Send, Upload, RefreshCw,
  Sparkles, CheckCircle, Loader2, ArrowRight, Plus, Target,
  Brain, Shield, Zap, Eye, FileText, ChevronLeft, ChevronRight,
  Edit, Download,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import ExportPdfButton from '@/components/ExportPdfButton';

type SubView = 'interview' | 'narrative' | 'buyers';

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

  // Interview state
  const [blockIndex, setBlockIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [allBlocksComplete, setAllBlocksComplete] = useState(false);
  const [blockAnswers, setBlockAnswers] = useState<Record<string, string[]>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);

  // Buyers expanded
  const [expandedIcp, setExpandedIcp] = useState<number | null>(null);

  const loadBible = useCallback(async () => {
    setBibleLoading(true);
    try {
      const res = await fetch('/api/messaging-bible');
      if (res.ok) {
        const data = await res.json();
        if (data.bible) {
          setBible(data.bible);
          if (data.bible.status === 'complete' || data.bible.full_document) {
            setAllBlocksComplete(true);
          }
        }
      }
    } catch {}
    finally { setBibleLoading(false); }
  }, []);

  useEffect(() => { loadBible(); }, [loadBible]);

  // Seed opening question when interview tab is active
  useEffect(() => {
    if (activeTab === 'interview' && messages.length === 0) {
      const block = BLOCKS[blockIndex];
      setMessages([
        {
          role: 'ai',
          text: `Let's build your Narrative — the strategic foundation that drives everything else in Monitus.\n\nWe'll work through 5 blocks. Each one is a focused conversation.\n\n**${block.label}**\n${block.description}\n\n${block.questions[0]}`,
        },
      ]);
    }
  }, [activeTab, messages.length, blockIndex]);

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
      // Send to API for conversational follow-up
      const res = await fetch('/api/messaging-bible/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
          block: block.key,
          questionIndex,
          answer: userText,
        }),
      });

      let aiReply = '';
      const nextQuestionIndex = questionIndex + 1;
      const nextBlockIndex = blockIndex + 1;
      const isLastQuestion = nextQuestionIndex >= block.questions.length;
      const isLastBlock = isLastQuestion && nextBlockIndex >= BLOCKS.length;

      if (res.ok) {
        const data = await res.json();
        aiReply = data.reply || '';
      }

      // Advance to next question / block
      if (isLastBlock) {
        setAllBlocksComplete(true);
        setMessages(prev => [
          ...prev,
          {
            role: 'ai',
            text: aiReply || "That's everything. You've completed all 5 blocks.\n\nClick **Generate Narrative** to produce your complete Narrative Definition — positioning, pillars, voice, competitive framing, ICP profiles, and off-limits language.",
          },
        ]);
      } else if (isLastQuestion) {
        const nextBlock = BLOCKS[nextBlockIndex];
        setBlockIndex(nextBlockIndex);
        setQuestionIndex(0);
        setMessages(prev => [
          ...prev,
          {
            role: 'ai',
            text: aiReply || `Good. Let's move to the next block.\n\n**${nextBlock.label}**\n${nextBlock.description}\n\n${nextBlock.questions[0]}`,
          },
        ]);
      } else {
        setQuestionIndex(nextQuestionIndex);
        setMessages(prev => [
          ...prev,
          {
            role: 'ai',
            text: aiReply || block.questions[nextQuestionIndex],
          },
        ]);
      }
    } catch {
      // Fallback: advance without API
      const nextQuestionIndex = questionIndex + 1;
      const nextBlockIndex = blockIndex + 1;
      const isLastQuestion = nextQuestionIndex >= block.questions.length;
      const isLastBlock = isLastQuestion && nextBlockIndex >= BLOCKS.length;

      if (isLastBlock) {
        setAllBlocksComplete(true);
        setMessages(prev => [...prev, { role: 'ai', text: "You've completed all 5 blocks. Click **Generate Narrative** to produce your Narrative Definition." }]);
      } else if (isLastQuestion) {
        const nextBlock = BLOCKS[nextBlockIndex];
        setBlockIndex(nextBlockIndex);
        setQuestionIndex(0);
        setMessages(prev => [...prev, { role: 'ai', text: `**${nextBlock.label}**\n${nextBlock.description}\n\n${nextBlock.questions[0]}` }]);
      } else {
        setQuestionIndex(nextQuestionIndex);
        setMessages(prev => [...prev, { role: 'ai', text: block.questions[nextQuestionIndex] }]);
      }
    } finally {
      setSending(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/messaging-bible/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: blockAnswers }),
      });
      if (res.ok) {
        await loadBible();
        setActiveTab('narrative');
      }
    } catch {}
    finally { setGenerating(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await fetch('/api/messaging-bible/upload', { method: 'POST', body: formData });
      await loadBible();
    } catch {}
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
              <span>Block {Math.min(blockIndex + 1, BLOCKS.length)} of {BLOCKS.length}</span>
              <span>{allBlocksComplete ? 'All blocks complete' : BLOCKS[blockIndex]?.label}</span>
            </div>
            <div className="flex gap-1">
              {BLOCKS.map((b, i) => (
                <div
                  key={b.key}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    i < blockIndex || allBlocksComplete ? 'bg-[var(--accent)]' :
                    i === blockIndex ? 'bg-[var(--accent)]/50' : 'bg-[var(--navy-lighter)]'
                  }`}
                />
              ))}
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
              <div className="p-4 border-t border-[var(--border)] flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--text-secondary)]">All 5 blocks complete. Ready to generate your Narrative.</p>
                <Button
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-1.5"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate Narrative
                </Button>
              </div>
            ) : (
              <div className="p-4 border-t border-[var(--border)] flex gap-3">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type your answer..."
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--navy-lighter)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
                <Button
                  variant="primary"
                  onClick={sendMessage}
                  disabled={sending || !inputText.trim()}
                  className="flex-shrink-0 flex items-center gap-1.5"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
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
