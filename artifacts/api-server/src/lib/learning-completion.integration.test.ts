import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import express from "express";
import { and, eq } from "drizzle-orm";
import { db, pool, learners, lessons, completions, attempts, reviews } from "@workspace/db";
import type { LessonContent } from "@workspace/db";
import learningRouter from "../routes/learning";
import { defaultPreferences } from "./learner";
import { GetCoursesResponse, GetLessonResponse, GetProgressResponse, CompleteLessonResponse } from "@workspace/api-zod";

// Opt-in because it needs a migrated development/test database. The canonical
// test:learning-path command enables it, so the release check cannot silently
// skip persistence coverage. No seed, schema push, truncation or lesson edits.
test("real completion routes: browsing, failure, retry, reload and one-time credit", {
  skip: process.env.RUN_LEARNING_INTEGRATION !== "1",
}, async t => {
  const guest = randomUUID();
  const identity = `guest:${guest}`;
  const [learner] = await db.insert(learners).values({ identity, preferences: defaultPreferences }).returning();
  assert.ok(learner);
  t.after(async () => {
    try {
      // Cascades only this UUID learner's attempts, starts, reviews and progress.
      await db.delete(learners).where(and(eq(learners.id, learner.id), eq(learners.identity, identity)));
    } finally {
      await pool.end();
    }
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    // Same trusted identity boundary used by the existing integration harness;
    // this middleware exists only in this test, never the application.
    Object.assign(req, {
      auth: Object.assign(() => ({ userId: null, tokenType: "session_token" }), { [Symbol.for("@clerk/express.auth")]: true }),
      signedCookies: { hudhud_guest: guest },
    });
    next();
  });
  app.use(learningRouter);
  const server = app.listen(0, "127.0.0.1");
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  // Ephemeral test harness, not a managed application service.
  const base = `http://127.0.0.1:${address.port}`;
  const get = async (path: string) => {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200, path);
    return response.json();
  };
  const post = (id: string, body: unknown) => fetch(`${base}/lessons/${id}/complete`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const rows = (table: typeof completions | typeof attempts | typeof reviews) =>
    db.select().from(table).where(eq(table.learnerId, learner.id));
  const counts = async (done: number, tries: number, words: number) => {
    assert.equal((await rows(completions)).length, done, "completion count");
    assert.equal((await rows(attempts)).length, tries, "attempt count");
    assert.equal((await rows(reviews)).length, words, "review count");
    const summary = GetProgressResponse.parse(await get("/progress/summary"));
    assert.equal(summary.lessonsCompleted, done);
    assert.equal(summary.xp, done * 30);
  };
  const catalog = GetCoursesResponse.parse(await get("/courses"));
  const lessonId = catalog[0]?.lessons[0]?.id;
  assert.ok(lessonId, "A migrated database with seeded active curriculum is required");
  const [source] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  assert.ok(source);
  const keys = source.answerKey as { correctIndex: number; explanation: string }[];
  const exercises = (source.content as LessonContent).exercises;
  const correct = keys.map(k => k.correctIndex);
  const incorrect = keys.map((k, i) => (k.correctIndex + 1) % exercises[i]!.options.length);
  const wordCount = new Set((source.content as LessonContent).words.map(w => w.id)).size;

  const rawViewed = await get(`/lessons/${lessonId}`);
  assert.ok(rawViewed && typeof rawViewed === "object");
  assert.equal("answerKey" in rawViewed, false, "Answer keys must remain server-only");
  const viewed = GetLessonResponse.parse(rawViewed);
  assert.equal(viewed.completed, false);
  assert.equal("answerKey" in viewed, false, "Answer keys must remain server-only");
  assert.ok(viewed.exercises.every((e: object) => !("correctIndex" in e)));
  // Refreshing and browsing the catalogue must never award completion.
  await get(`/lessons/${lessonId}`);
  await get("/courses");
  await counts(0, 0, 0);
  for (const answers of [[], correct.slice(1), correct.map(() => 999), correct.map(() => -1)]) {
    assert.equal((await post(lessonId, { answers, activeSeconds: 15 })).status, 400);
  }
  assert.equal((await post("regression-missing-lesson", { answers: correct, activeSeconds: 15 })).status, 404);
  await counts(0, 0, 0);
  // A forged success/score cannot override grading.
  const failed = await post(lessonId, { answers: incorrect, activeSeconds: 15, passed: true, score: 100 });
  assert.equal(failed.status, 200);
  const failure = CompleteLessonResponse.parse(await failed.json());
  assert.equal(failure.passed, false);
  assert.equal(failure.score, 0);
  assert.equal(failure.xpEarned, 0);
  await counts(0, 1, 0);
  assert.equal(GetLessonResponse.parse(await get(`/lessons/${lessonId}`)).completed, false);
  // Immediate same-answer retries are deduplicated and still cannot award credit.
  assert.equal(CompleteLessonResponse.parse(await (await post(lessonId, { answers: incorrect, activeSeconds: 15 })).json()).xpEarned, 0);
  await counts(0, 1, 0);
  const passed = await post(lessonId, { answers: correct, activeSeconds: 15 });
  assert.equal(passed.status, 200);
  const success = CompleteLessonResponse.parse(await passed.json());
  assert.equal(success.passed, true);
  assert.equal(success.score, 100);
  assert.equal(success.xpEarned, 30);
  await counts(1, 2, wordCount);
  assert.equal(GetLessonResponse.parse(await get(`/lessons/${lessonId}`)).completed, true);
  const refreshed = GetCoursesResponse.parse(await get("/courses"));
  assert.equal(refreshed.flatMap(c => c.lessons).find(l => l.id === lessonId)!.completed, true);
  assert.equal(refreshed.find(c => c.id === source.courseId)!.completedCount, 1);
  const [original] = await db.select().from(completions).where(eq(completions.learnerId, learner.id));
  assert.ok(original);
  assert.equal(CompleteLessonResponse.parse(await (await post(lessonId, { answers: correct, activeSeconds: 15 })).json()).xpEarned, 0);
  await counts(1, 2, wordCount);
  // Also exercise a genuinely new passing attempt, not only the 10s duplicate
  // guard. Age only our test learner's attempt (no sleep and no real data).
  await db.update(attempts).set({ createdAt: new Date(Date.now() - 20_000) })
    .where(and(eq(attempts.learnerId, learner.id), eq(attempts.lessonId, lessonId)));
  assert.equal(CompleteLessonResponse.parse(await (await post(lessonId, { answers: correct, activeSeconds: 15 })).json()).xpEarned, 0);
  await counts(1, 3, wordCount);
  const [persisted] = await db.select().from(completions).where(eq(completions.learnerId, learner.id));
  assert.equal(persisted!.id, original.id);
  assert.equal(persisted!.completedAt.getTime(), original.completedAt.getTime());
});
