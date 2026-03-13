'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Zap } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  articlesPerMonth: number;
  contentPiecesPerMonth: number;
}

interface CurrentPlan {
  planId: string;
  planName: string;
  price: number;
  period: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface UsageData {
  articlesUsed: number;
  articlesLimit: number;
  contentPiecesUsed: number;
  contentPiecesLimit: number;
}

interface UserData {
  id: string;
  email: string;
  name: string;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    period: 'monthly',
    features: [
      'Up to 10 articles per month',
      '50 content pieces',
      'Basic analytics',
      'Email support',
      'Standard templates',
    ],
    articlesPerMonth: 10,
    contentPiecesPerMonth: 50,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 149,
    period: 'monthly',
    features: [
      'Up to 50 articles per month',
      '500 content pieces',
      'Advanced analytics',
      'Priority support',
      'Custom templates',
      'API access',
    ],
    articlesPerMonth: 50,
    contentPiecesPerMonth: 500,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 399,
    period: 'monthly',
    features: [
      'Unlimited articles',
      'Unlimited content pieces',
      'Real-time analytics',
      'Dedicated support',
      'Custom integrations',
      'Team collaboration',
      'Advanced security',
    ],
    articlesPerMonth: Infinity,
    contentPiecesPerMonth: Infinity,
  },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [authRes, usageRes, plansRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/billing/usage'),
          fetch('/api/billing/plans'),
        ]);

        if (!authRes.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await authRes.json();
        setUser(userData);

        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsage(usageData);
        }

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          if (plansData.currentPlan) {
            setCurrentPlan(plansData.currentPlan);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubscribePlan = async (planId: string) => {
    if (currentPlan?.planId === planId) {
      return; // Already on this plan
    }

    try {
      setSubscribing(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        throw new Error('Failed to subscribe to plan');
      }

      const result = await res.json();
      setCurrentPlan(result.currentPlan);
      setSuccessMessage(
        `Successfully subscribed to ${result.currentPlan.planName} plan!`
      );

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !window.confirm(
        'Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.'
      )
    ) {
      return;
    }

    try {
      setCancellingSubscription(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const result = await res.json();
      setCurrentPlan(result.currentPlan);
      setSuccessMessage('Subscription cancelled. You will have access until the end of your billing period.');

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancellingSubscription(false);
    }
  };

  const getArticlesPercentage = () => {
    if (!usage || usage.articlesLimit === 0) return 0;
    if (!isFinite(usage.articlesLimit)) return 0;
    return Math.min((usage.articlesUsed / usage.articlesLimit) * 100, 100);
  };

  const getContentPiecesPercentage = () => {
    if (!usage || usage.contentPiecesLimit === 0) return 0;
    if (!isFinite(usage.contentPiecesLimit)) return 0;
    return Math.min((usage.contentPiecesUsed / usage.contentPiecesLimit) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--navy)] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-[var(--text-secondary)]">
            Loading billing information...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--navy)] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Billing & Subscription
          </h1>
          <p className="text-[var(--text-secondary)]">
            Manage your subscription and view usage
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-[var(--error)] rounded-lg flex items-start gap-3">
            <AlertCircle className="text-[var(--error)] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-[var(--error)]">Error</h3>
              <p className="text-sm text-[var(--error)] opacity-75">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-[var(--success)] rounded-lg flex items-start gap-3">
            <CheckCircle2 className="text-[var(--success)] flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-[var(--success)]">Success</h3>
              <p className="text-sm text-[var(--success)] opacity-75">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Current Plan Section */}
        {currentPlan && currentPlan.isActive && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Current Plan
            </h2>

            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
              {/* Plan Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                    {currentPlan.planName}
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    £{currentPlan.price}/month
                  </p>
                </div>
                <div className="text-right text-sm text-[var(--text-secondary)]">
                  <p>Renews: {new Date(currentPlan.endDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Usage Meters */}
              {usage && (
                <div className="space-y-6">
                  {/* Articles Usage */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--text-primary)]">
                        Articles Used
                      </label>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {usage.articlesUsed} / {isFinite(usage.articlesLimit) ? usage.articlesLimit : '∞'}
                      </span>
                    </div>
                    {isFinite(usage.articlesLimit) && (
                      <div className="w-full bg-[var(--navy)] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] transition-all duration-300"
                          style={{ width: `${getArticlesPercentage()}%` }}
                        />
                      </div>
                    )}
                    {!isFinite(usage.articlesLimit) && (
                      <div className="text-xs text-[var(--accent)] font-medium">
                        Unlimited
                      </div>
                    )}
                  </div>

                  {/* Content Pieces Usage */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--text-primary)]">
                        Content Pieces Used
                      </label>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {usage.contentPiecesUsed} / {isFinite(usage.contentPiecesLimit) ? usage.contentPiecesLimit : '∞'}
                      </span>
                    </div>
                    {isFinite(usage.contentPiecesLimit) && (
                      <div className="w-full bg-[var(--navy)] rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] transition-all duration-300"
                          style={{ width: `${getContentPiecesPercentage()}%` }}
                        />
                      </div>
                    )}
                    {!isFinite(usage.contentPiecesLimit) && (
                      <div className="text-xs text-[var(--accent)] font-medium">
                        Unlimited
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Subscription Section */}
        {currentPlan && currentPlan.isActive && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Manage Subscription
            </h2>

            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[var(--text-primary)] font-medium mb-1">
                    Cancel Subscription
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    You'll lose access at the end of your billing period
                  </p>
                </div>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancellingSubscription}
                  className="px-4 py-2 bg-[var(--error)] hover:bg-[var(--error)] opacity-80 hover:opacity-100 text-white rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingSubscription ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Available Plans Section */}
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Available Plans
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrentPlan = currentPlan?.planId === plan.id;
              const isUpgrade =
                currentPlan &&
                PLANS.findIndex((p) => p.id === currentPlan.planId) <
                  PLANS.findIndex((p) => p.id === plan.id);
              const isDowngrade =
                currentPlan &&
                PLANS.findIndex((p) => p.id === currentPlan.planId) >
                  PLANS.findIndex((p) => p.id === plan.id);

              return (
                <div
                  key={plan.id}
                  className={`relative bg-[var(--navy-light)] border rounded-xl overflow-hidden transition-all ${
                    isCurrentPlan
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] ring-opacity-50'
                      : 'border-[var(--border)] hover:border-[var(--accent)] hover:border-opacity-50'
                  }`}
                >
                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-[var(--accent)] text-white px-3 py-1 rounded-bl-lg text-xs font-semibold">
                      Current Plan
                    </div>
                  )}

                  {/* Plan Content */}
                  <div className="p-6 flex flex-col h-full">
                    {/* Plan Name & Price */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[var(--accent)]">
                          £{plan.price}
                        </span>
                        <span className="text-[var(--text-secondary)]">/month</span>
                      </div>
                    </div>

                    {/* Usage Limits */}
                    <div className="mb-6 pb-6 border-b border-[var(--border)]">
                      <p className="text-sm text-[var(--text-secondary)] mb-3">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {isFinite(plan.articlesPerMonth)
                            ? plan.articlesPerMonth
                            : 'Unlimited'}
                        </span>{' '}
                        articles/month
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {isFinite(plan.contentPiecesPerMonth)
                            ? plan.contentPiecesPerMonth
                            : 'Unlimited'}
                        </span>{' '}
                        content pieces
                      </p>
                    </div>

                    {/* Features */}
                    <div className="mb-6 flex-grow">
                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                          >
                            <CheckCircle2
                              size={16}
                              className="text-[var(--accent)] flex-shrink-0 mt-0.5"
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleSubscribePlan(plan.id)}
                      disabled={!!(
                        isCurrentPlan ||
                        subscribing ||
                        (isDowngrade && currentPlan?.isActive)
                      )}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                        isCurrentPlan
                          ? 'bg-[var(--accent)] text-white opacity-50 cursor-not-allowed'
                          : isDowngrade && currentPlan?.isActive
                            ? 'bg-[var(--navy)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                            : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
                      }`}
                      title={
                        isDowngrade && currentPlan?.isActive
                          ? 'Contact support to downgrade'
                          : undefined
                      }
                    >
                      {isCurrentPlan
                        ? 'Current Plan'
                        : isDowngrade && currentPlan?.isActive
                          ? 'Contact Support'
                          : subscribing
                            ? 'Processing...'
                            : isUpgrade
                              ? 'Upgrade'
                              : 'Subscribe'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Questions?
          </h3>
          <p className="text-[var(--text-secondary)] mb-4">
            If you need help choosing a plan or have questions about billing, please contact our support team.
          </p>
          <a
            href="mailto:support@telum.com"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors"
          >
            <CreditCard size={18} />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
