import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, pool, polarLivePurchases } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createLiveCheckout, refreshLiveCheckout, type liveApi } from "./polar-live";
import { liveCustomerId, type LivePlan } from "./polar-live-policy";
import { LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";
import { manualMonthlyState } from "./manual-monthly";

test("concurrent switches/resumes never create two payable sessions; expiry must come from Polar", async () => {
  const users: string[] = [];
  try {
    for (const plan of ["monthly", "six_month"] as const) {
      const other: LivePlan = plan === "monthly" ? "six_month" : "monthly";
      const userId = `isolated-checkout-switch-${randomUUID()}`;
      users.push(userId);
      const id = randomUUID();
      const expiresAt = new Date(Date.now() + 3600_000);
      await db.insert(polarLivePurchases).values({
        userId, plan, checkoutId: id, checkoutUrl: `https://polar.sh/checkout/${id}`,
        status: "pending", expiresAt, monthlyOrdinal: plan === "monthly" ? 1 : null,
      });
      let creates = 0, unavailable = false;
      const sessions = new Map<string, {
        id: string; external_customer_id: string; product_id: string;
        status: string; expires_at: string; url: string; metadata: Record<string, string>;
      }>([[id, {
        id, external_customer_id: liveCustomerId(userId), product_id: LIVE_COURSE_PRODUCTS[plan],
        status: "open", expires_at: expiresAt.toISOString(),
        url: `https://polar.sh/checkout/${id}`, metadata: {} as Record<string, string>,
      }]]);
      const fake = {
        products: { get: async (productId: string) => ({
          is_archived: false, is_recurring: false,
          prices: [{ amount_type: "fixed", price_currency: "usd",
            price_amount: productId === LIVE_COURSE_PRODUCTS.monthly ? 2900 : 14900 }],
        }) },
        checkouts: {
          get: async (checkoutId: string) => {
            if (unavailable) throw new Error("mock provider outage");
            return sessions.get(checkoutId)!;
          },
          create: async (body: { products: string[]; metadata: Record<string, string> }) => {
            creates++;
            const checkoutId = randomUUID();
            const session = {
              id: checkoutId, external_customer_id: liveCustomerId(userId),
              product_id: body.products[0]!, status: "open", expires_at: expiresAt.toISOString(),
              url: `https://polar.sh/checkout/${checkoutId}`, metadata: body.metadata,
            };
            sessions.set(checkoutId, session);
            return session;
          },
        },
        orders: { list: async () => ({ items: [] }) },
      } as unknown as ReturnType<typeof liveApi>;
      const attempts = await Promise.allSettled([
        createLiveCheckout(userId, "unused@test.invalid", other, fake),
        createLiveCheckout(userId, "unused@test.invalid", plan, fake),
        refreshLiveCheckout(userId, id, fake),
        createLiveCheckout(userId, "unused@test.invalid", other, fake),
      ]);
      assert.equal(attempts[0]!.status, "rejected");
      assert.equal(attempts[3]!.status, "rejected");
      for (const index of [1, 2]) {
        const result = attempts[index]!;
        assert.equal(result.status, "fulfilled");
        if (result.status === "fulfilled") assert.equal(result.value.id, id);
      }
      assert.equal(creates, 0, "switching must not create a second payable checkout");
      await assert.rejects(refreshLiveCheckout("another-account", id, fake), { status: 404 });
      unavailable = true;
      await assert.rejects(createLiveCheckout(userId, "unused@test.invalid", other, fake), { status: 502 });
      assert.equal(creates, 0);
      unavailable = false;

      // Even when local and provider expiry timestamps are past, an open
      // provider status keeps the block: a clock cannot retire a checkout.
      const past = new Date(Date.now() - 1000);
      sessions.get(id)!.expires_at = past.toISOString();
      await db.update(polarLivePurchases).set({ expiresAt: past }).where(eq(polarLivePurchases.checkoutId, id));
      await assert.rejects(createLiveCheckout(userId, "unused@test.invalid", other, fake), { status: 409 });
      assert.equal((await refreshLiveCheckout(userId, id, fake)).checkoutUrl, null);
      assert.equal(creates, 0);
      const rows = await db.select().from(polarLivePurchases).where(eq(polarLivePurchases.userId, userId));
      const state = manualMonthlyState(rows);
      assert.equal(state.pendingCheckoutPlan, plan);
      assert.equal(state.pendingCheckoutExpiresAt, past.toISOString());
      assert.equal(state.monthlyPaymentCount, 0);

      sessions.get(id)!.status = "expired";
      const staleResume = await refreshLiveCheckout(userId, id, fake);
      assert.equal(staleResume.status, "expired");
      assert.equal(staleResume.checkoutUrl, null);
      assert.equal(creates, 0, "a stale resume is read-only, not a new purchase");
      const switches = await Promise.allSettled([
        createLiveCheckout(userId, "unused@test.invalid", other, fake),
        createLiveCheckout(userId, "unused@test.invalid", plan, fake),
        refreshLiveCheckout(userId, id, fake),
      ]);
      assert.ok(switches.some(r => r.status === "fulfilled" && r.value.id !== id));
      assert.equal(creates, 1, "after confirmed expiry only one new checkout wins the account lock");
      const finalRows = await db.select().from(polarLivePurchases).where(eq(polarLivePurchases.userId, userId));
      assert.equal(finalRows.filter(r => r.status === "pending" || r.status === "creating").length, 1);
      assert.equal(manualMonthlyState(finalRows).monthlyPaymentCount, 0, "unpaid attempts never consume the six-payment count");
    }
  } finally {
    for (const userId of users) await db.delete(polarLivePurchases).where(eq(polarLivePurchases.userId, userId));
    await pool.end();
  }
});
