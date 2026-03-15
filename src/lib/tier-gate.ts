import { getUserSubscription } from './billing';

// Tier hierarchy from lowest to highest
const TIER_HIERARCHY = ['plan-trial', 'plan-starter', 'plan-professional', 'plan-enterprise'];

const TIER_DISPLAY_NAMES: Record<string, string> = {
  'plan-trial': 'Free Trial',
  'plan-starter': 'Starter',
  'plan-professional': 'Growth',
  'plan-enterprise': 'Intelligence',
};

const TIER_PRICING: Record<string, { monthly: number; yearly: number }> = {
  'plan-starter': { monthly: 500, yearly: 4800 },
  'plan-professional': { monthly: 1200, yearly: 11520 },
  'plan-enterprise': { monthly: 2000, yearly: 19200 },
};

// Map features to their minimum required tier
const FEATURE_TIERS: Record<string, string> = {
  // Intelligence tier (plan-enterprise)
  briefing_builder: 'plan-enterprise',
  competitor_monitoring: 'plan-enterprise',
  quarterly_review: 'plan-enterprise',
  trade_media: 'plan-enterprise',

  // Growth tier (plan-professional)
  monthly_report: 'plan-professional',
  linkedin_api: 'plan-professional',
  email_export: 'plan-professional',
  daily_monitoring: 'plan-professional',
  all_content_formats: 'plan-professional',
};

export interface TierGateResult {
  allowed: boolean;
  requiredTier: string;
  requiredTierDisplayName: string;
  currentTier: string | null;
  currentTierDisplayName: string;
}

export async function checkTierAccess(
  userId: string,
  feature: string
): Promise<TierGateResult> {
  const requiredTier = FEATURE_TIERS[feature];
  if (!requiredTier) {
    // Feature not gated
    return {
      allowed: true,
      requiredTier: 'plan-trial',
      requiredTierDisplayName: 'Free Trial',
      currentTier: null,
      currentTierDisplayName: 'Unknown',
    };
  }

  const subscription = await getUserSubscription(userId);
  const currentTier = subscription?.plan_id || 'plan-trial';
  const currentTierDisplayName = TIER_DISPLAY_NAMES[currentTier] || 'Free Trial';
  const requiredTierDisplayName = TIER_DISPLAY_NAMES[requiredTier] || requiredTier;

  const currentIndex = TIER_HIERARCHY.indexOf(currentTier);
  const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);

  const allowed = currentIndex >= requiredIndex;

  return {
    allowed,
    requiredTier,
    requiredTierDisplayName,
    currentTier,
    currentTierDisplayName,
  };
}

export function tierDeniedResponse(gate: TierGateResult) {
  const pricing = TIER_PRICING[gate.requiredTier];
  return {
    error: `This feature requires the ${gate.requiredTierDisplayName} plan`,
    requiredTier: gate.requiredTierDisplayName,
    currentTier: gate.currentTierDisplayName,
    upgradeUrl: '/billing',
    ...(pricing ? { pricing: { monthly: `£${pricing.monthly}/mo`, yearly: `£${Math.round(pricing.yearly / 12)}/mo (billed yearly)` } } : {}),
  };
}
