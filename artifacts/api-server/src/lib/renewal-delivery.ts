import webpush from "web-push";
import { db, renewalDevices, renewalDeliveries, appAccounts } from "@workspace/db";
import { and, eq, desc, lte, sql } from "drizzle-orm";
import { getAccessState, getAppSettings } from "./app-settings";
import { logger } from "./logger";
import { deviceBindingKey, renewalPeriod, type VerifiedReminder } from "./renewal-policy";

export function deliveryConfig() {
  const { RENEWAL_VAPID_PUBLIC_KEY: publicKey, RENEWAL_VAPID_PRIVATE_KEY: privateKey, RENEWAL_VAPID_SUBJECT: subject } = process.env;
  let webConfigured = false;
  if (publicKey && privateKey && subject) {
    try { webpush.setVapidDetails(subject, publicKey, privateKey); webConfigured = true; }
    catch { /* Invalid setup must be shown as unavailable, never as enabled. */ }
  }
  return { webConfigured, nativeConfigured: true, publicKey: webConfigured ? publicKey! : null };
}

export async function verifiedReminder(userId: string): Promise<VerifiedReminder | null> {
  const [account] = await db.select().from(appAccounts).where(eq(appAccounts.userId, userId));
  if (account?.suspended || account?.deletedAt) return null;
  const access = await getAccessState(userId, await getAppSettings());
  return access.source === "admin_grant" && access.accessExpiresAt
    ? { kind: "complimentary_expiring", expiresAt: access.accessExpiresAt }
    : null;
}

export async function reminderDeviceStatus(id: string, userId: string) {
  const [device] = await db.select().from(renewalDevices).where(and(eq(renewalDevices.id, id), eq(renewalDevices.userId, userId)));
  const reminder = device?.state === "enabled" ? await verifiedReminder(userId) : null;
  const period = reminder ? renewalPeriod(`${userId}:${id}`, reminder) : null;
  const [last] = device ? await db.select().from(renewalDeliveries).where(and(eq(renewalDeliveries.deviceId, id), eq(renewalDeliveries.userId, userId))).orderBy(desc(renewalDeliveries.createdAt)).limit(1) : [];
  const [current] = period ? await db.select().from(renewalDeliveries).where(eq(renewalDeliveries.id, period.id)) : [];
  return {
    ...deliveryConfig(), enabled: device?.state === "enabled",
    bindingKey: device?.state === "enabled" ? deviceBindingKey(userId, id) : null,
    state: device?.state ?? "disabled",
    nextAt: period && !current ? period.at : null,
    lastResult: last?.state === "sending" && Date.now() - last.createdAt.getTime() > 300_000 ? "unknown" : last?.state ?? null,
  };
}

type Device = typeof renewalDevices.$inferSelect;
// A single transaction holds the device lock through dispatch: opt-out and
// account transfer cannot race an in-flight claim on another API instance.
export async function dispatchRenewalDevice(device: Device) {
  await db.transaction(async tx => {
    await tx.execute(sql`select id from renewal_devices where id = ${device.id} for no key update`);
    const [live] = await tx.select().from(renewalDevices).where(eq(renewalDevices.id, device.id));
    if (!live || live.state !== "enabled" || live.userId !== device.userId) return;
    const reminder = await verifiedReminder(live.userId);
    const period = reminder ? renewalPeriod(`${live.userId}:${live.id}`, reminder) : null;
    if (!period?.due) return;
    if (live.channel === "web" && !deliveryConfig().webConfigured) return;
    // Claim outside this transaction, so a crash after provider acceptance does
    // not resend. A timeout/crash is reported as unknown, not delivered.
    const [claim] = await db.insert(renewalDeliveries).values({ id: period.id, deviceId: live.id, learnerId: live.learnerId, userId: live.userId, state: "sending" }).onConflictDoNothing().returning();
    if (!claim) return;
    try {
      let receipt: string | null = null;
      if (live.channel === "web") {
        await webpush.sendNotification(live.subscription as webpush.PushSubscription, JSON.stringify({
          title: "هدهد — تذكير الوصول",
          body: "اقترب انتهاء الوصول المتاح لك. افتح التطبيق للتحقق من التفاصيل. لا يتم تحصيل رسوم تلقائيًا في المرحلة التجريبية.",
          binding: deviceBindingKey(live.userId, live.id), period: period.id, expiresAt: reminder!.expiresAt,
        }), { TTL: period.ttl, timeout: 10_000 });
      } else {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST", headers: { "Content-Type": "application/json", ...(process.env.EXPO_PUSH_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}` } : {}) },
          // Data-only: the native headless task validates persisted account
          // consent before presenting, including after an account switch.
          body: JSON.stringify({ to: live.address, _contentAvailable: true, priority: "normal", ttl: period.ttl, data: { type: "renewal", bindingKey: deviceBindingKey(live.userId, live.id), expiresAt: reminder!.expiresAt, period: period.id } }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error("Expo request not accepted");
        const result = await response.json() as { data?: { status: string; id?: string; details?: { error?: string } } };
        if (result.data?.status !== "ok" || !result.data.id) {
          if (result.data?.details?.error === "DeviceNotRegistered") await tx.update(renewalDevices).set({ state: "expired" }).where(eq(renewalDevices.id, live.id));
          await db.update(renewalDeliveries).set({ state: "failed" }).where(eq(renewalDeliveries.id, period.id));
          return;
        }
        receipt = result.data.id;
      }
      await db.update(renewalDeliveries).set({ state: "accepted", receipt }).where(eq(renewalDeliveries.id, period.id));
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await tx.update(renewalDevices).set({ state: "expired" }).where(eq(renewalDevices.id, live.id));
      await db.update(renewalDeliveries).set({ state: status ? "failed" : "unknown" }).where(eq(renewalDeliveries.id, period.id));
      // Do not log endpoints, tokens, payloads, or errors containing subscriptions.
      logger.warn({ status }, "Renewal dispatch was not confirmed; in-app reminder remains available");
    }
  });
}

export async function runRenewalDelivery() {
  const devices = await db.select().from(renewalDevices).where(eq(renewalDevices.state, "enabled"));
  for (const device of devices) await dispatchRenewalDevice(device);
  // Expo's ticket means accepted, not delivered. Resolve receipt errors too.
  const pending = await db.select().from(renewalDeliveries).where(and(eq(renewalDeliveries.state, "accepted"), sql`${renewalDeliveries.receipt} is not null`)).limit(100);
  if (!pending.length) return;
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST", headers: { "Content-Type": "application/json", ...(process.env.EXPO_PUSH_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify({ ids: pending.map(p => p.receipt) }), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return;
  const result = await response.json() as { data?: Record<string, { status: string; details?: { error?: string } }> };
  for (const item of pending) {
    const receipt = result.data?.[item.receipt!];
    if (!receipt) {
      if (Date.now() - item.createdAt.getTime() > 86_400_000)
        await db.update(renewalDeliveries).set({ state: "unknown" }).where(eq(renewalDeliveries.id, item.id));
      continue;
    }
    await db.update(renewalDeliveries).set({ state: receipt.status === "ok" ? "confirmed" : "failed" }).where(eq(renewalDeliveries.id, item.id));
    if (receipt.details?.error === "DeviceNotRegistered") await db.update(renewalDevices).set({ state: "expired" }).where(and(
      eq(renewalDevices.id, item.deviceId), eq(renewalDevices.userId, item.userId),
      lte(renewalDevices.updatedAt, item.createdAt),
    ));
  }
}

export function startRenewalDelivery() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runRenewalDelivery(); }
    catch { logger.error("Renewal delivery check failed; in-app notices remain available"); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => void tick(), 60_000);
  timer.unref();
}
