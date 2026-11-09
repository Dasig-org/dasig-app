import { bix, now, ref, type R, type Ref } from "./bix";
import type { IconName } from "@/ui/Icon";

export const personName = (p?: R | null) => (p?.name?.text as string) ?? "Someone";
export const refOf = (r: R) => `${r.resourceType}/${r.id}`;
export const shortRef = (r: R) => (r.identifier as { system?: string; value: string }[] | undefined)?.find((i) => i.system === "bayanihan:ref")?.value;
const active = (r: R) => ((r.participant ?? []) as { person: Ref; role: string; status: string }[]).filter((p) => p.status === "active");

/** Words people see for each Task state (EXPERIENCE.md glossary). */
export function stateLabel(t: R, me?: string): { label: string; tone: "neutral" | "ok" | "state" } {
  if (t.status === "draft") return { label: "Suggested", tone: "neutral" };
  if (t.status === "requested") return t.owner?.reference === me ? { label: "Asked of you", tone: "state" } : { label: "Asked", tone: "neutral" };
  if (t.status === "ready") return { label: "Open", tone: "neutral" };
  if (t.status === "accepted" || t.status === "in-progress") return t.owner?.reference === me ? { label: "You're on it", tone: "state" } : { label: "Taken", tone: "neutral" };
  if (t.status === "completed") return t.verification === "pending" ? { label: "Done · to confirm", tone: "ok" } : { label: "Done", tone: "ok" };
  return { label: String(t.status), tone: "neutral" };
}

/** Load people for an avatar stack (names and photos), at most `max`. Missing or hidden people are skipped. */
export async function peopleFor(refs: Iterable<string>, max = 12): Promise<Record<string, R>> {
  const out: Record<string, R> = {};
  await Promise.all([...new Set(refs)].slice(0, max).map(async (r) => { try { out[r] = await bix.get("Person", r.split("/")[1]!); } catch {} }));
  return out;
}
/** Names and photos for <Faces />, in the order given. */
export const facesOf = (refs: string[], people: Record<string, R>) => {
  const xs = refs.filter((r) => people[r]);
  return { names: xs.map((r) => personName(people[r])), photos: xs.map((r) => people[r]?.photo) };
};

/** Skills the person declared (BIX Person.skill, 2026-11-09), falling back to the older app extension. */
export const skillsOf = (p?: R | null): string[] =>
  ((p?.skill as { code: string }[] | undefined)?.map((x) => x.code)) ?? ((p?.extension ?? []).find((x: any) => x.url === "bayanihan:skills")?.value as string[] | undefined) ?? [];
export const skillCodings = (codes: string[]) => codes.map((code) => ({ system: "bayanihan:skill", code }));

/** Places on a piece of work, and how many are left (BIX Task.slots). */
export const places = (t: R) => { const n = (t.slots as number) ?? 1; const on = active(t).length; return { n, on, left: t.status === "ready" ? Math.max(0, n - on) : 0, shift: n > 1 }; };

/** A free-text place on a group or project ("Mactan Expo"). */
export const placeOf = (r?: R | null): string | undefined => (r?.extension ?? []).find((x: any) => x.url === "bayanihan:place-text")?.value;

/** Task changes. Each returns the next version; the server decides with Bayanihan Core. */
export const act = {
  claim: (t: R, me: string) =>
    bix.next(t, { status: "accepted", owner: { reference: me }, participant: [...active(t).filter((p) => p.person.reference !== me), { person: { reference: me }, role: "owner", status: "active" }], executionPeriod: { start: now() } }),
  helpOut: (t: R, me: string) =>
    bix.next(t, { participant: [...active(t).filter((p) => p.person.reference !== me), { person: { reference: me }, role: "helper", status: "active" }] }),
  release: (t: R) =>
    bix.next(t, { status: "ready", owner: t.team ?? t.owner, participant: active(t).filter((p) => p.role !== "owner"), executionPeriod: undefined }),
  done: (t: R) =>
    bix.next(t, { status: "completed", executionPeriod: { start: t.executionPeriod?.start ?? now(), end: now() } }),
  ask: (t: R, person: string) => bix.next(t, { status: "requested", owner: { reference: person } }),
  toggle: (t: R, i: number, me: string) =>
    bix.next(t, { checklist: (t.checklist ?? []).map((c: any, j: number) => (j === i ? { ...c, done: !c.done, ...(c.done ? {} : { doneBy: { reference: me } }) } : c)) }),
  accept: (t: R) => bix.next(t, { status: "ready", intent: "plan" }),
  /** Take one open place on a shift (BIX Task.slots > 1). The team stays owner; full when every place is taken. */
  takePlace: (t: R, me: string) => {
    const on = [...active(t).filter((p) => p.person.reference !== me), { person: { reference: me }, role: "helper", status: "active" }];
    return bix.next(t, { participant: on, status: on.length >= ((t.slots as number) ?? 1) ? "accepted" : "ready" });
  },
  /** Give a place back; the shift opens again. */
  leavePlace: (t: R, me: string) => bix.next(t, { participant: active(t).filter((p) => p.person.reference !== me), status: "ready" }),
  setSlots: (t: R, n: number) => bix.next(t, { slots: n > 1 ? n : undefined }),
};

/** Suggested teams by kind of project (onboarding step 6). The group renames, removes or adds. */
export const SUGGESTED_TEAMS: { name: string; icon: IconName }[] = [
  { name: "Communications", icon: "mega" }, { name: "Venue", icon: "pin" }, { name: "Design", icon: "palette" },
  { name: "Sponsors", icon: "handshake" }, { name: "Speakers", icon: "mic" }, { name: "Volunteers", icon: "users" },
  { name: "Attendee experience", icon: "smile" }, { name: "Audio, video & photo", icon: "video" }, { name: "Finance", icon: "coins" },
];
export function teamIcon(name: string): IconName {
  const n = name.toLowerCase();
  const hit = SUGGESTED_TEAMS.find((t) => n.includes(t.name.toLowerCase().split(" ")[0]!));
  if (hit) return hit.icon;
  if (n.includes("exhibit")) return "handshake";
  if (n.includes("ax")) return "smile";
  if (n.includes("av")) return "video";
  if (n.includes("lead")) return "flag";
  return "users";
}
export { ref };
