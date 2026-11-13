import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { invite, lookupHandle } from "@/lib/invites";
import { useSession } from "@/lib/session";
import { act, peopleFor, personName } from "@/lib/work";
import { Avatar, Field, IconCircle, LinkText, Meta, Notice, Outline, Panel, Row, Sheet } from "./kit";
import { Icon } from "./Icon";
import { c, radius, type as t } from "./theme";

/*
 * One way to add people (design/teamwork-sketches.html C, BIX "Usernames and invitations"). The same sheet on a team,
 * a task and a group:
 *   1. "Name, @username or email" — names filter the lists; @username finds one person exactly; an email address
 *      offers an invitation (which reveals nothing about whether that address uses Dasig).
 *   2. In this group — each person with their current team. Team: Add (at once). Task: Ask (they stay on their own
 *      team). Group: already members.
 *   3. People you've worked with — from your other groups. Invite: they accept; never added directly.
 *   4. Someone new — the link or QR the screen already had (onSomeoneNew).
 */
export type AddTarget =
  | { kind: "team"; team: R }
  | { kind: "task"; task: R; teamName?: string }
  | { kind: "group" };
type Person = { ref: string; p: R; teams: string[] };

export function AddPeople({ open, onClose, orgId, target, onSomeoneNew, onDone, suggested = [], suggestedLabel }: { open: boolean; onClose: () => void; orgId: string; target: AddTarget; onSomeoneNew?: () => void; onDone?: (msg: string) => void; suggested?: { ref: string; p: R }[]; suggestedLabel?: string }) {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"team" | "group">("team");
  const [inGroup, setInGroup] = useState<Person[] | null>(null);
  const [known, setKnown] = useState<Person[]>([]);
  const [found, setFound] = useState<{ ref: string; name: string; photo?: any; handle: string } | null | "none">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const org = `Organization/${orgId}`;

  useEffect(() => {
    if (!open) return;
    setQ(""); setMsg(null); setFound(null); setDone(new Set());
    (async () => {
      const roles = (await bix.search("Role", { organization: org }).catch(() => [] as R[])).filter((r) => r.status === "active");
      const refs = [...new Set(roles.map((r) => r.person.reference as string))].filter((r) => r !== me);
      // Their current teams in this group, for the meta line ("Water", "Marshals · lead").
      const projects = (await bix.search("Initiative", { organization: org }).catch(() => [] as R[])).filter((p) => p.status === "active");
      const teams = (await Promise.all(projects.map((p) => bix.search("Team", { initiative: `Initiative/${p.id}` }).catch(() => [] as R[])))).flat();
      const ppl = await peopleFor(refs, 60);
      setInGroup(refs.filter((r) => ppl[r]).map((r) => ({ ref: r, p: ppl[r]!, teams: teams.filter((tm) => (tm.participant ?? []).some((x: any) => x.person.reference === r && x.status === "active"))
        .map((tm) => `${tm.name}${(tm.participant ?? []).some((x: any) => x.person.reference === r && x.role === "lead") ? " · lead" : ""}`) })));
      // People you've worked with: active members of your other groups who aren't in this one.
      const mine = s.groups.filter((g) => g.org.id !== orgId);
      const others = (await Promise.all(mine.slice(0, 6).map(async (g) => (await bix.search("Role", { organization: `Organization/${g.org.id}` }).catch(() => [] as R[]))
        .filter((r) => r.status === "active").map((r) => ({ ref: r.person.reference as string, group: g.org.name as string }))))).flat()
        .filter((x) => x.ref !== me && !refs.includes(x.ref));
      const uniq = [...new Map(others.map((x) => [x.ref, x])).values()].slice(0, 20);
      const kp = await peopleFor(uniq.map((x) => x.ref), 20);
      setKnown(uniq.filter((x) => kp[x.ref]).map((x) => ({ ref: x.ref, p: kp[x.ref]!, teams: [x.group] })));
    })().catch(() => setInGroup([]));
  }, [open, orgId]);

  // "@ana.cebu" or a bare handle-looking word: exact lookup, after a pause.
  const handle = q.trim().toLowerCase().replace(/^@/, "");
  const isEmail = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(q.trim());
  const looksHandle = !isEmail && /^@?[a-z][a-z0-9_.]{2,19}$/i.test(q.trim());
  useEffect(() => {
    setFound(null);
    if (!open || !looksHandle) return;
    const h = setTimeout(() => lookupHandle(handle).then((r) => setFound(r ?? "none")).catch(() => setFound("none")), 450);
    return () => clearTimeout(h);
  }, [q, open]);

  const onTeam = (ref: string) => target.kind === "team" && (target.team.participant ?? []).some((x: any) => x.person.reference === ref && x.status === "active");
  const onTask = (ref: string) => target.kind === "task" && ((target.task.participant ?? []).some((x: any) => x.person.reference === ref && x.status !== "ended") || target.task.owner?.reference === ref);
  const run = async (key: string, f: () => Promise<unknown>, ok: string) => {
    setBusy(key); setMsg(null);
    try { await f(); setDone((d) => new Set(d).add(key)); setMsg(ok); onDone?.(ok); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  const targetRef = target.kind === "team" ? `Team/${target.team.id}` : target.kind === "task" ? `Task/${target.task.id}` : org;
  const role = target.kind === "team" ? "team-member" : target.kind === "task" ? "helper" : "volunteer";
  const name = (x: Person) => personName(x.p);

  // What tapping does for someone in this group.
  const inGroupAction = (x: Person) => {
    if (target.kind === "team") {
      if (onTeam(x.ref) || done.has(x.ref)) return <Icon name="check" color={c.accent} />;
      return <Outline label={busy === x.ref ? "…" : "Add"} onPress={() => run(x.ref, async () => {
        const fresh = await bix.get("Team", target.team.id); const rest = (fresh.participant ?? []).filter((p: any) => p.person.reference !== x.ref);
        await bix.commit(bix.next(fresh, { participant: [...rest, { person: { reference: x.ref }, role: "volunteer", status: "active" }] }));
      }, `${name(x)} is on ${target.team.name}.`)} />;
    }
    if (target.kind === "task") {
      if (onTask(x.ref) || done.has(x.ref)) return <Icon name="check" color={c.accent} />;
      const shift = Number(target.task.slots ?? 1) > 1;
      return <Outline label={busy === x.ref ? "…" : "Ask"} onPress={() => run(x.ref, async () => {
        // One-person tasks: the usual ask (they answer I'm in / Can't). Shifts: an invitation to one place.
        if (!shift && ["ready"].includes(target.task.status)) await bix.commit(act.ask(await bix.get("Task", target.task.id), x.ref));
        else await invite({ target: targetRef, role: "helper", person: x.ref });
      }, `Asked ${name(x)}. They stay on their own team.`)} />;
    }
    return <Meta>In the group</Meta>;
  };
  const filt = (xs: Person[]) => (q.trim() && !isEmail && !q.trim().startsWith("@") ? xs.filter((x) => name(x).toLowerCase().includes(q.trim().toLowerCase())) : xs);
  const teamPeople = target.kind === "task" && target.teamName ? (inGroup ?? []).filter((x) => x.teams.some((n) => n.split(" · ")[0] === target.teamName)) : [];
  const groupList = filt(inGroup ?? []);
  const title = target.kind === "team" ? `Add people to ${target.team.name}` : target.kind === "task" ? "Ask someone to do this" : "Invite people";
  const sub = target.kind === "team" ? "They join the team and see its work." : target.kind === "task" ? `${target.task.title}. They stay on their own team.` : "They get an invitation to join.";

  return <Sheet open={open} onClose={onClose}>
    <Text style={[t.row, { fontSize: 18 }]}>{title}</Text>
    <Meta>{sub}</Meta>
    <View style={{ marginTop: 8 }}><Field icon="search" value={q} onChangeText={setQ} placeholder="Name, @username or email" autoCapitalize="none" autoCorrect={false} /></View>
    {msg ? <Notice>{msg}</Notice> : null}
    {/* An exact username match, or an email address. */}
    {looksHandle && found && found !== "none" ? <Panel style={{ backgroundColor: c.wash, marginTop: 8 }}>
      <Row left={<Avatar name={found.name} photo={found.photo} />} title={found.name} meta={`@${found.handle}`} last
        right={found.ref === me ? <Meta>You</Meta> : done.has(found.ref) ? <Icon name="check" color={c.accent} /> : <Outline label={busy === found.ref ? "…" : "Invite"} onPress={() => run(found.ref, () => invite({ target: targetRef, role, handle: found.handle }), `Invitation sent to @${found.handle}.`)} />} />
    </Panel> : null}
    {looksHandle && found === "none" && q.trim().startsWith("@") ? <View style={{ marginTop: 8, marginHorizontal: 4 }}><Meta>{`No one with the username @${handle}.`}</Meta></View> : null}
    {isEmail ? <Panel style={{ backgroundColor: c.wash, marginTop: 8 }}>
      <Row left={<IconCircle name="mail" tone="white" />} title={`Send an invitation to ${q.trim()}`} meta="They'll get an email. If they don't use Dasig yet, they can join from it." last
        right={done.has(q.trim()) ? <Icon name="check" color={c.accent} /> : <Outline label={busy === q.trim() ? "…" : "Send"} onPress={() => run(q.trim(), () => invite({ target: targetRef, role, email: q.trim() }), `Invitation sent to ${q.trim()}.`)} />} />
    </Panel> : null}
    {target.kind === "task" ? <View style={{ flexDirection: "row", backgroundColor: c.wash, borderRadius: 999, padding: 4, gap: 4, marginTop: 10 }}>
      {(["team", "group"] as const).map((k) => <Pressable key={k} onPress={() => setScope(k)} style={{ flex: 1, paddingVertical: 8, borderRadius: 999, backgroundColor: scope === k ? c.white : "transparent", alignItems: "center" }}>
        <Text style={{ fontWeight: "700", fontSize: 13, color: scope === k ? c.ink : c.s500 }}>{k === "team" ? "This team" : "Whole group"}</Text></Pressable>)}
    </View> : null}
    {/* Asked back (BIX Task.suggestedFor): people who did this team's work before. */}
    {!q.trim() && suggested.length ? <>
      <Text style={[t.eyebrow, { marginTop: 14, marginBottom: 6, marginLeft: 4 }]}>{suggestedLabel ?? "Helped before"}</Text>
      <Panel style={{ backgroundColor: c.wash }}>{suggested.map((x, i, all) => <Row key={x.ref} left={<Avatar name={personName(x.p)} photo={x.p.photo} />} title={personName(x.p)} meta="Asked back" last={i === all.length - 1}
        right={inGroupAction({ ref: x.ref, p: x.p, teams: [] })} />)}</Panel>
    </> : null}
    {!isEmail && !q.trim().startsWith("@") ? <>
      <Text style={[t.eyebrow, { marginTop: 14, marginBottom: 6, marginLeft: 4 }]}>{`In ${s.groups.find((g) => g.org.id === orgId)?.org.name ?? "this group"}`}</Text>
      <Panel style={{ backgroundColor: c.wash }}>
        {inGroup === null ? <Row title="Loading…" last /> : (() => {
          const list = target.kind === "task" && scope === "team" ? filt(teamPeople) : groupList;
          if (!list.length) return <Row title={q.trim() ? `No one called "${q.trim()}" here` : target.kind === "task" && scope === "team" ? "No one else on this team yet" : "No one else here yet"} meta={target.kind === "task" && scope === "team" ? "Try Whole group" : undefined} last />;
          return list.slice(0, 30).map((x, i, all) => <Row key={x.ref} left={<Avatar name={name(x)} photo={x.p.photo} />} title={name(x)} meta={x.teams.join(", ") || "No team yet"} last={i === all.length - 1} right={inGroupAction(x)} />);
        })()}
      </Panel>
      {target.kind !== "task" || scope === "group" ? (filt(known).length ? <>
        <Text style={[t.eyebrow, { marginTop: 14, marginBottom: 6, marginLeft: 4 }]}>People you've worked with</Text>
        <Panel style={{ backgroundColor: c.wash }}>{filt(known).map((x, i, all) => <Row key={x.ref} left={<Avatar name={name(x)} photo={x.p.photo} />} title={name(x)} meta={`With you in ${x.teams[0]}`} last={i === all.length - 1}
          right={done.has(x.ref) ? <Icon name="check" color={c.accent} /> : <Outline label={busy === x.ref ? "…" : "Invite"} onPress={() => run(x.ref, () => invite({ target: targetRef, role, person: x.ref }), `Invitation sent to ${name(x)}. They'll see it in their Inbox.`)} />} />)}</Panel>
      </> : null) : null}
    </> : null}
    {onSomeoneNew ? <Pressable accessibilityRole="button" onPress={() => { onClose(); setTimeout(onSomeoneNew, 250); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginTop: 12, borderRadius: radius.panel, backgroundColor: c.sand }}>
      <Icon name="link" size={20} color={c.accent} /><Text style={[t.row, { fontSize: 14 }]}>Someone new: share a link or QR</Text></Pressable> : null}
    <View style={{ marginTop: 12, alignItems: "center" }}><LinkText onPress={onClose}>Done</LinkText></View>
  </Sheet>;
}
