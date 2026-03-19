import { describe, it, expect, vi } from 'vitest';
import { tierDeniedResponse, checkTierAccess } from '@/lib/tier-gate';

// Mock billing to control what tier the user is on
vi.mock('@/lib/billing', () => ({
  getUserSubscription: vi.fn(),
}));

import { getUserSubscription } from '@/lib/billing';
const mockGetUserSubscription = vi.mocked(getUserSubscription);

describe('tierDeniedResponse', () => {
  it('returns error message with required tier name', () => {
    const gate = {
      allowed: false,
      requiredTier: 'plan-enterprise',
      requiredTierDisplayName: 'Intelligence',
      currentTier: 'plan-starter',
      currentTierDisplayName: 'Starter',
    };
    const response = tierDeniedResponse(gate);
    expect(response.error).toContain('Intelligence');
    expect(response.upgradeUrl).toBe('/billing');
  });

  it('includes pricing for known tiers', () => {
    const gate = {
      allowed: false,
      requiredTier: 'plan-starter',
      requiredTierDisplayName: 'Starter',
      currentTier: 'plan-trial',
      currentTierDisplayName: 'Free Trial',
    };
    const response = tierDeniedResponse(gate);
    expect(response.pricing).toBeDefined();
    expect(response.pricing?.monthly).toContain('£');
  });

  it('does not include pricing for trial tier', () => {
    const gate = {
      allowed: false,
      requiredTier: 'plan-trial',
      requiredTierDisplayName: 'Free Trial',
      currentTier: 'plan-trial',
      currentTierDisplayName: 'Free Trial',
    };
    const response = tierDeniedResponse(gate);
    expect(response.pricing).toBeUndefined();
  });
});

describe('checkTierAccess', () => {
  it('allows access to ungated feature for any user', async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    const result = await checkTierAccess('user-1', 'some_ungated_feature');
    expect(result.allowed).toBe(true);
  });

  it('denies briefing_builder to trial user', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-trial' } as any);
    const result = await checkTierAccess('user-1', 'briefing_builder');
    expect(result.allowed).toBe(false);
    expect(result.requiredTierDisplayName).toBe('Intelligence');
  });

  it('denies briefing_builder to starter user', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-starter' } as any);
    const result = await checkTierAccess('user-1', 'briefing_builder');
    expect(result.allowed).toBe(false);
  });

  it('denies briefing_builder to growth user', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-professional' } as any);
    const result = await checkTierAccess('user-1', 'briefing_builder');
    expect(result.allowed).toBe(false);
  });

  it('allows briefing_builder to intelligence user', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-enterprise' } as any);
    const result = await checkTierAccess('user-1', 'briefing_builder');
    expect(result.allowed).toBe(true);
  });

  it('allows trade_media to growth user', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-professional' } as any);
    const result = await checkTierAccess('user-1', 'trade_media');
    expect(result.allowed).toBe(true);
  });

  it('denies trade_media to starter user', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-starter' } as any);
    const result = await checkTierAccess('user-1', 'trade_media');
    expect(result.allowed).toBe(false);
  });

  it('allows linkedin_api to growth user', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-professional' } as any);
    const result = await checkTierAccess('user-1', 'linkedin_api');
    expect(result.allowed).toBe(true);
  });

  it('denies linkedin_api to trial user', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-trial' } as any);
    const result = await checkTierAccess('user-1', 'linkedin_api');
    expect(result.allowed).toBe(false);
  });

  it('defaults to trial when no subscription exists', async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    const result = await checkTierAccess('user-1', 'briefing_builder');
    expect(result.currentTier).toBe('plan-trial');
    expect(result.allowed).toBe(false);
  });

  it('returns correct display names', async () => {
    mockGetUserSubscription.mockResolvedValue({ plan_id: 'plan-starter' } as any);
    const result = await checkTierAccess('user-1', 'briefing_builder');
    expect(result.currentTierDisplayName).toBe('Starter');
    expect(result.requiredTierDisplayName).toBe('Intelligence');
  });
});
