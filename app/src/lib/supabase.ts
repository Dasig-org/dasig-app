import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { env } from "./env";

/** Sign-in only. Records never go through Supabase directly; they go through Bayanihan Server. */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { storage: Platform.OS === "web" ? undefined : AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
