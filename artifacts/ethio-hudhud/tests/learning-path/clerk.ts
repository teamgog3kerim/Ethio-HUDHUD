import { useSyncExternalStore } from 'react';

// Test-only identity events, never imported by the production entry. This does
// not test Clerk login or mint credentials; it drives its public listener shape.
let identity: string | null = sessionStorage.getItem('test-identity');
type Listener = (state: { user: { id: string } | null }) => void;
const listeners = new Set<Listener>();
const subscribers = new Set<() => void>();
window.addEventListener('test-identity', event => {
  identity = (event as CustomEvent<string | null>).detail;
  if (identity) sessionStorage.setItem('test-identity', identity);
  else sessionStorage.removeItem('test-identity');
  for (const listener of listeners) listener({ user: identity ? { id: identity } : null });
  for (const subscriber of subscribers) subscriber();
});
const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => { subscribers.delete(callback); };
};
const clerk = {
  addListener: (listener: Listener) => {
    listeners.add(listener);
    listener({ user: identity ? { id: identity } : null });
    return () => { listeners.delete(listener); };
  },
  signOut: async () => {
    document.cookie = 'test-identity=; Max-Age=0; Path=/';
    window.dispatchEvent(new CustomEvent('test-identity', { detail: null }));
  },
};
export const useAuth = () => {
  const userId = useSyncExternalStore(subscribe, () => identity);
  return { isSignedIn: !!userId, userId };
};
export const useClerk = () => clerk;
