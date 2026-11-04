import { lt } from "drizzle-orm";
import { db, visitorPageviews } from "@workspace/db";

const COUNTRY_CODE = /^[A-Z]{2}$/;
let lastPruneAt = 0;

export async function pruneExpiredVisitorPageviews(now = Date.now()): Promise<void> {
  if (now - lastPruneAt <= 60 * 60 * 1000) return;
  lastPruneAt = now;
  await db.delete(visitorPageviews).where(lt(visitorPageviews.createdAt, new Date(now - 90 * 86400000)));
}

export function normalizeVisitorCountry(value: string | undefined): string {
  const country = value?.trim().toUpperCase() ?? "";
  return COUNTRY_CODE.test(country) && country !== "XX" ? country : "XX";
}

export function classifyVisitorDevice(userAgent: string | undefined): string {
  const ua = userAgent ?? "";
  if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(ua)) return "mobile";
  if (!ua) return "unknown";
  return "desktop";
}

export function classifyVisitorBrowser(userAgent: string | undefined): string {
  const ua = userAgent ?? "";
  if (/edg\//i.test(ua)) return "edge";
  if (/firefox\//i.test(ua)) return "firefox";
  if (/samsungbrowser\//i.test(ua)) return "samsung";
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return "chrome";
  if (/safari\//i.test(ua) && !/chrome|chromium/i.test(ua)) return "safari";
  return "other";
}
