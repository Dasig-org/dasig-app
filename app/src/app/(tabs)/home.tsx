import { router } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, personName, stateLabel, teamIcon } from "@/lib/work";
import { ContextPill, Logo } from "@/ui/Context";
import { short } from "@/lib/dates";
import { Avatar, Buttons, Eyebrow, Hero, IconCircle, Meta, Notice, Outline, Panel, Pill, Primary, Row, Sand, Screen, Tip, usePhoto } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";

/** A card's picture: the project's cover, then the group's logo, then the team's icon (UX_GAPS C14). */
function Cover({ image, icon, height, size, round }: { image?: { hash?: string } | null; icon: any; height: number; size: number; round?: boolean }) {
  const uri = usePhoto(image);
  return <View style={{ height, backgroundColor: c.sand, alignItems: "center", justifyContent: "center", overflow: "hidden", ...(round ? { borderRadius: radius.tile } : {}) }}>
    {uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: "100%", height }} /> : <IconCircle name={icon} size={size} tone="white" />}</View>;
}

const hello = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

/** Load everything a home screen needs for the current context. */
async function load(me: string, orgId: string | null) {
  const orgs = orgId ? [orgId] : (await bix.search("Role", { person: me })).filter((r) => r.status === "active").map((r) => r.organization.reference.split("/")[1]);
  const projects = (await Promise.all(orgs.map((o) => bix.search("Initiative", { organization: `Organization/${o}` })))).flat().filter((p) => p.status !== "completed" && p.status !== "cancelled");
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
  // Where a task comes from, so no row is ever unlabelled (UX_GAPS A5, A6). In the personal context the group is named too.
  const projOf = (x: R) => (data?.projects ?? []).find((y) => `Initiative/${y.id}` === x.partOf?.reference);
  const teamOf = (x: R) => (data?.teams ?? []).find((y) => `Team/${y.id}` === x.team?.reference);
  const groupOf = (x: R) => { const o = projOf(x)?.organization?.reference; return s.groups.find((g) => `Organization/${g.org.id}` === o)?.org; };
  const from = (x: R) => [s.current ? null : groupOf(x)?.name, projOf(x)?.title, teamOf(x)?.name].filter(Boolean).join(" · ");
  const leftOf = (x: R, icon: any) => { const g = groupOf(x); return !s.current && g ? <Logo name={g.name} image={g.image} size={36} /> : <IconCircle name={icon} />; };
  const dueOf = (x: R) => (x.due ? <Pill tone="ok">{`Due ${short(x.due)}`}</Pill> : undefined);
  const answer = async (x: R, yes: boolean) => { try { await bix.commit(yes ? act.claim(x, me) : act.release(x)); } catch {} reload(); };

  if (lead) {
    const leadTeams = myTeams.filter((tm) => (tm.participant ?? []).some((p: any) => p.person.reference === me && p.role === "lead"));
    const leadRefs = new Set(leadTeams.map((tm) => `Team/${tm.id}`));
    const ideas = tasks.filter((x) => x.status === "draft" && (leadRefs.has(x.team?.reference) || s.isLead));
    const waiting = tasks.filter((x) => x.status === "requested");
    const noLead = (data?.teams ?? []).filter((tm) => !(tm.participant ?? []).some((p: any) => p.role === "lead" && p.status === "active"));
    const needs = (ideas.length ? 1 : 0) + waiting.length + (noLead.length ? 1 : 0);
    return (
      <Screen onRefresh={reload}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><ContextPill /><Pressable accessibilityRole="button" accessibilityLabel="Your story and settings" onPress={() => router.push("/story")}><Avatar name={personName(s.person)} size={40} photo={s.person?.photo} /></Pressable></View>
        <Text style={[t.title, { marginTop: 14 }]}>{`Your week, ${personName(s.person)}`}</Text>
        <Text style={t.body}>{needs ? `${needs === 1 ? "One thing needs" : `${needs} things need`} you.` : "Everything is on track."}</Text>
        {error ? <Notice>{error}</Notice> : null}
        <Tip id="coordinator-home" title="Your week">What needs you comes first.</Tip>
        {s.connection?.kind !== "cloud" && tasks.some((x) => x.status === "completed") ? <Tip id="keep-a-copy" title="Everything is on your phones" onPress={() => router.push("/network" as never)}>If one is lost, its records go with it.</Tip> : null}
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
          {open.slice(0, 5).map((x, i) => <Row key={x.id} left={<IconCircle name="pen" />} title={x.title} meta={from(x)} right={dueOf(x) ?? <Pill>Open</Pill>} onPress={() => router.push(`/task/${x.id}`)} last={i === Math.min(open.length, 5) - 1} />)}
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
    <Screen onRefresh={reload}>
      <ContextPill />
      <Text style={[t.title, { marginTop: 14, marginBottom: 6 }]}>{`${hello()}, ${personName(s.person)}`}</Text>
      {error ? <Notice>{error}</Notice> : null}
      <Tip id="volunteer-home" title="Find something to do">Tap “I'm in” to take it.</Tip>
      {asked.map((x) => <View key={x.id}><Eyebrow>Asked of you</Eyebrow>
        <Hero><View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>{leftOf(x, "pen")}<View style={{ flex: 1 }}><Text style={t.row}>{x.title}</Text><Meta>{[from(x), x.due ? `due ${short(x.due)}` : null].filter(Boolean).join(" · ")}</Meta></View></View>
          <Buttons><Primary label="I'm in" onPress={() => answer(x, true)} /><Outline label="Can't make it" onPress={() => answer(x, false)} /></Buttons></Hero></View>)}
      {mine.length ? <><Eyebrow>Yours now</Eyebrow><Panel>{mine.map((x, i) => <Row key={x.id} left={leftOf(x, "check")} title={x.title} meta={from(x)} right={dueOf(x)} onPress={() => router.push(`/task/${x.id}`)} last={i === mine.length - 1} />)}</Panel></> : null}
      {open.length ? (() => { const x = open[0]!; const tm = (data?.teams ?? []).find((y) => `Team/${y.id}` === x.team?.reference);
        const pr = (data?.projects ?? []).find((y) => `Initiative/${y.id}` === x.partOf?.reference); const going = (x.participant ?? []).filter((p: any) => p.status === "active").length;
        return <><Eyebrow>Something worth doing</Eyebrow>
          <Pressable onPress={() => router.push(`/task/${x.id}`)} accessibilityRole="button" accessibilityLabel={`${x.title}, ${tm?.name ?? ""}`} style={{ backgroundColor: c.white, borderRadius: radius.tile, overflow: "hidden" }}>
            <Cover image={pr?.image ?? groupOf(x)?.image} icon={teamIcon(tm?.name ?? "")} height={140} size={72} />
            <View style={{ padding: 16 }}>
              <Meta>{from(x)}</Meta>
              <Text style={[t.title, { fontSize: 22, marginTop: 2 }]}>{x.title}</Text>
              <Meta>{[going ? `${going} already in` : x.goodFirstStep ? "A good first step" : "Be the first one in", x.due ? `due ${short(x.due)}` : null].filter(Boolean).join(" · ")}</Meta>
              <Buttons><Primary label="I'm in" onPress={() => answer(x, true)} /></Buttons>
            </View>
          </Pressable></>; })() : null}
      <Eyebrow right={open.length > 1 ? `${open.length - 1}` : undefined}>{open.length ? "More to help with" : "Lend a hand"}</Eyebrow>
      {open.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {open.slice(1).map((x) => { const tm = (data?.teams ?? []).find((y) => `Team/${y.id}` === x.team?.reference);
          return <Pressable key={x.id} onPress={() => router.push(`/task/${x.id}`)} accessibilityRole="button" accessibilityLabel={`${x.title}, ${tm?.name ?? ""}`} style={{ width: 220 }}>
            <Cover image={projOf(x)?.image ?? groupOf(x)?.image} icon={teamIcon(tm?.name ?? "")} height={120} size={56} round />
            <Text style={[t.row, { marginTop: 8 }]} numberOfLines={1}>{x.title}</Text><Text style={t.meta} numberOfLines={1}>{from(x) || "Open"}</Text></Pressable>; })}
      </ScrollView> : open.length ? null : <Sand><IconCircle name="heart" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>Nothing open right now</Text><Meta>{s.groups.length ? "Your groups will post work here." : "Join a group to see their work."}</Meta></View></Sand>}
      {!s.groups.length ? <Buttons><Primary label="Join a group" onPress={() => router.push("/volunteer" as never)} /></Buttons> : null}
      <Eyebrow>Near you</Eyebrow>
      <Panel><Row left={<IconCircle name="pin" />} title="Groups working near you" meta="Find groups and projects to join" onPress={() => router.push("/nearby")} last /></Panel>
      <Eyebrow>Your story</Eyebrow>
      <Sand><IconCircle name="check" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>{done.length ? `You helped with “${done[done.length - 1]!.title}”` : mine.length ? "Your story has started" : "Your story starts with your first “I'm in”"}</Text><Meta>{[done.length ? `${done.length} thing${done.length === 1 ? "" : "s"} done · thanked and recorded` : null, mine.length ? `${mine.length} thing${mine.length === 1 ? "" : "s"} in progress` : null].filter(Boolean).join(" · ") || "Every step you take is kept, and it's yours"}</Meta></View></Sand>
    </Screen>
  );
}
