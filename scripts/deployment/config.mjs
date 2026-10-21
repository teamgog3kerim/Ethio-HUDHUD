export function validateDeploymentEnv(env, { runtime = false } = {}) {
  const required = runtime
    ? ['DATABASE_URL', 'SESSION_SECRET', 'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'PUBLIC_APP_URL']
    : ['VITE_CLERK_PUBLISHABLE_KEY', 'VITE_PUBLIC_APP_URL'];
  const errors = required.filter(key => !env[key]?.trim()).map(key => `${key} is required`);
  for (const key of ['VITE_PUBLIC_APP_URL', 'PUBLIC_APP_URL']) {
    if (!env[key]) continue;
    try {
      const url = new URL(env[key]);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
        errors.push(`${key} must be an HTTPS origin without a path, credentials, query, or fragment`);
      }
    } catch { errors.push(`${key} must be a valid HTTPS origin`); }
  }
  if (env.PUBLIC_APP_URL && env.VITE_PUBLIC_APP_URL && env.PUBLIC_APP_URL.replace(/\/$/, '') !== env.VITE_PUBLIC_APP_URL.replace(/\/$/, '')) {
    errors.push('Frontend and backend public origins must match');
  }
  if (runtime) {
    const port = Number(env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT must be an integer between 1 and 65535');
    if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) errors.push('SESSION_SECRET must contain at least 32 characters');
    if (env.DATABASE_URL && !/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL)) errors.push('DATABASE_URL must be a PostgreSQL connection URL');
    if (env.CLERK_SECRET_KEY && !env.CLERK_SECRET_KEY.startsWith('sk_live_')) errors.push('CLERK_SECRET_KEY must be a production sk_live_ key');
    if (env.CLERK_PUBLISHABLE_KEY && !env.CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')) errors.push('CLERK_PUBLISHABLE_KEY must be a production pk_live_ key');
  } else if (env.VITE_CLERK_PUBLISHABLE_KEY && !env.VITE_CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')) {
    errors.push('VITE_CLERK_PUBLISHABLE_KEY must be a production pk_live_ key');
  }
  if (env.VITE_CLERK_PUBLISHABLE_KEY && env.CLERK_PUBLISHABLE_KEY && env.VITE_CLERK_PUBLISHABLE_KEY !== env.CLERK_PUBLISHABLE_KEY) {
    errors.push('Frontend and backend Clerk publishable keys must match');
  }
  if (errors.length) throw new Error(errors.join('\n'));
}
