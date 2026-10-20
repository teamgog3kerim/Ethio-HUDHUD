import type { Page } from '@playwright/test';
import { test, expect, boundary, afterBoundary, orderedCourses, orderedLessons } from './learner-fixture';

async function startQuiz(page: Page) {
  // Vocabulary lessons and conversations have different reading steps.
  while (await page.getByTestId('button-next-word').count()) {
    await page.getByTestId('button-next-word').click();
  }
  await page.getByTestId('button-start-quiz').click();
  await expect(page.getByTestId('button-option-0')).toBeVisible();
}

async function answerQuiz(page: Page, lesson: typeof boundary, correct: boolean) {
  for (const [i, key] of lesson.answerKey.entries()) {
    const index = correct ? key.correctIndex : (key.correctIndex + 1) % lesson.content.exercises[i]!.options.length;
    const option = page.getByTestId(`button-option-${index}`);
    await expect(option).toBeEnabled();
    await option.click();
    if (i < lesson.answerKey.length - 1) {
      await expect(page.getByText(lesson.content.exercises[i + 1]!.prompt, { exact: true })).toBeVisible();
    }
  }
}

async function expectReading(page: Page, lesson: typeof boundary) {
  await expect(page.locator('h1')).toHaveText(lesson.content.titleAr);
  await expect(page.getByTestId('panel-result')).toHaveCount(0);
  await expect(page.getByTestId('button-option-0')).toHaveCount(0);
  await expect(page.getByTestId('button-start-quiz').or(page.getByTestId('button-next-word'))).toBeVisible();
}

test('pass, reload and repeat retain exactly one completion and update resume/progress', async ({ page, learner }) => {
  await page.goto(`/lesson/${boundary.id}`);
  await expectReading(page, boundary);
  expect(learner.submissions).toHaveLength(0);
  await startQuiz(page);
  await answerQuiz(page, boundary, true);
  await expect(page.getByTestId('text-score')).toHaveText('100%');
  await expect(page.getByTestId('panel-result')).toContainText('+30 XP');
  await expect(page.getByTestId('text-path-progress')).toContainText('1 / 60');
  await expect(page.getByTestId('link-next-lesson')).toHaveAttribute('href', `/lesson/${afterBoundary.id}`);

  await page.reload();
  await expectReading(page, boundary);
  await expect(page.getByTestId('text-path-progress')).toContainText('1 / 60');
  expect(learner.submissions).toHaveLength(1);
  await startQuiz(page);
  await answerQuiz(page, boundary, true);
  await expect(page.getByTestId('panel-result')).toContainText('+0 XP');
  await page.getByTestId('link-back-learn').click();
  await expect(page.getByTestId('text-overall')).toContainText('1 / 60');
  await expect(page.getByTestId('link-continue-learning')).toHaveAttribute('href', `/lesson/${orderedLessons[0]!.id}`);
  await page.reload();
  await expect(page.getByTestId('text-overall')).toContainText('1 / 60');
  expect([...learner.completed]).toEqual([boundary.id]);
  expect(learner.submissions).toHaveLength(2);
});

test('a failed quiz and retry reset answers without awarding completion', async ({ page, learner }) => {
  await page.goto(`/lesson/${boundary.id}`);
  await expectReading(page, boundary);
  await startQuiz(page);
  await answerQuiz(page, boundary, false);
  await expect(page.getByTestId('text-score')).toHaveText('0%');
  await expect(page.getByTestId('panel-result')).not.toContainText('XP');
  await expect(page.getByTestId('link-next-lesson')).toHaveCount(0);
  expect(learner.completed.size).toBe(0);
  await page.getByTestId('button-retry-lesson').click();
  await expect(page.getByTestId('panel-result')).toHaveCount(0);
  await expect(page.getByTestId('button-option-0')).toBeEnabled();
  await expect(page.getByText(boundary.content.exercises[0]!.prompt, { exact: true })).toBeVisible();
  expect(learner.submissions).toHaveLength(1);
  expect(learner.completed.size).toBe(0);
  await answerQuiz(page, boundary, false);
  await expect(page.getByTestId('text-score')).toHaveText('0%');
  await page.getByTestId('link-back-learn').click();
  await expect(page.getByTestId('text-overall')).toContainText('0 / 60');
  await page.reload();
  await expect(page.getByTestId('text-overall')).toContainText('0 / 60');
  expect(learner.completed.size).toBe(0);
});

test('grading request failure can be retried without premature progress', async ({ page, learner }) => {
  await page.goto(`/lesson/${boundary.id}`);
  await expectReading(page, boundary);
  await startQuiz(page);
  learner.failNext = true;
  await answerQuiz(page, boundary, true);
  const retry = page.getByTestId('button-retry');
  await expect(retry).toBeVisible();
  await expect(page.getByTestId('panel-result')).toHaveCount(0);
  expect(learner.completed.size).toBe(0);
  await retry.click();
  await expect(page.getByTestId('text-score')).toHaveText('100%');
  expect(learner.submissions).toHaveLength(2);
  expect(learner.submissions[1]).toEqual(learner.submissions[0]);
  expect(learner.completed.size).toBe(1);
});

test('Next and Back cross every month boundary without completing browsed lessons', async ({ page, learner }) => {
  for (const course of orderedCourses.slice(0, -1)) {
    const last = orderedLessons.filter(l => l.courseId === course.id).at(-1)!;
    const next = orderedLessons[orderedLessons.indexOf(last) + 1]!;
    await page.goto(`/lesson/${last.id}`);
    await expectReading(page, last);
    await page.getByTestId('link-next-lesson-top').click();
    await expect(page).toHaveURL(`/lesson/${next.id}`);
    await expectReading(page, next);
    await expect(page.getByTestId('text-lesson-position')).toContainText(`الشهر ${course.month + 1}`);
    await page.getByTestId('link-prev-lesson').click();
    await expect(page).toHaveURL(`/lesson/${last.id}`);
    await expectReading(page, last);
  }
  await page.goto(`/lesson/${orderedLessons[0]!.id}`);
  await expectReading(page, orderedLessons[0]!);
  await expect(page.getByTestId('link-prev-lesson')).toHaveCount(0);
  await page.goto(`/lesson/${orderedLessons.at(-1)!.id}`);
  await expectReading(page, orderedLessons.at(-1)!);
  await expect(page.getByTestId('link-next-lesson-top')).toHaveCount(0);
  expect(learner.submissions).toHaveLength(0);
  expect(learner.completed.size).toBe(0);
});

test('route changes clear partial answers, delayed callbacks and old results', async ({ page, learner }) => {
  await page.goto(`/lesson/${boundary.id}`);
  await expectReading(page, boundary);
  await startQuiz(page);
  // Navigate while the selected answer's 320ms callback is still queued.
  await page.getByTestId('button-option-0').click();
  await page.getByTestId('link-next-lesson-top').click();
  await expectReading(page, afterBoundary);
  await page.getByTestId('link-prev-lesson').click();
  await expectReading(page, boundary);
  await startQuiz(page);
  await expect(page.getByText(boundary.content.exercises[0]!.prompt, { exact: true })).toBeVisible();
  await expect(page.getByTestId('button-option-0')).toBeEnabled();
  await answerQuiz(page, boundary, true);
  await expect(page.getByTestId('panel-result')).toBeVisible();
  await page.getByTestId('link-next-lesson').click();
  await expectReading(page, afterBoundary);
  await page.getByTestId('link-prev-lesson').click();
  await expectReading(page, boundary);
  expect(learner.submissions).toHaveLength(1);
});

test('Arabic month controls, mobile fit and reduced-motion CSS remain usable', async ({ page, learner }, testInfo) => {
  await page.goto('/learn');
  await expect(page.getByTestId('panel-overall')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  for (let month = 1; month <= 6; month++) {
    await expect(page.getByTestId('panel-course')).toContainText(`الشهر ${month} / 6`);
    if (month === 1) await expect(page.getByTestId('button-prev-month')).toBeDisabled();
    else await expect(page.getByTestId('button-prev-month')).toBeEnabled();
    if (month === 6) await expect(page.getByTestId('button-next-month')).toBeDisabled();
    else await expect(page.getByTestId('button-next-month')).toBeEnabled();
    if (month < 6) await page.getByTestId('button-next-month').click();
  }
  await page.getByTestId('button-prev-month').click();
  await expect(page.getByTestId('panel-course')).toContainText('الشهر 5 / 6');
  for (const stage of ['beginner', 'intermediate', 'advanced']) {
    await expect(page.getByTestId(`stage-${stage}`)).toBeVisible();
  }
  const fit = async () => {
    // Result/marker entrance animations can briefly enlarge the document.
    // Assert the settled layout with a bounded wait, not a single frame.
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  };
  await fit();
  if (testInfo.project.name.includes('reduced-motion')) {
    const timing = await page.getByTestId('stage-beginner').evaluate(el => {
      const style = getComputedStyle(el);
      return { animation: style.animationDuration, transition: style.transitionDuration };
    });
    expect(parseFloat(timing.animation)).toBeLessThanOrEqual(0.001);
    expect(parseFloat(timing.transition)).toBeLessThanOrEqual(0.001);
  }
  await page.goto(`/lesson/${boundary.id}`);
  await expectReading(page, boundary);
  await fit();
  await startQuiz(page);
  await fit();
  await answerQuiz(page, boundary, false);
  await expect(page.getByTestId('panel-result')).toBeVisible();
  await fit();
  expect(learner.completed.size).toBe(0);
});
