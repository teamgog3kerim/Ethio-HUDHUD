import { db, courseTrials, learners } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getAppSettings, getAccessState } from "./app-settings";
import { BILLING_CONFIGURED, TRIAL_ENFORCEMENT_ENABLED, COURSE_OFFERS, courseTrial, accessReminder, courseAccessPolicy } from "./billing-policy";
import { getAppRole } from "./admin-auth";
import { selectedCoursePlan } from "./billing-selection";
import { sandboxEnabled } from "./polar-sandbox";

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
  const trialState = courseTrial(trial.startedAt);
  const enforcementEnabled = BILLING_CONFIGURED && TRIAL_ENFORCEMENT_ENABLED;
  const policy = courseAccessPolicy({
    enforcementEnabled,
    trialState: trialState.state,
    isAdmin: enforcementEnabled && !!userId && (await getAppRole(userId)) !== "learner",
    hasComplimentaryAccess: access.plan === "complimentary",
    // Only a future verified LIVE entitlement resolver may supply paid access.
    // Plan preferences and sandbox purchases must never unlock the course.
    hasVerifiedPaidAccess: false,
  });
  const [learner] = await db.select({ preferences: learners.preferences }).from(learners).where(eq(learners.id, learnerId));
  return {
    ...access,
    selectedPlan: selectedCoursePlan(learner?.preferences),
    configured: BILLING_CONFIGURED,
    sandboxCheckoutEnabled: sandboxEnabled(),
    ...policy,
    isGuest: !userId,
    trial: trialState,
    offers: COURSE_OFFERS,
    reminder: accessReminder(access.accessExpiresAt, "complimentary_expiring"),
    message: access.plan === "complimentary"
      ? "لديك منحة مجانية مؤقتة من الإدارة وليست اشتراكاً مدفوعاً. لا يتم تحصيل أي رسوم."
      : !policy.fullCourseAccess
        ? "انتهت تجربتك المجانية لمدة 48 ساعة. اشترك مقابل 29 دولاراً شهرياً أو 149 دولاراً لستة أشهر لمتابعة الدروس والمحادثات. تم حفظ تقدمك."
        : "الدفع عبر Polar غير مفعّل بعد. تُعرض الخطط المقترحة فقط، ويظل التعلّم مفتوحاً خلال المرحلة التجريبية حتى بعد انتهاء تجربة اليومين. لا يتم تحصيل أي رسوم.",
  };
}
