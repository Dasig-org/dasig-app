import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * In development on a phone, reach Supabase Auth and Bayanihan Server through the same host that served the app
 * (an Expo tunnel or the LAN), via Metro's /sb and /bix forwarding. On the web, or when set, use .env.local.
 */
function devBase(): string | null {
  const host = Constants.expoConfig?.hostUri;
  if (Platform.OS === "web" || !host || host.startsWith("127.0.0.1") || host.startsWith("localhost")) return null;
  return host.includes(":") ? `http://${host}` : `https://${host}`;
}
const base = __DEV__ ? devBase() : null;

export const env = {
  supabaseUrl: base ? `${base}/sb` : process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54421",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  bixUrl: base ? `${base}/bix` : process.env.EXPO_PUBLIC_BIX_URL ?? "http://127.0.0.1:8787",
};

/** Where the Dasig web app is served, for invite links. */
export const appUrl = () => (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : process.env.EXPO_PUBLIC_APP_URL ?? "https://bayanihan.dasig.org");
/** The Bayanihan Network: Dasig's hosted Bayanihan Server, for the public directory and syncing beyond your hub. Unset until it is online. */
export const networkUrl = process.env.EXPO_PUBLIC_DASIG_NETWORK_URL ?? "https://ecosystem.dasig.org";
