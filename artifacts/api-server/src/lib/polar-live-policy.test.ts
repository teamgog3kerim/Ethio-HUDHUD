import { test } from "node:test";
import assert from "node:assert/strict";
import { livePaymentState, liveCustomerId, safeLiveUrl, LIVE_CHECKOUT_LAUNCH_APPROVED, LIVE_MONTHLY_CAP_APPROVED, LIVE_MANUAL_MONTHLY_APPROVED } from "./polar-live-policy";
import { LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";

const userId = "isolated-live-policy-fixture";
const now = new Date("2026-11-05T00:00:00Z");
const order = (plan: "monthly" | "six_month" = "six_month") => ({
  id: "isolated-order", created_at: "2026-10-01T00:00:00Z", paid: true, status: "paid",
  currency: "usd", subtotal_amount: plan === "monthly" ? 2900 : 14900,
  total_amount: plan === "monthly" ? 2900 : 14900, discount_amount: 0, refunded_amount: 0,
  product_id: LIVE_COURSE_PRODUCTS[plan], customer: { external_id: liveCustomerId(userId) },
});
const subscription = () => ({
  product_id: LIVE_COURSE_PRODUCTS.monthly, customer: { external_id: liveCustomerId(userId) },
  status: "active", current_period_start: "2026-10-01T00:00:00Z", current_period_end: "2026-11-01T00:00:00Z",
  ended_at: null, cancel_at_period_end: false,
});
const state = (orders = [order()], extra: Partial<Parameters<typeof livePaymentState>[0]> = {}) =>
  livePaymentState({ userId, plan: "six_month", orders, checkoutStatus: "succeeded", subscription: null, now, ...extra });
test("both one-time offers are approved but automatic monthly billing remains off", () => {
  assert.equal(LIVE_CHECKOUT_LAUNCH_APPROVED, true);
  assert.equal(LIVE_MONTHLY_CAP_APPROVED, false);
  assert.equal(LIVE_MANUAL_MONTHLY_APPROVED, true);
  // Purchase tests inject a provider. Never create a real payable test session.
});
test("a successful redirect without a paid order grants nothing", () => {
  assert.equal(state([]).accessUntil, null);
  assert.equal(state([ { ...order(), paid: false } ]).accessUntil, null);
});
test("one-time purchase grants six calendar months, not 180 days", () => {
  const result = state();
  assert.equal(result.status, "paid");
  assert.equal(result.accessUntil?.toISOString(), "2027-04-01T00:00:00.000Z");
  assert.equal(state([{ ...order(), created_at: "2026-08-31T12:00:00Z" }]).accessUntil?.toISOString(), "2027-02-28T12:00:00.000Z");
});
test("full refunds revoke and partial refunds retain the original period", () => {
  assert.equal(state([{ ...order(), refunded_amount: 14900, status: "refunded" }]).status, "refunded");
  assert.equal(state([{ ...order(), refunded_amount: 1000, status: "partially_refunded" }]).accessUntil?.toISOString(), "2027-04-01T00:00:00.000Z");
  const first = { ...order(), refunded_amount: 14900, status: "refunded" };
  assert.equal(state([first, { ...order(), id: "replayed-later-order", created_at: "2026-10-05T00:00:00Z" }]).accessUntil, null);
});
test("wrong account, currency, product, price, coupons and disputes cannot grant access", () => {
  const invalid = [
    { ...order(), customer: { external_id: "hudhud-sandbox:someone" } },
    { ...order(), product_id: LIVE_COURSE_PRODUCTS.monthly },
    { ...order(), subtotal_amount: 1 }, { ...order(), currency: "eur" },
    { ...order(), discount_amount: 100 }, { ...order(), status: "disputed" },
  ];
  for (const row of invalid) assert.equal(state([row]).accessUntil, null);
});
test("manual monthly payment covers one calendar month without a subscription", () => {
  const result = state([order("monthly")], { plan: "monthly", now: new Date("2026-10-15T00:00:00Z") });
  assert.equal(result.accessUntil?.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(result.completedOrderId, "isolated-order");
});
test("old manual payments expire without invented renewal or grace", () => {
  assert.equal(state([order("monthly")], { plan: "monthly", now: new Date("2026-11-01T00:00:00Z") }).accessUntil, null);
  assert.equal(state([], { plan: "monthly" }).accessUntil, null);
});
test("manual refunds revoke access without erasing completed payment proof", () => {
  const result = state([{ ...order("monthly"), refunded_amount: 2900, status: "refunded" }], { plan: "monthly" });
  assert.equal(result.status, "refunded");
  assert.equal(result.accessUntil, null);
  assert.equal(result.completedOrderId, "isolated-order");
  assert.equal(state([{ ...order("monthly"), refunded_amount: 100, status: "partially_refunded" }], { plan: "monthly", now: new Date("2026-10-15T00:00:00Z") }).status, "paid");
});
test("recurring subscriptions cannot masquerade as approved manual payments", () => {
  assert.throws(() => state([order("monthly")], { plan: "monthly", subscription: subscription() }));
  assert.throws(() => state([order("monthly")], { plan: "monthly", subscription: { ...subscription(), customer: { external_id: "another-account" } } }));
});
test("expiry and replay do not extend a six-month payment", () => {
  assert.equal(state([order()], { now: new Date("2027-04-01T00:00:00Z") }).accessUntil, null);
  assert.equal(state([order(), order()]).accessUntil?.toISOString(), state([order()]).accessUntil?.toISOString());
});
test("live redirects reject sandbox, credentials, nonstandard ports, HTTP and lookalike hosts", () => {
  assert.equal(safeLiveUrl("https://polar.sh/checkout/test"), "https://polar.sh/checkout/test");
  for (const url of ["https://sandbox.polar.sh/x", "https://polar.sh.evil.example/x", "http://polar.sh/x", "https://user:pass@polar.sh/x", "https://polar.sh:444/x"]) assert.throws(() => safeLiveUrl(url));
});
