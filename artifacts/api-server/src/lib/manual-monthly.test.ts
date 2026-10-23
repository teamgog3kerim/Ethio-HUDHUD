import { test } from "node:test";
import assert from "node:assert/strict";
import { manualMonthlyState, monthlyPeriod, oneMonthAfter, assertLiveProduct } from "./manual-monthly";

const now = new Date("2026-10-23T12:00:00Z");
const row = (extra: Partial<Parameters<typeof manualMonthlyState>[0][number]> = {}) => ({
  plan: "monthly", status: "paid", paidUntil: new Date("2026-10-27T12:00:00Z"),
  accessUntil: new Date("2026-10-27T12:00:00Z"), monthlyPaidAt: new Date("2026-09-27T12:00:00Z"),
  checkoutId: "fixture", expiresAt: new Date("2026-10-28T12:00:00Z"),
  subscriptionId: null, subscriptionStatus: null, ...extra,
});
test("one-month periods preserve UTC time and clamp month ends and leap years", () => {
  assert.equal(oneMonthAfter(new Date("2026-01-31T23:59:00Z")).toISOString(), "2026-02-28T23:59:00.000Z");
  assert.equal(oneMonthAfter(new Date("2028-01-31T23:59:00Z")).toISOString(), "2028-02-29T23:59:00.000Z");
  assert.equal(oneMonthAfter(new Date("2026-12-15T10:00:00Z")).toISOString(), "2027-01-15T10:00:00.000Z");
});
test("renewal opens exactly four days before coverage ends", () => {
  assert.equal(manualMonthlyState([row()], new Date(now.getTime() - 1)).monthlyCanPurchase, false);
  assert.equal(manualMonthlyState([row()], now).monthlyCanPurchase, true);
  assert.equal(manualMonthlyState([row()], now).monthlyPaymentCount, 1);
});
test("early renewal extends after existing coverage; a late return starts at payment", () => {
  const early = monthlyPeriod(now, [row()]);
  assert.equal(early.start.toISOString(), "2026-10-27T12:00:00.000Z");
  assert.equal(early.end.toISOString(), "2026-11-27T12:00:00.000Z");
  const late = monthlyPeriod(new Date("2026-12-01T12:00:00Z"), [row({ status: "expired" })]);
  assert.equal(late.start.toISOString(), "2026-12-01T12:00:00.000Z");
});
test("prepaid next month prevents buying another overlapping month", () => {
  const future = row({ paidUntil: new Date("2026-11-27T12:00:00Z"), accessUntil: new Date("2026-11-27T12:00:00Z") });
  const result = manualMonthlyState([row(), future], now);
  assert.equal(result.monthlyCanPurchase, false);
  assert.equal(result.monthlyPaidThrough, "2026-11-27T12:00:00.000Z");
  assert.equal(result.monthlyNextPurchaseAt, "2026-11-23T12:00:00.000Z");
});
test("six completed payments including refunds block a seventh; unpaid attempts never count", () => {
  const six = [...Array(6)].map((_, i) => row({ status: i === 0 ? "refunded" : "expired", accessUntil: null }));
  assert.equal(manualMonthlyState(six, now).monthlyCanPurchase, false);
  assert.equal(manualMonthlyState(six, now).monthlyPaymentCount, 6);
  const failed = [...Array(10)].map(() => row({ status: "failed", monthlyPaidAt: null, accessUntil: null }));
  assert.equal(manualMonthlyState(failed, now).monthlyPaymentCount, 0);
  assert.equal(manualMonthlyState(failed, now).monthlyCanPurchase, true);
});
test("a pending same-plan checkout is resumable but not a reason to create another", () => {
  const pending = row({ status: "pending", monthlyPaidAt: null, accessUntil: null });
  const state = manualMonthlyState([pending], now);
  assert.equal(state.resumablePlan, "monthly");
  assert.equal(state.monthlyCanPurchase, false);
  assert.equal(manualMonthlyState([{ ...pending, checkoutId: null, status: "creating" }], now).resumablePlan, null);
});
test("active six-month coverage blocks purchasing a monthly period", () => {
  assert.equal(manualMonthlyState([row({ plan: "six_month", monthlyPaidAt: null })], now).monthlyCanPurchase, false);
});
test("live product validation rejects recurring, wrong price/currency, and extra prices", () => {
  const p = { is_archived: false, is_recurring: false, prices: [{ amount_type: "fixed", price_currency: "usd", price_amount: 2900 }] };
  assert.doesNotThrow(() => assertLiveProduct("monthly", p));
  assert.doesNotThrow(() => assertLiveProduct("six_month", { ...p, prices: [{ ...p.prices[0]!, price_amount: 14900 }] }));
  for (const bad of [{ ...p, is_recurring: true }, { ...p, is_archived: true }, { ...p, prices: [...p.prices, ...p.prices] },
    { ...p, prices: [{ ...p.prices[0]!, price_currency: "eur" }] }, { ...p, prices: [{ ...p.prices[0]!, price_amount: 1 }] }]) {
    assert.throws(() => assertLiveProduct("monthly", bad));
  }
});
