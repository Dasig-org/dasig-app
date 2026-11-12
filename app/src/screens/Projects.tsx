import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { ContextPill } from "@/ui/Context";
import { Eyebrow, Field, IconCircle, Notice, Panel, Row, Screen, Skeleton, Title } from "@/ui/kit";

/** Projects: the current group's (or your own) projects. Coming up first, then undated, then finished; search past six. */
export default function Projects({ tab }: { tab?: boolean } = {}) {
  const s = useSession();
  const [find, setFind] = useState("");
  const { data, error } = useLoad(async () => (s.current ? bix.search("Initiative", { organization: `Organization/${s.current.id}` }) : s.person ? bix.search("Initiative", { person: `Person/${s.person.id}` }) : []), [s.current?.id, s.person?.id]);
  const q = find.trim().toLowerCase();
  const all = (data ?? []).filter((p) => p.kind !== "session" && p.status !== "cancelled" && (!q || `${p.title} ${p.description ?? ""}`.toLowerCase().includes(q)));
  const done = (p: R) => p.status === "completed" || (p.period?.start && Date.parse(p.period.start) < Date.now() - 2 * 86400000);
  const soon = all.filter((p) => !done(p) && p.period?.start).sort((a, b) => a.period.start.localeCompare(b.period.start));
  const undated = all.filter((p) => !done(p) && !p.period?.start);
  const past = all.filter(done).sort((a, b) => (b.period?.start ?? "").localeCompare(a.period?.start ?? ""));
  const when = (p: R) => p.period?.start ? new Date(p.period.start).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : undefined;
  const list = (title: string, ps: R[], last?: boolean) => ps.length ? <><Eyebrow right={`${ps.length}`}>{title}</Eyebrow><Panel>
    {ps.map((p, i) => <Row key={p.id} left={<IconCircle name={done(p) ? "check" : "flag"} />} title={p.title} meta={when(p) ?? p.description} onPress={() => router.push(`/project/${p.id}`)} last={i === ps.length - 1 && !last} />)}
    {last ? <Row left={<IconCircle name="plus" tone="grey" />} title="New event" onPress={() => router.push((s.current ? { pathname: "/new-project", params: { org: s.current.id } } : "/new-project") as never)} last /> : null}
  </Panel></> : null;
  return (
    <Screen back={!tab}>
      <ContextPill /><View style={{ height: 14 }} />
      <Title sub={s.current?.name ?? "Your own projects"}>Projects</Title>
      {error ? <Notice>{error}</Notice> : null}
      {(data ?? []).length > 6 ? <Field icon="search" value={find} onChangeText={setFind} placeholder="Find a project" /> : null}
      {!data ? <Skeleton /> : <>
        {list("Coming up", soon, true)}
        {!soon.length ? <Panel><Row left={<IconCircle name="plus" tone="grey" />} title="New event" meta={q ? `Nothing matches "${find}"` : "Nothing coming up yet"} onPress={() => router.push((s.current ? { pathname: "/new-project", params: { org: s.current.id } } : "/new-project") as never)} last /></Panel> : null}
        {list("No date yet", undated)}
        {list("Done", past)}
      </>}
    </Screen>
  );
}
