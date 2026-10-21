import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

test('host default build uses the same web/API builder as the explicit deploy command', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.build, pkg.scripts['deploy:build']);
  assert.ok(pkg.scripts['build:workspace'], 'Keep the full workspace build available explicitly');
});

test('package-manager bootstrap survives a host install-command override', () => {
  const config = readFileSync(new URL('../../nixpacks.toml', import.meta.url), 'utf8');
  const setup = config.split('[phases.setup]')[1].split('[phases.install]')[0];
  const install = config.split('[phases.install]')[1].split('[phases.build]')[0];
  assert.match(setup, /npm install --prefix \/opt\/hudhud-tools .*pnpm@10\.26\.1/);
  assert.match(setup, /paths = \["\/opt\/hudhud-tools\/node_modules\/\.bin"\]/);
  assert.match(config, /^NIXPACKS_PATH = "\/opt\/hudhud-tools\/node_modules\/\.bin:\/app\/node_modules\/\.bin"$/m);
  assert.doesNotMatch(install, /npm install --prefix/);
  assert.match(install, /pnpm install --frozen-lockfile --prod=false/);
});

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
