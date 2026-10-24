import { db, courseTrials, learners } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAppSettings, getAccessState } from "./app-settings";
import { BILLING_CONFIGURED, TRIAL_ENFORCEMENT_ENABLED, COURSE_OFFERS, courseTrial, accessReminder, courseAccessPolicy } from "./billing-policy";
import { getAppRole } from "./admin-auth";
import { selectedCoursePlan } from "./billing-selection";
import { sandboxEnabled } from "./polar-sandbox";
import { liveAccess } from "./polar-live-access";
import { liveCheckoutEnabled, liveMonthlyEnabled } from "./polar-live";
import { courseMonthAccess } from "./course-month-policy";

export async function billingStatus(learnerId: string, userId: string | null, _guestId?: unknown) {
  // The trial starts on account activation, not on a marketing-page visit.
  // Existing accounts keep their original clock; signup/login never extends it.
  if (userId) await db.insert(courseTrials).values({ learnerId }).onConflictDoNothing();
  const [storedTrial] = userId
    ? await db.select().from(courseTrials).where(eq(courseTrials.learnerId, learnerId))
    : [];
  const trial = userId ? storedTrial : { startedAt: new Date() };
  if (!trial) throw new Error("Unable to initialize course trial");
  const payment = await liveAccess(userId);
  const access = await getAccessState(userId, await getAppSettings(), payment);
  const paidAccess = !!payment.accessUntil;
  const effective = paidAccess && access.plan !== "complimentary"
    ? { ...access, plan: payment.paidPlan!, source: "polar_live" as const, accessExpiresAt: payment.accessUntil }
    : access;
  const trialState = courseTrial(trial.startedAt);
  const enforcementEnabled = BILLING_CONFIGURED && TRIAL_ENFORCEMENT_ENABLED;
  const admin = !!userId && (await getAppRole(userId)) !== "learner";
  const policy = courseAccessPolicy({
    enforcementEnabled,
    trialState: trialState.state,
    isAdmin: admin,
    hasComplimentaryAccess: access.plan === "complimentary",
    hasVerifiedPaidAccess: paidAccess,
  });
  const [learner] = await db.select({ preferences: learners.preferences }).from(learners).where(eq(learners.id, learnerId));
  const paidReminderExpiry = payment.paidPlan === "monthly"
    ? payment.monthlyPaidThrough ?? payment.paidPeriodEndsAt : payment.paidPeriodEndsAt;
  return {
    accessibleMonths: courseMonthAccess({
      signedIn: !!userId, fullCourseAccess: policy.fullCourseAccess, admin,
      complimentary: access.plan === "complimentary",
      paidAccess, paidMonths: payment.paidCourseMonths,
    }),
    ...effective,
    ...payment,
    selectedPlan: selectedCoursePlan(learner?.preferences),
    configured: BILLING_CONFIGURED,
    sandboxCheckoutEnabled: sandboxEnabled(),
    liveCheckoutEnabled: liveCheckoutEnabled(),
    liveMonthlyCheckoutEnabled: liveMonthlyEnabled(),
    ...policy,
    fullCourseAccess: !!userId && policy.fullCourseAccess,
    isGuest: !userId,
    trial: trialState,
    offers: COURSE_OFFERS,
    reminder: access.plan === "complimentary"
      ? accessReminder(access.accessExpiresAt, "complimentary_expiring")
      : accessReminder(paidReminderExpiry, payment.paidPlan === "monthly"
        && payment.monthlyPaymentCount < payment.monthlyPaymentLimit
        ? "renewal_due" : "course_expiring"),
    message: access.plan === "complimentary"
      ? "لديك منحة مجانية مؤقتة من الإدارة وليست اشتراكاً مدفوعاً. لا يتم تحصيل أي رسوم."
      : paidAccess
        ? "تم التحقق من الدفع عبر Polar. وصولك متاح حتى الموعد الموضح في حسابك."
      : payment.paymentVerificationPending
        ? "نتحقق من حالة الدفع. لا تبدأ عملية دفع جديدة حتى اكتمال التحقق؛ تقدمك محفوظ."
      : !policy.fullCourseAccess
        ? "انتهت تجربتك المجانية لمدة 48 ساعة. اشترك مقابل 29 دولاراً شهرياً أو 149 دولاراً لستة أشهر لمتابعة الدروس والمحادثات. تم حفظ تقدمك."
        : enforcementEnabled
          ? "تجربتك المجانية متاحة لمدة 48 ساعة. بعد انتهائها يلزم شراء شهر مقابل 29 دولاراً مع تجديد يدوي، أو ستة أشهر مقابل 149 دولاراً مرة واحدة، لمتابعة الدروس والمحادثات. لا تجديد تلقائي، ولا تُحصّل رسوم إلا عند إتمام الدفع بنفسك."
        : liveCheckoutEnabled()
          ? "يمكنك شراء شهر مقابل 29 دولاراً مع تجديد يدوي حتى ست دفعات، أو ستة أشهر مقابل 149 دولاراً مرة واحدة. لا تجديد تلقائي. يبقى التعلّم مفتوحاً مؤقتاً بعد تجربة 48 ساعة؛ الحجب غير مفعّل. لا تُحصّل رسوم إلا عند إتمام الدفع بنفسك."
        : "الدفع عبر Polar غير مفعّل بعد. تُعرض الخطط المقترحة فقط، ويظل التعلّم مفتوحاً خلال المرحلة التجريبية حتى بعد انتهاء تجربة اليومين. لا يتم تحصيل أي رسوم.",
  };
}
