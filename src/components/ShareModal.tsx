'use client';
import { useState, useRef } from 'react';
import { X, Share2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'signal' | 'content';
  itemId: string;
  itemTitle: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShareModal({ isOpen, onClose, itemType, itemId, itemTitle }: ShareModalProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_REGEX.test(email)) {
      setErrorMsg('Invalid email address');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    if (emails.includes(email)) {
      setErrorMsg('Email already added');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    if (emails.length >= 10) {
      setErrorMsg('Maximum 10 recipients');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    setEmails([...emails, email]);
    setEmailInput('');
    setErrorMsg('');
    inputRef.current?.focus();
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSend = async () => {
    if (emails.length === 0) {
      setErrorMsg('Add at least one email address');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setSending(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: itemType,
          id: itemId,
          recipients: emails,
          note: note.trim() || undefined,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setTimeout(() => {
          onClose();
          setEmails([]);
          setNote('');
          setStatus('idle');
        }, 2000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to share');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error');
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Share with your team</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Item being shared */}
          <div className="text-xs text-[var(--text-secondary)]">
            Sharing: <span className="text-[var(--text-primary)] font-medium">{itemTitle.slice(0, 80)}</span>
          </div>

          {/* Email pills */}
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {emails.map(email => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--navy)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)]"
                >
                  {email}
                  <button onClick={() => removeEmail(email)} className="text-[var(--text-secondary)] hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Email input */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter email address"
              className="flex-1 text-sm px-3 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50"
            />
            <Button variant="ghost" size="sm" onClick={addEmail}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Note */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a personal note (optional)"
            maxLength={200}
            rows={2}
            className="w-full text-sm px-3 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 resize-none"
          />

          {/* Error/Success */}
          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3 h-3" />
              {errorMsg}
            </div>
          )}
          {status === 'success' && (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle className="w-3 h-3" />
              Shared successfully
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={emails.length === 0 || sending || status === 'success'}
            onClick={handleSend}
          >
            {sending ? 'Sharing...' : `Share with ${emails.length || ''} ${emails.length === 1 ? 'person' : 'people'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
