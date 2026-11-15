import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { words } from "@bayanihan/bayani";
import { bix, type R } from "@/lib/bix";
import { useLoad } from "@/lib/use";
import { practicesFor } from "@/lib/memory";
import { act, peopleFor, personName } from "@/lib/work";
import { Icon } from "./Icon";
import { Avatar, Buttons, Check, Eyebrow, Field, IconCircle, LinkText, Meta, Outline, Panel, Primary, Row, Sheet } from "./kit";
import { useSnackbar } from "./Snackbar";
import { c, tone, type as t } from "./theme";

/*
 * Smaller steps (UI_REIMAGINE §7.2h; Don, 2026-11-15: "no way to modify an already inputted step… can the smaller
 * steps be attributed and assigned to someone?"). Two kinds, as BIX has them, in one list:
 * - a checklist item (Task.checklist: text, done, doneBy): quick, no owner. Tap it to rename, move or remove it;
 *   done items say who did them.
 * - a subtask (a Task with partOf this task): has an owner, a due date, its own page and credit. "Give it to someone"
 *   turns a checklist item into one: yourself (the owner of a task may add subtasks under it), open to the team, or,
 *   for a lead, someone asked by name (BIX: asking needs task.assign; they say yes or no).
 * Help (BIX `memory` area, a rule, never the model writing text): what this kind of step was broken into last time,
 * from the group's own finished projects (the same usual step, or the same words), and who did those, to ask first.
 */
type Item = { text: string; done?: boolean; doneBy?: { reference: string } };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export function SmallerSteps({ task, subs, people, me, team, project, org, isLead, canAdd, ownsIt, focus, busy, run, reload }: {
  task: R; subs: R[]; people: Record<string, R>; me: string; team: R | null; project: R | null; org: R | null; isLead: boolean; canAdd: boolean; ownsIt: boolean;
  focus: number; busy: boolean; run: (next: R, ok?: string, undo?: (fresh: R) => R) => Promise<void>; reload: () => void;
}) {
  const items: Item[] = task.checklist ?? [];
  const open = !["completed", "cancelled", "failed"].includes(task.status);
  const [edit, setEdit] = useState<{ i: number; text: string; giving: boolean } | null>(null);
  const [item, setItem] = useState("");
  const { show } = useSnackbar();
  const name = (r?: string) => (r === me ? "You" : r && people[r] ? personName(people[r]!) : "Someone");
  const memoryOn = ((org?.assist ?? []) as { code?: string }[]).some((a) => a.code === "memory");

  // Last time: the same kind of step in the group's finished projects; its checklist and subtasks, and who did them.
  const { data: last } = useLoad(async () => {
    if (!memoryOn || !canAdd || !open || !project?.organization) return null;
    const inis = (await bix.search("Initiative", { organization: project.organization.reference })).filter((x) => x.id !== project.id && x.status === "completed")
      .sort((a, b) => String(b.period?.start ?? "").localeCompare(String(a.period?.start ?? ""))).slice(0, 6);
    // The group's usual smaller steps of this usual step (Practices whose partOf is it), kept at close-outs before.
    const usual = task.practice ? (await practicesFor(project)).filter((x) => x.partOf?.reference === task.practice.reference).map((x) => String(x.title)) : [];
    const mine = words(task.title);
    const same = (x: R) => (task.practice && x.practice?.reference === task.practice.reference) || (!task.practice && [...words(x.title)].filter((w) => mine.has(w)).length >= Math.min(2, mine.size));
    const past = (await Promise.all(inis.map((i) => bix.search("Task", { partOf: `Initiative/${i.id}` }).catch(() => [] as R[])))).flat().filter(same).slice(0, 3);
    if (!past.length && !usual.length) return null;
    const pastSubs = (await Promise.all(past.map((x) => bix.search("Task", { partOf: `Task/${x.id}` }).catch(() => [] as R[])))).flat().filter((x) => x.status !== "cancelled");
    const have = new Set([...items.map((x) => norm(x.text)), ...subs.map((x) => norm(x.title ?? ""))]);
    const seen = new Set<string>();
    const steps = [...usual, ...past.flatMap((x) => ((x.checklist ?? []) as Item[]).map((c) => c.text)), ...pastSubs.map((x) => String(x.title ?? ""))]
      .filter((s) => { const k = norm(s); if (!k || have.has(k) || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
    const did = [...new Set([...past.flatMap((x) => ((x.checklist ?? []) as Item[]).map((c) => c.doneBy?.reference)), ...pastSubs.map((x) => x.owner?.reference)]
      .filter((r): r is string => !!r?.startsWith("Person/") && r !== me))].slice(0, 6);
    return { steps, did, ppl: await peopleFor(did, 6), from: inis.find((i) => past.some((x) => x.partOf?.reference === `Initiative/${i.id}`))?.title as string | undefined, usual: usual.length };
  }, [task.id, task.meta.version, subs.length, memoryOn, canAdd]);

  const save = (next: Item[], ok?: string) => run(bix.next(task, { checklist: next }), ok);
  const add = (text: string) => { if (text.trim()) save([...items, { text: text.trim(), done: false }]); };
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= items.length) return; const n = [...items]; [n[i], n[j]] = [n[j]!, n[i]!]; save(n); setEdit(null); };
  // Give a checklist item to someone: it becomes a subtask (partOf this task) and leaves the checklist, in one change.
  const give = async (i: number, to: "me" | "team" | string) => {
    const it = items[i]!; setEdit(null);
    const who = to === "me" ? me : to;
    const sub = bix.create("Task", { intent: "plan", title: it.text, partOf: { reference: `Task/${task.id}` }, ...(task.team ? { team: task.team } : {}), audience: task.audience ?? "team", ...(task.due ? { due: task.due } : {}),
      ...(to === "team" ? { status: "ready", owner: task.team ?? task.owner }
        : who === me ? { status: "accepted", owner: { reference: me }, participant: [{ person: { reference: me }, role: "owner", status: "active" }], executionPeriod: { start: new Date().toISOString() } }
        : { status: "requested", owner: { reference: who } }) });
    try {
      const [made] = await bix.commit(sub, bix.next(task, { checklist: items.filter((_, j) => j !== i) }));
      show(to === "team" ? `“${it.text}” is open to ${team?.name ?? "the team"}.` : who === me ? `“${it.text}” is yours.` : `Asked ${name(who).split(" ")[0]}. They'll say yes or no.`, { undo: async () => {
        try { const fresh = await bix.get("Task", task.id); const back = [...(fresh.checklist ?? [])]; back.splice(i, 0, it);
          await bix.commit(bix.next(made ?? sub, { status: "cancelled" }), bix.next(fresh, { checklist: back })); show("Undone."); } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); }
        reload(); } });
    } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); }
    reload();
  };

  const done = items.filter((x) => x.done).length + subs.filter((x) => x.status === "completed").length;
  const total = items.length + subs.length;
  const showList = total > 0 || focus > 0;
  const canGive = open && (isLead || ownsIt);
  const subMeta = (x: R) => {
    const o = x.owner?.reference as string | undefined, person = o?.startsWith("Person/");
    const state = x.status === "completed" ? `Done by ${name(o)}` : x.status === "requested" ? `Asked ${name(o).split(" ")[0]} · waiting` : person ? `${name(o)} ${o === me ? "are" : "is"} on it` : x.status === "draft" ? "Suggested, waiting for the lead" : "Open to the team";
    return [state, x.due && x.status !== "completed" ? `due ${new Date(x.due).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : null].filter(Boolean).join(" · ");
  };
  const teamPeople: string[] = ((team?.participant ?? []) as { person: { reference: string }; status: string }[]).filter((p) => p.status === "active").map((p) => p.person.reference);
  const onTask: string[] = ((task.participant ?? []) as { person: { reference: string }; status: string }[]).filter((p) => p.status === "active").map((p) => p.person.reference);
  const pick = [...new Set([...onTask, ...teamPeople, ...(last?.did ?? [])])].filter((r) => r !== me);
  const label = (r: string) => (people[r] ? personName(people[r]!) : last?.ppl[r] ? personName(last.ppl[r]!) : "Someone");

  return <>
    {showList ? <>
      <Eyebrow right={total ? `${done} of ${total}` : undefined}>Smaller steps</Eyebrow>
      <Panel>
        {items.map((x, i) => <Row key={`c${i}`} left={<Check on={!!x.done} onPress={canAdd ? () => run(act.toggle(task, i, me)) : undefined} />} title={x.text}
          meta={x.done && x.doneBy ? `Done by ${name(x.doneBy.reference)}` : undefined} onPress={canAdd && open ? () => setEdit({ i, text: x.text, giving: false }) : undefined}
          right={canAdd && open ? <Icon name="pen" size={16} color={c.s300} /> : undefined} last={i === items.length - 1 && !subs.length && !(canAdd && open)} />)}
        {/* A subtask keeps the same check circle as a checklist item (Don, 2026-11-15: the avatar must not replace it);
            whose it is shows on the right. Tick: its owner or a lead, once it's taken (BIX: mark done). Untick: a lead
            (reopening needs task.assign). Otherwise the circle shows its state and can't be tapped. */}
        {subs.map((x, i) => { const o = x.owner?.reference as string | undefined;
          const doneIt = x.status === "completed";
          const can = doneIt ? isLead : (o === me || isLead) && ["accepted", "in-progress"].includes(x.status);
          const toggle = () => doneIt
            ? run({ ...bix.next(x, { status: o?.startsWith("Person/") ? "in-progress" : "ready" }), verification: undefined }, `Reopened “${x.title}”.`)
            : run(act.done(x), `Done: “${x.title}”.`, isLead ? (fresh) => ({ ...bix.next(fresh, { status: "in-progress" }), verification: undefined }) : undefined);
          return <Row key={x.id} title={x.title} meta={subMeta(x)} onPress={() => router.push(`/task/${x.id}`)} last={i === subs.length - 1 && !(canAdd && open)}
            left={<Check on={doneIt} onPress={can ? toggle : undefined} />}
            right={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {o?.startsWith("Person/") ? <Avatar name={name(o) === "You" && people[o] ? personName(people[o]!) : name(o)} size={32} photo={people[o]?.photo} />
                : <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.wash, alignItems: "center", justifyContent: "center" }}><Icon name="users" size={16} color={c.s500} /></View>}
              <Icon name="chevron" size={16} color={c.s300} /></View>} />; })}
        {canAdd && open ? <View style={{ paddingVertical: 8 }}><Field key={`step${focus}`} autoFocus={focus > 0} value={item} onChangeText={setItem} placeholder={total ? "Add another step" : "First smaller step"} style={{ backgroundColor: c.wash }}
          onSubmitEditing={() => { add(item); setItem(""); }} returnKeyType="done" /></View> : null}
      </Panel>
      {canGive && items.length ? <Meta>{"Tap a step to change it, or give it to someone: it becomes their own task, with credit."}</Meta> : null}
    </> : null}

    {/* Last time (rule, from the group's own records): a plain panel, not Bayani's surface. */}
    {last?.steps.length ? <>
      <Eyebrow>{last.usual && !last.from ? "Usually broken into" : last.from ? `Last time, in ${last.from}` : "Last time"}</Eyebrow>
      <Panel>
        {last.steps.map((x, i) => <Row key={x} left={<IconCircle name="book" />} title={x} last={i === last.steps.length - 1}
          right={<Outline label="Add" onPress={() => add(x)} />} />)}
      </Panel>
      {last.steps.length > 1 ? <View style={{ marginTop: 8, flexDirection: "row" }}><LinkText onPress={() => save([...items, ...last.steps.map((x) => ({ text: x, done: false }))], `Added ${last.steps.length} steps.`)}>{`Add all ${last.steps.length}`}</LinkText></View> : null}
    </> : null}

    <Sheet open={!!edit} onClose={() => setEdit(null)}>
      {edit ? edit.giving ? <>
        <Text style={[t.row, { fontSize: 18 }]}>{`Give “${items[edit.i]?.text}” to…`}</Text>
        <Meta>It becomes its own task under this one, with its own page and credit.</Meta>
        <Panel style={{ backgroundColor: c.wash, marginTop: 12 }}>
          <Row left={<Avatar name={people[me] ? personName(people[me]!) : "Me"} size={40} photo={people[me]?.photo} />} title="Me" meta="I'll do it" onPress={() => give(edit.i, "me")} />
          {task.team ? <Row left={<IconCircle name="users" tone="white" />} title={`Anyone on ${team?.name ?? "the team"}`} meta="Open: someone takes it" onPress={() => give(edit.i, "team")} last={!isLead || !pick.length} /> : null}
          {isLead ? pick.map((r, i) => <Row key={r} left={<Avatar name={label(r)} size={40} photo={people[r]?.photo ?? last?.ppl[r]?.photo} />} title={label(r)}
            meta={onTask.includes(r) ? "On this task" : last?.did.includes(r) && !teamPeople.includes(r) ? "Did this last time" : last?.did.includes(r) ? `On ${team?.name ?? "the team"} · did this last time` : `On ${team?.name ?? "the team"}`}
            onPress={() => give(edit.i, r)} last={i === pick.length - 1} />) : null}
        </Panel>
        {!isLead ? <Meta>{"Asking someone by name is the lead's call. Open it to the team, or take it yourself."}</Meta> : <Meta>{"They're asked, and say yes or no. Nothing is decided for them."}</Meta>}
      </> : <>
        <Text style={[t.row, { fontSize: 18 }]}>Smaller step</Text>
        <Field value={edit.text} onChangeText={(v) => setEdit({ ...edit, text: v })} autoFocus returnKeyType="done"
          onSubmitEditing={() => { if (edit.text.trim()) { save(items.map((x, j) => (j === edit.i ? { ...x, text: edit.text.trim() } : x)), "Saved."); setEdit(null); } }} />
        <Buttons><Primary label="Save" busy={busy} disabled={!edit.text.trim()} onPress={() => { save(items.map((x, j) => (j === edit.i ? { ...x, text: edit.text.trim() } : x)), "Saved."); setEdit(null); }} /></Buttons>
        <Panel style={{ backgroundColor: c.wash, marginTop: 12 }}>
          {canGive ? <Row left={<IconCircle name="userplus" tone="white" />} title="Give it to someone" meta="Their own task, with credit" onPress={() => setEdit({ ...edit, giving: true })} /> : null}
          {edit.i > 0 ? <Row title="Move up" meta={`Above “${items[edit.i - 1]?.text}”`} onPress={() => move(edit.i, -1)} /> : null}
          {edit.i < items.length - 1 ? <Row title="Move down" meta={`Below “${items[edit.i + 1]?.text}”`} onPress={() => move(edit.i, 1)} /> : null}
          <Pressable onPress={() => { const it = items[edit.i]!, i = edit.i; setEdit(null);
            run(bix.next(task, { checklist: items.filter((_, j) => j !== i) }), `Removed “${it.text}”.`, (fresh) => { const back = [...(fresh.checklist ?? [])]; back.splice(i, 0, it); return bix.next(fresh, { checklist: back }); }); }} accessibilityRole="button"
            style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tone.errorContainer, alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={18} color={tone.onErrorContainer} /></View>
            <Text style={[t.row, { color: tone.onErrorContainer }]}>Remove</Text></Pressable>
        </Panel>
      </> : null}
    </Sheet>
  </>;
}
