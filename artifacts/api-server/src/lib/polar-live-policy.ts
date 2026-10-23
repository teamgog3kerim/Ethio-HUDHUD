import { sixMonthsAfter, type SandboxPlan } from "./polar-sandbox-policy";
import { LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";
import { oneMonthAfter } from "./manual-monthly";

export type LivePlan = SandboxPlan;
// Owner approved both one-time plans, including manual monthly renewal.
export const LIVE_CHECKOUT_LAUNCH_APPROVED = true;
// A webhook-triggered cancellation alone is not a provider-enforced six-payment
// cap. Keep monthly purchases blocked even if six-month checkout is launched.
export const LIVE_MONTHLY_CAP_APPROVED = false;
export const LIVE_MANUAL_MONTHLY_APPROVED = true;
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
  monthlyPeriod?: { start: Date; end: Date };
}) {
  const { plan, userId, subscription: sub } = input;
  const now = input.now ?? new Date();
  const product = LIVE_COURSE_PRODUCTS[plan];
  // Neither live offer may silently become an automatically recurring plan.
  if (sub) throw new Error("Recurring subscriptions are not approved live course offers");
  const own = input.orders.filter(o => o.product_id === product && o.customer.external_id === liveCustomerId(userId));
  const amount = plan === "monthly" ? 2900 : 14900;
  const valid = (o: Order) => o.paid && ["paid", "partially_refunded"].includes(o.status)
    && o.currency === "usd" && o.discount_amount === 0 && o.subtotal_amount === amount
    && o.total_amount >= amount && o.refunded_amount < o.total_amount;
  let status = ["expired", "failed"].includes(input.checkoutStatus) ? input.checkoutStatus : "pending";
  let paidUntil: Date | null = null;
  let accessUntil: Date | null = null;
  let completedOrderId: string | null = null;
  let completedAt: Date | null = null;
  let accessStartsAt: Date | null = null;
  if (plan === "six_month" && own.length) {
    // Anchor to the original order; a refund/replay must never restart access.
    const first = [...own].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]!;
    if (valid(first)) { paidUntil = sixMonthsAfter(first.created_at); accessUntil = paidUntil; status = "paid"; }
    else if (first.refunded_amount > 0) status = "refunded";
  } else if (plan === "monthly" && own.length) {
    const first = [...own].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]!;
    const recognized = first.currency === "usd" && first.subtotal_amount === 2900
      && first.discount_amount === 0 && first.total_amount >= 2900
      && (valid(first) || (first.refunded_amount > 0 && first.status === "refunded"));
    if (own.length > 1 && own.filter(o => valid(o) || o.refunded_amount > 0).length > 1) {
      throw new Error("Multiple orders for one manual monthly checkout require review");
    }
    if (recognized) {
      completedOrderId = first.id; completedAt = new Date(first.created_at);
      if (!Number.isFinite(completedAt.getTime())) throw new Error("Invalid paid order date");
      accessStartsAt = input.monthlyPeriod?.start ?? completedAt;
      paidUntil = input.monthlyPeriod?.end ?? oneMonthAfter(accessStartsAt);
      if (valid(first)) { accessUntil = paidUntil; status = "paid"; }
      else status = "refunded";
    }
  } else if (own.some(o => o.refunded_amount > 0)) status = "refunded";
  if (accessUntil && (!Number.isFinite(accessUntil.getTime()) || accessUntil <= now)) {
    accessUntil = null;
    if (status === "paid") status = "expired";
  }
  return { status, paidUntil, accessUntil, accessStartsAt, completedOrderId, completedAt,
    paidCycles: own.filter(o => o.paid && o.currency === "usd" && o.subtotal_amount === amount).length };
}
