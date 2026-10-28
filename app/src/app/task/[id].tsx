import { useEffect, useState } from "react";
import { onSynced } from "@/lib/outbox";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix, BixError, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, shortRef, stateLabel } from "@/lib/work";
import { Body, Buttons, Check, Eyebrow, Faces, Field, IconCircle, LinkText, Meta, Notice, Outline, Panel, Pill, Primary, Row, Sand, Screen, Sheet, Avatar } from "@/ui/kit";
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
  useEffect(() => onSynced(() => setMsg(null)), []);
  const { data, error, reload } = useLoad(async () => {
    const task = await bix.get("Task", id);
    const team = task.team ? await bix.get("Team", task.team.reference.split("/")[1]).catch(() => null) : null;
    const refs = new Set<string>([...(task.participant ?? []).map((p: any) => p.person.reference), ...((team?.participant ?? []).map((p: any) => p.person.reference))]);
    const people: Record<string, R> = {};
    for (const r of refs) { try { people[r] = await bix.get("Person", r.split("/")[1]!); } catch {} }
    const signed = task.status === "completed" ? await bix.verify("Task", id).catch(() => null) : null;
    return { task, team, people, signed };
  }, [id]);
  if (error) return <Screen back><Notice>{error}</Notice></Screen>;
  if (!data) return <Screen back><Meta>Loading…</Meta></Screen>;
  const { task, team, people, signed } = data;
  const name = (r?: string) => (r && people[r]?.name?.text) || "Someone";
  const parts = (task.participant ?? []).filter((p: any) => p.status === "active");
  const isLead = (team?.participant ?? []).some((p: any) => p.person.reference === me && p.role === "lead" && p.status === "active");
  const mine = task.owner?.reference === me;
  const onIt = parts.some((p: any) => p.person.reference === me);

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
  if (task.status === "ready") actions = <Buttons><Primary label="I'll take it" busy={busy} onPress={() => run(act.claim(task, me))} />{isLead ? <Outline label="Ask someone" onPress={() => setAsking(true)} /> : null}</Buttons>;
  else if (task.status === "requested" && mine) actions = <Buttons><Primary label="I'm in" busy={busy} onPress={() => run(act.claim(task, me))} /><Outline label="Can't make it" onPress={() => run(act.release(task), "That's okay, thanks for telling us.")} /></Buttons>;
  else if ((task.status === "accepted" || task.status === "in-progress") && (mine || isLead)) actions = <Buttons><Primary label="Mark done" busy={busy} onPress={() => run(act.done(task))} /><Outline label="Can't make it" onPress={() => run(act.release(task), "That's okay, thanks for telling us.")} /></Buttons>;
  else if ((task.status === "accepted" || task.status === "in-progress") && !onIt) actions = <Buttons><Outline flex label="I'll help" onPress={() => run(act.helpOut(task, me))} /></Buttons>;
  else if (task.status === "draft" && isLead) actions = <Buttons><Primary label="Accept this idea" onPress={() => run(act.accept(task))} /></Buttons>;

  return (
    <Screen back>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name={task.status === "completed" ? "check" : "pen"} size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{[shortRef(task), team?.name].filter(Boolean).join(" · ")}</Meta><Text style={[t.title, { fontSize: 24 }]}>{task.title}</Text></View></View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}><Pill tone={sl.tone}>{sl.label}</Pill></View>
      {task.description ? <View style={{ marginTop: 10 }}><Body>{task.description}</Body></View> : null}
      {actions}
      {msg ? <Notice>{msg}</Notice> : null}

      {task.status === "completed" ? <View style={{ marginTop: 16 }}><Sand><Icon name="lock" color={c.accent} />
        <View style={{ flex: 1 }}><Text style={t.row}>{signed?.allValid ? "Recorded and signed by your group" : "Recorded"}</Text>
          <Meta>{signed?.signatures?.[0] ? `Signed ${new Date(signed.signatures[0].when).toLocaleString()} · unchanged` : "Added to the story of everyone who did it"}</Meta></View></Sand></View> : null}

      {parts.length ? <><Eyebrow>Working on it</Eyebrow><Panel><Row left={<Faces names={parts.map((p: any) => name(p.person.reference))} />} title={parts.map((p: any) => name(p.person.reference)).join(" and ")} meta={task.owner?.reference?.startsWith("Person/") ? `${name(task.owner.reference)} is accountable` : undefined} last /></Panel></> : null}

      <Eyebrow right={(task.checklist ?? []).length ? `${(task.checklist ?? []).filter((x: any) => x.done).length} of ${(task.checklist ?? []).length}` : undefined}>Smaller steps</Eyebrow>
      <Panel>
        {(task.checklist ?? []).map((x: any, i: number) => <Row key={i} left={<Check on={!!x.done} onPress={onIt || isLead ? () => run(act.toggle(task, i, me)) : undefined} />} title={x.text} />)}
        {(onIt || isLead) && task.status !== "completed" ? <View style={{ paddingVertical: 8 }}><Field value={item} onChangeText={setItem} placeholder="Add a smaller step" style={{ backgroundColor: c.wash }}
          onSubmitEditing={() => { if (item.trim()) { run(bix.next(task, { checklist: [...(task.checklist ?? []), { text: item.trim(), done: false }] })); setItem(""); } }} returnKeyType="done" /></View>
          : (task.checklist ?? []).length ? null : <Row title="None yet" last />}
      </Panel>

      <Sheet open={asking} onClose={() => setAsking(false)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Who should we ask?</Text>
        <Meta>They'll get an ask they can say yes or no to.</Meta>
        <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>
          {(team?.participant ?? []).filter((p: any) => p.status === "active" && p.person.reference !== me).map((p: any) =>
            <Row key={p.person.reference} left={<Avatar name={name(p.person.reference)} />} title={name(p.person.reference)} meta={p.role}
              onPress={() => { setAsking(false); run(act.ask(task, p.person.reference), `Asked ${name(p.person.reference)}.`); }} />)}
        </Panel>
        <View style={{ marginTop: 12 }}><LinkText onPress={() => setAsking(false)}>Not now</LinkText></View>
      </Sheet>
    </Screen>
  );
}
