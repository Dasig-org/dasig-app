import AsyncStorage from "@react-native-async-storage/async-storage";
import { getConnection, setConnection, type Connection } from "./connection";
import { deviceLabel } from "./ecosystem";
import { flush } from "./outbox";

/**
 * Taking a group to a hub and back (BIX "Files, home servers and hubs", 2026-11-28).
 * The lead's phone becomes the group's hub while it still has signal; the Bayanihan Network holds the group read-only;
 * members join the hub; when there's signal again, the hub hands everything back and every phone returns to the Network.
 * In v0 the whole phone moves: while the group is on the hub, this phone works with the hub only.
 */
const AWAY = "dasig.handover.v1";       // on the hub phone: the group it took, and how to reach the Network again
const MEMBER = "dasig.away.network.v1"; // on a member's phone: the Network connection to return to
type Away = { org: string; name: string; endpoint: string; network: Extract<Connection, { kind: "ecosystem" }> };

export async function awayGroup(): Promise<Away | null> { return JSON.parse((await AsyncStorage.getItem(AWAY)) ?? "null"); }
export async function memberAway(): Promise<Extract<Connection, { kind: "ecosystem" }> | null> { return JSON.parse((await AsyncStorage.getItem(MEMBER)) ?? "null"); }
/** Called before a phone pairs with a hub, so it can come back to the Network afterwards. */
export async function rememberNetwork() { const c = await getConnection(); if (c.kind === "ecosystem" && c.token) await AsyncStorage.setItem(MEMBER, JSON.stringify(c)); }

const said = async (res: Response) => { const out = await res.json().catch(() => ({})); if (!res.ok) throw new Error(typeof out.error === "string" ? out.error : `Something went wrong (${res.status})`); return out; };

/** Lead, with signal: make this phone the group's hub and bring the group onto it. */
export async function takeOffline(org: { id: string; name?: string }, person: { id: string; publicKey?: { key: string; status: string }[] }): Promise<void> {
  const c = await getConnection();
  if (c.kind !== "ecosystem" || !c.token) throw new Error("Your group needs to be on the Bayanihan Network first.");
  const res = await fetch(`${c.url}/Organization/${org.id}/$handover`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${c.token}` },
    body: JSON.stringify({ name: deviceLabel() ?? "Hub" }) }).catch(() => null);
  if (!res) throw new Error("Taking your group offline needs internet once. Try again where there's signal.");
  const { endpoint, bundle } = await said(res);
  const { localEngine } = await import("@/local/engine");
  const e = await localEngine();
  const { pairingProof } = await import("./keys");
  const paired = await said(await e.fetch(new Request("http://phone/$pair", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: e.pairingCode, person, proof: await pairingProof(person.id, e.pairingCode, person.publicKey) }) })));
  await said(await e.fetch(new Request("http://phone/$adopt", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${paired.token}` }, body: JSON.stringify(bundle) })));
  await AsyncStorage.setItem(AWAY, JSON.stringify({ org: org.id, name: org.name ?? "your group", endpoint: `Endpoint/${endpoint.id}`, network: c } satisfies Away));
  await setConnection({ kind: "phone", token: paired.token });
  await e.startHub();
}

/** Lead, with signal again: hand everything the hub kept back to the Network, and return there. */
export async function bringBackOnline(): Promise<{ kept: number; refused: string[] }> {
  const a = await awayGroup();
  if (!a) throw new Error("This phone isn't holding a group.");
  const c = await getConnection();
  const token = c.kind === "phone" ? c.token : undefined;
  const { localEngine } = await import("@/local/engine");
  const e = await localEngine();
  const bundle = await said(await e.fetch(new Request(`http://phone/Organization/${a.org}/$handback`, { headers: token ? { authorization: `Bearer ${token}` } : {} })));
  const res = await fetch(`${a.network.url}/Organization/${a.org}/$handback`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${a.network.token}` },
    body: JSON.stringify(bundle) }).catch(() => null);
  if (!res) throw new Error("No internet yet. Your group's work is safe on this phone; try again where there's signal.");
  const out = await said(res);
  e.stopHub();
  await AsyncStorage.removeItem(AWAY);
  await setConnection(a.network);
  await flush().catch(() => {});
  return out;
}

/** Member: leave the hub and go back to the Network; what's kept on this phone is sent there. */
export async function backToNetwork(): Promise<void> {
  const n = await memberAway();
  if (!n) throw new Error("This phone wasn't on the Bayanihan Network before.");
  await setConnection(n);
  await AsyncStorage.removeItem(MEMBER);
  await flush().catch(() => {});
}
