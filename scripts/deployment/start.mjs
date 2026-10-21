import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateDeploymentEnv } from './config.mjs';

try { validateDeploymentEnv(process.env, { runtime: true }); }
catch (error) { console.error(error.message); process.exit(1); }

process.env.NODE_ENV = 'production';
process.env.PORT ||= '3000';
process.env.SERVE_WEB_APP = 'true';
const root = fileURLToPath(new URL('../../', import.meta.url));
// Explicit opt-in for a fresh database or an established migration-managed DB.
// Never automatically adopt an existing push-managed production database.
if (process.env.RUN_DATABASE_MIGRATIONS === 'true') {
  const result = spawnSync('pnpm', ['run', 'deploy:migrate'], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
await import('../../artifacts/api-server/dist/index.mjs');
