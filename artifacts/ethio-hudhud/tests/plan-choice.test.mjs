import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(
  readFileSync(new URL('../src/lib/plan-choice.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText, { exports, URLSearchParams });

test('all plan choices survive the sign-up redirect without accepting arbitrary URLs', () => {
  for (const plan of ['trial', 'monthly', 'six_month']) {
    assert.equal(exports.parsePlanChoice(plan), plan);
    assert.equal(exports.planChoicePath(`?plan=${plan}&redirect_url=https://other.example`), `/choose-plan?plan=${plan}`);
  }
  for (const value of [null, '', 'admin', '//other.example', 'https://other.example', 'monthly%26other=true']) {
    assert.equal(exports.parsePlanChoice(value), null);
    assert.equal(exports.planChoicePath(`?plan=${encodeURIComponent(value ?? '')}`), '/choose-plan');
  }
  assert.equal(exports.planChoicePath(''), '/choose-plan');
});
