import { db, applicationSettings, accessGrants } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetAdminSettingsResponse, type AppSettings } from "@workspace/api-zod";
import { isComplimentary } from "./admin-policy";
import { liveAccess } from "./polar-live-access";

type PaidSnapshot = Awaited<ReturnType<typeof liveAccess>>;
export const defaultAppSettings: AppSettings = {
  aiEnabled: true, learningEnabled: true, freeAiDailyLimit: 20,
  complimentaryAiDailyLimit: 100, defaultDailyGoal: 60,
  announcementAr: "", announcementEn: "", supportEmail: "",
};
export async function getAppSettings(): Promise<AppSettings> {
  const [row] = await db.select().from(applicationSettings).where(eq(applicationSettings.id, "global"));
  return GetAdminSettingsResponse.parse({ ...defaultAppSettings, ...(row?.value as object ?? {}) });
}
export async function getAccessState(userId: string | null, settings: AppSettings, payment?: PaidSnapshot) {
  const [grant] = userId ? await db.select().from(accessGrants).where(eq(accessGrants.userId, userId)) : [];
  const complimentary = isComplimentary(grant);
  const paid = payment ?? await liveAccess(userId);
  if (!complimentary && paid.accessUntil && paid.paidPlan) {
    return {
      plan: paid.paidPlan, source: "polar_live" as const,
      dailyAiLimit: settings.complimentaryAiDailyLimit,
      accessExpiresAt: paid.accessUntil,
    };
  }
  return {
    plan: complimentary ? "complimentary" as const : "free" as const,
    source: complimentary ? "admin_grant" as const : "none" as const,
    dailyAiLimit: complimentary ? settings.complimentaryAiDailyLimit : settings.freeAiDailyLimit,
    accessExpiresAt: complimentary ? grant!.expiresAt!.toISOString() : null,
  };
}
