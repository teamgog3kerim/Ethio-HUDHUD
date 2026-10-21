import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateDeploymentEnv } from './config.mjs';

try { validateDeploymentEnv(process.env); }
catch (error) {
  console.error('Deployment build configuration is incomplete or invalid:');
  console.error(error.message);
  console.error('Set these variables in EthioDeploy project settings, then rebuild. See docs/ETHIODEPLOY.md. Do not paste secret values into build logs.');
  process.exit(1);
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const env = { ...process.env, NODE_ENV: 'production', BASE_PATH: '/', PORT: process.env.PORT || '3000' };
for (const args of [
  ['run', 'typecheck:libs'],
  ['--filter', '@workspace/api-server', 'run', 'typecheck'],
  ['--filter', '@workspace/ethio-hudhud', 'run', 'typecheck'],
  ['--filter', '@workspace/api-server', 'run', 'build'],
  ['--filter', '@workspace/ethio-hudhud', 'run', 'build'],
]) {
  console.log(`\n[deploy:build] pnpm ${args.join(' ')}`);
  const result = spawnSync('pnpm', args, { cwd: root, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(`[deploy:build] Failed step: pnpm ${args.join(' ')}${result.error ? ` (${result.error.message})` : ''}`);
    process.exit(result.status || 1);
  }
}
