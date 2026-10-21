import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDeploymentEnv } from './config.mjs';

// Synthetic strings only; these tests do not contact providers.
const env = {
  VITE_PUBLIC_APP_URL: 'https://example.com',
  PUBLIC_APP_URL: 'https://example.com',
  VITE_CLERK_PUBLISHABLE_KEY: 'pk_live_fixture',
  CLERK_PUBLISHABLE_KEY: 'pk_live_fixture',
  CLERK_SECRET_KEY: 'sk_live_fixture',
  SESSION_SECRET: 'synthetic-test-only-value-32-characters',
  DATABASE_URL: 'postgresql://example.invalid/db',
};
test('portable build needs no database or provider secret', () => {
  validateDeploymentEnv({ VITE_PUBLIC_APP_URL: env.VITE_PUBLIC_APP_URL, VITE_CLERK_PUBLISHABLE_KEY: env.VITE_CLERK_PUBLISHABLE_KEY });
});
test('runtime validates presence without exposing secret values', () => {
  validateDeploymentEnv(env, { runtime: true });
  assert.throws(() => validateDeploymentEnv({}, { runtime: true }), /DATABASE_URL is required/);
});
test('invalid origins, test keys, ports, and mismatched tenants fail closed', () => {
  for (const url of ['http://example.com', 'https://example.com/path', 'https://example.com/?token=test', 'https://a:b@example.com', 'not-a-url']) {
    assert.throws(() => validateDeploymentEnv({ ...env, VITE_PUBLIC_APP_URL: url }));
  }
  assert.throws(() => validateDeploymentEnv({ ...env, VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_fixture' }), /production/);
  assert.throws(() => validateDeploymentEnv({ ...env, PORT: '3.5' }, { runtime: true }), /PORT/);
  assert.throws(() => validateDeploymentEnv({ ...env, CLERK_PUBLISHABLE_KEY: 'pk_live_other' }), /match/);
  assert.throws(() => validateDeploymentEnv({ ...env, PUBLIC_APP_URL: 'https://other.example.com' }), /origins must match/);
});
