import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { short } from "@/lib/dates";
import { pickDocument, pickPhoto } from "@/lib/files";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { shortRef, teamIcon } from "@/lib/work";
import { Files } from "@/ui/Files";
import { Body, Buttons, Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Pill, Primary, Row, Sand, Screen, Sheet, Tip } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** The project page (sketch: running-sketches #1, page anatomy §1b). */
export default function Project() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [about, setAbout] = useState("");
  const [addingFile, setAddingFile] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const p = await bix.get("Initiative", id);
    const ref = `Initiative/${id}`;
    const [teams, tasks, needs, decisions] = await Promise.all([bix.search("Team", { initiative: ref }), bix.search("Task", { partOf: ref }), bix.search("Need", { initiative: ref }), bix.search("Decision", { partOf: ref })]);
    return { p, teams, tasks, needs, decisions };
  }, [id]);
  if (error) return <Screen back><Notice>{error}</Notice></Screen>;
  if (!data) return <Screen back><Meta>Loading…</Meta></Screen>;
  const { p, teams, tasks, needs, decisions } = data;
  const lead = s.isLead || teams.some((tm) => (tm.participant ?? []).some((x: any) => x.person.reference === `Person/${s.person?.id}` && x.role === "lead" && x.status === "active"));
  const people = new Set(teams.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)));
  const gates = tasks.filter((x) => x.milestone && x.status !== "completed");
  const blocked = (g: any) => tasks.filter((x) => (x.dependsOn ?? []).some((d: any) => d.reference === `Task/${g.id}`)).length;
  const run = async (next: any, ok?: string) => { try { await bix.commit(next); if (ok) setMsg(ok); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  const addFile = async (pick: () => Promise<any>) => { setAddingFile(false); const a = await pick().catch((e: any) => { setMsg(String(e?.message ?? e)); return null; }); if (a) run(bix.next(p, { attachment: [...(p.attachment ?? []), a] })); };
  const openVotes = decisions.filter((d) => d.status === "open");
  return (
    <Screen back>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name="flag" size={56} tone="white" />
        <View style={{ flex: 1 }}><Text style={[t.title, { fontSize: 24 }]}>{p.title}</Text>
          <Meta>{[p.period?.start ? short(p.period.start) : null, `${teams.length} teams · ${people.size} ${people.size === 1 ? "person" : "people"}`, p.status === "completed" ? "Done" : null].filter(Boolean).join(" · ")}</Meta></View></View>
      {editing ? <><Field label="About" value={about} onChangeText={setAbout} multiline /><Buttons><Primary label="Save" onPress={() => { setEditing(false); run(bix.next(p, { description: about.trim() || undefined })); }} /><Outline label="Cancel" onPress={() => setEditing(false)} /></Buttons></>
        : <View style={{ marginTop: 10 }}>{p.description ? <Body>{p.description}</Body> : lead ? <Text style={t.meta} onPress={() => { setAbout(""); setEditing(true); }}>＋ Add what this project is about</Text> : null}
          {p.description && lead ? <Text style={[t.meta, { marginTop: 4 }]} onPress={() => { setAbout(p.description ?? ""); setEditing(true); }}>Edit</Text> : null}</View>}
      {msg ? <Notice>{msg}</Notice> : null}
      <Tip id="project-page" title="One place for the whole project">Gates are what many tasks wait on. Teams show their progress. Needs and votes live here too.</Tip>

      {gates.map((g) => <View key={g.id} style={{ marginTop: 14 }}><Sand><IconCircle name="building" tone="white" />
        <View style={{ flex: 1 }}><Text style={[t.eyebrow, { marginBottom: 2 }]}>Gate</Text><Text style={t.row}>{g.title}</Text><Meta>{`${blocked(g)} task${blocked(g) === 1 ? "" : "s"} wait on this`}</Meta></View>
        <Text style={{ fontWeight: "600", textDecorationLine: "underline", color: c.ink }} onPress={() => router.push(`/task/${g.id}`)}>Open</Text></Sand></View>)}

      {openVotes.map((d) => <View key={d.id} style={{ marginTop: 12 }}><Panel><Row left={<IconCircle name="flag" />} title={d.question} meta="Vote open" right={<Pill tone="state">Vote</Pill>} onPress={() => router.push(`/vote/${d.id}` as never)} last /></Panel></View>)}

      {(p.attachment ?? []).length || lead ? <><Eyebrow right={(p.attachment ?? []).length ? `${(p.attachment ?? []).length}` : undefined}>Files</Eyebrow><Files items={p.attachment ?? []} onAdd={lead ? () => setAddingFile(true) : undefined} /></> : null}

      <Eyebrow right={`${teams.length}`}>Teams</Eyebrow>
      <Panel>
        {teams.map((x, i) => {
          const mine = tasks.filter((k) => k.team?.reference === `Team/${x.id}` && k.status !== "draft");
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
