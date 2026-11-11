import type { IconName } from "@/ui/Icon";

/**
 * Kinds of event and what they usually need (workspace/design/coordinator-sketches.html, B5–B8). A starting point the
 * coordinator edits, never a rule. `before` is days before the event (0 = on the day); `people` becomes Task.slots.
 */
export type Work = { title: string; before: number; people?: number; gate?: boolean; hours?: number };
export type Kind = { code: string; label: string; photo: number; teams: { name: string; icon: IconName; work: Work[] }[] };

const P = {
  run: require("../../assets/images/zero/cleanup.jpg"),
  cleanup: require("../../assets/images/zero/school-cleanup.jpg"),
  outreach: require("../../assets/images/zero/youth-group.jpg"),
  talk: require("../../assets/images/zero/tutoring.jpg"),
};
const comms = (after = true): { name: string; icon: IconName; work: Work[] } => ({ name: "Communications", icon: "mega", work: [
  { title: "Make the poster", before: 21 }, { title: "Post the call for volunteers", before: 14 }, ...(after ? [{ title: "Thank-you post with photos", before: -1 }] : []) ] });

export const KINDS: Kind[] = [
  { code: "run", label: "Fun run or race", photo: P.run, teams: [
    { name: "Route", icon: "pin", work: [{ title: "Get the barangay permit", before: 21, gate: true }, { title: "Walk the route with the barangay", before: 14 }, { title: "Marshals on the route", before: 0, people: 4, hours: 2.5 }] },
    { name: "Water", icon: "box", work: [{ title: "Ask sponsors for water", before: 21 }, { title: "Set up water stations", before: 0, people: 4, hours: 3 }] },
    { name: "Registration", icon: "receipt", work: [{ title: "Print race bibs", before: 7 }, { title: "Hand out race bibs", before: 0, people: 3, hours: 2 }] },
    comms() ] },
  { code: "cleanup", label: "Cleanup", photo: P.cleanup, teams: [
    { name: "Site", icon: "pin", work: [{ title: "Coordinate with the barangay", before: 14, gate: true }, { title: "Collect sacks and gloves", before: 3 }, { title: "Cleanup crew", before: 0, people: 10, hours: 3 }] },
    { name: "Waste", icon: "box", work: [{ title: "Arrange the waste pickup", before: 7 }, { title: "Weigh and record what was collected", before: 0 }] },
    comms() ] },
  { code: "outreach", label: "Outreach or relief", photo: P.outreach, teams: [
    { name: "Goods", icon: "box", work: [{ title: "List what's needed", before: 14 }, { title: "Collect donations", before: 7 }, { title: "Pack the goods", before: 1, people: 6, hours: 3 }] },
    { name: "Distribution", icon: "users", work: [{ title: "Confirm the list with the barangay", before: 7, gate: true }, { title: "Hand out the packs", before: 0, people: 6, hours: 3 }] },
    comms() ] },
  { code: "talk", label: "Workshop or talk", photo: P.talk, teams: [
    { name: "Program", icon: "mic", work: [{ title: "Confirm the speakers", before: 21, gate: true }, { title: "Prepare the materials", before: 3 }] },
    { name: "Venue", icon: "building", work: [{ title: "Book the venue", before: 28, gate: true }, { title: "Set up the room", before: 0, people: 3, hours: 2 }] },
    { name: "Registration", icon: "receipt", work: [{ title: "Open registration", before: 21 }, { title: "Welcome table", before: 0, people: 2, hours: 3 }] },
    comms() ] },
  { code: "other", label: "Something else", photo: P.outreach, teams: [
    { name: "Planning", icon: "flag", work: [] }, comms(false) ] },
];

/** "3 weeks before", "On the day", "1 day after". */
export const relative = (d: number) => d === 0 ? "On the day" : d < 0 ? `${-d} day${d === -1 ? "" : "s"} after`
  : d % 7 === 0 ? `${d / 7} week${d === 7 ? "" : "s"} before` : `${d} day${d === 1 ? "" : "s"} before`;
