import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, pool, polarLivePurchases } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { createLiveCheckout, refreshLiveCheckout, attachLiveCheckout, type liveApi } from "./polar-live";
import { liveCustomerId } from "./polar-live-policy";
import { liveAccess } from "./polar-live-access";
import { LIVE_COURSE_PRODUCTS } from "./polar-live-webhook-policy";
import { oneMonthAfter } from "./manual-monthly";
import { verifiedReminder } from "./renewal-delivery";

// All provider behavior is injected. No real checkout or charge is created.
test("manual monthly purchases serialize, renew safely, preserve refunds, and never create payment seven", async () => {
  const users = [...Array(5)].map(() => `isolated-manual-monthly-${randomUUID()}`);
  const checkouts = new Map<string, any>();
  const orders = new Map<string, any>();
  let creates = 0;
  let timeoutNext = false;
  const fake = {
    products: { get: async (id: string) => ({
      id, is_archived: false, is_recurring: false,
      prices: [{ amount_type: "fixed", price_currency: "usd", price_amount: id === LIVE_COURSE_PRODUCTS.monthly ? 2900 : 14900 }],
    }) },
    checkouts: {
      create: async (body: any) => {
        creates++;
        assert.deepEqual(body.products, [LIVE_COURSE_PRODUCTS.monthly]);
        assert.equal(body.allow_discount_codes, false);
        assert.equal(body.allow_trial, false);
        const value = {
          id: randomUUID(), external_customer_id: body.external_customer_id, product_id: body.products[0],
          metadata: body.metadata, url: "https://polar.sh/checkout/local-fixture",
          expires_at: new Date(Date.now() + 3600_000).toISOString(), status: "open",
        };
        checkouts.set(value.id, value);
        if (timeoutNext) { timeoutNext = false; throw new Error("simulated lost provider response"); }
        return value;
      },
      get: async (id: string) => {
        assert.ok(checkouts.has(id), "only isolated fixture checkouts may be read");
        return checkouts.get(id);
      },
    },
    orders: { list: async ({ checkout_id }: { checkout_id: string }) => ({ items: orders.has(checkout_id) ? [orders.get(checkout_id)] : [] }) },
  } as unknown as ReturnType<typeof liveApi>;
  const create = (u: string) => createLiveCheckout(u, "fixture@example.invalid", "monthly", fake);
  const refresh = (u: string, id: string) => refreshLiveCheckout(u, id, fake);
  const account = (u: string) => liveAccess(u, (owner, id) => refresh(owner, id));
  const pay = (u: string, id: string, date: Date) => {
    checkouts.get(id).status = "succeeded";
    orders.set(id, {
      id: randomUUID(), created_at: date.toISOString(), paid: true, status: "paid", currency: "usd",
      subtotal_amount: 2900, discount_amount: 0, total_amount: 2900, refunded_amount: 0,
      product_id: LIVE_COURSE_PRODUCTS.monthly, customer: { external_id: liveCustomerId(u) }, subscription_id: null,
    });
  };
  try {
    // Parallel clicks can return the same session or reject the in-flight one,
    // but can never create two sessions.
    const first = await Promise.allSettled([create(users[0]!), create(users[0]!)]);
    const success = first.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof create>>> => r.status === "fulfilled");
    assert.ok(success.length);
    const id = success[0]!.value.id;
    assert.equal(creates, 1);
    assert.ok(success.every(r => r.value.id === id));
    assert.equal((await create(users[0]!)).id, id);
    assert.equal(creates, 1);
    assert.equal((await account(users[0]!)).monthlyPaymentCount, 0);
    await assert.rejects(refresh(users[1]!, id), (e: { status: number }) => e.status === 404);
    pay(users[0]!, id, new Date(Date.now() - 60_000));
    const paid = await refresh(users[0]!, id);
    assert.equal(paid.status, "paid");
    assert.equal((await account(users[0]!)).paidPlan, "monthly");
    await assert.rejects(create(users[0]!), (e: { status: number }) => e.status === 409);
    assert.equal(creates, 1, "renewal outside last four days creates nothing");

    // A separate account is three days before its first expiry.
    const earlyId = (await create(users[1]!)).id;
    const oldPayment = new Date();
    oldPayment.setUTCMonth(oldPayment.getUTCMonth() - 1);
    oldPayment.setUTCDate(oldPayment.getUTCDate() + 3);
    pay(users[1]!, earlyId, oldPayment);
    const earlyPaid = await refresh(users[1]!, earlyId);
    assert.equal((await account(users[1]!)).monthlyCanPurchase, true);
    const renewalId = (await create(users[1]!)).id;
    pay(users[1]!, renewalId, new Date());
    const renewed = await refresh(users[1]!, renewalId);
    assert.equal(renewed.accessStartsAt, earlyPaid.accessUntil);
    assert.equal(renewed.accessUntil, oneMonthAfter(new Date(earlyPaid.accessUntil!)).toISOString());
    const snapshot = await account(users[1]!);
    assert.equal(snapshot.monthlyPaymentCount, 2);
    assert.equal(snapshot.monthlyCanPurchase, false);
    assert.equal(snapshot.monthlyPaidThrough, renewed.accessUntil);
    assert.equal((await verifiedReminder(users[1]!))?.expiresAt, renewed.accessUntil,
      "reminders use prepaid coverage end, not the already-covered current expiry");
    const before = creates;
    await assert.rejects(create(users[1]!), (e: { status: number }) => e.status === 409);
    assert.equal(creates, before);
    // Current-period full refund must not make future prepaid access active now.
    orders.get(earlyId).status = "refunded"; orders.get(earlyId).refunded_amount = 2900;
    await refresh(users[1]!, earlyId);
    assert.equal((await account(users[1]!)).paidPlan, null);
    assert.equal((await account(users[1]!)).monthlyPaymentCount, 2);
    orders.get(renewalId).status = "partially_refunded"; orders.get(renewalId).refunded_amount = 100;
    assert.equal((await refresh(users[1]!, renewalId)).accessUntil, renewed.accessUntil);
    assert.equal((await refresh(users[1]!, earlyId)).status, "refunded", "replayed delivery reads current refund state");

    // Seed five genuine-looking, expired fixture periods; race two sixth clicks.
    for (let i = 0; i < 5; i++) {
      const c = { id: randomUUID(), product_id: LIVE_COURSE_PRODUCTS.monthly, external_customer_id: liveCustomerId(users[2]!),
        status: "succeeded", metadata: {}, url: "https://polar.sh/checkout/local-fixture",
        expires_at: new Date(Date.now() - 86_400_000).toISOString() };
      checkouts.set(c.id, c);
      const date = new Date(Date.now() - (240 - i * 31) * 86_400_000);
      pay(users[2]!, c.id, date);
      await db.insert(polarLivePurchases).values({
        userId: users[2]!, plan: "monthly", checkoutId: c.id, status: "expired",
        paidUntil: oneMonthAfter(date), monthlyPaidAt: date, monthlyPeriodStart: date,
        monthlyOrderId: orders.get(c.id).id, monthlyOrdinal: i + 1, verifiedAt: new Date(),
        nextCheckAt: new Date(Date.now() + 86_400_000),
      });
    }
    const countBefore = creates;
    const sixths = await Promise.allSettled([create(users[2]!), create(users[2]!)]);
    const sixth = sixths.find((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof create>>> => r.status === "fulfilled");
    assert.ok(sixth);
    assert.equal(creates, countBefore + 1);
    pay(users[2]!, sixth.value.id, new Date());
    await refresh(users[2]!, sixth.value.id);
    assert.equal((await account(users[2]!)).monthlyPaymentCount, 6);
    assert.equal((await account(users[2]!)).monthlyCanPurchase, false);
    assert.equal((await verifiedReminder(users[2]!))?.kind, "course_expiring",
      "payment six must not send a seventh-renewal reminder");
    const finalCreates = creates;
    await assert.rejects(create(users[2]!), (e: { status: number }) => e.status === 409);
    assert.equal(creates, finalCreates, "the seventh payment is blocked before provider creation");
    // Refunds do not reset the cap.
    orders.get(sixth.value.id).status = "refunded"; orders.get(sixth.value.id).refunded_amount = 2900;
    await refresh(users[2]!, sixth.value.id);
    await assert.rejects(create(users[2]!), (e: { status: number }) => e.status === 409);
    assert.equal((await account(users[2]!)).monthlyPaymentCount, 6);

    // A lost response is recovered by intent metadata, never blindly re-created.
    timeoutNext = true;
    const timeoutCreates = creates;
    await assert.rejects(create(users[3]!), (e: { status: number }) => e.status === 502);
    await assert.rejects(create(users[3]!), (e: { status: number }) => e.status === 409);
    assert.equal(creates, timeoutCreates + 1);
    const orphan = [...checkouts.values()].find(c => c.external_customer_id === liveCustomerId(users[3]!));
    assert.ok(orphan);
    await attachLiveCheckout(orphan);
    assert.equal((await create(users[3]!)).id, orphan.id);
    assert.equal(creates, timeoutCreates + 1);
    assert.equal((await account(users[3]!)).monthlyPaymentCount, 0);

    // An abandoned expired checkout does not consume a monthly payment slot.
    const abandoned = (await create(users[4]!)).id;
    checkouts.get(abandoned).status = "expired";
    await refresh(users[4]!, abandoned);
    assert.equal((await account(users[4]!)).monthlyPaymentCount, 0);
    assert.notEqual((await create(users[4]!)).id, abandoned);
  } finally {
    await db.delete(polarLivePurchases).where(inArray(polarLivePurchases.userId, users));
    await pool.end();
  }
});
