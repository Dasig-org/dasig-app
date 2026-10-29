import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import * as Network from "expo-network";
import { createApp, hashToken, newToken, serveTcp, sqliteStore, type CreateServer } from "@bayanihan/server";
import { hosting } from "@/lib/reach";
import { openDb } from "./db";

// crypto.getRandomValues is polyfilled in index.js, before this module loads.

export const HUB_PORT = 8787;
type Engine = { fetch: (req: Request) => Promise<Response>; pairingCode: string; startHub(): Promise<string>; stopHub(): void; hubAddress(): Promise<string> };
let engine: Promise<Engine> | null = null;

/** Bayanihan Server, running inside this app on this phone's storage. Same API and rules as any BIX server. */
export function localEngine(): Promise<Engine> {
  return (engine ??= (async () => {
    const s = await sqliteStore(await openDb());
    let code = (await AsyncStorage.getItem("dasig.hub.code")) ?? newToken();
    await AsyncStorage.setItem("dasig.hub.code", code);
    const app = createApp({
      cors: false,
      store: s.store, keys: s.keys, sequences: s.sequences, linkTokens: s.linkTokens, files: s.files, devices: s.devices,
      pairingCode: () => code,
      async identify(req) {
        const h = req.headers.get("authorization");
        return { person: h?.startsWith("Bearer ") ? await s.devices.personFor(await hashToken(h.slice(7))) : null };
      },
      now: () => new Date().toISOString(),
      newId: () => randomUUID(),
    });
    let server: { close(): unknown } | null = null;
    const hubAddress = async () => `http://${(await Network.getIpAddressAsync()) || "0.0.0.0"}:${HUB_PORT}`;
    return {
      fetch: async (req: Request) => app.fetch(req),
      get pairingCode() { return code; },
      async startHub() {
        if (!server) {
          const Tcp = (await import("react-native-tcp-socket")).default;
          server = serveTcp(Tcp.createServer as unknown as CreateServer, app.fetch, { port: HUB_PORT, origin: () => `http://hub.local:${HUB_PORT}` });
        }
        hosting(true);
        return hubAddress();
      },
      stopHub() { server?.close(); server = null; hosting(false); code = newToken(); AsyncStorage.setItem("dasig.hub.code", code); },
      hubAddress,
    };
  })());
}
