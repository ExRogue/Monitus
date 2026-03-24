// Compliance Engine — REMOVED
// This module previously checked generated content against regulatory frameworks.
// The compliance framework feature has been removed from the product.
// Exports are preserved as stubs for backward compatibility.

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

export function checkCompliance(_content: string, _frameworks: string[]): ComplianceResult {
  return {
    passed: true,
    framework: _frameworks.join(', '),
    checks: [],
    score: 100,
    status: 'passed',
  };
}

export function getAvailableFrameworks(): { id: string; name: string; description: string }[] {
  return [];
}
