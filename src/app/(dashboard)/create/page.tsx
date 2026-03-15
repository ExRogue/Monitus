'use client';
import { useState } from 'react';
import {
  Lightbulb,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileText,
  Mail,
  Linkedin,
  Mic,
  Users,
  Megaphone,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import SimpleMarkdown from '@/components/SimpleMarkdown';

interface GeneratedItem {
  id: string;
  content_type: string;
  title: string;
  content: string;
  compliance_status: string;
  compliance_notes: string;
  pillar_tags: string;
  status: string;
  created_at: string;
}

const CONTENT_TYPES = [
  { id: 'newsletter', label: 'Newsletter', icon: Mail, description: 'Weekly market intelligence digest' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, description: 'Thought leadership posts' },
  { id: 'podcast', label: 'Podcast', icon: Mic, description: 'Episode script with segments' },
  { id: 'briefing', label: 'Briefing', icon: Users, description: 'Formal client market briefing' },
  { id: 'email', label: 'Email', icon: Mail, description: 'Professional email newsletter' },
  { id: 'trade_media', label: 'Trade Media', icon: Megaphone, description: 'Press release and pitch package' },
];

const DEPARTMENTS = [
  { id: '', label: 'No specific department' },
  { id: 'c-suite', label: 'C-Suite' },
  { id: 'underwriting', label: 'Underwriting' },
  { id: 'claims', label: 'Claims' },
  { id: 'technology', label: 'Technology' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'operations', label: 'Operations' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
];

const CHANNELS = [
  { id: '', label: 'Default for content type' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'Email' },
  { id: 'trade_media', label: 'Trade Media / PR' },
];

export default function CreateFromTopicPage() {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['linkedin']);
  const [department, setDepartment] = useState('');
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleType = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResults([]);

    if (!topic.trim() || topic.trim().length < 10) {
      setError('Topic must be at least 10 characters.');
      return;
    }

    if (selectedTypes.length === 0) {
      setError('Select at least one content type.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          context: context.trim() || undefined,
          contentTypes: selectedTypes,
          channel: channel || undefined,
          department: department || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Generation failed. Please try again.');
        return;
      }

      setResults(data.content || []);
      if (data.content?.length > 0) {
        setExpandedId(data.content[0].id);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyContent = async (item: GeneratedItem) => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const TYPE_ICON_MAP: Record<string, typeof Mail> = {
    newsletter: FileText,
    linkedin: Linkedin,
    podcast: Mic,
    briefing: Users,
    email: Mail,
    trade_media: Megaphone,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create from Topic</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Generate content from a custom topic instead of news articles
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic */}
            <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] p-6">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Topic *
              </label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. The impact of AI on underwriting accuracy in specialty lines, or How the FCA Consumer Duty is reshaping MGA distribution..."
                rows={3}
                maxLength={2000}
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] resize-none"
                required
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-[var(--text-muted)]">
                  Describe the topic you want content about (min 10 characters)
                </p>
                <span className="text-xs text-[var(--text-muted)]">{topic.length}/2000</span>
              </div>
            </div>

            {/* Context / Notes */}
            <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] p-6">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Additional Context / Notes
                <span className="text-[var(--text-muted)] font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="e.g. We recently launched a new AI-powered claims tool. Focus on London Market angle. Include reference to our Q1 results..."
                rows={3}
                maxLength={2000}
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] resize-none"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Add any background, data points, or direction to shape the content
              </p>
            </div>

            {/* Content Types */}
            <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] p-6">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                Content Types *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CONTENT_TYPES.map(ct => {
                  const Icon = ct.icon;
                  const selected = selectedTypes.includes(ct.id);
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => toggleType(ct.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        selected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                          : 'border-[var(--border)] bg-[var(--navy)] hover:border-[var(--accent)]/50'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected
                          ? 'bg-[var(--accent)] border-[var(--accent)]'
                          : 'border-[var(--border)]'
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${selected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                          <span className={`text-sm font-medium ${selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                            {ct.label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{ct.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Department + Channel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] p-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Target Department
                  <span className="text-[var(--text-muted)] font-normal ml-1">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] appearance-none pr-10"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] p-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Channel Override
                  <span className="text-[var(--text-muted)] font-normal ml-1">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 focus:border-[var(--accent)] appearance-none pr-10"
                  >
                    {CHANNELS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !topic.trim() || selectedTypes.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating content...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Content
                </>
              )}
            </button>
          </form>
        </div>

        {/* Side panel — tips */}
        <div className="lg:col-span-1">
          <div className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] p-6 sticky top-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[var(--accent)]" />
              Tips for great topics
            </h3>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-2">
                <span className="text-[var(--accent)] font-bold">1.</span>
                <span>Be specific. "AI in cyber underwriting" works better than just "AI".</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)] font-bold">2.</span>
                <span>Add context with your company's angle or recent developments.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)] font-bold">3.</span>
                <span>Use department targeting to tailor the language for your audience.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)] font-bold">4.</span>
                <span>Select multiple content types to create a full campaign in one go.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--accent)] font-bold">5.</span>
                <span>Your messaging bible and voice profile are applied automatically.</span>
              </li>
            </ul>

            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Content generated from topics uses the same compliance checking, voice calibration, and messaging pillar tagging as article-based generation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Generated Content ({results.length} piece{results.length !== 1 ? 's' : ''})
          </h2>

          {results.map(item => {
            const Icon = TYPE_ICON_MAP[item.content_type] || FileText;
            const isExpanded = expandedId === item.id;
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-[var(--navy-light)] rounded-xl border border-[var(--border)] overflow-hidden"
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--navy)]/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-5 h-5 text-[var(--accent)] flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-muted)] capitalize">
                          {item.content_type.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          item.compliance_status === 'passed'
                            ? 'bg-emerald-400/10 text-emerald-400'
                            : 'bg-amber-400/10 text-amber-400'
                        }`}>
                          {item.compliance_status === 'passed' ? 'Compliant' : 'Flagged'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); copyContent(item); }}
                      className="p-2 rounded-lg hover:bg-[var(--navy)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      title="Copy to clipboard"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] p-6">
                    <div className="prose prose-invert max-w-none text-sm text-[var(--text-secondary)]">
                      <SimpleMarkdown content={item.content} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
