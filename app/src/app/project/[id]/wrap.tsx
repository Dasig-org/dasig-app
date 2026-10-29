import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix, ref } from "@/lib/bix";
import { DAY } from "@/lib/dates";
import { useLoad } from "@/lib/use";
import { Buttons, Eyebrow, IconCircle, Meta, Notice, Panel, Primary, Row, Screen, Title, Outline } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** Wrapping up: finish the project, and save its teams and usual work for next time (BIX InitiativeTemplate, never shown by that name). */
export default function Wrap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, reload } = useLoad(async () => {
    const [p, teams, tasks] = await Promise.all([bix.get("Initiative", id), bix.search("Team", { initiative: `Initiative/${id}` }), bix.search("Task", { partOf: `Initiative/${id}` })]);
    return { p, teams, tasks: tasks.filter((x) => x.status !== "draft") };
  }, [id]);
  if (!data) return <Screen back><Meta>Loading…</Meta></Screen>;
  const { p, teams, tasks } = data;
  const done = tasks.filter((x) => x.status === "completed").length;
  const people = new Set(tasks.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)));
  const anchor = p.period?.start ? new Date(p.period.start).getTime() : null;
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const tmpl = bix.create("InitiativeTemplate", {
        title: `${p.title.replace(/\s*\d{4}$/, "")} (our usual teams)`, organization: p.organization, version: 1, status: "active",
        team: teams.map((x) => ({ name: x.name })),
        action: tasks.filter((x) => !x.milestone).map((x) => {
          const team = teams.find((y) => `Team/${y.id}` === x.team?.reference)?.name;
          const days = anchor && x.due ? Math.round((new Date(x.due).getTime() - anchor) / DAY) : null;
          return { title: x.title, ...(team ? { team } : {}), audience: x.audience ?? "team", ...(days !== null ? { offset: `P${Math.abs(days)}D${days < 0 ? "-before" : "-after"}` } : {}) };
        }),
      });
      await bix.commit(tmpl);
      setMsg("Saved. Next time, start a project from these teams.");
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const finish = async () => { try { await bix.commit(bix.next(p, { status: "completed", period: { ...(p.period ?? {}), end: new Date().toISOString() } })); reload(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } };
  return (
    <Screen back>
      <Title sub={p.status === "completed" ? "It's done. Salamat!" : "When the work is done."}>{p.title}</Title>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: c.white, borderRadius: 22, padding: 14, gap: 8 }}><IconCircle name="users" /><Text style={t.row}>{`${people.size} people`}</Text><Meta>did the work</Meta></View>
        <View style={{ flex: 1, backgroundColor: c.white, borderRadius: 22, padding: 14, gap: 8 }}><IconCircle name="check" /><Text style={t.row}>{`${done} of ${tasks.length}`}</Text><Meta>things done</Meta></View>
      </View>
      <Eyebrow>Wrap up</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="heart" />} title="See the credits" onPress={() => router.push(`/project/${id}/credits` as never)} />
        <Row left={<IconCircle name="repeat" />} title="Save these teams for next time" meta={`${teams.length} teams and their usual work, dated from the event`} onPress={save} last />
      </Panel>
      {msg ? <Notice>{msg}</Notice> : null}
      {p.status !== "completed" ? <Buttons><Primary label="Mark the project done" onPress={finish} busy={busy} /></Buttons> : <Buttons><Outline flex label="Back to the project" onPress={() => router.back()} /></Buttons>}
    </Screen>
  );
}
