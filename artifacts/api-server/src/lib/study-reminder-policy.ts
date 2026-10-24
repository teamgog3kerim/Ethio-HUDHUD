import { createHash } from "node:crypto";
import type { StudyReminderStatus, StudySchedule } from "@workspace/api-zod";
import { addDays, dayNumber, localDate, validStartDate } from "./study-schedule";

export type ReminderActionState = { key: string; dismissed?: boolean; snoozedUntil?: string };
export type StudyPreferences = {
  timezone?: string; reminderEnabled?: boolean; reminderTime?: string;
  studySchedule?: StudySchedule | null; studyReminderAction?: ReminderActionState;
};
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export function studyReminderPolicy(prefs: StudyPreferences, now = new Date(), identity = ""): StudyReminderStatus {
  let timezone = prefs.timezone || "Africa/Addis_Ababa";
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(now); }
  catch { timezone = "Africa/Addis_Ababa"; }
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(prefs.reminderTime ?? "") ? prefs.reminderTime! : "19:00";
  const schedule = prefs.studySchedule;
  const valid = !!schedule && validStartDate(schedule.startDate)
    && Number.isInteger(schedule.pausedDays) && schedule.pausedDays >= 0
    && Array.isArray(schedule.studyDays) && schedule.studyDays.length > 0
    && schedule.studyDays.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
  const status: StudyReminderStatus = {
    enabled: prefs.reminderEnabled === true, time, timezone, scheduled: valid,
    paused: !!schedule?.pausedOn, due: false, occurrenceKey: null,
    nextDate: null, snoozedUntil: null, actionHref: "/plan",
  };
  if (!valid || !schedule || schedule.pausedOn) return status;
  const today = localDate(now, timezone);
  const start = addDays(schedule.startDate, schedule.pausedDays);
  const end = addDays(start, 179);
  const eligible = (date: string) => date >= start && date <= end
    && schedule.studyDays.includes(new Date(`${date}T00:00:00Z`).getUTCDay());
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(now);
  if (eligible(today)) {
    status.occurrenceKey = hash(JSON.stringify([identity, today, start, [...schedule.studyDays].sort(), timezone, time]));
    const action = prefs.studyReminderAction?.key === status.occurrenceKey ? prefs.studyReminderAction : undefined;
    const snooze = action?.snoozedUntil && Number.isFinite(Date.parse(action.snoozedUntil)) ? action.snoozedUntil : null;
    status.snoozedUntil = snooze;
    status.due = status.enabled && clock >= time && !action?.dismissed
      && (!snooze || Date.parse(snooze) <= now.getTime());
    if (!action?.dismissed) status.nextDate = today;
  }
  if (!status.nextDate) {
    const from = today < start ? start : addDays(today, 1);
    for (let i = 0; i < 180 && dayNumber(from) + i <= dayNumber(end); i++) {
      const date = addDays(from, i);
      if (eligible(date)) { status.nextDate = date; break; }
    }
  }
  return status;
}
