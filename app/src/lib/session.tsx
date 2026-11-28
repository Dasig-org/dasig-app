import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { bix, type R } from "./bix";
import { getConnection, setConnection, type Connection } from "./connection";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { Offline, onReach } from "./reach";
/** Supabase is only for the local-development "cloud" connection; loaded on first use, never in the web bundle. */
const sb = async () => (await import("./supabase")).supabase;

type Group = { org: R; role: R };
type Session = {
  ready: boolean;
  /** Signed in, but the phone can't reach its records and has no saved copy of who you are yet. */
  unreachable: boolean;
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
   * Join the Bayanihan Network with this phone's own Person and key: the server sends a one-time challenge, the phone
   * signs it, and the server issues this phone a token. Records already on the phone stay on the phone.
   */
  joinEcosystem(url?: string): Promise<void>;
  /** Sign in with Google on the Bayanihan Network: links Google to you, or brings back the person you were on a new phone. */
  googleEcosystem(): Promise<void>;
  /** Sign in to the Bayanihan Network with a proven method (lib/signin.ts): the route and what it needs. */
  networkSignIn(path: string, extra: Record<string, unknown>, method: { via: string; email?: string }): Promise<{ created: boolean }>;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
};
const Ctx = createContext<Session | null>(null);
const BEFORE_KEY = "dasig.connection.before-ecosystem";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [person, setPerson] = useState<R | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [current, setCurrentState] = useState<R | null>(null);
  const [connection, setConn] = useState<Connection | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  /*
   * Which context the person last chose, remembered on this device (Don, 2026-11-15: the app always opened on the first
   * group, not the one last worked in). A group's id, or "me" for "Just me"; kept with the person's id, so someone else
   * signing in on this phone starts fresh. Without a choice (or after leaving that group), the first group.
   * Before this, "Just me" (null) was also undone by the next refresh, which read null as "not chosen yet".
   */
  const setCurrent = useCallback((org: R | null) => {
    chosen.context = org ? org.id : "me";
    setCurrentState(org);
    AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify({ person: chosen.person, context: chosen.context })).catch(() => {});
  }, []);

  const refresh = useCallback(() => getConnection().then(async (c) => {
    setConn(c);
    const signedIn = c.kind === "cloud" ? !!(await (await sb()).auth.getSession()).data.session : !!c.token;
    if (!signedIn) { setPerson(null); setGroups([]); return; }
    // Without signal: who you are and your groups as this phone last knew them, so the app opens signed in (reads come from lib/cache).
    let me: R; let gs: Group[];
    try {
    me = await bix.me();
    // Make sure this phone's own key is on the person's record (once per phone; quietly retried next time if offline).
    try {
      const { withMyKey, keyRotation } = await import("./keys");
      const add = await withMyKey(me);
      if (add) me = (await bix.commitNow(bix.next(me, add)))[0] ?? me;
      // Rotate an old key on the Bayanihan Network: publish the new key first, and use it only once the server has it.
      else if (c.kind === "ecosystem") {
        const rot = await keyRotation(me);
        if (rot) { me = (await bix.commitNow(bix.next(me, { publicKey: rot.publicKey })))[0] ?? me; await rot.adopt();
          const AS = (await import("@react-native-async-storage/async-storage")).default;
          const saved = await AS.getItem("dasig.ecosystem.person"); if (saved) await AS.setItem("dasig.ecosystem.person", JSON.stringify({ ...JSON.parse(saved), publicKey: rot.publicKey.filter((x: any) => x.status === "active") })); }
      }
    } catch {}
    const roles = (await bix.search("Role", { person: `Person/${me.id}` })).filter((r) => r.status === "active");
    gs = [];
    for (const role of roles) { try { gs.push({ role, org: await bix.get("Organization", role.organization.reference.split("/")[1]) }); } catch (e) { if (e instanceof Offline) throw e; } }
    stale = false; setUnreachable(false);
    AsyncStorage.setItem(SNAP, JSON.stringify({ me, gs })).catch(() => {});
    } catch (e) {
      if (!(e instanceof Offline)) throw e;
      const snap = await AsyncStorage.getItem(SNAP).catch(() => null);
      if (!snap) { stale = true; setUnreachable(true); return; }
      ({ me, gs } = JSON.parse(snap) as { me: R; gs: Group[] }); stale = true; setUnreachable(false);
    }
    setPerson(me); chosen.person = me.id;
    if (chosen.context === undefined) {
      const saved = await AsyncStorage.getItem(CONTEXT_KEY).catch(() => null);
      const v = saved ? (JSON.parse(saved) as { person?: string; context?: string }) : null;
      chosen.context = v && v.person === me.id ? v.context ?? null : null;
    }
    setGroups(gs);
    // The remembered choice, as a fresh record (not a stale copy); "Just me" stays "Just me".
    const want = chosen.context;
    setCurrentState(want === "me" ? null : gs.find((g) => g.org.id === want)?.org ?? gs[0]?.org ?? null);
  }), []);

  useEffect(() => { refresh().catch(() => {}).finally(() => setReady(true)); }, [refresh]);
  // Back in reach after opening from the saved copy: load the real records once.
  useEffect(() => onReach((r) => { if (stale && r.lastOk) { stale = false; refresh().catch(() => {}); } }), [refresh]);
  // Web: ask the browser to keep this app's storage (the device key and anything waiting to sync), so it isn't cleared.
  useEffect(() => { if (typeof navigator !== "undefined" && (navigator as any).storage?.persist) (navigator as any).storage.persist().catch(() => {}); }, []);

  const startWithNickname = async (nickname: string) => {
    const c = await getConnection();
    const name = nickname.trim() || "Friend";
    if (c.kind === "cloud") {
      if (!(await (await sb()).auth.getSession()).data.session) { const { error } = await (await sb()).auth.signInAnonymously(); if (error) throw error; }
      await bix.me(name);
    } else if (c.kind === "phone" && !c.token) {
      const { localEngine } = await import("@/local/engine");
      const e = await localEngine();
      const res = await e.fetch(new Request("http://phone/$pair", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: e.pairingCode, nickname: name }) }));
      const out = await res.json();
      if (!res.ok) throw new Error(String(out.error));
      await setConnection({ kind: "phone", token: out.token });
    } else if (c.kind === "ecosystem" && !c.token) {
      // The web app: join the Bayanihan Network with a nickname. This browser's key is added to the Person on the next refresh.
      const res = await fetch(`${c.url}/$join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: name }) }).catch(() => null);
      const out = res ? await res.json().catch(() => ({})) : { error: "the Bayanihan Network didn't answer; check your internet" };
      if (!res || !res.ok) throw new Error(String(out.error ?? "Couldn't join the Bayanihan Network"));
      await setConnection({ kind: "ecosystem", url: c.url, token: out.token });
    }
    await refresh();
  };

  const pairWithHub = async (hub: string, code: string, nickname?: string) => {
    const url = hub.replace(/\/$/, "");
    await (await import("./handover")).rememberNetwork();
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
    if (!url) throw new Error("The Bayanihan Network isn't set up in this version of the app.");
    let out: { token: string };
    if (person) {
      const { joinWithKey } = await import("./ecosystem");
      // Bring this phone's Person (with its key) so the account online is the same person, not a stranger with the same nickname.
      out = await joinWithKey(url, { id: person.id, name: person.name, credit: person.credit, description: person.description, publicKey: (person.publicKey ?? []).filter((x: any) => x.status === "active") });
    } else {
      const res = await fetch(`${url}/$join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: "Friend" }) }).catch(() => null);
      if (!res || !res.ok) throw new Error("Couldn't join the Bayanihan Network. Check your internet and try again.");
      out = await res.json();
    }
    const before = await getConnection();
    if (before.kind !== "ecosystem") await AsyncStorage.setItem(BEFORE_KEY, JSON.stringify(before));
    await setConnection({ kind: "ecosystem", url, token: out.token });
    await refresh();
  };

  const meNow = () => (person ? { id: person.id, name: person.name, credit: person.credit, publicKey: (person.publicKey ?? []).filter((x: any) => x.status === "active") } : null);
  const networkSignIn = async (path: string, extra: Record<string, unknown>, method: { via: string; email?: string }) => {
    const { networkUrl } = await import("./env");
    const { networkSignIn: go } = await import("./ecosystem");
    const out = await go(networkUrl, meNow(), path, extra);
    if (!out.token) throw new Error("The Bayanihan Network didn't finish the sign-in. Try again.");
    const before = await getConnection();
    if (before.kind !== "ecosystem") await AsyncStorage.setItem(BEFORE_KEY, JSON.stringify(before));
    await setConnection({ kind: "ecosystem", url: networkUrl, token: out.token });
    await (await import("./signin")).rememberMethod(method.via, method.email);
    await refresh();
    return { created: !!(out as { created?: boolean }).created };
  };
  const googleEcosystem = async () => {
    const { networkUrl } = await import("./env");
    const { googleSignIn } = await import("./ecosystem");
    const out = await googleSignIn(networkUrl, meNow());
    if (!out.token) throw new Error("Google sign-in didn't finish. Try again.");
    await (await import("./signin")).rememberMethod("google");
    const before = await getConnection();
    if (before.kind !== "ecosystem") await AsyncStorage.setItem(BEFORE_KEY, JSON.stringify(before));
    await setConnection({ kind: "ecosystem", url: networkUrl, token: out.token });
    await refresh();
  };

  const useThisPhone = async () => {
    // Leaving the Bayanihan Network returns to whatever this device used before (its own server, its hub, or the web's server).
    const c = await getConnection();
    const saved = c.kind === "ecosystem" ? await AsyncStorage.getItem(BEFORE_KEY) : null;
    if (saved) { await setConnection(JSON.parse(saved) as Connection); await AsyncStorage.removeItem(BEFORE_KEY); }
    else await setConnection({ kind: "phone", token: await AsyncStorageGet() });
    await refresh();
  };
  const signOut = async () => {
    const c = await getConnection();
    // On the Bayanihan Network, end the session on the server too; the account (Dasig or Google) is how you get back in.
    if (c.kind === "ecosystem" && c.token) await fetch(`${c.url}/$signout`, { method: "POST", headers: { authorization: `Bearer ${c.token}` } }).catch(() => {});
    await AsyncStorage.removeItem("dasig.account.linked");
    if (c.kind === "cloud") await (await sb()).auth.signOut();
    else if (c.kind === "ecosystem" && Platform.OS === "web") await setConnection({ kind: "ecosystem", url: c.url, token: "" });
    else await setConnection(c.kind === "hub" || c.kind === "ecosystem" ? { kind: "phone", token: await AsyncStorageGet() } : { kind: "phone" });
    chosen.context = undefined; chosen.person = undefined; await AsyncStorage.removeItem(CONTEXT_KEY).catch(() => {}); await AsyncStorage.removeItem(SNAP).catch(() => {});
    setPerson(null); setGroups([]); setCurrentState(null); await refresh();
  };

  useEffect(() => { import("./files").then((m) => m.setUploadGroup(current?.id ?? null)).catch(() => {}); }, [current?.id]);
  const profileDone = !!(person?.extension ?? []).find((x: any) => x.url === "bayanihan:profile-done");
  const isLead = !!current && groups.some((g) => g.org.id === current.id && ["officer", "core-member"].includes(g.role.code?.code));
  return <Ctx.Provider value={{ ready, unreachable, person, profileDone, isLead, groups, current, connection, setCurrent, startWithNickname, pairWithHub, useThisPhone, joinEcosystem, googleEcosystem, networkSignIn, refresh, signOut }}>{children}</Ctx.Provider>;
}

const CONTEXT_KEY = "dasig.context";
/** Who you are and your groups, as last loaded, for opening the app without signal. */
const SNAP = "dasig.session.v1";
/** The session is showing the saved copy (or nothing), and should reload when the phone is back in reach. */
let stale = false;
/** The remembered context (one session provider per app): undefined until read from storage. */
const chosen: { context: string | null | undefined; person: string | undefined } = { context: undefined, person: undefined };
async function AsyncStorageGet(): Promise<string | undefined> { return (await AsyncStorage.getItem("dasig.phone.token")) ?? undefined; }
/** The phone's own token, remembered when switching to a hub, so going back keeps your local records. */
export async function rememberPhoneToken(t?: string) { if (t) await AsyncStorage.setItem("dasig.phone.token", t); }

export const useSession = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
};
