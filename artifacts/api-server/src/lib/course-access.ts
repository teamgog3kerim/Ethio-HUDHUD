import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { BILLING_CONFIGURED, TRIAL_ENFORCEMENT_ENABLED, isCourseResource } from "./billing-policy";
import { billingStatus } from "./billing-status";
import { getLearner } from "./learner";

export const enforceCourseAccess: RequestHandler = async (req, res, next) => {
  // Do not initialize clocks or add queries while the staged gate is inactive.
  if (!BILLING_CONFIGURED || !TRIAL_ENFORCEMENT_ENABLED || !isCourseResource(req.method, req.path)) {
    next();
    return;
  }
  const learner = await getLearner(req, res);
  const status = await billingStatus(learner.id, getAuth(req).userId, req.signedCookies?.hudhud_guest);
  if (!status.fullCourseAccess) {
    res.status(403).json({
      error: status.message,
      code: "COURSE_SUBSCRIPTION_REQUIRED",
      subscribePath: "/choose-plan",
    });
    return;
  }
  next();
};
