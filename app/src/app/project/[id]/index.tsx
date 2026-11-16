import { PlanCheck } from "@/ui/PlanCheck";
import { ErrorState } from "@/ui/ErrorState";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, Platform, Pressable, Share, Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { parseDate, short } from "@/lib/dates";
import { pickDocument, pickPhoto } from "@/lib/files";
import { useSession } from "@/lib/session";
import { useLoad, useNow } from "@/lib/use";
import { facesOf, peopleFor, placeOf, shortRef, teamIcon } from "@/lib/work";
import { Logo } from "@/ui/Context";
import { History } from "@/ui/History";
import { Files } from "@/ui/Files";
import { Updates } from "@/ui/Updates";
import { Body, Buttons, Eyebrow, Faces, Field, IconCircle, LinkText, Meta, Panel, Pill, Primary, RoundButton, Row, Sand, Screen, ScreenTitle, Sheet, Skeleton, usePhoto } from "@/ui/kit";
import { Count, ProgressRing, SharedCover, Segmented, StateChip, TabPane } from "@/ui/m3";
import { useSnackbar } from "@/ui/Snackbar";
import { atMost, InviteOptions, linkOpts, VisibilityChoice, visibilityFields, visibilityOf, type Visibility } from "@/ui/Privacy";
import { appUrl } from "@/lib/env";
import { c, scale, tone, type as t } from "@/ui/theme";

type Tab = "overview" | "work" | "teams" | "needs";

/** The project page (sketch: running-sketches #1, page anatomy §1b). */
export default function Project() {
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const [tab, setTab] = useState<Tab>("overview");
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
  if (error) return <Screen onRefresh={reload} back><ErrorState message={error} onRetry={reload} /></Screen>;
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
  const live = tasks.filter((k) => k.status !== "draft" && k.status !== "cancelled");
  const doneN = live.filter((k) => k.status === "completed").length;
  const late = live.filter((k) => k.status !== "completed" && k.due && Date.parse(k.due) < now);
  const places = (k: any) => (k.status === "ready" ? Math.max(0, Number(k.slots ?? 1) - ((k.participant ?? []) as any[]).filter((x) => x.status === "active").length) : 0);
  const openN = live.reduce((n, k) => n + places(k), 0);
  const days = p.period?.start ? Math.round((new Date(p.period.start).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
  const teamName = (k: any) => teams.find((x) => `Team/${x.id}` === k.team?.reference)?.name;
  const mineT = new Set(teams.filter((tm) => (tm.participant ?? []).some((x: any) => x.person.reference === `Person/${s.person?.id}` && x.status === "active")).map((tm) => `Team/${tm.id}`));
  const openW = lead ? [] : tasks.filter((k) => k.status === "ready" && !k.basedOn && k.team?.reference && !mineT.has(k.team.reference)).slice(0, 5);
  const workRow = (k: any, i: number, all: any[]) => <Row key={k.id} left={<IconCircle name={k.milestone ? "building" : "check"} tone={k.status === "completed" ? "grey" : "sand"} />} title={k.title}
    meta={[teamName(k), k.due ? `due ${short(k.due)}` : null, places(k) ? `${places(k)} open` : null].filter(Boolean).join(" · ")} onPress={() => router.push(`/task/${k.id}`)} last={i === all.length - 1}
    right={late.includes(k) ? <StateChip kind="late">Late</StateChip> : k.status === "completed" ? <StateChip kind="done">Done</StateChip> : places(k) ? <StateChip kind="open">Open</StateChip> : undefined} />;
  const group = (label: string, list: any[]) => list.length ? <><Eyebrow right={`${list.length}`}>{label}</Eyebrow><Panel>{list.map(workRow)}</Panel></> : null;
  return (
    <Screen onRefresh={reload} back here={{ kind: "project", project: p, tasks, teams, org, lead }} right={can.edit ? <RoundButton icon="pen" label="Edit project" onPress={edit} /> : undefined}
      add={lead && p.status !== "cancelled" ? { kind: "project", project: p, lead } : undefined}>
      <ScreenTitle>{p.title}</ScreenTitle>
      {/* The hero: one large visual, then the numbers that matter (UI_REIMAGINE §3). */}
      <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: c.white }}>
        <SharedCover id={p.id} style={{ height: 150, backgroundColor: tone.primaryContainer, alignItems: "center", justifyContent: "center" }}>
          {logo ? <Image source={{ uri: logo }} resizeMode="cover" style={{ width: "100%", height: "100%" }} /> : <IconCircle name="flag" size={72} tone="white" />}
        </SharedCover>
        <View style={{ padding: 16 }}>
          <Text style={[scale.display, { color: c.ink, fontSize: 24 }]}>{p.title}</Text>
          <Meta>{[p.period?.start ? short(p.period.start) : null, placeOf(p), p.status === "completed" ? "Done" : p.status === "cancelled" ? "Cancelled" : null].filter(Boolean).join(" · ")}</Meta>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 14 }}>
            <ProgressRing value={live.length ? doneN / live.length : 0} label={live.length ? `${Math.round((doneN / live.length) * 100)}%` : "–"} sub="done" size={60} />
            <View style={{ flex: 1, gap: 8 }}>
              {live.length ? <Text style={t.row}><Count value={doneN} />{` of ${live.length} done`}</Text> : <Text style={t.row}>No work added yet</Text>}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {days !== null && p.status === "active" ? <StateChip kind="open">{days < 0 ? `${-days} days ago` : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days to go`}</StateChip> : null}
                {late.length ? <StateChip kind="late"><Count value={late.length} suffix=" late" /></StateChip> : null}
                {openN ? <StateChip kind="open"><Count value={openN} suffix=" open" /></StateChip> : null}
              </View>
            </View>
          </View>
        </View>
      </View>
      <Segmented value={tab} onChange={setTab} tabs={[{ key: "overview", label: "Overview" }, { key: "work", label: "Work", count: live.length }, { key: "teams", label: "Teams", count: teams.length }, { key: "needs", label: "Needs", count: needs.length }]} />
      <TabPane id={tab}>
      {tab === "overview" ? <>
        {/* Plan check (§7.2e): leads see what needs them and what would make the plan better, first. */}
        {lead ? <PlanCheck project={p} tasks={tasks} teams={teams} org={org} onChanged={reload} /> : null}
        <View style={{ marginTop: 14 }}>{p.description ? <Body>{p.description}</Body> : can.edit ? <Text accessibilityRole="button" style={[t.meta, { color: c.accent, fontWeight: "600" }]} onPress={edit}>＋ Say what this project is about: what, for whom, and why</Text> : null}</View>
        <View style={{ marginTop: 12 }}><Panel>
          {org ? <Row left={<Logo name={org.name} image={org.image} size={36} />} title={org.name} meta="About the group" onPress={() => router.push(`/org/${org.id}` as never)} /> : null}
          {(() => { const f = facesOf([...people], folks);
            return <Row left={f.names.length ? <View style={{ width: 64 }}><Faces {...f} /></View> : <IconCircle name="users" />} title={`${people.size} ${people.size === 1 ? "person" : "people"}`} meta={`${teams.length} team${teams.length === 1 ? "" : "s"}`} last onPress={() => setTab("teams")} />; })()}
        </Panel></View>

        {gates.map((g) => <View key={g.id} style={{ marginTop: 14 }}><Sand><IconCircle name="building" tone="white" />
          <View style={{ flex: 1 }}><Text style={[t.eyebrow, { marginBottom: 2 }]}>Gate</Text><Text style={t.row}>{g.title}</Text><Meta>{`${blocked(g)} task${blocked(g) === 1 ? "" : "s"} wait on this`}</Meta></View>
          <Text accessibilityRole="button" style={{ fontWeight: "600", textDecorationLine: "underline", color: c.ink }} onPress={() => router.push(`/task/${g.id}`)}>Open</Text></Sand></View>)}
        {openVotes.map((d) => <View key={d.id} style={{ marginTop: 12 }}><Panel><Row left={<IconCircle name="flag" />} title={d.question} meta="Vote open" right={<Pill tone="state">Vote</Pill>} onPress={() => router.push(`/vote/${d.id}` as never)} last /></Panel></View>)}
        {/* Open in other teams (teamwork D10): where help is needed, beyond your own team. */}
        {openW.length ? <><Eyebrow right={`${openW.length}`}>Open in other teams</Eyebrow><Panel>{openW.map((k, i) => { const tm = teams.find((x) => `Team/${x.id}` === k.team.reference); const n = Number(k.slots ?? 1);
          return <Row key={k.id} left={<IconCircle name={n > 1 ? "users" : "pen"} />} title={k.title} meta={[tm?.name, n > 1 ? `${places(k)} place${places(k) === 1 ? "" : "s"}` : k.taking === "ask" ? "lead's call" : null].filter(Boolean).join(" · ")}
            right={<Pill>{k.taking === "ask" ? "Ask to do" : "I'm in"}</Pill>} onPress={() => router.push(`/task/${k.id}`)} last={i === openW.length - 1} />; })}</Panel></> : null}
        {p.status === "cancelled" ? <View style={{ marginTop: 12 }}><Sand><IconCircle name="pending" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>This project was cancelled</Text>
          <Meta>Its work, people and history are kept, so you can look back. Nothing new can be added.</Meta></View></Sand></View> : null}
        {/* Photos, files and updates, in sight (Don, 2026-11-16): they were under everything else, or behind the round +. */}
        {(p.attachment ?? []).length || can.edit ? <><Eyebrow right={(p.attachment ?? []).length ? `${(p.attachment ?? []).length}` : undefined}>Photos and files</Eyebrow><Files hint="Add a photo, a brief or a document for the project" items={p.attachment ?? []} onAdd={can.edit ? () => setAddingFile(true) : undefined} onRemove={can.edit ? removeFile : undefined} /></> : null}
        {(p.note ?? []).length || can.edit ? <><Eyebrow right={(p.note ?? []).length ? `${(p.note ?? []).length}` : undefined}>Updates</Eyebrow>
          <Updates notes={p.note ?? []} hint="Say how the project is going" onPost={can.edit && s.person ? (text) => run(bix.next(p, { note: [...(p.note ?? []), { author: { reference: `Person/${s.person!.id}` }, time: new Date().toISOString(), text }] }), "Posted.") : undefined} /></> : null}
        <Eyebrow>More</Eyebrow>
        <Panel>
          <Row left={<IconCircle name="cal" />} title="Timeline" meta="Work by week, with gates" onPress={() => router.push(`/project/${id}/timeline` as never)} />
          {lead ? <Row left={<IconCircle name="check" />} title="Event day" meta="Check people in, see what's still open" onPress={() => router.push(`/project/${id}/day` as never)} /> : null}
          {lead ? <Row left={<IconCircle name="receipt" />} title="Report" meta="Where it stands or how it went, with photos; saves as a PDF" onPress={() => router.push(`/project/${id}/report` as never)} /> : null}
          <Row left={<IconCircle name="heart" />} title="Credits" meta="Everyone who made it happen" onPress={() => router.push(`/project/${id}/credits` as never)} />
          {lead && groupVis !== "group" ? <Row left={<IconCircle name="userplus" />} title="Invite volunteers" meta={visibilityOf(p) === "public" ? "A link to this project; they choose a team" : "A private link; the project stays hidden"} onPress={() => setInviteAsk(true)} /> : null}
          {lead ? <Row left={<IconCircle name="flag" />} title="Start a vote" meta="Decide something together" onPress={() => router.push({ pathname: "/vote/new" as never, params: { project: id } })} /> : null}
          {lead ? <Row left={<IconCircle name="repeat" />} title={p.status === "completed" ? "Wrapped up" : "Wrap up the project"} meta="Report, credits, save these teams" onPress={() => router.push(`/project/${id}/wrap` as never)} last /> : null}
        </Panel>
        {/* History: one quiet line at the bottom, the timeline in a sheet (2026-11-15). */}
        <History type="Initiative" id={p.id} groupName={org?.name} version={p.meta.version} />
      </> : null}

      {tab === "work" ? <>
        {live.length ? <>
          {group("Late", late)}
          {group("Open places", live.filter((k) => places(k) > 0 && !late.includes(k)))}
          {group("In progress", live.filter((k) => k.status !== "completed" && places(k) === 0 && !late.includes(k)))}
          {group("Done", live.filter((k) => k.status === "completed").slice(0, 10))}
        </> : <View style={{ marginTop: 14 }}><Sand><IconCircle name="pen" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>No work added yet</Text><Meta>Add the first tasks, then teams and people fill them.</Meta></View></Sand>
          {lead ? <Buttons><Primary label="Add work" onPress={() => router.push(`/project/${p.id}/plan` as never)} /></Buttons> : null}</View>}
      </> : null}

      {tab === "teams" ? <>
        {lead && teams.length ? <View style={{ marginTop: 14 }}><Panel><Row left={<IconCircle name="pen" />} title="Edit the plan" meta="Add work to every team in one list" onPress={() => router.push(`/project/${p.id}/plan` as never)} last /></Panel></View> : null}
        <Panel style={{ marginTop: 14 }}>
          {teams.map((x, i) => {
            const mine = tasks.filter((k) => k.team?.reference === `Team/${x.id}` && k.status !== "draft" && k.status !== "cancelled");
            const dn = mine.filter((k) => k.status === "completed").length;
            const fc = facesOf(activeOf(x), folks);
            return <Row key={x.id} left={mine.length ? <ProgressRing size={44} value={dn / mine.length} label={`${dn}/${mine.length}`} /> : <IconCircle name={teamIcon(x.name)} />} title={x.name} last={i === teams.length - 1} onPress={() => router.push(`/team/${x.id}`)}
              meta={mine.length ? `${dn} of ${mine.length} done` : (x.participant ?? []).some((y: any) => y.role === "lead" && y.status === "active") ? "Add its first task" : "Ask someone to lead"}
              right={fc.names.length ? <Faces {...fc} /> : undefined} />;
          })}
        </Panel>
      </> : null}

      {tab === "needs" ? <>
        <Eyebrow right={needs.length ? `${needs.length}` : undefined}>What we need</Eyebrow>
        <Panel>
          {needs.map((n) => { const got = n.received?.value ?? 0, want = n.quantity?.value ?? 0;
            return <Row key={n.id} left={<IconCircle name="box" />} title={n.category?.display ?? "Something"} meta={[want ? `${got} of ${want} ${n.quantity?.unit ?? ""}` : null, n.neededBy ? `by ${short(n.neededBy)}` : null, shortRef(n)].filter(Boolean).join(" · ")}
              right={<StateChip kind={n.status === "met" ? "done" : "open"}>{n.status === "met" ? "Covered" : n.status === "partially-met" ? "Partly" : "Open"}</StateChip>} onPress={() => router.push(`/need/${n.id}` as never)} />; })}
          <Row left={<IconCircle name="plus" tone="grey" />} title={lead ? "Post a need" : "See what's needed"} meta="Goods, a venue, a skill, people" onPress={() => router.push({ pathname: "/need/new" as never, params: { project: id } })} last />
        </Panel>
      </> : null}
      </TabPane>

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
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Add to the project&apos;s files</Text>
        <Panel style={{ backgroundColor: c.wash }}>
          <Row left={<IconCircle name="camera" tone="white" />} title="Photo" onPress={() => addFile(() => pickPhoto(false, org?.id))} />
          <Row left={<IconCircle name="receipt" tone="white" />} title="Document" meta="Brief, budget, deck" onPress={() => addFile(() => pickDocument(org?.id))} last />
        </Panel>
      </Sheet>
    </Screen>
  );
}
