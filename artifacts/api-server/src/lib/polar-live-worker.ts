import { db, polarLiveEvents, polarLivePurchases, appAccounts } from "@workspace/db";
import { and, asc, eq, lte, or, sql } from "drizzle-orm";
import { attachLiveCheckout, liveApi, liveCall, refreshLiveCheckout } from "./polar-live";
import { logger } from "./logger";

const retryAt = (attempts: number) => new Date(Date.now() + Math.min(3_600_000, 30_000 * 2 ** Math.min(attempts, 7)));

export async function reconcileLiveBilling() {
  if (!process.env.POLAR_LIVE_ACCESS_TOKEN) return;
  const api = liveApi();
  const events = await db.select().from(polarLiveEvents).where(and(
    eq(polarLiveEvents.state, "pending"), lte(polarLiveEvents.nextAttemptAt, new Date()),
  )).orderBy(asc(polarLiveEvents.nextAttemptAt)).limit(25);
  for (const event of events) {
    try {
      let checkoutId = event.checkoutId;
      if (!checkoutId && event.type.startsWith("order.")) {
        const order = await liveCall(() => api.orders.get(event.resourceId));
        checkoutId = order.checkout_id;
      }
      if (!checkoutId && event.subscriptionId) {
        checkoutId = (await liveCall(() => api.subscriptions.get(event.subscriptionId!))).checkout_id;
      }
      let [row] = await db.select().from(polarLivePurchases).where(or(
        checkoutId ? eq(polarLivePurchases.checkoutId, checkoutId) : sql`false`,
        event.subscriptionId ? eq(polarLivePurchases.subscriptionId, event.subscriptionId) : sql`false`,
      )).limit(1);
      if (!row && checkoutId) {
        const recovered = await attachLiveCheckout(await liveCall(() => api.checkouts.get(checkoutId!)));
        if (recovered) row = recovered;
      }
      if (!row?.checkoutId) throw new Error("Unmatched live purchase");
      const [account] = await db.select().from(appAccounts).where(eq(appAccounts.userId, row.userId));
      if (account?.deletedAt || account?.suspended) {
        await db.update(polarLiveEvents).set({ state: "ignored", processedAt: new Date() }).where(eq(polarLiveEvents.id, event.id));
        continue;
      }
      await refreshLiveCheckout(row.userId, row.checkoutId);
      await db.update(polarLiveEvents).set({ state: "processed", processedAt: new Date() }).where(eq(polarLiveEvents.id, event.id));
    } catch {
      await db.update(polarLiveEvents).set({
        attempts: sql`${polarLiveEvents.attempts} + 1`, nextAttemptAt: retryAt(event.attempts),
      }).where(and(eq(polarLiveEvents.id, event.id), eq(polarLiveEvents.state, "pending")));
      logger.warn({ provider: "polar_live" }, "Live receipt remains queued for retry");
    }
  }
  // Independent of webhook delivery: recover missing events and missed return
  // visits. Due times and retry counts survive autoscale restarts.
  const due = await db.select().from(polarLivePurchases).where(lte(polarLivePurchases.nextCheckAt, new Date()))
    .orderBy(asc(polarLivePurchases.nextCheckAt)).limit(25);
  for (const row of due) {
    const claimTime = new Date();
    try {
      const [account] = await db.select().from(appAccounts).where(eq(appAccounts.userId, row.userId));
      if (account?.deletedAt || account?.suspended) {
        await db.update(polarLivePurchases).set({ accessUntil: null, nextCheckAt: new Date(Date.now() + 86_400_000) })
          .where(eq(polarLivePurchases.id, row.id));
        continue;
      }
      if (row.checkoutId) await refreshLiveCheckout(row.userId, row.checkoutId);
      else {
        // Recover a checkout created just before a timeout/crash. Scoping the
        // provider list to this account and verifying the intent prevents email-
        // based identity matching or adoption of purchases from other accounts.
        const page = await liveCall(() => api.checkouts.list({ external_customer_id: `hudhud-live:${row.userId}`, limit: 100 }));
        const checkout = page.items.find(c => c.metadata?.hudhud_intent === row.id);
        if (!checkout) throw new Error("Checkout intent awaiting provider confirmation");
        const recovered = await attachLiveCheckout(checkout);
        if (!recovered?.checkoutId) throw new Error("Unmatched checkout intent");
        await refreshLiveCheckout(row.userId, recovered.checkoutId);
      }
    } catch {
      await db.update(polarLivePurchases).set({
        attempts: sql`${polarLivePurchases.attempts} + 1`, nextCheckAt: retryAt(row.attempts),
      }).where(and(eq(polarLivePurchases.id, row.id), lte(polarLivePurchases.nextCheckAt, claimTime)));
    }
  }
}
let running = false;
export async function kickLiveBilling() {
  if (running) return;
  running = true;
  try { await reconcileLiveBilling(); }
  catch { logger.warn({ provider: "polar_live" }, "Live billing reconciliation will retry"); }
  finally { running = false; }
}
export function startLiveBilling() {
  void kickLiveBilling();
  const timer = setInterval(() => void kickLiveBilling(), 60_000);
  timer.unref();
}
