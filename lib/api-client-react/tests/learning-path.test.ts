import assert from "node:assert/strict";
import test from "node:test";
import { buildLearningPath, getLessonPosition, stageForMonth } from "../src/learning-path";
import type { Course, Lesson } from "../src/generated/api.schemas";

const courses: Course[] = Array.from({ length: 6 }, (_, m) => ({
  id: `course-${m + 1}`, month: m + 1, level: stageForMonth(m + 1).id, category: "test",
  titleAr: "تعلّم", titleEn: "Learn", description: "test", completedCount: 0,
  lessons: Array.from({ length: 10 }, (_, i) => ({
    id: `${m + 1}-${i}`, courseId: `course-${m + 1}`, titleAr: "درس", titleEn: "Lesson", titleAm: "ሰላም",
    minutes: 15, objective: "test", explanation: "test", words: [], exercises: [], reviewStatus: "pilot",
    completed: false,
  } satisfies Lesson)),
}));
test("path sorts six months into paired stages and partitions each lesson into exactly one of 24 weeks", () => {
  const path = buildLearningPath([...courses].reverse());
  assert.equal(path.total, 60);
  assert.equal(path.months[0]!.course.month, 1);
  const weeks = path.months.flatMap(m => m.weeks);
  assert.deepEqual(weeks.map(w => w.number), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.equal(new Set(weeks.flatMap(w => w.lessons.map(l => l.id))).size, 60);
  assert.deepEqual(path.months.map(m => m.stage.id), ["beginner", "beginner", "intermediate", "intermediate", "advanced", "advanced"]);
});
test("previous and next lesson navigation cross month boundaries with safe first/last edges", () => {
  assert.equal(getLessonPosition(courses, "1-0")!.previous, undefined);
  assert.equal(getLessonPosition(courses, "1-9")!.next!.id, "2-0");
  assert.equal(getLessonPosition(courses, "2-0")!.previous!.id, "1-9");
  assert.equal(getLessonPosition(courses, "6-9")!.next, undefined);
  assert.equal(getLessonPosition(courses, "missing"), null);
});
test("progress and resume use real completion booleans rather than stale course counts", () => {
  const changed = structuredClone(courses);
  changed[0]!.lessons[0]!.completed = true;
  changed[0]!.lessons[1]!.completed = true;
  const path = buildLearningPath(changed);
  assert.equal(path.completed, 2);
  assert.equal(path.months[0]!.percent, 20);
  assert.equal(path.nextLesson!.id, "1-2");
  changed.forEach(c => c.lessons.forEach(l => { l.completed = true; }));
  assert.equal(buildLearningPath(changed).nextLesson, null);
  assert.equal(buildLearningPath(changed).percent, 100);
  assert.equal(buildLearningPath([]).percent, 0);
});
