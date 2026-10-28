import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { bix, type R } from "./bix";

type Group = { org: R; role: R };
type Session = {
  ready: boolean;
  person: R | null;
  groups: Group[];
  /** null = personal context */
  current: R | null;
  setCurrent(org: R | null): void;
  /** Sign in with only a nickname (anonymous account), then create or load the Person. */
  startWithNickname(nickname: string): Promise<void>;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
};
const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [person, setPerson] = useState<R | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [current, setCurrent] = useState<R | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setPerson(null); setGroups([]); return; }
    const me = await bix.me();
    setPerson(me);
    const roles = (await bix.search("Role", { person: `Person/${me.id}` })).filter((r) => r.status === "active");
    const gs: Group[] = [];
    for (const role of roles) {
      try { gs.push({ role, org: await bix.get("Organization", role.organization.reference.split("/")[1]) }); } catch {}
    }
    setGroups(gs);
    setCurrent((c) => (c && gs.some((g) => g.org.id === c.id) ? c : gs[0]?.org ?? null));
  }, []);

  useEffect(() => { refresh().catch(() => {}).finally(() => setReady(true)); }, [refresh]);

  const startWithNickname = async (nickname: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    }
    await bix.me(nickname.trim() || "Friend");
    await refresh();
  };
  const signOut = async () => { await supabase.auth.signOut(); setPerson(null); setGroups([]); setCurrent(null); };

  return <Ctx.Provider value={{ ready, person, groups, current, setCurrent, startWithNickname, refresh, signOut }}>{children}</Ctx.Provider>;
}
export const useSession = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
};
