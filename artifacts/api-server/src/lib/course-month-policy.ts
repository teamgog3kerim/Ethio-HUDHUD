import type { LivePurchase } from "@workspace/db";
import { LIVE_VERIFICATION_TTL } from "./polar-live-policy";
import type { getCatalog } from "./learning";

export const ALL_COURSE_MONTHS = [1, 2, 3, 4, 5, 6];
type PaidMonth = Pick<LivePurchase, "id" | "plan" | "status" | "monthlyPaidAt" | "monthlyOrdinal" | "verifiedAt" | "accessUntil" | "monthlyPeriodStart">;

function numberedPayments(rows: PaidMonth[]) {
  return rows.filter(row => row.plan === "monthly" && row.monthlyPaidAt)
    .sort((a, b) => a.monthlyPaidAt!.getTime() - b.monthlyPaidAt!.getTime() || a.id.localeCompare(b.id))
    .map((row, index) => ({ row, month: row.monthlyOrdinal ?? index + 1 }));
}

export function scheduledCourseMonths(rows: PaidMonth[], now = new Date()) {
  return numberedPayments(rows).flatMap(({ row, month }) =>
    ALL_COURSE_MONTHS.includes(month) && row.status === "paid" && row.verifiedAt
      && row.monthlyPeriodStart && row.monthlyPeriodStart > now
      ? [{ month, startsAt: row.monthlyPeriodStart.toISOString() }] : []);
}

export function paidCourseMonths(rows: PaidMonth[], now = new Date()): number[] {
  const current = rows.filter(row => row.status === "paid" && row.accessUntil && row.accessUntil > now
    && (!row.monthlyPeriodStart || row.monthlyPeriodStart <= now)
    && row.verifiedAt && now.getTime() - row.verifiedAt.getTime() < LIVE_VERIFICATION_TTL);
  if (current.some(row => row.plan === "six_month")) return [...ALL_COURSE_MONTHS];
  if (!current.some(row => row.plan === "monthly")) return [];
  // The server's immutable purchase ordinal binds payment to course month.
  // Retain chronological positions only for older receipts without an ordinal.
  // Refunded positions must never shift another payment onto the wrong month.
  const months = numberedPayments(rows).flatMap(({ row, month }) => {
    return ALL_COURSE_MONTHS.includes(month) && row.status === "paid" && row.verifiedAt
      && (!row.monthlyPeriodStart || row.monthlyPeriodStart <= now) ? [month] : [];
  });
  // Preserve first-month access for a verified legacy monthly subscription.
  if (current.some(row => row.plan === "monthly" && !row.monthlyPaidAt) && !months.includes(1)) months.unshift(1);
  return [...new Set(months)].sort((a, b) => a - b);
}

export function courseMonthAccess(input: {
  signedIn: boolean; fullCourseAccess: boolean; admin: boolean;
  complimentary: boolean; paidAccess: boolean; paidMonths: number[];
}) {
  if (!input.signedIn || !input.fullCourseAccess) return [];
  if (input.admin || input.complimentary || !input.paidAccess) return [...ALL_COURSE_MONTHS];
  return [...new Set(input.paidMonths)].filter(month => ALL_COURSE_MONTHS.includes(month)).sort((a, b) => a - b);
}

// Keep previews navigable without sending unpaid learning material to clients.
export function restrictCatalog(catalog: Awaited<ReturnType<typeof getCatalog>>, months: number[]) {
  return catalog.map(course => {
    const accessible = months.includes(course.month);
    return {
      ...course, accessible,
      lessons: course.lessons.map(lesson => ({
        ...lesson, month: course.month, locked: !accessible,
        ...(!accessible ? { objective: "", explanation: "", words: [], exercises: [], dialogue: [] } : {}),
      })),
    };
  });
}
