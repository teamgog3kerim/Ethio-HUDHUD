import type { BillingStatus, ReminderDeviceStatus } from '@workspace/api-client-react';

// Contract-shaped examples only; server tests own policy calculations.
export function status(isGuest = true): BillingStatus {
  return {
    plan: 'free', selectedPlan: null, configured: false, isGuest,
    message: 'الدفع عبر Polar مؤجّل. التعلم مفتوح ولا يتم تحصيل رسوم.',
    source: 'none', accessExpiresAt: null, dailyAiLimit: 10,
    enforcementEnabled: false, fullCourseAccess: true,
    trial: { state: 'expired', startedAt: '2026-10-01T12:00:00Z', endsAt: '2026-10-03T12:00:00Z', daysRemaining: 0 },
    offers: [
      { id: 'monthly', priceUsd: 29, durationMonths: 6, billing: 'monthly', sixMonthTotalUsd: 174, savingsUsd: 0, savingsPercent: 0 },
      { id: 'six_month', priceUsd: 149, durationMonths: 6, billing: 'one_time', sixMonthTotalUsd: 149, savingsUsd: 25, savingsPercent: 14.4 },
    ],
    reminder: null,
  };
}

// No subscriptions or actual notification/provider calls in browser doubles.
export const reminderDevice: ReminderDeviceStatus = {
  webConfigured: false, nativeConfigured: true, publicKey: null,
  bindingKey: null, enabled: false, state: 'disabled', nextAt: null, lastResult: null,
};
