import { useState } from "react";
import { router } from "expo-router";
import { Image, Pressable, Share, Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { short } from "@/lib/dates";
import { appUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { peopleFor, personName, teamIcon } from "@/lib/work";
import { ContextPill } from "./Context";
import { Avatar, Buttons, Check, Eyebrow, Faces, IconCircle, LinkText, Meta, Notice, Outline, Panel, Pill, Primary, Row, RoundButton, Screen, Sheet, Tip, usePhoto } from "./kit";
import { c, radius, type as t } from "./theme";

/*
 * The coordinator's home, built around the next event (workspace/design/coordinator-sketches.html, A1–A2):
 * an event card with countdown, faces, progress and open places; "At risk this week"; "What's new"; and one share for
 * every open place. Open work counts across all of the event's teams, not only the ones the coordinator is on.
 */
const DAY = 86400000;
const active = (x: R) => ((x.participant ?? []) as any[]).filter((p) => p.status === "active");
/** Open places on a piece of work: slots minus people on it, for ready work (BIX Task.slots, 2026-11-09). */
export const openPlaces = (x: R) => (x.status === "ready" ? Math.max(0, ((x.slots as number) ?? 1) - active(x).length) : 0);
const countdown = (iso?: string) => {
  if (!iso) return "No date yet";
  const d = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
  const day = new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return d < 0 ? day : d === 0 ? `${day} · today` : d === 1 ? `${day} · tomorrow` : `${day} · ${d} days`;
};
const inDays = (iso: string) => { const d = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY); return d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`; };
const ago = (iso: string) => { const h = Math.round((Date.now() - Date.parse(iso)) / 3600000); return h < 1 ? "Just now" : h < 24 ? `${h} h ago` : h < 48 ? "Yesterday" : short(iso); };

async function load(orgId: string) {
  const projects = (await bix.search("Initiative", { organization: `Organization/${orgId}` })).filter((p) => p.status !== "completed" && p.status !== "cancelled")
    .sort((a, b) => (a.period?.start ?? "9999").localeCompare(b.period?.start ?? "9999"));
  const [teams, tasks, needs] = await Promise.all([
    Promise.all(projects.map((p) => bix.search("Team", { initiative: `Initiative/${p.id}` }))).then((x) => x.flat()),
    Promise.all(projects.map((p) => bix.search("Task", { partOf: `Initiative/${p.id}` }))).then((x) => x.flat()),
    Promise.all(projects.map((p) => bix.search("Need", { initiative: `Initiative/${p.id}` }))).then((x) => x.flat()),
  ]);
  const offers = (await Promise.all(needs.slice(0, 10).map((n) => bix.search("Offer", { matchedTo: `Need/${n.id}` }).catch(() => [])))).flat();
  const refs = [...tasks.flatMap((x) => active(x).map((p: any) => p.person.reference)), ...teams.flatMap((tm) => ((tm.participant ?? []) as any[]).map((p) => p.person.reference)),
    ...tasks.filter((x) => x.status === "requested").map((x) => x.owner?.reference).filter(Boolean)];
  return { projects, teams, tasks, needs, offers, people: await peopleFor(refs, 40) };
}

function Cover({ image, h, chip }: { image?: R["image"]; h: number; chip: string }) {
  const uri = usePhoto(image);
  return <View style={{ height: h, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
    {uri ? <Image source={{ uri }} resizeMode="cover" style={{ width: "100%", height: "100%" }} /> : <IconCircle name="flag" size={64} tone="white" />}
    <View style={{ position: "absolute", left: 10, top: 10, height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: c.white, justifyContent: "center" }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: c.ink }}>{chip}</Text></View>
  </View>;
}

export function CoordinatorHome() {
  const s = useSession();
  const orgId = s.current!.id;
  const { data, error, reload } = useLoad(() => load(orgId), [orgId]);
  const [sharing, setSharing] = useState<R | null>(null);
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [remind, setRemind] = useState<string | null>(null);
  const name = (r?: string) => personName(r ? data?.people[r] : undefined);
  const teamOf = (x: R) => data?.teams.find((tm) => `Team/${tm.id}` === x.team?.reference);
  const ofProject = (p: R) => (data?.tasks ?? []).filter((x) => x.partOf?.reference === `Initiative/${p.id}` && x.status !== "draft" && x.status !== "cancelled");
  const event = data?.projects[0];
  const work = event ? ofProject(event) : [];
  const openWork = work.filter((x) => openPlaces(x) > 0).sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const done = work.filter((x) => x.status === "completed").length;
  const onIt = new Set(work.flatMap((x) => active(x).map((p: any) => p.person.reference)));
  const faces = [...onIt].slice(0, 5);
  const week = Date.now() + 7 * DAY;

  // At risk this week: open and due soon; asked with no answer; a team with work due but no lead.
  const soonOpen = openWork.filter((x) => x.due && Date.parse(x.due) < week).slice(0, 3);
  const unanswered = (data?.tasks ?? []).filter((x) => x.status === "requested").slice(0, 2);
  const leaderless = (data?.teams ?? []).filter((tm) => !((tm.participant ?? []) as any[]).some((p) => p.role === "lead" && p.status === "active")
    && (data?.tasks ?? []).some((x) => x.team?.reference === `Team/${tm.id}` && x.status === "ready" && x.due && Date.parse(x.due) < week + 7 * DAY));
  const risk = soonOpen.length + unanswered.length + leaderless.length;

  // What's new: joins, takes, finishes and offers in the last week, newest first.
  const news: { at: string; who?: string; text: string; go?: string }[] = [];
  for (const tm of data?.teams ?? []) for (const p of (tm.participant ?? []) as any[]) if (p.status === "active" && p.role !== "lead" && (tm.meta as any)?.lastUpdated) news.push({ at: (tm.meta as any).lastUpdated, who: p.person.reference, text: `${name(p.person.reference)} is on ${tm.name}`, go: `/team/${tm.id}` });
  for (const x of data?.tasks ?? []) {
    const at = (x.meta as any)?.lastUpdated ?? x.executionPeriod?.end ?? x.executionPeriod?.start;
    if (!at || Date.now() - Date.parse(at) > 7 * DAY) continue;
    const last = active(x).at(-1) as any;
    if (x.status === "completed" && last) news.push({ at, who: last.person.reference, text: `${name(last.person.reference)} finished “${x.title}”`, go: `/task/${x.id}` });
    else if (last) news.push({ at, who: last.person.reference, text: `${name(last.person.reference)} took “${x.title}”`, go: `/task/${x.id}` });
  }
  for (const o of data?.offers ?? []) if (o.status === "available" || o.status === "matched") news.push({ at: (o.meta as any)?.lastUpdated ?? new Date().toISOString(), text: `New offer: ${o.description ?? o.category?.display ?? "help"}`, go: o.matchedTo?.[0] ? `/need/${o.matchedTo[0].reference.split("/")[1]}` : undefined });
  news.sort((a, b) => b.at.localeCompare(a.at));

  const message = (p: R) => {
    const lines = openWork.filter((x) => !skip.has(x.id)).map((x) => `• ${x.title}${x.due ? ` (${short(x.due)})` : ""}${openPlaces(x) > 1 ? ` · ${openPlaces(x)} needed` : ""}`);
    const when = p.period?.start ? new Date(p.period.start).toLocaleDateString(undefined, { weekday: "long" }) : "soon";
    return `${p.title} is on ${when}! We still need:\n${lines.join("\n")}\nTap to say I'm in → ${appUrl()}/project/${p.id}`;
  };

  return (
    <Screen onRefresh={reload}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><ContextPill />
        <RoundButton icon="plus" label="New event" onPress={() => router.push("/new-project")} /></View>
      <Text style={[t.title, { marginTop: 14 }]}>{`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${personName(s.person).split(/\s+/)[0]}`}</Text>
      <Text style={t.body}>{event ? (event.period?.start ? `${event.title} is ${inDays(event.period.start)}.` : `${event.title} has no date yet.`) : "Plan your next event."}</Text>
      {error ? <Notice>{error}</Notice> : null}

      {event ? <View style={{ marginTop: 14, borderRadius: radius.panel, overflow: "hidden", backgroundColor: c.white }}>
        <Pressable onPress={() => router.push(`/project/${event.id}`)}><Cover image={event.image} h={150} chip={countdown(event.period?.start)} /></Pressable>
        <View style={{ padding: 16 }}>
          <Text style={[t.title, { fontSize: 22 }]}>{event.title}</Text>
          <Meta>{[(event.extension ?? []).find((x: any) => x.url === "bayanihan:place-text")?.value, `${(data?.teams ?? []).filter((tm) => tm.initiative?.reference === `Initiative/${event.id}`).length} teams`].filter(Boolean).join(" · ")}</Meta>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
            {faces.length ? <Faces names={faces.map(name)} photos={faces.map((r) => data?.people[r]?.photo)} /> : null}
            <Text style={[t.meta, { flex: 1 }]}>{onIt.size ? `${onIt.size} ${onIt.size === 1 ? "person" : "people"} on it` : "Nobody yet"}</Text>
            <Pill>{`${openWork.reduce((n, x) => n + openPlaces(x), 0)} open`}</Pill></View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden", marginTop: 12 }}><View style={{ width: `${work.length ? (done / work.length) * 100 : 0}%`, height: 8, backgroundColor: c.accent }} /></View>
          <Meta>{`${done} of ${work.length} done`}</Meta>
          {event.period?.start && Math.abs(Date.parse(event.period.start) - Date.now()) < DAY ? <Buttons><Primary label="Event day: check people in" onPress={() => router.push(`/project/${event.id}/day` as never)} /></Buttons> : null}
          <Buttons>{openWork.length ? <Primary label="Share open slots" onPress={() => { setSkip(new Set()); setSharing(event); }} /> : null}<Outline flex label="Open" onPress={() => router.push(`/project/${event.id}`)} /></Buttons>
        </View>
      </View> : <View style={{ marginTop: 14 }}><Panel><Row left={<IconCircle name="plus" />} title="Set up your next event" meta="Teams, leads and the work, in one sitting" onPress={() => router.push("/new-project")} last /></Panel></View>}

      {/* Reminders without push (E15): two days before, write each team's reminder for the chat. */}
      {event?.period?.start && Date.parse(event.period.start) > Date.now() && Date.parse(event.period.start) - Date.now() < 3 * DAY ? <View style={{ marginTop: 14 }}>
        <Panel><Row left={<IconCircle name="send" />} title={`${event.title} is ${inDays(event.period.start)}`} meta="Remind each team who's on what" right={<Pill>Remind</Pill>}
          onPress={() => setRemind((data?.teams ?? []).find((tm) => tm.initiative?.reference === `Initiative/${event.id}`)?.id ?? null)} last /></Panel></View> : null}
      {risk ? <><Eyebrow right={`${risk}`}>At risk this week</Eyebrow><Panel>
        {soonOpen.map((x) => <Row key={x.id} left={<IconCircle name={teamIcon(teamOf(x)?.name ?? "")} tone="grey" />} title={x.title}
          meta={[teamOf(x)?.name, x.due ? `due ${short(x.due)}` : null, active(x).length ? `${openPlaces(x)} still needed` : "nobody yet"].filter(Boolean).join(" · ")} right={<Pill>Ask</Pill>} onPress={() => router.push(`/task/${x.id}`)} />)}
        {unanswered.map((x) => <Row key={x.id} left={<Avatar name={name(x.owner?.reference)} photo={data?.people[x.owner?.reference]?.photo} />} title={`${name(x.owner?.reference)} hasn't replied`}
          meta={x.title} right={<LinkText onPress={() => router.push(`/task/${x.id}`)}>Ask someone else</LinkText>} />)}
        {leaderless.map((tm, i) => <Row key={tm.id} left={<IconCircle name="users" />} title={`${tm.name} has no lead`} meta="Work is due soon" right={<Pill>Choose</Pill>} onPress={() => router.push(`/team/${tm.id}`)} last={i === leaderless.length - 1} />)}
      </Panel></> : event ? <View style={{ marginTop: 14 }}><Tip id="no-risk" title="On track">Nothing is at risk this week.</Tip></View> : null}

      {news.length ? <><Eyebrow>What's new</Eyebrow><Panel>
        {news.slice(0, 4).map((x, i, all) => <Row key={i} left={x.who ? <Avatar name={name(x.who)} photo={data?.people[x.who]?.photo} /> : <IconCircle name="heart" />} title={x.text} meta={ago(x.at)}
          onPress={x.go ? () => router.push(x.go as never) : undefined} last={i === all.length - 1} />)}
      </Panel></> : null}

      {(data?.projects.length ?? 0) > 1 ? <><Eyebrow>Other events</Eyebrow><Panel>
        {data!.projects.slice(1).map((p, i, all) => { const w = ofProject(p); const d = w.filter((x) => x.status === "completed").length;
          return <Row key={p.id} left={<IconCircle name="flag" />} title={p.title} meta={[countdown(p.period?.start), `${d} of ${w.length} done`].join(" · ")} onPress={() => router.push(`/project/${p.id}`)} last={i === all.length - 1} />; })}
      </Panel></> : null}

      <Eyebrow>Your group</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="users" />} title="People" meta="Invite, roles, teams" onPress={() => router.push(`/org/${orgId}/people` as never)} />
        <Row left={<IconCircle name="building" />} title="Group profile" onPress={() => router.push(`/org/${orgId}` as never)} last />
      </Panel>

      <Sheet open={!!remind} onClose={() => setRemind(null)}>
        {remind && event ? (() => { const tms = (data?.teams ?? []).filter((tm) => tm.initiative?.reference === `Initiative/${event.id}`); const tm = tms.find((x) => x.id === remind)!;
          const mineW = work.filter((x) => x.team?.reference === `Team/${tm.id}` && x.status !== "completed");
          const arr = mineW.find((x) => x.restriction?.arrival)?.restriction?.arrival;
          const text = `Hi ${tm.name} team! ${event.title} is ${inDays(event.period!.start!)}${arr?.at ? `, be there ${new Date(arr.at).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}` : ""}.${arr?.note ? ` ${arr.note}` : ""}\n${mineW.map((x) => `• ${x.title}: ${active(x).map((p: any) => name(p.person.reference)).join(", ") || "still open"}`).join("\n")}\nCan't make it? Tap your task to say so → ${appUrl()}/project/${event.id}`;
          return <>
            <Text style={[t.row, { fontSize: 18 }]}>Remind the teams</Text>
            <Meta>One message per team, for the chat you already use.</Meta>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>{tms.map((x) => <Pressable key={x.id} onPress={() => setRemind(x.id)} style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: "center", backgroundColor: x.id === remind ? c.accent : c.wash }}>
              <Text style={{ fontWeight: "600", color: x.id === remind ? c.white : c.ink }}>{x.name}</Text></Pressable>)}</View>
            <View style={{ backgroundColor: c.sand, borderRadius: radius.inner, padding: 14, marginTop: 10 }}><Text style={[t.body, { fontSize: 13.5 }]}>{text}</Text></View>
            <Buttons><Primary label="Share" onPress={() => Share.share({ message: text }).catch(() => {})} /></Buttons>
          </>; })() : null}
      </Sheet>

      <Sheet open={!!sharing} onClose={() => setSharing(null)}>
        {sharing ? <>
          <Text style={[t.row, { fontSize: 18 }]}>Share open slots</Text>
          <Meta>One message for the group chat. Each line is still open.</Meta>
          <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>
            {openWork.slice(0, 10).map((x, i, all) => <Row key={x.id} left={<Check on={!skip.has(x.id)} onPress={() => setSkip((k) => { const n = new Set(k); n.has(x.id) ? n.delete(x.id) : n.add(x.id); return n; })} />}
              title={x.title} meta={[teamOf(x)?.name, x.due ? short(x.due) : null, openPlaces(x) > 1 ? `${openPlaces(x)} needed` : null].filter(Boolean).join(" · ")} last={i === all.length - 1} />)}
          </Panel>
          <View style={{ backgroundColor: c.sand, borderRadius: radius.inner, padding: 14, marginTop: 10 }}><Text style={[t.body, { fontSize: 13.5 }]}>{message(sharing)}</Text></View>
          <Buttons><Primary label="Share" onPress={() => { Share.share({ message: message(sharing) }).catch(() => {}); setSharing(null); }} /></Buttons>
        </> : null}
      </Sheet>
    </Screen>
  );
}
