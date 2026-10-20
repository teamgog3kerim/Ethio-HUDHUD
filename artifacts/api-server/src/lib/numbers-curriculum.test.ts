import assert from "node:assert/strict";
import test from "node:test";
import { courseSeed, lessonSeed } from "@workspace/db/seed-data";
import { isArabicPronunciation } from "@workspace/db/pronunciation";

test("numbers 0–100 are covered exactly once across all six months", () => {
  const modules = lessonSeed.filter(l => l.id.startsWith("numbers-course-"));
  assert.equal(modules.length, 10);
  const values = modules.flatMap(l => l.content.words.map(w => Number(w.english)));
  assert.deepEqual(values, Array.from({ length: 101 }, (_, i) => i));
  for (const course of courseSeed) {
    assert.equal(modules.filter(l => l.courseId === course.id).length, course.month <= 2 ? 1 : 2);
  }
  for (const lesson of modules) {
    assert.equal(lesson.content.exercises.length, lesson.content.words.length);
    for (const word of lesson.content.words) {
      assert.ok(isArabicPronunciation(word.transliteration), word.amharic);
      assert.ok(!word.transliteration.includes("بانتظار"), word.amharic);
      assert.ok(word.arabic.startsWith(`${word.english} · `));
    }
    for (const exercise of lesson.content.exercises) assert.equal(exercise.options.length, 4);
  }
});

test("zero, teens, tens and one hundred have explicit Amharic and Arabic readings", () => {
  const words = lessonSeed.filter(l => l.id.startsWith("numbers-course-")).flatMap(l => l.content.words);
  for (const [value, amharic, pronunciation] of [
    ["0", "ዜሮ", "زيرو"],
    ["10", "አስር", "أَسِرْ"],
    ["11", "አስራ አንድ", "أَسْرَا أَنْدْ"],
    ["20", "ሃያ", "هَايَا"],
    ["21", "ሃያ አንድ", "هَايَا أَنْدْ"],
    ["99", "ዘጠና ዘጠኝ", "زَطَنَا زَطَنيْ"],
    ["100", "አንድ መቶ", "أَنْدْ مَتُو"],
  ]) {
    const word = words.find(w => w.english === value)!;
    assert.equal(word.amharic, amharic);
    assert.equal(word.transliteration, pronunciation);
  }
});
