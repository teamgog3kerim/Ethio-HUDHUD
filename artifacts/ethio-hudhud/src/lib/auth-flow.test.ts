import test from 'node:test';
import assert from 'node:assert/strict';
import { paidPlanFromSearch, signInDestination, signUpDestination } from './auth-flow';

test('new trial signup goes straight to lessons, with no plan-save detour', () => {
  for (const search of ['', '?plan=trial', '?plan=invalid', '?redirect_url=https://untrusted.example']) {
    assert.equal(signUpDestination(search), '/learn');
  }
});

test('paid signup preserves the chosen plan for one checkout handoff', () => {
  for (const plan of ['monthly', 'six_month']) {
    assert.equal(signUpDestination(`?plan=${plan}`), `/choose-plan?plan=${plan}&checkout=1`);
    assert.equal(signInDestination(`?plan=${plan}`), `/choose-plan?plan=${plan}&checkout=1`);
  }
});

test('ordinary login uses the role-aware landing route, without starting checkout', () => {
  assert.equal(signInDestination(''), '/start');
  assert.equal(signInDestination('?plan=trial'), '/start');
  assert.equal(paidPlanFromSearch('?plan=trial'), null);
  assert.equal(paidPlanFromSearch('?plan=https://untrusted.example'), null);
});
