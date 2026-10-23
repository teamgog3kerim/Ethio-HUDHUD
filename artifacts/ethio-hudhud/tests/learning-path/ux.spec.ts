import { test, expect } from './learner-fixture';

test('mobile navigation keeps secondary destinations reachable and restores focus', async ({ page, learner }) => {
  test.skip(page.viewportSize()!.width > 600, 'Mobile navigation is intentionally hidden on desktop.');
  await page.goto('/learn');
  await expect(page.getByTestId('text-overall')).toBeVisible();
  const tabs = page.getByTestId('mobile-tabs');
  await expect(tabs.locator(':scope > a')).toHaveCount(4);
  await expect(page.getByTestId('tab-learn')).toHaveAttribute('aria-current', 'page');
  const more = page.getByTestId('tab-more');
  await more.click();
  const sheet = page.getByTestId('sheet-more');
  await expect(sheet).toBeVisible();
  for (const name of ['fidel', 'plan', 'progress', 'premium', 'account']) {
    await expect(page.getByTestId(`tab-${name}`)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(sheet).not.toBeVisible();
  await expect(more).toBeFocused();
  await more.click();
  await page.getByTestId('tab-progress').click();
  await expect(page).toHaveURL(/\/progress$/);
  await expect(sheet).not.toBeVisible();
  expect(learner.completed.size).toBe(0);
});

test('programme detail disclosure leaves the next lesson accessible', async ({ page, learner }) => {
  await page.goto('/learn');
  await expect(page.getByTestId('link-continue-learning')).toBeVisible();
  const details = page.getByTestId('details-programme');
  await expect(details).not.toHaveAttribute('open', '');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(details).toContainText('٧٥٪');
  await expect(page.getByTestId('link-continue-learning')).toBeVisible();
  expect(learner.completed.size).toBe(0);
});
