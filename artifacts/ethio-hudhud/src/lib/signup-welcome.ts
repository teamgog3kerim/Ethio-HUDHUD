export const WELCOME_DURATION_MS = 2000;
const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;
const FIRST_SESSION_WINDOW_MS = 60 * 1000;
const shownThisPage = new Set<string>();

export function isNewGoogleSignup(
  accountCreatedAt: number,
  sessionCreatedAt: number,
  hasGoogleAccount: boolean,
  now = Date.now(),
): boolean {
  if (!hasGoogleAccount || !Number.isFinite(accountCreatedAt) || !Number.isFinite(sessionCreatedAt)) return false;
  const age = now - accountCreatedAt;
  const firstSessionDelay = sessionCreatedAt - accountCreatedAt;
  return age >= -5000 && age <= NEW_ACCOUNT_WINDOW_MS
    && firstSessionDelay >= -5000 && firstSessionDelay <= FIRST_SESSION_WINDOW_MS;
}

// Store a display preference only, never a token, email or entitlement.
export function claimSignupWelcome(
  userId: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): boolean {
  if (!userId || shownThisPage.has(userId)) return false;
  const key = `hh-signup-welcome:${userId}`;
  try {
    if (storage?.getItem(key) === '1') {
      shownThisPage.add(userId);
      return false;
    }
  } catch { /* A blocked storage API must not interrupt sign-up. */ }
  shownThisPage.add(userId);
  try { storage?.setItem(key, '1'); } catch { /* Fall back to this page's memory. */ }
  return true;
}

export function scheduleWelcomeDismiss(dismiss: () => void) {
  const timer = setTimeout(dismiss, WELCOME_DURATION_MS);
  return () => clearTimeout(timer);
}
