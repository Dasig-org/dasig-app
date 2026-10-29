import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, personName, shortRef, stateLabel, teamIcon } from "@/lib/work";
import { ContextPill } from "@/ui/Context";
import { Avatar, Buttons, Eyebrow, Hero, IconCircle, Meta, Nav, Notice, Outline, Panel, Pill, Primary, Row, Sand, Screen, Tip } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";

const hello = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

/** Load everything a home screen needs for the current context. */
async function load(me: string, orgId: string | null) {
  const orgs = orgId ? [orgId] : (await bix.search("Role", { person: me })).filter((r) => r.status === "active").map((r) => r.organization.reference.split("/")[1]);
  const projects = (await Promise.all(orgs.map((o) => bix.search("Initiative", { organization: `Organization/${o}` })))).flat().filter((p) => p.status !== "completed");
  const [teams, tasks] = await Promise.all([
    Promise.all(projects.map((p) => bix.search("Team", { initiative: `Initiative/${p.id}` }))).then((x) => x.flat()),
    Promise.all(projects.map((p) => bix.search("Task", { partOf: `Initiative/${p.id}` }))).then((x) => x.flat()),
  ]);
  return { projects, teams, tasks };
}

export default function Home() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const lead = s.isLead;
  const { data, error, reload } = useLoad(() => (me ? load(me, s.current?.id ?? null) : Promise.resolve(null)), [me, s.current?.id]);
  const tasks = data?.tasks ?? [];
  const myTeams = (data?.teams ?? []).filter((tm) => (tm.participant ?? []).some((p: any) => p.person.reference === me && p.status === "active"));
  const myTeamRefs = new Set(myTeams.map((tm) => `Team/${tm.id}`));
  const asked = tasks.filter((x) => x.status === "requested" && x.owner?.reference === me);
  const mine = tasks.filter((x) => ["accepted", "in-progress"].includes(x.status) && (x.participant ?? []).some((p: any) => p.person.reference === me && p.status === "active"));
  const open = tasks.filter((x) => x.status === "ready" && (x.audience === "open" || x.audience === "organization" || myTeamRefs.has(x.team?.reference)));
  const done = tasks.filter((x) => x.status === "completed" && (x.participant ?? []).some((p: any) => p.person.reference === me));
  const answer = async (x: R, yes: boolean) => { try { await bix.commit(yes ? act.claim(x, me) : act.release(x)); } catch {} reload(); };

  if (lead) {
    const leadTeams = myTeams.filter((tm) => (tm.participant ?? []).some((p: any) => p.person.reference === me && p.role === "lead"));
    const leadRefs = new Set(leadTeams.map((tm) => `Team/${tm.id}`));
    const ideas = tasks.filter((x) => x.status === "draft" && (leadRefs.has(x.team?.reference) || s.isLead));
    const waiting = tasks.filter((x) => x.status === "requested");
    const noLead = (data?.teams ?? []).filter((tm) => !(tm.participant ?? []).some((p: any) => p.role === "lead" && p.status === "active"));
    const needs = (ideas.length ? 1 : 0) + waiting.length + (noLead.length ? 1 : 0);
    return (
      <Screen onRefresh={reload} bottom={<Nav active="home" />}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><ContextPill /><Pressable accessibilityRole="button" accessibilityLabel="Your story and settings" onPress={() => router.push("/story")}><Avatar name={personName(s.person)} size={40} /></Pressable></View>
        <Text style={[t.title, { marginTop: 14 }]}>{`Your week, ${personName(s.person)}`}</Text>
        <Text style={t.body}>{needs ? `${needs === 1 ? "One thing needs" : `${needs} things need`} you.` : "Everything is on track."}</Text>
        {error ? <Notice>{error}</Notice> : null}
        <Tip id="coordinator-home" title="Your week">What needs you comes first.</Tip>
        {needs ? <><Eyebrow>Needs you</Eyebrow><Hero>
          {ideas.length ? <Row left={<IconCircle name="pen" />} title={`${ideas.length} idea${ideas.length === 1 ? "" : "s"} from the team`} meta="Accept or keep for later" onPress={() => router.push("/ideas" as never)} /> : null}
          {waiting.slice(0, 2).map((x) => <Row key={x.id} left={<IconCircle name="pending" tone="grey" />} title={`${x.title}`} meta="Asked, no answer yet" onPress={() => router.push(`/task/${x.id}`)} />)}
          {noLead.length === 1 ? <Row left={<IconCircle name={teamIcon(noLead[0]!.name)} />} title={`${noLead[0]!.name} needs a lead`} meta="Tap Lead on the team to choose" onPress={() => router.push(`/team/${noLead[0]!.id}`)} />
            : noLead.length ? <Row left={<IconCircle name="users" />} title={`${noLead.length} teams need a lead`} meta={noLead.slice(0, 3).map((x) => x.name).join(", ") + (noLead.length > 3 ? "…" : "")} onPress={() => router.push(`/project/${(data?.projects ?? [])[0]?.id ?? ""}`)} /> : null}
        </Hero></> : null}
        <Eyebrow right={data?.projects.length ? "See all" : undefined}>Projects</Eyebrow>
        <Panel>
          {(data?.projects ?? []).map((p) => { const ts = tasks.filter((x) => x.partOf?.reference === `Initiative/${p.id}` && x.status !== "draft"); const d = ts.filter((x) => x.status === "completed").length;
            return <Row key={p.id} left={<IconCircle name="flag" />} title={p.title} meta={ts.length ? `${d} of ${ts.length} done` : "No work added yet"} onPress={() => router.push(`/project/${p.id}`)}
              right={<View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden" }}><View style={{ width: `${ts.length ? (d / ts.length) * 100 : 0}%`, height: 8, backgroundColor: c.accent }} /></View>} />; })}
          <Row left={<IconCircle name="plus" tone="grey" />} title="Start a project" onPress={() => router.push("/new-project")} last />
        </Panel>
        {open.length ? <><Eyebrow right={`${open.length}`}>Open work</Eyebrow><Panel>
          {open.slice(0, 5).map((x, i) => <Row key={x.id} left={<IconCircle name="pen" />} title={x.title} meta={shortRef(x)} right={<Pill>Open</Pill>} onPress={() => router.push(`/task/${x.id}`)} last={i === Math.min(open.length, 5) - 1} />)}
        </Panel></> : null}
        <Eyebrow>Your group</Eyebrow>
        <Panel>
          <Row left={<IconCircle name="users" />} title="People" meta="Invite, roles, teams" onPress={() => router.push(`/org/${s.current!.id}/people` as never)} />
          <Row left={<IconCircle name="building" />} title="Group profile" onPress={() => router.push(`/org/${s.current!.id}` as never)} last />
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={reload} bottom={<Nav active="home" />}>
      <ContextPill />
      <Text style={[t.title, { marginTop: 14, marginBottom: 6 }]}>{`${hello()}, ${personName(s.person)}`}</Text>
      {error ? <Notice>{error}</Notice> : null}
      <Tip id="volunteer-home" title="Find something to do">Tap “I'm in” to take it.</Tip>
      {asked.map((x) => <View key={x.id}><Eyebrow>Asked of you</Eyebrow>
        <Hero><View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><IconCircle name="pen" size={48} /><View style={{ flex: 1 }}><Text style={t.row}>{x.title}</Text><Meta>{shortRef(x) ?? ""}</Meta></View></View>
          <Buttons><Primary label="I'm in" onPress={() => answer(x, true)} /><Outline label="Can't make it" onPress={() => answer(x, false)} /></Buttons></Hero></View>)}
      {mine.length ? <><Eyebrow>Yours now</Eyebrow><Panel>{mine.map((x, i) => <Row key={x.id} left={<IconCircle name="check" />} title={x.title} meta={shortRef(x)} right={<Pill tone={stateLabel(x, me).tone}>{stateLabel(x, me).label}</Pill>} onPress={() => router.push(`/task/${x.id}`)} last={i === mine.length - 1} />)}</Panel></> : null}
      <Eyebrow right={open.length ? `${open.length}` : undefined}>Lend a hand</Eyebrow>
      {open.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {open.map((x) => { const tm = (data?.teams ?? []).find((y) => `Team/${y.id}` === x.team?.reference);
          return <Pressable key={x.id} onPress={() => router.push(`/task/${x.id}`)} accessibilityRole="button" accessibilityLabel={`${x.title}, ${tm?.name ?? ""}`} style={{ width: 220 }}>
            <View style={{ height: 120, borderRadius: radius.tile, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}><IconCircle name={teamIcon(tm?.name ?? "")} size={56} tone="white" /></View>
            <Text style={[t.row, { marginTop: 8 }]} numberOfLines={1}>{x.title}</Text><Meta>{tm?.name ?? "Open"}</Meta></Pressable>; })}
      </ScrollView> : <Sand><IconCircle name="heart" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>Nothing open right now</Text><Meta>{s.groups.length ? "Your groups will post work here." : "Join a group to see their work."}</Meta></View></Sand>}
      {!s.groups.length ? <Buttons><Primary label="Join a group" onPress={() => router.push("/volunteer" as never)} /></Buttons> : null}
      <Eyebrow>Near you</Eyebrow>
      <Panel><Row left={<IconCircle name="pin" />} title="Groups working near you" meta="Needs internet and the Dasig Ecosystem" onPress={() => router.push("/nearby")} last /></Panel>
      <Eyebrow>Your story</Eyebrow>
      <Sand><IconCircle name="check" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>{done.length ? `${done.length} thing${done.length === 1 ? "" : "s"} done` : "Your story starts with your first “I'm in”"}</Text><Meta>Recorded and signed by your groups</Meta></View></Sand>
    </Screen>
  );
}
