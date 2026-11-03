import { cents, evaluate, safeHttps, type Proposal } from './policy.ts';

export type CatalogReview = {
  serviceId: string;
  endpoint: string;
  priceUsd: number;
  userConfirmed: boolean;
};

export type ReviewCheck = {
  id: string;
  label: string;
  passed: boolean;
};

export type KiteStep = {
  id: 'discover' | 'inspect' | 'session' | 'approve' | 'execute' | 'activity';
  title: string;
  description: string;
  stage: 'DISCOVER' | 'REVIEW' | 'AUTHORIZE' | 'PAY' | 'TRACE';
  command: string | null;
};

export function shellQuote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

function sameEndpoint(a: string, b: string): boolean {
  if (!safeHttps(a) || !safeHttps(b)) return false;
  try { return new URL(a).href === new URL(b).href; }
  catch { return false; }
}

export function evaluateCatalogReview(proposal: Proposal, review: CatalogReview): ReviewCheck[] {
  const amount = cents(proposal.amountUsd);
  const listed = cents(review.priceUsd);
  return [
    {
      id: 'catalog_service',
      label: 'Catalog service ID copied from the Kite CLI',
      passed: /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{2,119}$/.test(review.serviceId),
    },
    {
      id: 'catalog_url',
      label: 'Reviewed endpoint exactly matches the proposed URL',
      passed: sameEndpoint(review.endpoint, proposal.endpoint),
    },
    {
      id: 'catalog_price',
      label: 'Reviewed price matches the proposed amount to the cent',
      passed: amount !== null && listed !== null && amount === listed,
    },
    {
      id: 'manual_confirm',
      label: 'Human compared the details against a live Kite catalog result',
      passed: review.userConfirmed === true,
    },
    {
      id: 'policy',
      label: 'All deterministic controls pass for a GET-only request',
      passed: evaluate(proposal).verdict === 'REVIEW' && proposal.method === 'GET',
    },
  ];
}

export function buildKiteSteps(proposal: Proposal, review: CatalogReview, servApproved: boolean): KiteStep[] {
  const checks = evaluateCatalogReview(proposal, review);
  const reviewed = checks.every(c => c.passed);
  const safe = reviewed && servApproved;
  const task = shellQuote(proposal.task.slice(0, 160));
  const amount = cents(proposal.amountUsd);
  const cost = amount === null ? null : (amount / 100).toFixed(2);
  const serviceIdValid = checks.find(c => c.id === 'catalog_service')?.passed === true;
  const endpoint = shellQuote(proposal.endpoint);

  return [
    {
      id: 'discover',
      title: 'Discover paid services',
      description: 'Search the live Kite catalog. Do not assume the fixture provider exists.',
      stage: 'DISCOVER',
      command: 'ksearch services list --query ' + task + ' --payment-approach x402_http --asset USDC --limit 10 --output json',
    },
    {
      id: 'inspect',
      title: 'Inspect the exact service',
      description: 'Copy the service ID from the previous CLI output and independently confirm URL and price.',
      stage: 'REVIEW',
      command: serviceIdValid ? 'ksearch services get --service-id ' + shellQuote(review.serviceId) + ' --output json' : null,
    },
    {
      id: 'session',
      title: 'Request one-payment spending session',
      description: 'Cap both the per-payment and total session spend to exactly this one quoted price; expires in 15 minutes.',
      stage: 'AUTHORIZE',
      command: safe && cost !== null
        ? 'kpass agent:session create --task-summary ' + task +
          ' --max-amount-per-tx ' + cost + ' --max-total-amount ' + cost +
          ' --ttl 15m --assets USDC --payment-approach x402_http --output json'
        : null,
    },
    {
      id: 'approve',
      title: 'Wait for passkey approval',
      description: 'Use the request ID returned by session creation, then review and approve the exact spending scope.',
      stage: 'AUTHORIZE',
      command: safe
        ? 'kpass agent:session status --request-id <REQUEST_ID> --wait --output json'
        : null,
    },
    {
      id: 'execute',
      title: 'Execute only the reviewed GET request',
      description: 'Only after catalog inspection, live SERV review, session activation and passkey approval.',
      stage: 'PAY',
      command: safe
        ? 'kpass agent:session execute --url ' + endpoint + ' --method GET --output json'
        : null,
    },
    {
      id: 'activity',
      title: 'Inspect actual payment activity',
      description: 'A successful CLI response and Passport activity are needed; a SpendProof decision is not payment proof.',
      stage: 'TRACE',
      command: safe ? 'kpass activity --limit 20 --output json' : null,
    },
  ];
}
