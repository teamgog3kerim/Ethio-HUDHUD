import test from "node:test";
import assert from "node:assert/strict";
import { assertSandboxProduct, paidOrderEligible, safeSandboxUrl, sandboxCustomerId, sixMonthsAfter } from "./polar-sandbox-policy";

const monthly = {
  is_archived: false, is_recurring: true, recurring_interval: "month", recurring_interval_count: 1,
  prices: [{ amount_type: "fixed", price_amount: 2900, price_currency: "usd" }],
};
const oneTime = { is_archived: false, is_recurring: false, prices: [{ amount_type: "fixed", price_amount: 14900, price_currency: "usd" }] };
test("Polar offers must be exactly $29 monthly or $149 once, never recurring six months", () => {
  assert.doesNotThrow(() => assertSandboxProduct("monthly", monthly));
  assert.doesNotThrow(() => assertSandboxProduct("six_month", oneTime));
  assert.throws(() => assertSandboxProduct("six_month", { ...oneTime, is_recurring: true }));
  assert.throws(() => assertSandboxProduct("monthly", { ...monthly, recurring_interval_count: 6 }));
  assert.throws(() => assertSandboxProduct("monthly", { ...monthly, is_archived: true }));
  assert.throws(() => assertSandboxProduct("monthly", { ...monthly, prices: [...monthly.prices, ...monthly.prices] }));
  assert.throws(() => assertSandboxProduct("monthly", { ...monthly, prices: [{ ...monthly.prices[0], price_amount: 290 }] }));
});
test("Calendar access lasts six months with month-end and leap-year clamping", () => {
  assert.equal(sixMonthsAfter("2026-08-31T09:30:00.000Z").toISOString(), "2027-02-28T09:30:00.000Z");
  assert.equal(sixMonthsAfter("2027-08-31T09:30:00.000Z").toISOString(), "2028-02-29T09:30:00.000Z");
  assert.equal(sixMonthsAfter("2026-10-22T09:30:00.000Z").toISOString(), "2027-04-22T09:30:00.000Z");
});
test("Sandbox URLs reject live, lookalike, HTTP and embedded credential redirects", () => {
  assert.equal(safeSandboxUrl("https://sandbox.polar.sh/checkout/abc"), "https://sandbox.polar.sh/checkout/abc");
  for (const url of ["https://polar.sh/checkout", "https://sandbox.polar.sh.evil.example/", "https://evil.sandbox.polar.sh/", "http://sandbox.polar.sh/", "https://user:pass@sandbox.polar.sh/"]) {
    assert.throws(() => safeSandboxUrl(url));
  }
  assert.notEqual(sandboxCustomerId("a"), sandboxCustomerId("b"));
  assert.match(sandboxCustomerId("a"), /^hudhud-sandbox:/);
});
test("Only verified full-price paid orders qualify; refunds and arbitrary products fail closed", () => {
  const order = { paid: true, status: "paid", subtotal_amount: 14900, discount_amount: 0, refunded_amount: 0, currency: "usd", product_id: "course" };
  assert.equal(paidOrderEligible(order, "course", "six_month"), true);
  for (const change of [{ paid: false }, { status: "pending" }, { refunded_amount: 100 }, { discount_amount: 100 }, { currency: "eur" }, { subtotal_amount: 0 }, { product_id: "other" }]) {
    assert.equal(paidOrderEligible({ ...order, ...change }, "course", "six_month"), false);
  }
});
