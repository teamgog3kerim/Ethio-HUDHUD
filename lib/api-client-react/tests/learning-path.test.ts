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
  for (let month = 1; month < 6; month++) {
    const last = getLessonPosition([...courses].reverse(), `${month}-9`)!;
    const first = getLessonPosition(courses, `${month + 1}-0`)!;
    assert.equal(last.next!.id, first.current.id);
    assert.equal(first.previous!.id, last.current.id);
    assert.equal(last.week, month * 4);
    assert.equal(first.week, month * 4 + 1);
    assert.equal(first.course.month, month + 1);
    assert.equal(first.stage.id, stageForMonth(month + 1).id);
  }
});

test("reloaded completion snapshots count a replayed pass once and resume at the next incomplete lesson", () => {
  const snapshot = structuredClone(courses);
  snapshot[0]!.lessons.forEach(l => { l.completed = true; });
  snapshot[1]!.lessons[0]!.completed = true;
  snapshot[0]!.completedCount = 999; // stale aggregate must never drive UI progress
  const persisted = JSON.parse(JSON.stringify(snapshot)) as Course[];
  for (let replay = 0; replay < 3; replay++) {
    persisted[1]!.lessons[0]!.completed = true;
    const path = buildLearningPath(persisted);
    assert.equal(path.completed, 11);
    assert.equal(path.percent, 18);
    assert.equal(path.months[0]!.percent, 100);
    assert.equal(path.months[1]!.completed, 1);
    assert.equal(path.nextLesson!.id, "2-1");
    assert.equal(getLessonPosition(persisted, "2-0")!.completed, 11);
  }
  assert.equal(buildLearningPath(courses).completed, 0, "fixtures must not share progress");
});

test("uneven and empty months preserve lesson order, unique week placement and navigation", () => {
  const sparse = structuredClone(courses);
  const sizes = [0, 1, 2, 3, 7, 10];
  sparse.forEach((course, i) => { course.lessons = course.lessons.slice(0, sizes[i]); });
  const original = JSON.stringify(sparse);
  const path = buildLearningPath([...sparse].reverse());
  assert.equal(path.total, 23);
  assert.equal(path.months[0]!.percent, 0);
  assert.deepEqual(path.months.flatMap(m => m.weeks.flatMap(w => w.lessons.map(l => l.id))),
    sparse.flatMap(c => c.lessons.map(l => l.id)));
  for (const [index, lesson] of path.lessons.entries()) {
    const pos = getLessonPosition(sparse, lesson.id)!;
    assert.equal(pos.index, index);
    assert.equal(pos.previous?.id, path.lessons[index - 1]?.id);
    assert.equal(pos.next?.id, path.lessons[index + 1]?.id);
  }
  assert.equal(JSON.stringify(sparse), original, "path helpers must not mutate cached courses");
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
