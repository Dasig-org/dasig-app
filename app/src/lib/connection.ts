import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { clearCache } from "./cache";
import { networkUrl } from "./env";

/**
 * Where this phone's records live:
 * - "phone": Bayanihan Server inside this app (standalone, and the hub when hub mode is on)
 * - "hub": another phone's hub, paired by QR
 * - "cloud": an online Bayanihan Server reached through Supabase sign-in (local web development, EXPO_PUBLIC_WEB_CONNECTION=cloud)
 * - "ecosystem": the Bayanihan Network (or any hosted Bayanihan Server), joined with this phone's own key
 */
export type Connection = { kind: "phone"; token?: string } | { kind: "hub"; url: string; token: string; name?: string } | { kind: "cloud" } | { kind: "ecosystem"; url: string; token: string };
const KEY = "dasig.connection.v1";
let current: Connection | null = null;
const listeners = new Set<(c: Connection) => void>();

/** The web app (and the PWA) works against the Bayanihan Network: a browser can't host a group or reach a hub (docs/pwa/PWA_PLAN.md). */
const webDefault = (): Connection => (process.env.EXPO_PUBLIC_WEB_CONNECTION === "cloud" ? { kind: "cloud" } : { kind: "ecosystem", url: networkUrl.replace(/\/$/, ""), token: "" });

export async function getConnection(): Promise<Connection> {
  if (current) return current;
  const saved = await AsyncStorage.getItem(KEY);
  current = saved ? (JSON.parse(saved) as Connection) : Platform.OS === "web" ? webDefault() : { kind: "phone" };
  return current;
}
export async function setConnection(c: Connection) {
  if (c.kind === "phone" && c.token) await AsyncStorage.setItem("dasig.phone.token", c.token);
  // Someone else's saved records are never shown to the next person on this device.
  const was = current as { kind: string; url?: string; token?: string } | null, is = c as { kind: string; url?: string; token?: string };
  if (!was || was.kind !== is.kind || was.url !== is.url || was.token !== is.token) await clearCache();
  current = c; await AsyncStorage.setItem(KEY, JSON.stringify(c)); listeners.forEach((l) => l(c)); }
export function onConnection(l: (c: Connection) => void) { listeners.add(l); return () => { listeners.delete(l); }; }
