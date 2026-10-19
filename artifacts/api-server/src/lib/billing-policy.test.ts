import { test } from "node:test";
import assert from "node:assert/strict";
import { BILLING_CONFIGURED, COURSE_OFFERS, courseTrial, accessReminder } from "./billing-policy";

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
