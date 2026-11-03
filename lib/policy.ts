export type Method = 'GET' | 'POST';
export type Proposal = {
  task: string; provider: string; endpoint: string; evidenceUrl: string;
  amountUsd: number; budgetUsd: number; perTxUsd: number; remainingUsd: number;
  supportsX402: boolean; method: Method;
};
export type Check = { id: string; title: string; detail: string; passed: boolean };
export type Decision = {
  verdict: 'BLOCK' | 'REVIEW'; checks: Check[]; reasons: string[];
  amountCents: number; evaluatedAt: string; paymentExecuted: false;
};
export type ServAssessment = {
  summary: string; risk: 'low'|'medium'|'high';
  concerns: string[]; evidenceGaps: string[]; recommendation: 'REVIEW'|'DENY';
};

export function cents(x: unknown): number | null {
  if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0 || x > 100000) return null;
  const value = Math.round(x * 100);
  return value > 0 && Math.abs(x * 100 - value) < 0.000001 ? value : null;
}
export function safeHttps(value: string): boolean {
  if (typeof value !== 'string' || value.length > 1000) return false;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.port) return false;
    const h = u.hostname.toLowerCase().replace(/\.$/, '');
    if (!h.includes('.') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.test') || h.endsWith('.localhost') || h.endsWith('.onion')) return false;
    if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.') || h.startsWith('169.254.') || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(h) || h.startsWith('[')) return false;
    return true;
  } catch { return false; }
}
export function validProposal(x: unknown): x is Proposal {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const p = x as Record<string, unknown>;
  return typeof p.task === 'string' && p.task.length <= 700 &&
    typeof p.provider === 'string' && p.provider.length <= 120 &&
    typeof p.endpoint === 'string' && p.endpoint.length <= 1000 &&
    typeof p.evidenceUrl === 'string' && p.evidenceUrl.length <= 1000 &&
    (p.method === 'GET' || p.method === 'POST') && typeof p.supportsX402 === 'boolean' &&
    ['amountUsd','budgetUsd','perTxUsd','remainingUsd'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k] as number));
}
export function evaluate(p: Proposal, evaluatedAt = new Date().toISOString()): Decision {
  const price = cents(p.amountUsd), budget = cents(p.budgetUsd), cap = cents(p.perTxUsd), remaining = cents(p.remainingUsd);
  const checks: Check[] = [
    { id:'task', title:'Task and provider', detail:'A clear purpose and named provider are required.', passed:p.task.trim().length >= 12 && p.provider.trim().length >= 2 },
    { id:'endpoint', title:'Public HTTPS endpoint', detail:'URL format only; the provider and endpoint have not been independently verified.', passed:safeHttps(p.endpoint) },
    { id:'budget', title:'Within task budget', detail:'Cost cannot exceed the user-defined total budget.', passed:price !== null && budget !== null && price <= budget },
    { id:'cap', title:'Within per-payment cap', detail:'Cost cannot exceed the single-payment limit.', passed:price !== null && cap !== null && price <= cap },
    { id:'remaining', title:'Within remaining allocation', detail:'Cost cannot exceed the remaining session allowance.', passed:price !== null && remaining !== null && price <= remaining },
    { id:'x402', title:'x402 support claimed', detail:'Unverified claim; Kite catalog discovery is required before payment.', passed:p.supportsX402 === true },
    { id:'evidence', title:'Evidence URL supplied', detail:'Presence of a public URL is checked, but its content and authenticity are not.', passed:safeHttps(p.evidenceUrl) }
  ];
  const reasons = checks.filter(c => !c.passed).map(c => c.title);
  return { verdict:reasons.length ? 'BLOCK' : 'REVIEW', checks, reasons, amountCents:price ?? 0, evaluatedAt, paymentExecuted:false };
}
