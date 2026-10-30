import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { bix, type R } from "./bix";
import { getConnection, setConnection, type Connection } from "./connection";

type Group = { org: R; role: R };
type Session = {
  ready: boolean;
  person: R | null;
  /** The person finished (or skipped) their profile. */
  profileDone: boolean;
  /** Officer or core member of the current group. */
  isLead: boolean;
  groups: Group[];
  current: R | null;
  connection: Connection | null;
  setCurrent(org: R | null): void;
  /** A nickname is enough. On a phone, this creates you on the phone's own Bayanihan Server. */
  startWithNickname(nickname: string): Promise<void>;
  /** Pair with a hub from its QR (dasig://pair?hub=…&code=…). Your Person comes with you. */
  pairWithHub(hub: string, code: string, nickname?: string): Promise<void>;
  /** Go back to using this phone's own server. */
  useThisPhone(): Promise<void>;
  /**
   * Join the Dasig Ecosystem with this phone's own Person and key: the server sends a one-time challenge, the phone
   * signs it, and the server issues this phone a token. Records already on the phone stay on the phone.
   */
  joinEcosystem(url?: string): Promise<void>;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
};
const Ctx = createContext<Session | null>(null);
const BEFORE_KEY = "dasig.connection.before-ecosystem";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [person, setPerson] = useState<R | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [current, setCurrent] = useState<R | null>(null);
  const [connection, setConn] = useState<Connection | null>(null);

  const refresh = useCallback(async () => {
    const c = await getConnection();
    setConn(c);
    const signedIn = c.kind === "cloud" ? !!(await supabase.auth.getSession()).data.session : !!c.token;
    if (!signedIn) { setPerson(null); setGroups([]); return; }
    let me = await bix.me();
    // Make sure this phone's own key is on the person's record (once per phone; quietly retried next time if offline).
    try {
      const { withMyKey, keyRotation } = await import("./keys");
      const add = await withMyKey(me);
      if (add) me = (await bix.commitNow(bix.next(me, add)))[0] ?? me;
      // Rotate an old key on the Ecosystem: publish the new key first, and use it only once the server has it.
      else if (c.kind === "ecosystem") {
        const rot = await keyRotation(me);
        if (rot) { me = (await bix.commitNow(bix.next(me, { publicKey: rot.publicKey })))[0] ?? me; await rot.adopt();
          const AS = (await import("@react-native-async-storage/async-storage")).default;
          const saved = await AS.getItem("dasig.ecosystem.person"); if (saved) await AS.setItem("dasig.ecosystem.person", JSON.stringify({ ...JSON.parse(saved), publicKey: rot.publicKey.filter((x: any) => x.status === "active") })); }
      }
    } catch {}
    setPerson(me);
    const roles = (await bix.search("Role", { person: `Person/${me.id}` })).filter((r) => r.status === "active");
    const gs: Group[] = [];
    for (const role of roles) { try { gs.push({ role, org: await bix.get("Organization", role.organization.reference.split("/")[1]) }); } catch {} }
    setGroups(gs);
    setCurrent((cur) => (cur && gs.some((g) => g.org.id === cur.id) ? cur : gs[0]?.org ?? null));
  }, []);

  useEffect(() => { refresh().catch(() => {}).finally(() => setReady(true)); }, [refresh]);

  const startWithNickname = async (nickname: string) => {
    const c = await getConnection();
    const name = nickname.trim() || "Friend";
    if (c.kind === "cloud") {
      if (!(await supabase.auth.getSession()).data.session) { const { error } = await supabase.auth.signInAnonymously(); if (error) throw error; }
      await bix.me(name);
    } else if (c.kind === "phone" && !c.token) {
      const { localEngine } = await import("@/local/engine");
      const e = await localEngine();
      const res = await e.fetch(new Request("http://phone/$pair", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: e.pairingCode, nickname: name }) }));
      const out = await res.json();
      if (!res.ok) throw new Error(String(out.error));
      await setConnection({ kind: "phone", token: out.token });
    }
    await refresh();
  };

  const pairWithHub = async (hub: string, code: string, nickname?: string) => {
    const url = hub.replace(/\/$/, "");
    const res = await fetch(`${url}/$pair`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, nickname: nickname ?? person?.name?.text, ...(person ? { person, proof: await (await import("./keys")).pairingProof(person.id, code, person.publicKey) } : {}) }) });
    const out = await res.json().catch(() => ({ error: `the hub didn't answer (${res.status})` }));
    if (!res.ok) throw new Error(String(out.error));
    await setConnection({ kind: "hub", url, token: out.token });
    await refresh();
  };

  const joinEcosystem = async (target?: string) => {
    const { networkUrl } = await import("./env");
    const url = (target ?? networkUrl).replace(/\/$/, "");
    if (!url) throw new Error("The Dasig Ecosystem isn't set up in this version of the app.");
    let out: { token: string };
    if (person) {
      const { joinWithKey } = await import("./ecosystem");
      // Bring this phone's Person (with its key) so the account online is the same person, not a stranger with the same nickname.
      out = await joinWithKey(url, { id: person.id, name: person.name, credit: person.credit, description: person.description, publicKey: (person.publicKey ?? []).filter((x: any) => x.status === "active") });
    } else {
      const res = await fetch(`${url}/$join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: "Friend" }) }).catch(() => null);
      if (!res || !res.ok) throw new Error("Couldn't join the Dasig Ecosystem. Check your internet and try again.");
      out = await res.json();
    }
    const before = await getConnection();
    if (before.kind !== "ecosystem") await AsyncStorage.setItem(BEFORE_KEY, JSON.stringify(before));
    await setConnection({ kind: "ecosystem", url, token: out.token });
    await refresh();
  };

  const useThisPhone = async () => {
    // Leaving the Ecosystem returns to whatever this device used before (its own server, its hub, or the web's server).
    const c = await getConnection();
    const saved = c.kind === "ecosystem" ? await AsyncStorage.getItem(BEFORE_KEY) : null;
    if (saved) { await setConnection(JSON.parse(saved) as Connection); await AsyncStorage.removeItem(BEFORE_KEY); }
    else await setConnection({ kind: "phone", token: await AsyncStorageGet() });
    await refresh();
  };
  const signOut = async () => {
    const c = await getConnection();
    if (c.kind === "cloud") await supabase.auth.signOut();
    else await setConnection(c.kind === "hub" || c.kind === "ecosystem" ? { kind: "phone", token: await AsyncStorageGet() } : { kind: "phone" });
    setPerson(null); setGroups([]); setCurrent(null); await refresh();
  };

  const profileDone = !!(person?.extension ?? []).find((x: any) => x.url === "bayanihan:profile-done");
  const isLead = !!current && groups.some((g) => g.org.id === current.id && ["officer", "core-member"].includes(g.role.code?.code));
  return <Ctx.Provider value={{ ready, person, profileDone, isLead, groups, current, connection, setCurrent, startWithNickname, pairWithHub, useThisPhone, joinEcosystem, refresh, signOut }}>{children}</Ctx.Provider>;
}

/** The phone's own token, remembered when switching to a hub, so going back keeps your local records. */
import AsyncStorage from "@react-native-async-storage/async-storage";
async function AsyncStorageGet(): Promise<string | undefined> { return (await AsyncStorage.getItem("dasig.phone.token")) ?? undefined; }
export async function rememberPhoneToken(t?: string) { if (t) await AsyncStorage.setItem("dasig.phone.token", t); }

export const useSession = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
};
