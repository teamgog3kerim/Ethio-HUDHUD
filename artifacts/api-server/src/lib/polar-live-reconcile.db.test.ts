import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, pool, polarLivePurchases } from "@workspace/db";
import { eq } from "drizzle-orm";
import { attachLiveCheckout, refreshLiveCheckout, type liveApi } from "./polar-live";
import { liveCustomerId } from "./polar-live-policy";
import { LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";

test("current provider reads enforce ownership, recover an intent, and cannot replay a refund into access", async () => {
  const userId = `isolated-live-reconcile-${randomUUID()}`;
  const checkoutId = randomUUID();
  const productId = LIVE_COURSE_PRODUCTS.six_month;
  const [intent] = await db.insert(polarLivePurchases).values({
    userId, plan: "six_month", nextCheckAt: new Date(Date.now() + 86_400_000),
  }).returning();
  let providerReads = 0;
  let refund = 0;
  const checkout = {
    id: checkoutId, external_customer_id: liveCustomerId(userId), product_id: productId,
    metadata: { hudhud_intent: intent!.id }, url: "https://polar.sh/checkout/isolated-fixture",
    expires_at: new Date(Date.now() + 3600_000).toISOString(), status: "succeeded",
  };
  const created = new Date(Date.now() - 60_000).toISOString();
  const fake = {
    checkouts: { get: async () => { providerReads++; return checkout; } },
    orders: { list: async () => ({ items: [{
      id: randomUUID(), created_at: created, paid: true, status: refund >= 14900 ? "refunded" : "paid",
      currency: "usd", subtotal_amount: 14900, total_amount: 14900,
      discount_amount: 0, refunded_amount: refund, product_id: productId,
      customer: { external_id: liveCustomerId(userId) }, subscription_id: null,
    }] }) },
  } as unknown as ReturnType<typeof liveApi>;
  try {
    const impostor = { ...checkout, external_customer_id: liveCustomerId("another-account") } as Parameters<typeof attachLiveCheckout>[0];
    assert.equal(await attachLiveCheckout(impostor), null);
    const attached = await attachLiveCheckout(checkout as Parameters<typeof attachLiveCheckout>[0]);
    assert.equal(attached?.id, intent!.id);
    assert.equal(attached?.checkoutId, checkoutId);
    await assert.rejects(refreshLiveCheckout("not-the-owner", checkoutId, fake), (e: { status: number }) => e.status === 404);
    assert.equal(providerReads, 0, "ownership rejection happens before contacting the provider");
    const paid = await refreshLiveCheckout(userId, checkoutId, fake);
    assert.equal(paid.status, "paid");
    const originalUntil = paid.accessUntil;
    refund = 1000;
    assert.equal((await refreshLiveCheckout(userId, checkoutId, fake)).accessUntil, originalUntil);
    refund = 14900;
    const refunded = await refreshLiveCheckout(userId, checkoutId, fake);
    assert.equal(refunded.status, "refunded");
    assert.equal(refunded.accessUntil, null);
    // A duplicate old order.paid event merely asks for the CURRENT state again.
    assert.equal((await refreshLiveCheckout(userId, checkoutId, fake)).accessUntil, null);
    assert.ok(providerReads >= 4);
  } finally {
    await db.delete(polarLivePurchases).where(eq(polarLivePurchases.userId, userId));
    await pool.end();
  }
});
