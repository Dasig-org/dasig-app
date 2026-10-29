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
  refresh(): Promise<void>;
  signOut(): Promise<void>;
};
const Ctx = createContext<Session | null>(null);

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
    try { const { withMyKey } = await import("./keys"); const add = await withMyKey(me); if (add) me = (await bix.commitNow(bix.next(me, add)))[0] ?? me; } catch {}
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
      body: JSON.stringify({ code, nickname: nickname ?? person?.name?.text, ...(person ? { person, proof: await (await import("./keys")).pairingProof(person.id, code) } : {}) }) });
    const out = await res.json().catch(() => ({ error: `the hub didn't answer (${res.status})` }));
    if (!res.ok) throw new Error(String(out.error));
    await setConnection({ kind: "hub", url, token: out.token });
    await refresh();
  };

  const useThisPhone = async () => { const prev = await AsyncStorageGet(); await setConnection({ kind: "phone", token: prev }); await refresh(); };
  const signOut = async () => {
    const c = await getConnection();
    if (c.kind === "cloud") await supabase.auth.signOut();
    else await setConnection(c.kind === "hub" ? { kind: "phone", token: await AsyncStorageGet() } : { kind: "phone" });
    setPerson(null); setGroups([]); setCurrent(null); await refresh();
  };

  const profileDone = !!(person?.extension ?? []).find((x: any) => x.url === "bayanihan:profile-done");
  const isLead = !!current && groups.some((g) => g.org.id === current.id && ["officer", "core-member"].includes(g.role.code?.code));
  return <Ctx.Provider value={{ ready, person, profileDone, isLead, groups, current, connection, setCurrent, startWithNickname, pairWithHub, useThisPhone, refresh, signOut }}>{children}</Ctx.Provider>;
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
