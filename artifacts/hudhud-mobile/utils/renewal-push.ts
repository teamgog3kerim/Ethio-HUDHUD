import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { removeReminderDevice, saveReminderDevice, revokeReminderDevice, queueRenewalRevocation, retryRenewalRevocations, finishRenewalRevocation, type RenewalBinding } from "@workspace/api-client-react";
import { registerRenewalBackgroundTask, setRenewalTaskIdentity, withNativeRenewalDisplayLock } from "./renewal-task";

const KEY = "hudhud-renewal-device";
type Binding = RenewalBinding;
export async function nativeRenewalBinding(): Promise<Binding> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored) {
    try {
      const b = JSON.parse(stored);
      if (typeof b.id === "string") {
        const migrated = { ...b, revocationToken: b.revocationToken ?? Crypto.randomUUID(), bindingKey: b.bindingKey ?? null, pending: b.pending ?? [] };
        await AsyncStorage.setItem(KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch { /* replace malformed device data */ }
  }
  const b: Binding = { id: Crypto.randomUUID(), owner: null, consent: false, revocationToken: Crypto.randomUUID(), bindingKey: null, pending: [] };
  await AsyncStorage.setItem(KEY, JSON.stringify(b));
  return b;
}
export const nativePushProject = () => Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
let currentIdentity: string | null | undefined;
let operations: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation, operation);
  operations = result.catch(() => {});
  return result;
}
export function setNativeRenewalIdentity(userId: string | null | undefined) { currentIdentity = userId; setRenewalTaskIdentity(userId); }
const consentStore = { read: nativeRenewalBinding, write: async (b: Binding) => AsyncStorage.setItem(KEY, JSON.stringify(b)) };
export function retryNativeRenewalRevocations() {
  return serialize(() => retryRenewalRevocations(consentStore, (id, input) => revokeReminderDevice(id, input)));
}
export async function disableNativeRenewalPush(accountTransition = false, bestEffort = false) {
  return serialize(() => disable(accountTransition, bestEffort));
}
async function disable(accountTransition: boolean, bestEffort = false) {
  const b = await queueRenewalRevocation(consentStore);
  // A headless task immediately sees consent=false even if network or OS
  // unregistration fails. Pending capabilities survive account changes.
  if (Platform.OS !== "web" && (b.owner || b.consent || b.bindingKey)) await withNativeRenewalDisplayLock(async () => {
    for (const notice of await Notifications.getPresentedNotificationsAsync())
      if (notice.request.content.data?.type === "renewal") await Notifications.dismissNotificationAsync(notice.request.identifier);
    for (const notice of await Notifications.getAllScheduledNotificationsAsync())
      if (notice.content.data?.type === "renewal") await Notifications.cancelScheduledNotificationAsync(notice.identifier);
    if (b.consent) await Notifications.unregisterForNotificationsAsync();
  }).catch(error => { if (!bestEffort) throw error; }); // Persisted consent=false blocks all data-only presentation.
  await finishRenewalRevocation(consentStore, (id, input) => revokeReminderDevice(id, input), {
    authenticatedDelete: !accountTransition ? () => removeReminderDevice(b.id) : undefined, bestEffort,
  });
}
export async function syncNativeRenewalPush(userId: string, requestPermission: boolean) {
  return serialize(() => sync(userId, requestPermission));
}
async function sync(userId: string, requestPermission: boolean) {
  if (currentIdentity !== userId) throw new Error("Account changed");
  await retryRenewalRevocations(consentStore, (id, input) => revokeReminderDevice(id, input));
  if (Platform.OS === "web" || !nativePushProject() || Constants.appOwnership === "expo")
    throw new Error("A configured native build is required");
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("renewal-access", {
    name: "تذكيرات الوصول والتجديد", importance: Notifications.AndroidImportance.DEFAULT,
  });
  const permission = requestPermission ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    if (!requestPermission) await disable(false);
    throw new Error("Notification permission not granted");
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId: nativePushProject() });
  await registerRenewalBackgroundTask();
  const b = await nativeRenewalBinding();
  if (currentIdentity !== userId) throw new Error("Account changed");
  const saved = await saveReminderDevice(b.id, { expectedUserId: userId, revocationToken: b.revocationToken, channel: "expo", address: token.data, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  await consentStore.write({ ...await nativeRenewalBinding(), owner: userId, consent: true, bindingKey: saved.bindingKey });
  if (currentIdentity !== userId) { await Notifications.unregisterForNotificationsAsync(); throw new Error("Account changed"); }
}

export async function cancelStudyNotifications() {
  if (Platform.OS === "web") return;
  for (const notification of await Notifications.getAllScheduledNotificationsAsync()) {
    // Includes the legacy daily-study channel, but never renewal notices.
    if (notification.identifier.startsWith("study:") || notification.content.data?.type === "study" ||
      (notification.trigger as { channelId?: string } | null)?.channelId === "daily-study" ||
      notification.content.title === "حان وقت الأمهرية") {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}
