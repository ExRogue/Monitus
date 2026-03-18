// Compliance Engine for Insurance Content
// Checks generated content against regulatory frameworks

export interface ComplianceRule {
  id: string;
  framework: string;
  name: string;
  description: string;
  check: (content: string) => { passed: boolean; message: string };
  severity: 'error' | 'warning' | 'info';
}

export interface ComplianceResult {
  passed: boolean;
  framework: string;
  checks: {
    rule: string;
    passed: boolean;
    message: string;
    severity: string;
  }[];
  score: number;
  status?: string;
}

// Define compliance rules for each framework
const COMPLIANCE_RULES: ComplianceRule[] = [
  // FCA Rules
  {
    id: 'fca-fair-clear',
    framework: 'FCA',
    name: 'Fair, Clear and Not Misleading',
    description: 'All financial promotions must be fair, clear, and not misleading (COBS 4.2)',
    severity: 'error',
    check: (content: string) => {
      const misleadingPhrases = ['guaranteed returns', 'risk-free', 'no risk', 'guaranteed profit', 'cannot lose'];
      const found = misleadingPhrases.filter(p => content.toLowerCase().includes(p));
      return {
        passed: found.length === 0,
        message: found.length > 0 ? `Potentially misleading phrases detected: ${found.join(', ')}` : 'No misleading language detected'
      };
    }
  },
  {
    id: 'fca-disclaimer',
    framework: 'FCA',
    name: 'Regulatory Disclaimer Present',
    description: 'Content should include appropriate regulatory disclaimers',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const hasDisclaimer = lower.includes('financial conduct authority') ||
        lower.includes('fca') ||
        lower.includes('not constitute advice') ||
        lower.includes('informational purposes');
      return {
        passed: hasDisclaimer,
        message: hasDisclaimer ? 'Regulatory disclaimer present' : 'Missing FCA regulatory disclaimer. Add authorisation statement.'
      };
    }
  },
  {
    id: 'fca-balanced',
    framework: 'FCA',
    name: 'Balanced Presentation',
    description: 'Benefits must be balanced with fair representation of risks',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const benefitWords = ['benefit', 'advantage', 'opportunity', 'growth', 'profit', 'gain'];
      const riskWords = ['risk', 'caution', 'consider', 'limitation', 'challenge', 'uncertainty'];
      const benefits = benefitWords.filter(w => lower.includes(w)).length;
      const risks = riskWords.filter(w => lower.includes(w)).length;
      const balanced = benefits === 0 || risks > 0;
      return {
        passed: balanced,
        message: balanced ? 'Content presents balanced view' : 'Content may be unbalanced — mentions benefits without adequate risk context'
      };
    }
  },
  {
    id: 'fca-consumer-duty',
    framework: 'FCA',
    name: 'Consumer Duty Alignment',
    description: 'Content must not create unrealistic expectations or imply guaranteed outcomes (FCA Consumer Duty)',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      // Check for language that could set unrealistic expectations
      const problematicPhrases = [
        'always pays out', 'every claim is paid', 'guaranteed cover',
        'no exclusions', 'complete protection', 'total peace of mind',
        'never be refused', 'instant payout', 'no questions asked',
        'hassle-free claims', 'simple as that',
      ];
      const found = problematicPhrases.filter(p => lower.includes(p));
      // Check for fair value language when discussing pricing
      const discussesPricing = lower.includes('price') || lower.includes('premium') || lower.includes('cost') || lower.includes('value');
      const hasFairValueContext = lower.includes('fair') || lower.includes('transparent') || lower.includes('clear') || lower.includes('understand');
      const pricingIssue = discussesPricing && !hasFairValueContext;

      if (found.length > 0) {
        return { passed: false, message: `Consumer Duty: potentially misleading outcome language: ${found.join(', ')}` };
      }
      if (pricingIssue) {
        return { passed: false, message: 'Consumer Duty: pricing/premium language should include fair value or transparency context' };
      }
      return { passed: true, message: 'Content aligns with Consumer Duty requirements' };
    }
  },

  // State DOI Rules (US)
  {
    id: 'doi-unfair-trade',
    framework: 'State DOI',
    name: 'Unfair Trade Practices Check',
    description: 'Content must not contain unfair or deceptive trade practices',
    severity: 'error',
    check: (content: string) => {
      const deceptivePhrases = ['best price guaranteed', 'lowest rates', 'cheapest coverage', 'only option'];
      const found = deceptivePhrases.filter(p => content.toLowerCase().includes(p));
      return {
        passed: found.length === 0,
        message: found.length > 0 ? `Potentially deceptive phrases: ${found.join(', ')}` : 'No unfair trade practice language detected'
      };
    }
  },
  {
    id: 'doi-disclosure',
    framework: 'State DOI',
    name: 'Proper Disclosure',
    description: 'Content should include appropriate disclosures about the nature of the communication',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const hasDisclosure = lower.includes('does not constitute') || lower.includes('informational') ||
        lower.includes('not a solicitation') || lower.includes('not insurance advice');
      return {
        passed: hasDisclosure,
        message: hasDisclosure ? 'Appropriate disclosure present' : 'Consider adding disclosure that content is informational, not a solicitation'
      };
    }
  },

  // GDPR Rules
  {
    id: 'gdpr-unsubscribe',
    framework: 'GDPR',
    name: 'Unsubscribe Mechanism',
    description: 'Marketing communications must include unsubscribe option',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const hasUnsub = lower.includes('unsubscribe') || lower.includes('opt out') || lower.includes('opt-out');
      return {
        passed: hasUnsub,
        message: hasUnsub ? 'Unsubscribe mechanism referenced' : 'Newsletter content should include unsubscribe option for GDPR compliance'
      };
    }
  },
  {
    id: 'gdpr-pii',
    framework: 'GDPR',
    name: 'PII Check',
    description: 'Content should not contain personally identifiable information',
    severity: 'error',
    check: (content: string) => {
      // Check for common PII patterns
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const phoneRegex = /(\+44|0)[\s.-]?\d{4}[\s.-]?\d{6}/g;
      const emails = content.match(emailRegex) || [];
      const phones = content.match(phoneRegex) || [];
      // Filter out generic template emails
      const realEmails = emails.filter(e => !e.includes('example') && !e.includes('yourcompany') && !e.includes('info@'));
      const hasPII = realEmails.length > 0 || phones.length > 0;
      return {
        passed: !hasPII,
        message: hasPII ? `Potential PII detected: ${realEmails.length} email(s), ${phones.length} phone number(s)` : 'No PII detected'
      };
    }
  },

  // FTC Rules (US)
  {
    id: 'ftc-endorsement',
    framework: 'FTC',
    name: 'Endorsement Disclosure',
    description: 'Testimonials and endorsements must be properly disclosed',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const hasTestimonial = lower.includes('testimonial') || lower.includes('endorsed by') || lower.includes('recommended by');
      const hasDisclosure = lower.includes('paid') || lower.includes('sponsored') || lower.includes('material connection');
      if (!hasTestimonial) return { passed: true, message: 'No endorsements detected' };
      return {
        passed: hasDisclosure,
        message: hasDisclosure ? 'Endorsement properly disclosed' : 'Endorsement detected without proper disclosure'
      };
    }
  },

  // Solvency II Rules
  {
    id: 'solvency-prudential',
    framework: 'Solvency II',
    name: 'Prudential Language',
    description: 'Content should not overstate solvency position or capital adequacy',
    severity: 'error',
    check: (content: string) => {
      const phrases = ['fully capitalised', 'zero default risk', 'unlimited capacity', 'cannot fail'];
      const found = phrases.filter(p => content.toLowerCase().includes(p));
      return {
        passed: found.length === 0,
        message: found.length > 0 ? `Overstated prudential claims: ${found.join(', ')}` : 'No overstated prudential claims detected'
      };
    }
  },
  {
    id: 'solvency-risk-disclosure',
    framework: 'Solvency II',
    name: 'Risk Disclosure',
    description: 'Content about reinsurance or capital should reference risk considerations',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const hasCapitalRef = lower.includes('capital') || lower.includes('solvency') || lower.includes('reserves');
      const hasRiskRef = lower.includes('risk') || lower.includes('exposure') || lower.includes('volatility');
      if (!hasCapitalRef) return { passed: true, message: 'No capital-related content requiring risk disclosure' };
      return {
        passed: hasRiskRef,
        message: hasRiskRef ? 'Risk context present alongside capital references' : 'Capital/solvency content should include risk considerations'
      };
    }
  },

  // NAIC Rules
  {
    id: 'naic-market-conduct',
    framework: 'NAIC',
    name: 'Market Conduct Standards',
    description: 'Content must not contain unfair marketing practices',
    severity: 'error',
    check: (content: string) => {
      const phrases = ['guaranteed lowest', 'always the best', 'only choice', 'no competitors'];
      const found = phrases.filter(p => content.toLowerCase().includes(p));
      return {
        passed: found.length === 0,
        message: found.length > 0 ? `Unfair marketing language: ${found.join(', ')}` : 'No unfair marketing language detected'
      };
    }
  },

  // APRA Rules
  {
    id: 'apra-prudential',
    framework: 'APRA',
    name: 'Prudential Standards Compliance',
    description: 'Content should align with APRA prudential standards for Australian market',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const misleading = ['guaranteed returns', 'risk-free investment', 'no chance of loss'];
      const found = misleading.filter(p => lower.includes(p));
      return {
        passed: found.length === 0,
        message: found.length > 0 ? `APRA-sensitive language: ${found.join(', ')}` : 'Content aligns with APRA prudential standards'
      };
    }
  },

  // TCFD Rules
  {
    id: 'tcfd-climate-claims',
    framework: 'TCFD',
    name: 'Climate Disclosure Accuracy',
    description: 'Climate-related claims must be substantiated and not greenwashing',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const greenClaims = ['carbon neutral', 'net zero', 'climate positive', 'green insurance'];
      const hasGreenClaim = greenClaims.some(p => lower.includes(p));
      const hasSubstantiation = lower.includes('data') || lower.includes('report') || lower.includes('measured') || lower.includes('verified');
      if (!hasGreenClaim) return { passed: true, message: 'No climate claims requiring TCFD disclosure' };
      return {
        passed: hasSubstantiation,
        message: hasSubstantiation ? 'Climate claims appear substantiated' : 'Climate-related claims should be backed by data or verification references'
      };
    }
  },

  // General quality checks
  {
    id: 'quality-accuracy',
    framework: 'Quality',
    name: 'No Speculative Claims',
    description: 'Content should not make unsubstantiated claims about future market performance',
    severity: 'warning',
    check: (content: string) => {
      const lower = content.toLowerCase();
      const speculative = ['will definitely', 'certain to', 'guaranteed to', 'prices will', 'rates will surely'];
      const found = speculative.filter(p => lower.includes(p));
      return {
        passed: found.length === 0,
        message: found.length > 0 ? `Speculative language detected: ${found.join(', ')}. Use hedging language.` : 'No unqualified speculative claims detected'
      };
    }
  },
];

export function checkCompliance(content: string, frameworks: string[]): ComplianceResult {
  const applicableRules = COMPLIANCE_RULES.filter(
    r => frameworks.includes(r.framework) || r.framework === 'Quality'
  );

  const checks = applicableRules.map(rule => {
    const result = rule.check(content);
    return {
      rule: rule.name,
      passed: result.passed,
      message: result.message,
      severity: rule.severity,
    };
  });

  const errorsFailed = checks.filter(c => !c.passed && c.severity === 'error').length;
  const warningsFailed = checks.filter(c => !c.passed && c.severity === 'warning').length;
  const totalChecks = checks.length;
  const passedChecks = checks.filter(c => c.passed).length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  // errors = failed, 2+ warnings = warning status, else passed
  const status = errorsFailed > 0 ? 'failed' : warningsFailed >= 2 ? 'warning' : 'passed';

  return {
    passed: status !== 'failed',
    framework: frameworks.join(', '),
    checks,
    score,
    status,
  };
}

export function getAvailableFrameworks(): { id: string; name: string; description: string }[] {
  return [
    { id: 'FCA', name: 'FCA (UK)', description: 'Financial Conduct Authority — UK insurance regulation' },
    { id: 'Solvency II', name: 'Solvency II (EU/UK)', description: 'Prudential regulation for insurers and reinsurers' },
    { id: 'State DOI', name: 'State DOI (US)', description: 'State Department of Insurance — US insurance regulation' },
    { id: 'GDPR', name: 'GDPR', description: 'General Data Protection Regulation — data privacy' },
    { id: 'FTC', name: 'FTC (US)', description: 'Federal Trade Commission — advertising standards' },
    { id: 'NAIC', name: 'NAIC (US)', description: 'National Association of Insurance Commissioners' },
    { id: 'APRA', name: 'APRA (AU)', description: 'Australian Prudential Regulation Authority' },
    { id: 'TCFD', name: 'TCFD', description: 'Task Force on Climate-related Financial Disclosures' },
  ];
}
