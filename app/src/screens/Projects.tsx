import { useState } from "react";
import { ErrorState } from "@/ui/ErrorState";
import { router } from "expo-router";
import { View, Image, Pressable, Text } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad, useNow } from "@/lib/use";
import { ContextPill } from "@/ui/Context";
import { Eyebrow, Field, IconCircle, Panel, Row, Screen, Skeleton, Title, usePhoto } from "@/ui/kit";
import { places } from "@/lib/work";
import { ProgressRing, SharedCover, StateChip } from "@/ui/m3";
import { c, tone, type as t } from "@/ui/theme";

/**
 * A project coming up, as a card (review 2026-11-15: plain rows said nothing at a glance): its cover (or a tinted
 * header), the title, the date and how long to go, and the plan's state: a ring of done steps, late, open places.
 */
function ProjectCard({ p, tasks, onPress }: { p: R; tasks: R[]; onPress: () => void }) {
  const img = usePhoto(p.image);
  const [now] = useState(() => Date.now());
  const live = tasks.filter((k) => k.status !== "draft" && k.status !== "cancelled");
  const done = live.filter((k) => k.status === "completed").length;
  const late = live.filter((k) => k.status !== "completed" && k.due && Date.parse(k.due) < now).length;
  const open = live.reduce((n, k) => n + places(k).left, 0);
  const d = p.period?.start ? Math.round((new Date(p.period.start).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400000) : null;
  const when = p.period?.start ? new Date(p.period.start).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "No date yet";
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${p.title}, ${when}`} style={({ pressed }) => ({ marginTop: 12, borderRadius: 24, overflow: "hidden", backgroundColor: c.white, opacity: pressed ? 0.92 : 1 })}>
    <SharedCover id={p.id} style={{ height: 96, backgroundColor: tone.primaryContainer, alignItems: "center", justifyContent: "center" }}>
      {img ? <Image source={{ uri: img }} resizeMode="cover" style={{ width: "100%", height: "100%" }} /> : <IconCircle name="flag" size={48} tone="white" />}
    </SharedCover>
    <View style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <View style={{ flex: 1 }}>
        <Text style={[t.row, { fontSize: 17 }]} numberOfLines={2}>{p.title}</Text>
        <Text style={[t.meta, { marginTop: 2 }]}>{[when, d === null ? null : d > 1 ? `in ${d} days` : d === 1 ? "tomorrow" : d === 0 ? "today" : null].filter(Boolean).join(" · ")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {late ? <StateChip kind="late">{`${late} late`}</StateChip> : null}
          {open ? <StateChip kind="open">{`${open} open`}</StateChip> : null}
          {!live.length ? <StateChip kind="open">No work yet</StateChip> : !late && !open ? <StateChip kind="done">On track</StateChip> : null}
        </View>
      </View>
      {live.length ? <ProgressRing value={done / live.length} size={52} label={`${done}/${live.length}`} /> : null}
    </View>
  </Pressable>;
}

/** Projects: the current group's (or your own) projects. Coming up first, then undated, then finished; search past six. */
export default function Projects({ tab }: { tab?: boolean } = {}) {
  const now = useNow();
  const s = useSession();
  const [find, setFind] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const { data, error } = useLoad(async () => (s.current ? bix.search("Initiative", { organization: `Organization/${s.current.id}` }) : s.person ? bix.search("Initiative", { person: `Person/${s.person.id}` }) : []), [s.current?.id, s.person?.id]);
  // The steps of the projects shown as cards (coming up, no date yet), for their ring and chips.
  const { data: steps } = useLoad(async () => {
    const live = (data ?? []).filter((p) => p.status !== "cancelled" && p.status !== "completed").slice(0, 8);
    const out: Record<string, R[]> = {};
    await Promise.all(live.map(async (p) => { out[p.id] = await bix.search("Task", { partOf: `Initiative/${p.id}` }).catch(() => [] as R[]); }));
    return out;
  }, [data?.length, s.current?.id]);
  const q = find.trim().toLowerCase();
  const matches = (p: R) => p.kind !== "session" && (!q || `${p.title} ${p.description ?? ""}`.toLowerCase().includes(q));
  const all = (data ?? []).filter((p) => p.status !== "cancelled" && matches(p));
  // Cancelled projects (14 Nov): kept in BIX with their history; listed last, folded, so they can be found and opened.
  const cancelled = (data ?? []).filter((p) => p.status === "cancelled" && matches(p)).sort((a, b) => String((b.meta as any)?.lastUpdated ?? "").localeCompare(String((a.meta as any)?.lastUpdated ?? "")));
  const done = (p: R) => p.status === "completed" || (p.period?.start && Date.parse(p.period.start) < now - 2 * 86400000);
  const soon = all.filter((p) => !done(p) && p.period?.start).sort((a, b) => a.period.start.localeCompare(b.period.start));
  const undated = all.filter((p) => !done(p) && !p.period?.start);
  const past = all.filter(done).sort((a, b) => (b.period?.start ?? "").localeCompare(a.period?.start ?? ""));
  const when = (p: R) => p.period?.start ? new Date(p.period.start).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : undefined;
  const cards = (title: string, ps: R[]) => ps.length ? <><Eyebrow right={`${ps.length}`}>{title}</Eyebrow>
    {ps.map((p) => <ProjectCard key={p.id} p={p} tasks={steps?.[p.id] ?? []} onPress={() => router.push(`/project/${p.id}`)} />)}</> : null;
  const newEvent = <View style={{ marginTop: 12 }}><Panel><Row left={<IconCircle name="plus" tone="grey" />} title="New event" meta={q ? `Nothing matches "${find}"` : soon.length ? undefined : "Nothing coming up yet"}
    onPress={() => router.push((s.current ? { pathname: "/new-project", params: { org: s.current.id } } : "/new-project") as never)} last /></Panel></View>;
  const list = (title: string, ps: R[], last?: boolean) => ps.length ? <><Eyebrow right={`${ps.length}`}>{title}</Eyebrow><Panel>
    {ps.map((p, i) => <Row key={p.id} left={<IconCircle name={done(p) ? "check" : "flag"} />} title={p.title} meta={when(p) ?? p.description} onPress={() => router.push(`/project/${p.id}`)} last={i === ps.length - 1 && !last} />)}
    {last ? <Row left={<IconCircle name="plus" tone="grey" />} title="New event" onPress={() => router.push((s.current ? { pathname: "/new-project", params: { org: s.current.id } } : "/new-project") as never)} last /> : null}
  </Panel></> : null;
  return (
    <Screen back={!tab}>
      <ContextPill /><View style={{ height: 14 }} />
      <Title sub={s.current?.name ?? "Your own projects"}>Projects</Title>
      {error ? <ErrorState message={error} /> : null}
      {(data ?? []).length > 6 ? <Field icon="search" value={find} onChangeText={setFind} placeholder="Find a project" /> : null}
      {!data ? <Skeleton /> : <>
        {cards("Coming up", soon)}
        {newEvent}
        {cards("No date yet", undated)}
        {list("Done", past)}
        {cancelled.length ? <>
          <Eyebrow right={`${cancelled.length}`}>Cancelled</Eyebrow>
          <Panel>
            {showCancelled ? cancelled.map((p, i) => <Row key={p.id} left={<IconCircle name="pending" tone="grey" />} title={p.title} meta={[when(p), "Cancelled"].filter(Boolean).join(" · ")} onPress={() => router.push(`/project/${p.id}`)} last={i === cancelled.length - 1} />)
              : <Row left={<IconCircle name="pending" tone="grey" />} title={`Show ${cancelled.length} cancelled project${cancelled.length === 1 ? "" : "s"}`} meta="Kept with their history" onPress={() => setShowCancelled(true)} last />}
          </Panel></> : null}
      </>}
    </Screen>
  );
}
