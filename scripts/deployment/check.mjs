import { validateDeploymentEnv } from './config.mjs';

try {
  validateDeploymentEnv(process.env);
  validateDeploymentEnv(process.env, { runtime: true });
  console.log('Required deployment settings are present and structurally valid. Provider credentials, DNS and connectivity still require live verification.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
