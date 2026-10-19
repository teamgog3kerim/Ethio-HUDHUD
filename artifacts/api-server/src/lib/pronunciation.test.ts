import assert from "node:assert/strict";
import test from "node:test";
import { lessonSeed } from "@workspace/db/seed-data";
import {
  arabicAnswerKey, arabicLearningText, arabicLessonContent,
  arabicPronunciation, arabicTutorText, isArabicPronunciation,
} from "@workspace/db/pronunciation";
import { lessonContentSchema } from "./lesson-validation";
import { gradeAnswers } from "./scoring";

test("the reported thank-you pronunciation is Arabic script, not a translation", () => {
  assert.equal(arabicPronunciation("amäsäggənallähu"), "أَمَسَگِّنَالَّهُو");
  assert.notEqual(arabicPronunciation("amäsäggənallähu"), "شكراً");
  assert.equal(arabicPronunciation("sa\u0308lam"), "سَلَام");
});

test("every pilot word and letter has an Arabic pronunciation, including English UI syllables", () => {
  assert.equal(lessonSeed.length, 42);
  for (const lesson of lessonSeed) {
    assert.ok(lessonContentSchema.safeParse(lesson.content).success, lesson.id);
    for (const word of lesson.content.words) {
      assert.ok(isArabicPronunciation(word.transliteration), word.amharic);
      assert.ok(!word.transliteration.includes("بانتظار"), word.amharic);
      assert.doesNotMatch(word.arabic, /\p{Script=Latin}/u);
      if (word.english.startsWith("syllable ")) {
        assert.ok(isArabicPronunciation(word.english.slice(9)));
      }
    }
    for (const text of [
      lesson.content.explanation, lesson.content.objective,
      ...lesson.content.exercises.flatMap(e => [e.prompt, ...e.options]),
      ...lesson.answerKey.map(k => k.explanation),
    ]) {
      assert.doesNotMatch(text, /\p{Script=Latin}/u, lesson.id);
      assert.doesNotMatch(text, /اللاتيني/);
    }
  }
});

test("old stored lessons, exercise options and explanations convert without changing ids or grades", () => {
  const old = structuredClone(lessonSeed[0]!.content);
  old.words[0]!.transliteration = "hä";
  old.words[0]!.arabic = "المقطع hä";
  old.words[0]!.english = "syllable hä";
  old.explanation = "اقرأ المقطع hä مع النقل اللاتيني.";
  old.exercises[0]!.options = ["المقطع hu", "المقطع hä"];
  const before = structuredClone(old);
  const converted = arabicLessonContent(old);
  assert.deepEqual(old, before);
  assert.equal(converted.words[0]!.id, old.words[0]!.id);
  assert.equal(converted.words[0]!.transliteration, "هَ");
  assert.equal(converted.words[0]!.english, "syllable هَ");
  assert.deepEqual(converted.exercises[0]!.options, ["المقطع هُو", "المقطع هَ"]);
  assert.equal(converted.exercises[0]!.id, old.exercises[0]!.id);
  const keys = arabicAnswerKey([{ correctIndex: 1, explanation: "النقل التقريبي: hä." }]);
  assert.equal(gradeAnswers([1], keys).score, 100);
  assert.equal(keys[0]!.correctIndex, 1);
  assert.equal(keys[0]!.explanation, "النقل التقريبي: هَ.");
  assert.deepEqual(arabicLessonContent(converted), converted);
});

test("Arabic reviewer input is preserved; unfamiliar legacy pronunciation is explicitly pending", () => {
  assert.equal(arabicPronunciation("  سَلَام  "), "سَلَام");
  for (const value of ["unreviewed-new-word", "constructor", "toString", ""]) {
    assert.equal(arabicPronunciation(value), "النطق العربي بانتظار المراجعة");
  }
  assert.equal(arabicLearningText("constructor"), "constructor");
});

test("admin lesson validation requires Arabic-script pronunciation for every word", () => {
  const content = structuredClone(lessonSeed[2]!.content);
  for (const invalid of ["amäsäggənallähu", "سلام salam", "", "ሰላም", "سلام пример"]) {
    content.words[0]!.transliteration = invalid;
    assert.equal(lessonContentSchema.safeParse(content).success, false, invalid);
  }
  content.words[0]!.transliteration = "سَلَام";
  assert.equal(lessonContentSchema.safeParse(content).success, true);
});

test("tutor pronunciation guides convert without corrupting ordinary English prose", () => {
  assert.equal(arabicTutorText("Learn words and ask a man."), "Learn words and ask a man.");
  assert.equal(arabicTutorText("አንድ (and) and ቡና (buna)"), "አንድ (أَنْدْ) and ቡና (بُونَا)");
  assert.equal(arabicTutorText("النطق: taksi"), "النطق: تَاكْسِي");
  assert.equal(arabicTutorText("Say amäsäggənallähu and smile."), "Say أَمَسَگِّنَالَّهُو and smile.");
});
