import { networkUrl } from "@/lib/env";
import { ErrorState } from "@/ui/ErrorState";
import { router } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { short } from "@/lib/dates";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, personName, places, teamIcon } from "@/lib/work";
import { ContextPill, Logo } from "@/ui/Context";
import { ZeroHome } from "@/ui/ZeroHome";
import { KeepYourWork } from "@/ui/KeepYourWork";
import { InstallGuide } from "@/ui/InstallGuide";
import { CoordinatorHome } from "@/ui/CoordinatorHome";
import { Buttons, Eyebrow, Faces, Hero, IconCircle, Meta, Outline, Panel, Pill, Primary, Row, RoundButton, Sand, Screen, Skeleton, Tip, usePhoto } from "@/ui/kit";
import { PressScale } from "@/ui/m3";
import { useSnackbar } from "@/ui/Snackbar";
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

const NEAR = require("../../../assets/images/zero/cleanup.jpg");

export default function Home() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data, error, reload } = useLoad(() => (me ? load(me, s.current?.id ?? null) : Promise.resolve(null)), [me, s.current?.id]);
  const led = (data?.teams ?? []).filter((tm: any) => (tm.participant ?? []).some((p: any) => p.person.reference === me && p.role === "lead" && p.status === "active"))
    .map((team: any) => ({ team, work: (data?.tasks ?? []).filter((x: any) => x.team?.reference === `Team/${team.id}` && ["ready", "requested", "accepted", "in-progress"].includes(x.status) && !x.basedOn)
      .sort((a: any, b: any) => (a.due ?? "9999").localeCompare(b.due ?? "9999")) }))
    .filter((x: any) => x.work.length);
  // Near you (navigation sketch 2): how many groups chose to be found on the network.
  const [near, setNear] = useState(0);
  const [all, setAll] = useState(false);
  useEffect(() => { fetch(`${networkUrl.replace(/\/$/, "")}/$directory`).then((r) => r.json()).then((d) => setNear((d.groups ?? []).length)).catch(() => {}); }, []);
  // A nickname on the web lives in this browser only: offer a Dasig account once they've joined or taken something.
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
  const { show } = useSnackbar();
  // Saying yes or no commits at once; a yes offers Undo for 5 s (it hands the place back).
  const answer = async (x: R, yes: boolean) => {
    try {
      await bix.commit(yes ? (places(x).shift ? act.takePlace(x, me) : act.claim(x, me)) : act.release(x));
      show(yes ? "You're in. Thank you!" : "That's okay, thanks for telling us.", yes ? { undo: async () => { try { const f = await bix.get("Task", x.id); await bix.commit(places(x).shift ? act.leavePlace(f, me) : act.release(f)); show("Undone."); } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); } reload(); } } : undefined);
    } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); }
    reload();
  };
  // Where a task comes from: the group only in the personal context, where it isn't already in the pill (UX_GAPS A5, A6).
  const from = (x: R) => [s.current ? null : groupOf(x)?.name, projOf(x)?.title, teamOf(x)?.name].filter(Boolean).join(" · ");
  const icon = (x: R) => <IconCircle name={teamIcon(teamOf(x)?.name ?? "")} size={44} tone="white" />;

  // Coordinators get the event home (workspace/design/coordinator-sketches.html A1).
  if (s.isLead && s.current) return <CoordinatorHome />;
  // Still loading: a placeholder, never "Nothing open right now" for a moment.
  if (!data && !error) return <Screen><ContextPill /><Skeleton /></Screen>;

  // Zero state: no group and no work yet. A starter home, never "nothing here" (design/home-sketches.html).
  if (data && !asked.length && !mine.length && !done.length && !open.length) return <ZeroHome />;
  const storyPhotos = done.flatMap((x) => imagesOf(x).length ? imagesOf(x).slice(0, 1) : [projOf(x)?.image]).filter((a) => a?.hash).slice(-4).reverse();
  const since = done.map((x) => x.executionPeriod?.end).filter(Boolean).sort()[0];
  return (
    <Screen onRefresh={reload}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><ContextPill />
        <RoundButton icon="search" label="Find groups and projects" onPress={() => router.push("/nearby")} /></View>
      <Text style={[t.title, { marginTop: 14, marginBottom: 2 }]}>{`${hello()}, ${personName(s.person)}`}</Text>
      {error ? <ErrorState message={error} /> : null}
      <InstallGuide />
      <Tip id="volunteer-home" title="Find something to do">Tap “I&apos;m in” to take it.</Tip>
      {/* A team lead's week (navigation sketch 3): their team's open work first, soonest due. */}
      {led.map(({ team, work }) => <View key={team.id}>
        <Eyebrow right={`${work.length}`}>{`${team.name} · you lead`}</Eyebrow>
        <Panel>
          {work.slice(0, 4).map((x) => <Row key={x.id} left={<IconCircle name={x.owner?.reference?.startsWith("Person/") ? "check" : "pending"} tone={x.owner?.reference?.startsWith("Person/") ? "sand" : "grey"} />}
            title={x.title} meta={[x.due ? short(x.due) : null, x.owner?.reference?.startsWith("Person/") ? personName(data?.people[x.owner.reference]) : "nobody yet"].filter(Boolean).join(" · ")} onPress={() => router.push(`/task/${x.id}`)} />)}
          <Row left={<IconCircle name="users" />} title="Open the team" meta={work.length > 4 ? `and ${work.length - 4} more` : undefined} onPress={() => router.push(`/team/${team.id}` as never)} last />
        </Panel>
      </View>)}
      <KeepYourWork />

      {asked.map((x) => { const asker = x.requester?.reference ?? (x.note ?? [])[0]?.author?.reference;
        return <View key={x.id}><Eyebrow>{asker && data?.people[asker] ? `${personName(data.people[asker])} asked you` : "Asked of you"}</Eyebrow>
          <Hero><Pressable onPress={() => router.push(`/task/${x.id}`)} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Photo image={coverOf(x)} w={56} h={56} fallback={!s.current && groupOf(x) ? <Logo name={groupOf(x)!.name} image={groupOf(x)!.image} size={56} /> : icon(x)} />
            <View style={{ flex: 1 }}><Text style={t.row}>{x.title}</Text><Meta>{[from(x), x.due ? short(x.due) : null].filter(Boolean).join(" · ")}</Meta></View></Pressable>
            <Buttons><Primary label="I'm in" onPress={() => answer(x, true)} /><Outline flex label="Can't make it" onPress={() => answer(x, false)} /></Buttons></Hero></View>; })}

      {mine.length ? <><Eyebrow>Yours now</Eyebrow><Panel>{mine.map((x, i) =>
        <Row key={x.id} left={<Photo image={coverOf(x)} w={44} h={44} fallback={icon(x)} />} title={x.title} meta={from(x)} right={x.due ? <Pill tone="ok">{`Due ${short(x.due)}`}</Pill> : undefined} onPress={() => router.push(`/task/${x.id}`)} last={i === mine.length - 1} />)}</Panel></> : null}

      <Eyebrow right={open.length > 8 ? (all ? "Show fewer" : `See all ${open.length}`) : undefined} onRightPress={() => setAll(!all)}>Lend a hand</Eyebrow>
      {open.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 18 }}>
        {(all ? open : open.slice(0, 8)).map((x) => { const f = faces(x);
          return <PressScale key={x.id} onPress={() => router.push(`/task/${x.id}`)} label={`${x.title}, ${from(x)}`} style={{ width: open.length === 1 ? 300 : 236 }}>
            <Photo image={coverOf(x)} w="100%" h={150} r={radius.panel} chip={x.due ? short(x.due) : "Any time"} fallback={<IconCircle name={teamIcon(teamOf(x)?.name ?? "")} size={64} tone="white" />} />
            <Text style={[t.row, { marginTop: 9, marginHorizontal: 2 }]} numberOfLines={1}>{x.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3, marginHorizontal: 2 }}>
              {f.length ? <Faces names={f.map((y) => y.name)} photos={f.map((y) => y.photo)} /> : null}
              <Text style={[t.meta, { flex: 1 }]} numberOfLines={1}>{places(x).shift ? `${places(x).left} of ${places(x).n} places left` : f.length ? `${f.length} going` : x.goodFirstStep ? "A good first step" : from(x) || "Be the first one in"}</Text></View>
          </PressScale>; })}
      </ScrollView>
        : <Sand><IconCircle name="heart" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>Nothing open right now</Text><Meta>{s.groups.length ? "Your groups will post work here." : "Join a group to see their work."}</Meta></View></Sand>}
      {!s.groups.length ? <Buttons><Primary label="Join a group" onPress={() => router.push("/volunteer" as never)} /></Buttons> : null}

      <Eyebrow>Your story</Eyebrow>
      <View style={{ backgroundColor: c.sand, borderRadius: radius.panel, padding: 16 }}>
        <Text style={[t.row, { fontSize: 16 }]}>{done.length ? `${done.length} thing${done.length === 1 ? "" : "s"} done${since ? ` since ${new Date(since).toLocaleDateString(undefined, { month: "long" })}` : ""}` : mine.length ? "Your story has started" : "Your story starts with your first “I'm in”"}</Text>
        <Meta>{mine.length ? `${mine.length} thing${mine.length === 1 ? "" : "s"} in progress` : done.length ? "Thanked and recorded" : "Every step you take is kept, and it's yours"}</Meta>
        {storyPhotos.length ? <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>{storyPhotos.map((a, i) => <Photo key={a?.hash ?? i} image={a} w={78} h={78} />)}</View> : null}
      </View>
      <Eyebrow>On the Bayanihan Network</Eyebrow>
      <Pressable accessibilityRole="button" accessibilityLabel="Find groups and projects" onPress={() => router.push("/nearby")}>
        <Photo image={null} w="100%" h={130} r={radius.panel} chip={near ? `${near} group${near === 1 ? "" : "s"} to find` : "Find groups"} fallback={<Image source={NEAR} style={{ width: "100%", height: 130, borderRadius: radius.panel }} />} />
      </Pressable>
    </Screen>
  );
}
