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
import { act, shortRef, stateLabel } from "@/lib/work";
import { Body, Buttons, Check, Eyebrow, Faces, Field, IconCircle, LinkText, Meta, Notice, Outline, Panel, Pill, Primary, Row, Sand, Screen, Sheet, Avatar , Skeleton} from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { c, type as t } from "@/ui/theme";

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
    return { task, team, people, signed, siblings, can };
  }, [id]);
  if (error) return <Screen back><Notice>{error}</Notice></Screen>;
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { task, team, people, signed, siblings, can } = data;
  const deps = (task.dependsOn ?? []).map((d: any) => siblings.find((x) => `Task/${x.id}` === d.reference)).filter(Boolean) as R[];
  const waitingOn = deps.filter((x) => x.status !== "completed");
  const unblocks = siblings.filter((x) => (x.dependsOn ?? []).some((d: any) => d.reference === `Task/${task.id}`));
  const name = (r?: string) => (r && people[r]?.name?.text) || "Someone";
  const parts = (task.participant ?? []).filter((p: any) => p.status === "active");
  const isLead = (team?.participant ?? []).some((p: any) => p.person.reference === me && p.role === "lead" && p.status === "active") || s.isLead;
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
  const sl = stateLabel(task, me);
  let actions = null;
  if (waitingOn.length && ["ready", "requested"].includes(task.status)) actions = <View style={{ marginTop: 14 }}><Sand><IconCircle name="pending" tone="white" />
    <View style={{ flex: 1 }}><Text style={t.row}>{`Waiting on ${waitingOn[0]!.title}`}</Text><Meta>You can prepare now. It can be taken once that's done.</Meta></View></Sand></View>;
  else if (task.status === "ready") actions = <Buttons><Primary label="I'll take it" busy={busy} onPress={() => run(act.claim(task, me))} />{isLead ? <Outline label="Ask someone" onPress={() => setAsking(true)} /> : null}</Buttons>;
  else if (task.status === "requested" && mine) actions = <Buttons><Primary label="I'm in" busy={busy} onPress={() => run(act.claim(task, me))} /><Outline label="Can't make it" onPress={() => run(act.release(task), "That's okay, thanks for telling us.")} /></Buttons>;
  else if ((task.status === "accepted" || task.status === "in-progress") && (mine || isLead)) actions = <Buttons><Primary label="Mark done" busy={busy} onPress={() => run(act.done(task))} /><Outline label="Can't make it" onPress={() => run(act.release(task), "That's okay, thanks for telling us.")} /></Buttons>;
  else if ((task.status === "accepted" || task.status === "in-progress") && !onIt) actions = <Buttons><Outline flex label="I'll help" onPress={() => run(act.helpOut(task, me))} /></Buttons>;
  else if (task.status === "draft" && isLead) actions = <Buttons><Primary label="Accept this idea" onPress={() => run(act.accept(task))} /></Buttons>;

  return (
    <Screen back>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name={task.status === "completed" ? "check" : "pen"} size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{[shortRef(task), team?.name].filter(Boolean).join(" · ")}</Meta><Text style={[t.title, { fontSize: 24 }]}>{task.title}</Text></View></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}><Pill tone={sl.tone}>{sl.label}</Pill>{task.due ? <Pill tone="ok">{`Due ${short(task.due)}`}</Pill> : null}{task.milestone ? <Pill tone="ok">Gate</Pill> : null}{task.goodFirstStep ? <Pill tone="ok">Good first step</Pill> : null}</View>
      {naming !== null ? <><Field value={naming} onChangeText={setNaming} placeholder="What needs doing" autoFocus /><Buttons><Primary label="Save" disabled={!naming.trim()} onPress={() => { run(bix.next(task, { title: naming.trim() })); setNaming(null); }} /><Outline label="Cancel" onPress={() => setNaming(null)} /></Buttons></> : null}
      {desc !== null ? <><Field value={desc} onChangeText={setDesc} multiline placeholder="What this is, and what done looks like" /><Buttons><Primary label="Save" onPress={() => { run(bix.next(task, { description: desc.trim() || undefined })); setDesc(null); }} /><Outline label="Cancel" onPress={() => setDesc(null)} /></Buttons></>
        : task.description ? <View style={{ marginTop: 10 }}><Body>{task.description}</Body></View> : null}
      {actions}
      {msg ? <Notice>{msg}</Notice> : null}
      <Eyebrow right={(task.checklist ?? []).length ? `${(task.checklist ?? []).filter((x: any) => x.done).length} of ${(task.checklist ?? []).length}` : undefined}>Smaller steps</Eyebrow>
      <Panel>
        {(task.checklist ?? []).map((x: any, i: number) => <Row key={i} left={<Check on={!!x.done} onPress={onIt || isLead ? () => run(act.toggle(task, i, me)) : undefined} />} title={x.text} />)}
        {(onIt || isLead) && task.status !== "completed" ? <View style={{ paddingVertical: 8 }}><Field value={item} onChangeText={setItem} placeholder="Add a smaller step" style={{ backgroundColor: c.wash }}
          onSubmitEditing={() => { if (item.trim()) { run(bix.next(task, { checklist: [...(task.checklist ?? []), { text: item.trim(), done: false }] })); setItem(""); } }} returnKeyType="done" /></View>
          : (task.checklist ?? []).length ? null : <Row title="None yet" last />}
      </Panel>


      {task.status === "completed" && task.milestone && unblocks.length ? <><Eyebrow>{`The gate is open: ${unblocks.length} can go ahead`}</Eyebrow>
        <Panel>{unblocks.map((x, i) => <Row key={x.id} left={<IconCircle name="check" />} title={x.title} right={<Pill tone="ok">Ready</Pill>} onPress={() => router.push(`/task/${x.id}`)} last={i === unblocks.length - 1} />)}</Panel></> : null}
      {task.status === "completed" ? <View style={{ marginTop: 16 }}><Sand><Icon name="lock" color={c.accent} />
        <View style={{ flex: 1 }}><Text style={t.row}>{signed?.allValid ? "Recorded and signed by your group" : "Recorded"}</Text>
          <Meta>{signed?.signatures?.[0] ? `Signed ${new Date(signed.signatures[0].when).toLocaleString()} · unchanged` : "Added to the story of everyone who did it"}</Meta></View></Sand></View> : null}

      {(task.attachment ?? []).length || (canAdd && task.status !== "completed") ? <><Eyebrow right={(task.attachment ?? []).length ? `${(task.attachment ?? []).length}` : undefined}>Files</Eyebrow>
        <Files items={task.attachment ?? []} onAdd={canAdd && open ? () => setAdding(true) : undefined} onRemove={canEdit && open ? (a) => run(bix.next(task, { attachment: (task.attachment ?? []).filter((x: any) => x.hash !== a.hash) }), "File removed.") : undefined} /></> : null}
      {outputs.length || (canAdd && task.status === "completed") ? <><Eyebrow>What came out of it</Eyebrow>
        <Files items={outputs} onAdd={canAdd ? () => setAdding(true) : undefined} /></> : null}

      {parts.length ? <><Eyebrow>Working on it</Eyebrow><Panel><Row left={<Faces names={parts.map((p: any) => name(p.person.reference))} photos={parts.map((p: any) => people[p.person.reference]?.photo)} />} title={parts.map((p: any) => name(p.person.reference)).join(" and ")} meta={task.owner?.reference?.startsWith("Person/") ? `${name(task.owner.reference)} is accountable` : undefined} last /></Panel></> : null}


      {canEdit && open ? <View style={{ marginTop: 20 }}><Panel>
        <Row left={<IconCircle name="cal" />} title="Plan this task" onPress={() => setTuning(true)} last
          meta={[task.due ? `Due ${short(task.due)}` : "No due date", deps.length ? `waits on ${deps.length}` : null, task.audience === "open" ? "anyone can help" : null].filter(Boolean).join(" · ")} />
      </Panel></View> : null}

      <Sheet open={tuning} onClose={() => setTuning(false)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Plan this task</Text>
        <Panel style={{ backgroundColor: c.wash }}>
        <Row left={<IconCircle name="cal" />} title="Due date" meta={task.due ? short(task.due) : "None yet"} onPress={() => { setTuning(false); setTimeout(() => setPlanning(true), 260); }} />
        <Row left={<IconCircle name="building" />} title="Others wait on this" meta="Make it a gate on the project page" right={<Check on={!!task.milestone} onPress={() => run(bix.next(task, { milestone: !task.milestone }))} />} />
        <Row left={<IconCircle name="pending" />} title="Waits on" meta={deps.length ? deps.map((x) => x.title).join(", ") : "Nothing"} onPress={() => { setTuning(false); setTimeout(() => setPlanning(true), 260); }} />
        <Row left={<IconCircle name="heart" />} title="Anyone can help" meta="Show to outside volunteers" right={<Check on={task.audience === "open"} onPress={() => run(bix.next(task, { audience: task.audience === "open" ? "team" : "open" }))} />} />
        <Row left={<IconCircle name="smile" />} title="Good first step" meta="Suggested to newcomers" right={<Check on={!!task.goodFirstStep} onPress={() => run(bix.next(task, { goodFirstStep: !task.goodFirstStep }))} />} />
        <Row left={<IconCircle name="pen" />} title="Rename" meta={task.title} onPress={() => { setTuning(false); setNaming(task.title ?? ""); }} />
        <Row left={<IconCircle name="pen" />} title="About this task" onPress={() => { setTuning(false); setDesc(task.description ?? ""); }} />
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

      <Sheet open={asking} onClose={() => setAsking(false)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Who should we ask?</Text>
        <Meta>They'll get an ask they can say yes or no to.</Meta>
        <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>
          {(team?.participant ?? []).filter((p: any) => p.status === "active" && p.person.reference !== me).map((p: any) =>
            <Row key={p.person.reference} left={<Avatar name={name(p.person.reference)} photo={people[p.person.reference]?.photo} />} title={name(p.person.reference)} meta={p.role}
              onPress={() => { setAsking(false); run(act.ask(task, p.person.reference), `Asked ${name(p.person.reference)}.`); }} />)}
        </Panel>
        <View style={{ marginTop: 12 }}><LinkText onPress={() => setAsking(false)}>Not now</LinkText></View>
      </Sheet>
    </Screen>
  );
}
