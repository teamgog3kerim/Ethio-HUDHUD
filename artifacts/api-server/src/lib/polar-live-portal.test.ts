import test from "node:test";
import assert from "node:assert/strict";
import { hasLiveBillingHistory, openLiveBillingPortal } from "./polar-live-portal";
import { liveCustomerId } from "./polar-live-policy";
import { LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";

const userId = "isolated-portal-policy";
const row = () => ({
  checkoutId: "checkout-fixture", verifiedAt: new Date(), status: "paid",
  paidUntil: new Date(), monthlyPaidAt: null, plan: "six_month",
});
const checkout = () => ({
  customer_id: "customer-fixture",
  external_customer_id: liveCustomerId(userId),
  product_id: LIVE_COURSE_PRODUCTS.six_month,
});

test("unfinished and expired unpaid checkouts are not billing history", () => {
  for (const status of ["creating", "pending", "expired", "failed"]) {
    assert.equal(hasLiveBillingHistory({ ...row(), status, paidUntil: null }), false);
  }
  assert.equal(hasLiveBillingHistory({ ...row(), verifiedAt: null }), false);
  assert.equal(hasLiveBillingHistory({ ...row(), checkoutId: null }), false);
});

test("expired paid coverage and refunded purchases retain receipts", () => {
  assert.equal(hasLiveBillingHistory({ ...row(), status: "expired" }), true);
  assert.equal(hasLiveBillingHistory({ ...row(), status: "refunded", paidUntil: null }), true);
  assert.equal(hasLiveBillingHistory({ ...row(), plan: "monthly", status: "expired", paidUntil: null, monthlyPaidAt: new Date() }), true);
});

test("unpaid buyers never trigger provider requests or customer creation", async () => {
  const api = {
    getCheckout: async () => { throw new Error("unexpected checkout request"); },
    createSession: async () => { throw new Error("unexpected session creation"); },
  };
  await assert.rejects(openLiveBillingPortal(userId, undefined, api), { status: 409 });
  await assert.rejects(openLiveBillingPortal(userId, { ...row(), status: "pending", paidUntil: null }, api), { status: 409 });
});

test("portal uses actual customer from verified account-owned checkout", async () => {
  let calls = 0;
  const result = await openLiveBillingPortal(userId, row(), {
    getCheckout: async id => { assert.equal(id, row().checkoutId); return checkout(); },
    createSession: async input => {
      calls++;
      assert.deepEqual(input, { customer_id: "customer-fixture", return_url: "https://ethiohudhud.com/choose-plan" });
      return { customer_portal_url: "https://polar.sh/customer-portal/fixture" };
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.environment, "live");
});

test("missing customer and wrong ownership/product cannot open sessions", async () => {
  for (const [change, status] of [
    [{ customer_id: null }, 409],
    [{ external_customer_id: liveCustomerId("another-account") }, 403],
    [{ product_id: LIVE_COURSE_PRODUCTS.monthly }, 403],
  ] as const) {
    await assert.rejects(openLiveBillingPortal(userId, row(), {
      getCheckout: async () => ({ ...checkout(), ...change }),
      createSession: async () => { throw new Error("must not create a session"); },
    }), { status });
  }
});

test("untrusted portal redirects are rejected", async () => {
  await assert.rejects(openLiveBillingPortal(userId, row(), {
    getCheckout: async () => checkout(),
    createSession: async () => ({ customer_portal_url: "https://attacker.example/portal" }),
  }), /Unexpected live Polar URL/);
});
