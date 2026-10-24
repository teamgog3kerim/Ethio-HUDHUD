import { test, expect } from './billing-fixture';

for (const lang of ['ar', 'en'] as const) {
  for (const original of ['monthly', 'six_month'] as const) {
    test(`unpaid ${original} checkout resumes the original when another plan is selected (${lang})`, async ({ page, context, billing }) => {
      billing.lang = lang;
      await page.addInitScript(language => localStorage.setItem('hh-lang', language), lang);
      await page.addInitScript(() => {
        sessionStorage.setItem('test-identity', 'billing-account');
        document.cookie = 'test-identity=billing-account; Path=/';
      });
      const record = billing.records.get('billing-account')!;
      Object.assign(record, {
        liveCheckoutEnabled: true, liveMonthlyCheckoutEnabled: true,
        paymentVerificationPending: true, hasLivePurchase: true,
        pendingCheckoutPlan: original, pendingCheckoutId: 'original-checkout',
        pendingCheckoutExpiresAt: '2099-10-24T12:34:56.000Z',
        resumablePlan: original, monthlyPaymentCount: 0, monthlyPaymentLimit: 6,
        monthlyCanPurchase: false,
      });
      const reads: string[] = [];
      let status = 'pending';
      let fail = false;
      await context.route('**/api/billing/polar/live/checkout/**', async route => {
        reads.push(route.request().method());
        expect(route.request().url()).toContain('/original-checkout');
        if (fail) return route.fulfill({ status: 502, json: { error: 'Mock Polar unavailable' } });
        if (status === 'expired') Object.assign(record, {
          pendingCheckoutPlan: null, pendingCheckoutId: null, pendingCheckoutExpiresAt: null,
          resumablePlan: null, paymentVerificationPending: false, monthlyCanPurchase: true,
        });
        await route.fulfill({ json: {
          id: 'original-checkout', environment: 'live', plan: original, status,
          checkoutUrl: status === 'pending' ? 'https://polar.sh/checkout/original-checkout' : null,
          accessUntil: null, subscriptionStatus: null, cancelAtPeriodEnd: false, verifiedAt: new Date().toISOString(),
        } });
      });
      await context.route('https://polar.sh/checkout/original-checkout', route => route.fulfill({
        contentType: 'text/html', body: '<h1>Mock original checkout — no payment provider</h1>',
      }));
      const other = original === 'monthly' ? 'six_month' : 'monthly';
      await page.goto(`/choose-plan?plan=${other}`);
      await expect(page.getByTestId('pending-checkout')).toBeVisible();
      await expect(page.getByTestId('pending-checkout-plan')).toContainText(original === 'monthly' ? '29' : '149');
      await expect(page.getByTestId('pending-checkout-expiry')).toHaveAttribute('datetime', '2099-10-24T12:34:56.000Z');
      await expect(page.getByTestId('pending-checkout-expiry')).toContainText('12:34:56');
      await expect(page.getByTestId('button-live-checkout')).toHaveCount(0);
      await expect(page.getByTestId(`button-choose-${other}`)).toBeChecked();
      await expect(page.getByTestId('button-resume-checkout')).toContainText(original === 'monthly' ? '29' : '149');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      // Reload and another plan selection must not erase the original intent.
      await page.reload();
      await page.getByTestId(`button-choose-${other}`).click();
      await expect(page.getByTestId('button-live-checkout')).toHaveCount(0);
      await page.getByTestId('button-resume-checkout').click();
      await expect(page).toHaveURL('https://polar.sh/checkout/original-checkout');
      expect(reads).toEqual(['GET']);

      // A stale resume must not create a new same-plan checkout after expiry.
      await page.goto(`/choose-plan?plan=${other}`);
      await expect(page.getByTestId('button-resume-checkout')).toBeEnabled();
      status = 'expired';
      await page.getByTestId('button-resume-checkout').click();
      await expect(page.getByRole('alert')).toContainText(lang === 'ar' ? 'لم يعد رابط الدفع' : 'no longer available');
      await expect(page).toHaveURL(new RegExp(`/choose-plan\\?plan=${other}$`));
      await expect(page.getByTestId('pending-checkout')).toHaveCount(0);
      await expect(page.getByTestId('button-live-checkout')).toBeEnabled();
      expect(reads).toEqual(['GET', 'GET']);

      // An outage never clears the pending block. Explicit status checking is
      // read-only and refreshes immediately, not after the polling interval.
      Object.assign(record, {
        pendingCheckoutPlan: original, pendingCheckoutId: 'original-checkout',
        pendingCheckoutExpiresAt: '2020-01-01T12:34:56.000Z',
        resumablePlan: null, paymentVerificationPending: true, monthlyCanPurchase: false,
      });
      await page.reload();
      fail = true;
      await page.getByTestId('button-check-checkout').click();
      await expect(page.getByRole('alert')).toContainText(lang === 'ar' ? 'يبقى تغيير الخطة متوقفاً' : 'Switching stays blocked');
      await expect(page.getByTestId('pending-checkout')).toBeVisible();
      await expect(page.getByTestId('button-live-checkout')).toHaveCount(0);
      await expect(page.getByTestId('button-resume-checkout')).toHaveCount(0);
      fail = false;
      await page.getByTestId('button-check-checkout').click();
      await expect(page.getByTestId('pending-checkout')).toHaveCount(0);
      await expect(page.getByTestId('button-live-checkout')).toBeEnabled();
      expect(reads.every(method => method === 'GET')).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    });
  }
}
