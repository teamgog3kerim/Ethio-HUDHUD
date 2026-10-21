import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('missing public build configuration produces actionable errors before compilation', () => {
  const script = fileURLToPath(new URL('./build.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [script], {
    env: { PATH: process.env.PATH },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /VITE_PUBLIC_APP_URL is required/);
  assert.match(result.stderr, /VITE_CLERK_PUBLISHABLE_KEY is required/);
  assert.match(result.stderr, /EthioDeploy project settings/);
  assert.match(result.stderr, /docs\/ETHIODEPLOY\.md/);
  assert.equal(result.stdout.includes('[deploy:build] pnpm'), false);
});
