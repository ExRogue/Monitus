import { describe, it, expect } from 'vitest';
import { checkCompliance, getAvailableFrameworks } from '@/lib/compliance';

describe('checkCompliance', () => {
  describe('FCA rules', () => {
    it('fails on guaranteed returns language', () => {
      const result = checkCompliance('Our product offers guaranteed returns every year.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Fair, Clear and Not Misleading');
      expect(rule?.passed).toBe(false);
    });

    it('fails on risk-free language', () => {
      const result = checkCompliance('This is a risk-free investment.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Fair, Clear and Not Misleading');
      expect(rule?.passed).toBe(false);
    });

    it('passes when no misleading language present', () => {
      const result = checkCompliance('Our product provides coverage for commercial risks.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Fair, Clear and Not Misleading');
      expect(rule?.passed).toBe(true);
    });

    it('warns when no FCA disclaimer present', () => {
      const result = checkCompliance('We provide insurance services.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Regulatory Disclaimer Present');
      expect(rule?.passed).toBe(false);
    });

    it('passes FCA disclaimer check when disclaimer is present', () => {
      const result = checkCompliance('This does not constitute financial advice. FCA regulated firm.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Regulatory Disclaimer Present');
      expect(rule?.passed).toBe(true);
    });

    it('fails balanced check when benefits mentioned without risks', () => {
      const result = checkCompliance('Our product has great benefits, advantages and growth opportunities.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Balanced Presentation');
      expect(rule?.passed).toBe(false);
    });

    it('passes balanced check when risks mentioned alongside benefits', () => {
      const result = checkCompliance('Our product offers growth opportunities but involves risk and uncertainty.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Balanced Presentation');
      expect(rule?.passed).toBe(true);
    });

    it('fails Consumer Duty check for misleading outcome language', () => {
      const result = checkCompliance('We offer guaranteed cover with no exclusions.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Consumer Duty Alignment');
      expect(rule?.passed).toBe(false);
    });

    it('fails Consumer Duty check for pricing without fair value context', () => {
      const result = checkCompliance('Our premium is the lowest in the market.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Consumer Duty Alignment');
      expect(rule?.passed).toBe(false);
    });

    it('passes Consumer Duty check when pricing includes fair value context', () => {
      const result = checkCompliance('Our premium is transparent and fair to all customers.', ['FCA']);
      const rule = result.checks.find(c => c.rule === 'Consumer Duty Alignment');
      expect(rule?.passed).toBe(true);
    });
  });

  describe('GDPR rules', () => {
    it('warns when no unsubscribe mechanism in newsletter content', () => {
      const result = checkCompliance('Welcome to our monthly newsletter.', ['GDPR']);
      const rule = result.checks.find(c => c.rule === 'Unsubscribe Mechanism');
      expect(rule?.passed).toBe(false);
    });

    it('passes unsubscribe check when opt-out mentioned', () => {
      const result = checkCompliance('To opt-out of this newsletter, click here.', ['GDPR']);
      const rule = result.checks.find(c => c.rule === 'Unsubscribe Mechanism');
      expect(rule?.passed).toBe(true);
    });

    it('detects email PII', () => {
      const result = checkCompliance('Contact john.smith@privatecompany.com for details.', ['GDPR']);
      const rule = result.checks.find(c => c.rule === 'PII Check');
      expect(rule?.passed).toBe(false);
    });

    it('ignores generic template emails', () => {
      const result = checkCompliance('Contact info@yourcompany.com for details.', ['GDPR']);
      const rule = result.checks.find(c => c.rule === 'PII Check');
      expect(rule?.passed).toBe(true);
    });

    it('detects UK phone numbers as PII', () => {
      const result = checkCompliance('Call us on +44 7700 123456 for more information.', ['GDPR']);
      const rule = result.checks.find(c => c.rule === 'PII Check');
      expect(rule?.passed).toBe(false);
    });
  });

  describe('Solvency II rules', () => {
    it('fails on overstated prudential claims', () => {
      const result = checkCompliance('We are fully capitalised and cannot fail.', ['Solvency II']);
      const rule = result.checks.find(c => c.rule === 'Prudential Language');
      expect(rule?.passed).toBe(false);
    });

    it('warns when capital referenced without risk context', () => {
      const result = checkCompliance('Our solvency ratio exceeds requirements.', ['Solvency II']);
      const rule = result.checks.find(c => c.rule === 'Risk Disclosure');
      expect(rule?.passed).toBe(false);
    });

    it('passes risk disclosure when capital and risk both mentioned', () => {
      const result = checkCompliance('Our capital position is strong, though we monitor ongoing risk and exposure carefully.', ['Solvency II']);
      const rule = result.checks.find(c => c.rule === 'Risk Disclosure');
      expect(rule?.passed).toBe(true);
    });
  });

  describe('Quality rules (always applied)', () => {
    it('detects speculative language', () => {
      const result = checkCompliance('Rates will surely increase next quarter.', []);
      const rule = result.checks.find(c => c.rule === 'No Speculative Claims');
      expect(rule?.passed).toBe(false);
    });

    it('passes quality check for hedged language', () => {
      const result = checkCompliance('Rates may increase next quarter based on current trends.', []);
      const rule = result.checks.find(c => c.rule === 'No Speculative Claims');
      expect(rule?.passed).toBe(true);
    });
  });

  describe('overall scoring and status', () => {
    it('returns failed status when error-level rule fails', () => {
      const result = checkCompliance('This is guaranteed returns, risk-free investment.', ['FCA']);
      expect(result.status).toBe('failed');
      expect(result.passed).toBe(false);
    });

    it('returns warning status when 2+ warnings fail', () => {
      // Content with no disclaimer and no balanced risk — two warnings
      const result = checkCompliance('Great benefits and advantages for growth.', ['FCA']);
      expect(result.status).toBe('warning');
    });

    it('returns passed status for clean content', () => {
      const result = checkCompliance(
        'Our FCA regulated firm provides risk management solutions. This does not constitute financial advice. We help clients navigate uncertainty and challenge.',
        ['FCA']
      );
      expect(result.passed).toBe(true);
    });

    it('score is between 0 and 100', () => {
      const result = checkCompliance('Some content here.', ['FCA', 'GDPR']);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('only applies quality rules when no frameworks specified', () => {
      const result = checkCompliance('Good content with no issues.', []);
      expect(result.checks.every(c => c.rule === 'No Speculative Claims')).toBe(true);
    });
  });

  describe('TCFD rules', () => {
    it('warns on unsubstantiated green claims', () => {
      const result = checkCompliance('We are carbon neutral and climate positive.', ['TCFD']);
      const rule = result.checks.find(c => c.rule === 'Climate Disclosure Accuracy');
      expect(rule?.passed).toBe(false);
    });

    it('passes TCFD when climate claims are substantiated', () => {
      const result = checkCompliance('We are carbon neutral, verified and measured by independent data.', ['TCFD']);
      const rule = result.checks.find(c => c.rule === 'Climate Disclosure Accuracy');
      expect(rule?.passed).toBe(true);
    });

    it('passes TCFD when no climate claims present', () => {
      const result = checkCompliance('We provide commercial insurance solutions.', ['TCFD']);
      const rule = result.checks.find(c => c.rule === 'Climate Disclosure Accuracy');
      expect(rule?.passed).toBe(true);
    });
  });
});

describe('getAvailableFrameworks', () => {
  it('returns all 8 frameworks', () => {
    const frameworks = getAvailableFrameworks();
    expect(frameworks).toHaveLength(8);
  });

  it('includes FCA framework', () => {
    const frameworks = getAvailableFrameworks();
    expect(frameworks.some(f => f.id === 'FCA')).toBe(true);
  });

  it('includes GDPR framework', () => {
    const frameworks = getAvailableFrameworks();
    expect(frameworks.some(f => f.id === 'GDPR')).toBe(true);
  });

  it('each framework has id, name, and description', () => {
    const frameworks = getAvailableFrameworks();
    for (const f of frameworks) {
      expect(f.id).toBeTruthy();
      expect(f.name).toBeTruthy();
      expect(f.description).toBeTruthy();
    }
  });
});
