import assert from "node:assert/strict";
import test from "node:test";
import { SaveStudyScheduleBody, GetStudyPlanResponse } from "@workspace/api-zod";
import { addDays, localDate, schedulePlan, updateSchedule, validStartDate } from "./study-schedule";

const input = { startDate: "2026-10-19", studyDays: [1, 3, 5], paused: false, timezone: "Africa/Addis_Ababa" };
const plan = Array.from({ length: 180 }, (_, i) => ({
  day: i + 1, month: Math.floor(i / 30) + 1, title: "Practice", lessonId: "lesson",
  completed: i === 0, type: i % 3 === 0 ? "lesson" : "review",
}));

test("validates real calendar dates and bounded weekday preferences", () => {
  for (const date of ["2026-02-29", "2024-02-30", "2026-13-01", "2026-00-01", "2026-1-01", "1899-12-31", "2101-01-01"])
    assert.equal(validStartDate(date), false, date);
  assert.equal(validStartDate("2024-02-29"), true);
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(SaveStudyScheduleBody.safeParse({ ...input, studyDays: [] }).success, false);
  assert.equal(SaveStudyScheduleBody.safeParse({ ...input, studyDays: [7] }).success, false);
  assert.equal(SaveStudyScheduleBody.safeParse({ ...input, studyDays: [1.5] }).success, false);
});

test("uses learner-local dates across midnight and daylight saving changes", () => {
  const now = new Date("2026-10-19T00:30:00Z");
  assert.equal(localDate(now, "America/Los_Angeles"), "2026-10-18");
  assert.equal(localDate(now, "Asia/Tokyo"), "2026-10-19");
  assert.equal(localDate(new Date("2026-03-08T09:59:00Z"), "America/Los_Angeles"), "2026-03-08");
  assert.equal(localDate(new Date("2026-03-08T10:01:00Z"), "America/Los_Angeles"), "2026-03-08");
  const schedule = updateSchedule(null, input)!;
  assert.equal(schedulePlan(plan, schedule, "America/Los_Angeles", now)[0]!.currentSuggestedWeek, 0);
  assert.equal(schedulePlan(plan, schedule, "Asia/Tokyo", now)[0]!.currentSuggestedWeek, 1);
});

test("spreads every activity over selected weekdays within 180 calendar days", () => {
  for (const studyDays of [[1], [0, 2, 4], [0, 1, 2, 3, 4, 5, 6]]) {
    const schedule = updateSchedule(null, { ...input, studyDays })!;
    const result = schedulePlan(plan, schedule, input.timezone, new Date("2026-10-19T08:00:00Z"));
    assert.equal(result.length, 180);
    assert.equal(GetStudyPlanResponse.safeParse(result).success, true);
    assert.deepEqual(result.map(d => d.day), plan.map(d => d.day));
    for (const day of result) {
      assert.ok(studyDays.includes(new Date(`${day.suggestedDate}T00:00:00Z`).getUTCDay()));
      assert.ok(day.suggestedDate! >= input.startDate && day.suggestedDate! <= addDays(input.startDate, 179));
      assert.equal(day.completed, plan[day.day - 1]!.completed);
    }
  }
});

test("pausing freezes the suggested week, resume shifts suggestions by paused days", () => {
  const schedule = updateSchedule(null, input)!;
  const paused = updateSchedule(schedule, { ...input, paused: true }, new Date("2026-10-26T12:00:00Z"))!;
  const result = schedulePlan(plan, paused, input.timezone, new Date("2026-12-01T12:00:00Z"));
  assert.equal(result[0]!.currentSuggestedWeek, 2);
  assert.ok(result.every(day => !day.overdue));
  assert.equal(updateSchedule(paused, { ...input, paused: true }, new Date("2026-11-01T12:00:00Z"))!.pausedOn, "2026-10-26");
  const resumed = updateSchedule(paused, input, new Date("2026-11-02T12:00:00Z"))!;
  assert.equal(resumed.pausedDays, 7);
  assert.equal(resumed.pausedOn, null);
  assert.equal(schedulePlan(plan, resumed, input.timezone, new Date("2026-11-02T12:00:00Z"))[0]!.currentSuggestedWeek, 2);
  const pausedAgain = updateSchedule(resumed, { ...input, paused: true }, new Date("2026-11-03T12:00:00Z"))!;
  assert.equal(updateSchedule(pausedAgain, input, new Date("2026-11-05T12:00:00Z"))!.pausedDays, 9);
});

test("rescheduling and removing dates never mutate actual completions", () => {
  const snapshot = structuredClone(plan);
  const schedule = updateSchedule(null, input)!;
  const paused = updateSchedule(schedule, { ...input, paused: true }, new Date("2026-11-01T12:00:00Z"))!;
  const moved = updateSchedule(paused, { ...input, startDate: "2027-01-01" })!;
  assert.equal(moved.pausedDays, 0);
  assert.equal(moved.pausedOn, null);
  assert.equal(schedulePlan(plan, moved, input.timezone, new Date("2026-12-01T12:00:00Z"))[0]!.currentSuggestedWeek, 0);
  const removed = updateSchedule(moved, { ...input, startDate: null });
  assert.equal(removed, null);
  assert.ok(schedulePlan(plan, removed, input.timezone).every(day => day.suggestedDate === null && !day.overdue));
  assert.deepEqual(plan, snapshot);
});

test("overdue suggestions are separate from credit; reviews are not treated as missed lessons", () => {
  const schedule = updateSchedule(null, input)!;
  const result = schedulePlan(plan, schedule, input.timezone, new Date("2027-10-19T12:00:00Z"));
  assert.equal(result[0]!.currentSuggestedWeek, 27);
  assert.equal(result.filter(d => d.completed).length, 1);
  assert.equal(result[0]!.overdue, false);
  assert.ok(result.filter(d => d.type === "review").every(d => !d.overdue && !d.completed));
  assert.ok(result.filter(d => d.type === "lesson" && !d.completed).every(d => d.overdue));
});
