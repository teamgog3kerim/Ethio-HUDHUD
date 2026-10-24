import {
  saveStudyReminderDevice, removeStudyReminderDevice, revokeStudyReminderDevice,
  getStudyReminderDevice,
  queueRenewalRevocation, retryRenewalRevocations, finishRenewalRevocation,
  type RenewalBinding,
} from "@workspace/api-client-react";
import { webPushLimitation } from "./renewal-push";

const KEY = "hudhud-study-device";
const SCOPE = `${import.meta.env.BASE_URL}study-notifications/`;
let operations: Promise<unknown> = Promise.resolve();
let activeUser: string | null = null;
let memory: RenewalBinding | null = null;
let storageAvailable = true;
const lock = <T,>(fn: () => Promise<T>): Promise<T> => {
  const result = operations.then(fn, fn);
  operations = result.catch(() => {});
  return result;
};
export function setStudyPushIdentity(userId: string | null) { activeUser = userId; }
export const studyPushLimitation = () => webPushLimitation() ?? (!storageAvailable
  ? "تخزين الجهاز غير متاح؛ تذكيرات التطبيق فقط. / Device storage unavailable; in-app reminders only." : null);
export function studyPushBinding(): RenewalBinding {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const b = JSON.parse(raw);
      if (typeof b.id === "string" && typeof b.revocationToken === "string" && Array.isArray(b.pending)) return b;
    }
  } catch { storageAvailable = false; }
  const binding: RenewalBinding = memory ?? {
    id: crypto.randomUUID(), revocationToken: crypto.randomUUID(),
    owner: null, consent: false, bindingKey: null, pending: [],
  };
  memory = binding;
  try { localStorage.setItem(KEY, JSON.stringify(binding)); } catch { storageAvailable = false; }
  return binding;
}
const store = {
  read: async () => studyPushBinding(),
  write: async (binding: RenewalBinding) => {
    memory = binding;
    try { localStorage.setItem(KEY, JSON.stringify(binding)); } catch { storageAvailable = false; }
  },
};
async function registration() {
  if (!("serviceWorker" in navigator)) return undefined;
  const reg = await navigator.serviceWorker.getRegistration(SCOPE);
  // Never unsubscribe the root PWA's independent billing subscription.
  return reg?.scope === new URL(SCOPE, location.origin).href ? reg : undefined;
}
async function bindWorker(binding: string | null) {
  const reg = await registration();
  if (!reg?.active) { if (binding) throw new Error("Study notification worker is not ready"); return; }
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error("Study notification worker did not respond")); }, 5000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close();
      event.data?.ok ? resolve() : reject(new Error("Could not bind study notifications"));
    };
    reg.active!.postMessage({ type: "STUDY_BINDING", id: binding }, [channel.port2]);
  });
}
async function disable(authenticated: boolean, bestEffort: boolean) {
  const binding = await queueRenewalRevocation(store);
  await bindWorker(null);
  const reg = await registration();
  const sub = await reg?.pushManager?.getSubscription();
  try { if (sub && !await sub.unsubscribe()) throw new Error("Could not unsubscribe study notifications"); }
  catch (error) { if (!bestEffort) throw error; }
  await finishRenewalRevocation(store, (id, body) => revokeStudyReminderDevice(id, body), {
    authenticatedDelete: authenticated ? () => removeStudyReminderDevice(binding.id) : undefined,
    bestEffort,
  });
}
export function disableStudyPush(authenticated = true, bestEffort = false) {
  return lock(() => disable(authenticated, bestEffort));
}
export function retryStudyRevocations() {
  return lock(() => retryRenewalRevocations(store, (id, body) => revokeStudyReminderDevice(id, body)));
}
export function enableStudyPush(userId: string, publicKey: string, requestPermission = true) {
  return lock(async () => {
    const assertIdentity = () => { if (activeUser !== userId) throw new Error("Account changed; enable reminders again"); };
    assertIdentity();
    const limitation = studyPushLimitation();
    if (limitation) throw new Error(limitation);
    const old = studyPushBinding();
    if (old.owner && old.owner !== userId) await disable(false, false);
    await retryRenewalRevocations(store, (id, body) => revokeStudyReminderDevice(id, body));
    if (studyPushBinding().pending.length) throw new Error("Previous device consent is still being revoked");
    if (Notification.permission !== "granted") {
      if (!requestPermission) throw new Error("Notification permission is not granted");
      const permission = await Notification.requestPermission(); // explicit user click only
      if (permission !== "granted") throw new Error("اسمح بالإشعارات من إعدادات المتصفح / Allow notifications in browser settings");
    }
    assertIdentity();
    const reg = await navigator.serviceWorker.register(`${SCOPE}sw.js`, { scope: SCOPE });
    if (!reg.active) await new Promise<void>((resolve, reject) => {
      const worker = reg.installing ?? reg.waiting;
      if (!worker) { reject(new Error("Study notification worker is unavailable")); return; }
      const timer = setTimeout(() => { worker.removeEventListener("statechange", change); reject(new Error("Study notification worker is not ready")); }, 10000);
      function change() {
        if (worker!.state === "activated") { clearTimeout(timer); worker!.removeEventListener("statechange", change); resolve(); }
        else if (worker!.state === "redundant") { clearTimeout(timer); worker!.removeEventListener("statechange", change); reject(new Error("Study notification worker installation failed")); }
      }
      worker.addEventListener("statechange", change); change();
    });
    assertIdentity();
    const key = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    let sub = await reg.pushManager.getSubscription();
    const oldKey = sub?.options.applicationServerKey;
    if (sub && oldKey && Array.from(new Uint8Array(oldKey)).join(",") !== Array.from(key).join(",")) {
      if (!await sub.unsubscribe()) throw new Error("Could not update the study notification key");
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    assertIdentity();
    const json = sub.toJSON();
    const binding = studyPushBinding();
    try {
      const saved = await saveStudyReminderDevice(binding.id, {
        expectedUserId: userId, revocationToken: binding.revocationToken,
        channel: "web", address: sub.endpoint,
        p256dh: json.keys?.p256dh, auth: json.keys?.auth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      // Save the disable-only capability BEFORE checking for an identity change.
      // This ensures a racing sign-out can revoke a just-completed enrollment.
      await store.write({ ...binding, owner: userId, consent: true, bindingKey: saved.bindingKey });
      if (!storageAvailable) throw new Error("Device storage is unavailable");
      assertIdentity();
      await bindWorker(saved.bindingKey);
      assertIdentity();
    } catch (error) {
      await disable(false, true).catch(() => {});
      throw error;
    }
  });
}
export async function refreshStudyPush(userId: string) {
  const binding = studyPushBinding();
  if (!binding.consent || binding.owner !== userId || studyPushLimitation() || Notification.permission !== "granted") return;
  const status = await getStudyReminderDevice(binding.id);
  // Never resurrect consent disabled on the server.
  if (!status.enabled) { await disableStudyPush(false, true); return; }
  if (status.publicKey) await enableStudyPush(userId, status.publicKey, false);
}
