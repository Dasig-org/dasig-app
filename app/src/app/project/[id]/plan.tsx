import { useState } from "react";
import { ErrorState } from "@/ui/ErrorState";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix, ref, type R } from "@/lib/bix";
import { DAY } from "@/lib/dates";
import { relative } from "@/lib/kinds";
import { useLoad } from "@/lib/use";
import { Buttons, Check, Chips, Field, IconCircle, Meta, Notice, Panel, Primary, Row, Screen, Skeleton, Title } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/*
 * Add work to an existing project ("+" → Add work, workspace/docs/ux/NAVIGATION_PLAN.md): the Plan the work list from
 * New event, for a project that already exists. Every team at once, its current tasks shown, new ones typed or pasted
 * with a "how long before" date. With ?milestone=1, new work is marked as a milestone (others wait on it).
 */
type New = { title: string; before: number; milestone: boolean };
const BEFORE = [{ value: "14", label: "2 weeks before" }, { value: "7", label: "1 week before" }, { value: "2", label: "2 days before" }, { value: "0", label: "On the day" }];

export default function AddWork() {
  const { id, milestone } = useLocalSearchParams<{ id: string; milestone?: string }>();
  const { data, error } = useLoad(async () => {
    const p = await bix.get("Initiative", id);
    const [teams, tasks] = await Promise.all([bix.search("Team", { initiative: `Initiative/${id}` }), bix.search("Task", { partOf: `Initiative/${id}` })]);
    return { p, teams: teams.filter((x) => x.status !== "inactive"), tasks: tasks.filter((x) => x.status !== "cancelled") };
  }, [id]);
  const [adds, setAdds] = useState<Record<string, New[]>>({});
  const [typing, setTyping] = useState<{ team: string; text: string }>({ team: "", text: "" });
  const [before, setBefore] = useState("7");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const gate = milestone === "1";
  if (!data) return <Screen back>{error ? <ErrorState message={error} /> : <Skeleton />}</Screen>;
  const { p, teams, tasks } = data;
  const date = p.period?.start ? new Date(p.period.start) : null;
  const add = (team: string) => {
    const lines = typing.text.split("\n").map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
    if (!lines.length) return;
    setAdds((a) => ({ ...a, [team]: [...(a[team] ?? []), ...lines.map((title) => ({ title, before: Number(before), milestone: gate }))] }));
    setTyping({ team, text: "" });
  };
  const count = Object.values(adds).flat().length;
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const recs = teams.flatMap((tm: R) => (adds[tm.id] ?? []).map((w) => bix.create("Task", { intent: "plan", status: "ready", title: w.title, partOf: ref(p), owner: ref(tm), team: ref(tm), audience: "team",
        ...(w.milestone ? { milestone: true } : {}), ...(date ? { due: new Date(date.getTime() - w.before * DAY).toISOString() } : {}) })));
      if (recs.length) await bix.commit(...recs);
      router.back();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen back>
      <Title sub={date ? `Dates count back from ${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}.` : "Add a date to the project and these get due dates."}>{gate ? "Add a milestone" : `Add work to ${p.title}`}</Title>
      {date ? <><Meta>New tasks are due</Meta><Chips options={BEFORE} value={before} onChange={setBefore} /></> : null}
      {!teams.length ? <Notice>This project has no teams yet. Add one from the project page.</Notice> : null}
      {teams.map((tm: R) => {
        const have = tasks.filter((x: R) => x.team?.reference === `Team/${tm.id}` && !x.basedOn);
        return <View key={tm.id}>
          <Text style={[t.eyebrow, { marginTop: 14, marginBottom: 6, marginHorizontal: 4 }]}>{`${tm.name} · ${have.length} task${have.length === 1 ? "" : "s"}`}</Text>
          <Panel>
            {have.slice(0, 3).map((x: R) => <Row key={x.id} left={<IconCircle name={x.status === "completed" ? "check" : "pen"} />} title={x.title} meta={x.status === "completed" ? "Done" : undefined} />)}
            {have.length > 3 ? <Row title={`and ${have.length - 3} more`} /> : null}
            {(adds[tm.id] ?? []).map((w, i) => <Row key={`n${i}`} left={<Check on onPress={() => setAdds((a) => ({ ...a, [tm.id]: a[tm.id]!.filter((_, k) => k !== i) }))} />}
              title={w.title} meta={["New", date ? relative(w.before) : null, w.milestone ? "others wait on this" : null].filter(Boolean).join(" · ")} />)}
            <View style={{ paddingVertical: 8 }}><Field value={typing.team === tm.id ? typing.text : ""} onFocus={() => setTyping({ team: tm.id, text: "" })} onChangeText={(text) => setTyping({ team: tm.id, text })}
              placeholder={gate ? "Name the milestone" : "Add a task, or paste several lines"} onSubmitEditing={() => add(tm.id)} returnKeyType="done" style={{ backgroundColor: c.wash }} /></View>
          </Panel>
        </View>;
      })}
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label={count ? `Add ${count} task${count === 1 ? "" : "s"}` : "Type a task above"} onPress={save} busy={busy} disabled={!count} /></Buttons>
    </Screen>
  );
}
