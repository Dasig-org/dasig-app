import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, Share, Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { short } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { fileUri } from "@/lib/files";
import { exportPdf } from "@/lib/pdf";
import { buildReport, reportHtml, shareOf, type Photo } from "@/lib/report";
import { useSession } from "@/lib/session";
import { useLoad, useNow } from "@/lib/use";
import { peopleFor, personName } from "@/lib/work";
import { Logo } from "@/ui/Context";
import { Body, Buttons, Check, Eyebrow, Field, IconCircle, Meta, Outline, Panel, Pill, Primary, Row, Screen, Skeleton, usePhoto } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";
import { useSnackbar } from "@/ui/Snackbar";

/*
 * The project report, a BIX Report (lib/report.ts has what it borrows from Rotary and JCI). At any time it says where
 * the project stands; after the day, how it went: figures next to what was planned, each team's progress, what's
 * still to do, needs and what was given, photos, documents, and what the group learned. Figures are counted from
 * recorded work, never typed; the summary is drafted for the coordinator to change; she picks the photos; it saves as
 * a PDF. Sending it (once something is done) creates the Report as submitted, signed by the group.
 */
const AUDIENCES = [
  { code: "district", label: "The district or chapter", shows: "Figures, what each team did, partners" },
  { code: "sponsor", label: "A sponsor or partner", shows: "Their contribution first, and photos" },
  { code: "lgu", label: "The barangay or LGU", shows: "Figures, permits, people served" },
  { code: "public", label: "Your members and the public", shows: "Photos and thanks" },
];

function Thumb({ a, on, onPress }: { a: Photo; on: boolean; onPress: () => void }) {
  const uri = usePhoto(a);
  return <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={a.title ?? "Photo"} style={{ width: "31.5%", aspectRatio: 1, borderRadius: radius.inner, overflow: "hidden", backgroundColor: c.sand, borderWidth: 3, borderColor: on ? c.accent : "transparent" }}>
    {uri ? <Image source={{ uri }} style={{ width: "100%", height: "100%" }} /> : null}</Pressable>;
}
const Bar = ({ share }: { share: number }) => <View style={{ height: 7, borderRadius: 4, backgroundColor: c.s200, overflow: "hidden", marginTop: 8 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: share }}>
  <View style={{ height: 7, width: `${share}%`, borderRadius: 4, backgroundColor: c.accent }} /></View>;

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const now = useNow();
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState<string | null>(null);
  const [lessons, setLessons] = useState("");
  const [served, setServed] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [audience, setAudience] = useState("district");
  const [names, setNames] = useState(false);
  const [busy, setBusy] = useState<"send" | "pdf" | null>(null);
  const { show } = useSnackbar();
  const [sent, setSent] = useState<R | null>(null);
  const { data, reload } = useLoad(async () => {
    const [p, teams, tasks, needs] = await Promise.all([bix.get("Initiative", id), bix.search("Team", { initiative: `Initiative/${id}` }), bix.search("Task", { partOf: `Initiative/${id}` }), bix.search("Need", { initiative: `Initiative/${id}` })]);
    const orgId = p.organization?.reference?.split("/")[1];
    const [org, reports, offers, partners] = await Promise.all([
      orgId ? bix.get("Organization", orgId).catch(() => null) : null,
      p.organization ? bix.search("Report", { owedBy: p.organization.reference }).then((rs) => rs.filter((r) => (r.scope?.initiative ?? []).some((x: any) => x.reference === `Initiative/${id}`))).catch(() => [] as R[]) : [] as R[],
      Promise.all(needs.slice(0, 12).map((n) => bix.search("Offer", { matchedTo: `Need/${n.id}` }).catch(() => [] as R[]))).then((x) => x.flat()),
      Promise.all(((p.partner ?? []) as { reference: string }[]).slice(0, 8).map((x) => bix.get("Organization", x.reference.split("/")[1]!).catch(() => null))).then((x) => x.filter(Boolean) as R[]),
    ]);
    const refs = [...tasks.flatMap((x) => ((x.participant ?? []) as any[]).filter((y) => y.status === "active").map((y) => y.person.reference)), ...[p, ...tasks].flatMap((x) => ((x.note ?? []) as any[]).map((n) => n.author?.reference).filter(Boolean)),
      ...teams.flatMap((tm) => ((tm.participant ?? []) as any[]).filter((y) => y.role === "lead").map((y) => y.person.reference)), ...offers.map((o) => o.offeredBy?.reference).filter((r) => r?.startsWith("Person/"))];
    return { p, org, teams, tasks, needs, offers, partners, reports, folks: await peopleFor(refs, 80) };
  }, [id]);
  // The first six photos start picked, once the steps have loaded (and again if their number changes while none are picked).
  const [pickedFor, setPickedFor] = useState<number | null>(null);
  if (data && data.tasks.length !== pickedFor) { setPickedFor(data.tasks.length); if (!picked.size) setPicked(new Set(buildReport({ project: data.p, teams: data.teams, tasks: data.tasks, needs: [], people: {}, now }).photos.slice(0, 6).map((x) => x.a.hash))); }
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { p, org, teams, tasks, needs, offers, partners, folks, reports } = data;
  const m = buildReport({ project: p, org, teams, tasks, needs, offers, partners, people: folks, now });
  const done = tasks.filter((x) => x.status === "completed" && !["draft", "cancelled"].includes(x.status));
  const text = summary ?? m.draft;
  const fig = (code: string) => m.figures.find((f) => f.code === code);
  const volunteers = fig("volunteers-active")?.value ?? 0, hours = fig("volunteer-hours")?.value ?? 0, servedN = fig("people-served")?.value ?? 0;
  const chosen = m.photos.filter((x) => picked.has(x.a.hash));
  const title = m.state === "finished" ? `How ${p.title} went` : `${p.title}: where it stands`;

  const recordServed = async () => {
    const n = Number(served); if (!(n > 0)) return;
    const target = [...done].sort((a, b) => (b.due ?? "").localeCompare(a.due ?? ""))[0]; if (!target) { show("Mark at least one step done first."); return; }
    try { await bix.commit(bix.next(target, { output: [...((target.output ?? []) as any[]).filter((o) => o.code?.code !== "people-served"), { code: { system: "bayanihan:report-figure", code: "people-served" }, value: n, unit: "people" }] })); setServed(""); reload(); }
    catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); }
  };
  const pdf = async () => {
    setBusy("pdf");
    try {
      // Photos go inside the page itself (at most 12), so the PDF needs nothing else to open.
      const photos = (await Promise.all(chosen.slice(0, 12).map(async (x) => { try { return { src: await fileUri(x.a as never), caption: x.caption, team: x.team }; } catch { return null; } }))).filter(Boolean) as { src: string; caption: string; team: string }[];
      const logo = org?.image?.hash ? await fileUri(org.image as never).catch(() => undefined) : undefined;
      await exportPdf(reportHtml(m, { summary: text, lessons, names, photos, logo, preparedBy: personName(s.person) }), `${p.title} report`);
    } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); } finally { setBusy(null); }
  };
  const send = async () => {
    if (!p.organization) return;
    setBusy("send");
    const figure = (code: string, value: number, rule: Record<string, unknown>, unit?: string) => ({ code: { system: "bayanihan:report-figure", code }, value, ...(unit ? { unit } : {}), rule, derivedFrom: done.map((x) => ({ reference: `Task/${x.id}` })) });
    try {
      const r = bix.create("Report", { owedBy: p.organization, owedTo: p.organization, status: "submitted", submittedBy: { reference: me },
        period: { start: p.period?.start ?? new Date().toISOString(), end: p.period?.end ?? new Date().toISOString() }, scope: { initiative: [{ reference: `Initiative/${id}` }] },
        figures: [figure("volunteers-active", volunteers, { code: "count-participants" }), figure("volunteer-hours", hours, { code: "sum-task-hours" }, "h"), ...(servedN ? [figure("people-served", servedN, { code: "sum-task-output", params: { outputCode: "people-served" } })] : [])],
        narrative: text.trim(), attachment: chosen.map((x) => x.a),
        extension: [{ url: "bayanihan:report-audience", value: audience }, { url: "bayanihan:report-names", value: names }, ...(lessons.trim() ? [{ url: "bayanihan:report-lessons", value: lessons.trim() }] : [])],
        ...(reports[0] ? { replaces: { reference: `Report/${reports[0].id}` } } : {}) });
      await bix.commit(r); setSent(r);
    } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); } finally { setBusy(null); }
  };
  const credited = m.credits.flatMap((x) => x.names);
  const shareText = `${title}\n${volunteers} volunteers · ${hours} hours${servedN ? ` · ${servedN} people served` : ""} · ${m.steps.done} of ${m.steps.total} steps done\n\n${text.trim()}${names && credited.length ? `\n\nWith thanks to ${[...new Set(credited)].join(", ")}.` : ""}\n\n${s.current?.name ?? "The group"} → ${appUrl()}/project/${id}`;

  const tile = (big: string, small: string, planned?: number, value = 0, flag?: string) => <View key={small} style={{ width: "48.5%", backgroundColor: c.white, borderRadius: radius.panel, padding: 14 }}>
    <Text style={[t.title, { fontSize: 24 }]}>{big}</Text><Meta>{small}{planned ? ` · planned ${planned}` : ""}</Meta>
    {flag ? <Text style={{ fontSize: 12, fontWeight: "700", color: "#B3261E", marginTop: 2 }}>{flag}</Text> : null}
    {planned ? <Bar share={shareOf(value, planned)} /> : null}</View>;
  const figures = <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12, justifyContent: "space-between" }}>
    {m.figures.map((f) => tile(`${f.value}${f.unit ? ` ${f.unit}` : ""}`, f.label, f.planned, f.value))}
    {tile(`${m.steps.done} of ${m.steps.total}`, "steps done", m.steps.total || undefined, m.steps.done, m.steps.late ? `${m.steps.late} late` : undefined)}</View>;
  const exportButtons = <Buttons><Primary label="Save as PDF" busy={busy === "pdf"} onPress={pdf} /><Outline flex label="Share" onPress={() => Share.share({ message: shareText }).catch(() => {})} /></Buttons>;

  if (sent) return (
    <Screen back>
      <Text style={t.title}>Report sent</Text>
      <Meta>{`Signed by ${s.current?.name ?? "your group"}. Anyone can check it hasn't changed.`}</Meta>
      {figures}
      {exportButtons}
      <View style={{ marginTop: 10 }}><Panel><Row left={<IconCircle name="flag" />} title="Back to the project" onPress={() => router.replace(`/project/${id}`)} last /></Panel></View>
      <Meta>{"\nA correction is a new report that replaces this one."}</Meta>
    </Screen>
  );

  if (step === 1) return (
    <Screen back onRefresh={reload}>
      {/* Cover: whose it is, what, when and where, and where it stands. */}
      <View style={{ backgroundColor: c.white, borderRadius: radius.panel, padding: 16 }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>{org ? <Logo name={org.name ?? "?"} image={org.image} size={36} /> : null}
          <Text style={[t.eyebrow, { flex: 1 }]} numberOfLines={1}>{`${m.group || "Project"} · ${m.state === "finished" ? "Project report" : "Status report"}`}</Text></View>
        <Text style={[t.title, { marginTop: 10 }]}>{title}</Text>
        {m.when || m.place ? <Meta>{[m.when, m.place].filter(Boolean).join(" · ")}</Meta> : null}
        <View style={{ flexDirection: "row", marginTop: 10 }}><Pill tone={m.state === "finished" ? "ok" : "state"}>{m.stateLabel}</Pill></View>
        <Meta>{`\nAs of today · ${reports.length ? `last sent ${short((reports[0]!.meta as any)?.lastUpdated)}` : "not sent yet"}`}</Meta>
      </View>
      {figures}
      {exportButtons}
      {!servedN && done.length ? <View style={{ marginTop: 12 }}><Panel><View style={{ paddingVertical: 10 }}><Text style={t.row}>How many people did you serve?</Text><Meta>Runners, households, learners. A count, never names.</Meta>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><View style={{ flex: 1 }}><Field value={served} onChangeText={setServed} keyboardType="numeric" placeholder="e.g. 400" /></View><Outline label="Add" onPress={recordServed} /></View></View></Panel></View> : null}

      <Eyebrow>Summary</Eyebrow>
      <Field value={text} onChangeText={setSummary} multiline accessibilityLabel="Summary" />
      {m.about ? <><Eyebrow>What it&apos;s for</Eyebrow><Panel><View style={{ paddingVertical: 12 }}><Body>{m.about}</Body></View></Panel></> : null}

      {m.teams.length ? <><Eyebrow>Progress by team</Eyebrow><Panel>{m.teams.map((x, i) => <View key={x.id} style={{ paddingVertical: 12, borderBottomWidth: i === m.teams.length - 1 ? 0 : 1, borderBottomColor: c.s200 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text style={[t.row, { flex: 1 }]}>{x.name}</Text><Text style={t.meta}>{`${x.done} of ${x.total}`}</Text></View>
        <Bar share={shareOf(x.done, x.total)} />
        <Meta>{[x.lead ? `Led by ${x.lead}` : "No lead yet", x.did.length ? x.did.slice(0, 3).join(", ") + (x.did.length > 3 ? ` and ${x.did.length - 3} more` : "") : null].filter(Boolean).join(" · ")}</Meta></View>)}</Panel></> : null}

      {m.open.length ? <><Eyebrow right={`${m.open.length}`}>{m.state === "finished" ? "Left undone" : "Still to do"}</Eyebrow><Panel>
        {m.open.slice(0, 5).map((x, i, list) => <Row key={x.id} left={<IconCircle name={x.late ? "clock" : "pending"} tone="grey" />} title={x.title} meta={[x.team, x.who || "nobody yet"].filter(Boolean).join(" · ")}
          right={x.due ? <Pill tone={x.late ? "state" : "neutral"}>{x.late ? `Late · ${short(x.due)}` : short(x.due)}</Pill> : undefined} onPress={() => router.push(`/task/${x.id}`)} last={i === list.length - 1 && m.open.length <= 5} />)}
        {m.open.length > 5 ? <Row title={`and ${m.open.length - 5} more`} meta="All of them are in the PDF" last /> : null}</Panel></> : null}

      {m.needs.length ? <><Eyebrow>Needs and what was given</Eyebrow><Panel>{m.needs.map((n, i) => <Pressable key={n.id} onPress={() => router.push(`/need/${n.id}` as never)} accessibilityRole="button" style={{ paddingVertical: 12, borderBottomWidth: i === m.needs.length - 1 && !m.gave.length ? 0 : 1, borderBottomColor: c.s200 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text style={[t.row, { flex: 1 }]}>{n.what}</Text><Text style={t.meta}>{n.want ? `${n.got} of ${n.want} ${n.unit}` : "Open"}</Text></View>
        {n.want ? <Bar share={shareOf(n.got, n.want)} /> : null}</Pressable>)}
        {m.gave.length ? <View style={{ paddingVertical: 12 }}><Meta>{`Given by ${m.gave.map((g) => `${g.who}${g.what ? ` (${g.what})` : ""}`).join("; ")}`}</Meta></View> : null}</Panel></> : null}
      {m.partners.length ? <><Eyebrow>Partners</Eyebrow><Panel><View style={{ paddingVertical: 12 }}><Body>{m.partners.join(", ")}</Body></View></Panel></> : null}

      <Eyebrow right={m.photos.length ? `${picked.size} chosen` : undefined}>Photos</Eyebrow>
      {m.photos.length ? <><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {m.photos.map((x) => <Thumb key={x.a.hash} a={{ ...x.a, title: x.caption }} on={picked.has(x.a.hash)} onPress={() => setPicked((s0) => { const n = new Set(s0); if (n.has(x.a.hash)) n.delete(x.a.hash); else n.add(x.a.hash); return n; })} />)}</View>
        <Meta>{"\nTap to choose which go in the report. Each is shown with its step and team. Never photos marked as showing children."}</Meta></>
        : <Meta>No photos yet. Add photos on a step or on the project (Photos and files), and they show here.</Meta>}
      {m.docs.length ? <><Eyebrow right={`${m.docs.length}`}>Documents</Eyebrow><Panel>{m.docs.slice(0, 6).map((d, i, list) => <Row key={`${d.title}${i}`} left={<IconCircle name="receipt" tone="grey" />} title={d.title} meta={d.from} last={i === list.length - 1} />)}</Panel></> : null}

      {m.updates.length ? <><Eyebrow>Latest updates</Eyebrow><Panel>{m.updates.map((u, i) => <View key={`${u.when}${i}`} style={{ paddingVertical: 10, borderBottomWidth: i === m.updates.length - 1 ? 0 : 1, borderBottomColor: c.s200 }}>
        <Meta>{[u.who, u.on, u.when ? short(u.when) : null].filter(Boolean).join(" · ")}</Meta><Text style={[t.body, { marginTop: 2 }]}>{u.text}</Text></View>)}</Panel></> : null}

      <Eyebrow>What we learned, and next time</Eyebrow>
      <Field value={lessons} onChangeText={setLessons} multiline placeholder="What worked, what you'd change, what this leaves behind" accessibilityLabel="What we learned" />
      <View style={{ marginTop: 12 }}><Panel><Row left={<Check on={names} onPress={() => setNames(!names)} />} title="Name the volunteers" meta={names ? `${new Set(credited).size} who allow it, by team` : `Off: shows “${volunteers} volunteers”`} onPress={() => setNames(!names)} last /></Panel></View>

      {exportButtons}
      <Buttons><Outline flex label="Send it as the group's report" onPress={() => setStep(2)} /></Buttons>
      <Meta>{done.length ? "\nSending keeps a signed copy with the group's records. You can save the PDF without sending." : "\nYou can save the PDF any time. Sending a signed report needs at least one finished step."}</Meta>
    </Screen>
  );

  return (
    <Screen back>
      <Text style={t.title}>Who is this report for?</Text>
      <Meta>Each version shows what that reader needs.</Meta>
      <View style={{ marginTop: 12 }}><Panel>{AUDIENCES.map((x, i) => <Row key={x.code} left={<Check on={audience === x.code} onPress={() => setAudience(x.code)} />} title={x.label} meta={x.shows} onPress={() => setAudience(x.code)} last={i === AUDIENCES.length - 1} />)}</Panel></View>
      <Eyebrow>This version shows</Eyebrow>
      <Panel>
        <Row left={<Check on />} title="Figures and what each team did" />
        {m.needs.length ? <Row left={<Check on />} title="Needs and what was given" meta={m.needs.map((x) => x.what).join(", ")} /> : null}
        <Row left={<Check on={picked.size > 0} />} title={`${picked.size} photo${picked.size === 1 ? "" : "s"}`} meta="Never photos marked as showing children" onPress={() => setStep(1)} />
        <Row left={<Check on={names} onPress={() => setNames(!names)} />} title="Volunteers' names" meta={names ? `${new Set(credited).size} who allow it` : `Off: shows “${volunteers} volunteers”`} last />
      </Panel>
      <View style={{ backgroundColor: c.sand, borderRadius: radius.panel, padding: 14, marginTop: 12, flexDirection: "row", gap: 12, alignItems: "center" }}><IconCircle name="lock" tone="white" />
        <View style={{ flex: 1 }}><Text style={t.row}>Signed when you send</Text><Meta>A correction is a new version that replaces this one.</Meta></View></View>
      <Buttons><Primary label="Send the report" onPress={send} busy={busy === "send"} disabled={!done.length} /></Buttons>
      <View style={{ alignItems: "center", marginTop: 8 }}><Outline label="Back" onPress={() => setStep(1)} /></View>
    </Screen>
  );
}
