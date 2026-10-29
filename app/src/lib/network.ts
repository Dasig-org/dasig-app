import AsyncStorage from "@react-native-async-storage/async-storage";
import { networkUrl } from "./env";

/** The Dasig Ecosystem (Dasig's hosted Bayanihan Server) is open once its address is configured. */
export const networkOpen = !!networkUrl;
const KEY = "dasig.network.interest.v1";

/** "Tell me when it opens": remembered on this phone, with when and from which group, until the network can receive it. */
export async function interested(): Promise<{ at: string; group?: string } | null> {
  const v = await AsyncStorage.getItem(KEY); return v ? JSON.parse(v) : null;
}
export async function markInterested(group?: string) {
  const v = { at: new Date().toISOString(), ...(group ? { group } : {}) };
  await AsyncStorage.setItem(KEY, JSON.stringify(v)); return v;
}
