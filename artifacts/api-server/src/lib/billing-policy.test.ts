import { test } from "node:test";
import assert from "node:assert/strict";
import { BILLING_CONFIGURED, TRIAL_ENFORCEMENT_ENABLED, COURSE_OFFERS, courseTrial, accessReminder, courseAccessPolicy, isCourseResource } from "./billing-policy";

const start = new Date("2026-10-19T12:00:00.000Z");
const at = (iso: string) => new Date(iso);
test("trial lasts exactly 48 hours and is expired at the start of day three", () => {
  assert.equal(courseTrial(start, start).daysRemaining, 2);
  assert.equal(courseTrial(start, at("2026-10-20T12:00:00Z")).daysRemaining, 1);
  assert.equal(courseTrial(start, at("2026-10-21T11:59:59Z")).state, "active");
  assert.deepEqual(courseTrial(start, at("2026-10-21T12:00:00Z")), {
    state: "expired", startedAt: start.toISOString(), endsAt: "2026-10-21T12:00:00.000Z", daysRemaining: 0,
  });
  assert.equal(courseTrial(start, at("2027-01-01T00:00:00Z")).daysRemaining, 0);
});
test("server trial start is stable across reads and timezone offset inputs", () => {
  assert.equal(courseTrial(start, at("2026-10-20T15:00:00+03:00")).daysRemaining, 1);
  assert.equal(courseTrial(start, start).startedAt, courseTrial(start, at("2026-10-20T00:00:00Z")).startedAt);
});
test("plans match requested USD amounts and truthful six-month savings", () => {
  const [monthly, course] = COURSE_OFFERS;
  assert.equal(monthly.priceUsd, 29);
  assert.equal(monthly.priceUsd * monthly.durationMonths, monthly.sixMonthTotalUsd);
  assert.equal(course.priceUsd, 149);
  assert.equal(monthly.sixMonthTotalUsd - course.priceUsd, course.savingsUsd);
  assert.equal(Math.round(course.savingsUsd / monthly.sixMonthTotalUsd * 1000) / 10, course.savingsPercent);
  assert.equal(BILLING_CONFIGURED, false);
});
test("reminders begin exactly four days before expiry, remain visible, and stop at expiry", () => {
  const expiry = "2026-10-23T12:00:00.000Z";
  assert.equal(accessReminder(expiry, "renewal_due", at("2026-10-19T11:59:59Z")), null);
  assert.deepEqual(accessReminder(expiry, "renewal_due", start), { kind: "renewal_due", expiresAt: expiry, daysRemaining: 4, delivery: "in_app" });
  assert.equal(accessReminder(expiry, "renewal_due", at("2026-10-23T11:59:59Z"))?.daysRemaining, 1);
  assert.equal(accessReminder(expiry, "renewal_due", at(expiry)), null);
  assert.equal(accessReminder(expiry, "course_expiring", start)?.kind, "course_expiring");
  assert.equal(accessReminder(expiry, "complimentary_expiring", start)?.kind, "complimentary_expiring");
});
test("no reminder is invented without a valid future access expiry", () => {
  assert.equal(accessReminder(null, "renewal_due", start), null);
  assert.equal(accessReminder("invalid", "renewal_due", start), null);
  assert.equal(accessReminder("2026-10-18T12:00:00Z", "renewal_due", start), null);
});

test("staged enforcement stays off until live billing rollout is approved", () => {
  assert.equal(BILLING_CONFIGURED, false);
  assert.equal(TRIAL_ENFORCEMENT_ENABLED, false);
  assert.equal(courseAccessPolicy({ enforcementEnabled: false, trialState: "expired" }).fullCourseAccess, true);
});

test("activated enforcement blocks exactly at 48 hours and preserves valid exemptions", () => {
  const policyAt = (now: Date) => courseAccessPolicy({
    enforcementEnabled: true, trialState: courseTrial(start, now).state,
  });
  assert.equal(policyAt(at("2026-10-21T11:59:59.999Z")).fullCourseAccess, true);
  assert.equal(policyAt(at("2026-10-21T12:00:00.000Z")).fullCourseAccess, false);
  assert.equal(policyAt(at("2027-01-01T00:00:00Z")).fullCourseAccess, false);
  for (const exemption of ["isAdmin", "hasComplimentaryAccess", "hasVerifiedPaidAccess"] as const) {
    assert.equal(courseAccessPolicy({ enforcementEnabled: true, trialState: "expired", [exemption]: true }).fullCourseAccess, true);
    assert.equal(courseAccessPolicy({ enforcementEnabled: true, trialState: "expired", [exemption]: false }).fullCourseAccess, false);
  }
});

test("preferences, signup and sandbox purchases are not entitlement inputs", () => {
  for (const selectedPlan of ["trial", "monthly", "six_month"]) {
    const untrusted = { selectedPlan, sandboxPaid: true, signedUp: true };
    assert.equal(courseAccessPolicy({ ...untrusted, enforcementEnabled: true, trialState: "expired" }).fullCourseAccess, false);
  }
});

test("content reads and practice writes are protected; billing, progress and account remain reachable", () => {
  const protectedPaths = [
    ["GET", "/courses"], ["GET", "/lessons/a"], ["POST", "/lessons/a/complete"],
    ["GET", "/study-plan"], ["GET", "/vocabulary"], ["POST", "/vocabulary/a/review"],
    ["GET", "/favourites"], ["PUT", "/favourites/a"], ["GET", "/ai/chat"], ["POST", "/ai/chat"],
  ];
  for (const [method, path] of protectedPaths) {
    assert.equal(isCourseResource(method, path), true, `${method} ${path}`);
    assert.equal(isCourseResource(method, `${path}/`), true);
  }
  for (const path of ["/profile", "/account", "/account/export", "/billing/status", "/billing/selection", "/progress/summary", "/admin/users"]) {
    for (const method of ["GET", "POST", "PUT", "DELETE"]) assert.equal(isCourseResource(method, path), false, `${method} ${path}`);
  }
  assert.equal(isCourseResource("DELETE", "/ai/chat"), false);
  assert.equal(isCourseResource("DELETE", "/favourites/a"), false);
});
