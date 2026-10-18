import assert from "node:assert/strict";
import test from "node:test";
import { courseSeed, lessonSeed } from "@workspace/db/seed-data";
import { arabicLessonContent, isArabicPronunciation } from "@workspace/db/pronunciation";
import { lessonContentSchema } from "./lesson-validation";
import { gradeAnswers } from "./scoring";

test("adds eighteen lessons without replacing original lesson identifiers", () => {
  assert.equal(lessonSeed.length, 30);
  assert.equal(new Set(lessonSeed.map(l => l.id)).size, 30);
  assert.equal(new Set(lessonSeed.map(l => l.sequence)).size, 30);
  assert.deepEqual(lessonSeed.slice(0, 12).map(l => l.id), [
    "fidel-ha", "fidel-la", "greetings", "introductions", "numbers", "family",
    "questions", "daily-time", "coffee-food", "transport", "work", "days",
  ]);
  for (const course of courseSeed) {
    const lessons = lessonSeed.filter(l => l.courseId === course.id);
    assert.equal(lessons.length, 5, course.id);
    assert.equal(lessons.filter(l => l.content.dialogue?.length).length, 1);
  }
});

test("all thirty lessons validate, stay pilot, and have unambiguous server-graded exercises", () => {
  for (const lesson of lessonSeed) {
    assert.equal(lesson.reviewStatus, "pilot");
    assert.equal(lessonContentSchema.safeParse(lesson.content).success, true, lesson.id);
    assert.equal(lesson.answerKey.length, lesson.content.exercises.length);
    lesson.content.exercises.forEach((exercise, i) => {
      assert.equal(new Set(exercise.options).size, exercise.options.length, lesson.id);
      assert.equal(exercise.options[lesson.answerKey[i]!.correctIndex], lesson.content.words[i]!.arabic);
    });
    assert.equal(gradeAnswers(lesson.answerKey.map(k => k.correctIndex), lesson.answerKey).score, 100);
  }
});

test("six conversations preserve both roles, Amharic lines, Arabic meanings and Arabic pronunciation", () => {
  const conversations = lessonSeed.filter(l => l.content.dialogue?.length);
  assert.equal(conversations.length, 6);
  for (const lesson of conversations) {
    const turns = lesson.content.dialogue!;
    assert.equal(turns.length, 4);
    assert.equal(new Set(turns.map(t => t.speakerAr)).size, 2);
    for (const turn of turns) {
      assert.match(turn.amharic, /\p{Script=Ethiopic}/u);
      assert.match(turn.arabic, /\p{Script=Arabic}/u);
      assert.ok(isArabicPronunciation(turn.transliteration), lesson.id);
      assert.ok(lesson.content.words.some(w => w.amharic === turn.amharic && w.transliteration === turn.transliteration));
      assert.ok(turn.speakerAr && turn.speakerEn);
    }
    const parsed = lessonContentSchema.parse(lesson.content);
    assert.deepEqual(parsed.dialogue, turns, "Admin edits must not strip dialogue");
    assert.deepEqual(arabicLessonContent(parsed).dialogue, turns);
  }
});

test("admin rejects incomplete dialogues and Latin-script dialogue pronunciation", () => {
  const content = structuredClone(lessonSeed.find(l => l.content.dialogue)!.content);
  content.dialogue![0]!.transliteration = "selam";
  assert.equal(lessonContentSchema.safeParse(content).success, false);
  content.dialogue![0]!.transliteration = "سَلَام";
  assert.equal(lessonContentSchema.safeParse(content).success, true);
  content.dialogue = content.dialogue!.slice(0, 1);
  assert.equal(lessonContentSchema.safeParse(content).success, false);
});
