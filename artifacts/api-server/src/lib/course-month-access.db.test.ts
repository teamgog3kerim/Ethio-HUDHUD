import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

test("course previews, direct GET/POST lesson resources and review queue honor paid months", { skip: process.env.RUN_MONTH_ACCESS_INTEGRATION !== "1" }, async () => {
  const { db, pool, learners } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const { getCatalog, getWordQueue } = await import("./learning");
  const { restrictCatalog } = await import("./course-month-policy");
  const { lockedLessonMonth } = await import("./course-access");
  const identity = `month-policy-test:${randomUUID()}`;
  try {
    const [learner] = await db.insert(learners).values({ identity, preferences: {} }).returning();
    const catalog = await getCatalog(learner!.id);
    const month1 = catalog.find(c => c.month === 1)!;
    const month2 = catalog.find(c => c.month === 2)!;
    assert.ok(month1?.lessons.length && month2?.lessons.length, "Uses the seeded course, not invented lesson IDs");
    const limited = restrictCatalog(catalog, [1]);
    assert.equal(limited.find(c => c.month === 1)!.accessible, true);
    const preview = limited.find(c => c.month === 2)!;
    assert.equal(preview.accessible, false);
    assert.equal(preview.lessons[0]!.id, month2.lessons[0]!.id);
    assert.equal(preview.lessons[0]!.locked, true);
    for (const lesson of preview.lessons) {
      assert.deepEqual(lesson.words, []); assert.deepEqual(lesson.exercises, []);
      assert.deepEqual(lesson.dialogue, []); assert.equal(lesson.explanation, "");
    }
    assert.equal(await lockedLessonMonth(`/lessons/${month1.lessons[0]!.id}`, [1]), null);
    assert.equal(await lockedLessonMonth(`/lessons/${month2.lessons[0]!.id}`, [1]), 2);
    assert.equal(await lockedLessonMonth(`/lessons/${month2.lessons[0]!.id}/complete`, [1]), 2);
    assert.equal(await lockedLessonMonth(`/lessons/${month2.lessons[0]!.id}`, [1, 2, 3, 4, 5, 6]), null);
    const allowedWords = new Set(month1.lessons.flatMap(l => l.words.map(w => w.id)));
    const queue = await getWordQueue(learner!.id, [1]);
    assert.ok(queue.length > 0);
    assert.ok(queue.every(word => allowedWords.has(word.id)), "Reviews cannot fetch unpaid-month vocabulary");
    assert.deepEqual(await getWordQueue(learner!.id, []), []);
  } finally {
    await db.delete(learners).where(eq(learners.identity, identity));
    await pool.end();
  }
});
