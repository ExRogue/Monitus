'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, X, Sparkles, BookOpen } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  href: string;
  complete: boolean;
}

const PRIORITY_STEPS = ['company', 'bible'];

export default function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(data => {
        if (data.dismissed || !data.steps) {
          setDismissed(true);
        } else {
          setDismissed(false);
          setSteps(data.steps);
          setCompletedCount(data.completedCount);
          setTotalSteps(data.totalSteps);
        }
      })
      .catch(() => setDismissed(true))
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = async () => {
    setDismissed(true);
    await fetch('/api/onboarding', { method: 'POST' });
  };

  if (loading || dismissed || totalSteps === 0) return null;

  // Don't show if all complete
  if (completedCount >= totalSteps) return null;

  const progress = Math.round((completedCount / totalSteps) * 100);
  const bibleComplete = steps.find(s => s.id === 'bible')?.complete;
  const companyComplete = steps.find(s => s.id === 'company')?.complete;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(74,158,150,0.08) 0%, rgba(139,92,246,0.08) 100%)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '24px',
      position: 'relative',
    }}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          padding: '4px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Dismiss"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(74,158,150,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Get started with Monitus
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {completedCount} of {totalSteps} complete
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: '6px',
        background: 'var(--border)',
        borderRadius: '3px',
        marginBottom: '16px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--accent), var(--purple, #8b5cf6))',
          borderRadius: '3px',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Priority callout — nudge to complete company + bible first */}
      {(!companyComplete || !bibleComplete) && (
        <div style={{
          background: 'rgba(74,158,150,0.1)',
          border: '1px solid rgba(74,158,150,0.2)',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}>
          <BookOpen size={16} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            {!companyComplete
              ? 'Start by setting up your company — everything else builds on this.'
              : 'Your Narrative is the foundation of everything Monitus does. Complete it and watch the platform come alive.'
            }
          </p>
        </div>
      )}

      {/* Steps — numbered */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {steps.map((step, index) => {
          const isPriority = PRIORITY_STEPS.includes(step.id);
          return (
            <Link
              key={step.id}
              href={step.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'background 0.15s',
                background: step.complete ? 'transparent' : isPriority ? 'rgba(74,158,150,0.08)' : 'rgba(74,158,150,0.03)',
              }}
              onMouseEnter={(e) => { if (!step.complete) e.currentTarget.style.background = 'rgba(74,158,150,0.12)'; }}
              onMouseLeave={(e) => { if (!step.complete) e.currentTarget.style.background = step.complete ? 'transparent' : isPriority ? 'rgba(74,158,150,0.08)' : 'rgba(74,158,150,0.03)'; }}
            >
              {step.complete ? (
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'var(--success, #22c55e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check size={12} style={{ color: '#fff' }} />
                </div>
              ) : (
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  border: `2px solid ${isPriority ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isPriority ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                  {index + 1}
                </div>
              )}
              <span style={{
                fontSize: '13px',
                color: step.complete ? 'var(--text-secondary)' : 'var(--text-primary)',
                textDecoration: step.complete ? 'line-through' : 'none',
                fontWeight: isPriority && !step.complete ? 600 : 400,
                flex: 1,
              }}>
                {step.label}
              </span>
              {!step.complete && (
                <ChevronRight size={14} style={{ color: isPriority ? 'var(--accent)' : 'var(--text-secondary)', flexShrink: 0 }} />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact nudge banner for other dashboard sections.
 * Shows when the user hasn't completed their Narrative yet.
 */
export function MessagingBibleNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(data => {
        if (data.dismissed || !data.steps) return;
        const bibleStep = data.steps.find((s: Step) => s.id === 'bible');
        if (bibleStep && !bibleStep.complete) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <Link
      href="/messaging-bible"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'linear-gradient(135deg, rgba(74,158,150,0.1) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid rgba(74,158,150,0.2)',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '20px',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(74,158,150,0.2)'}
    >
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        background: 'rgba(74,158,150,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <BookOpen size={18} style={{ color: 'var(--accent)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Complete your Narrative first
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
          Everything here works better once Monitus understands your positioning. Takes about 5 minutes.
        </p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
    </Link>
  );
}
