import { db, polarLivePurchases } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LIVE_VERIFICATION_TTL } from "./polar-live-policy";
import { assertLiveAccount, refreshLiveCheckout } from "./polar-live";
import { manualMonthlyState } from "./manual-monthly";
import { hasLiveBillingHistory } from "./polar-live-portal";

export async function liveAccess(userId: string | null, verify = refreshLiveCheckout) {
  const none = { hasLivePurchase: false, paymentVerificationPending: false, paidPlan: null, paidPeriodEndsAt: null, cancelAtPeriodEnd: false, subscriptionStatus: null, accessUntil: null } as const;
  if (!userId) return { ...none, ...manualMonthlyState([]), monthlyCanPurchase: false };
  await assertLiveAccount(userId);
  let rows = await db.select().from(polarLivePurchases).where(eq(polarLivePurchases.userId, userId));
  if (!rows.length) return { ...none, ...manualMonthlyState([]) };
  let verificationFailed = false;
  for (const row of rows) {
    if (!row.checkoutId || (row.verifiedAt && Date.now() - row.verifiedAt.getTime() < LIVE_VERIFICATION_TTL)) continue;
    try { await verify(userId, row.checkoutId); }
    catch { verificationFailed = true; }
  }
  rows = await db.select().from(polarLivePurchases).where(eq(polarLivePurchases.userId, userId));
  const paid = rows.filter(r => r.status === "paid" && r.accessUntil && r.accessUntil > new Date()
    && (!r.monthlyPeriodStart || r.monthlyPeriodStart <= new Date())
    && r.verifiedAt && Date.now() - r.verifiedAt.getTime() < LIVE_VERIFICATION_TTL)
    .sort((a, b) => b.accessUntil!.getTime() - a.accessUntil!.getTime())[0];
  return {
    ...manualMonthlyState(rows),
    ...(verificationFailed ? { monthlyCanPurchase: false } : {}),
    hasLivePurchase: rows.some(hasLiveBillingHistory),
    paymentVerificationPending: !paid && (verificationFailed || rows.some(r => r.status === "creating" || r.status === "pending")),
    paidPlan: paid?.plan as "monthly" | "six_month" | undefined ?? null,
    paidPeriodEndsAt: paid?.paidUntil?.toISOString() ?? null,
    cancelAtPeriodEnd: paid?.cancelAtPeriodEnd ?? false,
    subscriptionStatus: paid?.subscriptionStatus ?? null,
    accessUntil: paid?.accessUntil?.toISOString() ?? null,
  };
}
