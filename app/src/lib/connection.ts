import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * Where this phone's records live:
 * - "phone": Bayanihan Server inside this app (standalone, and the hub when hub mode is on)
 * - "hub": another phone's hub, paired by QR
 * - "cloud": an online Bayanihan Server reached through Supabase sign-in (local web development)
 * - "ecosystem": the Dasig Ecosystem (or any hosted Bayanihan Server), joined with this phone's own key
 */
export type Connection = { kind: "phone"; token?: string } | { kind: "hub"; url: string; token: string; name?: string } | { kind: "cloud" } | { kind: "ecosystem"; url: string; token: string };
const KEY = "dasig.connection.v1";
let current: Connection | null = null;
const listeners = new Set<(c: Connection) => void>();

export async function getConnection(): Promise<Connection> {
  if (current) return current;
  const saved = await AsyncStorage.getItem(KEY);
  current = saved ? (JSON.parse(saved) as Connection) : Platform.OS === "web" ? { kind: "cloud" } : { kind: "phone" };
  return current;
}
export async function setConnection(c: Connection) {
  if (c.kind === "phone" && c.token) await AsyncStorage.setItem("dasig.phone.token", c.token);
  current = c; await AsyncStorage.setItem(KEY, JSON.stringify(c)); listeners.forEach((l) => l(c)); }
export function onConnection(l: (c: Connection) => void) { listeners.add(l); return () => { listeners.delete(l); }; }
