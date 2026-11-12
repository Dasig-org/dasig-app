import { router } from "expo-router";
import { Share, Text } from "react-native";
import type { R } from "@/lib/bix";
import { appUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { IconCircle, Panel, Row, Sheet } from "./kit";
import type { IconName } from "./Icon";
import { c, type as t } from "./theme";

/*
 * "+" that knows where you are (workspace/docs/ux/NAVIGATION_PLAN.md): the first item is the likeliest next step.
 * Contexts: home (with the next event, if any), a project, a team, a task. Leads and volunteers get different lists.
 */
export type AddContext = { kind: "home"; event?: R | null } | { kind: "project"; project: R; lead: boolean } | { kind: "team"; team: R; lead: boolean } | { kind: "task"; task: R; lead: boolean; onIt: boolean; on: (what: "step" | "photo" | "ask" | "time") => void };
type Item = { icon: IconName; title: string; meta?: string; go: () => void };

export function AddSheet({ open, onClose, ctx }: { open: boolean; onClose: () => void; ctx: AddContext }) {
  const s = useSession();
  const lead = ctx.kind === "home" ? !!s.current && s.isLead : ctx.lead;
  const nav = (to: string, params?: Record<string, string>) => { onClose(); setTimeout(() => router.push((params ? { pathname: to, params } : to) as never), 50); };
  const items: Item[] = [];
  if (ctx.kind === "home") {
    const e = ctx.event;
    if (lead && s.current) {
      if (e) items.push({ icon: "pen", title: `Add work to ${e.title}`, meta: "Tasks for every team, in one list", go: () => nav(`/project/${e.id}/plan`) },
        { icon: "share", title: "Share open slots", meta: "One message for the group chat", go: () => nav("/home") });
      items.push({ icon: "userplus", title: "Invite people", meta: "By link, code or nickname", go: () => nav(`/org/${s.current!.id}/people`) },
        { icon: "flag", title: "New event", meta: s.current.name, go: () => nav("/new-project", { org: s.current!.id }) });
      if (e) items.push({ icon: "box", title: "Post a need", meta: e.title, go: () => nav("/need/new", { project: e.id }) });
    } else {
      items.push({ icon: "link", title: "Join with a link or code", meta: "Someone sent you an invite", go: () => nav("/volunteer") },
        { icon: "pin", title: "Find a group", meta: "Groups and projects near you", go: () => nav("/nearby") },
        { icon: "pen", title: "Something of my own", meta: "A personal project", go: () => nav("/new-project") });
    }
    items.push({ icon: "users", title: "Start a group", go: () => nav("/start-group") });
  } else if (ctx.kind === "project") {
    const p = ctx.project;
    if (ctx.lead) items.push({ icon: "pen", title: "Add work", meta: "Tasks for every team, in one list", go: () => nav(`/project/${p.id}/plan`) },
      { icon: "building", title: "Add a milestone", meta: "Work others wait on", go: () => nav(`/project/${p.id}/plan`, { milestone: "1" }) },
      { icon: "box", title: "Post a need", meta: "Goods, a venue, a skill, people", go: () => nav("/need/new", { project: p.id }) },
      { icon: "userplus", title: "Invite volunteers", meta: "A link to this project", go: () => Share.share({ message: `Help with ${p.title}! Pick a slot → ${appUrl()}/project/${p.id}` }).catch(() => {}) },
      { icon: "flag", title: "Start a vote", meta: "Decide something together", go: () => nav("/vote/new", { project: p.id }) });
    else items.push({ icon: "heart", title: "Offer help for a need", meta: "See what's needed", go: () => nav(`/project/${p.id}`) });
  } else if (ctx.kind === "team") {
    const tm = ctx.team;
    const ini = tm.initiative?.reference?.split("/")[1];
    items.push({ icon: "pen", title: "Add a task", meta: ini ? "For this team or any other" : "Type it in the box at the bottom", go: () => (ini ? nav(`/project/${ini}/plan`) : onClose()) });
    if (ctx.lead) items.push({ icon: "userplus", title: `Invite to ${tm.name}`, meta: "A link to this team", go: () => nav(`/team/${tm.id}/people`) });
  } else {
    const { on } = ctx;
    if (ctx.onIt || ctx.lead) items.push({ icon: "check", title: "Add a smaller step", go: () => { onClose(); on("step"); } },
      { icon: "camera", title: "Add a photo or result", go: () => { onClose(); on("photo"); } });
    if (ctx.lead) items.push({ icon: "users", title: "Ask someone", go: () => { onClose(); on("ask"); } }, { icon: "cal", title: "Set a time", meta: "Due date, call time, how long", go: () => { onClose(); on("time"); } });
  }
  return <Sheet open={open} onClose={onClose}>
    <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Add</Text>
    <Panel style={{ backgroundColor: c.wash }}>{items.map((x, i) => <Row key={x.title} left={<IconCircle name={x.icon} tone="white" />} title={x.title} meta={x.meta} onPress={x.go} last={i === items.length - 1} />)}</Panel>
  </Sheet>;
}
