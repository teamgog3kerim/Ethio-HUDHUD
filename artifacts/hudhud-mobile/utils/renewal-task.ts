import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { nativeRenewalPayloadAllowed, type RenewalBinding } from "@workspace/api-client-react";

const TASK = "hudhud-renewal-account-bound-delivery";
const BINDING_KEY = "hudhud-renewal-device";
let knownIdentity: string | null | undefined;
export function setRenewalTaskIdentity(userId: string | null | undefined) { knownIdentity = userId; }
let deliveries: Promise<unknown> = Promise.resolve();
export function withNativeRenewalDisplayLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = deliveries.then(operation, operation);
  deliveries = result.catch(() => {});
  return result;
}

// Data-only pushes never auto-display old-account content. The same task is
// loaded headlessly by the OS, without needing a signed-in UI or network call.
if (Platform.OS !== "web" && !TaskManager.isTaskDefined(TASK)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(TASK, input => {
    return withNativeRenewalDisplayLock(async () => {
    const { data, error } = input;
    if (error || !data || "actionIdentifier" in data) return;
    let payload: Record<string, unknown>;
    try {
      payload = typeof data.data.dataString === "string" ? JSON.parse(data.data.dataString) : data.data;
    } catch { return; }
    if (payload.type !== "renewal") return;
    const stored = await AsyncStorage.getItem(BINDING_KEY);
    if (!stored) return;
    const binding = JSON.parse(stored) as RenewalBinding;
    if (knownIdentity !== undefined && binding.owner !== knownIdentity) return;
    if (!nativeRenewalPayloadAllowed(binding, payload)) return;
    const seen = `hudhud-renewal-seen:${payload.period}`;
    if (await AsyncStorage.getItem(seen)) return;
    await AsyncStorage.setItem(seen, "claimed");
    // Re-check after storage awaits: sign-out may have happened in foreground.
    const latest = await AsyncStorage.getItem(BINDING_KEY);
    if (!latest || !nativeRenewalPayloadAllowed(JSON.parse(latest), payload) ||
      (knownIdentity !== undefined && JSON.parse(latest).owner !== knownIdentity)) return;
    await Notifications.scheduleNotificationAsync({
      identifier: `renewal:${payload.period}`,
      content: {
        title: "هدهد — تذكير الوصول",
        body: "اقترب انتهاء الوصول المتاح لك. افتح هدهد للتحقق من التفاصيل.",
        data: { type: "renewal", bindingKey: payload.bindingKey, period: payload.period },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: "renewal-access" },
    });
    });
  });
}

export async function registerRenewalBackgroundTask() {
  if (!await TaskManager.isAvailableAsync()) throw new Error("Native background notification tasks unavailable");
  if (!await TaskManager.isTaskRegisteredAsync(TASK)) await Notifications.registerTaskAsync(TASK);
}
