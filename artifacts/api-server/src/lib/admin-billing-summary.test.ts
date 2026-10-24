import test from "node:test";
import assert from "node:assert/strict";
import type { LivePurchase } from "@workspace/db";
import { adminBillingSummary } from "./admin-billing-summary";

const now = new Date("2026-10-24T12:00:00Z");
const future = new Date("2026-11-24T12:00:00Z");
const base = () => ({
  rows: [] as LivePurchase[], trialStartedAt: null as Date | null, preferences: {},
  complimentary: false, complimentaryExpiresAt: null as Date | null,
  role: "learner", suspended: false,
});
const purchase = (change: Partial<LivePurchase> = {}): LivePurchase => ({
  id: "record-fixture", userId: "isolated-admin-billing", plan: "monthly",
  checkoutId: "checkout-fixture", checkoutUrl: null, status: "paid", expiresAt: null,
  subscriptionId: null, subscriptionStatus: null, cancelAtPeriodEnd: false,
  paidUntil: future, accessUntil: future, verifiedAt: now, nextCheckAt: future,
  attempts: 0, monthlyOrderId: "order-fixture", monthlyPaidAt: now,
  monthlyPeriodStart: now, monthlyOrdinal: 1, createdAt: now, ...change,
});

test("listing an unstarted user does not manufacture a trial", () => {
  const result = adminBillingSummary(base(), now);
  assert.equal(result.billingState, "not_started");
  assert.equal(result.trialStartedAt, null);
  assert.equal(result.accessPlan, "free");
});
test("trial timing uses exactly 48h and expired trials remain expired", () => {
  const started = new Date(now.getTime() - 47 * 3600_000);
  const input = { ...base(), trialStartedAt: started };
  assert.equal(adminBillingSummary(input, now).billingState, "trial");
  assert.equal(adminBillingSummary(input, new Date(started.getTime() + 48 * 3600_000)).billingState, "trial_expired");
});
test("real paid plans and manual count are recorded, without treating preference as payment", () => {
  assert.equal(adminBillingSummary({ ...base(), preferences: { coursePlan: "six_month" } }, now).accessPlan, "free");
  const monthly = adminBillingSummary({ ...base(), rows: [purchase()] }, now);
  assert.equal(monthly.accessPlan, "monthly");
  assert.equal(monthly.monthlyPaymentCount, 1);
  assert.equal(monthly.accessExpiresAt, future.toISOString());
  const six = adminBillingSummary({ ...base(), rows: [purchase({ plan: "six_month", monthlyPaidAt: null })] }, now);
  assert.equal(six.billingState, "paid_six_month");
  assert.equal(six.monthlyPaymentCount, 0);
  assert.equal(six.billingHistory[0]?.priceUsd, 149);
});
test("pending, refunds and expired purchases do not become paid access", () => {
  for (const [status, expected] of [["pending", "payment_pending"], ["refunded", "refunded"], ["expired", "paid_expired"]]) {
    const result = adminBillingSummary({ ...base(), rows: [purchase({ status, accessUntil: null })] }, now);
    assert.equal(result.billingState, expected);
    assert.equal(result.accessPlan, "free");
  }
});
test("future prepaid periods do not unlock access early and stale verification is explicit", () => {
  assert.equal(adminBillingSummary({ ...base(), rows: [purchase({ monthlyPeriodStart: future })] }, now).accessPlan, "free");
  const stale = adminBillingSummary({ ...base(), rows: [purchase({ verifiedAt: new Date(now.getTime() - 3600_000) })] }, now);
  assert.equal(stale.accessPlan, "monthly", "admin reports stored coverage, not a newly verified entitlement");
  assert.equal(stale.billingVerificationStale, true);
});
test("grants and protected roles remain distinct from money collected", () => {
  assert.equal(adminBillingSummary({ ...base(), complimentary: true }, now).billingState, "complimentary");
  assert.equal(adminBillingSummary({ ...base(), role: "owner" }, now).billingState, "admin");
  assert.equal(adminBillingSummary({ ...base(), role: "owner", suspended: true }, now).billingState, "suspended");
});
