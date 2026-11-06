import { router } from "expo-router";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { short } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, personName, teamIcon } from "@/lib/work";
import { ContextPill, Logo } from "@/ui/Context";
import { Buttons, Eyebrow, Faces, Hero, IconCircle, LinkText, Meta, Notice, Outline, Panel, Pill, Primary, Row, RoundButton, Sand, Screen, Tip, usePhoto } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";

/*
 * Home follows design/home-sketches.html (v0.3): photos carry the meaning text used to. An ask is a card with the
 * project's photo; open work is a swipeable row of photo tiles with the date as the one overlay and the faces of who's
 * going; "Your story" is photos from work you did. The coordinator's week is day tiles with one state pill each,
 * then photos from the last session. Everything else is one tap away.
 */

type Img = { hash?: string; contentType?: string } | null | undefined;
const imagesOf = (x: R): Img[] => [...(x.output ?? []).flatMap((o: any) => o.attachment ?? []), ...(x.attachment ?? [])].filter((a: any) => a?.contentType?.startsWith("image/"));
const hello = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short" }).toUpperCase().slice(0, 3);

/** A photo, or a fallback picture: the team's icon on sand. Rounded on the image itself, never boxed (DESIGN_STANDARD §4). */
function Photo({ image, fallback, w, h, r = radius.inner, chip }: { image?: Img; fallback?: React.ReactNode; w: number | "100%"; h: number; r?: number; chip?: string }) {
  const uri = usePhoto(image);
  return <View style={{ width: w, height: h, borderRadius: r, overflow: "hidden", backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
    {uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: "100%", height: "100%" }} /> : fallback}
    {chip ? <View style={{ position: "absolute", left: 10, top: 10, height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: c.white, justifyContent: "center" }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: c.ink }}>{chip}</Text></View> : null}
  </View>;
}

/** Load everything a home screen needs for the current context, including the people on open work, for their faces. */
async function load(me: string, orgId: string | null) {
  const orgs = orgId ? [orgId] : (await bix.search("Role", { person: me })).filter((r) => r.status === "active").map((r) => r.organization.reference.split("/")[1]);
  const projects = (await Promise.all(orgs.map((o) => bix.search("Initiative", { organization: `Organization/${o}` })))).flat().filter((p) => p.status !== "completed" && p.status !== "cancelled");
  const [teams, tasks] = await Promise.all([
    Promise.all(projects.map((p) => bix.search("Team", { initiative: `Initiative/${p.id}` }))).then((x) => x.flat()),
    Promise.all(projects.map((p) => bix.search("Task", { partOf: `Initiative/${p.id}` }))).then((x) => x.flat()),
  ]);
  const refs = new Set<string>();
  for (const x of tasks) for (const p of x.participant ?? []) if (p.status === "active") refs.add(p.person.reference);
  const people: Record<string, R> = {};
  await Promise.all([...refs].slice(0, 40).map(async (r) => { try { people[r] = await bix.get("Person", r.split("/")[1]!); } catch {} }));
  return { projects, teams, tasks, people };
}

export default function Home() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data, error, reload } = useLoad(() => (me ? load(me, s.current?.id ?? null) : Promise.resolve(null)), [me, s.current?.id]);
  const tasks = data?.tasks ?? [];
  const projOf = (x: R) => (data?.projects ?? []).find((y) => `Initiative/${y.id}` === x.partOf?.reference);
  const teamOf = (x: R) => (data?.teams ?? []).find((y) => `Team/${y.id}` === x.team?.reference);
  const groupOf = (x: R) => { const o = projOf(x)?.organization?.reference; return s.groups.find((g) => `Organization/${g.org.id}` === o)?.org; };
  const coverOf = (x: R): Img => imagesOf(x)[0] ?? projOf(x)?.image ?? groupOf(x)?.image;
  const going = (x: R) => (x.participant ?? []).filter((p: any) => p.status === "active");
  const nameOf = (r: string) => (r === me ? "You" : personName(data?.people[r]));
  const faces = (x: R): { name: string; photo: Img }[] => going(x).map((p: any) => ({ name: nameOf(p.person.reference), photo: data?.people[p.person.reference]?.photo }));
  const myTeamRefs = new Set((data?.teams ?? []).filter((tm) => (tm.participant ?? []).some((p: any) => p.person.reference === me && p.status === "active")).map((tm) => `Team/${tm.id}`));
  const asked = tasks.filter((x) => x.status === "requested" && x.owner?.reference === me);
  const mine = tasks.filter((x) => ["accepted", "in-progress"].includes(x.status) && going(x).some((p: any) => p.person.reference === me));
  const open = tasks.filter((x) => x.status === "ready" && (x.audience === "open" || x.audience === "organization" || myTeamRefs.has(x.team?.reference)))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const done = tasks.filter((x) => x.status === "completed" && going(x).some((p: any) => p.person.reference === me));
  const answer = async (x: R, yes: boolean) => { try { await bix.commit(yes ? act.claim(x, me) : act.release(x)); } catch {} reload(); };
  // Where a task comes from: the group only in the personal context, where it isn't already in the pill (UX_GAPS A5, A6).
  const from = (x: R) => [s.current ? null : groupOf(x)?.name, projOf(x)?.title, teamOf(x)?.name].filter(Boolean).join(" · ");
  const icon = (x: R) => <IconCircle name={teamIcon(teamOf(x)?.name ?? "")} size={44} tone="white" />;

  if (s.isLead) {
    const ideas = tasks.filter((x) => x.status === "draft");
    const waiting = tasks.filter((x) => x.status === "requested");
    const noLead = (data?.teams ?? []).filter((tm) => !(tm.participant ?? []).some((p: any) => p.role === "lead" && p.status === "active"));
    const soon = open.filter((x) => x.due && new Date(x.due).getTime() - Date.now() < 7 * 86400000)[0];
    const needs = (soon ? 1 : 0) + (ideas.length ? 1 : 0) + waiting.length + (noLead.length ? 1 : 0);
    // Coming up: one row per day and project, its state in one pill (sketch 3).
    const start = new Date(); start.setHours(0, 0, 0, 0); const horizon = Date.now() + 14 * 86400000;
    const dated = tasks.filter((x) => x.due && x.status !== "draft" && x.status !== "cancelled" && new Date(x.due).getTime() >= start.getTime() && new Date(x.due).getTime() < horizon);
    const slots = new Map<string, { due: string; project: R | undefined; items: R[] }>();
    for (const x of dated) { const k = `${new Date(x.due).toDateString()}|${x.partOf?.reference}`; const e = slots.get(k) ?? { due: x.due, project: projOf(x), items: [] as R[] }; e.items.push(x); slots.set(k, e); }
    const coming = [...slots.values()].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
    const lastDone = tasks.filter((x) => x.status === "completed" && imagesOf(x).length).sort((a, b) => (b.executionPeriod?.end ?? "").localeCompare(a.executionPeriod?.end ?? ""))[0];
    const share = (x: R) => Share.share({ message: `Can you help with “${x.title}”${projOf(x) ? ` for ${projOf(x)!.title}` : ""}? ${appUrl()}/task/${x.id}` }).catch(() => {});
    return (
      <Screen onRefresh={reload}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><ContextPill />
          <RoundButton icon="plus" label="Start a project" onPress={() => router.push("/new-project")} /></View>
        <Text style={[t.title, { marginTop: 14 }]}>{`Your week, ${personName(s.person)}`}</Text>
        <Text style={t.body}>{needs ? `${needs === 1 ? "One thing needs" : `${needs} things need`} you.` : "On track. Nothing needs you."}</Text>
        {error ? <Notice>{error}</Notice> : null}
        <Tip id="coordinator-home" title="Your week">What needs you comes first.</Tip>
        {s.connection?.kind !== "cloud" && tasks.some((x) => x.status === "completed") ? <Tip id="keep-a-copy" title="Everything is on your phones" onPress={() => router.push("/network" as never)}>If one is lost, its records go with it.</Tip> : null}

        {needs ? <><Eyebrow>Needs you</Eyebrow><Hero>
          {soon ? <><Pressable onPress={() => router.push(`/task/${soon.id}`)}><Text style={t.row}>{`${soon.title} needs someone`}</Text><Meta>{[short(soon.due), projOf(soon)?.title].filter(Boolean).join(" · ")}</Meta></Pressable>
            <Buttons><Primary label="Share in the group chat" onPress={() => share(soon)} /></Buttons></> : null}
          {waiting.slice(0, 2).map((x) => <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: soon ? 14 : 0, paddingTop: soon ? 14 : 0, borderTopWidth: soon ? 1 : 0, borderTopColor: c.s200 }}>
            <View style={{ flex: 1 }}><Text style={t.row}>{`${personName(data?.people[x.owner?.reference])} hasn't replied`}</Text><Meta>{x.title}</Meta></View>
            <LinkText onPress={() => router.push(`/task/${x.id}`)}>Ask someone else</LinkText></View>)}
          {ideas.length ? <Row left={<IconCircle name="pen" />} title={`${ideas.length} idea${ideas.length === 1 ? "" : "s"} from the team`} meta="Accept or keep for later" onPress={() => router.push("/ideas" as never)} last={!noLead.length} /> : null}
          {noLead.length ? <Row left={<IconCircle name={noLead.length === 1 ? teamIcon(noLead[0]!.name) : "users"} />} title={noLead.length === 1 ? `${noLead[0]!.name} needs a lead` : `${noLead.length} teams need a lead`}
            meta={noLead.length === 1 ? "Tap Lead on the team to choose" : noLead.slice(0, 3).map((x) => x.name).join(", ")} onPress={() => router.push(noLead.length === 1 ? `/team/${noLead[0]!.id}` : `/project/${(data?.projects ?? [])[0]?.id ?? ""}`)} last /> : null}
        </Hero></> : null}

        {coming.length ? <><Eyebrow>Coming up</Eyebrow><Panel>
          {coming.map((e, i) => { const openN = e.items.filter((x) => x.status === "ready" || x.status === "requested").length; const first = i === 0;
            return <Row key={i} last={i === coming.length - 1} onPress={() => router.push(e.items.length === 1 ? `/task/${e.items[0]!.id}` : `/project/${e.project?.id ?? ""}`)}
              left={<View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: first ? c.accent : c.sand, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: first ? c.white : c.accent }}>{day(e.due)}</Text></View>}
              title={e.items.length === 1 ? e.items[0]!.title : e.project?.title ?? "Work"} meta={e.items.length === 1 ? e.project?.title : `${e.items.length} things`}
              right={openN ? <Pill>{`${openN} open`}</Pill> : <Pill tone="ok">All set</Pill>} />; })}
        </Panel></> : null}

        {lastDone ? <><Eyebrow right={`${imagesOf(lastDone).length} photo${imagesOf(lastDone).length === 1 ? "" : "s"}`}>{`From ${lastDone.title}`}</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {imagesOf(lastDone).slice(0, 8).map((a, i) => <Photo key={a?.hash ?? i} image={a} w={86} h={86} />)}</ScrollView></> : null}

        <Eyebrow right={data?.projects.length ? "See all" : undefined}>Projects</Eyebrow>
        <Panel>
          {(data?.projects ?? []).map((p) => { const ts = tasks.filter((x) => x.partOf?.reference === `Initiative/${p.id}` && x.status !== "draft" && x.status !== "cancelled"); const d = ts.filter((x) => x.status === "completed").length;
            return <Row key={p.id} left={<Photo image={p.image} w={44} h={44} fallback={<IconCircle name="flag" size={44} />} />} title={p.title} meta={ts.length ? `${d} of ${ts.length} done` : "No work added yet"} onPress={() => router.push(`/project/${p.id}`)}
              right={<View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden" }}><View style={{ width: `${ts.length ? (d / ts.length) * 100 : 0}%`, height: 8, backgroundColor: c.accent }} /></View>} />; })}
          <Row left={<IconCircle name="plus" tone="grey" size={44} />} title="Start a project" onPress={() => router.push("/new-project")} last />
        </Panel>
        {open.length ? <><Eyebrow right={`${open.length}`}>Open work</Eyebrow><Panel>
          {open.slice(0, 5).map((x, i) => <Row key={x.id} left={<Photo image={coverOf(x)} w={44} h={44} fallback={icon(x)} />} title={x.title} meta={from(x)} right={x.due ? <Pill tone="ok">{short(x.due)}</Pill> : <Pill>Open</Pill>} onPress={() => router.push(`/task/${x.id}`)} last={i === Math.min(open.length, 5) - 1} />)}
        </Panel></> : null}
        <Eyebrow>Your group</Eyebrow>
        <Panel>
          <Row left={<IconCircle name="users" />} title="People" meta="Invite, roles, teams" onPress={() => router.push(`/org/${s.current!.id}/people` as never)} />
          <Row left={<IconCircle name="building" />} title="Group profile" onPress={() => router.push(`/org/${s.current!.id}` as never)} last />
        </Panel>
      </Screen>
    );
  }

  const storyPhotos = done.flatMap((x) => imagesOf(x).length ? imagesOf(x).slice(0, 1) : [projOf(x)?.image]).filter((a) => a?.hash).slice(-4).reverse();
  const since = done.map((x) => x.executionPeriod?.end).filter(Boolean).sort()[0];
  return (
    <Screen onRefresh={reload}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><ContextPill />
        <RoundButton icon="search" label="Find groups and projects" onPress={() => router.push("/nearby")} /></View>
      <Text style={[t.title, { marginTop: 14, marginBottom: 2 }]}>{`${hello()}, ${personName(s.person)}`}</Text>
      {error ? <Notice>{error}</Notice> : null}
      <Tip id="volunteer-home" title="Find something to do">Tap “I'm in” to take it.</Tip>

      {asked.map((x) => { const asker = x.requester?.reference ?? (x.note ?? [])[0]?.author?.reference;
        return <View key={x.id}><Eyebrow>{asker && data?.people[asker] ? `${personName(data.people[asker])} asked you` : "Asked of you"}</Eyebrow>
          <Hero><Pressable onPress={() => router.push(`/task/${x.id}`)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Photo image={coverOf(x)} w={56} h={56} fallback={!s.current && groupOf(x) ? <Logo name={groupOf(x)!.name} image={groupOf(x)!.image} size={56} /> : icon(x)} />
            <View style={{ flex: 1 }}><Text style={t.row}>{x.title}</Text><Meta>{[from(x), x.due ? short(x.due) : null].filter(Boolean).join(" · ")}</Meta></View></Pressable>
            <Buttons><Primary label="I'm in" onPress={() => answer(x, true)} /><Outline flex label="Can't make it" onPress={() => answer(x, false)} /></Buttons></Hero></View>; })}

      {mine.length ? <><Eyebrow>Yours now</Eyebrow><Panel>{mine.map((x, i) =>
        <Row key={x.id} left={<Photo image={coverOf(x)} w={44} h={44} fallback={icon(x)} />} title={x.title} meta={from(x)} right={x.due ? <Pill tone="ok">{`Due ${short(x.due)}`}</Pill> : undefined} onPress={() => router.push(`/task/${x.id}`)} last={i === mine.length - 1} />)}</Panel></> : null}

      <Eyebrow right={open.length > 1 ? "See all" : undefined}>Lend a hand</Eyebrow>
      {open.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 18 }}>
        {open.slice(0, 8).map((x) => { const f = faces(x);
          return <Pressable key={x.id} onPress={() => router.push(`/task/${x.id}`)} accessibilityRole="button" accessibilityLabel={`${x.title}, ${from(x)}`} style={{ width: open.length === 1 ? 300 : 236 }}>
            <Photo image={coverOf(x)} w="100%" h={150} r={radius.panel} chip={x.due ? short(x.due) : "Any time"} fallback={<IconCircle name={teamIcon(teamOf(x)?.name ?? "")} size={64} tone="white" />} />
            <Text style={[t.row, { marginTop: 9, marginHorizontal: 2 }]} numberOfLines={1}>{x.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3, marginHorizontal: 2 }}>
              {f.length ? <Faces names={f.map((y) => y.name)} photos={f.map((y) => y.photo)} /> : null}
              <Text style={[t.meta, { flex: 1 }]} numberOfLines={1}>{f.length ? `${f.length} going` : x.goodFirstStep ? "A good first step" : from(x) || "Be the first one in"}</Text></View>
          </Pressable>; })}
      </ScrollView>
        : <Sand><IconCircle name="heart" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>Nothing open right now</Text><Meta>{s.groups.length ? "Your groups will post work here." : "Join a group to see their work."}</Meta></View></Sand>}
      {!s.groups.length ? <Buttons><Primary label="Join a group" onPress={() => router.push("/volunteer" as never)} /></Buttons> : null}

      <Eyebrow>Your story</Eyebrow>
      <View style={{ backgroundColor: c.sand, borderRadius: radius.panel, padding: 16 }}>
        <Text style={[t.row, { fontSize: 16 }]}>{done.length ? `${done.length} thing${done.length === 1 ? "" : "s"} done${since ? ` since ${new Date(since).toLocaleDateString(undefined, { month: "long" })}` : ""}` : mine.length ? "Your story has started" : "Your story starts with your first “I'm in”"}</Text>
        <Meta>{mine.length ? `${mine.length} thing${mine.length === 1 ? "" : "s"} in progress` : done.length ? "Thanked and recorded" : "Every step you take is kept, and it's yours"}</Meta>
        {storyPhotos.length ? <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>{storyPhotos.map((a, i) => <Photo key={a?.hash ?? i} image={a} w={78} h={78} />)}</View> : null}
      </View>
      <View style={{ marginTop: 14 }}><Panel><Row left={<IconCircle name="pin" />} title="Groups working near you" meta="Find groups and projects to join" onPress={() => router.push("/nearby")} last /></Panel></View>
    </Screen>
  );
}
