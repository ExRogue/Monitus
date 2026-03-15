'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Building2,
  Users,
  Swords,
  LayoutGrid,
  Sparkles,
  Copy,
  Download,
  Check,
  Loader2,
  FileText,
  MessageSquare,
  ClipboardList,
  Send,
  Bot,
  User,
  ArrowRight,
  Zap,
  Newspaper,
  Pen,
  Upload,
  SkipForward,
  Shield,
  Flame,
  Handshake,
  KeyRound,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import SimpleMarkdown from '@/components/SimpleMarkdown';
import LinkedInPreview from '@/components/LinkedInPreview';
import ExportPdfButton from '@/components/ExportPdfButton';
import { VOICE_ARCHETYPES } from '@/lib/voice-archetypes';

const ARCHETYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Flame,
  Handshake,
  KeyRound,
  Lightbulb,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TargetAudience {
  name: string;
  role: string;
  painPoints: string;
}

interface Competitor {
  name: string;
  difference: string;
}

interface Department {
  name: string;
  focus: 'strategic' | 'operational';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Company', icon: Building2 },
  { label: 'Audience', icon: Users },
  { label: 'Competition', icon: Swords },
  { label: 'Departments', icon: LayoutGrid },
  { label: 'Generate', icon: Sparkles },
];

const COMPANY_TYPES = [
  { value: 'mga', label: 'MGA (Managing General Agent)' },
  { value: 'broker', label: 'Broker' },
  { value: 'carrier', label: 'Carrier / Insurer' },
  { value: 'insurtech', label: 'Insurtech' },
  { value: 'reinsurer', label: 'Reinsurer' },
  { value: 'tpa', label: 'Third Party Administrator' },
  { value: 'other', label: 'Other' },
];

const DEPARTMENT_OPTIONS = [
  'C-Suite',
  'Underwriting',
  'Claims',
  'IT / Technology',
  'Compliance',
  'Operations',
  'Marketing',
  'Sales',
  'Finance',
  'HR',
];

const CHANNEL_OPTIONS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'Email Newsletter' },
  { id: 'trade_media', label: 'Trade Media / PR' },
  { id: 'internal', label: 'Internal Briefings' },
];

const inputClass =
  'w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent';

// ─── Interview Chat Component ─────────────────────────────────────────────────

function InterviewChat({
  onComplete,
  existingBible,
  selectedArchetypeId,
}: {
  onComplete: (extractedData: any) => void;
  existingBible: any;
  selectedArchetypeId: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'positioning' | 'voice'>('positioning');
  const [status, setStatus] = useState<'none' | 'active' | 'complete'>('none');
  const [progressHint, setProgressHint] = useState('');
  const [phaseTransition, setPhaseTransition] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  // Load existing session or get greeting
  useEffect(() => {
    fetch('/api/messaging-bible/interview')
      .then((r) => r.json())
      .then((data) => {
        if (data.sessionId) {
          setSessionId(data.sessionId);
          setPhase(data.phase || 'positioning');
          setStatus(data.status || 'active');
          if (data.progressHint) setProgressHint(data.progressHint);

          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          } else if (data.initialGreeting) {
            setMessages([{ role: 'assistant', content: data.initialGreeting }]);
          }

          if (data.status === 'complete' && data.extractedData) {
            setInterviewDone(true);
            setExtractedData(data.extractedData);
          }
        } else if (data.initialGreeting) {
          setMessages([{ role: 'assistant', content: data.initialGreeting }]);
        }
      })
      .catch(() => {
        setMessages([
          {
            role: 'assistant',
            content:
              "Hi there! I'm your brand strategist, and I'm here to help you build a comprehensive messaging strategy. Let's start with the basics -- tell me about your company. What do you do, and what part of the insurance or insurtech world do you operate in?",
          },
        ]);
      });
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setError('');
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setSending(true);

    try {
      const res = await fetch('/api/messaging-bible/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          phase,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send message');
        setSending(false);
        return;
      }

      if (data.sessionId) setSessionId(data.sessionId);
      if (data.progressHint) setProgressHint(data.progressHint);

      // Phase transition
      if (data.phaseComplete && data.phase === 'voice') {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        setPhaseTransition(true);

        // Brief pause for the transition animation
        setTimeout(() => {
          setPhase('voice');
          setPhaseTransition(false);
        }, 2000);
      } else if (data.interviewComplete) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        setInterviewDone(true);
        setExtractedData(data.extractedData);
        setStatus('complete');
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.phase) setPhase(data.phase);
      }
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerateBible = async () => {
    if (!extractedData) return;
    setGenerating(true);
    setError('');

    try {
      // Save extracted data to messaging bible via existing endpoint
      const saveRes = await fetch('/api/messaging-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: extractedData.companyName || '',
          companyType: extractedData.companyType || '',
          niche: extractedData.niche || '',
          companyDescription: extractedData.companyDescription || '',
          targetAudiences: extractedData.targetAudiences || [],
          competitors: extractedData.competitors || [],
          differentiators: extractedData.differentiators || [],
          keyChallenges: extractedData.keyChallenges || [],
          departments: extractedData.departments || [],
          channels: extractedData.channels || ['linkedin', 'email', 'trade_media'],
          voiceArchetypeId: selectedArchetypeId || undefined,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setError(saveData.error || 'Failed to save interview data');
        setGenerating(false);
        return;
      }

      // Generate bible
      const genRes = await fetch('/api/messaging-bible/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibleId: saveData.bibleId }),
      });

      const genData = await genRes.json();
      if (!genRes.ok) {
        setError(genData.error || 'Failed to generate bible');
        setGenerating(false);
        return;
      }

      onComplete(genData.document);
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleNewSession = async () => {
    setMessages([]);
    setSessionId(null);
    setPhase('positioning');
    setStatus('none');
    setInterviewDone(false);
    setExtractedData(null);
    setProgressHint('');
    setError('');

    // Start fresh
    setMessages([
      {
        role: 'assistant',
        content:
          "Hi there! I'm your brand strategist, and I'm here to help you build a comprehensive messaging strategy. Let's start with the basics -- tell me about your company. What do you do, and what part of the insurance or insurtech world do you operate in?",
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] min-h-[500px]">
      {/* Phase indicator */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-500 ${
            phase === 'positioning'
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
              : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
          }`}
        >
          {phase === 'positioning' ? (
            <Building2 className="w-3.5 h-3.5" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Phase 1: Positioning
        </div>
        <ChevronRight className="w-3 h-3 text-[var(--text-secondary)]" />
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-500 ${
            phase === 'voice'
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
              : status === 'complete'
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : 'text-[var(--text-secondary)] border border-[var(--border)]'
          }`}
        >
          {status === 'complete' ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5" />
          )}
          Phase 2: Voice & Tone
        </div>

        {status === 'complete' && (
          <button
            onClick={handleNewSession}
            className="ml-auto text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Start new interview
          </button>
        )}
      </div>

      {/* Progress hint */}
      {progressHint && !interviewDone && (
        <div className="mb-3 px-3 py-2 bg-[var(--accent)]/5 border border-[var(--accent)]/10 rounded-lg text-xs text-[var(--accent)]">
          {progressHint}
        </div>
      )}

      {/* Phase transition animation */}
      {phaseTransition && (
        <div className="mb-3 px-4 py-3 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg text-sm text-[var(--accent)] flex items-center gap-2 animate-pulse">
          <ArrowRight className="w-4 h-4" />
          Transitioning to Voice & Tone Discovery...
        </div>
      )}

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto bg-[var(--navy)] border border-[var(--border)] rounded-xl p-4 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mt-0.5">
                <Bot className="w-3.5 h-3.5 text-[var(--accent)]" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--accent)] text-white rounded-br-sm'
                  : 'bg-[var(--navy-light)] border border-[var(--accent)]/10 text-[var(--text-primary)] rounded-bl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--navy-light)] border border-[var(--border)] flex items-center justify-center mt-0.5">
                <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mt-0.5">
              <Bot className="w-3.5 h-3.5 text-[var(--accent)]" />
            </div>
            <div className="bg-[var(--navy-light)] border border-[var(--accent)]/10 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 space-y-2">
          <div className="text-sm text-[var(--error)]">{error}</div>
          <p className="text-xs text-[var(--text-secondary)]">
            This can happen due to a temporary network issue or server timeout. Your conversation progress has been saved.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setError('');
              // Re-send the last user message if available
              const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
              if (lastUserMsg) {
                setInput(lastUserMsg.content);
              }
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      )}

      {/* Interview complete - Generate button */}
      {interviewDone && !generating && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Interview Complete</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Your brand discovery interview is done. Ready to generate your Narrative from the
            insights gathered.
          </p>
          <Button
            variant="primary"
            onClick={handleGenerateBible}
            className="w-full flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Narrative
          </Button>
        </div>
      )}

      {generating && (
        <div className="mb-4 p-4 bg-[var(--navy-light)] border border-[var(--border)] rounded-xl flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Generating your Narrative...
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Crafting a comprehensive strategy document from your interview. This takes 15-30
              seconds.
            </p>
          </div>
        </div>
      )}

      {/* Input area */}
      {!interviewDone && !generating && (
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response..."
            rows={1}
            disabled={sending}
            className={`${inputClass} resize-none min-h-[42px] max-h-[120px]`}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 !px-3"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MessagingBiblePage() {
  const [mode, setMode] = useState<'interview' | 'form'>('interview');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [existingBible, setExistingBible] = useState<any>(null);
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [error, setError] = useState('');
  const [onboardingStarted, setOnboardingStarted] = useState(false);

  // Live demo state
  const [demoStage, setDemoStage] = useState<'idle' | 'searching' | 'drafting' | 'done' | 'skipped'>('idle');
  const [demoArticle, setDemoArticle] = useState<any>(null);
  const [demoLinkedin, setDemoLinkedin] = useState('');
  const [demoTradePitch, setDemoTradePitch] = useState('');
  const [demoRelevance, setDemoRelevance] = useState('');
  const [demoTypedLinkedin, setDemoTypedLinkedin] = useState('');
  const [demoError, setDemoError] = useState('');
  const demoTriggered = useRef(false);
  const loadedExistingBible = useRef(false);
  const [showTradePitch, setShowTradePitch] = useState(false);

  // Voice archetype selection
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [showArchetypeSelection, setShowArchetypeSelection] = useState(false);
  const [pendingMode, setPendingMode] = useState<'interview' | 'form' | null>(null);

  // Document upload
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Step 1: Company
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [niche, setNiche] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');

  // Step 2: Audience
  const [targetAudiences, setTargetAudiences] = useState<TargetAudience[]>([
    { name: '', role: '', painPoints: '' },
  ]);

  // Step 3: Competition
  const [competitors, setCompetitors] = useState<Competitor[]>([{ name: '', difference: '' }]);
  const [differentiators, setDifferentiators] = useState<string[]>(['']);
  const [keyChallenges, setKeyChallenges] = useState<string[]>(['']);

  // Step 4: Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [channels, setChannels] = useState<string[]>(['linkedin', 'email', 'trade_media']);

  // Load existing data
  useEffect(() => {
    fetch('/api/messaging-bible')
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setCompanyName(data.company.name || '');
          setCompanyType(data.company.type || '');
          setNiche(data.company.niche || '');
          setCompanyDescription(data.company.description || '');
        }
        if (data.bible) {
          setExistingBible(data.bible);
          if (data.bible.company_description) setCompanyDescription(data.bible.company_description);
          const ta = JSON.parse(data.bible.target_audiences || '[]');
          if (ta.length > 0) setTargetAudiences(ta);
          const comp = JSON.parse(data.bible.competitors || '[]');
          if (comp.length > 0) setCompetitors(comp);
          const diff = JSON.parse(data.bible.differentiators || '[]');
          if (diff.length > 0) setDifferentiators(diff);
          const kc = JSON.parse(data.bible.key_challenges || '[]');
          if (kc.length > 0) setKeyChallenges(kc);
          const dept = JSON.parse(data.bible.departments || '[]');
          if (dept.length > 0) setDepartments(dept);
          const ch = JSON.parse(data.bible.channels || '[]');
          if (ch.length > 0) setChannels(ch);
          if (data.bible.full_document && data.bible.status === 'complete') {
            loadedExistingBible.current = true;
            setGeneratedDoc(data.bible.full_document);
            setStep(4);
            setMode('form');
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-trigger live demo when bible is first generated
  const runLiveDemo = useCallback(async () => {
    if (demoTriggered.current || !companyName || !niche) return;
    demoTriggered.current = true;
    setDemoStage('searching');
    setDemoError('');

    try {
      const res = await fetch('/api/demo/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyType,
          niche,
          companyDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDemoError(data.error || 'Demo failed');
        setDemoStage('idle');
        demoTriggered.current = false;
        return;
      }

      const data = await res.json();
      setDemoArticle(data.article);
      setDemoRelevance(data.relevanceExplanation);
      setDemoLinkedin(data.linkedinDraft);
      setDemoTradePitch(data.tradePitch);

      // Start typewriter effect
      setDemoStage('drafting');
    } catch {
      setDemoError('Demo generation failed. You can try again.');
      setDemoStage('idle');
      demoTriggered.current = false;
    }
  }, [companyName, companyType, niche, companyDescription]);

  // Typewriter effect for the LinkedIn draft
  useEffect(() => {
    if (demoStage !== 'drafting' || !demoLinkedin) return;

    let idx = 0;
    setDemoTypedLinkedin('');
    const interval = setInterval(() => {
      idx++;
      // Speed up: type in chunks of 3 characters
      const nextIdx = Math.min(idx * 3, demoLinkedin.length);
      setDemoTypedLinkedin(demoLinkedin.slice(0, nextIdx));
      if (nextIdx >= demoLinkedin.length) {
        clearInterval(interval);
        setDemoStage('done');
      }
    }, 16);

    return () => clearInterval(interval);
  }, [demoStage, demoLinkedin]);

  // Auto-trigger demo when generatedDoc becomes available (new generation only, not existing)
  useEffect(() => {
    if (generatedDoc && !generating && demoStage === 'idle' && !demoTriggered.current && !loadedExistingBible.current) {
      runLiveDemo();
    }
  }, [generatedDoc, generating, demoStage, runLiveDemo]);

  const handleSaveAndNext = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/messaging-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyType,
          niche,
          companyDescription,
          targetAudiences: targetAudiences.filter((a) => a.name || a.role),
          competitors: competitors.filter((c) => c.name),
          differentiators: differentiators.filter(Boolean),
          keyChallenges: keyChallenges.filter(Boolean),
          departments,
          channels,
          voiceArchetypeId: selectedArchetype || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }
      setExistingBible({ ...existingBible, id: data.bibleId });
      setStep(step + 1);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    // Save first
    setSaving(true);
    setError('');
    try {
      const saveRes = await fetch('/api/messaging-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyType,
          niche,
          companyDescription,
          targetAudiences: targetAudiences.filter((a) => a.name || a.role),
          competitors: competitors.filter((c) => c.name),
          differentiators: differentiators.filter(Boolean),
          keyChallenges: keyChallenges.filter(Boolean),
          departments,
          channels,
          voiceArchetypeId: selectedArchetype || undefined,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setError(saveData.error || 'Failed to save');
        setSaving(false);
        return;
      }
      setSaving(false);

      // Generate
      setGenerating(true);
      const genRes = await fetch('/api/messaging-bible/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibleId: saveData.bibleId }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) {
        setError(genData.error || 'Failed to generate');
        return;
      }
      setGeneratedDoc(genData.document);
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  const handleInterviewComplete = (document: string) => {
    setGeneratedDoc(document);
    setStep(4);
    setMode('form'); // Switch to form mode to show the generated document
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDoc], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName || 'Company'}_Messaging_Bible.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show onboarding when no existing bible and no company data entered
  const hasNoData = !existingBible && !generatedDoc && !onboardingStarted;

  // Archetype selection screen — shown between welcome and interview/form start
  if (showArchetypeSelection && !onboardingStarted) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[var(--accent)]" />
            Narrative
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Choose a voice archetype to set the foundation for your brand voice
          </p>
        </div>

        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-2">
              Choose Your Voice Archetype
            </h2>
            <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
              Select the voice that best represents how you want your brand to sound. This will pre-fill your voice preferences and guide the interview.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {VOICE_ARCHETYPES.map((archetype) => {
              const IconComponent = ARCHETYPE_ICONS[archetype.icon];
              const isSelected = selectedArchetype === archetype.id;
              return (
                <button
                  key={archetype.id}
                  onClick={() => setSelectedArchetype(archetype.id)}
                  className={`relative text-left p-4 sm:p-5 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'bg-[var(--accent)]/5 border-[var(--accent)]/30 ring-2 ring-[var(--accent)]/20'
                      : 'bg-[var(--navy)] border-[var(--border)] hover:border-[var(--accent)]/20 hover:bg-[var(--navy)]/80'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    isSelected ? 'bg-[var(--accent)]/20' : 'bg-[var(--navy-lighter)]'
                  }`}>
                    {IconComponent && (
                      <IconComponent className={`w-5 h-5 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
                    )}
                  </div>
                  <h3 className={`text-sm font-semibold mb-1 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                    {archetype.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                    {archetype.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {archetype.traits.slice(0, 3).map((trait) => (
                      <span
                        key={trait}
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isSelected
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                  <div className={`text-xs italic leading-relaxed px-3 py-2 rounded-lg ${
                    isSelected
                      ? 'bg-[var(--accent)]/5 text-[var(--accent)]/80 border border-[var(--accent)]/10'
                      : 'bg-[var(--navy-lighter)] text-[var(--text-secondary)]'
                  }`}>
                    &ldquo;{archetype.samplePhrase}&rdquo;
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => {
                setShowArchetypeSelection(false);
                setPendingMode(null);
              }}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 inline mr-1" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedArchetype(null);
                  setShowArchetypeSelection(false);
                  setMode(pendingMode || 'interview');
                  setOnboardingStarted(true);
                }}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip — I&apos;ll define my voice later
              </button>
              <Button
                variant="primary"
                disabled={!selectedArchetype}
                onClick={() => {
                  setShowArchetypeSelection(false);
                  setMode(pendingMode || 'interview');
                  setOnboardingStarted(true);
                }}
              >
                Continue with {selectedArchetype ? VOICE_ARCHETYPES.find(a => a.id === selectedArchetype)?.name : 'Archetype'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[var(--accent)]" />
            Narrative
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Define your brand voice, positioning, and messaging strategy across all channels
          </p>
        </div>

        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3">
            Welcome to Your Narrative
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto mb-8">
            Your Narrative is the foundation of everything Monitus does — from finding relevant news to drafting on-brand content. Let&apos;s set it up so we can start working for you.
          </p>

          {/* Document upload option */}
          <div
            className={`max-w-xl mx-auto mb-6 bg-[var(--navy)] border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
              uploadDragOver ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--accent)]/40'
            }`}
            onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true); }}
            onDragLeave={() => setUploadDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setUploadDragOver(false);
              const files = Array.from(e.dataTransfer.files).filter(f =>
                f.type === 'application/pdf' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.type === 'text/plain' || f.name.endsWith('.md')
              );
              if (files.length) setUploadedDocs(prev => [...prev, ...files]);
            }}
            onClick={() => uploadRef.current?.click()}
          >
            <input
              ref={uploadRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) setUploadedDocs(prev => [...prev, ...files]);
              }}
            />
            <Upload className={`w-6 h-6 mx-auto mb-2 ${uploadDragOver ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              Already have brand documents?
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Drag and drop PDFs, Word docs, or text files here — we&apos;ll use them to pre-fill your Narrative
            </p>
          </div>

          {uploadedDocs.length > 0 && (
            <div className="max-w-xl mx-auto mb-6 space-y-2">
              {uploadedDocs.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-[var(--navy)] border border-[var(--border)] rounded-lg px-3 py-2">
                  <span className="text-xs text-[var(--text-primary)] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--accent)]" />
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadedDocs(prev => prev.filter((_, j) => j !== i)); }}
                    className="text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={async () => {
                  setUploadProcessing(true);
                  try {
                    const formData = new FormData();
                    uploadedDocs.forEach(f => formData.append('files', f));
                    const res = await fetch('/api/messaging-bible/upload', { method: 'POST', body: formData });
                    if (res.ok) {
                      const data = await res.json();
                      if (data.extractedText) {
                        setNiche(prev => prev || data.extractedText.niche || '');
                        setCompanyName(prev => prev || data.extractedText.companyName || '');
                      }
                    }
                  } catch (err) {
                    console.error('Upload processing failed:', err);
                  }
                  setUploadProcessing(false);
                  setMode('form');
                  setOnboardingStarted(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                disabled={uploadProcessing}
              >
                {uploadProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing documents...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Continue with uploaded documents <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 max-w-xl mx-auto mb-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-secondary)]">or start from scratch</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-8">
            <div className="bg-[var(--navy)] border border-[var(--border)] rounded-xl p-5 text-left">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Interview Mode</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Answer questions in a guided conversation. Our AI builds your Narrative from your answers — the fastest way to get started.
              </p>
              <button
                onClick={() => { setMode('interview'); setOnboardingStarted(true); }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Start Interview
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[var(--navy)] border border-[var(--border)] rounded-xl p-5 text-left">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                <ClipboardList className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Form Mode</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Fill in structured fields step by step — company details, audiences, competitors, and channels. Best if you know exactly what to enter.
              </p>
              <button
                onClick={() => { setMode('form'); setOnboardingStarted(true); }}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--navy-lighter)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)] rounded-lg text-sm font-medium transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Use Form
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Takes ~5 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              AI-generated output
            </span>
            <span className="flex items-center gap-1.5">
              <Pen className="w-3.5 h-3.5 text-emerald-400" />
              Fully editable
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[var(--accent)]" />
            Narrative
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Define your brand voice, positioning, and messaging strategy across all channels
          </p>
        </div>
      </div>

      {/* Mode Toggle - only show when we don't have a generated doc */}
      {!generatedDoc && (
        <div className="flex items-center bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-1.5 w-fit">
          <button
            onClick={() => setMode('interview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'interview'
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Interview Mode
          </button>
          <button
            onClick={() => setMode('form')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'form'
                ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Form Mode
          </button>
        </div>
      )}

      {/* Interview Mode */}
      {mode === 'interview' && !generatedDoc && (
        <InterviewChat onComplete={handleInterviewComplete} existingBible={existingBible} selectedArchetypeId={selectedArchetype} />
      )}

      {/* Form Mode */}
      {mode === 'form' && (
        <>
          {/* Progress Steps - only when not showing generated doc */}
          {(!generatedDoc || step < 4) && (
            <div className="flex items-center justify-between bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === step;
                const isComplete = i < step;
                return (
                  <div key={s.label} className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => i < step && setStep(i)}
                      disabled={i > step}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                          : isComplete
                          ? 'text-emerald-400 cursor-pointer hover:bg-emerald-500/10'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-[var(--text-secondary)] hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 sm:p-6">
            {/* Step 1: Company Overview */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    Company Overview
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Tell us about your company so we can tailor your messaging strategy.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Insurance"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Company Type
                  </label>
                  <select
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select type...</option>
                    {COMPANY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Niche / Specialty
                  </label>
                  <input
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. Cyber insurance, Marine, Professional Indemnity"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                    Company Description
                  </label>
                  <textarea
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="What does your company do? What makes you different? What problems do you solve?"
                    rows={4}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Target Audience */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    Target Audiences
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Who are you trying to reach? Add your key buyer personas.
                  </p>
                </div>

                {targetAudiences.map((audience, i) => (
                  <div key={i} className="bg-[var(--navy)] rounded-lg p-4 space-y-3 relative">
                    {targetAudiences.length > 1 && (
                      <button
                        onClick={() =>
                          setTargetAudiences(targetAudiences.filter((_, j) => j !== i))
                        }
                        className="absolute top-3 right-3 p-1 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-[var(--text-secondary)] hover:text-red-400" />
                      </button>
                    )}
                    <div className="text-xs font-semibold text-[var(--accent)] mb-2">
                      Audience {i + 1}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">
                          Name / Label
                        </label>
                        <input
                          type="text"
                          value={audience.name}
                          onChange={(e) => {
                            const a = [...targetAudiences];
                            a[i].name = e.target.value;
                            setTargetAudiences(a);
                          }}
                          placeholder="e.g. CTOs at mid-size insurers"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          value={audience.role}
                          onChange={(e) => {
                            const a = [...targetAudiences];
                            a[i].role = e.target.value;
                            setTargetAudiences(a);
                          }}
                          placeholder="e.g. Chief Technology Officer"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        Pain Points
                      </label>
                      <textarea
                        value={audience.painPoints}
                        onChange={(e) => {
                          const a = [...targetAudiences];
                          a[i].painPoints = e.target.value;
                          setTargetAudiences(a);
                        }}
                        placeholder="What keeps them up at night? What problems do they need solved?"
                        rows={2}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setTargetAudiences([
                      ...targetAudiences,
                      { name: '', role: '', painPoints: '' },
                    ])
                  }
                  className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add another audience
                </button>
              </div>
            )}

            {/* Step 3: Competition */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    Competitive Landscape
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Who are your competitors and what makes you different?
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                    Competitors
                  </h3>
                  {competitors.map((comp, i) => (
                    <div key={i} className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={comp.name}
                        onChange={(e) => {
                          const c = [...competitors];
                          c[i].name = e.target.value;
                          setCompetitors(c);
                        }}
                        placeholder="Competitor name"
                        className={`${inputClass} w-1/3`}
                      />
                      <input
                        type="text"
                        value={comp.difference}
                        onChange={(e) => {
                          const c = [...competitors];
                          c[i].difference = e.target.value;
                          setCompetitors(c);
                        }}
                        placeholder="What do they do differently?"
                        className={`${inputClass} flex-1`}
                      />
                      {competitors.length > 1 && (
                        <button
                          onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}
                          className="p-2 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setCompetitors([...competitors, { name: '', difference: '' }])}
                    className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80"
                  >
                    <Plus className="w-3 h-3" /> Add competitor
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                    Your Key Differentiators
                  </h3>
                  {differentiators.map((diff, i) => (
                    <div key={i} className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={diff}
                        onChange={(e) => {
                          const d = [...differentiators];
                          d[i] = e.target.value;
                          setDifferentiators(d);
                        }}
                        placeholder="What sets you apart?"
                        className={`${inputClass} flex-1`}
                      />
                      {differentiators.length > 1 && (
                        <button
                          onClick={() =>
                            setDifferentiators(differentiators.filter((_, j) => j !== i))
                          }
                          className="p-2 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setDifferentiators([...differentiators, ''])}
                    className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80"
                  >
                    <Plus className="w-3 h-3" /> Add differentiator
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                    Key Challenges Your Customers Face
                  </h3>
                  {keyChallenges.map((challenge, i) => (
                    <div key={i} className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={challenge}
                        onChange={(e) => {
                          const c = [...keyChallenges];
                          c[i] = e.target.value;
                          setKeyChallenges(c);
                        }}
                        placeholder="e.g. Struggling with legacy systems"
                        className={`${inputClass} flex-1`}
                      />
                      {keyChallenges.length > 1 && (
                        <button
                          onClick={() =>
                            setKeyChallenges(keyChallenges.filter((_, j) => j !== i))
                          }
                          className="p-2 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setKeyChallenges([...keyChallenges, ''])}
                    className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80"
                  >
                    <Plus className="w-3 h-3" /> Add challenge
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Departments & Channels */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    Departments & Channels
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Which departments need buy-in, and what channels matter most?
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                    Departments that need buy-in
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DEPARTMENT_OPTIONS.map((dept) => {
                      const isSelected = departments.some((d) => d.name === dept);
                      return (
                        <button
                          key={dept}
                          onClick={() => {
                            if (isSelected) {
                              setDepartments(departments.filter((d) => d.name !== dept));
                            } else {
                              setDepartments([
                                ...departments,
                                { name: dept, focus: 'strategic' },
                              ]);
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                              : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/30'
                          }`}
                        >
                          {dept}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {departments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                      Focus type per department
                    </h3>
                    <div className="space-y-2">
                      {departments.map((dept, i) => (
                        <div
                          key={dept.name}
                          className="flex items-center justify-between bg-[var(--navy)] rounded-lg px-4 py-2.5"
                        >
                          <span className="text-sm text-[var(--text-primary)]">{dept.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const d = [...departments];
                                d[i].focus = 'strategic';
                                setDepartments(d);
                              }}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                dept.focus === 'strategic'
                                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              Strategic
                            </button>
                            <button
                              onClick={() => {
                                const d = [...departments];
                                d[i].focus = 'operational';
                                setDepartments(d);
                              }}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                dept.focus === 'operational'
                                  ? 'bg-purple-500/10 text-purple-400'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              Operational
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                    Priority channels
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {CHANNEL_OPTIONS.map((ch) => {
                      const isSelected = channels.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          onClick={() => {
                            if (isSelected) {
                              setChannels(channels.filter((c) => c !== ch.id));
                            } else {
                              setChannels([...channels, ch.id]);
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                              : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/30'
                          }`}
                        >
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Generate / View */}
            {step === 4 && (
              <div className="space-y-5">
                {!generatedDoc && !generating && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                        Ready to Generate
                      </h2>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Review your inputs and generate your Narrative.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-[var(--navy)] rounded-lg p-3">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">Company</div>
                        <div className="text-[var(--text-primary)] font-medium">
                          {companyName || 'Not set'}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {companyType || 'Type not set'} · {niche || 'Niche not set'}
                        </div>
                      </div>
                      <div className="bg-[var(--navy)] rounded-lg p-3">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">Audiences</div>
                        <div className="text-[var(--text-primary)] font-medium">
                          {targetAudiences.filter((a) => a.name).length} defined
                        </div>
                      </div>
                      <div className="bg-[var(--navy)] rounded-lg p-3">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">Competitors</div>
                        <div className="text-[var(--text-primary)] font-medium">
                          {competitors.filter((c) => c.name).length} listed
                        </div>
                      </div>
                      <div className="bg-[var(--navy)] rounded-lg p-3">
                        <div className="text-xs text-[var(--text-secondary)] mb-1">Departments</div>
                        <div className="text-[var(--text-primary)] font-medium">
                          {departments.length} selected
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleGenerate}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Narrative
                    </Button>
                  </>
                )}

                {generating && (
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)]/20 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Generating your Narrative...
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        This typically takes 15-30 seconds. We&apos;re crafting a comprehensive
                        strategy document tailored to {companyName}.
                      </p>
                    </div>
                  </div>
                )}

                {generatedDoc && !generating && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                          {companyName} Narrative
                        </h2>
                        <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                          <Check className="w-3 h-3" /> Generated successfully
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={handleCopy}>
                          {copied ? (
                            <Check className="w-4 h-4 mr-1" />
                          ) : (
                            <Copy className="w-4 h-4 mr-1" />
                          )}
                          {copied ? 'Copied!' : 'Copy'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleDownload}>
                          <Download className="w-4 h-4 mr-1" /> Download
                        </Button>
                        <ExportPdfButton
                          title={`${companyName} Narrative`}
                          subtitle="Brand Voice, Positioning & Messaging Strategy"
                          content={generatedDoc}
                          companyName={companyName || 'Company'}
                          filename={`${companyName || 'Company'}_Messaging_Bible`}
                        />
                        <Button variant="primary" size="sm" onClick={handleGenerate}>
                          <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                        </Button>
                      </div>
                    </div>
                    <div className="bg-[var(--navy)] rounded-lg p-6 border border-[var(--border)]">
                      <SimpleMarkdown
                        content={generatedDoc}
                        className="text-[var(--text-secondary)] text-sm leading-relaxed"
                      />
                    </div>

                    {/* ── Live Demo: See It In Action ── */}
                    {demoStage !== 'skipped' && (
                      <div className="mt-8 pt-8 border-t border-[var(--border)]">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                              <Zap className="w-5 h-5 text-[var(--accent)]" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                See It In Action
                              </h3>
                              <p className="text-xs text-[var(--text-secondary)]">
                                Watch Monitus find news and draft content for {companyName} in real time
                              </p>
                            </div>
                          </div>
                          {demoStage === 'idle' && (
                            <button
                              onClick={() => setDemoStage('skipped')}
                              className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              <SkipForward className="w-3.5 h-3.5" /> Skip Demo
                            </button>
                          )}
                        </div>

                        {/* Auto-trigger on first render */}
                        {demoStage === 'idle' && !demoError && (
                          <div className="text-center py-4">
                            <Button variant="primary" size="sm" onClick={runLiveDemo}>
                              <Zap className="w-4 h-4 mr-1.5" /> Launch Demo
                            </Button>
                          </div>
                        )}

                        {demoError && (
                          <div className="text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 mb-4">
                            {demoError}
                            <button
                              onClick={() => { demoTriggered.current = false; runLiveDemo(); }}
                              className="ml-2 underline hover:no-underline"
                            >
                              Try again
                            </button>
                          </div>
                        )}

                        {/* Step 1: Finding relevant news */}
                        {(demoStage === 'searching' || demoStage === 'drafting' || demoStage === 'done') && (
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                demoArticle ? 'bg-emerald-500/10' : 'bg-[var(--accent)]/10'
                              }`}>
                                {demoArticle ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Newspaper className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                  {demoArticle
                                    ? 'Found a relevant article'
                                    : `Finding relevant news for ${companyName}...`}
                                </div>
                                {!demoArticle && (
                                  <div className="mt-2 h-2 bg-[var(--navy)] rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--accent)] rounded-full animate-pulse" style={{ width: '60%' }} />
                                  </div>
                                )}
                                {demoArticle && (
                                  <div className="mt-2 bg-[var(--navy)] rounded-lg p-4 border border-[var(--border)]">
                                    <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                                      {demoArticle.title}
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mb-2">
                                      {demoArticle.source}
                                      {demoArticle.published_at && (
                                        <> &middot; {new Date(demoArticle.published_at).toLocaleDateString()}</>
                                      )}
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                      {demoArticle.summary}
                                    </p>
                                    {demoRelevance && (
                                      <div className="mt-2 pt-2 border-t border-[var(--border)]">
                                        <div className="text-[11px] uppercase tracking-wider text-[var(--accent)] font-semibold mb-1">
                                          Why this is relevant
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)]">{demoRelevance}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Step 2: Drafting content */}
                            {(demoStage === 'drafting' || demoStage === 'done') && (
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                  demoStage === 'done' ? 'bg-emerald-500/10' : 'bg-[var(--accent)]/10'
                                }`}>
                                  {demoStage === 'done' ? (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Pen className="w-4 h-4 text-[var(--accent)] animate-pulse" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-[var(--text-primary)] mb-3">
                                    {demoStage === 'done'
                                      ? 'Content drafted in your voice'
                                      : 'Drafting content in your voice...'}
                                  </div>

                                  {/* LinkedIn Preview */}
                                  <div className="mb-4">
                                    <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-2">
                                      LinkedIn Post
                                    </div>
                                    <LinkedInPreview
                                      content={demoStage === 'done' ? demoLinkedin : demoTypedLinkedin}
                                      companyName={companyName}
                                    />
                                  </div>

                                  {/* Trade Media Pitch (show after done) */}
                                  {demoStage === 'done' && demoTradePitch && (
                                    <div>
                                      <button
                                        onClick={() => setShowTradePitch(!showTradePitch)}
                                        className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-2 flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                                      >
                                        Trade Media Pitch
                                        <ChevronRight className={`w-3 h-3 transition-transform ${showTradePitch ? 'rotate-90' : ''}`} />
                                      </button>
                                      {showTradePitch && (
                                        <div className="bg-[var(--navy)] rounded-lg p-4 border border-[var(--border)]">
                                          <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-sans">
                                            {demoTradePitch}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 3: Conversion CTA */}
                            {demoStage === 'done' && (
                              <div className="mt-6 bg-gradient-to-br from-[var(--accent)]/5 to-[var(--accent)]/10 rounded-xl p-6 border border-[var(--accent)]/20">
                                <div className="text-center space-y-3">
                                  <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-[var(--accent)]" />
                                  </div>
                                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">
                                    This is what Monitus does every day for your company.
                                  </h4>
                                  <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                                    Monitoring your market, finding relevant developments, and drafting thought
                                    leadership content in your voice — automatically.
                                  </p>
                                  <p className="text-sm font-medium text-[var(--text-primary)]">
                                    Ready to automate your thought leadership?
                                  </p>
                                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                    <Button
                                      variant="primary"
                                      size="lg"
                                      onClick={() => (window.location.href = '/billing#plans')}
                                      className="flex items-center gap-2"
                                    >
                                      Get Started <ArrowRight className="w-4 h-4" />
                                    </Button>
                                    <span className="text-xs text-[var(--text-secondary)]">
                                      Start with Starter at &pound;500/mo
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          {step < 4 && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={() => setStep(step - 1)}
                disabled={step === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="primary"
                onClick={step === 3 ? handleSaveAndNext : handleSaveAndNext}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {step === 3 ? 'Review & Generate' : 'Save & Continue'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 4 && generatedDoc && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={() => setStep(0)}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Edit Inputs
              </Button>
              <Button
                variant="secondary"
                onClick={() => (window.location.href = '/content')}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> View Content Library
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
