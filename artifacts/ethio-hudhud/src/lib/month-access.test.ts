import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { isMonthLocked, monthRequiredFromError, subscribeHref } from './month-access';

test('either server source can deny access, including fresh billing with old unlocked catalog', () => {
  assert.equal(isMonthLocked(2, [1, 2], true), true);
  assert.equal(isMonthLocked(2, [1], false), true);
  assert.equal(isMonthLocked(1, [1], false), false);
});
test('falls back to accessibleMonths', () => { assert.equal(isMonthLocked(3, [1, 2]), true); assert.equal(isMonthLocked(2, [1, 2]), false); });
test('unknown stays unlocked', () => { assert.equal(isMonthLocked(3), false); });
test('parses 403', () => {
  assert.equal(monthRequiredFromError({ status: 403, data: { code: 'COURSE_MONTH_REQUIRED', month: 4 } }), 4);
  assert.equal(monthRequiredFromError({ status: 403, data: { code: 'X' } }), null);
});
test('pending avoids plan preselect', () => { assert.equal(subscribeHref(true), '/choose-plan'); assert.equal(subscribeHref(false), '/choose-plan?plan=monthly'); });
