import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { bix } from "./bix";

/*
 * Push notifications on this device (server side: bayanihan/packages/server/src/push.ts). Pushes are general ("Humans
 * of Cebu asked you to help"); tapping one opens the screen it points to, where the detail loads. Every push is also
 * an Inbox item, so nothing is lost when push is off or unavailable.
 * - Web (installed PWA, browsers): standard web push through the service worker that scripts/pwa.mjs writes.
 * - Android app: Expo's push service. Needs the app's Firebase setup (google-services.json) and its Expo project.
 */
export type PushState = "on" | "off" | "blocked" | "unsupported" | "unavailable";
const KEY = "dasig.push";

const webSupported = () => Platform.OS === "web" && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const b64ToBytes = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };

/** Where things stand on this device, without asking anything. */
export async function pushState(): Promise<PushState> {
  if (Platform.OS === "web") {
    if (!webSupported()) return "unsupported";
    if (Notification.permission === "denied") return "blocked";
    return (await AsyncStorage.getItem(KEY)) === "on" && Notification.permission === "granted" ? "on" : "off";
  }
  const N = await import("expo-notifications");
  const p = await N.getPermissionsAsync();
  if (!p.granted && !p.canAskAgain) return "blocked";
  return (await AsyncStorage.getItem(KEY)) === "on" && p.granted ? "on" : "off";
}

/** Ask permission, subscribe, and tell the server. Returns the new state. */
export async function turnPushOn(): Promise<PushState> {
  const info = await bix.pushInfo().catch(() => null);
  if (Platform.OS === "web") {
    if (!webSupported()) return "unsupported";
    if (!info?.web) return "unavailable";
    if ((await Notification.requestPermission()) !== "granted") return Notification.permission === "denied" ? "blocked" : "off";
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(info.web) }));
    await bix.pushOn("web", sub.toJSON());
  } else {
    if (!info?.expo) return "unavailable";
    const N = await import("expo-notifications");
    if (Platform.OS === "android") await N.setNotificationChannelAsync("default", { name: "Asks and requests", importance: N.AndroidImportance.HIGH });
    const p = await N.requestPermissionsAsync();
    if (!p.granted) return p.canAskAgain ? "off" : "blocked";
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return "unavailable";
    const token = await N.getExpoPushTokenAsync({ projectId }).catch(() => null);
    if (!token) return "unavailable";
    await bix.pushOn("expo", token.data);
  }
  await AsyncStorage.setItem(KEY, "on");
  return "on";
}

export async function turnPushOff(): Promise<PushState> {
  await bix.pushOff().catch(() => {});
  if (Platform.OS === "web" && webSupported()) { const reg = await navigator.serviceWorker.getRegistration(); await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => {}); }
  await AsyncStorage.setItem(KEY, "off");
  return "off";
}

/** On the Android app: show pushes while the app is open, and open the screen a tapped push points to. */
export async function listenForPushTaps(open: (url: string) => void): Promise<() => void> {
  if (Platform.OS === "web") return () => {};
  const N = await import("expo-notifications");
  N.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
  const go = (r: { notification: { request: { content: { data?: Record<string, unknown> } } } } | null) => { const u = r?.notification.request.content.data?.url; if (typeof u === "string" && u.startsWith("/")) open(u); };
  go(await N.getLastNotificationResponseAsync().catch(() => null));
  const sub = N.addNotificationResponseReceivedListener(go);
  return () => sub.remove();
}
