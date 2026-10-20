import type { Page } from '@playwright/test';
import { test, expect, lessons, switchIdentity, type Identity } from './progress-identity-fixture';

// Not completed by any of the fixture's three learners.
const lesson = lessons[4]!;
const completionPath = `/api/lessons/${lesson.id}/complete`;

async function startQuiz(page: Page) {
  while (await page.getByTestId('button-next-word').count()) {
    await page.getByTestId('button-next-word').click();
  }
  await page.getByTestId('button-start-quiz').click();
  await expect(page.getByTestId('button-option-0')).toBeEnabled();
}

async function submitQuiz(page: Page, passed: boolean) {
  await startQuiz(page);
  for (const [i, key] of lesson.answerKey.entries()) {
    const option = passed ? key.correctIndex : (key.correctIndex + 1) % lesson.content.exercises[i]!.options.length;
    await page.getByTestId(`button-option-${option}`).click();
    if (i < lesson.answerKey.length - 1) {
      await expect(page.getByText(lesson.content.exercises[i + 1]!.prompt, { exact: true })).toBeVisible();
    }
  }
}

async function noOutgoingResult(page: Page) {
  await expect(page.getByTestId('panel-result')).toHaveCount(0);
  await expect(page.getByTestId('text-score')).toHaveCount(0);
  await expect(page.getByText('+30 XP', { exact: true })).toHaveCount(0);
  // The mounted lesson must be a fresh reading session, not the old pending quiz.
  await expect(page.getByTestId('button-start-quiz').or(page.getByTestId('button-next-word'))).toBeVisible();
  await expect(page.getByTestId('button-option-0')).toHaveCount(0);
}

for (const incoming of ['progress-b', null] as Identity[]) {
  for (const passed of [true, false]) {
    test(`late ${passed ? 'passing' : 'failing'} completion stays with A after ${incoming ? 'switching to B' : 'signing out'}`, async ({ page, progress }) => {
      await page.addInitScript(() => {
        const calls: unknown[] = [];
        Object.assign(window, { completionInvalidations: calls });
        window.addEventListener('test-query-invalidation', event => calls.push((event as CustomEvent).detail));
      });
      await page.goto(`/lesson/${lesson.id}`);
      await switchIdentity(page, 'progress-a');
      await expect(page.getByTestId('text-path-progress')).toContainText('3 /');
      const before = new Map([...progress.records].map(([id, record]) =>
        [id, { xp: record.xp, completed: [...record.completed] }]));
      progress.hold = { identity: 'progress-a', paths: [completionPath] };
      await submitQuiz(page, passed);
      await expect.poll(() => progress.pending.map(p => p.path)).toEqual([completionPath]);
      expect(progress.submissions).toEqual([{
        identity: 'progress-a', id: lesson.id, score: passed ? 100 : 0, xpEarned: passed ? 30 : 0,
      }]);

      await switchIdentity(page, incoming);
      await expect(page.getByTestId('text-path-progress')).toContainText(`${incoming ? 4 : 2} /`);
      await noOutgoingResult(page);
      await page.waitForLoadState('networkidle');
      const readsBeforeRelease = [...progress.reads];
      const invalidations = () => page.evaluate(() =>
        (window as unknown as { completionInvalidations: unknown[] }).completionInvalidations);
      expect(await invalidations()).toEqual([]);
      const response = page.waitForResponse(r => r.url().endsWith(completionPath) && r.request().method() === 'POST');
      progress.release();
      expect((await response).status()).toBe(200);
      await page.waitForLoadState('networkidle');
      await noOutgoingResult(page);
      // Check both actual calls (including inactive queries) and network effects.
      expect(await invalidations()).toEqual([]);
      expect(progress.reads).toEqual(readsBeforeRelease);
      expect(progress.records.get(incoming)!.xp).toBe(before.get(incoming)!.xp);
      expect([...progress.records.get(incoming)!.completed]).toEqual(before.get(incoming)!.completed);

      // Return to the owner through navigation and reload: suppressing stale UI
      // must not undo a successfully committed completion.
      await switchIdentity(page, 'progress-a');
      await noOutgoingResult(page);
      await page.goto('/dashboard');
      await expect(page.getByTestId('text-greeting')).toHaveText('progress-a');
      await expect(page.getByTestId('text-xp')).toHaveText(String(before.get('progress-a')!.xp + (passed ? 30 : 0)));
      await page.reload();
      await expect(page.getByTestId('text-xp')).toHaveText(String(before.get('progress-a')!.xp + (passed ? 30 : 0)));
      await page.goto(`/lesson/${lesson.id}`);
      await expect(page.getByTestId('text-path-progress')).toContainText(`${passed ? 4 : 3} /`);
      expect(progress.records.get('progress-a')!.completed.has(lesson.id)).toBe(passed);
      expect(progress.submissions).toHaveLength(1);
    });
  }
}

test('A to B to A cannot revive the first session’s delayed result or invalidations', async ({ page, progress }) => {
  await page.addInitScript(() => {
    Object.assign(window, { completionInvalidations: [] });
    window.addEventListener('test-query-invalidation', event => {
      (window as unknown as { completionInvalidations: unknown[] }).completionInvalidations.push((event as CustomEvent).detail);
    });
  });
  await page.goto(`/lesson/${lesson.id}`);
  await switchIdentity(page, 'progress-a');
  await expect(page.getByTestId('text-path-progress')).toContainText('3 /');
  progress.hold = { identity: 'progress-a', paths: [completionPath] };
  await submitQuiz(page, true);
  await expect.poll(() => progress.pending.length).toBe(1);
  await switchIdentity(page, 'progress-b');
  await noOutgoingResult(page);
  await switchIdentity(page, 'progress-a');
  await expect(page.getByTestId('text-path-progress')).toContainText('4 /');
  await noOutgoingResult(page);
  const response = page.waitForResponse(r => r.url().endsWith(completionPath));
  progress.release();
  await response;
  await page.waitForLoadState('networkidle');
  await noOutgoingResult(page);
  expect(await page.evaluate(() =>
    (window as unknown as { completionInvalidations: unknown[] }).completionInvalidations)).toEqual([]);
  expect(progress.records.get('progress-a')!.xp).toBe(120);
  expect(progress.records.get('progress-b')!.xp).toBe(120);
  expect(progress.submissions).toHaveLength(1);
});
