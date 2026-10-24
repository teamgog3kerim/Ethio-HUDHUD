import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIDEL_FAMILIES } from './options';
import {
  FIDEL_VOCABULARY, buildFidelExamples, examplesForFamily, examplesForLetter,
} from './fidel-vocabulary';

test('the expanded vocabulary has complete unique Arabic-first examples', () => {
  assert.ok(FIDEL_VOCABULARY.length >= 120);
  assert.equal(new Set(FIDEL_VOCABULARY.map(w => w.id)).size, FIDEL_VOCABULARY.length);
  assert.equal(new Set(FIDEL_VOCABULARY.map(w => w.amharic)).size, FIDEL_VOCABULARY.length);
  for (const word of FIDEL_VOCABULARY) {
    assert.match(word.amharic, /\p{Script=Ethiopic}/u);
    assert.match(word.transliteration, /\p{Script=Arabic}/u);
    assert.doesNotMatch(word.transliteration, /[a-z]/i);
    assert.ok(word.arabic.trim() && word.english.trim());
    assert.equal(word.reviewStatus, 'pilot');
    assert.equal(word.lessonId, undefined);
  }
});

test('every displayed Fidel family has multiple real examples', () => {
  for (const family of FIDEL_FAMILIES) {
    assert.ok(examplesForFamily(FIDEL_VOCABULARY, family.base).length >= 2, String.fromCodePoint(family.base));
  }
});

test('letter matches are exact, including internal characters, not other vowel orders', () => {
  const words = examplesForLetter(FIDEL_VOCABULARY, 'በ');
  assert.ok(words.some(w => w.amharic === 'በር'));
  assert.ok(words.some(w => w.amharic === 'አበባ'));
  assert.ok(!words.some(w => w.amharic === 'ቤት'));
  assert.ok(words.every(w => w.amharic.includes('በ')));
});

test('rare and invalid letters do not silently substitute family examples', () => {
  assert.deepEqual(examplesForLetter(FIDEL_VOCABULARY, 'ጲ'), []);
  for (const value of ['', 'door', 'በር', '።']) {
    assert.deepEqual(examplesForLetter(FIDEL_VOCABULARY, value), []);
  }
  assert.ok(examplesForFamily(FIDEL_VOCABULARY, 0x1330).length >= 2);
  assert.deepEqual(examplesForFamily(FIDEL_VOCABULARY, NaN), []);
});

test('course entries retain real lesson links and replace duplicate supplements', () => {
  const word = { id: 'course-door', amharic: 'በር።', arabic: 'باب', english: 'Door', transliteration: 'بَر' };
  const result = buildFidelExamples([{ lessonId: 'real-lesson', word }]);
  assert.equal(result.length, FIDEL_VOCABULARY.length);
  const door = result.find(w => w.id === 'course-door');
  assert.equal(door?.lessonId, 'real-lesson');
  assert.equal(result.some(w => w.amharic === 'በር'), false);
  assert.equal(FIDEL_VOCABULARY.find(w => w.amharic === 'በር')?.lessonId, undefined);
});

test('new course-only words join the bank; lesson ownership is not invented', () => {
  const word = { id: 'course-sentence', amharic: 'ይህ በር ነው።', arabic: 'هذا باب.', english: 'This is a door.', transliteration: 'يِه بَر نَو' };
  const result = buildFidelExamples([{ lessonId: 'sentence-lesson', word }]);
  assert.equal(result.length, FIDEL_VOCABULARY.length + 1);
  assert.ok(examplesForLetter(result, 'በ').some(w => w.lessonId === 'sentence-lesson'));
  assert.ok(examplesForLetter(result, 'በ').some(w => !w.lessonId));
});
