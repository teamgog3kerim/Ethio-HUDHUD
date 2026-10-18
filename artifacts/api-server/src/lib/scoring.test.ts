import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeAnswers, nextReviewInterval, boundedActiveSeconds } from "./scoring";
const keys = [0, 2, 1, 0].map(correctIndex => ({ correctIndex, explanation: "تصحيح" }));
test("grades on server answer key and passes at 75 percent", () => {
  assert.equal(gradeAnswers([0, 2, 1, 0], keys).score, 100);
  assert.equal(gradeAnswers([0, 2, 1, 1], keys).passed, true);
  assert.equal(gradeAnswers([1, 2, 1, 1], keys).passed, false);
});
test("returns question-level explanations and correct options", () => {
  const result = gradeAnswers([1, 2, 1, 0], keys);
  assert.deepEqual(result.feedback[0], { correct: false, correctIndex: 0, explanation: "تصحيح" });
});
test("rejects incomplete and empty quiz submissions", () => {
  assert.throws(() => gradeAnswers([0], keys));
  assert.throws(() => gradeAnswers([], []));
});
test("review intervals reset on failure, double on success and cap at 90", () => {
  assert.equal(nextReviewInterval(false, 20), 0);
  assert.equal(nextReviewInterval(true, 0), 1);
  assert.equal(nextReviewInterval(true, 4), 8);
  assert.equal(nextReviewInterval(true, 80), 90);
});
test("study duration never exceeds elapsed time and requires a start", () => {
  assert.equal(boundedActiveSeconds(120), 0);
  assert.equal(boundedActiveSeconds(60, new Date(Date.now() - 200000)), 60);
  assert.ok(boundedActiveSeconds(500, new Date(Date.now() - 2000)) <= 3);
  assert.equal(boundedActiveSeconds(9999, new Date(Date.now() - 7200000)), 3600);
  assert.equal(boundedActiveSeconds(60, new Date(Date.now() + 10000)), 0);
});
