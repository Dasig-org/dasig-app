import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix, now, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, peopleFor, personName, places } from "@/lib/work";
import { Avatar, Buttons, Check, Chips, Eyebrow, Field, IconCircle, Meta, Panel, Pill, Primary, Row, Screen, Sheet, Skeleton, Title } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";
import { useSnackbar } from "@/ui/Snackbar";

/*
 * Event day (workspace/design/coordinator-sketches.html C10–C11): who's checked in, by team; what's still open; and
 * walk-ins. Check-in writes BIX Task.participant.attended {at, by} (2026-11-09), the same field a volunteer sets with
 * "I'm here", so either side can record it.
 */
type P = { person: { reference: string }; role: string; status: string; attended?: { at: string; by: { reference: string } } };
const on = (x: R) => ((x.participant ?? []) as P[]).filter((p) => p.status === "active");

export default function EventDay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [team, setTeam] = useState("all");
  const [walkin, setWalkin] = useState(false);
  const [nick, setNick] = useState("");
  const [into, setInto] = useState<string | null>(null);
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const { data, reload } = useLoad(async () => {
    const [p, teams, tasks] = await Promise.all([bix.get("Initiative", id), bix.search("Team", { initiative: `Initiative/${id}` }), bix.search("Task", { partOf: `Initiative/${id}` })]);
    const live = tasks.filter((x) => !["draft", "cancelled"].includes(x.status));
    return { p, teams, tasks: live, people: await peopleFor(live.flatMap((x) => on(x).map((y) => y.person.reference)), 60) };
  }, [id]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { p, teams, tasks, people } = data;
  const day = p.period?.start ? new Date(p.period.start).toDateString() : null;
  // Today's work: due on the event day (or with an arrival that day); otherwise everything still to do.
  const today = tasks.filter((x) => (day && ((x.due && new Date(x.due).toDateString() === day) || (x.restriction?.arrival?.at && new Date(x.restriction.arrival.at).toDateString() === day))) || x.status !== "completed");
  const shown = today.filter((x) => team === "all" || x.team?.reference === `Team/${team}`);
  const rows = shown.flatMap((x) => on(x).map((y) => ({ task: x, p: y })));
  const here = today.flatMap(on).filter((y) => y.attended).length, total = today.flatMap(on).length;
  const stillOpen = today.filter((x) => places(x).left > 0 || x.status === "ready");
  const teamName = (x: R) => teams.find((tm) => `Team/${tm.id}` === x.team?.reference)?.name ?? "";
  const toggle = async (x: R, who: string) => {
    const next = bix.next(x, { participant: ((x.participant ?? []) as P[]).map((y) => (y.person.reference === who ? (y.attended ? (({ attended, ...r }) => r)(y) : { ...y, attended: { at: now(), by: { reference: me } } }) : y)) });
    try { await bix.commit(next); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  const addWalkin = async () => {
    const x = tasks.find((k) => k.id === into); if (!x || !nick.trim()) return;
    const org = p.organization;
    const person = bix.create("Person", { name: { text: nick.trim(), use: "nickname" }, credit: "nickname", managedBy: org, sharing: "organization" });
    const role = bix.create("Role", { person: { reference: `Person/${person.id}` }, organization: org, code: { system: "bayanihan:role", code: "volunteer-episodic" }, status: "active", period: { start: now() } });
    const ref = `Person/${person.id}`;
    const joined = places(x).shift ? act.takePlace(x, ref) : bix.next(x, { status: "accepted", owner: { reference: ref }, participant: [...on(x), { person: { reference: ref }, role: "owner", status: "active" }] });
    joined.participant = (joined.participant as P[]).map((y) => (y.person.reference === ref ? { ...y, attended: { at: now(), by: { reference: me } } } : y));
    try { await bix.commit(person, role); await bix.commit(joined); setWalkin(false); setNick(""); setMsg(`${nick.trim()} is checked in. They can claim their record later from your invite.`); reload(); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <Screen back onRefresh={reload}>
      <Title sub={[p.period?.start ? new Date(p.period.start).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }) : null, (p.extension ?? []).find((x: any) => x.url === "bayanihan:place-text")?.value].filter(Boolean).join(" · ")}>{`Today: ${p.title}`}</Title>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: c.white, borderRadius: radius.panel, padding: 14 }}><Text style={[t.title, { fontSize: 22 }]}>{`${here} of ${total}`}</Text><Meta>checked in</Meta></View>
        <View style={{ flex: 1, backgroundColor: c.white, borderRadius: radius.panel, padding: 14 }}><Text style={[t.title, { fontSize: 22 }]}>{`${stillOpen.length}`}</Text><Meta>still open</Meta></View>
      </View>
      <Eyebrow>Check people in</Eyebrow>
      <Chips options={[{ value: "all", label: "All" }, ...teams.map((tm) => ({ value: tm.id, label: tm.name }))]} value={team} onChange={setTeam} />
      <View style={{ marginTop: 10 }}><Panel>
        {rows.length ? rows.map((r, i) => <Row key={r.task.id + r.p.person.reference} left={<Avatar name={personName(people[r.p.person.reference])} photo={people[r.p.person.reference]?.photo} />}
          title={personName(people[r.p.person.reference])} meta={[teamName(r.task), r.task.title, r.p.attended ? `here ${new Date(r.p.attended.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : null].filter(Boolean).join(" · ")}
          right={<Check on={!!r.p.attended} onPress={() => toggle(r.task, r.p.person.reference)} />} last={i === rows.length - 1} />)
          : <Row title="Nobody on today's work yet" meta="Share the open places, or add a walk-in volunteer" last />}
      </Panel></View>
      <Buttons><Primary label="Add a walk-in volunteer" onPress={() => { setInto(stillOpen[0]?.id ?? today[0]?.id ?? null); setWalkin(true); }} /></Buttons>
      {stillOpen.length ? <><Eyebrow right={`${stillOpen.length}`}>Still open</Eyebrow><Panel>
        {stillOpen.map((x, i) => <Row key={x.id} left={<IconCircle name="pending" tone="grey" />} title={x.title} meta={teamName(x)} right={<Pill>{places(x).shift ? `${places(x).left} needed` : "Open"}</Pill>}
          onPress={() => router.push(`/task/${x.id}`)} last={i === stillOpen.length - 1} />)}</Panel></> : null}
      <Sheet open={walkin} onClose={() => setWalkin(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>A walk-in volunteer</Text>
        <Meta>{"Someone who came to help today without signing up first. Check them in on a piece of work."}</Meta>
        <Field label="Nickname" value={nick} onChangeText={setNick} placeholder="e.g. Paolo" autoFocus />
        <Eyebrow>On which work</Eyebrow>
        <Chips options={today.slice(0, 12).map((x) => ({ value: x.id, label: x.title }))} value={into ?? ""} onChange={setInto} />
        <Buttons><Primary label={nick.trim() ? `Check in ${nick.trim()}` : "Check in"} onPress={addWalkin} disabled={!nick.trim() || !into} /></Buttons>
        <Meta>{"\nTheir work counts like anyone's. They claim it later from your group's invite."}</Meta>
      </Sheet>
    </Screen>
  );
}
