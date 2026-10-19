import { useEffect, useRef } from 'react';
import { useClerk } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';

// Shared by the application and browser regression entry so tests exercise the
// real cache boundary, not a test-only imitation of account switching.
export function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) {
        // clear() removes cache entries but leaves mounted observers holding
        // their old result until something else rerenders them. Reset removes
        // that data immediately, cancels old requests and refetches active views.
        qc.getMutationCache().clear();
        void qc.resetQueries();
      }
      prev.current = id;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}
