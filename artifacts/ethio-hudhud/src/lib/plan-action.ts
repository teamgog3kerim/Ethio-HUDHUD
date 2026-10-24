import type { BillingStatus } from '@workspace/api-client-react';
import type { PlanChoice } from '@/lib/plan-choice';

export type PlanActionKind = 'choose' | 'signup' | 'loading' | 'trial' | 'sandbox' | 'live' | 'portal' | 'status' | 'refresh' | 'unavailable';

export interface PlanAction {
  kind: PlanActionKind;
  paid: 'monthly' | 'six_month' | null;
  portalSecondary: boolean;
  hasPortal: boolean;
  livePurchase: boolean;
  pendingRaw: boolean;
  resumeMonthly: boolean;
  monthlyAllowed: boolean;
  monthlyOff: boolean;
  capReached: boolean;
  count: number | null;
  limit: number | null;
}

// Single source of truth for the one main action. Server billing fields decide eligibility.
export function planAction(bd: BillingStatus | undefined, selected: PlanChoice | null, signedIn: boolean, stale = false, now = Date.now()): PlanAction {
  const paid = selected === 'monthly' || selected === 'six_month' ? selected : null;
  const resumeMonthly = bd?.resumablePlan === 'monthly';
  const count = typeof bd?.monthlyPaymentCount === 'number' ? bd.monthlyPaymentCount : null;
  const limit = typeof bd?.monthlyPaymentLimit === 'number' ? bd.monthlyPaymentLimit : null;
  const capReached = count !== null && limit !== null && count >= limit;
  const monthlyAllowed = count !== null && limit !== null && !capReached && (bd?.monthlyCanPurchase === true || resumeMonthly);
  const livePurchase = (!!bd?.paidPlan && bd.fullCourseAccess === true)
    || !!(bd?.monthlyPaidThrough && Date.parse(bd.monthlyPaidThrough) > now);
  const hasPortal = bd?.hasLivePurchase === true;
  const pendingRaw = bd?.paymentVerificationPending === true || !!bd?.pendingCheckoutPlan;
  const pending = pendingRaw;
  const hasOffer = !!paid && bd?.offers.some(offer => offer.id === paid);
  const live = !!paid && hasOffer && bd?.liveCheckoutEnabled === true && (paid === 'six_month' || (bd?.liveMonthlyCheckoutEnabled === true && monthlyAllowed));
  const paidBlock = livePurchase && !(paid === 'monthly' && live);
  const sandbox = !!paid && hasOffer && bd?.sandboxCheckoutEnabled === true && bd?.liveCheckoutEnabled !== true;
  const monthlyOff = paid === 'monthly' && bd?.liveMonthlyCheckoutEnabled !== true;
  let kind: PlanActionKind;
  const portalOrStatus: PlanActionKind = hasPortal ? 'portal' : 'status';
  if (!signedIn) kind = selected ? 'signup' : 'choose';
  else if (!bd) kind = 'loading';
  else if (stale) kind = 'refresh';
  else if (!selected) kind = hasPortal ? 'portal' : pendingRaw ? 'status' : 'choose';
  else if (selected === 'trial') kind = bd.enforcementEnabled && bd.trial.state === 'expired' ? hasPortal ? 'portal' : 'choose' : 'trial';
  else if (pending) kind = portalOrStatus;
  else if (live && !paidBlock) kind = 'live';
  else if (sandbox) kind = 'sandbox';
  else if (hasPortal) kind = 'portal';
  else kind = 'unavailable';
  return { kind, paid, hasPortal, livePurchase, pendingRaw, resumeMonthly, monthlyAllowed, monthlyOff, capReached, count, limit,
    portalSecondary: hasPortal && kind === 'live' };
}
