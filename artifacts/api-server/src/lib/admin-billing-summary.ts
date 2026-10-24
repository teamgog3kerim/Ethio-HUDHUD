import type { LivePurchase } from "@workspace/db";
import { courseTrial } from "./billing-policy";
import { selectedCoursePlan } from "./billing-selection";
import { LIVE_VERIFICATION_TTL } from "./polar-live-policy";
import { hasLiveBillingHistory } from "./polar-live-portal";

type Input = {
  rows: LivePurchase[];
  trialStartedAt: Date | null;
  preferences: unknown;
  complimentary: boolean;
  complimentaryExpiresAt: Date | null;
  role: string;
  suspended: boolean;
};

// Read-only admin snapshot. Never call billingStatus here: listing users must
// neither start their trials nor create provider sessions or paid entitlements.
export function adminBillingSummary(input: Input, now = new Date()) {
  const rows = [...input.rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const active = rows.filter(r => r.status === "paid" && r.verifiedAt && r.accessUntil && r.accessUntil > now
    && (!r.monthlyPeriodStart || r.monthlyPeriodStart <= now))
    .sort((a, b) => b.accessUntil!.getTime() - a.accessUntil!.getTime())[0];
  const trial = input.trialStartedAt ? courseTrial(input.trialStartedAt, now) : null;
  const verified = rows.filter(r => r.verifiedAt).sort((a, b) => b.verifiedAt!.getTime() - a.verifiedAt!.getTime())[0];
  const pending = rows.some(r => r.status === "creating" || r.status === "pending");
  const history = rows.some(hasLiveBillingHistory);
  const accessPlan = input.complimentary ? "complimentary" as const
    : active?.plan === "monthly" ? "monthly" as const
    : active?.plan === "six_month" ? "six_month" as const : "free" as const;
  const billingState = input.suspended ? "suspended" as const
    : input.role === "admin" || input.role === "owner" ? "admin" as const
    : input.complimentary ? "complimentary" as const
    : active?.plan === "monthly" ? "paid_monthly" as const
    : active?.plan === "six_month" ? "paid_six_month" as const
    : pending ? "payment_pending" as const
    : rows[0]?.status === "refunded" ? "refunded" as const
    : history ? "paid_expired" as const
    : trial?.state === "active" ? "trial" as const
    : trial ? "trial_expired" as const : "not_started" as const;
  const lastVerification = active?.verifiedAt ?? verified?.verifiedAt ?? null;
  return {
    accessPlan,
    accessExpiresAt: (input.complimentary ? input.complimentaryExpiresAt : active?.accessUntil)?.toISOString() ?? null,
    billingState,
    trialStartedAt: trial?.startedAt ?? null,
    trialEndsAt: trial?.endsAt ?? null,
    monthlyPaymentCount: rows.filter(r => r.plan === "monthly" && r.monthlyPaidAt).length,
    selectedPlan: selectedCoursePlan(input.preferences),
    lastPaymentVerifiedAt: lastVerification?.toISOString() ?? null,
    billingVerificationStale: !!lastVerification && now.getTime() - lastVerification.getTime() >= LIVE_VERIFICATION_TTL,
    billingHistory: rows.slice(0, 10).map(r => ({
      id: r.id, plan: r.plan as "monthly" | "six_month", status: r.status,
      priceUsd: r.plan === "monthly" ? 29 : 149, checkoutId: r.checkoutId,
      createdAt: r.createdAt.toISOString(), verifiedAt: r.verifiedAt?.toISOString() ?? null,
      accessStartsAt: r.monthlyPeriodStart?.toISOString() ?? null,
      accessUntil: r.accessUntil?.toISOString() ?? null, paidUntil: r.paidUntil?.toISOString() ?? null,
    })),
  };
}
