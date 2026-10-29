import type { IconName } from "@/ui/Icon";

/** Default causes (BIX bayanihan:cause, mapped to the SDGs in the spec). */
export const CAUSES = [
  { code: "education", label: "Education" }, { code: "health", label: "Health" }, { code: "food", label: "Food" },
  { code: "environment", label: "Environment" }, { code: "disaster-readiness", label: "Disaster readiness" }, { code: "livelihood", label: "Livelihood" },
  { code: "youth-leadership", label: "Youth" }, { code: "civic-participation", label: "Civic" }, { code: "digital-skills", label: "Digital skills" },
  { code: "arts-culture", label: "Arts & culture" }, { code: "faith-community", label: "Faith & community" }, { code: "animal-welfare", label: "Animals" },
];
const ALL = ["org.manage", "member.manage", "initiative.plan", "task.assign", "task.confirm", "report.submit"];
const LEAD = ["initiative.plan", "task.assign", "task.confirm"];
type P = { title: string; kind: "board" | "officer" | "committee-chair" | "other"; seats: number; permissions: string[] };
/** Starting structures (spec: "Organization structure"). Not legal advice. */
export const STRUCTURES: Record<string, { label: string; summary: string; icon: IconName; positions: P[] }> = {
  community: { label: "Community or meetup", summary: "Organizers and co-organizers", icon: "users", positions: [
    { title: "Lead organizer", kind: "officer", seats: 1, permissions: ALL }, { title: "Co-organizer", kind: "officer", seats: 6, permissions: [...LEAD, "member.manage", "report.submit"] }] },
  club: { label: "Club or chapter", summary: "President, VP, secretary, treasurer, directors", icon: "flag", positions: [
    { title: "President", kind: "officer", seats: 1, permissions: ALL }, { title: "Vice president", kind: "officer", seats: 1, permissions: [...LEAD, "member.manage"] },
    { title: "Secretary", kind: "officer", seats: 1, permissions: [...LEAD, "member.manage", "report.submit"] }, { title: "Treasurer", kind: "officer", seats: 1, permissions: LEAD },
    { title: "Director", kind: "board", seats: 5, permissions: LEAD }] },
  nonprofit: { label: "Registered nonprofit", summary: "Trustees, president, treasurer, secretary", icon: "building", positions: [
    { title: "Trustee", kind: "board", seats: 5, permissions: ["initiative.plan"] }, { title: "President", kind: "officer", seats: 1, permissions: ALL },
    { title: "Treasurer", kind: "officer", seats: 1, permissions: LEAD }, { title: "Corporate secretary", kind: "officer", seats: 1, permissions: [...LEAD, "member.manage", "report.submit"] }] },
  own: { label: "Our own way", summary: "Start with just you, add positions later", icon: "pen", positions: [] },
};
export type StructureKey = keyof typeof STRUCTURES;
export const ROLE_WORDS: Record<string, string> = { officer: "Officer", "core-member": "Core member", member: "Member", "volunteer-regular": "Regular volunteer", "volunteer-episodic": "Volunteer" };
