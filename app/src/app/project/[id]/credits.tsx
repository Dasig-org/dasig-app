import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useLoad } from "@/lib/use";
import { teamIcon } from "@/lib/work";
import { Faces, IconCircle, Meta, Panel, Row, Screen, Title , Skeleton} from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** Credits, like a WordPress release's: everyone who did confirmed work, by team; leads and volunteers together; named as each chose. */
export default function Credits() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useLoad(async () => {
    const [p, tasks, teams] = await Promise.all([bix.get("Initiative", id), bix.search("Task", { partOf: `Initiative/${id}` }), bix.search("Team", { initiative: `Initiative/${id}` })]);
    const done = tasks.filter((x) => x.status === "completed" && x.verification !== "pending");
    const refs = new Set<string>(done.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)));
    const people: Record<string, R> = {};
    for (const r of refs) { try { people[r] = await bix.get("Person", r.split("/")[1]!); } catch {} }
    return { p, done, teams, people };
  }, [id]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { p, done, teams, people } = data;
  const shown = (r: string) => { const x = people[r]; if (!x || x.credit === "anonymous") return null; return x.credit === "full" ? ((x.extension ?? []).find((e: any) => e.url === "bayanihan:full-name")?.value ?? x.name?.text) : x.name?.text; };
  const all = new Set<string>(); let anon = 0;
  const rows = teams.map((tm) => {
    const refs = new Set<string>(done.filter((x) => x.team?.reference === `Team/${tm.id}`).flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)));
    const leads = new Set((tm.participant ?? []).filter((y: any) => y.role === "lead").map((y: any) => y.person.reference));
    refs.forEach((r) => all.add(r));
    const names = [...refs].map((r) => { const n = shown(r); if (!n) return null; return leads.has(r) ? `${n} (lead)` : n; }).filter(Boolean) as string[];
    return { tm, names, count: refs.size };
  }).filter((x) => x.count);
  all.forEach((r) => { if (!shown(r)) anon++; });
  return (
    <Screen back>
      <Title sub={`${all.size} ${all.size === 1 ? "person" : "people"} made it happen`}>{p.title}</Title>
      <Panel>{rows.map((x, i) => <Row key={x.tm.id} left={<IconCircle name={teamIcon(x.tm.name)} />} title={x.tm.name} meta={x.names.join(", ") || "Anonymous helpers"} right={<View style={{ width: 70, alignItems: "flex-end" }}><Faces names={x.names} /></View>} last={i === rows.length - 1} />)}
        {!rows.length ? <Row title="No finished work yet" meta="Credits fill in as work is done" last /> : null}</Panel>
      {anon ? <Text style={[t.meta, { marginTop: 10, marginHorizontal: 6 }]}>{`${anon} helper${anon === 1 ? "" : "s"} chose to stay anonymous. Thank you, too.`}</Text> : null}
      <Text style={[t.meta, { marginTop: 10, marginHorizontal: 6 }]}>Counted from finished work. Names follow each person's choice.</Text>
    </Screen>
  );
}
