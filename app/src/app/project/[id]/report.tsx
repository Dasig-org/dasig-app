import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { taskHours } from "@bayanihan/core/figures";
import { bix, type R } from "@/lib/bix";
import { short } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { peopleFor, personName } from "@/lib/work";
import { Buttons, Check, Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Primary, Row, Screen, Skeleton, Title, usePhoto } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";

/*
 * The event report (workspace/design/report-sketches.html R1–R4), a BIX Report. Figures are counted from signed work,
 * never typed; the summary is drafted for the coordinator to edit; she picks photos by milestone and task; she chooses
 * who it's for; sending creates the Report as submitted (signed by the group) and shares it.
 */
type A = { hash: string; contentType: string; showsMinors?: boolean; title?: string };
const AUDIENCES = [
  { code: "district", label: "The district or chapter", shows: "Figures, what each team did, partners" },
  { code: "sponsor", label: "A sponsor or partner", shows: "Their contribution first, and photos" },
  { code: "lgu", label: "The barangay or LGU", shows: "Figures, permits, people served" },
  { code: "public", label: "Your members and the public", shows: "Photos and thanks" },
];

function Thumb({ a, on, onPress }: { a: A; on: boolean; onPress: () => void }) {
  const uri = usePhoto(a);
  return <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ width: 86, height: 86, borderRadius: radius.inner, overflow: "hidden", backgroundColor: c.sand, borderWidth: 3, borderColor: on ? c.accent : "transparent" }}>
    {uri ? <Image source={{ uri }} style={{ width: "100%", height: "100%" }} /> : null}</Pressable>;
}

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState<string | null>(null);
  const [served, setServed] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [audience, setAudience] = useState("district");
  const [names, setNames] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState<R | null>(null);
  const { data, reload } = useLoad(async () => {
    const [p, teams, tasks, needs] = await Promise.all([bix.get("Initiative", id), bix.search("Team", { initiative: `Initiative/${id}` }), bix.search("Task", { partOf: `Initiative/${id}` }), bix.search("Need", { initiative: `Initiative/${id}` })]);
    const live = tasks.filter((x) => !["draft", "cancelled"].includes(x.status));
    const reports = p.organization ? (await bix.search("Report", { owedBy: p.organization.reference }).catch(() => [])).filter((r) => (r.scope?.initiative ?? []).some((x: any) => x.reference === `Initiative/${id}`)) : [];
    return { p, teams, tasks: live, needs, reports, folks: await peopleFor(live.flatMap((x) => ((x.participant ?? []) as any[]).filter((y) => y.status === "active").map((y) => y.person.reference)), 60) };
  }, [id]);
  useEffect(() => { if (data && !picked.size) setPicked(new Set(photosOf(data.tasks).slice(0, 3).map((x) => x.a.hash))); }, [data?.tasks.length]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { p, teams, tasks, needs, folks, reports } = data;
  const done = tasks.filter((x) => x.status === "completed");
  const people = new Set(done.flatMap((x) => ((x.participant ?? []) as any[]).filter((y) => y.status === "active").map((y) => y.person.reference)));
  const hours = Math.round(done.reduce((h, x) => h + taskHours(x), 0) * 10) / 10;
  const servedOut = done.flatMap((x) => ((x.output ?? []) as any[]).filter((o) => o.code?.code === "people-served").map((o) => ({ task: x, value: Number(o.value) })))[0];
  const notDone = tasks.filter((x) => x.status !== "completed");
  const met = needs.filter((n) => n.status === "met" || n.status === "partially-met");
  const teamName = (x: R) => teams.find((tm) => `Team/${tm.id}` === x.team?.reference)?.name ?? "";
  const byTeam = teams.map((tm) => ({ tm, work: done.filter((x) => x.team?.reference === `Team/${tm.id}`) })).filter((x) => x.work.length);
  const draft = `On ${p.period?.start ? new Date(p.period.start).toLocaleDateString(undefined, { day: "numeric", month: "long" }) : "the day"}, ${people.size} volunteer${people.size === 1 ? "" : "s"} gave ${hours} hours for ${p.title}${servedOut ? `, serving ${servedOut.value} people` : ""}. `
    + byTeam.map((x) => `${x.tm.name}: ${x.work.map((w) => w.title.toLowerCase()).join(", ")}.`).join(" ");
  const text = summary ?? draft;
  const photos = photosOf(tasks);
  const credited = [...people].map((r) => folks[r]).filter((q) => q && q.credit !== "anonymous").map((q) => personName(q));

  const recordServed = async () => {
    const n = Number(served); if (!(n > 0)) return;
    const target = [...done].sort((a, b) => (b.due ?? "").localeCompare(a.due ?? ""))[0]; if (!target) { setMsg("Mark at least one task done first."); return; }
    try { await bix.commit(bix.next(target, { output: [...((target.output ?? []) as any[]).filter((o) => o.code?.code !== "people-served"), { code: { system: "bayanihan:report-figure", code: "people-served" }, value: n, unit: "people" }] })); setServed(""); reload(); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  const send = async () => {
    if (!p.organization) return;
    setBusy(true); setMsg(null);
    const fig = (code: string, value: number, rule: Record<string, unknown>, unit?: string) => ({ code: { system: "bayanihan:report-figure", code }, value, ...(unit ? { unit } : {}), rule, derivedFrom: done.map((x) => ({ reference: `Task/${x.id}` })) });
    try {
      const r = bix.create("Report", { owedBy: p.organization, owedTo: p.organization, status: "submitted", submittedBy: { reference: me },
        period: { start: p.period?.start ?? new Date().toISOString(), end: p.period?.end ?? new Date().toISOString() }, scope: { initiative: [{ reference: `Initiative/${id}` }] },
        figures: [fig("volunteers-active", people.size, { code: "count-participants" }), fig("volunteer-hours", hours, { code: "sum-task-hours" }, "h"), ...(servedOut ? [fig("people-served", servedOut.value, { code: "sum-task-output", params: { outputCode: "people-served" } })] : [])],
        narrative: text.trim(), attachment: photos.filter((x) => picked.has(x.a.hash)).map((x) => x.a),
        extension: [{ url: "bayanihan:report-audience", value: audience }, { url: "bayanihan:report-names", value: names }],
        ...(reports[0] ? { replaces: { reference: `Report/${reports[0].id}` } } : {}) });
      await bix.commit(r); setSent(r);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const shareText = `${p.title}: how it went\n${people.size} volunteers · ${hours} hours${servedOut ? ` · ${servedOut.value} people served` : ""}\n\n${text.trim()}${names && credited.length ? `\n\nWith thanks to ${credited.join(", ")}.` : ""}\n\nSigned by ${s.current?.name ?? "the group"} → ${appUrl()}/project/${id}`;

  const tile = (big: string, small: string) => <View style={{ flex: 1, backgroundColor: c.white, borderRadius: radius.panel, padding: 14 }}><Text style={[t.title, { fontSize: 22 }]}>{big}</Text><Meta>{small}</Meta></View>;
  const figures = <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>{tile(`${people.size}`, "volunteers")}{tile(`${hours} h`, "given")}{tile(servedOut ? `${servedOut.value}` : `${done.length} of ${tasks.length}`, servedOut ? "people served" : "done")}</View>;

  if (sent) return (
    <Screen back>
      <Title sub={`Signed by ${s.current?.name ?? "your group"}. Anyone can check it hasn't changed.`}>Report sent</Title>
      {figures}
      <Buttons><Primary label="Share it" onPress={() => Share.share({ message: shareText }).catch(() => {})} /></Buttons>
      <View style={{ marginTop: 10 }}><Panel><Row left={<IconCircle name="flag" />} title="Back to the event" onPress={() => router.replace(`/project/${id}`)} last /></Panel></View>
      <Meta>{"\nA public report page and a PDF are coming. A correction is a new report that replaces this one."}</Meta>
    </Screen>
  );

  if (step === 1) return (
    <Screen back>
      <Meta>{reports.length ? `Sent ${short((reports[0]!.meta as any)?.lastUpdated)} · this would replace it` : "Draft · not sent"}</Meta>
      <Title sub="Written from what your teams did. Check it, then send.">{`How ${p.title} went`}</Title>
      {figures}
      {notDone.length || !servedOut ? <><Eyebrow>Before you send</Eyebrow><Panel>
        {notDone.slice(0, 3).map((x) => <Row key={x.id} left={<IconCircle name="pending" tone="grey" />} title={x.title} meta={`${teamName(x)} · not marked done`} onPress={() => router.push(`/task/${x.id}`)} />)}
        {!servedOut ? <View style={{ paddingVertical: 10 }}><Text style={t.row}>How many people did you serve?</Text><Meta>Runners, households, learners. A count, never names.</Meta>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><View style={{ flex: 1 }}><Field value={served} onChangeText={setServed} keyboardType="numeric" placeholder="e.g. 400" /></View><Outline label="Add" onPress={recordServed} /></View></View> : null}
      </Panel></> : null}
      <Eyebrow>Summary</Eyebrow>
      <Field value={text} onChangeText={setSummary} multiline />
      <Eyebrow right={`${picked.size} chosen`}>Photos</Eyebrow>
      {photos.length ? groups(photos).map((g) => <View key={g.task.id} style={{ marginBottom: 10 }}>
        <Text style={[t.meta, { marginHorizontal: 4, marginBottom: 6 }]}>{`${g.task.milestone ? "Milestone · " : ""}${g.task.title}`}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {g.items.map((x) => <Thumb key={x.a.hash} a={x.a} on={picked.has(x.a.hash)} onPress={() => setPicked((s0) => { const n = new Set(s0); n.has(x.a.hash) ? n.delete(x.a.hash) : n.add(x.a.hash); return n; })} />)}
        </ScrollView></View>)
        : <Meta>No photos yet. Add results on the tasks, and they'll show here grouped by milestone.</Meta>}
      {msg ? <Notice>{msg}</Notice> : null}
      <Buttons><Primary label="Next: who it's for" onPress={() => setStep(2)} disabled={!done.length} /></Buttons>
    </Screen>
  );

  return (
    <Screen back>
      <Title sub="Each version shows what that reader needs.">Who is this report for?</Title>
      <Panel>{AUDIENCES.map((x, i) => <Row key={x.code} left={<Check on={audience === x.code} onPress={() => setAudience(x.code)} />} title={x.label} meta={x.shows} onPress={() => setAudience(x.code)} last={i === AUDIENCES.length - 1} />)}</Panel>
      <Eyebrow>This version shows</Eyebrow>
      <Panel>
        <Row left={<Check on />} title="Figures and what each team did" />
        {met.length ? <Row left={<Check on />} title="Needs met" meta={met.map((x) => x.category?.display).filter(Boolean).join(", ")} /> : null}
        <Row left={<Check on={picked.size > 0} />} title={`${picked.size} photo${picked.size === 1 ? "" : "s"}`} meta="Never photos marked as showing children" onPress={() => setStep(1)} />
        <Row left={<Check on={names} onPress={() => setNames(!names)} />} title="Volunteers' names" meta={names ? `${credited.length} who allow it` : `Off: shows “${people.size} volunteers”`} last />
      </Panel>
      <View style={{ backgroundColor: c.sand, borderRadius: radius.panel, padding: 14, marginTop: 12, flexDirection: "row", gap: 12, alignItems: "center" }}><IconCircle name="lock" tone="white" />
        <View style={{ flex: 1 }}><Text style={t.row}>Signed when you send</Text><Meta>A correction is a new version that replaces this one.</Meta></View></View>
      {msg ? <Notice>{msg}</Notice> : null}
      <Buttons><Primary label="Send the report" onPress={send} busy={busy} /></Buttons>
      <View style={{ alignItems: "center", marginTop: 8 }}><Outline label="Back" onPress={() => setStep(1)} /></View>
    </Screen>
  );
}

/** Result photos from the event's tasks, never ones showing children; milestones first. */
function photosOf(tasks: R[]) {
  return [...tasks].sort((a, b) => Number(!!b.milestone) - Number(!!a.milestone)).flatMap((x) => ((x.output ?? []) as any[]).flatMap((o) => o.attachment ?? [])
    .filter((a: A) => a.contentType?.startsWith("image/") && !a.showsMinors).map((a: A) => ({ task: x, a })));
}
function groups(xs: ReturnType<typeof photosOf>) {
  const m = new Map<string, { task: R; items: typeof xs }>();
  for (const x of xs) { const g = m.get(x.task.id) ?? { task: x.task, items: [] as typeof xs }; g.items.push(x); m.set(x.task.id, g); }
  return [...m.values()];
}
