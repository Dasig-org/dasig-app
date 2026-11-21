import { AddPeople } from "@/ui/AddPeople";
import { AddSheet } from "@/ui/AddSheet";
import { AnswerRow } from "@/ui/Answer";
import { suggester, act, shortRef, stateLabel, teamIcon, places } from "@/lib/work";
import { ErrorState } from "@/ui/ErrorState";
import { short } from "@/lib/dates";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, Share, Text, View } from "react-native";
import { QR as QRCode } from "@/ui/QR";
import { pairUrl } from "@/lib/pairing";
import { getConnection } from "@/lib/connection";
import { bix, type R } from "@/lib/bix";
import { appUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { useLoad, useNow } from "@/lib/use";
import { pickDocument, pickPhoto } from "@/lib/files";
import { Files } from "@/ui/Files";
import { Updates } from "@/ui/Updates";
import { ago } from "@/ui/Where";
import { FaceGrid } from "@/ui/m3";
import { Avatar, Buttons, Check, Eyebrow, Faces, Field, IconCircle, LinkText, Meta, Outline, Panel, Pill, Primary, RoundButton, Row, Sand, Screen, Sheet, Skeleton } from "@/ui/kit";
import { InviteOptions, linkOpts, type InviteOpts } from "@/ui/Privacy";
import { c, type as t } from "@/ui/theme";
import { useSnackbar } from "@/ui/Snackbar";

/**
 * A team, in two views.
 * "work": the team's tasks first. While the team is still being set up (no work, nobody but the lead) the full roster shows;
 *   after that it shrinks to one line of faces that opens the people view. Invite lives in the header.
 * "people": lead, members, volunteers and the invite.
 */
export default function Team({ view = "work" }: { view?: "work" | "people" }) {
  const [addPeople, setAddPeople] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [title, setTitle] = useState("");
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const [invite, setInvite] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<null | R[]>(null);
  const [optsOpen, setOptsOpen] = useState(false);
  const [askFor, setAskFor] = useState<R | null>(null);
  const [addingFile, setAddingFile] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const now = useNow();
  const { data, error, reload } = useLoad(async () => {
    const team = await bix.get("Team", id);
    const tasks = await bix.search("Task", { team: `Team/${id}` });
    const parts = (team.participant ?? []).filter((p: any) => p.status === "active");
    const asking = (team.participant ?? []).filter((p: any) => p.status === "requested");
    const people: Record<string, R> = {};
    for (const p of [...parts, ...asking]) { try { people[p.person.reference] = await bix.get("Person", p.person.reference.split("/")[1]); } catch {} }
    // Who suggested each idea (its note, else its history), named and not "Someone".
    const by: Record<string, string> = {};
    for (const x of tasks.filter((t) => t.status === "draft")) { const r = await suggester(x); if (r) { by[x.id] = r; if (!people[r]) { try { people[r] = await bix.get("Person", r.split("/")[1]!); } catch {} } } }
    // Its project and group, so Ask Bayani here knows the team's work and what it's part of.
    const [project, org] = await Promise.all([team.initiative?.reference ? bix.get("Initiative", team.initiative.reference.split("/")[1]).catch(() => null) : null,
      team.organization?.reference ? bix.get("Organization", team.organization.reference.split("/")[1]).catch(() => null) : null]);
    return { team, tasks, parts, people, asking, by, project, org };
  }, [id]);
  if (error) return <Screen onRefresh={reload} back><ErrorState message={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen onRefresh={reload} back><Skeleton /></Screen>;
  const { team, tasks, parts, people, asking, by, project, org } = data;
  const name = (ref: string) => people[ref]?.name?.text ?? "Someone";
  const leadsIt = parts.some((p: any) => p.person.reference === me && p.role === "lead");
  // Rights come from the team's own group, not the group chosen in the pill (bug found in the multi-person test).
  const orgId = team.organization?.reference?.split("/")[1];
  const myGroup = s.groups.find((g) => g.org.id === orgId);
  const coreHere = !!myGroup && ["officer", "core-member"].includes(myGroup.role.code?.code);
  const lead = leadsIt || coreHere;
  const mine = (team.participant ?? []).find((p: any) => p.person.reference === me);
  const onTeam = mine?.status === "active", askedToJoin = mine?.status === "requested";
  const setMe = async (entry: any | null, ok: string) => {
    try { const fresh = await bix.get("Team", id); const others = (fresh.participant ?? []).filter((p: any) => p.person.reference !== me);
      await bix.commit(bix.next(fresh, { participant: entry ? [...others, entry] : others })); setMsg(ok); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  const byRole = (r: string) => parts.filter((p: any) => p.role === r).map((p: any) => name(p.person.reference));
  const photosOf = (r: string) => parts.filter((p: any) => p.role === r).map((p: any) => people[p.person.reference]?.photo);
  const who = (n: string[], ph?: any[]) => (n.length ? <View style={{ width: 54 }}><Faces names={n} photos={ph} /></View> : <View style={{ width: 54 }}><IconCircle name="users" tone="grey" size={30} /></View>);
  const ideas = tasks.filter((x) => x.status === "draft");
  const work = tasks.filter((x) => x.status !== "draft" && x.status !== "cancelled");

  /** Someone asked to join through an approval link: accept makes them a volunteer here (and in the group, if you may). */
  const answer = async (who: string, yes: boolean) => {
    try {
      const fresh = await bix.get("Team", id);
      const rest = (fresh.participant ?? []).filter((p: any) => !(p.person.reference === who && p.status === "requested"));
      await bix.commit(bix.next(fresh, { participant: yes ? [...rest, { person: { reference: who }, role: "volunteer", status: "active" }] : rest }));
      if (yes && team.organization) {
        const roles = (await bix.search("Role", { person: who, organization: team.organization.reference })).filter((r) => r.status === "requested");
        for (const r of roles) { try { await bix.commit(bix.next(r, { status: "active" })); } catch {} }
      }
      setMsg(yes ? `${name(who)} joined ${team.name}.` : "Request declined.");
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    reload();
  };
  const add = async () => {
    if (!title.trim()) return;
    const task = bix.create("Task", { intent: lead ? "plan" : "proposal", status: lead ? "ready" : "draft", title: title.trim(), owner: { reference: `Team/${id}` }, team: { reference: `Team/${id}` }, partOf: team.initiative, audience: "team",
      ...(lead ? {} : { note: [{ author: { reference: me }, time: new Date().toISOString(), text: "Suggested" }] }) });
    try { await bix.commit(task); setTitle(""); setMsg(lead ? "Added under Needs someone. Tap Assign to ask someone." : "Suggested. Your lead will see it."); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    reload();
  };
  const makeInvite = async (o?: InviteOpts) => {
    if (!o) { setOptsOpen(true); return; }
    setOptsOpen(false);
    try {
      const l = await bix.link({ reference: `Team/${id}` }, ["view", "join-team"], o.preview, linkOpts(o));
      const conn = await getConnection();
      if (Platform.OS !== "web" && conn.kind !== "cloud" && l.pairingCode !== undefined) {
        // On a hub: one QR pairs the phone with the hub and joins the team.
        const { localEngine } = await import("@/local/engine");
        const hub = conn.kind === "hub" ? conn.url : await (await localEngine()).startHub();
        setQr(pairUrl({ hub, code: l.pairingCode, link: l.token }));
        setInvite(pairUrl({ hub, code: l.pairingCode, link: l.token }));
      } else setInvite(`${appUrl()}/join/${l.token}`);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  const setTeamField = async (f: Record<string, unknown>) => { try { await bix.commit(bix.next(team, f)); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  /*
   * The team's work at a glance (Don, 2026-11-16: "track completion status and activity within the team"): what needs
   * someone, what's under way, what's done; then what happened lately, from the steps' own records.
   */
  const on = (x: R) => ((x.participant ?? []) as any[]).filter((p) => p.status === "active");
  const isLate = (x: R) => x.status !== "completed" && !!x.due && Date.parse(x.due) < now;
  const byDue = (a: R, b: R) => String(a.due ?? "9999").localeCompare(String(b.due ?? "9999"));
  const done = work.filter((x) => x.status === "completed");
  const needs = work.filter((x) => x.status === "ready" && (on(x).length === 0 || places(x).left > 0)).sort(byDue);
  const going = work.filter((x) => x.status !== "completed" && !needs.includes(x)).sort(byDue);
  const late = work.filter(isLate).length;
  const share = work.length ? Math.round((done.length / work.length) * 100) : 0;
  const activity = [
    ...work.map((x) => ({ at: String((x.meta as any)?.lastUpdated ?? ""), id: x.id, who: on(x).map((p) => name(p.person.reference)).join(", "),
      text: x.status === "completed" ? `Finished “${x.title}”` : x.status === "accepted" || x.status === "in-progress" ? `Took “${x.title}”` : x.status === "requested" ? `Asked about “${x.title}”` : `Added “${x.title}”` })),
    ...work.flatMap((x) => ((x.note ?? []) as any[]).filter((n) => n.text && n.time).map((n) => ({ at: String(n.time), id: x.id, who: name(n.author?.reference ?? ""), text: `“${n.text}” on ${x.title}` }))),
  ].filter((a) => a.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  const canPost = onTeam || lead;
  const addFile = async (pick: () => Promise<any>) => { setAddingFile(false); const a = await pick().catch((e: any) => { setMsg(String(e?.message ?? e)); return null; }); if (a) setTeamField({ attachment: [...(team.attachment ?? []), a] }); };
  const workRow = (x: R, i: number, list: R[], assign?: boolean) => <Row key={x.id} last={i === list.length - 1} left={<IconCircle name={x.status === "completed" ? "check" : isLate(x) ? "clock" : "pen"} tone={x.status === "completed" ? "grey" : "sand"} />} title={x.title}
    meta={[lead ? shortRef(x) : null, x.due ? (isLate(x) ? `late · was due ${short(x.due)}` : `due ${short(x.due)}`) : "no date", on(x).map((p) => name(p.person.reference)).join(", ") || null].filter(Boolean).join(" · ")}
    right={assign && lead && orgId ? <Outline label="Assign" onPress={() => setAskFor(x)} />
      : <Pill tone={places(x).shift && x.status === "ready" ? "neutral" : stateLabel(x, me).tone}>{places(x).shift && x.status === "ready" ? `${places(x).left} of ${places(x).n} left` : stateLabel(x, me).label}</Pill>} onPress={() => router.push(`/task/${x.id}`)} />;
  const setup = work.length === 0 && parts.length <= 1;
  const everyone = parts.map((p: any) => name(p.person.reference));
  const count = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : null);
  const summary = (
    <View style={{ marginTop: 14 }}><Panel>
      <Row left={everyone.length ? <View style={{ width: 54 }}><Faces names={everyone} photos={parts.map((p: any) => people[p.person.reference]?.photo)} /></View> : <IconCircle name="users" tone="grey" />}
        title={byRole("lead").length ? `${byRole("lead")[0]} leads` : "No lead yet"}
        meta={[count(byRole("member").length, "member", "members"), count(byRole("volunteer").length, "volunteer", "volunteers")].filter(Boolean).join(" · ") || "Just the lead so far"}
        onPress={() => router.push(`/team/${id}/people`)} last />
    </Panel></View>
  );
  const roster = (<>
      <Eyebrow right={lead ? undefined : undefined}>The team</Eyebrow>
      {parts.length > 1 ? <View style={{ marginBottom: 10 }}><FaceGrid people={parts.map((p: any) => ({ key: p.person.reference, name: name(p.person.reference), photo: people[p.person.reference]?.photo, role: p.role === "lead" ? "Lead" : undefined }))} /></View> : null}
      <Panel>
        <Row left={who(byRole("lead"), photosOf("lead"))} title="Lead" meta={byRole("lead").join(", ") || (s.isLead ? "No lead yet · tap to choose" : "No lead yet")}
          onPress={s.isLead ? async () => {
            const org = team.organization?.reference;
            const roles = org ? (await bix.search("Role", { organization: org })).filter((r) => r.status === "active") : [];
            const ps: R[] = [];
            // One row per person: someone can hold more than one Role in the group (an officer who also volunteers).
            const refs = [...new Set(roles.map((r) => r.person.reference as string))];
            for (const ref of refs) { try { ps.push(await bix.get("Person", ref.split("/")[1]!)); } catch {} }
            setChoosing(ps);
          } : undefined} />
        <Row left={who(byRole("member"), photosOf("member"))} title="Members" meta={byRole("member").join(", ") || "None yet"} />
        <Row left={who(byRole("volunteer"), photosOf("volunteer"))} title="Volunteers" meta={byRole("volunteer").join(", ") || "None yet"} last />
      </Panel>
      <Buttons><Outline flex label={parts.length > 1 ? "Add more people" : "Add your team"} onPress={() => (orgId ? setAddPeople(true) : makeInvite())} /></Buttons>
      {/* BIX "Seeing other committees' work": who sees this team's work, and what this team sees. Leads and officers set it. */}
      <Eyebrow>Who sees what</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="eye" />} title="Who sees this team's work" meta={team.visibility === "team" ? "Only this team, and officers and core members" : "Core team members on the project, and this team"}
          right={lead ? <Check on={team.visibility === "team"} onPress={() => setTeamField({ visibility: team.visibility === "team" ? undefined : "team" })} /> : undefined} />
        <Row left={<IconCircle name="users" />} title="This team sees the whole project" meta={team.access === "initiative" ? "On, so its volunteers can open every team's work, as Communications needs" : "Off. Its volunteers see this team's work only"}
          right={lead ? <Check on={team.access === "initiative"} onPress={() => setTeamField({ access: team.access === "initiative" ? "own-tasks" : "initiative" })} /> : undefined} last />
      </Panel>
      {lead ? <Meta>{"\nTick to keep this team's work to itself, or to let its volunteers see the whole project."}</Meta> : null}
  </>);
  return (
    <Screen onRefresh={reload} back here={{ kind: "team", team, tasks, project, org, lead, people }} right={<View style={{ flexDirection: "row", gap: 8 }}><RoundButton icon="userplus" label="Add people" onPress={() => (orgId ? setAddPeople(true) : makeInvite())} />
      {lead ? <RoundButton icon="plus" label="Add" onPress={() => setAddOpen(true)} /> : null}</View>}
      dock={view === "work" ? <Field value={title} onChangeText={setTitle} placeholder={lead ? "Add a task for this team" : "Suggest a task"} onSubmitEditing={add} submitBehavior="submit" returnKeyType="done" /> : undefined}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name={teamIcon(team.name)} size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{view === "people" ? "People" : leadsIt ? "You lead it" : s.isLead ? "Your group's team" : "Team"}</Meta><Text style={[t.title, { fontSize: 24 }]}>{team.name}</Text>{team.description ? <Meta>{team.description}</Meta> : null}</View></View>
      {/* Join this team (teamwork sketches B4, B5): core members join at once; others in the group ask the lead. */}
      {!onTeam && !askedToJoin && myGroup ? <View style={{ marginTop: 14 }}>
        <Buttons><Primary label={coreHere ? "Join this team" : "Ask to join"} onPress={() => setMe({ person: { reference: me }, role: coreHere ? "member" : "volunteer", status: coreHere ? "active" : "requested" },
          coreHere ? `You're on ${team.name}.` : "Asked. The lead will see it in their Inbox.")} /></Buttons>
        <Meta>{coreHere ? "You're on the core team, so you join right away." : "Open places you can still take without joining."}</Meta></View> : null}
      {askedToJoin ? <View style={{ marginTop: 14 }}><Sand><IconCircle name="pending" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>You asked to join</Text>
        <Meta>{(team.participant ?? []).some((p: any) => p.role === "lead" && p.status === "active") ? "The lead will see it in their Inbox" : "The core team will see it in their Inbox"}</Meta></View>
        <LinkText onPress={() => setMe(null, "Request cancelled.")}>Cancel</LinkText></Sand></View> : null}
      {lead && asking.length ? <><Eyebrow right={`${asking.length}`}>Asking to join</Eyebrow><Panel>{asking.map((p: any, i: number) => <AnswerRow key={p.person.reference} first={i === 0} left={<Avatar name={name(p.person.reference)} photo={people[p.person.reference]?.photo} />}
        title={name(p.person.reference)} meta="Wants to join this team" onYes={() => answer(p.person.reference, true)} onNo={() => answer(p.person.reference, false)} />)}</Panel></> : null}
      {view === "work" && lead && ideas.length ? <View style={{ marginTop: 14 }}><Panel>{ideas.map((x, i) => <AnswerRow key={x.id} first={i === 0} left={<IconCircle name="spark" />} title={x.title}
        meta={`An idea · suggested by ${name(by[x.id] ?? x.note?.[0]?.author?.reference ?? "")}`} yesLabel="Accept" onYes={async () => { try { await bix.commit(act.accept(x)); } catch {} reload(); }} />)}</Panel></View> : null}
      {view === "people" || setup ? roster : summary}
      {view === "work" ? <>
      {/* Where the team stands: one bar, and the three numbers a lead asks about. */}
      {work.length ? <View style={{ marginTop: 12, backgroundColor: c.white, borderRadius: 24, padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}><Text style={[t.title, { fontSize: 22 }]}>{`${done.length} of ${work.length} done`}</Text><Text style={t.meta}>{`${share}%`}</Text></View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.s200, overflow: "hidden", marginTop: 10 }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: share }}><View style={{ height: 8, width: `${share}%`, borderRadius: 4, backgroundColor: c.accent }} /></View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <Pill tone={needs.length ? "state" : "neutral"}>{`${needs.length} need${needs.length === 1 ? "s" : ""} someone`}</Pill><Pill>{`${going.length} under way`}</Pill>{late ? <Pill tone="state">{`${late} late`}</Pill> : null}</View>
      </View> : null}
      {needs.length ? <><Eyebrow right={`${needs.length}`}>Needs someone</Eyebrow><Panel>{needs.map((x, i, l) => workRow(x, i, l, true))}</Panel>
        {lead ? <Meta>{"\nAssign asks someone by name; they get it in their Inbox. Or leave it open for the team to take."}</Meta> : null}</> : null}
      {going.length ? <><Eyebrow right={`${going.length}`}>Under way</Eyebrow><Panel>{going.map((x, i, l) => workRow(x, i, l))}</Panel></> : null}
      {done.length ? <><Eyebrow right={showDone ? "Hide" : `Show ${done.length}`} onRightPress={() => setShowDone(!showDone)}>Done</Eyebrow>
        {showDone ? <Panel>{done.map((x, i, l) => workRow(x, i, l))}</Panel> : null}</> : null}
      {work.length ? null : <><Eyebrow>Our work</Eyebrow><Panel><Row title="Nothing yet" meta={lead ? "Add the first task below, then assign it" : "Suggest something below"} last /></Panel></>}

      {/* Photos, files and updates for the team (BIX Team.attachment[], Team.note[]), for the people on it. */}
      {(team.attachment ?? []).length || canPost ? <><Eyebrow right={(team.attachment ?? []).length ? `${(team.attachment ?? []).length}` : undefined}>Photos and files</Eyebrow>
        <Files hint="Add a photo, a list or a document for the team" items={team.attachment ?? []} onAdd={canPost ? () => setAddingFile(true) : undefined} onRemove={lead ? (a) => setTeamField({ attachment: (team.attachment ?? []).filter((x: any) => x.hash !== a.hash) }) : undefined} /></> : null}
      {(team.note ?? []).length || canPost ? <><Eyebrow right={(team.note ?? []).length ? `${(team.note ?? []).length}` : undefined}>Updates</Eyebrow>
        <Updates notes={team.note ?? []} hint="Tell the team how it's going" onPost={canPost ? (text) => setTeamField({ note: [...(team.note ?? []), { author: { reference: me }, time: new Date().toISOString(), text }] }) : undefined} /></> : null}
      {activity.length ? <><Eyebrow>Lately</Eyebrow><Panel>{activity.map((a, i) => <Row key={`${a.id}${a.at}${i}`} left={<IconCircle name="pending" tone="grey" />} title={a.text} meta={[a.who || null, ago(Date.parse(a.at), now)].filter(Boolean).join(" · ")} onPress={() => router.push(`/task/${a.id}`)} last={i === activity.length - 1} />)}</Panel></> : null}
      </> : null}
      {onTeam && !leadsIt && view === "work" ? <View style={{ alignItems: "center", marginTop: 16 }}><LinkText onPress={() => setMe({ ...mine, status: "ended" }, `You left ${team.name}.`)}>Leave this team</LinkText></View> : null}
      {/* The "+" at the top: what a lead can add to this team (ui/AddSheet). */}
      <AddSheet open={addOpen} onClose={() => setAddOpen(false)} ctx={{ kind: "team", team, lead }} />
      {/* Assign a step from the list: the same "ask someone" as on the step's own page. */}
      {orgId && askFor ? <AddPeople open onClose={() => { setAskFor(null); reload(); }} orgId={orgId} target={{ kind: "task", task: askFor, teamName: team.name }} onSomeoneNew={() => makeInvite()} /> : null}
      <Sheet open={addingFile} onClose={() => setAddingFile(false)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Add a photo or file</Text>
        <Panel style={{ backgroundColor: c.wash }}>
          <Row left={<IconCircle name="camera" tone="white" />} title="Photo" meta="Kept by your group" onPress={() => addFile(() => pickPhoto(false, orgId))} />
          <Row left={<IconCircle name="smile" tone="white" />} title="Photo that shows children" meta="Never leaves the group" onPress={() => addFile(() => pickPhoto(true, orgId))} />
          <Row left={<IconCircle name="receipt" tone="white" />} title="Document" meta="PDF, Word, Excel, text" onPress={() => addFile(() => pickDocument(orgId))} last />
        </Panel>
      </Sheet>
      {orgId ? <AddPeople open={addPeople} onClose={() => { setAddPeople(false); reload(); }} orgId={orgId} target={{ kind: "team", team }} onSomeoneNew={() => makeInvite()} /> : null}
      <Sheet open={!!choosing} onClose={() => setChoosing(null)}>
        <Text style={[t.row, { fontSize: 18 }]}>{`Who leads ${team.name}?`}</Text>
        <Meta>Leads hand out work and accept ideas for this team.</Meta>
        <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>
          {(choosing ?? []).map((p, i) => <Row key={p.id} left={<Avatar name={p.name?.text ?? "?"} photo={p.photo} />} title={p.name?.text ?? "Someone"} last={i === (choosing?.length ?? 0) - 1}
            onPress={async () => { setChoosing(null); try {
              const others = (team.participant ?? []).filter((x: any) => x.person.reference !== `Person/${p.id}`);
              await bix.commit(bix.next(team, { participant: [...others, { person: { reference: `Person/${p.id}` }, role: "lead", status: "active" }] })); setMsg(`${p.name?.text} now leads ${team.name}.`); reload();
            } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } }} />)}
        </Panel>
      </Sheet>

      <Sheet open={optsOpen} onClose={() => setOptsOpen(false)}><InviteOptions what={team.name} onCreate={(o) => makeInvite(o)} /></Sheet>

      <Sheet open={!!invite} onClose={() => { setInvite(null); setQr(null); }}>
        <Text style={[t.row, { fontSize: 18 }]}>{`Invite people to ${team.name}`}</Text>
        <Meta>{qr ? "Have them join this phone's hotspot, then scan this in Dasig (Join a group). It connects them to the hub and adds them to the team." : "Anyone with this link can see the team and join it as a volunteer. You can turn it off later."}</Meta>
        {qr ? <View style={{ alignItems: "center", marginTop: 14 }}><QRCode value={qr} size={200} color={c.ink} backgroundColor={c.white} /></View> : null}
        {qr ? null : <View style={{ backgroundColor: c.wash, borderRadius: 16, padding: 12, marginTop: 12 }}><Text selectable style={{ fontSize: 13, color: c.ink }}>{invite}</Text></View>}
        <Buttons><Primary label={qr ? "Share the code as text" : "Share"} onPress={() => { Share.share({ message: `Join ${team.name} in Dasig: ${invite}` }).catch(() => {}); }} /></Buttons>
      </Sheet>
    </Screen>
  );
}
