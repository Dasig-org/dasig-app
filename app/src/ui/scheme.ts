import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance as RNAppearance, Platform } from "react-native";
import { applyScheme, type Scheme } from "./theme";

/**
 * Appearance: "auto" follows the phone, or the person picks light or dark (Settings → Appearance). It is applied once,
 * before the first screen draws (app/_layout.tsx), so a change made in Settings shows the next time Dasig opens.
 */
export type Appearance = "auto" | "light" | "dark"; // the setting; React Native's Appearance module is RNAppearance here
const KEY = "dasig.appearance";
export async function getAppearance(): Promise<Appearance> {
  try { const v = await AsyncStorage.getItem(KEY); return v === "light" || v === "dark" ? v : "auto"; } catch { return "auto"; }
}
export async function setAppearance(a: Appearance) {
  try { await AsyncStorage.setItem(KEY, a); } catch { /* storage unavailable: the choice lasts until restart */ }
}
export const resolve = (a: Appearance): Scheme => (a === "auto" ? (RNAppearance.getColorScheme() === "dark" ? "dark" : "light") : a);
/** Read the saved choice, apply it, and return the scheme in use. Call before rendering the app. */
export async function loadScheme(): Promise<Scheme> {
  const next = resolve(await getAppearance());
  applyScheme(next);
  return next;
}
/** After a change in Settings: the web can reload at once; the app asks to be reopened. */
export function reloadIfWeb(): boolean {
  if (Platform.OS === "web" && typeof window !== "undefined") { window.location.reload(); return true; }
  return false;
}
