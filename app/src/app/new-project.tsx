import { PlaceField, placeExtensions, type PlaceValue } from "@/ui/PlaceField";
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, Share, Text, View } from "react-native";
import { bix, ref, type R } from "@/lib/bix";
import { DAY, parseDate } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { pickPhoto, type Attachment } from "@/lib/files";
import { KINDS, relative, type Kind, type Work } from "@/lib/kinds";
import { isCoreTeam } from "@/lib/org";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { peopleFor, personName } from "@/lib/work";
import { Avatar, Buttons, Check, Field, IconCircle, LinkText, Meta, Notice, Outline, Panel, Primary, Row, Screen, Sheet, Title, usePhoto } from "@/ui/kit";
import { atMost, visibilityFields, visibilityOf } from "@/ui/Privacy";
import { c, radius, type as t } from "@/ui/theme";

/*
 * Set up an event in one sitting (workspace/design/coordinator-sketches.html, B5–B9): what kind, when and where with a
 * cover, teams with leads from the core team, then the whole plan of work in one list with relative dates and places.
 * Creates the Initiative, its Teams and Tasks together. Fixes audit findings 3, 6, 7, 8.
 */
type TeamDraft = { name: string; icon: Kind["teams"][number]["icon"]; lead: string | null; keep: boolean; work: (Work & { keep: boolean })[] };
const parseTime = (s: string) => { const d = new Date(s.trim().replace(" ", "T")); return s.trim() && !isNaN(d.getTime()) ? d : parseDate(s) ? new Date(parseDate(s)!) : null; };

export default function NewEvent() {
  const s = useSession();
  const { org } = useLocalSearchParams<{ org?: string }>();
  const orgId = org ?? s.current?.id;
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");
  const [kind, setKind] = useState<Kind | null>(null);
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState<PlaceValue>({ text: "" });
  const place = where.text;
  const [cover, setCover] = useState<Attachment | null>(null);
  const [teams, setTeams] = useState<TeamDraft[]>([]);
  const [picking, setPicking] = useState<number | null>(null);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<R | null>(null);
  const coverUri = usePhoto(cover);
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data: core } = useLoad(async () => {
    if (!orgId) return [];
    const roles = (await bix.search("Role", { organization: `Organization/${orgId}` })).filter((r) => r.status === "active" && isCoreTeam(r.code?.code));
    const ppl = await peopleFor(roles.map((r) => r.person.reference), 20);
    return roles.map((r) => ({ ref: r.person.reference as string, p: ppl[r.person.reference] }));
  }, [orgId]);
  const nameOf = (r: string | null) => (r === me ? "You" : personName(core?.find((x) => x.ref === r)?.p));
  const date = parseTime(when);

  const chooseKind = (k: Kind) => {
    setKind(k);
    setTeams(k.teams.map((x, i) => ({ name: x.name, icon: x.icon, lead: x.name === "Communications" || (i === 0 && k.code === "other") ? me : null, keep: true, work: x.work.map((w) => ({ ...w, keep: true })) })));
  };
  const addPasted = (ti: number) => {
    const lines = paste.split("\n").map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
    if (!lines.length) return;
    setTeams((ts) => ts.map((x, i) => (i === ti ? { ...x, work: [...x.work, ...lines.map((title) => ({ title, before: 7, keep: true }))] } : x))); setPaste("");
  };

  const create = async () => {
    if (!orgId || !s.person || !kind) return;
    setBusy(true); setErr(null);
    try {
      const groupVis = visibilityOf(s.groups.find((g) => g.org.id === orgId)?.org);
      const ini = bix.create("Initiative", { title: title.trim(), kind: "project", status: "active", organization: { reference: `Organization/${orgId}` }, ...visibilityFields(null, atMost(groupVis, groupVis)),
        category: [{ system: "bayanihan:event-kind", code: kind.code, display: kind.label }],
        ...(date ? { period: { start: date.toISOString() } } : {}), ...(about.trim() ? { description: about.trim() } : {}), ...(cover ? { image: cover } : {}),
        ...(place.trim() ? { extension: placeExtensions(where) } : {}) });
      const kept = teams.filter((x) => x.keep);
      const teamRecs = kept.map((x) => bix.create("Team", { name: x.name, organization: { reference: `Organization/${orgId}` }, initiative: ref(ini), kind: "initiative", status: "active",
        access: x.name === "Communications" ? "initiative" : "own-tasks", participant: x.lead ? [{ person: { reference: x.lead }, role: "lead", status: "active" }] : [] }));
      await bix.commit(ini, ...teamRecs);
      // Within a team, work after a gate waits on it (e.g. nothing on the route before the permit).
      const tasks = kept.flatMap((x, i) => { const ws = x.work.filter((w) => w.keep); const ids = ws.map(() => crypto.randomUUID());
        return ws.map((w, k) => { const gate = ws.findIndex((g) => g.gate && g.before > w.before);
          return bix.create("Task", { id: ids[k], ...(gate >= 0 && gate !== k ? { dependsOn: [{ reference: `Task/${ids[gate]}` }] } : {}), intent: "plan", status: "ready", title: w.title, partOf: ref(ini),
        owner: ref(teamRecs[i]!), team: ref(teamRecs[i]!), audience: "team", ...(w.people && w.people > 1 ? { slots: w.people } : {}), ...(w.gate ? { milestone: true } : {}),
        ...(date ? { due: new Date(date.getTime() - w.before * DAY).toISOString() } : {}) }); }); });
      if (tasks.length) await bix.commit(...tasks);
      setMade(ini);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  const head = (n: number, h: string, sub?: string) => <><Meta>{`Step ${n} of 4`}</Meta><Title sub={sub}>{h}</Title></>;
  const back = <View style={{ alignItems: "center", marginTop: 12 }}><LinkText onPress={() => setStep(step - 1)}>Back</LinkText></View>;
  const taskCount = teams.filter((x) => x.keep).reduce((n, x) => n + x.work.filter((w) => w.keep).length, 0);

  if (made) return (
    <Screen>
      {coverUri ? <Image source={{ uri: coverUri }} style={{ height: 150, borderRadius: radius.panel }} /> : null}
      <Title sub={`${teams.filter((x) => x.keep).length} teams · ${taskCount} tasks · ${teams.filter((x) => x.keep && x.lead).length} leads`}>{`${made.title} is ready`}</Title>
      <Panel>
        <Row left={<IconCircle name="share" />} title="Share with the group chat" meta="One link for the whole event: volunteers pick a place" onPress={() => Share.share({ message: `Help with ${made.title}! Pick a slot → ${appUrl()}/project/${made.id}` }).catch(() => {})} />
        {teams.filter((x) => x.keep && !x.lead).map((x) => <Row key={x.name} left={<IconCircle name="users" />} title={`${x.name} needs a lead`} meta="Choose later on the team page" />)}
        <Row left={<IconCircle name="flag" />} title="Open the event" onPress={() => router.replace(`/project/${made.id}`)} last />
      </Panel>
      <Buttons><Primary label="Share the event" onPress={() => Share.share({ message: `Help with ${made.title}! Pick a slot → ${appUrl()}/project/${made.id}` }).catch(() => {})} /></Buttons>
    </Screen>
  );

  if (step === 1) return (
    <Screen back>
      {head(1, "What's coming up?")}
      <Field label="Name" value={title} onChangeText={setTitle} placeholder="e.g. Lahug Uplands Fun Run 2027" />
      <Text style={[t.eyebrow, { marginTop: 18, marginBottom: 8, marginHorizontal: 4 }]}>What kind</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {KINDS.map((k) => <Pressable key={k.code} onPress={() => chooseKind(k)} accessibilityRole="radio" accessibilityState={{ selected: kind?.code === k.code }} style={{ width: "47%" }}>
          <View style={{ height: 96, borderRadius: radius.inner, overflow: "hidden", backgroundColor: c.sand, borderWidth: 3, borderColor: kind?.code === k.code ? c.accent : "transparent" }}>
            {k.code === "other" ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><IconCircle name="plus" tone="white" /></View> : <Image source={k.photo} style={{ width: "100%", height: "100%" }} />}</View>
          <Text style={[t.row, { fontSize: 14, marginTop: 6 }]}>{k.label}</Text></Pressable>)}
      </View>
      <Buttons><Primary label="Next" onPress={() => setStep(2)} disabled={!title.trim() || !kind} /></Buttons>
    </Screen>
  );

  if (step === 2) return (
    <Screen>
      {head(2, "When and where?", "You can change these later. Task dates count from the event's date.")}
      <Field label="When" value={when} onChangeText={setWhen} placeholder="e.g. 2027-03-06 05:00" />
      {when.trim() && !date ? <Notice>That date didn't read right. Try 2027-03-06 05:00.</Notice> : null}
      <PlaceField label="Where" value={where} onChange={setWhere} placeholder="e.g. IT Park, Cebu City" />
      <Field label="What it's about" value={about} onChangeText={setAbout} multiline placeholder="What it is, who it's for. Volunteers read this first." />
      <Text style={[t.eyebrow, { marginTop: 18, marginBottom: 8, marginHorizontal: 4 }]}>Cover picture</Text>
      <Pressable onPress={async () => { const a = await pickPhoto(false).catch(() => null); if (a) setCover(a); }} style={{ height: coverUri ? 150 : 56, borderRadius: radius.panel, overflow: "hidden", backgroundColor: c.sand, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }}>
        {coverUri ? <Image source={{ uri: coverUri }} style={{ width: "100%", height: "100%" }} /> : <><IconCircle name="camera" tone="white" size={32} /><Text style={t.row}>Add a cover photo</Text></>}</Pressable>
      <Meta>{"Shown on the event's cards and its link. Never photos of children."}</Meta>
      <Buttons><Primary label="Next" onPress={() => setStep(3)} disabled={!!when.trim() && !date} /></Buttons>{back}
    </Screen>
  );

  if (step === 3) return (
    <Screen>
      {head(3, "Who's on it?", `Suggested for ${kind!.label.toLowerCase()}. Pick a lead from your core team.`)}
      <Panel>{teams.map((x, i) => <Row key={x.name + i} left={<Check on={x.keep} onPress={() => setTeams((ts) => ts.map((y, j) => (j === i ? { ...y, keep: !y.keep } : y)))} />}
        title={x.name} meta={`${x.work.length} task${x.work.length === 1 ? "" : "s"}`} last={i === teams.length - 1}
        right={x.lead ? <Pressable onPress={() => setPicking(i)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Avatar name={nameOf(x.lead)} size={26} /><Text style={t.meta}>{nameOf(x.lead)}</Text></Pressable>
          : <LinkText onPress={() => setPicking(i)}>Choose a lead</LinkText>} />)}</Panel>
      <Field value={paste} onChangeText={setPaste} placeholder="Add a team" onSubmitEditing={() => { if (paste.trim()) { setTeams((ts) => [...ts, { name: paste.trim(), icon: "users", lead: null, keep: true, work: [] }]); setPaste(""); } }} returnKeyType="done" />
      <Buttons><Primary label="Next" onPress={() => setStep(4)} disabled={!teams.some((x) => x.keep)} /></Buttons>{back}
      <Sheet open={picking !== null} onClose={() => setPicking(null)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>{`Who leads ${picking !== null ? teams[picking]?.name : ""}?`}</Text>
        <Panel style={{ backgroundColor: c.wash }}>
          {(core ?? []).map((x, i, all) => <Row key={x.ref} left={<Avatar name={nameOf(x.ref)} photo={x.p?.photo} />} title={nameOf(x.ref)} last={i === all.length - 1}
            onPress={() => { setTeams((ts) => ts.map((y, j) => (j === picking ? { ...y, lead: x.ref } : y))); setPicking(null); }} />)}
        </Panel>
        <View style={{ marginTop: 10 }}><LinkText onPress={() => { setTeams((ts) => ts.map((y, j) => (j === picking ? { ...y, lead: null } : y))); setPicking(null); }}>No lead yet</LinkText></View>
      </Sheet>
    </Screen>
  );

  return (
    <Screen>
      {head(4, "Plan the work", date ? `Dates count back from ${date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}.` : "Add a date later and these become due dates.")}
      {teams.map((x, ti) => x.keep ? <View key={x.name + ti}>
        <Text style={[t.eyebrow, { marginTop: 14, marginBottom: 6, marginHorizontal: 4 }]}>{`${x.name}${x.lead ? ` · ${nameOf(x.lead)}` : ""}`}</Text>
        <Panel>
          {x.work.map((w, wi) => <Row key={wi} left={<Check on={w.keep} onPress={() => setTeams((ts) => ts.map((y, j) => (j === ti ? { ...y, work: y.work.map((z, k) => (k === wi ? { ...z, keep: !z.keep } : z)) } : y)))} />}
            title={w.title} meta={[relative(w.before), w.people && w.people > 1 ? `${w.people} people` : null, w.gate ? "others wait on this" : null].filter(Boolean).join(" · ")} />)}
          <View style={{ paddingVertical: 8 }}><Field value={picking === -1 - ti ? paste : ""} onFocus={() => setPicking(-1 - ti)} onChangeText={setPaste} multiline={false}
            placeholder="Add a task, or paste several lines" onSubmitEditing={() => addPasted(ti)} returnKeyType="done" style={{ backgroundColor: c.wash }} /></View>
        </Panel>
      </View> : null)}
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label={`Create the event · ${taskCount} tasks`} onPress={create} busy={busy} /></Buttons>
      <View style={{ alignItems: "center", marginTop: 8 }}><Outline label="Back" onPress={() => setStep(3)} /></View>
    </Screen>
  );
}
