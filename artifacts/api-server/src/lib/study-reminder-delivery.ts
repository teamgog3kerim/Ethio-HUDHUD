import webpush from "web-push";
import { db, learners, renewalDevices, renewalDeliveries } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { billingStatus } from "./billing-status";
import { deliveryConfig } from "./renewal-delivery";
import { deviceBindingKey } from "./renewal-policy";
import { hash, studyReminderPolicy, type StudyPreferences } from "./study-reminder-policy";
import { localDate } from "./study-schedule";
import { logger } from "./logger";

export function isStudyDevice(subscription: unknown): boolean {
  return !!subscription && typeof subscription === "object" && "kind" in subscription && subscription.kind === "study";
}

export async function studyStatus(userId: string, now = new Date()) {
  const [learner] = await db.select().from(learners).where(eq(learners.identity, `clerk:${userId}`));
  const status = studyReminderPolicy((learner?.preferences ?? {}) as StudyPreferences, now);
  if (status.due && learner) {
    const access = await billingStatus(learner.id, userId);
    status.due = access.fullCourseAccess;
  }
  return status;
}

export async function studyDeviceStatus(id: string, userId: string) {
  const [device] = await db.select().from(renewalDevices).where(and(eq(renewalDevices.id, id), eq(renewalDevices.userId, userId)));
  const own = device && isStudyDevice(device.subscription) ? device : undefined;
  const [last] = own ? await db.select().from(renewalDeliveries).where(and(
    eq(renewalDeliveries.deviceId, id), eq(renewalDeliveries.userId, userId),
  )).orderBy(desc(renewalDeliveries.createdAt)).limit(1) : [];
  return {
    ...deliveryConfig(), enabled: own?.state === "enabled",
    bindingKey: own?.state === "enabled" ? deviceBindingKey(userId, id) : null,
    state: own?.state ?? "disabled", nextAt: null,
    lastResult: last?.state === "sending" && Date.now() - last.createdAt.getTime() > 300000 ? "unknown" : last?.state ?? null,
  };
}

export async function dispatchStudyDevice(id: string, now = new Date()) {
  await db.transaction(async tx => {
    await tx.execute(sql`select id from renewal_devices where id = ${id} for no key update`);
    const [device] = await tx.select().from(renewalDevices).where(eq(renewalDevices.id, id));
    if (!device || device.state !== "enabled" || device.channel !== "web" || !isStudyDevice(device.subscription)) return;
    if (!deliveryConfig().webConfigured) return;
    const status = await studyStatus(device.userId, now);
    if (!status.due || !status.occurrenceKey) return;
    // Snoozing explicitly permits one later reminder; timeouts never auto-resend.
    const period = `study-${hash(`${device.userId}:${id}:${status.occurrenceKey}:${status.snoozedUntil ?? ""}`)}`;
    const [claim] = await db.insert(renewalDeliveries).values({
      id: period, deviceId: id, learnerId: device.learnerId, userId: device.userId, state: "sending",
    }).onConflictDoNothing().returning();
    if (!claim) return;
    try {
      await webpush.sendNotification(device.subscription as webpush.PushSubscription, JSON.stringify({
        kind: "study", title: "هدهد — حان وقت التعلّم",
        body: "جلسة الأمهرية بانتظارك. اضغط لمتابعة برنامجك.",
        binding: deviceBindingKey(device.userId, id), period,
        date: localDate(now, status.timezone), timezone: status.timezone,
        expiresAt: new Date(now.getTime() + 15 * 60000).toISOString(),
      }), { TTL: 900, timeout: 10000 });
      await db.update(renewalDeliveries).set({ state: "accepted" }).where(eq(renewalDeliveries.id, period));
    } catch (error) {
      const code = (error as { statusCode?: number }).statusCode;
      await db.update(renewalDeliveries).set({ state: code ? "failed" : "unknown" }).where(eq(renewalDeliveries.id, period));
      if (code === 404 || code === 410) await tx.update(renewalDevices).set({ state: "expired", updatedAt: new Date() }).where(eq(renewalDevices.id, id));
    }
  });
}

export async function runStudyDelivery(now = new Date()) {
  if (!deliveryConfig().webConfigured) return;
  const devices = await db.select({ id: renewalDevices.id }).from(renewalDevices).where(and(
    eq(renewalDevices.state, "enabled"), eq(renewalDevices.channel, "web"),
    sql`${renewalDevices.subscription}->>'kind' = 'study'`,
  ));
  for (const device of devices) await dispatchStudyDevice(device.id, now);
}

export function startStudyDelivery() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runStudyDelivery(); }
    catch { logger.error("Study reminder delivery unavailable; in-app reminders remain available"); }
    finally { running = false; }
  };
  void tick();
  setInterval(() => void tick(), 60000).unref();
}
