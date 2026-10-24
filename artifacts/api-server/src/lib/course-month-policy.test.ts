import test from "node:test";
import assert from "node:assert/strict";
import { paidCourseMonths, scheduledCourseMonths, courseMonthAccess, ALL_COURSE_MONTHS } from "./course-month-policy";
import { LIVE_VERIFICATION_TTL } from "./polar-live-policy";

const now = new Date("2026-10-24T10:00:00Z");
const paid = (id: string, overrides: Partial<Parameters<typeof paidCourseMonths>[0][number]> = {}) => ({
  id, plan: "monthly", status: "paid", monthlyPaidAt: new Date("2026-10-01"), monthlyOrdinal: null,
  verifiedAt: now, accessUntil: new Date("2026-11-01"), monthlyPeriodStart: new Date("2026-10-01"),
  ...overrides,
});
test("first monthly payment unlocks month one, not all months", () => {
  assert.deepEqual(paidCourseMonths([paid("one")], now), [1]);
});
test("verified monthly renewals unlock their corresponding months while coverage is active", () => {
  const rows = [
    paid("one", { monthlyPaidAt: new Date("2026-09-01"), accessUntil: new Date("2026-10-01") }),
    paid("two", { monthlyPaidAt: new Date("2026-10-01") }),
  ];
  assert.deepEqual(paidCourseMonths(rows, now), [1, 2]);
});
test("full refunds leave a gap rather than shifting paid months", () => {
  assert.deepEqual(paidCourseMonths([
    paid("one", { monthlyPaidAt: new Date("2026-09-01"), status: "refunded" }),
    paid("two", { monthlyPaidAt: new Date("2026-10-01") }),
  ], now), [2]);
});
test("immutable payment ordinal, not row count or a selected month, determines the unlock", () => {
  assert.deepEqual(paidCourseMonths([paid("third", { monthlyOrdinal: 3 })], now), [3]);
  assert.deepEqual(paidCourseMonths([paid("a", { monthlyOrdinal: 1 }), paid("b", { monthlyOrdinal: 1 })], now), [1]);
});
test("pending and unpaid selections do not unlock or advance a month", () => {
  assert.deepEqual(paidCourseMonths([paid("one"), paid("pending", { status: "pending", monthlyPaidAt: null })], now), [1]);
  assert.deepEqual(paidCourseMonths([paid("unpaid", { status: "pending", monthlyPaidAt: null })], now), []);
});
test("unverified, expired and stale-only coverage unlocks nothing", () => {
  for (const change of [
    { verifiedAt: null }, { accessUntil: new Date(now.getTime() - 1) },
    { verifiedAt: new Date(now.getTime() - LIVE_VERIFICATION_TTL - 1) },
  ]) assert.deepEqual(paidCourseMonths([paid("one", change)], now), []);
});
test("verified six-month coverage unlocks all six months even with a monthly record", () => {
  assert.deepEqual(paidCourseMonths([paid("monthly"), paid("six", { plan: "six_month", monthlyPaidAt: null })], now), ALL_COURSE_MONTHS);
  assert.deepEqual(paidCourseMonths([paid("six", { plan: "six_month", monthlyPaidAt: null, status: "refunded" })], now), []);
});
test("a prepaid next month does not create initial coverage before its start", () => {
  assert.deepEqual(paidCourseMonths([paid("future", { monthlyPeriodStart: new Date("2026-11-01") })], now), []);
  assert.deepEqual(paidCourseMonths([
    paid("one"), paid("future", { monthlyPaidAt: new Date("2026-10-23"), monthlyPeriodStart: new Date("2026-11-01") }),
  ], now), [1]);
  assert.deepEqual(scheduledCourseMonths([
    paid("future", { monthlyOrdinal: 2, monthlyPeriodStart: new Date("2026-11-01") }),
  ], now), [{ month: 2, startsAt: "2026-11-01T00:00:00.000Z" }]);
  assert.deepEqual(scheduledCourseMonths([
    paid("future", { status: "refunded", monthlyOrdinal: 2, monthlyPeriodStart: new Date("2026-11-01") }),
  ], now), []);
});
test("six-payment course bound and legacy verified first month are preserved", () => {
  assert.deepEqual(paidCourseMonths(Array.from({ length: 8 }, (_, i) =>
    paid(String(i), { monthlyPaidAt: new Date(`2026-0${i + 1}-01`) })), now), ALL_COURSE_MONTHS);
  assert.deepEqual(paidCourseMonths([paid("legacy", { monthlyPaidAt: null })], now), [1]);
});
const base = { signedIn: true, fullCourseAccess: true, admin: false, complimentary: false, paidAccess: true, paidMonths: [1] };
test("trial, admin and complimentary access preserve full course privileges", () => {
  assert.deepEqual(courseMonthAccess({ ...base, admin: true }), ALL_COURSE_MONTHS);
  assert.deepEqual(courseMonthAccess({ ...base, complimentary: true }), ALL_COURSE_MONTHS);
  assert.deepEqual(courseMonthAccess({ ...base, paidAccess: false }), ALL_COURSE_MONTHS);
  assert.deepEqual(courseMonthAccess(base), [1]);
});
test("expired access and guests cannot reuse previously paid month history", () => {
  assert.deepEqual(courseMonthAccess({ ...base, fullCourseAccess: false }), []);
  assert.deepEqual(courseMonthAccess({ ...base, signedIn: false }), []);
});
