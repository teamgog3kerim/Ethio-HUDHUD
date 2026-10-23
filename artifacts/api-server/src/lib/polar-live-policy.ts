import { sixMonthsAfter, type SandboxPlan } from "./polar-sandbox-policy";
import { LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";

export type LivePlan = SandboxPlan;
export const LIVE_CHECKOUT_LAUNCH_APPROVED = false;
// A webhook-triggered cancellation alone is not a provider-enforced six-payment
// cap. Keep monthly purchases blocked even if six-month checkout is launched.
export const LIVE_MONTHLY_CAP_APPROVED = false;
export const LIVE_VERIFICATION_TTL = 5 * 60_000;
export const liveCustomerId = (userId: string) => `hudhud-live:${userId}`;
export function safeLiveUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "polar.sh" || url.username || url.password || url.port) {
    throw new Error("Unexpected live Polar URL");
  }
  return value;
}

type Order = {
  id: string; created_at: string; paid: boolean; status: string;
  currency: string; subtotal_amount: number; discount_amount: number;
  refunded_amount: number; total_amount: number; product_id: string | null;
  customer: { external_id?: string | null };
};
type Subscription = {
  product_id: string; customer: { external_id?: string | null };
  status: string; current_period_start: string; current_period_end: string;
  ended_at?: string | null; cancel_at_period_end: boolean;
};
export function livePaymentState(input: {
  userId: string; plan: LivePlan; checkoutStatus: string;
  orders: Order[]; subscription: Subscription | null; now?: Date;
}) {
  const { plan, userId, subscription: sub } = input;
  const now = input.now ?? new Date();
  const product = LIVE_COURSE_PRODUCTS[plan];
  if (sub && (plan !== "monthly" || sub.product_id !== product || sub.customer.external_id !== liveCustomerId(userId))) {
    throw new Error("Live subscription ownership mismatch");
  }
  const own = input.orders.filter(o => o.product_id === product && o.customer.external_id === liveCustomerId(userId));
  const amount = plan === "monthly" ? 2900 : 14900;
  const valid = (o: Order) => o.paid && ["paid", "partially_refunded"].includes(o.status)
    && o.currency === "usd" && o.discount_amount === 0 && o.subtotal_amount === amount
    && o.total_amount >= amount && o.refunded_amount < o.total_amount;
  const paid = own.filter(valid);
  let status = ["expired", "failed"].includes(input.checkoutStatus) ? input.checkoutStatus : "pending";
  let paidUntil: Date | null = null;
  let accessUntil: Date | null = null;
  if (plan === "six_month" && own.length) {
    // Anchor to the original order; a refund/replay must never restart access.
    const first = [...own].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]!;
    if (valid(first)) { paidUntil = sixMonthsAfter(first.created_at); accessUntil = paidUntil; status = "paid"; }
    else if (first.refunded_amount > 0) status = "refunded";
  } else if (sub) {
    const start = new Date(sub.current_period_start).getTime();
    const end = new Date(sub.current_period_end);
    const current = own.filter(o => new Date(o.created_at).getTime() >= start - 60_000);
    const fullyRefundedCurrent = current.some(o => o.refunded_amount > 0 && o.refunded_amount >= o.total_amount);
    if (!sub.ended_at && ["active", "canceled"].includes(sub.status) && current.some(valid) && !fullyRefundedCurrent) {
      paidUntil = end; accessUntil = end; status = "paid";
    } else if (sub.status === "past_due" && !sub.ended_at && !fullyRefundedCurrent && paid.length) {
      // Grace is anchored to a previously paid period, never to each retry.
      const prior = paid.filter(o => new Date(o.created_at).getTime() < start - 60_000);
      const currentPaid = current.some(valid);
      if (prior.length || currentPaid) {
        // Polar can keep the previous billing-period bounds while a renewal
        // fails, or advance to the unpaid period. Support both representations.
        paidUntil = currentPaid ? end : new Date(sub.current_period_start);
        accessUntil = new Date(paidUntil.getTime() + 3 * 86_400_000);
        status = "paid";
      }
    } else status = fullyRefundedCurrent ? "refunded" : ["canceled", "unpaid", "past_due", "paused"].includes(sub.status) ? "expired" : "pending";
  } else if (own.some(o => o.refunded_amount > 0)) status = "refunded";
  if (accessUntil && (!Number.isFinite(accessUntil.getTime()) || accessUntil <= now)) {
    accessUntil = null;
    if (status === "paid") status = "expired";
  }
  return { status, paidUntil, accessUntil, paidCycles: own.filter(o => o.paid && o.currency === "usd" && o.subtotal_amount === amount).length };
}
