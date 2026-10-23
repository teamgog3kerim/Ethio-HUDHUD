import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { db, pool, polarLiveEvents } from "@workspace/db";
import { eq } from "drizzle-orm";
import { storeLiveReceipt } from "./polar-live-webhook";
import { LIVE_COURSE_PRODUCTS, type LiveReceipt } from "./polar-live-webhook-policy";

test("durable live inbox deduplicates concurrent deliveries and rejects conflicting reuse", async () => {
  const id = `test-live-receipt-${randomUUID()}`;
  const fixture: LiveReceipt = {
    id, type: "order.paid", resourceId: randomUUID(),
    checkoutId: randomUUID(), subscriptionId: null,
    productId: LIVE_COURSE_PRODUCTS.six_month,
    bodyHash: createHash("sha256").update(id).digest("hex"), state: "pending",
  };
  try {
    await Promise.all([storeLiveReceipt(fixture), storeLiveReceipt(fixture), storeLiveReceipt(fixture)]);
    const rows = await db.select().from(polarLiveEvents).where(eq(polarLiveEvents.id, id));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].state, "pending");
    assert.equal(rows[0].attempts, 0);
    assert.equal(rows[0].processedAt, null);
    await assert.rejects(storeLiveReceipt({ ...fixture, bodyHash: "changed" }), { status: 409 });
    const [unchanged] = await db.select().from(polarLiveEvents).where(eq(polarLiveEvents.id, id));
    assert.equal(unchanged.bodyHash, fixture.bodyHash);
  } finally {
    // Delete only the exact isolated test receipt, never real provider events.
    await db.delete(polarLiveEvents).where(eq(polarLiveEvents.id, id));
    await pool.end();
  }
});
