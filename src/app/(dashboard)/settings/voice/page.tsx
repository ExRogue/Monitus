'use client';
/**
 * Settings → Voice
 *
 * Shows the user what we've learned from their content edits. Voice profile
 * starts contributing to generation after 3 edits — surface that threshold
 * and the current state so users know it's working.
 */
import { useEffect, useState } from 'react';
import { Loader2, PenTool, ThumbsUp, ThumbsDown, AlertCircle, Sparkles } from 'lucide-react';

interface VoiceProfile {
  preferred_tone: string;
  words_to_use: string[];
  words_to_avoid: string[];
  style_notes: string[];
  edit_count: number;
  common_additions: string[];
  common_removals: string[];
  tone_shifts: { from: string; to: string; frequency: number }[];
}

export default function VoiceSettingsPage() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/content/voice-profile')
      .then(r => r.json())
      .then(data => {
        if (data?.voice_profile) {
          setProfile(data.voice_profile);
        } else {
          setMessage(data?.message || 'No voice profile yet — edit a piece of content to start one.');
        }
      })
      .catch(() => setMessage('Failed to load voice profile.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-2">Voice profile</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          What we've learned from your edits. The profile starts contributing to drafts after 3 edits;
          richer signals kick in around 10+.
        </p>
      </header>

      {!profile ? (
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-8 text-center">
          <PenTool className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-4 opacity-60" />
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">No voice profile yet</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {message || 'Edit a piece of generated content to start your voice profile.'}
          </p>
          <a
            href="/content"
            className="inline-block px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Go to Content
          </a>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Status pill */}
          <div className={`bg-[var(--navy-light)] border rounded-xl p-5 ${
            profile.edit_count >= 3
              ? 'border-emerald-500/30'
              : 'border-amber-500/30'
          }`}>
            <div className="flex items-start gap-3">
              {profile.edit_count >= 3 ? (
                <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {profile.edit_count >= 3
                    ? `Active — learning from ${profile.edit_count} edits`
                    : `Learning (${profile.edit_count} of 3 edits)`}
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {profile.edit_count >= 3
                    ? "Your voice profile is contributing to every new draft. Generated content references the words you tend to use, avoids the ones you cut, and matches your preferred tone."
                    : `Edit ${3 - profile.edit_count} more piece${3 - profile.edit_count === 1 ? '' : 's'} of generated content and we'll start using your voice in future drafts.`}
                </p>
              </div>
            </div>
          </div>

          {/* Preferred tone */}
          <Section title="Preferred tone">
            <div className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] font-medium">
              {profile.preferred_tone || 'professional'}
            </div>
          </Section>

          {/* Style notes */}
          {profile.style_notes.length > 0 && (
            <Section title="What we've noticed">
              <ul className="space-y-1.5">
                {profile.style_notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                    <span className="text-[var(--accent)] mt-0.5">·</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Words to use */}
          {profile.words_to_use.length > 0 && (
            <Section title="Words you tend to add" icon={<ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />}>
              <div className="flex flex-wrap gap-1.5">
                {profile.words_to_use.slice(0, 20).map(w => (
                  <span key={w} className="text-xs px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    {w}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Words to avoid */}
          {profile.words_to_avoid.length > 0 && (
            <Section title="Words you tend to cut" icon={<ThumbsDown className="w-3.5 h-3.5 text-amber-400" />}>
              <div className="flex flex-wrap gap-1.5">
                {profile.words_to_avoid.slice(0, 20).map(w => (
                  <span key={w} className="text-xs px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 line-through">
                    {w}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Common phrases */}
          {profile.common_additions.length > 0 && (
            <Section title="Common phrases you add">
              <div className="flex flex-wrap gap-1.5">
                {profile.common_additions.slice(0, 12).map(p => (
                  <span key={p} className="text-xs px-2 py-1 rounded bg-[var(--navy-lighter)] border border-[var(--border)] text-[var(--text-primary)]">
                    {p}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <div className="text-[10px] font-semibold tracking-widest text-[var(--text-secondary)]/60 uppercase">
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}
