'use client';

import { useState, useCallback } from 'react';
import {
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Send,
  Copy,
  Check,
  Globe,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface LinkedInPreviewProps {
  content: string;
  companyName: string;
  companyAvatar?: string;
  contentId?: string;
  onMarkedAsPosted?: () => void;
  className?: string;
}

const LINKEDIN_CHAR_LIMIT = 3000;
const LINKEDIN_OPTIMAL_LENGTH = 1300;

export default function LinkedInPreview({
  content,
  companyName,
  companyAvatar,
  contentId,
  onMarkedAsPosted,
  className = '',
}: LinkedInPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [markingPosted, setMarkingPosted] = useState(false);
  const [markedPosted, setMarkedPosted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const charCount = content.length;
  const hashtagCount = (content.match(/#[A-Za-z]\w{0,49}/g) || []).length;

  // Determine character count status
  let charStatus: 'ok' | 'warning' | 'over' = 'ok';
  if (charCount > LINKEDIN_CHAR_LIMIT) charStatus = 'over';
  else if (charCount > LINKEDIN_OPTIMAL_LENGTH) charStatus = 'warning';

  const charStatusColor =
    charStatus === 'over'
      ? 'text-red-400'
      : charStatus === 'warning'
      ? 'text-amber-400'
      : 'text-emerald-400';

  // LinkedIn truncates at ~210 chars with "...see more"
  const TRUNCATE_LENGTH = 210;
  const shouldTruncate = content.length > TRUNCATE_LENGTH && !expanded;
  const displayContent = shouldTruncate
    ? content.slice(0, TRUNCATE_LENGTH)
    : content;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleMarkPosted = useCallback(async () => {
    if (!contentId) return;
    setMarkingPosted(true);
    try {
      const res = await fetch('/api/distribution/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_posted', content_id: contentId }),
      });
      if (res.ok) {
        setMarkedPosted(true);
        onMarkedAsPosted?.();
      }
    } catch {
      // Silently fail — not critical
    } finally {
      setMarkingPosted(false);
    }
  }, [contentId, onMarkedAsPosted]);

  // Render content with proper line breaks and hashtag styling
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Style hashtags in blue
      const parts = line.split(/(#[A-Za-z]\w{0,49})/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            part.startsWith('#') ? (
              <span key={j} className="text-[#0A66C2]">
                {part}
              </span>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* LinkedIn Post Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-[560px]">
        {/* Post Header */}
        <div className="flex items-start gap-3 p-4 pb-0">
          <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center text-white font-bold text-lg shrink-0">
            {companyAvatar ? (
              <img
                src={companyAvatar}
                alt={companyName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              companyName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {companyName}
            </div>
            <div className="text-xs text-gray-500 leading-tight mt-0.5">
              Company Page
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <span>Just now</span>
              <span>·</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="px-4 py-3 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
          {renderContent(displayContent)}
          {shouldTruncate && (
            <button
              onClick={() => setExpanded(true)}
              className="text-gray-500 hover:text-[#0A66C2] ml-1 font-medium"
            >
              ...see more
            </button>
          )}
        </div>

        {/* Engagement Bar */}
        <div className="px-4 py-1 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500 py-1.5">
            <span className="inline-flex items-center gap-0.5">
              <span className="w-4 h-4 rounded-full bg-[#0A66C2] flex items-center justify-center">
                <ThumbsUp className="w-2.5 h-2.5 text-white" />
              </span>
            </span>
            <span className="text-gray-500">Be the first to react</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around border-t border-gray-200 px-2 py-1">
          {[
            { icon: ThumbsUp, label: 'Like' },
            { icon: MessageCircle, label: 'Comment' },
            { icon: Repeat2, label: 'Repost' },
            { icon: Send, label: 'Send' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded transition-colors"
              disabled
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-xs">
        <div className={`flex items-center gap-1.5 ${charStatusColor}`}>
          {charStatus === 'over' ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : charStatus === 'warning' ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          <span>
            {charCount.toLocaleString()} / {LINKEDIN_CHAR_LIMIT.toLocaleString()} chars
          </span>
        </div>
        <div className="text-[var(--text-secondary)]">
          {hashtagCount} hashtag{hashtagCount !== 1 ? 's' : ''}
        </div>
        {charStatus === 'over' && (
          <div className="text-red-400">
            Over limit by {(charCount - LINKEDIN_CHAR_LIMIT).toLocaleString()} chars
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1.5" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1.5" /> Copy to LinkedIn
            </>
          )}
        </Button>
        {contentId && !markedPosted && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkPosted}
            loading={markingPosted}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" /> Mark as Posted
          </Button>
        )}
        {markedPosted && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" /> Posted to LinkedIn
          </div>
        )}
      </div>
    </div>
  );
}
