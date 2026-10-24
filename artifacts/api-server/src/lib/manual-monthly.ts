import type { LivePurchase } from "@workspace/db";

export const MONTHLY_PAYMENT_LIMIT = 6;
export const MONTHLY_RENEWAL_WINDOW_MS = 4 * 86_400_000;

export function oneMonthAfter(value: Date) {
  const result = new Date(value);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return result;
}

type Row = Pick<LivePurchase, "plan" | "status" | "paidUntil" | "accessUntil"
  | "monthlyPaidAt" | "checkoutId" | "expiresAt" | "subscriptionId" | "subscriptionStatus">;

export function manualMonthlyState(rows: Row[], now = new Date()) {
  const completed = rows.filter(r => r.plan === "monthly" && r.monthlyPaidAt);
  const monthlyPaymentCount = completed.length;
  const paidThrough = completed.filter(r => r.status === "paid" && r.paidUntil && r.accessUntil && r.accessUntil > now)
    .sort((a, b) => b.paidUntil!.getTime() - a.paidUntil!.getTime())[0]?.paidUntil ?? null;
  const nextPurchase = paidThrough ? new Date(paidThrough.getTime() - MONTHLY_RENEWAL_WINDOW_MS) : null;
  const unresolved = rows.filter(r => r.status === "creating" || r.status === "pending");
  const pending = unresolved[0];
  const resumable = unresolved.find(r => r.status === "pending" && r.checkoutId && r.expiresAt && r.expiresAt > now);
  const otherAccess = rows.some(r => (r.plan === "six_month" && r.status === "paid" && r.accessUntil && r.accessUntil > now)
    || (r.subscriptionId && r.subscriptionStatus !== "canceled"));
  return {
    monthlyPaymentCount, monthlyPaymentLimit: MONTHLY_PAYMENT_LIMIT,
    monthlyCanPurchase: monthlyPaymentCount < MONTHLY_PAYMENT_LIMIT && !otherAccess && !unresolved.length
      && (!nextPurchase || nextPurchase <= now),
    monthlyNextPurchaseAt: monthlyPaymentCount < MONTHLY_PAYMENT_LIMIT && !otherAccess && nextPurchase && nextPurchase > now
      ? nextPurchase.toISOString() : null,
    monthlyPaidThrough: paidThrough?.toISOString() ?? null,
    resumablePlan: resumable?.plan as "monthly" | "six_month" | undefined ?? null,
    pendingCheckoutPlan: pending?.plan as "monthly" | "six_month" | undefined ?? null,
    pendingCheckoutId: pending?.checkoutId ?? null,
    pendingCheckoutExpiresAt: pending?.expiresAt?.toISOString() ?? null,
  };
}

export function monthlyPeriod(paidAt: Date, rows: Row[]) {
  // Early renewals start after existing paid coverage. A return after a gap
  // starts at the new payment, not at an old expired boundary.
  const last = rows.filter(r => r.plan === "monthly" && r.monthlyPaidAt && r.status === "paid" && r.paidUntil)
    .reduce((date, r) => r.paidUntil! > date ? r.paidUntil! : date, paidAt);
  const start = new Date(last);
  return { start, end: oneMonthAfter(start) };
}

export function assertLiveProduct(plan: "monthly" | "six_month", product: {
  is_archived: boolean; is_recurring: boolean;
  prices: { is_archived?: boolean; amount_type: string; price_amount?: number; price_currency?: string }[];
}) {
  const prices = product.prices.filter(p => !p.is_archived);
  if (product.is_archived || product.is_recurring || prices.length !== 1
    || prices[0]!.amount_type !== "fixed" || prices[0]!.price_currency !== "usd"
    || prices[0]!.price_amount !== (plan === "monthly" ? 2900 : 14900)) {
    throw new Error("Live course products must be exact-price one-time purchases");
  }
}
