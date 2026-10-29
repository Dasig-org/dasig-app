import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { short, weekLabel } from "@/lib/dates";
import { useLoad } from "@/lib/use";
import { shortRef, teamIcon } from "@/lib/work";
import { Eyebrow, IconCircle, Meta, Panel, Pill, Row, Sand, Screen, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** Timeline: work by week, gates where they fall (sketch: P2 #10). Phone-first, vertical. */
export default function Timeline() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useLoad(async () => {
    const [p, tasks, teams] = await Promise.all([bix.get("Initiative", id), bix.search("Task", { partOf: `Initiative/${id}` }), bix.search("Team", { initiative: `Initiative/${id}` })]);
    return { p, tasks: tasks.filter((x) => x.status !== "draft"), teams };
  }, [id]);
  if (!data) return <Screen back><Meta>Loading…</Meta></Screen>;
  const order = (x: any) => x.due ?? x.restriction?.period?.end ?? "9999";
  const sorted = [...data.tasks].sort((a, b) => String(order(a)).localeCompare(String(order(b))));
  const groups: { label: string; items: any[] }[] = [];
  for (const x of sorted) { const l = weekLabel(x.due); const g = groups.find((y) => y.label === l); g ? g.items.push(x) : groups.push({ label: l, items: [x] }); }
  const team = (x: any) => data.teams.find((y) => `Team/${y.id}` === x.team?.reference);
  return (
    <Screen back>
      <Title sub={data.p.title}>Timeline</Title>
      {groups.map((g) => <View key={g.label}><Eyebrow right={`${g.items.length}`}>{g.label}</Eyebrow>
        {g.items.filter((x) => x.milestone).map((x) => <View key={x.id} style={{ marginBottom: 8 }}><Sand><IconCircle name="building" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>{`Gate: ${x.title}`}</Text><Meta>{x.status === "completed" ? "Opened" : "Many tasks wait on this"}</Meta></View></Sand></View>)}
        <Panel>{g.items.filter((x) => !x.milestone).map((x, i, all) => <Row key={x.id} left={<IconCircle name={x.status === "completed" ? "check" : teamIcon(team(x)?.name ?? "")} tone={x.status === "completed" ? "grey" : "sand"} />}
          title={x.title} meta={[team(x)?.name, x.due ? short(x.due) : null, shortRef(x)].filter(Boolean).join(" · ")} right={x.status === "completed" ? <Pill tone="ok">Done</Pill> : (x.dependsOn ?? []).length ? <Pill>Waits</Pill> : undefined}
          onPress={() => router.push(`/task/${x.id}`)} last={i === all.length - 1} />)}</Panel></View>)}
      {!groups.length ? <Panel><Row title="No work yet" meta="Teams add work from their pages" last /></Panel> : null}
    </Screen>
  );
}
