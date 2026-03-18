'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './ui/Button';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface Props {
  onComplete: () => void;
  onSkip?: () => void;
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Monitus',
    description: 'AI-powered content generation for regulated industries',
    icon: <CheckCircle className="w-12 h-12 text-[var(--accent)]" />,
  },
  {
    id: 'company-setup',
    title: 'Set Up Your Company',
    description: 'Tell us about your organization for personalized content',
    icon: <AlertCircle className="w-12 h-12 text-[var(--purple)]" />,
  },
  {
    id: 'first-content',
    title: 'Generate Your First Content',
    description: 'Create content from news articles in minutes',
    icon: <CheckCircle className="w-12 h-12 text-[var(--success)]" />,
  },
  {
    id: 'plan-selection',
    title: 'Choose Your Plan',
    description: 'Select the perfect plan for your needs',
    icon: <CheckCircle className="w-12 h-12 text-[var(--warning)]" />,
  },
];

export default function OnboardingWizard({ onComplete, onSkip }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState({
    name: '',
    type: '',
    niche: '',
    description: '',
    brandVoice: '',
    brandTone: '',
  });

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate company setup
      if (!companyData.name || !companyData.type || !companyData.niche) {
        setError('Please fill in all required fields');
        return;
      }
      // Save company data
      setLoading(true);
      try {
        const response = await fetch('/api/company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: companyData.name,
            type: companyData.type,
            niche: companyData.niche,
            description: companyData.description,
            brand_voice: companyData.brandVoice,
            brand_tone: companyData.brandTone,
          }),
        });
        if (!response.ok) throw new Error('Failed to save company');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setError(null);
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setError(null);
    setCurrentStep(currentStep - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] bg-[var(--navy-light)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Progress Bar */}
        <div className="h-1 bg-[var(--border)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {/* Step Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">{step.icon}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{step.title}</h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">{step.description}</p>
          </div>

          {/* Step Indicators */}
          <div className="flex gap-2 justify-center">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index <= currentStep
                    ? 'bg-[var(--accent)] w-8'
                    : 'bg-[var(--border)] w-2'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          {step.id === 'welcome' && (
            <div className="space-y-4">
              <p className="text-[var(--text-secondary)] text-sm">
                Monitus helps regulated industries generate compliant content at scale. Let's get you started in just a few minutes.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircle size={16} className="text-[var(--success)]" />
                  <span>FCA compliance checks built-in</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircle size={16} className="text-[var(--success)]" />
                  <span>AI-powered content generation</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircle size={16} className="text-[var(--success)]" />
                  <span>Customizable brand voice</span>
                </div>
              </div>
            </div>
          )}

          {step.id === 'company-setup' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  placeholder="Your company name"
                  className="w-full px-4 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Company Type *
                </label>
                <select
                  value={companyData.type}
                  onChange={(e) => setCompanyData({ ...companyData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  <option value="insurtech">Insurtech</option>
                  <option value="mga">Managing General Agent (MGA)</option>
                  <option value="broker">Insurance Broker</option>
                  <option value="insurer">Insurer</option>
                  <option value="reinsurer">Reinsurer</option>
                  <option value="carrier">Carrier</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Niche/Focus Area *
                </label>
                <input
                  type="text"
                  value={companyData.niche}
                  onChange={(e) => setCompanyData({ ...companyData, niche: e.target.value })}
                  placeholder="e.g., Cyber insurance, Investment advisory"
                  className="w-full px-4 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Description
                </label>
                <textarea
                  value={companyData.description}
                  onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                  placeholder="Brief description of your company..."
                  className="w-full px-4 py-2 bg-[var(--navy)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none h-20"
                />
              </div>
            </div>
          )}

          {step.id === 'first-content' && (
            <div className="space-y-4">
              <p className="text-[var(--text-secondary)] text-sm">
                Ready to generate your first piece of content? Here's what you can do:
              </p>
              <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">1.</span>
                  <span>Go to the News Feed and select articles relevant to your industry</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">2.</span>
                  <span>Choose your content type (newsletter, LinkedIn, podcast script, etc.)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">3.</span>
                  <span>Click Generate and watch Monitus create compliant content in seconds</span>
                </li>
              </ol>
            </div>
          )}

          {step.id === 'plan-selection' && (
            <div className="space-y-4">
              <p className="text-[var(--text-secondary)] text-sm">
                All plans come with FCA compliance checks and AI-powered generation. Choose based on your volume needs:
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--navy)]">
                  <p className="font-semibold text-[var(--text-primary)] text-sm">Starter -- &pound;500/mo</p>
                  <p className="text-xs text-[var(--text-secondary)]">Weekly monitoring, 3 LinkedIn drafts/week, basic engagement tracking</p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--accent)] bg-[var(--navy)] ring-1 ring-[var(--accent)]">
                  <p className="font-semibold text-[var(--text-primary)] text-sm">Growth -- &pound;1,200/mo</p>
                  <p className="text-xs text-[var(--text-secondary)]">Daily monitoring, all content formats, LinkedIn API posting, trade media, up to 3 users</p>
                </div>
                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--navy)]">
                  <p className="font-semibold text-[var(--text-primary)] text-sm">Intelligence -- &pound;2,000/mo</p>
                  <p className="text-xs text-[var(--text-secondary)]">Competitor tracking, briefing builder, quarterly reviews, unlimited users</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-[var(--error)]/10 border border-[var(--error)] rounded-lg p-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-[var(--error)]" />
              <p className="text-xs text-[var(--error)]">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 bg-[var(--navy)]">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <div className="flex gap-2 w-full sm:w-auto">
            {onSkip && !isLastStep && (
              <button
                onClick={onSkip}
                className="hidden sm:block px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Skip
              </button>
            )}
            <Button
              onClick={handleNext}
              loading={loading}
              disabled={loading}
              className="flex items-center justify-center gap-2 flex-1 sm:flex-none"
            >
              {isLastStep ? 'Complete' : 'Next'}
              {!isLastStep && <ChevronRight size={16} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
