import { removeReminderDevice, revokeReminderDevice, queueRenewalRevocation, retryRenewalRevocations, finishRenewalRevocation, type RenewalBinding } from "@workspace/api-client-react";

const KEY = "hudhud-renewal-device";
type Binding = RenewalBinding;
let operations: Promise<unknown> = Promise.resolve();
export function withRenewalLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation, operation);
  operations = result.catch(() => {});
  return result;
}
export function renewalBinding(): Binding {
  const stored = localStorage.getItem(KEY);
  if (stored) {
    try {
      const b = JSON.parse(stored);
      if (typeof b.id === "string") {
        const migrated = { ...b, revocationToken: b.revocationToken ?? crypto.randomUUID(), bindingKey: b.bindingKey ?? null, pending: b.pending ?? [] };
        saveRenewalBinding(migrated);
        return migrated;
      }
    } catch { /* reset malformed local data */ }
  }
  const b: Binding = { id: crypto.randomUUID(), owner: null, consent: false, revocationToken: crypto.randomUUID(), bindingKey: null, pending: [] };
  localStorage.setItem(KEY, JSON.stringify(b));
  return b;
}
export function saveRenewalBinding(b: Binding) { localStorage.setItem(KEY, JSON.stringify(b)); }
export async function workerBinding(id: string | null) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  const worker = registration?.active;
  if (!worker) { if (id) throw new Error("Service worker not ready"); return; }
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => reject(new Error("Service worker did not respond")), 5000);
    channel.port1.onmessage = event => { clearTimeout(timeout); event.data?.ok ? resolve() : reject(new Error("Could not bind device")); };
    worker.postMessage({ type: "RENEWAL_BINDING", id }, [channel.port2]);
  });
}
const consentStore = { read: async () => renewalBinding(), write: async (b: Binding) => saveRenewalBinding(b) };
export function flushWebRenewalRevocations() {
  return retryRenewalRevocations(consentStore, (id, input) => revokeReminderDevice(id, input));
}
export function retryWebRenewalRevocations() {
  return withRenewalLock(flushWebRenewalRevocations);
}
export async function disableRenewalPush(authenticated = true, bestEffort = false) {
  return withRenewalLock(() => disable(authenticated, bestEffort));
}
async function disable(authenticated: boolean, bestEffort: boolean) {
  const b = await queueRenewalRevocation(consentStore);
  // Local revocation first: even offline sign-out cannot expose an old alert.
  if (b.owner || b.consent || b.bindingKey) {
    await workerBinding(null);
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL) : undefined;
    const subscription = await registration?.pushManager?.getSubscription();
    try {
      if (subscription && !await subscription.unsubscribe()) throw new Error("Could not unsubscribe this browser");
    } catch (error) { if (!bestEffort) throw error; } // Worker binding is already cleared.
  }
  // DELETE is independent of the cleared local owner flag. This also handles
  // older registrations that predate disable-only capabilities.
  await finishRenewalRevocation(consentStore, (id, input) => revokeReminderDevice(id, input), {
    authenticatedDelete: authenticated ? () => removeReminderDevice(b.id) : undefined, bestEffort,
  });
}
export function webPushLimitation() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !installed) return "على iPhone وiPad يلزم iOS/iPadOS 16.4 أو أحدث: أضف هدهد إلى الشاشة الرئيسية وافتحه منها.";
  if (!window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window))
    return "هذا المتصفح لا يدعم إشعارات الخلفية. جرّب متصفحًا مدعومًا على Android أو تطبيق ويب مثبّتًا على iOS 16.4 أو أحدث.";
  return null;
}
