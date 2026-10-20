import { createHash } from "node:crypto";
import { RENEWAL_NOTICE_DAYS } from "./billing-policy";

export type VerifiedReminder = { kind: "complimentary_expiring" | "renewal_due" | "course_expiring"; expiresAt: string };
export const deviceBindingKey = (userId: string, deviceId: string) =>
  createHash("sha256").update(`${userId}:${deviceId}`).digest("hex");

// Only server-verified sources may call this. No client-provided billing dates.
// The current source adapter supplies admin grants only; Polar remains deferred.
export function renewalPeriod(deviceId: string, reminder: VerifiedReminder, now = new Date()) {
  const expiry = Date.parse(reminder.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now.getTime()) return null;
  const at = expiry - RENEWAL_NOTICE_DAYS * 86_400_000;
  return {
    id: createHash("sha256").update(`${deviceId}:${reminder.kind}:${new Date(expiry).toISOString()}`).digest("hex"),
    at: new Date(at).toISOString(),
    due: now.getTime() >= at,
    ttl: Math.max(1, Math.min(3600, Math.floor((expiry - now.getTime()) / 1000))),
  };
}

export function allowedPushAddress(address: string) {
  try {
    const u = new URL(address);
    return u.protocol === "https:" && !u.username && !u.password && (!u.port || u.port === "443") &&
      ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(u.hostname);
  } catch { return false; }
}
