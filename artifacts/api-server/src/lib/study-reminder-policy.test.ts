import test from "node:test";
import assert from "node:assert/strict";
import { studyReminderPolicy, type StudyPreferences } from "./study-reminder-policy";
import { deriveStudyVapid } from "./study-push-config";

const prefs: StudyPreferences = {
  timezone: "Africa/Addis_Ababa", reminderEnabled: true, reminderTime: "19:00",
  studySchedule: { startDate: "2026-10-24", studyDays: [0, 6], pausedOn: null, pausedDays: 0 },
};
const at = (value: string) => new Date(value);
test("reminds only at/after chosen time on selected local study days", () => {
  assert.equal(studyReminderPolicy(prefs, at("2026-10-24T15:59:59Z")).due, false);
  assert.equal(studyReminderPolicy(prefs, at("2026-10-24T16:00:00Z")).due, true);
  assert.equal(studyReminderPolicy(prefs, at("2026-10-26T17:00:00Z")).due, false);
});
test("opt-in is independent of saving a schedule", () => {
  assert.equal(studyReminderPolicy({ ...prefs, reminderEnabled: false }, at("2026-10-24T17:00Z")).due, false);
  assert.equal(studyReminderPolicy({ ...prefs, studySchedule: null }, at("2026-10-24T17:00Z")).due, false);
});
test("no reminder before schedule starts, after 180 days, or while paused", () => {
  assert.equal(studyReminderPolicy(prefs, at("2026-10-18T17:00Z")).due, false);
  const ended = studyReminderPolicy(prefs, at("2027-04-24T17:00Z"));
  assert.equal(ended.due, false); assert.equal(ended.nextDate, null);
  const paused = { ...prefs, studySchedule: { ...prefs.studySchedule!, pausedOn: "2026-10-24" } };
  assert.equal(studyReminderPolicy(paused, at("2026-10-24T17:00Z")).due, false);
});
test("pause/resume shifts the same calendar schedule, not lesson progress", () => {
  const resumed = { ...prefs, studySchedule: { ...prefs.studySchedule!, pausedDays: 7 } };
  assert.equal(studyReminderPolicy(resumed, at("2026-10-24T17:00Z")).due, false);
  assert.equal(studyReminderPolicy(resumed, at("2026-10-31T17:00Z")).due, true);
});
test("dismiss is local to this occurrence and does not mutate the schedule", () => {
  const original = JSON.stringify(prefs);
  const current = studyReminderPolicy(prefs, at("2026-10-24T17:00Z"));
  const dismissed = { ...prefs, studyReminderAction: { key: current.occurrenceKey!, dismissed: true } };
  assert.equal(studyReminderPolicy(dismissed, at("2026-10-24T18:00Z")).due, false);
  assert.equal(studyReminderPolicy(dismissed, at("2026-10-25T17:00Z")).due, true);
  assert.equal(JSON.stringify(prefs), original);
});
test("snooze becomes due again only after ten minutes", () => {
  const current = studyReminderPolicy(prefs, at("2026-10-24T17:00Z"));
  const snoozed = { ...prefs, studyReminderAction: { key: current.occurrenceKey!, snoozedUntil: "2026-10-24T17:10:00Z" } };
  assert.equal(studyReminderPolicy(snoozed, at("2026-10-24T17:09:59Z")).due, false);
  assert.equal(studyReminderPolicy(snoozed, at("2026-10-24T17:10:00Z")).due, true);
});
test("local midnight changes the occurrence; UTC date is not the study date", () => {
  const midnight = { ...prefs, reminderTime: "00:00" };
  const current = studyReminderPolicy(midnight, at("2026-10-23T21:01Z"));
  assert.equal(current.due, true);
  assert.equal(current.nextDate, "2026-10-24");
  assert.notEqual(current.occurrenceKey, studyReminderPolicy(midnight, at("2026-10-24T21:01Z")).occurrenceKey);
});
test("DST repeated hour does not create two occurrences", () => {
  const dst = { ...prefs, timezone: "America/New_York", reminderTime: "01:15" };
  const a = studyReminderPolicy(dst, at("2026-11-01T05:30Z"));
  const b = studyReminderPolicy(dst, at("2026-11-01T06:30Z"));
  assert.equal(a.due, true); assert.equal(b.due, true);
  assert.equal(a.occurrenceKey, b.occurrenceKey);
});
test("invalid/empty schedules fail safely and a new time ignores old dismissal", () => {
  assert.equal(studyReminderPolicy({ ...prefs, studySchedule: { ...prefs.studySchedule!, studyDays: [] } }).due, false);
  const old = studyReminderPolicy(prefs, at("2026-10-24T17:00Z"));
  const changed = { ...prefs, reminderTime: "19:30", studyReminderAction: { key: old.occurrenceKey!, dismissed: true } };
  assert.equal(studyReminderPolicy(changed, at("2026-10-24T17:00Z")).due, true);
});
test("study signing keys are stable, valid length, purpose-separated and rotate with the root secret", () => {
  const root = "isolated-test-secret-not-a-real-credential-12345";
  const a = deriveStudyVapid(root)!;
  assert.deepEqual(a, deriveStudyVapid(root));
  assert.equal(Buffer.from(a.privateKey, "base64url").length, 32);
  assert.equal(Buffer.from(a.publicKey, "base64url").length, 65);
  assert.notEqual(a.privateKey, root);
  assert.notEqual(a.publicKey, deriveStudyVapid(root + "rotated")!.publicKey);
  assert.equal(deriveStudyVapid("weak"), null);
});
