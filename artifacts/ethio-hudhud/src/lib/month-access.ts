// Either server source can deny access. In particular, a fresh billing
// restriction must beat an older catalog cached during a full-access trial.
export function isMonthLocked(month: number | undefined, accessibleMonths?: number[] | null, flag?: boolean | null): boolean {
  if (flag === true) return true;
  if (month === undefined || !Array.isArray(accessibleMonths)) return false;
  return !accessibleMonths.includes(month);
}

export function monthRequiredFromError(err: unknown): number | null {
  const e = err as { status?: number; data?: { code?: string; month?: unknown } } | null;
  if (e?.status !== 403 || e.data?.code !== 'COURSE_MONTH_REQUIRED') return null;
  return typeof e.data.month === 'number' ? e.data.month : 0;
}

export function subscribeHref(pending: boolean): string {
  return pending ? '/choose-plan' : '/choose-plan?plan=monthly';
}
