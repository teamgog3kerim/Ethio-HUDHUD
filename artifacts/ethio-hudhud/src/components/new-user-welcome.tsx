import { useEffect, useState } from 'react';
import { useSession, useUser } from '@clerk/react';
import { claimSignupWelcome, isNewGoogleSignup, scheduleWelcomeDismiss } from '@/lib/signup-welcome';
import { WelcomePopup } from './welcome-popup';

export function NewUserWelcome() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();
  const [welcomeFor, setWelcomeFor] = useState<string | null>(null);
  const userId = user?.id;
  const createdAt = user?.createdAt?.getTime() ?? NaN;
  const sessionCreatedAt = session?.createdAt?.getTime() ?? NaN;
  const hasGoogle = user?.externalAccounts.some(account => account.provider === 'google') ?? false;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !isNewGoogleSignup(createdAt, sessionCreatedAt, hasGoogle)) return;
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Storage is optional. */ }
    if (claimSignupWelcome(userId, storage)) setWelcomeFor(userId);
  }, [isLoaded, isSignedIn, userId, createdAt, sessionCreatedAt, hasGoogle]);

  // Separate from the once-only claim so Strict Mode's effect replay cannot
  // consume the welcome and cancel its only dismissal timer.
  useEffect(() => {
    if (!welcomeFor) return;
    return scheduleWelcomeDismiss(() => setWelcomeFor(null));
  }, [welcomeFor]);

  if (!isSignedIn || !userId || welcomeFor !== userId) return null;
  return <WelcomePopup onDismiss={() => setWelcomeFor(null)} />;
}
