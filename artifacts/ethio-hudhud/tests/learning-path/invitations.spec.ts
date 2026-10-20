import { test, expect } from './learner-fixture';

const publicUrl = 'https://ethio-hudhud.replit.app';

test.beforeEach(async ({ learner, page }) => {
  void learner;
  await page.route('**/api/progress/summary', route => route.fulfill({ json: {
    xp: 0, streak: 0, todayMinutes: 0, lessonsCompleted: 0, totalLessons: 70,
  } }));
  await page.route('**/api/vocabulary', route => route.fulfill({ json: [] }));
  await page.route('**/api/study-plan', route => route.fulfill({ json: [] }));
});

test('templates, editing, copying and native sharing keep the public link', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { sessionStorage.setItem('copied-invite', text); },
    } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => {
      sessionStorage.setItem('shared-invite', JSON.stringify(data));
    } });
  });
  await page.goto('/dashboard');
  await page.getByTestId('button-invite-friend').click();
  const dialog = page.getByTestId('dialog-invite-friend');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('radio')).toHaveCount(4);
  await page.getByTestId('invite-template-2').click();
  await expect(page.getByTestId('input-invite-message')).toHaveValue(/هل تريد تعلّم اللغة الأمهرية؟/);
  await page.getByTestId('input-invite-message').fill('لنتعلّم الأمهرية معاً & نبدأ اليوم!');
  await expect(page.getByTestId('text-invite-preview')).toContainText(publicUrl);
  const text = await page.getByTestId('text-invite-preview').innerText();
  const whatsapp = new URL((await page.getByTestId('link-invite-whatsapp').getAttribute('href'))!);
  expect(whatsapp.searchParams.get('text')).toBe(text);
  const telegram = new URL((await page.getByTestId('link-invite-telegram').getAttribute('href'))!);
  expect(telegram.searchParams.get('url')).toBe(publicUrl);
  await page.getByTestId('button-copy-invite').click();
  await expect(page.getByTestId('invite-status')).toContainText('تم نسخ الرسالة');
  expect(await page.evaluate(() => sessionStorage.getItem('copied-invite'))).toBe(text);
  await page.getByTestId('button-share-invite').click();
  const shared = JSON.parse((await page.evaluate(() => sessionStorage.getItem('shared-invite')))!);
  expect(shared.text).toBe(text);
  expect(shared.title).toBe('Ethio HUDHUD');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId('button-invite-friend')).toBeFocused();
});

test('cancelled sharing is silent; failed share and copy keep manual fallback available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); },
    } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => {
      if (!sessionStorage.getItem('share-attempted')) {
        sessionStorage.setItem('share-attempted', '1');
        throw new DOMException('Cancelled', 'AbortError');
      }
      throw new Error('Share failed');
    } });
  });
  await page.goto('/account');
  await page.getByTestId('button-invite-friend').click();
  await page.getByTestId('button-share-invite').click();
  await expect(page.getByTestId('button-share-invite')).toBeEnabled();
  await expect(page.getByTestId('invite-status')).toBeEmpty();
  await page.getByTestId('button-share-invite').click();
  await expect(page.getByTestId('invite-status')).toContainText('تعذّر');
  await page.getByTestId('input-invite-message').fill('رسالة معدّلة');
  await page.getByTestId('button-copy-invite').click();
  await expect(page.getByTestId('invite-status')).toContainText('يدويًا');
  await expect(page.getByTestId('input-invite-message')).toHaveValue(/https:\/\/ethio-hudhud\.replit\.app/);
  await expect(page.getByTestId('link-invite-whatsapp')).toBeVisible();
});

test('unsupported sharing offers copy/social links and templates support arrow keys', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
  await page.goto('/dashboard');
  await page.getByTestId('button-invite-friend').click();
  await page.getByTestId('invite-template-0').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('invite-template-1')).toBeFocused();
  await expect(page.getByTestId('invite-template-1')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('button-share-invite').click();
  await expect(page.getByTestId('invite-status')).not.toBeEmpty();
  await expect(page.getByTestId('button-copy-invite')).toBeEnabled();
  const dialog = page.getByTestId('dialog-invite-friend');
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});
