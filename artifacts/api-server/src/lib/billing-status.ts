import { db, courseTrials, learners } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getAppSettings, getAccessState } from "./app-settings";
import { BILLING_CONFIGURED, COURSE_OFFERS, courseTrial, accessReminder } from "./billing-policy";

export async function billingStatus(learnerId: string, userId: string | null, guestId?: unknown) {
  // Carry only the trial clock across guest -> account sign-in. This does not
  // merge guest lessons, favourites, conversations, or other personal data.
  const [guestTrial] = userId && typeof guestId === "string" && /^[0-9a-f-]{36}$/.test(guestId)
    ? await db.select({ startedAt: courseTrials.startedAt }).from(courseTrials)
      .innerJoin(learners, eq(learners.id, courseTrials.learnerId))
      .where(eq(learners.identity, `guest:${guestId}`))
    : [];
  await db.insert(courseTrials).values({ learnerId, ...(guestTrial ? { startedAt: guestTrial.startedAt } : {}) })
    .onConflictDoUpdate({
      target: courseTrials.learnerId,
      set: { startedAt: sql`least(${courseTrials.startedAt}, excluded.started_at)` },
    });
  const [trial] = await db.select().from(courseTrials).where(eq(courseTrials.learnerId, learnerId));
  if (!trial) throw new Error("Unable to initialize course trial");
  const access = await getAccessState(userId, await getAppSettings());
  return {
    ...access,
    configured: BILLING_CONFIGURED,
    enforcementEnabled: false,
    fullCourseAccess: true,
    isGuest: !userId,
    trial: courseTrial(trial.startedAt),
    offers: COURSE_OFFERS,
    reminder: accessReminder(access.accessExpiresAt, "complimentary_expiring"),
    message: access.plan === "complimentary"
      ? "لديك منحة مجانية مؤقتة من الإدارة وليست اشتراكاً مدفوعاً. لا يتم تحصيل أي رسوم."
      : "الدفع عبر Polar غير مفعّل بعد. تُعرض الخطط المقترحة فقط، ويظل التعلّم مفتوحاً خلال المرحلة التجريبية حتى بعد انتهاء تجربة اليومين. لا يتم تحصيل أي رسوم.",
  };
}
