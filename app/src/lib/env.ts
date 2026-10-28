export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54421",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  bixUrl: process.env.EXPO_PUBLIC_BIX_URL ?? "http://127.0.0.1:8787",
};
import { Platform } from "react-native";
/** Where the Dasig web app is served, for invite links. */
export const appUrl = () => (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:8081");
