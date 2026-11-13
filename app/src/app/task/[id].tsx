import { AddPeople } from "@/ui/AddPeople";
import { AddSheet } from "@/ui/AddSheet";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { parseDate, quick, short } from "@/lib/dates";
import { onSynced } from "@/lib/outbox";
import { pickDocument, pickPhoto, type Attachment } from "@/lib/files";
import { Files } from "@/ui/Files";
import { useLocalSearchParams } from "expo-router";
import { Alert, Platform, Text, View } from "react-native";
import { bix, BixError, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, peopleFor, personName, placeOf, places, stateLabel } from "@/lib/work";
import { Logo } from "@/ui/Context";
import { History } from "@/ui/History";
import { Avatar, Body, Buttons, Check, Chips, Eyebrow, Faces, Field, IconCircle, LinkText, Meta, Notice, Outline, Panel, Pill, Primary, RoundButton, Row, Sand, Screen, Sheet, Skeleton } from "@/ui/kit";
import { Icon, type IconName } from "@/ui/Icon";
import { atMost, visibilityOf } from "@/ui/Privacy";
import { c, radius, type as t } from "@/ui/theme";

/** One template for every Task: the state decides the action (DESIGN_STANDARD §1a, §1b). */
export default function Task() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [item, setItem] = useState("");
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
  const [addOpen, setAddOpen] = useState(false);
  const [stepFocus, setStepFocus] = useState(0);
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
    const project = task.partOf ? await bix.get("Initiative", task.partOf.reference.split("/")[1]).catch(() => null) : null;
    const orgRef = project?.organization?.reference ?? team?.organization?.reference;
    const org = orgRef ? await bix.get("Organization", orgRef.split("/")[1]!).catch(() => null) : null;
    return { task, team, people, signed, siblings, can, project, org };
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
  if (error) return <Screen back><Notice>{error}</Notice></Screen>;
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { task, team, people, signed, siblings, can, project, org } = data;
  const openAllowed = atMost(visibilityOf(project), visibilityOf(s.groups.find((g) => `Organization/${g.org.id}` === (project?.organization?.reference ?? team?.organization?.reference))?.org)) === "public";
  const deps = (task.dependsOn ?? []).map((d: any) => siblings.find((x) => `Task/${x.id}` === d.reference)).filter(Boolean) as R[];
  const waitingOn = deps.filter((x) => x.status !== "completed");
  const unblocks = siblings.filter((x) => (x.dependsOn ?? []).some((d: any) => d.reference === `Task/${task.id}`));
  const name = (r?: string) => (r && people[r]?.name?.text) || "Someone";
  const parts = (task.participant ?? []).filter((p: any) => p.status === "active");
  const isLead = (team?.participant ?? []).some((p: any) => p.person.reference === me && p.role === "lead" && p.status === "active") || s.isLead;
  const orgOfTask = (project?.organization?.reference ?? team?.organization?.reference)?.split("/")[1];
  const mine = task.owner?.reference === me;
  const onIt = parts.some((p: any) => p.person.reference === me);

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
  const run = async (next: R, ok?: string) => {
    setBusy(true); setMsg(null);
    try { await bix.commit(next); if (ok) setMsg(ok); }
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
  else if (pl.shift && task.status === "ready") actions = <Buttons><Primary label="I'm in" busy={busy} onPress={() => run(act.takePlace(task, me), "You're in.")} />{isLead ? <Outline label="Ask someone" onPress={() => setAsking(true)} /> : null}</Buttons>;
  else if (pl.shift && task.status === "accepted") actions = <Buttons>{isLead ? <Primary label="Mark done" busy={busy} onPress={() => (onIt ? setFinishing(true) : finish(null, "stated"))} /> : <Primary label="Be a backup" onPress={backup} />}</Buttons>;
  else if (task.status === "ready" && task.taking === "ask" && !isLead) actions = (task.participant ?? []).some((x: any) => x.person.reference === me && x.status === "requested")
    ? <View style={{ marginTop: 14 }}><Sand><IconCircle name="pending" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>You asked to do this</Text><Meta>{lead ? `${name(lead.person.reference)} will see it in their Inbox` : "The core team will see it in their Inbox"}</Meta></View>
        <LinkText onPress={() => run(bix.next(task, { participant: (task.participant ?? []).filter((x: any) => x.person.reference !== me) }), "Request cancelled.")}>Cancel</LinkText></Sand></View>
    : <Buttons><Primary label="Ask to do this" busy={busy} onPress={() => run(bix.next(task, { participant: [...(task.participant ?? []), { person: { reference: me }, role: "owner", status: "requested" }] }), "Asked. The lead chooses who does it.")} /></Buttons>;
  else if (task.status === "ready") actions = <Buttons><Primary label="I'll take it" busy={busy} onPress={() => run(act.claim(task, me))} />{isLead ? <Outline label="Ask someone" onPress={() => setAsking(true)} /> : null}</Buttons>;
  else if (task.status === "requested" && mine) actions = <Buttons><Primary label="I'm in" busy={busy} onPress={() => run(act.claim(task, me))} /><Outline label="Can't make it" onPress={() => setLeaving(true)} /></Buttons>;
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

  return (
    <Screen back right={(onIt || isLead) && task.status !== "completed" ? <RoundButton icon="plus" label="Add" onPress={() => setAddOpen(true)} /> : undefined}>
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} ctx={{ kind: "task", task, lead: isLead, onIt, on: (w) => { if (w === "step") setStepFocus((n) => n + 1); else if (w === "photo") setAdding(true); else if (w === "ask") setAsking(true); else setTuning(true); } }} />
      {/* Header (design/teamwork-sketches.html A1–A3): the title, one small line for the team and the project (the group is
          one tap further, from the project), then the facts as chips, then the action. Everything the old cards and
          "What to know" showed is here: when, where, places, due, how long, gate, lead, arrival note. */}
      <Text style={[t.title, { fontSize: 24, marginTop: 4 }]}>{task.title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2, marginHorizontal: 2 }}>
        {team ? <Text style={[t.meta, { fontWeight: "700", color: c.ink }]} onPress={() => router.push(`/team/${team.id}` as never)}>{team.name}</Text> : null}
        {team && project ? <Text style={[t.meta, { color: c.s300 }]}>{"  ·  "}</Text> : null}
        {project ? <Text style={[t.meta, { fontWeight: "600" }]} onPress={() => router.push(`/project/${project.id}`)}>{`${project.title} ›`}</Text>
          : org ? <Text style={[t.meta, { fontWeight: "600" }]} onPress={() => router.push(`/org/${org.id}` as never)}>{`${org.name} ›`}</Text> : null}
      </View>
      {(() => {
        const arr = task.restriction?.arrival?.at ?? task.restriction?.period?.start;
        const when = arr ? new Date(arr).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;
        const where = placeOf(task) ?? placeOf(project);
        const ld = (team?.participant ?? []).find((p: any) => p.role === "lead" && p.status === "active");
        const hot = pl.shift ? "places" : task.due && open ? "due" : null;
        const chip = (icon: IconName, label: string, on = false) => <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: on ? c.sand : c.white }}>
          <Icon name={icon} size={14} color={c.accent} /><Text style={{ fontSize: 12.5, fontWeight: "600", color: on ? c.accent : c.ink }}>{label}</Text></View>;
        return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {!open || !pl.shift ? chip(task.status === "completed" ? "check" : "pending", sl.label, false) : null}
          {pl.shift ? chip("users", sl.label, hot === "places") : null}
          {when ? chip("cal", when) : null}
          {where ? chip("pin", where) : null}
          {task.due ? chip("clock", `Due ${short(task.due)}`, hot === "due") : null}
          {estH ? chip("clock", `About ${hrs(estH)}`) : null}
          {task.milestone ? chip("flag", "Others wait on this") : null}
          {waitingOn.length ? chip("pending", `Waits on ${waitingOn[0]!.title}`) : null}
          {task.goodFirstStep ? chip("spark", "Good first step") : null}
          {team ? chip("users", ld ? `Lead: ${ld.person.reference === me ? "you" : name(ld.person.reference)}` : "No lead yet") : null}
        </View>;
      })()}
      {task.restriction?.arrival?.note && onIt ? <View style={{ marginTop: 8, marginHorizontal: 4 }}><Meta>{task.restriction.arrival.note}</Meta></View> : null}
      {msg ? <Notice>{msg}</Notice> : null}
      {/* I'm here (sketch V6): on the day, the person records their own arrival (BIX participant.attended). */}
      {(() => { const mineP = parts.find((x: any) => x.person.reference === me) as any; const day = task.restriction?.arrival?.at ?? task.due ?? project?.period?.start;
        if (!mineP || !open || !day || new Date(day).toDateString() !== new Date().toDateString()) return null;
        return mineP.attended ? <View style={{ marginTop: 12 }}><Notice>{`You're checked in, ${new Date(mineP.attended.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`}</Notice></View>
          : <Buttons><Primary label="I'm here" busy={busy} onPress={() => run(bix.next(task, { participant: (task.participant ?? []).map((x: any) => (x.person.reference === me ? { ...x, attended: { at: new Date().toISOString(), by: { reference: me } } } : x)) }), "Checked in. Your lead can see you've arrived.")} /></Buttons>; })()}
      {actions}
      {naming !== null ? <><Field value={naming} onChangeText={setNaming} placeholder="What needs doing" autoFocus /><Buttons><Primary label="Save" disabled={!naming.trim()} onPress={() => { run(bix.next(task, { title: naming.trim() })); setNaming(null); }} /><Outline label="Cancel" onPress={() => setNaming(null)} /></Buttons></> : null}
      {desc !== null ? <><Field value={desc} onChangeText={setDesc} multiline placeholder="What it's for and who it helps, when and where, what to bring or know" /><Buttons><Primary label="Save" onPress={() => { run(bix.next(task, { description: desc.trim() || undefined })); setDesc(null); }} /><Outline label="Cancel" onPress={() => setDesc(null)} /></Buttons></>
        : task.description ? <View style={{ marginTop: 10 }}><Body>{task.description}</Body></View>
        : isLead && open ? <View style={{ marginTop: 10 }}><Text style={t.meta} onPress={() => setDesc("")}>＋ What's this about? Who it helps, when and where, what to bring</Text></View> : null}

      {isLead && task.status === "ready" && askers.length ? <><Eyebrow right={`${askers.length}`}>Asked to do it</Eyebrow><Panel>{askers.map((x: any, i: number) => <Row key={x.person.reference}
        left={<Avatar name={name(x.person.reference)} photo={people[x.person.reference]?.photo} />} title={name(x.person.reference)} last={i === askers.length - 1}
        right={<Outline label="Give it" onPress={() => run({ ...bix.next(task, { status: "accepted", owner: { reference: x.person.reference }, participant: [...(task.participant ?? []).filter((y: any) => y.status !== "requested" || y.person.reference === x.person.reference).map((y: any) => (y.person.reference === x.person.reference ? { ...y, status: "active" } : y))] }) }, `Given to ${name(x.person.reference)}.`)} />} />)}</Panel></> : null}
      {parts.length ? <><Eyebrow>Working on it</Eyebrow><Panel><Row left={<Faces names={parts.map((p: any) => name(p.person.reference))} photos={parts.map((p: any) => people[p.person.reference]?.photo)} />} title={parts.map((p: any) => p.person.reference === me ? "You" : name(p.person.reference)).join(" and ")} meta={task.owner?.reference?.startsWith("Person/") ? (task.owner.reference === me ? "You're on it" : `${name(task.owner.reference)} is on it`) : undefined} last /></Panel></> : null}
      <Eyebrow right={(task.checklist ?? []).length ? `${(task.checklist ?? []).filter((x: any) => x.done).length} of ${(task.checklist ?? []).length}` : undefined}>Smaller steps</Eyebrow>
      <Panel>
        {(task.checklist ?? []).map((x: any, i: number) => <Row key={i} left={<Check on={!!x.done} onPress={onIt || isLead ? () => run(act.toggle(task, i, me)) : undefined} />} title={x.text} />)}
        {(onIt || isLead) && task.status !== "completed" ? <View style={{ paddingVertical: 8 }}><Field key={`step${stepFocus}`} autoFocus={stepFocus > 0} value={item} onChangeText={setItem} placeholder="Break this into smaller steps" style={{ backgroundColor: c.wash }}
          onSubmitEditing={() => { if (item.trim()) { run(bix.next(task, { checklist: [...(task.checklist ?? []), { text: item.trim(), done: false }] })); setItem(""); } }} returnKeyType="done" /></View>
          : (task.checklist ?? []).length ? null : <Row title="No smaller steps yet" meta="The lead can break this down" last />}
      </Panel>


      {task.status === "completed" && task.milestone && unblocks.length ? <><Eyebrow>{`The gate is open: ${unblocks.length} can go ahead`}</Eyebrow>
        <Panel>{unblocks.map((x, i) => <Row key={x.id} left={<IconCircle name="check" />} title={x.title} right={<Pill tone="ok">Ready</Pill>} onPress={() => router.push(`/task/${x.id}`)} last={i === unblocks.length - 1} />)}</Panel></> : null}
      {task.status === "completed" ? <View style={{ marginTop: 16, backgroundColor: c.sand, borderRadius: radius.tile, padding: 20, alignItems: "center" }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={28} color="#fff" /></View>
        <Text style={[t.title, { fontSize: 22, marginTop: 10, textAlign: "center" }]}>{(task.participant ?? []).some((p: any) => p.person?.reference === me) ? "Thank you!" : "Done"}</Text>
        <Text style={[t.body, { textAlign: "center", marginTop: 2 }]}>{team?.name ? `It counts for ${team.name}, and for everyone who did it.` : "It counts for everyone who did it."}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}><Icon name="lock" size={13} color={c.s500} /><Meta>{signed?.allValid ? "Signed by your group · unchanged" : "Recorded"}</Meta></View>
      </View> : null}

      {(task.attachment ?? []).length || (canAdd && task.status !== "completed") ? <><Eyebrow right={(task.attachment ?? []).length ? `${(task.attachment ?? []).length}` : undefined}>Files</Eyebrow>
        <Files hint="Add a file the team needs" items={task.attachment ?? []} onAdd={canAdd && open ? () => setAdding(true) : undefined} onRemove={canEdit && open ? (a) => run(bix.next(task, { attachment: (task.attachment ?? []).filter((x: any) => x.hash !== a.hash) }), "File removed.") : undefined} /></> : null}
      {outputs.length || (canAdd && task.status === "completed") ? <><Eyebrow>What came out of it</Eyebrow>
        <Files hint="Add a photo or result of the work" items={outputs} onAdd={canAdd ? () => setAdding(true) : undefined} /></> : null}



      <History type="Task" id={task.id} groupName={org?.name} version={task.meta.version} />

      {canEdit && open ? <View style={{ marginTop: 20 }}><Panel>
        <Row left={<IconCircle name="cal" />} title="Plan this task" onPress={() => setTuning(true)} last
          meta={[task.due ? `Due ${short(task.due)}` : "No due date", deps.length ? `waits on ${deps.length}` : null, task.audience === "open" ? "anyone can help" : null].filter(Boolean).join(" · ")} />
      </Panel></View> : null}

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
