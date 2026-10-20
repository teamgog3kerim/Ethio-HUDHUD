import type { Page } from '@playwright/test';
import { test, expect, lessons, identities, switchIdentity, type Identity } from './progress-identity-fixture';

const completedCount = (identity: Identity) => identities.indexOf(identity) + 2;
const resume = (identity: Identity) => `/lesson/${lessons[completedCount(identity) - 1]!.id}`;

async function dashboard(page: Page, identity: Identity) {
  await expect(page.getByTestId('text-greeting')).toHaveText(identity ?? 'ضيف');
  await expect(page.getByTestId('text-xp')).toHaveText(String(completedCount(identity) * 30));
  await expect(page.getByTestId('button-next-lesson')).toHaveAttribute('href', resume(identity));
}

async function navigate(page: Page, destination: 'dashboard' | 'learn') {
  await page.getByTestId(`${page.viewportSize()!.width < 1024 ? 'tab' : 'nav'}-${destination}`).click();
}

async function learn(page: Page, identity: Identity) {
  await expect(page.getByTestId('text-overall')).toContainText(`${completedCount(identity)} / ${lessons.length}`);
  await expect(page.getByTestId('link-continue-learning')).toHaveAttribute('href', resume(identity));
  // Inspect individual completed markers, not just a potentially correct total.
  for (const [index, lesson] of lessons.filter(l => l.courseId === lessons[0]!.courseId).entries()) {
    const link = page.locator(`[data-testid="panel-course"] a[href="/lesson/${lesson.id}"]`);
    await expect(link).toBeVisible();
    const completed = index < completedCount(identity) - 1 || index === identities.indexOf(identity) + 5;
    await expect(link.locator('svg.lucide-circle-check')).toHaveCount(completed ? 1 : 0);
  }
}

test('progress stays with guest, account A and account B through mounted switches and reloads', async ({ page, progress }) => {
  test.setTimeout(90_000);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await dashboard(page, null);
  const reloaded = new Set<Identity>();
  // The same page and query client stay mounted during each identity change.
  for (const identity of ['progress-a', 'progress-b', null, 'progress-b', 'progress-a', null] as Identity[]) {
    await switchIdentity(page, identity);
    await dashboard(page, identity);
    if (!reloaded.has(identity)) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await dashboard(page, identity);
    }
    await navigate(page, 'learn');
    await learn(page, identity);
    if (!reloaded.has(identity)) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await learn(page, identity);
      reloaded.add(identity);
    }
    await navigate(page, 'dashboard');
    await dashboard(page, identity);
  }
  expect([...progress.records.values()].map(r => [r.completed.size, r.xp])).toEqual([[2, 60], [3, 90], [4, 120]]);
});

test('mounted Learn clears the old completions and resume link before the new account responds', async ({ page, progress }) => {
  await page.goto('/learn');
  await learn(page, null);
  for (const identity of ['progress-a', 'progress-b', null] as Identity[]) {
    const oldResume = await page.getByTestId('link-continue-learning').getAttribute('href');
    progress.hold = { identity, paths: ['/api/courses'] };
    await switchIdentity(page, identity);
    await expect.poll(() => progress.pending.filter(p => p.identity === identity).length).toBeGreaterThan(0);
    await expect(page.getByTestId('text-overall')).toHaveCount(0);
    await expect(page.getByTestId('panel-course')).toHaveCount(0);
    await expect(page.locator(`a[data-testid="link-continue-learning"][href="${oldResume}"]`)).toHaveCount(0);
    progress.release();
    await learn(page, identity);
  }
});

test('late progress and courses from an outgoing account cannot overwrite the current learner', async ({ page, progress }) => {
  await page.goto('/dashboard');
  await dashboard(page, null);
  for (const [outgoing, incoming] of [
    ['progress-a', 'progress-b'], ['progress-a', null],
  ] as [Identity, Identity][]) {
    progress.hold = { identity: outgoing, paths: ['/api/progress/summary', '/api/courses'] };
    await switchIdentity(page, outgoing);
    await expect.poll(() => progress.pending.filter(p => p.identity === outgoing).map(p => p.path).sort())
      .toEqual(['/api/courses', '/api/progress/summary']);
    await expect(page.getByTestId('text-xp')).toHaveText('0');
    await expect(page.getByTestId('button-next-lesson')).toHaveCount(0);
    await switchIdentity(page, incoming);
    await dashboard(page, incoming);
    progress.release();
    // Wait for the deliberately delayed network work to settle before asserting
    // it did not repopulate the active observers with the outgoing owner's data.
    await page.waitForLoadState('networkidle');
    await dashboard(page, incoming);
    await navigate(page, 'learn');
    await learn(page, incoming);
    await navigate(page, 'dashboard');
  }
});
