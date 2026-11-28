import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

/**
 * Update check for the store builds (Play, App Store). Dasig, not a group's server, says which versions are current,
 * so it reads a small file on Dasig's site rather than Bayanihan Server:
 *   { "android": { "latest": "0.22.1", "minimum": "0.22.1", "url": "https://play.google.com/..." }, "ios": { ... } }
 * "latest" suggests an update; "minimum" requires one. Offline, or when the file can't be read, nothing happens:
 * a group working on a hub never gets blocked. Self-built and web copies skip the check.
 */
export const VERSION_URL = process.env.EXPO_PUBLIC_VERSION_URL ?? "https://bayanihan.dasig.org/app/version.json";
const KEY = "dasig.update.v1";
const DAY = 24 * 60 * 60 * 1000;

export type UpdateState = { kind: "none" } | { kind: "suggest"; latest: string; url: string } | { kind: "require"; url: string };
type Channel = { latest?: string; minimum?: string; url?: string };

/** "0.22.1" < "0.23.0": compares numbers part by part; anything that isn't a number counts as 0. */
export function older(a: string, b: string): boolean {
  const x = a.split(".").map((n) => parseInt(n, 10) || 0), y = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0); }
  return false;
}

export function decide(current: string, ch: Channel | undefined, dismissed: string | null): UpdateState {
  if (!ch?.url) return { kind: "none" };
  if (ch.minimum && older(current, ch.minimum)) return { kind: "require", url: ch.url };
  if (ch.latest && older(current, ch.latest) && dismissed !== ch.latest) return { kind: "suggest", latest: ch.latest, url: ch.url };
  return { kind: "none" };
}

/** Reads the file at most once a day; a required update is remembered, so it still holds when the next check fails. */
export async function checkForUpdate(now = Date.now()): Promise<UpdateState> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return { kind: "none" };
  const current = Constants.expoConfig?.version;
  if (!current) return { kind: "none" };
  let saved: { at: number; ch?: Channel; dismissed?: string } = { at: 0 };
  try { saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}") ?? saved; } catch { /* first run */ }
  let ch = saved.ch;
  if (now - (saved.at ?? 0) > DAY) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
      const res = await fetch(VERSION_URL, { signal: ctl.signal, headers: { accept: "application/json" } }); clearTimeout(t);
      if (res.ok) { ch = ((await res.json()) as Record<string, Channel>)[Platform.OS]; saved = { ...saved, at: now, ch }; await AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {}); }
    } catch { /* offline or unreachable: keep the last answer */ }
  }
  return decide(current, ch, saved.dismissed ?? null);
}

export async function dismissUpdate(latest: string) {
  try { const s = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "{}") ?? {}; await AsyncStorage.setItem(KEY, JSON.stringify({ ...s, dismissed: latest })); } catch { /* ignore */ }
}

export const openStore = (url: string) => Linking.openURL(url).catch(() => {});
