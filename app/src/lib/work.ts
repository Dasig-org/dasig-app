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
