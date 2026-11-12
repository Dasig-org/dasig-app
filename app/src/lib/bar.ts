import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bix } from "./bix";
import { useSession } from "./session";

/**
 * The bottom bar by role and context (workspace/docs/ux/NAVIGATION_PLAN.md). Home (slot 1) and + (slot 3) are fixed;
 * slots 2, 4 and 5 follow the role, and each person can change them per context in Me → Your bar.
 */
export type Slot = "projects" | "nearby" | "inbox" | "people" | "team" | "story" | "groups";
export const SLOTS: { key: Slot; label: string; meta: string }[] = [
  { key: "projects", label: "Projects", meta: "Your group's events and projects" },
  { key: "nearby", label: "Nearby", meta: "Groups and projects that chose to be found" },
  { key: "inbox", label: "Inbox", meta: "What needs your answer" },
  { key: "people", label: "People", meta: "Core team, volunteers, invite" },
  { key: "team", label: "Team", meta: "The team you're on or lead" },
  { key: "story", label: "Me", meta: "Your story and settings" },
  { key: "groups", label: "Groups", meta: "Your groups" },
];
type Ctx = ReturnType<typeof useSession>;
export function defaultSlots(s: Ctx, leadsTeam = false): [Slot, Slot, Slot] {
  if (s.current && s.isLead) return ["projects", "inbox", "people"];
  if (s.current && leadsTeam) return ["team", "inbox", "story"];
  return ["nearby", "inbox", "story"];
}
const key = (s: Ctx) => `dasig.bar.${s.person?.id ?? "anon"}.${s.current?.id ?? "me"}`;
const listeners = new Set<() => void>();

export function useBar() {
  const s = useSession();
  const [chosen, setChosen] = useState<[Slot, Slot, Slot] | null>(null);
  const k = key(s);
  useEffect(() => {
    let live = true;
    const read = () => AsyncStorage.getItem(k).then((v) => { if (live) setChosen(v ? (JSON.parse(v) as [Slot, Slot, Slot]) : null); }).catch(() => {});
    read(); listeners.add(read); return () => { live = false; listeners.delete(read); };
  }, [k]);
  // A team lead who isn't on the core team gets Team in slot 2.
  const [leadsTeam, setLeadsTeam] = useState(false);
  useEffect(() => {
    if (!s.current || s.isLead || !s.person) { setLeadsTeam(false); return; }
    const me = `Person/${s.person.id}`, org = `Organization/${s.current.id}`;
    bix.search("Team", { participant: me }).then((ts) => setLeadsTeam(ts.some((t) => t.organization?.reference === org && t.status !== "inactive"
      && (t.participant ?? []).some((p: any) => p.person.reference === me && p.role === "lead" && p.status === "active")))).catch(() => {});
  }, [s.current?.id, s.isLead, s.person?.id]);
  const slots = chosen ?? defaultSlots(s, leadsTeam);
  const save = async (next: [Slot, Slot, Slot] | null) => { if (next) await AsyncStorage.setItem(k, JSON.stringify(next)); else await AsyncStorage.removeItem(k); listeners.forEach((l) => l()); };
  return { slots, custom: !!chosen, save, defaults: defaultSlots(s, leadsTeam) };
}
