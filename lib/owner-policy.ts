import { cents, evaluate, type Decision, type Proposal } from './policy.ts';

export const DEFAULT_MAX_SIGNED_TX_USD=1;
export const ABSOLUTE_MAX_SIGNED_TX_USD=100;

export function resolveOwnerCeilingCents(raw:string|undefined):number|null{
  if(raw===undefined || raw.trim()==='')return 100;
  const parsed=Number(raw);
  const amount=cents(parsed);
  return amount!==null && amount <= ABSOLUTE_MAX_SIGNED_TX_USD*100
    ? amount
    : null;
}

export function evaluateSignedPolicy(
  proposal:Proposal,
  ceilingCents:number,
  evaluatedAt=new Date().toISOString(),
):Decision{
  const base=evaluate(proposal,evaluatedAt);
  const price=cents(proposal.amountUsd);
  const pass=Number.isInteger(ceilingCents) &&
    ceilingCents>0 &&
    ceilingCents<=ABSOLUTE_MAX_SIGNED_TX_USD*100 &&
    price!==null &&
    price<=ceilingCents;
  const ownerCheck={
    id:'owner_ceiling',
    title:'Server-controlled single-purchase ceiling',
    detail:'A server-owned limit applies in addition to user-entered budgets; it is not enforced on-chain or by an external Kite CLI.',
    passed:pass,
  };
  const reasons=pass?base.reasons:[...base.reasons,ownerCheck.title];
  return {
    ...base,checks:[...base.checks,ownerCheck],
    verdict:reasons.length>0?'BLOCK':'REVIEW',reasons,
  };
}
