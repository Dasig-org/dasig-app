import { AddSheet } from "@/ui/AddSheet";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, Platform, Pressable, Share, Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { parseDate, short } from "@/lib/dates";
import { pickDocument, pickPhoto } from "@/lib/files";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { facesOf, peopleFor, placeOf, shortRef, teamIcon } from "@/lib/work";
import { Logo } from "@/ui/Context";
import { History } from "@/ui/History";
import { Files } from "@/ui/Files";
import { Body, Buttons, Eyebrow, Faces, Field, IconCircle, LinkText, Meta, Notice, Panel, Pill, Primary, Row, RoundButton, Sand, Screen, Sheet, Tip, Skeleton, usePhoto } from "@/ui/kit";
import { atMost, InviteOptions, linkOpts, VisibilityChoice, visibilityFields, visibilityOf, type Visibility } from "@/ui/Privacy";
import { appUrl } from "@/lib/env";
import { c, type as t } from "@/ui/theme";

/** The project page (sketch: running-sketches #1, page anatomy §1b). */
export default function Project() {
  const [addOpen, setAddOpen] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ title: string; about: string; place: string; start: string; image: any; vis: Visibility }>({ title: "", about: "", place: "", start: "", image: null, vis: "invited" });
  const [addingFile, setAddingFile] = useState(false);
  const [inviteAsk, setInviteAsk] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const { data, error, reload } = useLoad(async () => {
    const p = await bix.get("Initiative", id);
    const ref = `Initiative/${id}`;
    const [teams, tasks, needs, decisions] = await Promise.all([bix.search("Team", { initiative: ref }), bix.search("Task", { partOf: ref }), bix.search("Need", { initiative: ref }), bix.search("Decision", { partOf: ref })]);
    const can = await bix.can("Initiative", id);
    const org = p.organization ? await bix.get("Organization", p.organization.reference.split("/")[1]).catch(() => null) : null;
    const folks = await peopleFor(teams.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)), 20);
    return { p, teams, tasks, needs, decisions, can, org, folks };
  }, [id]);
  const logo = usePhoto(data?.p.image);
  const formLogo = usePhoto(form.image);
  if (error) return <Screen onRefresh={reload} back><Notice>{error}</Notice></Screen>;
  if (!data) return <Screen onRefresh={reload} back><Skeleton /></Screen>;
  const { p, teams, tasks, needs, decisions, can, org, folks } = data;
  const activeOf = (tm: any) => (tm.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference as string);
  const lead = s.isLead || teams.some((tm) => (tm.participant ?? []).some((x: any) => x.person.reference === `Person/${s.person?.id}` && x.role === "lead" && x.status === "active"));
  const people = new Set(teams.flatMap((x) => (x.participant ?? []).filter((y: any) => y.status === "active").map((y: any) => y.person.reference)));
  const gates = tasks.filter((x) => x.milestone && x.status !== "completed");
  const blocked = (g: any) => tasks.filter((x) => (x.dependsOn ?? []).some((d: any) => d.reference === `Task/${g.id}`)).length;
  const run = async (next: any, ok?: string) => { try { await bix.commit(next); if (ok) setMsg(ok); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  const addFile = async (pick: () => Promise<any>) => { setAddingFile(false); const a = await pick().catch((e: any) => { setMsg(String(e?.message ?? e)); return null; }); if (a) run(bix.next(p, { attachment: [...(p.attachment ?? []), a] })); };
  const openVotes = decisions.filter((d) => d.status === "open");
  const groupVis = visibilityOf(s.groups.find((g) => `Organization/${g.org.id}` === p.organization?.reference)?.org);
  const edit = () => { setForm({ title: p.title ?? "", about: p.description ?? "", place: placeOf(p) ?? "", start: p.period?.start?.slice(0, 10) ?? "", image: p.image ?? null, vis: atMost(visibilityOf(p), groupVis) }); setEditing(true); };
  const save = () => {
    if (!form.title.trim()) return;
    const start = form.start.trim() ? parseDate(form.start) : null;
    if (form.start.trim() && !start) { setMsg("That date didn't read right. Try 2027-02-15."); return; }
    setEditing(false);
    run(bix.next(p, { ...visibilityFields(p, atMost(form.vis, groupVis)), title: form.title.trim(), description: form.about.trim() || undefined, extension: [...(p.extension ?? []).filter((x: any) => x.url !== "bayanihan:place-text"), ...(form.place.trim() ? [{ url: "bayanihan:place-text", value: form.place.trim() }] : [])], image: form.image ?? undefined, period: start ? { ...(p.period ?? {}), start } : p.period?.end ? { end: p.period.end } : undefined }), "Saved.");
  };
  const cancelProject = () => {
    const go = () => { setEditing(false); run(bix.next(p, { status: "cancelled" }), "The project is cancelled. Its history is kept."); };
    if (Platform.OS === "web") return go();
    Alert.alert("Cancel this project?", "Nobody can add work to it after this. Everything done so far stays on record.", [{ text: "Keep it", style: "cancel" }, { text: "Cancel the project", style: "destructive", onPress: go }]);
  };
  const removeFile = (a: any) => run(bix.next(p, { attachment: (p.attachment ?? []).filter((x: any) => x.hash !== a.hash) }), "File removed.");
  return (
    <Screen onRefresh={reload} back right={<View style={{ flexDirection: "row", gap: 8 }}>{can.edit ? <RoundButton icon="pen" label="Edit project" onPress={edit} /> : null}
      {lead ? <RoundButton icon="plus" label="Add" onPress={() => setAddOpen(true)} /> : null}</View>}>
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} ctx={{ kind: "project", project: p, lead }} />
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>{logo ? <Image source={{ uri: logo }} style={{ width: 56, height: 56, borderRadius: 16 }} /> : <IconCircle name="flag" size={56} tone="white" />}
        <View style={{ flex: 1 }}><Text style={[t.title, { fontSize: 24 }]}>{p.title}</Text>
          <Meta>{[p.period?.start ? short(p.period.start) : null, placeOf(p), p.status === "completed" ? "Done" : p.status === "cancelled" ? "Cancelled" : null].filter(Boolean).join(" · ")}</Meta></View></View>
      {/* Summary first (UX_GAPS A3): what it is, whose it is, and how it's going. Teams and files come after. */}
      <View style={{ marginTop: 10 }}>{p.description ? <Body>{p.description}</Body> : can.edit ? <Text style={[t.meta, { color: c.accent, fontWeight: "600" }]} onPress={edit}>＋ Say what this project is about: what, for whom, and why</Text> : null}</View>
      <View style={{ marginTop: 12 }}><Panel>
        {org ? <Row left={<Logo name={org.name} image={org.image} size={36} />} title={org.name} meta="About the group" onPress={() => router.push(`/org/${org.id}` as never)} /> : null}
        {(() => { const live = tasks.filter((k) => k.status !== "draft" && k.status !== "cancelled"); const d = live.filter((k) => k.status === "completed").length;
          const f = facesOf([...people], folks);
          return <Row left={f.names.length ? <View style={{ width: 64 }}><Faces {...f} /></View> : <IconCircle name="check" />} title={live.length ? `${d} of ${live.length} done` : "No work added yet"} meta={`${teams.length} team${teams.length === 1 ? "" : "s"} · ${people.size} ${people.size === 1 ? "person" : "people"}`} last
            right={live.length ? <View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden" }}><View style={{ width: `${(d / live.length) * 100}%`, height: 8, backgroundColor: c.accent }} /></View> : undefined} />; })()}
      </Panel></View>
      {msg ? <Notice>{msg}</Notice> : null}
      <Tip id="project-page" title="The whole project">Gates, teams, needs and votes, in one place.</Tip>

      {gates.map((g) => <View key={g.id} style={{ marginTop: 14 }}><Sand><IconCircle name="building" tone="white" />
        <View style={{ flex: 1 }}><Text style={[t.eyebrow, { marginBottom: 2 }]}>Gate</Text><Text style={t.row}>{g.title}</Text><Meta>{`${blocked(g)} task${blocked(g) === 1 ? "" : "s"} wait on this`}</Meta></View>
        <Text style={{ fontWeight: "600", textDecorationLine: "underline", color: c.ink }} onPress={() => router.push(`/task/${g.id}`)}>Open</Text></Sand></View>)}

      {openVotes.map((d) => <View key={d.id} style={{ marginTop: 12 }}><Panel><Row left={<IconCircle name="flag" />} title={d.question} meta="Vote open" right={<Pill tone="state">Vote</Pill>} onPress={() => router.push(`/vote/${d.id}` as never)} last /></Panel></View>)}

      <Eyebrow right={`${teams.length}`}>Teams</Eyebrow>
      <Panel>
        {teams.map((x, i) => {
          const mine = tasks.filter((k) => k.team?.reference === `Team/${x.id}` && k.status !== "draft" && k.status !== "cancelled");
          const doneN = mine.filter((k) => k.status === "completed").length;
          const pct = mine.length ? doneN / mine.length : 0;
          return <Row key={x.id} left={<IconCircle name={teamIcon(x.name)} />} title={x.name} last={i === teams.length - 1} onPress={() => router.push(`/team/${x.id}`)}
            meta={mine.length ? `${doneN} of ${mine.length} done` : (x.participant ?? []).some((y: any) => y.role === "lead" && y.status === "active") ? "Add its first task" : "Ask someone to lead"}
            right={<View style={{ alignItems: "flex-end", gap: 6 }}>{facesOf(activeOf(x), folks).names.length ? <Faces {...facesOf(activeOf(x), folks)} /> : null}{mine.length ? <View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden" }}><View style={{ width: `${pct * 100}%`, height: 8, backgroundColor: c.accent }} /></View> : null}</View>} />;
        })}
      </Panel>

      {(p.attachment ?? []).length || can.edit ? <><Eyebrow right={(p.attachment ?? []).length ? `${(p.attachment ?? []).length}` : undefined}>Files</Eyebrow><Files hint="Add a brief, budget or photo for the project" items={p.attachment ?? []} onAdd={can.edit ? () => setAddingFile(true) : undefined} onRemove={can.edit ? removeFile : undefined} /></> : null}

      <Eyebrow right={needs.length ? `${needs.length}` : undefined}>What we need</Eyebrow>
      <Panel>
        {needs.map((n) => { const got = n.received?.value ?? 0, want = n.quantity?.value ?? 0;
          return <Row key={n.id} left={<IconCircle name="box" />} title={n.category?.display ?? "Something"} meta={[want ? `${got} of ${want} ${n.quantity?.unit ?? ""}` : null, n.neededBy ? `by ${short(n.neededBy)}` : null, shortRef(n)].filter(Boolean).join(" · ")}
            right={<Pill tone={n.status === "met" ? "ok" : "neutral"}>{n.status === "met" ? "Covered" : n.status === "partially-met" ? "Partly" : "Open"}</Pill>} onPress={() => router.push(`/need/${n.id}` as never)} />; })}
        <Row left={<IconCircle name="plus" tone="grey" />} title={lead ? "Post a need" : "See what's needed"} meta="Goods, a venue, a skill, people" onPress={() => router.push({ pathname: "/need/new" as never, params: { project: id } })} last />
      </Panel>

      <History type="Initiative" id={p.id} groupName={org?.name} version={p.meta.version} />
      <Eyebrow>More</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="cal" />} title="Timeline" meta="Work by week, with gates" onPress={() => router.push(`/project/${id}/timeline` as never)} />
        {lead ? <Row left={<IconCircle name="check" />} title="Event day" meta="Check people in, see what's still open" onPress={() => router.push(`/project/${id}/day` as never)} /> : null}
        {lead ? <Row left={<IconCircle name="receipt" />} title="Report" meta="How it went: figures, photos, who it's for" onPress={() => router.push(`/project/${id}/report` as never)} /> : null}
        <Row left={<IconCircle name="heart" />} title="Credits" meta="Everyone who made it happen" onPress={() => router.push(`/project/${id}/credits` as never)} />
        {lead && groupVis !== "group" ? <Row left={<IconCircle name="userplus" />} title="Invite volunteers" meta={visibilityOf(p) === "public" ? "A link to this project; they choose a team" : "A private link; the project stays hidden"} onPress={() => setInviteAsk(true)} /> : null}
        {lead ? <Row left={<IconCircle name="flag" />} title="Start a vote" meta="Decide something together" onPress={() => router.push({ pathname: "/vote/new" as never, params: { project: id } })} /> : null}
        {lead ? <Row left={<IconCircle name="repeat" />} title={p.status === "completed" ? "Wrapped up" : "Wrap up the project"} meta="Report, credits, save these teams" onPress={() => router.push(`/project/${id}/wrap` as never)} last /> : null}
      </Panel>

      <Sheet open={inviteAsk} onClose={() => setInviteAsk(false)}>
        <InviteOptions what={p.title} onCreate={async (o) => { setInviteAsk(false); try {
          const l = await bix.link({ reference: `Initiative/${id}` }, ["view", "join-org"], o.preview, linkOpts(o)); setInviteUrl(`${appUrl()}/join/${l.token}`);
        } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } }} />
      </Sheet>
      <Sheet open={!!inviteUrl} onClose={() => setInviteUrl(null)}>
        <Text style={[t.row, { fontSize: 18 }]}>{`Invite volunteers to ${p.title}`}</Text>
        <Meta>Send this link. It works until it expires or you turn it off in Links and safety.</Meta>
        <View style={{ backgroundColor: c.wash, borderRadius: 16, padding: 12, marginTop: 12 }}><Text selectable style={{ fontSize: 13, color: c.ink }}>{inviteUrl}</Text></View>
        <Buttons><Primary label="Share" onPress={() => { Share.share({ message: `Help with ${p.title} on Dasig: ${inviteUrl}` }).catch(() => {}); }} /></Buttons>
      </Sheet>
      <Sheet open={editing} onClose={() => setEditing(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Edit project</Text>
        <Pressable onPress={async () => { const a = await pickPhoto(false).catch((e: any) => { setMsg(String(e?.message ?? e)); return null; }); if (a) setForm((f) => ({ ...f, image: a })); }}
          accessibilityRole="button" accessibilityLabel="Change the project's picture" style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
          {formLogo ? <Image source={{ uri: formLogo }} style={{ width: 64, height: 64, borderRadius: 16 }} /> : <IconCircle name="camera" size={64} />}
          <Text style={[t.row, { color: c.accent }]}>{form.image ? "Change picture" : "Add a picture"}</Text>
        </Pressable>
        <Field label="Name" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
        <Field label="What it's about" placeholder="What it is, who it's for, and why it matters" value={form.about} onChangeText={(v) => setForm((f) => ({ ...f, about: v }))} multiline />
        <Field label="Where" value={form.place} onChangeText={(v) => setForm((f) => ({ ...f, place: v }))} placeholder="e.g. Mactan Expo" />
        <Field label="Starts" value={form.start} onChangeText={(v) => setForm((f) => ({ ...f, start: v }))} placeholder="e.g. 2027-02-15" />
        <Text style={[t.eyebrow, { marginTop: 16, marginBottom: 8, marginHorizontal: 4 }]}>Who can see this project</Text>
        <VisibilityChoice value={form.vis} onChange={(v) => setForm((f) => ({ ...f, vis: v }))} cap={groupVis} />
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
