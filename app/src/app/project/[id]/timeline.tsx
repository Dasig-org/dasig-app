import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { short, weekLabel } from "@/lib/dates";
import { useLoad } from "@/lib/use";
import { useState } from "react";
import { peopleFor, personName, shortRef } from "@/lib/work";
import { Avatar, Eyebrow, IconCircle, Meta, Panel, Row, Sand, Screen, Title, Skeleton } from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { StateChip } from "@/ui/m3";
import { c, type as t } from "@/ui/theme";

/**
 * Timeline: work by week, gates where they fall (sketch: P2 #10). Phone-first, vertical.
 * Review 2026-11-15 (every step had the same people icon): each step shows its state on the left (a filled check when
 * done) and on the right who has it (their face) or what it's waiting for (Late, Asked, Open, Waits).
 */
export default function Timeline() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [now] = useState(() => Date.now());
  const { data } = useLoad(async () => {
    const [p, tasks, teams] = await Promise.all([bix.get("Initiative", id), bix.search("Task", { partOf: `Initiative/${id}` }), bix.search("Team", { initiative: `Initiative/${id}` })]);
    const live = tasks.filter((x) => x.status !== "draft" && x.status !== "cancelled");
    const people = await peopleFor(live.map((x) => x.owner?.reference).filter((r: string | undefined) => r?.startsWith("Person/")) as string[], 30);
    return { p, tasks: live, teams, people };
  }, [id]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const order = (x: any) => x.due ?? x.restriction?.period?.end ?? "9999";
  const sorted = [...data.tasks].sort((a, b) => String(order(a)).localeCompare(String(order(b))));
  const groups: { label: string; items: any[] }[] = [];
  for (const x of sorted) { const l = weekLabel(x.due); const g = groups.find((y) => y.label === l); if (g) g.items.push(x); else groups.push({ label: l, items: [x] }); }
  const team = (x: any) => data.teams.find((y) => `Team/${y.id}` === x.team?.reference);
  const owner = (x: any) => { const r = x.owner?.reference as string | undefined; return r?.startsWith("Person/") ? data.people[r] : undefined; };
  const late = (x: any) => x.status !== "completed" && x.due && Date.parse(x.due) < now;
  const right = (x: any) => {
    if (x.status === "completed") return undefined;
    if (late(x)) return <StateChip kind="late">Late</StateChip>;
    if (x.status === "requested") return <StateChip kind="open">Asked</StateChip>;
    const o = owner(x); if (o) return <Avatar name={personName(o)} photo={o.photo} size={28} />;
    if ((x.dependsOn ?? []).length) return <StateChip kind="open">Waits</StateChip>;
    return <StateChip kind="open">Open</StateChip>;
  };
  return (
    <Screen back>
      <Title sub={data.p.title}>Timeline</Title>
      {groups.map((g) => <View key={g.label}><Eyebrow right={`${g.items.length}`}>{g.label}</Eyebrow>
        {g.items.filter((x) => x.milestone).map((x) => <View key={x.id} style={{ marginBottom: 8 }}><Sand><IconCircle name="building" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>{`Gate: ${x.title}`}</Text><Meta>{x.status === "completed" ? "Opened" : "Many tasks wait on this"}</Meta></View></Sand></View>)}
        <Panel>{g.items.filter((x) => !x.milestone).map((x, i, all) => <Row key={x.id}
          left={x.status === "completed" ? <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={16} color={c.white} /></View>
            : <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: late(x) ? "#BA1A1A" : c.s300 }} />}
          title={x.title} meta={[team(x)?.name, x.status === "completed" ? `done${owner(x) ? ` by ${personName(owner(x)!).split(" ")[0]}` : ""}` : x.due ? `due ${short(x.due)}` : null, shortRef(x)].filter(Boolean).join(" · ")} right={right(x)}
          onPress={() => router.push(`/task/${x.id}`)} last={i === all.length - 1} />)}</Panel></View>)}
      {!groups.length ? <Panel><Row title="No work yet" meta="Teams add work from their pages" last /></Panel> : null}
    </Screen>
  );
}
