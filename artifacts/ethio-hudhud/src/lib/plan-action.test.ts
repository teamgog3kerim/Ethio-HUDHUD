import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { status } from '../../tests/learning-path/billing-data';
import { planAction } from './plan-action';

const live = () => ({
  ...status(false), configured: true, enforcementEnabled: true,
  fullCourseAccess: false, liveCheckoutEnabled: true, liveMonthlyCheckoutEnabled: true,
  monthlyPaymentCount: 0, monthlyPaymentLimit: 6, monthlyCanPurchase: true,
});

test('unselected account waits for a plan; guest goes to signup without payment', () => {
  assert.equal(planAction(live(), null, true).kind, 'choose');
  assert.equal(planAction(live(), 'monthly', false).kind, 'signup');
  assert.equal(planAction(undefined, 'monthly', true).kind, 'loading');
});
test('monthly and six-month selection each lead directly to the same live action', () => {
  assert.equal(planAction(live(), 'monthly', true).kind, 'live');
  assert.equal(planAction(live(), 'six_month', true).kind, 'live');
});
test('only unexpired trials can continue free learning under enforcement', () => {
  const b = live();
  assert.equal(planAction(b, 'trial', true).kind, 'choose');
  b.trial.state = 'active';
  assert.equal(planAction(b, 'trial', true).kind, 'trial');
});
test('active covered buyers use the portal instead of paying again', () => {
  const b = { ...live(), paidPlan: 'six_month' as const, fullCourseAccess: true, hasLivePurchase: true, monthlyCanPurchase: false };
  assert.equal(planAction(b, 'six_month', true).kind, 'portal');
  assert.equal(planAction(b, null, true).kind, 'portal');
});
test('eligible manual renewals retain checkout and a subordinate receipts action', () => {
  const b = { ...live(), paidPlan: 'monthly' as const, fullCourseAccess: true, hasLivePurchase: true };
  const a = planAction(b, 'monthly', true);
  assert.equal(a.kind, 'live');
  assert.equal(a.portalSecondary, true);
});
test('pending verification offers status or portal, never a new purchase', () => {
  const b = { ...live(), paymentVerificationPending: true };
  assert.equal(planAction(b, 'six_month', true).kind, 'status');
  assert.equal(planAction({ ...b, hasLivePurchase: true }, 'monthly', true).kind, 'portal');
});
test('pending monthly can only resume the same monthly checkout', () => {
  const b = { ...live(), paymentVerificationPending: true, resumablePlan: 'monthly' as const };
  assert.equal(planAction(b, 'monthly', true).kind, 'live');
  assert.equal(planAction(b, 'six_month', true).kind, 'status');
});
test('monthly cap and missing count/limit fail closed despite contradictory eligibility', () => {
  for (const fields of [
    { monthlyPaymentCount: 6 }, { monthlyPaymentCount: undefined },
    { monthlyPaymentLimit: undefined }, { monthlyCanPurchase: false },
    { monthlyPaymentCount: 6, resumablePlan: 'monthly' as const },
  ]) {
    assert.equal(planAction({ ...live(), ...fields }, 'monthly', true).kind, 'unavailable');
  }
});
test('past buyers can reach receipts even if renewal is closed', () => {
  assert.equal(planAction({ ...live(), hasLivePurchase: true, monthlyCanPurchase: false }, 'monthly', true).kind, 'portal');
});
test('failed billing refresh disables purchase and portal mutations', () => {
  assert.equal(planAction(live(), 'six_month', true, true).kind, 'refresh');
  assert.equal(planAction({ ...live(), hasLivePurchase: true }, null, true, true).kind, 'refresh');
});
test('sandbox is explicit and cannot replace an enabled live checkout', () => {
  assert.equal(planAction({ ...live(), liveCheckoutEnabled: false, sandboxCheckoutEnabled: true }, 'six_month', true).kind, 'sandbox');
  assert.equal(planAction({ ...live(), sandboxCheckoutEnabled: true }, 'six_month', true).kind, 'live');
});
test('missing offer never permits a paid checkout', () => {
  assert.equal(planAction({ ...live(), offers: [] }, 'six_month', true).kind, 'unavailable');
});
