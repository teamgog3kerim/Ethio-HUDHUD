import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, learners, courseTrials } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { GetBillingStatusResponse } from "@workspace/api-zod";
import { billingStatus } from "./billing-status";

test("trial persists, signup inherits only the guest clock, and pilot access remains open", {
  skip: process.env.RUN_BILLING_DB_TESTS !== "1",
}, async () => {
  const guestId = randomUUID();
  const userId = `billing-test-${randomUUID()}`;
  const created = await db.insert(learners).values([
    { identity: `guest:${guestId}` }, { identity: `clerk:${userId}` },
  ]).returning();
  const guest = created.find(l => l.identity.startsWith("guest:"))!;
  const account = created.find(l => l.identity.startsWith("clerk:"))!;
  try {
    const initial = GetBillingStatusResponse.parse(await billingStatus(guest.id, null));
    assert.equal(initial.trial.state, "active");
    assert.equal(initial.isGuest, true);
    assert.equal(initial.configured, false);
    assert.equal(initial.enforcementEnabled, false);
    assert.equal(initial.fullCourseAccess, true);
    assert.equal(initial.plan, "free");
    assert.equal(initial.reminder, null);
    assert.deepEqual(initial.offers.map(o => o.priceUsd), [29, 149]);
    const again = await billingStatus(guest.id, null);
    assert.equal(again.trial.startedAt, initial.trial.startedAt.toISOString());
    const expiredStart = new Date(Date.now() - 3 * 86_400_000);
    await db.update(courseTrials).set({ startedAt: expiredStart }).where(eq(courseTrials.learnerId, guest.id));
    const expired = await billingStatus(guest.id, null);
    assert.equal(expired.trial.state, "expired");
    assert.equal(expired.fullCourseAccess, true);
    await billingStatus(account.id, userId);
    const inherited = await billingStatus(account.id, userId, guestId);
    assert.equal(inherited.isGuest, false);
    assert.equal(inherited.trial.startedAt, expiredStart.toISOString());
    const earlierStart = new Date(Date.now() - 5 * 86_400_000);
    await db.update(courseTrials).set({ startedAt: earlierStart }).where(eq(courseTrials.learnerId, account.id));
    await Promise.all(Array.from({ length: 4 }, () => billingStatus(account.id, userId, guestId)));
    assert.equal((await billingStatus(account.id, userId)).trial.startedAt, earlierStart.toISOString());
    const [unchanged] = await db.select().from(learners).where(eq(learners.id, account.id));
    assert.deepEqual(unchanged?.preferences, {});
  } finally {
    await db.delete(learners).where(inArray(learners.id, created.map(l => l.id)));
  }
});
