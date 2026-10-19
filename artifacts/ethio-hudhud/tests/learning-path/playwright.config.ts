import { defineConfig } from '@playwright/test';
import { spawnSync } from 'node:child_process';

// NixOS provides a wrapped Chromium with its shared libraries. Other machines
// use Playwright's pinned browser, installed via `playwright install chromium`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (spawnSync('which', ['chromium'], { encoding: 'utf8' }).stdout?.trim() || undefined);

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: true,
  workers: 2,
  forbidOnly: true,
  retries: 0,
  timeout: 45_000,
  outputDir: '../../../../generated-artifacts/learning-path',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4179',
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'arabic-mobile-reduced-motion', use: {
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
    } },
  ],
  webServer: {
    command: 'pnpm exec vite --config tests/learning-path/vite.config.ts',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
  },
});
