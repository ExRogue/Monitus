'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Circle, ChevronRight, X, Sparkles } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  href: string;
  complete: boolean;
}

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
            Get started with Telum
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

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {steps.map((step) => (
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
              background: step.complete ? 'transparent' : 'rgba(74,158,150,0.05)',
            }}
            onMouseEnter={(e) => { if (!step.complete) e.currentTarget.style.background = 'rgba(74,158,150,0.1)'; }}
            onMouseLeave={(e) => { if (!step.complete) e.currentTarget.style.background = 'rgba(74,158,150,0.05)'; }}
          >
            {step.complete ? (
              <div style={{
                width: '20px',
                height: '20px',
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
              <Circle size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            )}
            <span style={{
              fontSize: '13px',
              color: step.complete ? 'var(--text-secondary)' : 'var(--text-primary)',
              textDecoration: step.complete ? 'line-through' : 'none',
              flex: 1,
            }}>
              {step.label}
            </span>
            {!step.complete && (
              <ChevronRight size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
