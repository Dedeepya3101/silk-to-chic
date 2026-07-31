/** Trust & Safety helpers — educational only, never blocking. */

const SENSITIVE_PATTERNS: RegExp[] = [
  /\bphone\b/i,
  /\bmobile\b/i,
  /\bnumber\b/i,
  /\bwhats\s?app\b/i,
  /\bcall\s+me\b/i,
  /\bcontact\b/i,
  /\baddress\b/i,
  /\blocation\b/i,
  /\blandmark\b/i,
  /\bgoogle\s+maps?\b/i,
  /\bupi\b/i,
  /\bg\s?pay\b/i,
  /\bphone\s?pe\b/i,
  /\bpaytm\b/i,
  /\bbank\b/i,
  /\baccount\b/i,
  /\bpayment\b/i,
  /\btransfer\b/i,
  /\badvance\s+payment\b/i,
  /\botp\b/i,
];

export function hasSensitiveContent(text: string): boolean {
  if (!text) return false;
  return SENSITIVE_PATTERNS.some((re) => re.test(text));
}

export const REPORT_REASONS = ["Spam", "Abuse", "Fake profile", "Fraud", "Other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
