export type RenewalBinding = {
  id: string;
  owner: string | null;
  consent: boolean;
  revocationToken: string;
  bindingKey: string | null;
  pending: { bindingKey: string; revocationToken: string }[];
};
export type RenewalConsentStore = {
  read: () => Promise<RenewalBinding>;
  write: (binding: RenewalBinding) => Promise<void>;
};
export type RevokeConsent = (id: string, input: { bindingKey: string; revocationToken: string }) => Promise<unknown>;

// Both clients persist revocation BEFORE local cleanup/network work. Losing
// connectivity or changing auth cannot erase the ability to withdraw consent.
export async function queueRenewalRevocation(store: RenewalConsentStore) {
  const b = await store.read();
  const pending = [...b.pending];
  if (b.bindingKey && !pending.some(p => p.bindingKey === b.bindingKey))
    pending.push({ bindingKey: b.bindingKey, revocationToken: b.revocationToken });
  await store.write({ ...b, owner: null, consent: false, pending });
  return b;
}
export async function retryRenewalRevocations(store: RenewalConsentStore, revoke: RevokeConsent) {
  const b = await store.read();
  let failed = false;
  for (const item of b.pending) {
    try {
      await revoke(b.id, item);
      const current = await store.read();
      await store.write({ ...current, pending: current.pending.filter(p => p.bindingKey !== item.bindingKey) });
    } catch { failed = true; }
  }
  if (failed) throw new Error("Device consent revocation is pending; reconnect to retry");
}

// Sign-out must not depend on the API being reachable. Its caller has already
// persisted consent=false and queued capabilities, so remote failures can wait.
// Explicit settings opt-out may also supply an authenticated fallback DELETE
// for legacy/server-only registrations, independently of local owner flags.
export async function finishRenewalRevocation(
  store: RenewalConsentStore,
  revoke: RevokeConsent,
  options: { authenticatedDelete?: () => Promise<unknown>; bestEffort?: boolean } = {},
) {
  try {
    if (options.authenticatedDelete) await options.authenticatedDelete();
    await retryRenewalRevocations(store, revoke);
  } catch (error) { if (!options.bestEffort) throw error; }
}

export function nativeRenewalPayloadAllowed(binding: RenewalBinding, payload: Record<string, unknown>, now = Date.now()) {
  return binding.consent && !!binding.owner && !!binding.bindingKey &&
    binding.bindingKey === payload.bindingKey && typeof payload.period === "string" &&
    /^[0-9a-f]{64}$/.test(payload.period) && typeof payload.expiresAt === "string" &&
    Number.isFinite(Date.parse(payload.expiresAt)) && Date.parse(payload.expiresAt) > now;
}
