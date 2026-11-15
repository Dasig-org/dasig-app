import { appUrl } from "@/lib/env";
import { ErrorState } from "@/ui/ErrorState";
import { AddPeople } from "@/ui/AddPeople";
import { useEffect, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { parseDate, quick, short } from "@/lib/dates";
import { onSynced } from "@/lib/outbox";
import { pickDocument, pickPhoto, type Attachment } from "@/lib/files";
import { Files } from "@/ui/Files";
import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, Platform, Pressable, Share, Text, View } from "react-native";
import { bix, BixError, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, peopleFor, placeOf, places, stateLabel } from "@/lib/work";
import { History } from "@/ui/History";
import { Avatar, Body, Buttons, Check, Chips, Eyebrow, Faces, Field, IconCircle, LinkText, Meta, Notice, Outline, Panel, Pill, Primary, RoundButton, Row, Sand, Screen, ScreenTitle, Sheet, Skeleton } from "@/ui/kit";
import { ActionBar, StateChip } from "@/ui/m3";
import { useSnackbar } from "@/ui/Snackbar";
import { Icon, type IconName } from "@/ui/Icon";
import { atMost, visibilityOf } from "@/ui/Privacy";
import { FromLastTime } from "@/ui/FromLastTime";
import { SmallerSteps } from "@/ui/SmallerSteps";
import { c, tone, type as t } from "@/ui/theme";

/** One template for every Task: the state decides the action (DESIGN_STANDARD §1a, §1b). */
export default function Task() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [tuning, setTuning] = useState(false);
  const [dueText, setDueText] = useState("");
  const [desc, setDesc] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  const [arrive, setArrive] = useState<{ at: string; note: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [given, setGiven] = useState("");
  const [word, setWord] = useState("");
  const [stepFocus, setStepFocus] = useState(0);
  const [now] = useState(() => Date.now());
  useEffect(() => onSynced(() => setMsg(null)), []);
  const { data, error, reload } = useLoad(async () => {
    const task = await bix.get("Task", id);
    const team = task.team ? await bix.get("Team", task.team.reference.split("/")[1]).catch(() => null) : null;
    const refs = new Set<string>([...(task.participant ?? []).map((p: any) => p.person.reference), ...((team?.participant ?? []).map((p: any) => p.person.reference))]);
    const people: Record<string, R> = {};
    for (const r of refs) { try { people[r] = await bix.get("Person", r.split("/")[1]!); } catch {} }
    const signed = task.status === "completed" ? await bix.verify("Task", id).catch(() => null) : null;
    const siblings = task.partOf ? (await bix.search("Task", { partOf: task.partOf.reference })).filter((x) => x.id !== task.id && x.status !== "draft") : [];
    const can = await bix.can("Task", id);
    // A subtask sits under a Task (BIX partOf); its project is its parent's.
    const up: string = task.partOf?.reference ?? "";
    const parent = up.startsWith("Task/") ? await bix.get("Task", up.split("/")[1]!).catch(() => null) : null;
    const projRef: string = parent ? parent.partOf?.reference ?? "" : up;
    const project = projRef.startsWith("Initiative/") ? await bix.get("Initiative", projRef.split("/")[1]!).catch(() => null) : null;
    const subs = (await bix.search("Task", { partOf: `Task/${id}` }).catch(() => [] as R[])).filter((x) => x.status !== "cancelled");
    const orgRef = project?.organization?.reference ?? team?.organization?.reference;
    const org = orgRef ? await bix.get("Organization", orgRef.split("/")[1]!).catch(() => null) : null;
    for (const r of subs.map((x) => x.owner?.reference).filter((r: string | undefined) => r?.startsWith("Person/") && !people[r])) { try { people[r] = await bix.get("Person", r.split("/")[1]!); } catch {} }
    return { task, team, people, signed, siblings, can, project, org, parent, subs };
  }, [id]);
  const { data: before } = useLoad(async () => {
    const project = data?.project, team = data?.team;
    if (!asking || !project?.organization) return [];
    const inis = (await bix.search("Initiative", { organization: project.organization.reference })).filter((x) => x.id !== project.id);
    const olds = (await Promise.all(inis.slice(0, 6).map((x) => bix.search("Task", { partOf: `Initiative/${x.id}` })))).flat().filter((x) => x.status === "completed");
    const sameTeam = (await Promise.all(inis.slice(0, 6).map((x) => bix.search("Team", { initiative: `Initiative/${x.id}` })))).flat().filter((x) => x.name === team?.name).map((x) => `Team/${x.id}`);
    const refs = [...new Set(olds.filter((x) => sameTeam.includes(x.team?.reference)).flatMap((x) => ((x.participant ?? []) as any[]).filter((y) => y.status === "active").map((y) => y.person.reference)))]
      .filter((r) => r !== me && !(team?.participant ?? []).some((p: any) => p.person.reference === r));
    const ppl = await peopleFor(refs, 8); return refs.filter((r) => ppl[r]).map((r) => ({ ref: r, p: ppl[r]! }));
  }, [asking, data?.project?.id]);
  if (error) return <Screen back><ErrorState message={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { task, team, people, signed, siblings, can, project, org, parent, subs } = data;
  const openAllowed = atMost(visibilityOf(project), visibilityOf(s.groups.find((g) => `Organization/${g.org.id}` === (project?.organization?.reference ?? team?.organization?.reference))?.org)) === "public";
  const deps = (task.dependsOn ?? []).map((d: any) => siblings.find((x) => `Task/${x.id}` === d.reference)).filter(Boolean) as R[];
  const waitingOn = deps.filter((x) => x.status !== "completed");
  const unblocks = siblings.filter((x) => (x.dependsOn ?? []).some((d: any) => d.reference === `Task/${task.id}`));
  const name = (r?: string) => (r && people[r]?.name?.text) || "Someone";
  const parts = (task.participant ?? []).filter((p: any) => p.status === "active");
  const isLead0 = (team?.participant ?? []).some((p: any) => p.person.reference === me && p.role === "lead" && p.status === "active") || s.isLead;
  const orgOfTask = (project?.organization?.reference ?? team?.organization?.reference)?.split("/")[1];
  const mine = task.owner?.reference === me;
  const onIt = parts.some((p: any) => p.person.reference === me);
  // BIX: whoever may edit a task they aren't on (a team lead, or anyone with task.assign or org.manage) is its manager,
  // whichever group is selected in the app. Without this an officer outside the group's context saw no actions at all.
  const isLead = isLead0 || (can.edit && !onIt && !mine);

  const canAdd = onIt || isLead;
  const canEdit = can.edit || isLead;
  const open = !["completed", "cancelled", "failed"].includes(task.status);
  const cancelTask = () => {
    const go = () => { setTuning(false); run(bix.next(task, { status: "cancelled" }), "Cancelled. Its history is kept."); };
    if (Platform.OS === "web") return go();
    Alert.alert("Cancel this task?", "It leaves the team's list. Its history is kept.", [{ text: "Keep it", style: "cancel" }, { text: "Cancel the task", style: "destructive", onPress: go }]);
  };
  const outputs: Attachment[] = (task.output ?? []).flatMap((o: any) => o.attachment ?? []);
  const attach = async (a: Attachment | null) => {
    setAdding(false); if (!a) return;
    if (task.status === "completed") await run(bix.next(task, { output: [...(task.output ?? []), { attachment: [a] }] }));
    else await run(bix.next(task, { attachment: [...(task.attachment ?? []), a] }));
  };
  // `undo` turns the fresh record back (e.g. leave the place you just took); the snackbar offers it for 5 s.
  const run = async (next: R, ok?: string, undo?: (fresh: R) => R) => {
    setBusy(true);
    try { await bix.commit(next); if (ok) show(ok, undo ? { undo: async () => { try { await bix.commit(undo(await bix.get("Task", id))); show("Undone."); } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); } reload(); } } : undefined); }
    catch (e) {
      if (e instanceof BixError && e.current?.owner?.reference?.startsWith("Person/") && e.current.owner.reference !== me) setMsg(`${name(e.current.owner.reference)} just took this one. Thanks for offering.`);
      else setMsg(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); reload(); }
  };
  const pl = places(task);
  // Planned and given time (BIX 2026-11-11): the estimate, and a measured default from a check-in.
  const estH = task.estimate ? (task.estimate.unit === "min" ? task.estimate.value / 60 : task.estimate.value) / (task.estimate.per === "task" ? Math.max(1, parts.length) : 1) : null;
  const myPart = parts.find((x: any) => x.person.reference === me) as any;
  const measured = myPart?.attended ? Math.round(((Date.now() - Date.parse(myPart.attended.at)) / 3600000) * 2) / 2 : null;
  const hrs = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h * 10) / 10} h`);
  const finish = async (value: number | null, source: "planned" | "stated" | "measured") => {
    setFinishing(false);
    // A shift still open for more people is "ready"; close it first (ready → accepted), then mark it done.
    let base = task;
    if (task.status === "ready") { try { base = (await bix.commit(bix.next(task, { status: "accepted" })))[0] ?? task; } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); return; } }
    const next = act.done(base);
    if (value !== null) next.participant = (next.participant ?? []).map((x: any) => (x.person.reference === me && x.status === "active" ? { ...x, hours: { value, source } } : x));
    await run(next, "Done. Thank you!"); setGiven("");
  };
  const backup = async () => { try { await bix.commit(bix.create("Offer", { offeredBy: { reference: me }, partOf: { reference: `Task/${task.id}` }, category: { system: "bayanihan:category", code: "time", display: "Backup" },
    status: "available", description: `Backup for ${task.title}` })); setMsg("You're a backup. If a place opens, you'll be asked first."); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  const sl = pl.shift && task.status === "ready" ? { label: `${pl.left} of ${pl.n} places left`, tone: "neutral" as const } : pl.shift && task.status === "accepted" ? { label: onIt ? "You're on it" : "Full", tone: (onIt ? "state" : "ok") as "state" | "ok" } : stateLabel(task, me);
  let actions = null;
  const lead = (team?.participant ?? []).find((p: any) => p.role === "lead" && p.status === "active");
  const askers = (task.participant ?? []).filter((x: any) => x.status === "requested" && x.person.reference !== me && !x.replaces);
  if (waitingOn.length && ["ready", "requested"].includes(task.status)) actions = <View style={{ marginTop: 14 }}><Sand><IconCircle name="pending" tone="white" />
    <View style={{ flex: 1 }}><Text style={t.row}>{`Waiting on ${waitingOn[0]!.title}`}</Text><Meta>You can prepare now. It can be taken once that's done.</Meta></View></Sand></View>;
  // A shift (Task.slots > 1): "I'm in" takes a place; full shifts take backups (BIX 2026-11-09).
  else if (pl.shift && (task.status === "ready" || task.status === "accepted") && onIt) actions = <Buttons>{isLead ? <Primary label="Mark done" busy={busy} onPress={() => (onIt ? setFinishing(true) : finish(null, "stated"))} /> : null}<Outline flex label="Can't make it" onPress={() => setLeaving(true)} /></Buttons>;
  else if (pl.shift && task.status === "ready") actions = <Buttons><Primary label="I'm in" busy={busy} onPress={() => run(act.takePlace(task, me), "You're in.", (f) => act.leavePlace(f, me))} />{isLead ? <Outline label="Ask someone" onPress={() => setAsking(true)} /> : null}</Buttons>;
  else if (pl.shift && task.status === "accepted") actions = <Buttons>{isLead ? <Primary label="Mark done" busy={busy} onPress={() => (onIt ? setFinishing(true) : finish(null, "stated"))} /> : <Primary label="Be a backup" onPress={backup} />}</Buttons>;
  else if (task.status === "ready" && task.taking === "ask" && !isLead) actions = (task.participant ?? []).some((x: any) => x.person.reference === me && x.status === "requested")
    ? <View style={{ marginTop: 14 }}><Sand><IconCircle name="pending" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>You asked to do this</Text><Meta>{lead ? `${name(lead.person.reference)} will see it in their Inbox` : "The core team will see it in their Inbox"}</Meta></View>
        <LinkText onPress={() => run(bix.next(task, { participant: (task.participant ?? []).filter((x: any) => x.person.reference !== me) }), "Request cancelled.")}>Cancel</LinkText></Sand></View>
    : <Buttons><Primary label="Ask to do this" busy={busy} onPress={() => run(bix.next(task, { participant: [...(task.participant ?? []), { person: { reference: me }, role: "owner", status: "requested" }] }), "Asked. The lead chooses who does it.")} /></Buttons>;
  else if (task.status === "ready") actions = <Buttons><Primary label="I'll take it" busy={busy} onPress={() => run(act.claim(task, me), "It's yours.", (f) => act.release(f))} />{isLead ? <Outline label="Ask someone" onPress={() => setAsking(true)} /> : null}</Buttons>;
  // Waiting on someone's answer (seen in the test: a lead had no way to move it along).
  else if (task.status === "requested" && !mine && isLead) actions = <Buttons>
    <Primary label="Ask someone else" busy={busy} onPress={async () => { await run(act.release(task)); setAsking(true); }} />
    <Outline label={`Remind ${name(task.owner?.reference).split(" ")[0]}`} onPress={() => Share.share({ message: `Hi ${name(task.owner?.reference).split(" ")[0]}! Can you do "${task.title}"? Say yes or no here: ${appUrl()}/task/${task.id}` }).catch(() => {})} /></Buttons>;
  else if (task.status === "requested" && mine) actions = <Buttons><Primary label="I'm in" busy={busy} onPress={() => run(act.claim(task, me), "You're in.", (f) => act.release(f))} /><Outline label="Can't make it" onPress={() => setLeaving(true)} /></Buttons>;
  else if ((task.status === "accepted" || task.status === "in-progress") && (mine || isLead)) actions = <Buttons><Primary label="Mark done" busy={busy} onPress={() => run(act.done(task))} /><Outline label="Can't make it" onPress={() => setLeaving(true)} /></Buttons>;
  // Reopen (BIX 2026-11-12): a lead brings back done, failed or cancelled work. The earlier completion and its proof
  // stay in History; it counts again when it's done again.
  else if (!open && isLead) actions = <Buttons><Outline flex label="Reopen" onPress={() => {
    const people = parts.some((x: any) => x.status === "active") || task.owner?.reference?.startsWith("Person/");
    const go = () => run({ ...bix.next(task, { status: task.status !== "cancelled" && people ? "in-progress" : "ready" }), verification: undefined }, "Reopened. It counts again when it's done.");
    if (Platform.OS === "web") { if (typeof window === "undefined" || window.confirm("Reopen this task?\n\nThe earlier result stays in History. It stops counting until it's done again.")) go(); return; }
    Alert.alert("Reopen this task?", "The earlier result stays in History. It stops counting until it's done again.", [{ text: "Keep it closed", style: "cancel" }, { text: "Reopen", onPress: go }]);
  }} /></Buttons>;
  else if ((task.status === "accepted" || task.status === "in-progress") && !onIt) actions = <Buttons><Outline flex label="I'll help" onPress={() => run(act.helpOut(task, me))} /></Buttons>;
  else if (task.status === "draft" && isLead) actions = <Buttons><Primary label="Accept this idea" onPress={() => run(act.accept(task))} /></Buttons>;

  // ---- The page (2026-11-15 redesign, UI_REIMAGINE §7.2f): what's happening and what's next first; then the work
  // (about, smaller steps, details, from last time); files only when there are some; History one line at the bottom.
  const DAYMS = 86_400_000;
  const dueIn = task.due ? Math.round((new Date(task.due).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAYMS) : null;
  const isLate = open && dueIn !== null && dueIn < 0;
  const steps = [...((task.checklist ?? []) as { text: string; done?: boolean }[]), ...subs.map((x) => ({ text: String(x.title ?? ""), done: x.status === "completed" }))];
  const stepsDone = steps.filter((x) => x.done).length;
  const first = (r?: string) => (r === me ? "You" : name(r).split(" ")[0]);
  const ld = lead;
  const where = placeOf(task) ?? placeOf(project);
  const arr = task.restriction?.arrival?.at ?? task.restriction?.period?.start;
  const arriveAt = arr ? new Date(arr).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;
  const dueWords = dueIn === null ? null : !open ? `Was due ${short(task.due)}` : dueIn < 0 ? `${-dueIn} day${dueIn === -1 ? "" : "s"} late · was due ${short(task.due)}` : dueIn === 0 ? `Due today` : dueIn === 1 ? `Due tomorrow` : `Due ${short(task.due)} · in ${dueIn} days`;
  // Who's on it, in one line: the state, said as a sentence.
  const others = parts.filter((p: any) => p.person.reference !== me);
  const headline = task.status === "requested" ? (mine ? "You were asked to do this" : `Waiting for ${first(task.owner?.reference)} to answer`)
    : parts.length ? (onIt ? (others.length ? `You and ${others.length === 1 ? first(others[0].person.reference) : `${others.length} others`} are on it` : "You're on it")
      : `${parts.length === 1 ? first(parts[0].person.reference) : `${first(parts[0].person.reference)} and ${parts.length - 1} other${parts.length === 2 ? "" : "s"}`} ${parts.length === 1 ? "is" : "are"} on it`)
    : task.status === "draft" ? "An idea, not in the plan yet"
    : pl.shift && task.status === "ready" ? `${pl.left} of ${pl.n} places open` : open ? "Open · nobody on it yet" : "Nobody was on it";
  const askedDays = task.status === "requested" && (task.meta as any)?.lastUpdated ? Math.floor((now - Date.parse((task.meta as any).lastUpdated)) / DAYMS) : null;
  const sub = [task.status === "requested" && askedDays !== null ? (askedDays <= 0 ? "Asked today" : askedDays === 1 ? "Asked yesterday" : `Asked ${askedDays} days ago`) : null,
    team ? (ld ? `Lead: ${ld.person.reference === me ? "you" : name(ld.person.reference)}` : "No lead yet") : null].filter(Boolean).join(" · ");
  const faces = task.status === "requested" && task.owner?.reference ? [task.owner.reference] : parts.map((p: any) => p.person.reference);
  // For a lead, how to move it along when someone else is on it and it's late or due within 3 days.
  const nudgeWho = isLead && open && others.length && !onIt && (isLate || (dueIn !== null && dueIn <= 3)) ? others[0].person.reference : null;
  const nudge = () => Share.share({ message: `Hi ${first(nudgeWho!)}! How's "${task.title}" going? ${isLate ? "It was due" : "It's due"} ${short(task.due)}. ${appUrl()}/task/${task.id}` }).catch(() => {});
  const mineP = parts.find((x: any) => x.person.reference === me) as any;
  const theDay = task.restriction?.arrival?.at ?? task.due ?? project?.period?.start;
  const today = !!mineP && open && !!theDay && new Date(theDay).toDateString() === new Date().toDateString();
  const [showSteps, setShowSteps] = [stepFocus > 0 || steps.length > 0, () => setStepFocus((n) => n + 1)];
  const line = (icon: IconName, text: string, o: { tone?: "late" | "quiet"; onPress?: () => void; right?: ReactNode } = {}) =>
    <Pressable key={text} disabled={!o.onPress} onPress={o.onPress} accessibilityRole={o.onPress ? "button" : undefined}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={16} color={o.tone === "late" ? tone.onErrorContainer : c.accent} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: o.tone === "late" ? "700" : "500", color: o.tone === "late" ? tone.onErrorContainer : o.tone === "quiet" ? c.s500 : c.ink }}>{text}</Text>
      {o.right ?? (o.onPress ? <Icon name="chevron" size={14} color={c.s300} /> : null)}
    </Pressable>;

  return (
    <Screen back here={{ kind: "task", task, project, team, siblings, org, lead: isLead, subs }} bottom={actions ? <ActionBar>{actions}</ActionBar> : undefined}
      right={canEdit && open ? <RoundButton icon="pen" label="Plan this task" onPress={() => setTuning(true)} /> : undefined}
      add={(onIt || isLead) && task.status !== "completed" ? { kind: "task", task, lead: isLead, onIt, on: (w) => { if (w === "step") setStepFocus((n) => n + 1); else if (w === "photo") setAdding(true); else if (w === "ask") setAsking(true); else setTuning(true); } } : undefined}>
      <ScreenTitle>{task.title}</ScreenTitle>
      {/* 1 · Header: the state, the title, the team and project. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        <StateChip kind={task.status === "completed" ? "done" : isLate ? "late" : "open"}>{task.status === "completed" ? "Done" : isLate ? "Late" : sl.label}</StateChip>
        {task.milestone ? <StateChip kind="open">Others wait on this</StateChip> : null}
        {task.goodFirstStep ? <StateChip kind="done">Good first step</StateChip> : null}
      </View>
      {naming !== null ? <><Field value={naming} onChangeText={setNaming} placeholder="What needs doing" autoFocus /><Buttons><Primary label="Save" disabled={!naming.trim()} onPress={() => { run(bix.next(task, { title: naming.trim() })); setNaming(null); }} /><Outline label="Cancel" onPress={() => setNaming(null)} /></Buttons></>
        : <Text style={[t.title, { fontSize: 26, lineHeight: 32, marginTop: 8 }]}>{task.title}</Text>}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2, marginHorizontal: 2 }}>
        {team ? <Text style={[t.meta, { fontWeight: "700", color: c.ink }]} onPress={() => router.push(`/team/${team.id}` as never)}>{team.name}</Text> : null}
        {team && project ? <Text style={[t.meta, { color: c.s300 }]}>{"  ·  "}</Text> : null}
        {parent ? <Text style={[t.meta, { fontWeight: "600" }]} onPress={() => router.push(`/task/${parent.id}`)}>{`Part of “${parent.title}” ›`}</Text>
          : project ? <Text style={[t.meta, { fontWeight: "600" }]} onPress={() => router.push(`/project/${project.id}`)}>{`${project.title} ›`}</Text>
          : org ? <Text style={[t.meta, { fontWeight: "600" }]} onPress={() => router.push(`/org/${org.id}` as never)}>{`${org.name} ›`}</Text> : null}
      </View>

      {/* 2 · Where it stands: who, when, how far, what it waits on, and for a lead how to move it along. */}
      {task.status === "completed" ? <View style={{ marginTop: 16, backgroundColor: c.white, borderRadius: 24, padding: 20, alignItems: "center" }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={28} color="#fff" /></View>
        <Text style={[t.title, { fontSize: 22, marginTop: 10, textAlign: "center" }]}>{onIt || parts.some((p: any) => p.person?.reference === me) ? "Thank you!" : "Done"}</Text>
        <Text style={[t.body, { textAlign: "center", marginTop: 2 }]}>{[parts.length ? `By ${parts.map((p: any) => first(p.person.reference)).join(", ")}` : null, team?.name ? `It counts for ${team.name}, and for everyone who did it.` : "It counts for everyone who did it."].filter(Boolean).join(". ")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}><Icon name="lock" size={13} color={c.s500} /><Meta>{signed?.allValid ? "Signed by your group · unchanged" : "Recorded"}</Meta></View>
      </View>
      : <View style={{ marginTop: 16, backgroundColor: c.white, borderRadius: 24, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {faces.length === 1 ? <Avatar name={name(faces[0])} size={44} photo={people[faces[0]]?.photo} />
            : faces.length ? <Faces names={faces.map((r: string) => name(r))} photos={faces.map((r: string) => people[r]?.photo)} />
            : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tone.primaryContainer, alignItems: "center", justifyContent: "center" }}><Icon name="users" size={20} color={tone.onPrimaryContainer} /></View>}
          <View style={{ flex: 1 }}><Text style={[t.row, { fontSize: 17 }]}>{headline}</Text>{sub ? <Meta>{sub}</Meta> : null}</View>
        </View>
        <View style={{ height: 1, backgroundColor: c.s200, marginVertical: 10 }} />
        {dueWords ? line("clock", dueWords, { tone: isLate ? "late" : undefined, onPress: canEdit ? () => setPlanning(true) : undefined })
          : canEdit ? line("clock", "No due date yet · set one", { tone: "quiet", onPress: () => setPlanning(true) }) : null}
        {steps.length ? <View style={{ minHeight: 40, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Icon name="check" size={16} color={c.accent} /><Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.ink }}>{`${stepsDone} of ${steps.length} smaller steps done`}</Text></View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.wash, marginLeft: 26, marginTop: 4, overflow: "hidden" }}><View style={{ width: `${(stepsDone / steps.length) * 100}%`, height: 6, backgroundColor: c.accent }} /></View>
        </View> : null}
        {waitingOn.map((x) => line("pending", `Waits on “${x.title}”`, { onPress: () => router.push(`/task/${x.id}`) }))}
        {task.milestone && unblocks.length ? line("building", `${unblocks.length} step${unblocks.length === 1 ? "" : "s"} wait on this`, { tone: "quiet" }) : null}
        {today ? mineP.attended ? line("check", `You're checked in, ${new Date(mineP.attended.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`)
          : <View style={{ marginTop: 6 }}><Primary label="I'm here" busy={busy} onPress={() => run(bix.next(task, { participant: (task.participant ?? []).map((x: any) => (x.person.reference === me ? { ...x, attended: { at: new Date().toISOString(), by: { reference: me } } } : x)) }), "Checked in. Your lead can see you've arrived.")} /></View> : null}
        {nudgeWho ? <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: isLate ? tone.errorContainer : tone.primaryContainer }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: isLate ? tone.onErrorContainer : tone.onPrimaryContainer }}>{isLate ? `It's late. Check in with ${first(nudgeWho)}?` : `Due soon. Check in with ${first(nudgeWho)}?`}</Text>
          <Outline label="Check in" onPress={nudge} /></View> : null}
      </View>}

      {/* 3 · For a lead: people who asked to do it. */}
      {isLead && task.status === "ready" && askers.length ? <><Eyebrow right={`${askers.length}`}>Asked to do it</Eyebrow><Panel>{askers.map((x: any, i: number) => <Row key={x.person.reference}
        left={<Avatar name={name(x.person.reference)} photo={people[x.person.reference]?.photo} />} title={name(x.person.reference)} last={i === askers.length - 1}
        right={<Outline label="Give it" onPress={() => run({ ...bix.next(task, { status: "accepted", owner: { reference: x.person.reference }, participant: [...(task.participant ?? []).filter((y: any) => y.status !== "requested" || y.person.reference === x.person.reference).map((y: any) => (y.person.reference === x.person.reference ? { ...y, status: "active" } : y))] }) }, `Given to ${name(x.person.reference)}.`)} />} />)}</Panel></> : null}

      {/* 4 · What it's about. */}
      {desc !== null ? <><Eyebrow>About</Eyebrow><Field value={desc} onChangeText={setDesc} multiline autoFocus placeholder="What it's for and who it helps, when and where, what to bring or know" /><Buttons><Primary label="Save" onPress={() => { run(bix.next(task, { description: desc.trim() || undefined })); setDesc(null); }} /><Outline label="Cancel" onPress={() => setDesc(null)} /></Buttons></>
        : task.description ? <><Eyebrow right={canEdit && open ? "Edit" : undefined} onRightPress={canEdit && open ? () => setDesc(task.description ?? "") : undefined}>About</Eyebrow><Body>{task.description}</Body></> : null}

      {/* 5 · Smaller steps: checklist items (tap to change) and subtasks (given to someone), and what was done last time. */}
      <SmallerSteps task={task} subs={subs} people={people} me={me} team={team} project={project} org={org} isLead={isLead} canAdd={canAdd}
        ownsIt={mine || parts.some((p: any) => p.person.reference === me && p.role === "owner")} focus={stepFocus} busy={busy} run={run} reload={reload} />

      {/* 6 · Details: where, when to arrive, how long, team; and the prompts a lead can fill. */}
      {(() => {
        const rows: { icon: IconName; title: string; meta?: string; onPress?: () => void }[] = [
          ...(where ? [{ icon: "pin" as IconName, title: where, meta: "Open in maps", onPress: () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`).catch(() => {}) }] : []),
          ...(arriveAt || task.restriction?.arrival?.note ? [{ icon: "cal" as IconName, title: arriveAt ? `Arrive ${arriveAt}` : "Arrival", meta: task.restriction?.arrival?.note }] : []),
          ...(estH ? [{ icon: "clock" as IconName, title: `About ${hrs(estH)}`, meta: task.estimate?.per === "task" ? "In all, shared by who's on it" : "Each person" }] : []),
          ...(pl.shift ? [{ icon: "users" as IconName, title: `${pl.n} places`, meta: `${pl.on} taken` }] : []),
          ...(canEdit && open && !task.description && desc === null ? [{ icon: "pen" as IconName, title: "Say what this is about", meta: "Who it helps, when and where, what to bring", onPress: () => setDesc("") }] : []),
          ...(canAdd && open && !showSteps ? [{ icon: "check" as IconName, title: "Break it into smaller steps", meta: "So it's clear what's done", onPress: () => setShowSteps() }] : []),
        ];
        return rows.length ? <><Eyebrow>Details</Eyebrow><Panel>{rows.map((r, i) => <Row key={r.title} left={<IconCircle name={r.icon} />} title={r.title} meta={r.meta} onPress={r.onPress} last={i === rows.length - 1} />)}</Panel></> : null;
      })()}

      {/* 7 · What the group learned doing this kind of step (BIX rule 26: anyone who can see the step). */}
      <FromLastTime task={task} project={project} />

      {task.status === "completed" && task.milestone && unblocks.length ? <><Eyebrow>{`The gate is open: ${unblocks.length} can go ahead`}</Eyebrow>
        <Panel>{unblocks.map((x, i) => <Row key={x.id} left={<IconCircle name="check" />} title={x.title} right={<Pill tone="ok">Ready</Pill>} onPress={() => router.push(`/task/${x.id}`)} last={i === unblocks.length - 1} />)}</Panel></> : null}

      {/* 8 · Files only when there are some; the round + adds them. */}
      {(task.attachment ?? []).length ? <><Eyebrow right={`${(task.attachment ?? []).length}`}>Files</Eyebrow>
        <Files hint="Add a file the team needs" items={task.attachment ?? []} onAdd={canAdd && open ? () => setAdding(true) : undefined} onRemove={canEdit && open ? (a) => run(bix.next(task, { attachment: (task.attachment ?? []).filter((x: any) => x.hash !== a.hash) }), "File removed.") : undefined} /></> : null}
      {outputs.length || (canAdd && task.status === "completed") ? <><Eyebrow>What came out of it</Eyebrow>
        <Files hint="Add a photo or result of the work" items={outputs} onAdd={canAdd ? () => setAdding(true) : undefined} /></> : null}

      {/* 9 · History: one quiet line; the timeline opens in a sheet. */}
      <History type="Task" id={task.id} groupName={org?.name} version={task.meta.version} />
      <View style={{ height: 72 }} />

      <Sheet open={tuning} onClose={() => setTuning(false)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Plan this task</Text>
        <Panel style={{ backgroundColor: c.wash }}>
        <Row left={<IconCircle name="cal" />} title="Due date" meta={task.due ? short(task.due) : "None yet"} onPress={() => { setTuning(false); setTimeout(() => setPlanning(true), 260); }} />
        <Row left={<IconCircle name="pin" />} title="When and where to arrive" meta={task.restriction?.arrival?.note ?? (task.restriction?.arrival?.at ? new Date(task.restriction.arrival.at).toLocaleString() : "Call time and meeting point")}
          onPress={() => { setTuning(false); setTimeout(() => setArrive({ at: task.restriction?.arrival?.at ? new Date(task.restriction.arrival.at).toISOString().slice(0, 16).replace("T", " ") : "", note: task.restriction?.arrival?.note ?? "" }), 260); }} />
        <Row left={<IconCircle name="clock" />} title="About how long" meta={estH ? `${hrs(task.estimate.unit === "min" ? task.estimate.value / 60 : task.estimate.value)} ${task.estimate.per === "task" ? "in all" : "each"}` : "Helps volunteers decide; counts as their hours if they agree"}
          right={<View style={{ flexDirection: "row", gap: 6 }}>{[1, 2, 4].map((h) => <Outline key={h} label={`${h} h`} onPress={() => run(bix.next(task, { estimate: { value: h, unit: "h", per: "person" } }))} />)}</View>} />
        <Row left={<IconCircle name="users" />} title="People needed" meta={pl.n > 1 ? `${pl.n} places · ${pl.on} taken` : "One person"}
          right={<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Outline label="−" onPress={() => { if (pl.n > Math.max(1, pl.on)) run(act.setSlots(task, pl.n - 1)); }} /><Text style={t.row}>{pl.n}</Text><Outline label="+" onPress={() => run(act.setSlots(task, pl.n + 1))} /></View>} />
        {/* Who can take it (teamwork D12; BIX Task.taking, audience). */}
        <View style={{ paddingVertical: 10 }}><Text style={[t.row, { marginLeft: 4, marginBottom: 6 }]}>Who can take it</Text>
          <Chips options={[{ value: "team", label: "Anyone on the team" }, { value: "project", label: "Anyone on the project" }, { value: "ask", label: "I decide" }]}
            value={task.taking === "ask" ? "ask" : task.audience === "organization" || task.audience === "open" ? "project" : "team"}
            onChange={(v) => run(bix.next(task, v === "ask" ? { taking: "ask" } : { taking: undefined, audience: v === "project" ? (task.audience === "open" ? "open" : "organization") : "team" }))} />
          {task.taking === "ask" ? <Meta>People ask to do it; you choose one in your Inbox or here.</Meta> : null}</View>
        <Row left={<IconCircle name="building" />} title="Others wait on this" meta="Make it a gate on the project page" right={<Check on={!!task.milestone} onPress={() => run(bix.next(task, { milestone: !task.milestone }))} />} />
        <Row left={<IconCircle name="pending" />} title="Waits on" meta={deps.length ? deps.map((x) => x.title).join(", ") : "Nothing"} onPress={() => { setTuning(false); setTimeout(() => setPlanning(true), 260); }} />
        <Row left={<IconCircle name="heart" />} title="Anyone can help" meta={openAllowed ? "Show to outside volunteers" : "Your group or project isn't public. Invite volunteers with a link instead"} right={<Check on={task.audience === "open"} onPress={!openAllowed && task.audience !== "open" ? undefined : () => run(bix.next(task, { audience: task.audience === "open" ? "team" : "open" }))} />} />
        <Row left={<IconCircle name="smile" />} title="Good first step" meta="Suggested to newcomers" right={<Check on={!!task.goodFirstStep} onPress={() => run(bix.next(task, { goodFirstStep: !task.goodFirstStep }))} />} />
        <Row left={<IconCircle name="pen" />} title="Rename" meta={task.title} onPress={() => { setTuning(false); setNaming(task.title ?? ""); }} />
        <Row left={<IconCircle name="pen" />} title="What's this about?" meta={task.description ? "Edit" : "Who it helps, when, where, what to bring"} onPress={() => { setTuning(false); setDesc(task.description ?? ""); }} />
        {task.partOf ? <Row left={<IconCircle name="flag" />} title="Start a vote about this" onPress={() => { setTuning(false); router.push({ pathname: "/vote/new" as never, params: { project: task.partOf.reference.split("/")[1], about: `Task/${task.id}` } }); }} last /> : null}
        </Panel>
        <View style={{ marginTop: 10 }}><Meta>{can.who}</Meta></View>
        <View style={{ marginTop: 8 }}><LinkText onPress={cancelTask}>Cancel this task</LinkText></View>
      </Sheet>

      <Sheet open={planning} onClose={() => setPlanning(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Due date</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{quick().map((q) => <Outline key={q.label} label={q.label} onPress={() => { run(bix.next(task, { due: q.iso })); setPlanning(false); }} />)}</View>
        <Field value={dueText} onChangeText={setDueText} placeholder="or a date, e.g. 2027-02-15" onSubmitEditing={() => { const d = parseDate(dueText); if (d) { run(bix.next(task, { due: d })); setPlanning(false); } }} returnKeyType="done" />
        <Text style={[t.row, { fontSize: 18, marginTop: 16 }]}>Waits on</Text>
        <Panel style={{ backgroundColor: c.wash, marginTop: 8 }}>{siblings.slice(0, 12).map((x, i, all) => { const on = (task.dependsOn ?? []).some((d: any) => d.reference === `Task/${x.id}`);
          return <Row key={x.id} title={x.title} meta={x.milestone ? "Gate" : undefined} last={i === all.length - 1} right={<Check on={on} onPress={() => run(bix.next(task, { dependsOn: on ? task.dependsOn.filter((d: any) => d.reference !== `Task/${x.id}`) : [...(task.dependsOn ?? []), { reference: `Task/${x.id}` }] }))} />} />; })}</Panel>
      </Sheet>

      <Sheet open={adding} onClose={() => setAdding(false)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>{task.status === "completed" ? "Add what came out of it" : "Add to Files"}</Text>
        <Panel style={{ backgroundColor: c.wash }}>
          <Row left={<IconCircle name="camera" tone="white" />} title="Photo" meta="Kept by your group" onPress={() => pickPhoto(false).then(attach).catch((e) => { setAdding(false); setMsg(String(e.message ?? e)); })} />
          <Row left={<IconCircle name="smile" tone="white" />} title="Photo that shows children" meta="Never leaves the group" onPress={() => pickPhoto(true).then(attach).catch((e) => { setAdding(false); setMsg(String(e.message ?? e)); })} />
          <Row left={<IconCircle name="receipt" tone="white" />} title="Document" meta="PDF, Word, Excel, text" last onPress={() => pickDocument().then(attach).catch((e) => { setAdding(false); setMsg(String(e.message ?? e)); })} />
        </Panel>
      </Sheet>

      <Sheet open={finishing} onClose={() => setFinishing(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>About how long did you give?</Text>
        <Meta>Your hours count in your story and the group's report.</Meta>
        <View style={{ marginTop: 12, gap: 8 }}>
          {measured ? <Primary label={`${hrs(measured)} since you checked in`} onPress={() => finish(measured, "measured")} /> : null}
          {estH ? <Primary label={`${hrs(estH)}, as planned`} onPress={() => finish(estH, "planned")} /> : null}
        </View>
        <Chips options={[0.5, 1, 2, 3, 4].map((h) => ({ value: String(h), label: hrs(h) }))} value={given} onChange={(v) => finish(Number(v), "stated")} />
        <Field value={given} onChangeText={setGiven} keyboardType="numeric" placeholder="Or type hours, e.g. 1.5" onSubmitEditing={() => { const n = Number(given); if (n > 0) finish(n, "stated"); }} returnKeyType="done" />
        <View style={{ marginTop: 10 }}><LinkText onPress={() => finish(null, "stated")}>Skip, don't count hours</LinkText></View>
      </Sheet>

      <Sheet open={leaving} onClose={() => setLeaving(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Can't make it?</Text>
        <Meta>That's okay. Your lead sees the place open again.</Meta>
        <Field label="A word for your lead (optional)" value={word} onChangeText={setWord} placeholder="e.g. Work came up, sorry!" />
        <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>
          <Row left={<IconCircle name="heart" tone="white" />} title="Help another way" meta="See what else is open" onPress={() => { setLeaving(false); router.push(project ? `/project/${project.id}` : "/home"); }} />
          <Row left={<IconCircle name="back" tone="white" />} title="Let it go" meta="Your place goes back to open" last onPress={async () => {
            setLeaving(false);
            const next = pl.shift ? act.leavePlace(task, me) : act.release(task);
            if (word.trim()) next.note = [...(task.note ?? []), { author: { reference: me }, time: new Date().toISOString(), text: `Can't make it: ${word.trim()}` }];
            await run(next, "That's okay, thanks for telling us."); setWord(""); }} />
        </Panel>
      </Sheet>

      <Sheet open={!!arrive} onClose={() => setArrive(null)}>
        <Text style={[t.row, { fontSize: 18 }]}>When and where to arrive</Text>
        <Field label="Time" value={arrive?.at ?? ""} onChangeText={(v) => setArrive((a) => ({ ...(a ?? { note: "" }), at: v }))} placeholder="e.g. 2027-03-06 04:30" />
        <Field label="Where, and what to bring" value={arrive?.note ?? ""} onChangeText={(v) => setArrive((a) => ({ ...(a ?? { at: "" }), note: v }))} placeholder="e.g. Gate 2. Bring water and a cap." multiline />
        <Buttons><Primary label="Save" onPress={() => { const at = arrive?.at.trim() ? new Date(arrive.at.trim().replace(" ", "T")) : null;
          if (arrive?.at.trim() && (!at || isNaN(at.getTime()))) { setMsg("That time didn't read right. Try 2027-03-06 04:30."); return; }
          run(bix.next(task, { restriction: { ...(task.restriction ?? {}), arrival: { ...(at ? { at: at.toISOString() } : {}), ...(arrive?.note.trim() ? { note: arrive.note.trim() } : {}) } } })); setArrive(null); }} /></Buttons>
      </Sheet>

      {orgOfTask ? <AddPeople open={asking} onClose={() => { setAsking(false); reload(); }} orgId={orgOfTask} target={{ kind: "task", task, teamName: team?.name }}
        suggested={(before ?? []).map((x) => ({ ref: x.ref, p: x.p }))} suggestedLabel={`Helped ${team?.name ?? "this team"} before`} onDone={(m) => setMsg(m)} /> : null}
    </Screen>
  );
}
