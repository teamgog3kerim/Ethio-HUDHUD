import type { StudySchedule, StudyScheduleInput } from "@workspace/api-zod";

const DAY = 86_400_000;
// Calendar arithmetic uses UTC only as a day counter, never as learner-local midnight.
export const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY;
export const addDays = (date: string, days: number) => new Date((dayNumber(date) + days) * DAY).toISOString().slice(0, 10);
export function localDate(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find(p => p.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function validStartDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= "1900-01-01" && date <= "2100-12-31"
    && Number.isFinite(dayNumber(date)) && addDays(date, 0) === date;
}
export function updateSchedule(previous: StudySchedule | null, input: StudyScheduleInput, now = new Date()): StudySchedule | null {
  if (input.startDate === null) return null;
  const today = localDate(now, input.timezone);
  const rescheduled = previous?.startDate !== input.startDate
    || JSON.stringify([...previous.studyDays].sort()) !== JSON.stringify([...input.studyDays].sort());
  // An explicit date/day change reanchors the whole set of suggestions.
  const pausedDays = rescheduled ? 0 : previous!.pausedDays
    + (previous!.pausedOn && !input.paused ? Math.max(0, dayNumber(today) - dayNumber(previous!.pausedOn)) : 0);
  return {
    startDate: input.startDate, studyDays: [...input.studyDays].sort(),
    pausedDays,
    pausedOn: input.paused ? (!rescheduled && previous?.pausedOn || today) : null,
  };
}

export function schedulePlan<T extends { completed: boolean; type: string }>(
  plan: T[], schedule: StudySchedule | null, timezone: string, now = new Date(),
) {
  const today = localDate(now, timezone);
  if (!schedule) return plan.map(day => ({ ...day, suggestedDate: null, suggestedWeek: null, currentSuggestedWeek: null, overdue: false }));
  const frozenToday = schedule.pausedOn ?? today;
  const start = addDays(schedule.startDate, schedule.pausedDays);
  const elapsed = dayNumber(frozenToday) - dayNumber(start);
  const currentSuggestedWeek = elapsed < 0 ? 0 : elapsed >= 180 ? 27 : Math.floor(elapsed / 7) + 1;
  const eligible = Array.from({ length: 180 }, (_, i) => addDays(start, i))
    .filter(date => schedule.studyDays.includes(new Date(`${date}T00:00:00Z`).getUTCDay()));
  return plan.map((day, i) => {
    const suggestedDate = eligible[Math.floor(i * eligible.length / Math.max(1, plan.length))]!;
    return {
      ...day, suggestedDate,
      suggestedWeek: Math.floor((dayNumber(suggestedDate) - dayNumber(start)) / 7) + 1,
      currentSuggestedWeek,
      // Reviews have no completion record: do not misrepresent them as missed work.
      overdue: !schedule.pausedOn && day.type === "lesson" && !day.completed && suggestedDate < today,
    };
  });
}
