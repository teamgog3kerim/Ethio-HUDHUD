import assert from "node:assert/strict";
import test from "node:test";
import { courseSeed, lessonSeed } from "@workspace/db/seed-data";
import { buildStudyPlan } from "./study-plan";

const courses = courseSeed.map(c => ({
  ...c, lessons: lessonSeed.filter(l => l.courseId === c.id).map(l => ({ id: l.id, titleAr: l.content.titleAr, completed: false })),
}));
test("calendar follows all six months and schedules every lesson once with four weeks of practice", () => {
  const plan = buildStudyPlan([...courses].reverse());
  assert.equal(plan.length, 180);
  const scheduled = plan.filter(p => p.type === "lesson");
  assert.equal(scheduled.length, 60);
  assert.equal(new Set(scheduled.map(p => p.lessonId)).size, 60);
  for (const course of courses) {
    const days = plan.filter(p => p.month === course.month);
    assert.equal(days.length, 30);
    assert.ok(days.every(p => !p.lessonId || course.lessons.some(l => l.id === p.lessonId)));
    for (let week = 0; week < 4; week++) {
      assert.ok(days.slice(week * 7, week * 7 + 7).some(p => p.type === "lesson"));
      assert.ok(days.slice(week * 7, week * 7 + 7).some(p => p.type === "review"));
    }
    assert.ok(days.slice(28).every(p => p.type === "review" && !p.completed));
  }
});
test("calendar completion reflects passed lessons and tolerates an empty or hidden month", () => {
  const changed = structuredClone(courses);
  changed[0]!.lessons[0]!.completed = true;
  const plan = buildStudyPlan(changed);
  assert.equal(plan.filter(p => p.completed).length, 1);
  assert.equal(plan[0]!.completed, true);
  assert.ok(buildStudyPlan([]).every(p => p.lessonId === null && !p.completed));
});
