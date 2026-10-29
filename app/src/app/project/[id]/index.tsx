import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, Platform, Pressable, Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { parseDate, short } from "@/lib/dates";
import { pickDocument, pickPhoto } from "@/lib/files";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { shortRef, teamIcon } from "@/lib/work";
import { Files } from "@/ui/Files";
import { Body, Buttons, Eyebrow, Field, IconCircle, LinkText, Meta, Notice, Panel, Pill, Primary, Row, RoundButton, Sand, Screen, Sheet, Tip, Skeleton, usePhoto } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** The project page (sketch: running-sketches #1, page anatomy §1b). */
export default function Project() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ title: string; about: string; start: string; image: any }>({ title: "", about: "", start: "", image: null });
  const [addingFile, setAddingFile] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const p = await bix.get("Initiative", id);
    const ref = `Initiative/${id}`;
    const [teams, tasks, needs, decisions] = await Promise.all([bix.search("Team", { initiative: ref }), bix.search("Task", { partOf: ref }), bix.search("Need", { initiative: ref }), bix.search("Decision", { partOf: ref })]);
    const can = await bix.can("Initiative", id);
    return { p, teams, tasks, needs, decisions, can };
  }, [id]);
  const logo = usePhoto(data?.p.image);
  const formLogo = usePhoto(form.image);
  if (error) return <Screen onRefresh={reload} back><Notice>{error}</Notice></Screen>;
  if (!data) return <Screen onRefresh={reload} back><Skeleton /></Screen>;
  const { p, teams, tasks, needs, decisions, can } = data;
  const lead = s.isLead || teams.some((tm) => (tm.participant ?? []).some((x: any) => x.person.reference === `Person/${s.person?.id}` && x.role === "lead" && x.status === "active"));
  const people = new Set(teams.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)));
  const gates = tasks.filter((x) => x.milestone && x.status !== "completed");
  const blocked = (g: any) => tasks.filter((x) => (x.dependsOn ?? []).some((d: any) => d.reference === `Task/${g.id}`)).length;
  const run = async (next: any, ok?: string) => { try { await bix.commit(next); if (ok) setMsg(ok); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  const addFile = async (pick: () => Promise<any>) => { setAddingFile(false); const a = await pick().catch((e: any) => { setMsg(String(e?.message ?? e)); return null; }); if (a) run(bix.next(p, { attachment: [...(p.attachment ?? []), a] })); };
  const openVotes = decisions.filter((d) => d.status === "open");
  const edit = () => { setForm({ title: p.title ?? "", about: p.description ?? "", start: p.period?.start?.slice(0, 10) ?? "", image: p.image ?? null }); setEditing(true); };
  const save = () => {
    if (!form.title.trim()) return;
    const start = form.start.trim() ? parseDate(form.start) : null;
    if (form.start.trim() && !start) { setMsg("That date didn't read right. Try 2027-02-15."); return; }
    setEditing(false);
    run(bix.next(p, { title: form.title.trim(), description: form.about.trim() || undefined, image: form.image ?? undefined, period: start ? { ...(p.period ?? {}), start } : p.period?.end ? { end: p.period.end } : undefined }), "Saved.");
  };
  const cancelProject = () => {
    const go = () => { setEditing(false); run(bix.next(p, { status: "cancelled" }), "The project is cancelled. Its history is kept."); };
    if (Platform.OS === "web") return go();
    Alert.alert("Cancel this project?", "Nobody can add work to it after this. Everything done so far stays on record.", [{ text: "Keep it", style: "cancel" }, { text: "Cancel the project", style: "destructive", onPress: go }]);
  };
  const removeFile = (a: any) => run(bix.next(p, { attachment: (p.attachment ?? []).filter((x: any) => x.hash !== a.hash) }), "File removed.");
  return (
    <Screen onRefresh={reload} back right={can.edit ? <RoundButton icon="pen" label="Edit project" onPress={edit} /> : undefined}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>{logo ? <Image source={{ uri: logo }} style={{ width: 56, height: 56, borderRadius: 18 }} /> : <IconCircle name="flag" size={56} tone="white" />}
        <View style={{ flex: 1 }}><Text style={[t.title, { fontSize: 24 }]}>{p.title}</Text>
          <Meta>{[p.period?.start ? short(p.period.start) : null, `${teams.length} teams · ${people.size} ${people.size === 1 ? "person" : "people"}`, p.status === "completed" ? "Done" : p.status === "cancelled" ? "Cancelled" : null].filter(Boolean).join(" · ")}</Meta></View></View>
      <View style={{ marginTop: 10 }}>{p.description ? <Body>{p.description}</Body> : can.edit ? <Text style={t.meta} onPress={edit}>＋ Add what this project is about</Text> : null}</View>
      {msg ? <Notice>{msg}</Notice> : null}
      <Tip id="project-page" title="The whole project">Gates, teams, needs and votes, in one place.</Tip>

      {gates.map((g) => <View key={g.id} style={{ marginTop: 14 }}><Sand><IconCircle name="building" tone="white" />
        <View style={{ flex: 1 }}><Text style={[t.eyebrow, { marginBottom: 2 }]}>Gate</Text><Text style={t.row}>{g.title}</Text><Meta>{`${blocked(g)} task${blocked(g) === 1 ? "" : "s"} wait on this`}</Meta></View>
        <Text style={{ fontWeight: "600", textDecorationLine: "underline", color: c.ink }} onPress={() => router.push(`/task/${g.id}`)}>Open</Text></Sand></View>)}

      {openVotes.map((d) => <View key={d.id} style={{ marginTop: 12 }}><Panel><Row left={<IconCircle name="flag" />} title={d.question} meta="Vote open" right={<Pill tone="state">Vote</Pill>} onPress={() => router.push(`/vote/${d.id}` as never)} last /></Panel></View>)}

      {(p.attachment ?? []).length || can.edit ? <><Eyebrow right={(p.attachment ?? []).length ? `${(p.attachment ?? []).length}` : undefined}>Files</Eyebrow><Files items={p.attachment ?? []} onAdd={can.edit ? () => setAddingFile(true) : undefined} onRemove={can.edit ? removeFile : undefined} /></> : null}

      <Eyebrow right={`${teams.length}`}>Teams</Eyebrow>
      <Panel>
        {teams.map((x, i) => {
          const mine = tasks.filter((k) => k.team?.reference === `Team/${x.id}` && k.status !== "draft" && k.status !== "cancelled");
          const doneN = mine.filter((k) => k.status === "completed").length;
          const pct = mine.length ? doneN / mine.length : 0;
          return <Row key={x.id} left={<IconCircle name={teamIcon(x.name)} />} title={x.name} last={i === teams.length - 1} onPress={() => router.push(`/team/${x.id}`)}
            meta={mine.length ? `${doneN} of ${mine.length} done` : (x.participant ?? []).some((y: any) => y.role === "lead" && y.status === "active") ? "No work yet" : "Needs a lead"}
            right={<View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden" }}><View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: c.accent }} /></View>} />;
        })}
      </Panel>

      <Eyebrow right={needs.length ? `${needs.length}` : undefined}>What we need</Eyebrow>
      <Panel>
        {needs.map((n) => { const got = n.received?.value ?? 0, want = n.quantity?.value ?? 0;
          return <Row key={n.id} left={<IconCircle name="box" />} title={n.category?.display ?? "Something"} meta={[want ? `${got} of ${want} ${n.quantity?.unit ?? ""}` : null, n.neededBy ? `by ${short(n.neededBy)}` : null, shortRef(n)].filter(Boolean).join(" · ")}
            right={<Pill tone={n.status === "met" ? "ok" : "neutral"}>{n.status === "met" ? "Covered" : n.status === "partially-met" ? "Partly" : "Open"}</Pill>} onPress={() => router.push(`/need/${n.id}` as never)} />; })}
        <Row left={<IconCircle name="plus" tone="grey" />} title={lead ? "Post a need" : "See what's needed"} meta="Goods, a venue, a skill, people" onPress={() => router.push({ pathname: "/need/new" as never, params: { project: id } })} last />
      </Panel>

      <Eyebrow>More</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="cal" />} title="Timeline" meta="Work by week, with gates" onPress={() => router.push(`/project/${id}/timeline` as never)} />
        <Row left={<IconCircle name="heart" />} title="Credits" meta="Everyone who made it happen" onPress={() => router.push(`/project/${id}/credits` as never)} />
        {lead ? <Row left={<IconCircle name="flag" />} title="Start a vote" meta="Decide something together" onPress={() => router.push({ pathname: "/vote/new" as never, params: { project: id } })} /> : null}
        {lead ? <Row left={<IconCircle name="repeat" />} title={p.status === "completed" ? "Wrapped up" : "Wrap up the project"} meta="Report, credits, save these teams" onPress={() => router.push(`/project/${id}/wrap` as never)} last /> : null}
      </Panel>

      <Sheet open={editing} onClose={() => setEditing(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Edit project</Text>
        <Pressable onPress={async () => { const a = await pickPhoto(false).catch((e: any) => { setMsg(String(e?.message ?? e)); return null; }); if (a) setForm((f) => ({ ...f, image: a })); }}
          accessibilityRole="button" accessibilityLabel="Change the project's picture" style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
          {formLogo ? <Image source={{ uri: formLogo }} style={{ width: 64, height: 64, borderRadius: 20 }} /> : <IconCircle name="camera" size={64} />}
          <Text style={[t.row, { color: c.accent }]}>{form.image ? "Change picture" : "Add a picture"}</Text>
        </Pressable>
        <Field label="Name" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
        <Field label="What it's about" value={form.about} onChangeText={(v) => setForm((f) => ({ ...f, about: v }))} multiline />
        <Field label="Starts" value={form.start} onChangeText={(v) => setForm((f) => ({ ...f, start: v }))} placeholder="e.g. 2027-02-15" />
        <Buttons><Primary label="Save" onPress={save} disabled={!form.title.trim()} /></Buttons>
        <Meta>{can.who}</Meta>
        {p.status !== "cancelled" && p.status !== "completed" ? <View style={{ marginTop: 14 }}><LinkText onPress={cancelProject}>Cancel this project</LinkText></View> : null}
      </Sheet>

      <Sheet open={addingFile} onClose={() => setAddingFile(false)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Add to the project's files</Text>
        <Panel style={{ backgroundColor: c.wash }}>
          <Row left={<IconCircle name="camera" tone="white" />} title="Photo" onPress={() => addFile(() => pickPhoto(false))} />
          <Row left={<IconCircle name="receipt" tone="white" />} title="Document" meta="Brief, budget, deck" onPress={() => addFile(pickDocument)} last />
        </Panel>
      </Sheet>
    </Screen>
  );
}
