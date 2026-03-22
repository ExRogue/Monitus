'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Zap, Download, FileText, Clock, Shield } from 'lucide-react';

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
  isTrial: boolean;
  trialEndsAt: string | null;
  trialExpired: boolean;
  trialDaysRemaining: number;
}

interface UserData {
  id: string;
  email: string;
  name: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500,
    period: 'monthly',
    features: [
      'Narrative',
      'Weekly monitoring',
      '3 LinkedIn drafts per week',
      'Basic engagement tracking',
      'Email support',
    ],
    articlesPerMonth: 50,
    contentPiecesPerMonth: 20,
  },
  {
    id: 'professional',
    name: 'Growth',
    price: 1200,
    period: 'monthly',
    features: [
      'Everything in Starter',
      'Daily monitoring',
      'All 3 content formats',
      'Trade media pitches',
      'LinkedIn posting via API',
      'Email export',
      'Monthly intelligence report',
      'Up to 3 users',
    ],
    articlesPerMonth: 200,
    contentPiecesPerMonth: 100,
  },
  {
    id: 'enterprise',
    name: 'Intelligence',
    price: 2000,
    period: 'monthly',
    features: [
      'Everything in Growth',
      'Competitor tracking & positioning',
      'Weekly Priority View',
      'Quarterly positioning review',
      'Briefing builder',
      'Unlimited users',
    ],
    articlesPerMonth: Infinity,
    contentPiecesPerMonth: Infinity,
  },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [companyLocale, setCompanyLocale] = useState<string>('en-GB');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [authRes, usageRes, plansRes, invoicesRes, companyRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/billing/usage'),
          fetch('/api/billing/plans'),
          fetch('/api/billing/invoices'),
          fetch('/api/company'),
        ]);

        if (!authRes.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await authRes.json();
        setUser(userData.user || userData);

        if (usageRes.ok) {
          const raw = await usageRes.json();
          setUsage({
            articlesUsed: raw.articles_used ?? raw.articlesUsed ?? 0,
            articlesLimit: raw.articles_limit ?? raw.articlesLimit ?? 0,
            contentPiecesUsed: raw.content_pieces_used ?? raw.contentPiecesUsed ?? 0,
            contentPiecesLimit: raw.content_pieces_limit ?? raw.contentPiecesLimit ?? 0,
            isTrial: raw.is_trial ?? false,
            trialEndsAt: raw.trial_ends_at ?? null,
            trialExpired: raw.trial_expired ?? false,
            trialDaysRemaining: raw.trial_days_remaining ?? 0,
          });
        }

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          if (plansData.currentPlan) {
            setCurrentPlan(plansData.currentPlan);
          }
        }

        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          setInvoices(invoicesData.invoices || []);
        }

        if (companyRes.ok) {
          const companyData = await companyRes.json();
          if (companyData.company?.locale) {
            setCompanyLocale(companyData.company.locale);
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

  const handleSubscribePlan = async (planSlug: string) => {
    if (currentPlan?.planId?.replace('plan-', '') === planSlug) {
      return; // Already on this plan
    }

    try {
      setSubscribing(true);
      setError(null);
      setSuccessMessage(null);

      // Use Stripe Checkout for paid subscriptions
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planSlug, interval: 'monthly' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setError(null);
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
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

  const currencySymbol = companyLocale === 'en-US' ? '$' : '\u00a3';
  const dateLocale = companyLocale === 'en-US' ? 'en-US' : 'en-GB';
  const GBP_TO_USD = 1.27;
  const convertPrice = (gbpPrice: number) => companyLocale === 'en-US' ? Math.round(gbpPrice * GBP_TO_USD) : gbpPrice;

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

  const getUsageColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-[var(--error)]';
    if (percentage >= 80) return 'bg-[var(--warning)]';
    return 'bg-[var(--success)]';
  };

  const getUsageTextColor = (percentage: number) => {
    if (percentage >= 100) return 'text-[var(--error)]';
    if (percentage >= 80) return 'text-[var(--warning)]';
    return 'text-[var(--text-secondary)]';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--navy)] p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-xs sm:text-sm text-[var(--text-secondary)]">
            Loading billing information...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-lg sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
            Billing & Subscription
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Manage your subscription and view usage
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-[var(--error)] rounded-lg flex items-start gap-2 sm:gap-3">
            <AlertCircle className="text-[var(--error)] flex-shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5" />
            <div>
              <h3 className="font-semibold text-xs sm:text-sm text-[var(--error)]">Error</h3>
              <p className="text-xs sm:text-sm text-[var(--error)] opacity-75">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-emerald-500/10 border border-[var(--success)] rounded-lg flex items-start gap-2 sm:gap-3">
            <CheckCircle2 className="text-[var(--success)] flex-shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5" />
            <div>
              <h3 className="font-semibold text-xs sm:text-sm text-[var(--success)]">Success</h3>
              <p className="text-xs sm:text-sm text-[var(--success)] opacity-75">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Trial Banner */}
        {usage?.isTrial && !usage.trialExpired && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-[var(--accent)]/10 to-purple-500/10 border border-[var(--accent)]/30 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    Free Trial — {usage.trialDaysRemaining} day{usage.trialDaysRemaining !== 1 ? 's' : ''} remaining
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                    You have full access until {usage.trialEndsAt ? new Date(usage.trialEndsAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) : 'trial ends'}.
                    Subscribe to a plan to continue after your trial.
                  </p>
                </div>
              </div>
              <a
                href="#plans"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                Choose a Plan
              </a>
            </div>
          </div>
        )}

        {/* Trial Expired Banner */}
        {usage?.isTrial && usage.trialExpired && !currentPlan?.isActive && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    Your free trial has ended
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                    Subscribe to a plan to regain access to monitoring, content generation, and all platform features.
                    Your Narrative and generated content are still saved.
                  </p>
                </div>
              </div>
              <a
                href="#plans"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                Subscribe Now
              </a>
            </div>
          </div>
        )}

        {/* Current Plan Section */}
        {currentPlan && currentPlan.isActive && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-xl font-semibold text-[var(--text-primary)] mb-3 sm:mb-4">
              Current Plan
            </h2>

            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-6">
              {/* Plan Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1">
                    {currentPlan.planName}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    {currencySymbol}{convertPrice(currentPlan.price)}/month
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs sm:text-sm text-[var(--text-secondary)]">
                  <p>Renews: {new Date(currentPlan.endDate).toLocaleDateString(dateLocale)}</p>
                </div>
              </div>

              {/* Usage Meters */}
              {usage && (
                <div className="space-y-3 sm:space-y-6">
                  {/* Usage warning banners */}
                  {isFinite(usage.articlesLimit) && getArticlesPercentage() >= 100 && (
                    <div className="p-2 sm:p-3 bg-red-500/10 border border-[var(--error)]/30 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--error)] flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-[var(--error)]">Article limit reached. Upgrade to continue.</span>
                    </div>
                  )}
                  {isFinite(usage.articlesLimit) && getArticlesPercentage() >= 80 && getArticlesPercentage() < 100 && (
                    <div className="p-2 sm:p-3 bg-yellow-500/10 border border-[var(--warning)]/30 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--warning)] flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-[var(--warning)]">Approaching article limit ({usage.articlesUsed}/{usage.articlesLimit}).</span>
                    </div>
                  )}
                  {isFinite(usage.contentPiecesLimit) && getContentPiecesPercentage() >= 100 && (
                    <div className="p-2 sm:p-3 bg-red-500/10 border border-[var(--error)]/30 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--error)] flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-[var(--error)]">Content limit reached. Upgrade to continue.</span>
                    </div>
                  )}
                  {isFinite(usage.contentPiecesLimit) && getContentPiecesPercentage() >= 80 && getContentPiecesPercentage() < 100 && (
                    <div className="p-2 sm:p-3 bg-yellow-500/10 border border-[var(--warning)]/30 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--warning)] flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-[var(--warning)]">Approaching content limit ({usage.contentPiecesUsed}/{usage.contentPiecesLimit}).</span>
                    </div>
                  )}

                  {/* Articles Usage */}
                  <div>
                    <div className="flex justify-between mb-2 gap-2">
                      <label className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                        Articles Used
                      </label>
                      <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${getUsageTextColor(getArticlesPercentage())}`}>
                        {usage.articlesUsed} / {isFinite(usage.articlesLimit) ? usage.articlesLimit : '∞'}
                      </span>
                    </div>
                    {isFinite(usage.articlesLimit) && (
                      <div className="w-full bg-[var(--navy)] rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full ${getUsageColor(getArticlesPercentage())} transition-all duration-300`}
                          style={{ width: `${getArticlesPercentage()}%` }}
                        />
                      </div>
                    )}
                    {!isFinite(usage.articlesLimit) && (
                      <div className="text-xs text-[var(--success)] font-medium">
                        Unlimited
                      </div>
                    )}
                  </div>

                  {/* Content Pieces Usage */}
                  <div>
                    <div className="flex justify-between mb-2 gap-2">
                      <label className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                        Content Used
                      </label>
                      <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${getUsageTextColor(getContentPiecesPercentage())}`}>
                        {usage.contentPiecesUsed} / {isFinite(usage.contentPiecesLimit) ? usage.contentPiecesLimit : '∞'}
                      </span>
                    </div>
                    {isFinite(usage.contentPiecesLimit) && (
                      <div className="w-full bg-[var(--navy)] rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full ${getUsageColor(getContentPiecesPercentage())} transition-all duration-300`}
                          style={{ width: `${getContentPiecesPercentage()}%` }}
                        />
                      </div>
                    )}
                    {!isFinite(usage.contentPiecesLimit) && (
                      <div className="text-xs text-[var(--success)] font-medium">
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
          <div className="mb-6 sm:mb-8">
            <h2 className="text-base sm:text-xl font-semibold text-[var(--text-primary)] mb-3 sm:mb-4">
              Manage Subscription
            </h2>

            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-6 space-y-4">
              {/* Manage Payment Method */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium mb-1">
                    Payment & Invoices
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    Update your card, view invoices, or download receipts
                  </p>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-[var(--navy)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs sm:text-sm font-medium transition-colors"
                >
                  Manage Billing
                </button>
              </div>

              <div className="border-t border-[var(--border)]" />

              {/* Cancel Subscription */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium mb-1">
                    Cancel Subscription
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    You&apos;ll lose access at period end
                  </p>
                </div>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancellingSubscription}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-[var(--error)] hover:bg-[var(--error)] opacity-80 hover:opacity-100 text-white rounded-lg text-xs sm:text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingSubscription ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice History Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-xl font-semibold text-[var(--text-primary)] mb-3 sm:mb-4">
            Invoice History
          </h2>

          {invoices.length > 0 ? (
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto text-xs sm:text-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--navy)]/50">
                      <th className="px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                        Invoice
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-[var(--text-primary)] hidden sm:table-cell">
                        Period
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                        Amount
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-[var(--text-primary)] hidden sm:table-cell">
                        Status
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b border-[var(--border)] hover:bg-[var(--navy)]/30 transition-colors"
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-4 text-xs sm:text-sm text-[var(--text-primary)] font-medium">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <FileText size={14} className="text-[var(--text-secondary)] flex-shrink-0 hidden sm:block" />
                            <span className="truncate">{invoice.invoiceNumber}</span>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-4 text-xs sm:text-sm text-[var(--text-secondary)] hidden sm:table-cell whitespace-nowrap">
                          {new Date(invoice.periodStart).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })} - {new Date(invoice.periodEnd).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-4 text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                          {invoice.currency === 'GBP' ? '£' : '$'}{(invoice.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-4 hidden sm:table-cell">
                          <span
                            className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                              invoice.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : invoice.status === 'pending'
                                  ? 'bg-yellow-500/10 text-yellow-400'
                                  : invoice.status === 'draft'
                                    ? 'bg-blue-500/10 text-blue-400'
                                    : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-4 text-xs sm:text-sm text-[var(--text-secondary)]">
                          {new Date(invoice.createdAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4 sm:p-8 text-center">
              <FileText
                size={24}
                className="text-[var(--text-secondary)] opacity-50 mx-auto mb-2 sm:mb-3"
              />
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                No invoices yet. First invoice appears after your first billing period.
              </p>
            </div>
          )}
        </div>

        {/* Available Plans Section */}
        <div id="plans">
          <h2 className="text-base sm:text-xl font-semibold text-[var(--text-primary)] mb-3 sm:mb-4">
            Available Plans
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {PLANS.map((plan) => {
              // currentPlan.planId is "plan-starter" etc; PLANS use "starter" slugs
              const currentSlug = currentPlan?.planId?.replace('plan-', '') || '';
              const isCurrentPlan = currentSlug === plan.id;
              const isUpgrade =
                currentPlan &&
                PLANS.findIndex((p) => p.id === currentSlug) <
                  PLANS.findIndex((p) => p.id === plan.id);
              const isDowngrade =
                currentPlan &&
                PLANS.findIndex((p) => p.id === currentSlug) >
                  PLANS.findIndex((p) => p.id === plan.id);

              return (
                <div
                  key={plan.id}
                  className={`relative bg-[var(--navy-light)] border rounded-lg sm:rounded-xl overflow-hidden transition-all ${
                    isCurrentPlan
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] ring-opacity-50'
                      : 'border-[var(--border)] hover:border-[var(--accent)] hover:border-opacity-50'
                  }`}
                >
                  {/* Current Plan Badge */}
                  {isCurrentPlan && (
                    <div className="absolute top-0 right-0 bg-[var(--accent)] text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-bl-lg text-xs font-semibold">
                      Current
                    </div>
                  )}

                  {/* Plan Content */}
                  <div className="p-3 sm:p-6 flex flex-col h-full">
                    {/* Plan Name & Price */}
                    <div className="mb-3 sm:mb-6">
                      <h3 className="text-base sm:text-xl font-bold text-[var(--text-primary)] mb-1 sm:mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-bold text-[var(--accent)]">
                          {currencySymbol}{convertPrice(plan.price)}
                        </span>
                        <span className="text-xs sm:text-sm text-[var(--text-secondary)]">/month</span>
                      </div>
                    </div>

                    {/* Usage Limits */}
                    <div className="mb-3 sm:mb-6 pb-3 sm:pb-6 border-b border-[var(--border)]">
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-2">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {isFinite(plan.articlesPerMonth)
                            ? plan.articlesPerMonth
                            : 'Unlimited'}
                        </span>{' '}
                        articles/month
                      </p>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {isFinite(plan.contentPiecesPerMonth)
                            ? plan.contentPiecesPerMonth
                            : 'Unlimited'}
                        </span>{' '}
                        content
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
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[var(--border)]">
          <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-3 sm:mb-4">
            Questions?
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-4">
            If you need help choosing a plan or have billing questions, contact our support team.
          </p>
          <a
            href="mailto:support@monitus.ai"
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg text-sm sm:text-base font-medium transition-colors"
          >
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            Contact Support
          </a>
        </div>
      </div>
  );
}
