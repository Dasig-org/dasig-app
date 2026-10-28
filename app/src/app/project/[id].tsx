import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { useLoad } from "@/lib/use";
import { teamIcon } from "@/lib/work";
import { Body, Eyebrow, IconCircle, Meta, Notice, Panel, Row, Screen } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** The project page: teams and their progress, counted from completed tasks. */
export default function Project() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useLoad(async () => {
    const p = await bix.get("Initiative", id);
    const teams = await bix.search("Team", { initiative: `Initiative/${id}` });
    const tasks = await bix.search("Task", { partOf: `Initiative/${id}` });
    return { p, teams, tasks };
  }, [id]);
  if (error) return <Screen back><Notice>{error}</Notice></Screen>;
  if (!data) return <Screen back><Meta>Loading…</Meta></Screen>;
  const { p, teams, tasks } = data;
  const people = new Set(teams.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)));
  return (
    <Screen back>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name="flag" size={56} tone="white" />
        <View style={{ flex: 1 }}><Text style={[t.title, { fontSize: 24 }]}>{p.title}</Text><Meta>{`${teams.length} teams · ${people.size} people`}</Meta></View></View>
      {p.description ? <View style={{ marginTop: 10 }}><Body>{p.description}</Body></View> : null}
      <Eyebrow>Teams</Eyebrow>
      <Panel>
        {teams.map((x, i) => {
          const mine = tasks.filter((k) => k.team?.reference === `Team/${x.id}`);
          const doneN = mine.filter((k) => k.status === "completed").length;
          const pct = mine.length ? doneN / mine.length : 0;
          return <Row key={x.id} left={<IconCircle name={teamIcon(x.name)} />} title={x.name} last={i === teams.length - 1} onPress={() => router.push(`/team/${x.id}`)}
            meta={mine.length ? `${doneN} of ${mine.length} done` : (x.participant ?? []).some((y: any) => y.role === "lead") ? "No tasks yet" : "Needs a lead"}
            right={<View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden" }}><View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: c.accent }} /></View>} />;
        })}
      </Panel>
    </Screen>
  );
}
