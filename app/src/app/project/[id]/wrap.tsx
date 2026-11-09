import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, ScrollView, Share, Text, View } from "react-native";
import { appUrl } from "@/lib/env";
import { personName } from "@/lib/work";
import { Sheet, usePhoto } from "@/ui/kit";
import { bix, ref } from "@/lib/bix";
import { DAY } from "@/lib/dates";
import { useLoad } from "@/lib/use";
import { facesOf, peopleFor } from "@/lib/work";
import { Buttons, Eyebrow, Faces, IconCircle, Meta, Notice, Panel, Primary, Row, Screen, Title, Outline , Skeleton} from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";

/** The wrap-up writes itself (coordinator sketches D12–D14): figures, photos, needs met, a report and a thank-you post
 * composed from signed work, then save the event for next year. Wrapping up: finish the project, and save its teams and usual work for next time (BIX InitiativeTemplate, never shown by that name). */
export default function Wrap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, reload } = useLoad(async () => {
    const [p, teams, tasks, needs] = await Promise.all([bix.get("Initiative", id), bix.search("Team", { initiative: `Initiative/${id}` }), bix.search("Task", { partOf: `Initiative/${id}` }), bix.search("Need", { initiative: `Initiative/${id}` })]);
    const live = tasks.filter((x) => x.status !== "draft");
    const folks = await peopleFor(live.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)), 12);
    return { p, teams, tasks: live, folks, needs };
  }, [id]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { p, teams, tasks, folks, needs } = data;
  const done = tasks.filter((x) => x.status === "completed").length;
  const people = new Set(tasks.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)));
  const span = (e?: { start?: string; end?: string }) => (e?.start && e?.end ? (Date.parse(e.end) - Date.parse(e.start)) / 3600000 : 0);
  const hours = Math.round(tasks.filter((x) => x.status === "completed").reduce((h, x) => h + ((x.participant ?? []) as any[]).filter((y) => y.status === "active").reduce((a, y) => a + span(y.period ?? x.executionPeriod), 0), 0) * 10) / 10;
  const photos = tasks.flatMap((x) => ((x.output ?? []) as any[]).flatMap((o) => o.attachment ?? [])).filter((a: any) => a.contentType?.startsWith("image/") && !a.showsMinors).slice(0, 8);
  const met = needs.filter((n) => n.status === "met" || n.status === "partially-met");
  // Credits by team, named the way each person chose (Person.credit); anonymous people are counted, not named.
  const credits = teams.map((tm) => ({ team: tm.name, names: [...new Set(tasks.filter((x) => x.team?.reference === `Team/${tm.id}` && x.status === "completed")
    .flatMap((x) => ((x.participant ?? []) as any[]).filter((y) => y.status === "active").map((y) => y.person.reference)))].map((r) => folks[r]).filter((q) => q && q.credit !== "anonymous").map((q) => personName(q)) })).filter((x) => x.names.length);
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  const report = `${p.title}: how it went\n${n(people.size, "volunteer", "volunteers")} gave ${hours} hours. ${done} of ${tasks.length} things done.${met.length ? `\nNeeds met: ${met.map((x) => x.category?.display ?? "supplies").join(", ")}.` : ""}\nEvery task is signed by the group: ${appUrl()}/project/${id}`;
  const thanks = `Salamat sa lahat! ${n(people.size, "volunteer", "volunteers")} gave ${hours} hours for ${p.title}.\n${credits.map((c) => `${c.team}: ${c.names.join(", ")}`).join("\n")}`;
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
  const [thanking, setThanking] = useState(false);
  const finish = async () => { try { await bix.commit(bix.next(p, { status: "completed", period: { ...(p.period ?? {}), end: new Date().toISOString() } })); reload(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } };
  const tile = (big: string, small: string) => <View style={{ flex: 1, backgroundColor: c.white, borderRadius: radius.panel, padding: 14 }}><Text style={[t.title, { fontSize: 22 }]}>{big}</Text><Meta>{small}</Meta></View>;
  return (
    <Screen back>
      <Title sub={p.status === "completed" ? "It's done. Salamat!" : "Written from what your teams did. Check it, then send."}>{`How ${p.title} went`}</Title>
      <View style={{ flexDirection: "row", gap: 10 }}>{tile(`${people.size}`, people.size === 1 ? "volunteer" : "volunteers")}{tile(`${hours} h`, "given")}{tile(`${done} of ${tasks.length}`, "done")}</View>
      {facesOf([...people], folks).names.length ? <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}><Faces {...facesOf([...people], folks)} /><Meta>{credits.map((x) => x.team).join(" · ")}</Meta></View> : null}
      {photos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }} contentContainerStyle={{ gap: 8 }}>{photos.map((a: any) => <WrapPhoto key={a.hash} a={a} />)}</ScrollView> : null}
      {met.length ? <><Eyebrow>Needs met</Eyebrow><Panel>{met.map((x, i) => <Row key={x.id} left={<IconCircle name="box" />} title={x.category?.display ?? "Supplies"}
        meta={x.quantity?.value ? `${x.received?.value ?? 0} of ${x.quantity.value} ${x.quantity.unit ?? ""}` : undefined} last={i === met.length - 1} />)}</Panel></> : null}
      <Eyebrow>Send it</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="share" />} title="Share the report" meta="Counts and a link to the signed work" onPress={() => Share.share({ message: report }).catch(() => {})} />
        <Row left={<IconCircle name="heart" />} title="Thank everyone" meta="Writes the thank-you post, with credits by team" onPress={() => setThanking(true)} />
        <Row left={<IconCircle name="users" />} title="See the credits" onPress={() => router.push(`/project/${id}/credits` as never)} />
        <Row left={<IconCircle name="repeat" />} title="Save for next year" meta={`${teams.length} teams and their work, dated from the event`} onPress={save} last />
      </Panel>
      {msg ? <Notice>{msg}</Notice> : null}
      {p.status !== "completed" ? <Buttons><Primary label="Mark the event done" onPress={finish} busy={busy} /></Buttons> : <Buttons><Outline flex label="Back to the event" onPress={() => router.back()} /></Buttons>}
      <Sheet open={thanking} onClose={() => setThanking(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Thank everyone</Text>
        <View style={{ backgroundColor: c.sand, borderRadius: radius.inner, padding: 14, marginTop: 10 }}><Text style={[t.body, { fontSize: 13.5 }]}>{thanks}</Text></View>
        <Buttons><Primary label="Share" onPress={() => { Share.share({ message: thanks }).catch(() => {}); setThanking(false); }} /></Buttons>
        <Meta>{"\nNames follow how each person chose to be credited."}</Meta>
      </Sheet>
    </Screen>
  );
}

function WrapPhoto({ a }: { a: { hash?: string } }) { const uri = usePhoto(a); return <View style={{ width: 86, height: 86, borderRadius: radius.inner, overflow: "hidden", backgroundColor: c.sand }}>{uri ? <Image source={{ uri }} style={{ width: 86, height: 86 }} /> : null}</View>; }
