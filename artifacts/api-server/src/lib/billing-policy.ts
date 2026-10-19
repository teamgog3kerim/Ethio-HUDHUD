const DAY = 86_400_000;
export const TRIAL_DAYS = 2;
export const RENEWAL_NOTICE_DAYS = 4;

// Deliberately not a configurable activation switch: live access enforcement
// requires the deferred, verified Polar checkout/webhook implementation.
export const BILLING_CONFIGURED = false;
export const COURSE_OFFERS = [
  { id: "monthly" as const, priceUsd: 29, durationMonths: 6, billing: "monthly" as const, sixMonthTotalUsd: 174, savingsUsd: 0, savingsPercent: 0 },
  { id: "six_month" as const, priceUsd: 149, durationMonths: 6, billing: "one_time" as const, sixMonthTotalUsd: 149, savingsUsd: 25, savingsPercent: 14.4 },
];

export function courseTrial(startedAt: Date, now = new Date()) {
  const endsAt = new Date(startedAt.getTime() + TRIAL_DAYS * DAY);
  const remaining = endsAt.getTime() - now.getTime();
  return {
    state: remaining > 0 ? "active" as const : "expired" as const,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    daysRemaining: Math.max(0, Math.min(TRIAL_DAYS, Math.ceil(remaining / DAY))),
  };
}

// A window, not a once-daily job: a learner returning after the four-day mark
// still sees the reminder. One-time access gets expiry wording, never renewal.
export function accessReminder(
  expiresAt: string | null,
  kind: "complimentary_expiring" | "renewal_due" | "course_expiring",
  now = new Date(),
) {
  if (!expiresAt) return null;
  const remaining = Date.parse(expiresAt) - now.getTime();
  if (!Number.isFinite(remaining) || remaining <= 0 || remaining > RENEWAL_NOTICE_DAYS * DAY) return null;
  return { kind, expiresAt, daysRemaining: Math.ceil(remaining / DAY), delivery: "in_app" as const };
}
