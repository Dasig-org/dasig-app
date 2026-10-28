import { router } from "expo-router";
import { Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, personName, shortRef, stateLabel, teamIcon } from "@/lib/work";
import { ContextPill } from "@/ui/Context";
import { Buttons, Eyebrow, Hero, IconCircle, Meta, Nav, Notice, Outline, Panel, Pill, Primary, Row, Sand, Screen } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** My work (home): what's asked of you first, then what's yours, then your teams. */
export default function Home() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data, error, reload } = useLoad(async () => {
    if (!me) return null;
    const [mine, teams] = await Promise.all([bix.search("Task", { owner: me }), bix.search("Team", { participant: me })]);
    const helping = (await bix.search("Task", { participant: me })).filter((x) => !mine.some((m) => m.id === x.id));
    return { mine: [...mine, ...helping], teams };
  }, [me]);
  const asked = (data?.mine ?? []).filter((x) => x.status === "requested");
  const doing = (data?.mine ?? []).filter((x) => x.status !== "requested" && x.status !== "completed");
  const done = (data?.mine ?? []).filter((x) => x.status === "completed");
  const teams = (data?.teams ?? []).filter((x) => !s.current || x.organization?.reference === `Organization/${s.current.id}`);

  const answer = async (t: R, yes: boolean) => {
    try { await bix.commit(yes ? act.claim(t, me) : act.release(t)); } catch {} reload();
  };
  return (
    <Screen bottom={<Nav active="home" />}>
      <ContextPill />
      <Text style={[t.title, { marginTop: 14 }]}>{`Good day, ${personName(s.person)}`}</Text>
      {error ? <Notice>{error}</Notice> : null}

      {asked.map((x) => (
        <View key={x.id}><Eyebrow>Asked of you</Eyebrow>
          <Hero><Text style={t.row}>{x.title}</Text><Meta>{shortRef(x) ?? "A task"}</Meta>
            <Buttons><Primary label="I'm in" onPress={() => answer(x, true)} /><Outline label="Can't make it" onPress={() => answer(x, false)} /></Buttons></Hero></View>
      ))}

      <Eyebrow right={doing.length ? `${doing.length}` : undefined}>Yours now</Eyebrow>
      {doing.length ? <Panel>{doing.map((x, i) => <Row key={x.id} left={<IconCircle name="check" />} title={x.title} meta={shortRef(x)} right={<Pill tone={stateLabel(x, me).tone}>{stateLabel(x, me).label}</Pill>} last={i === doing.length - 1} onPress={() => router.push(`/task/${x.id}`)} />)}</Panel>
        : <Sand><IconCircle name="heart" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>Nothing on your plate</Text><Meta>Open a team to find something to take.</Meta></View></Sand>}

      <Eyebrow>Your teams</Eyebrow>
      {teams.length ? <Panel>{teams.map((x, i) => <Row key={x.id} left={<IconCircle name={teamIcon(x.name)} />} title={x.name} meta={(x.participant ?? []).find((p: any) => p.person.reference === me)?.role === "lead" ? "You lead it" : "You're on it"} last={i === teams.length - 1} onPress={() => router.push(`/team/${x.id}`)} />)}</Panel>
        : <Panel><Row left={<IconCircle name="flag" />} title={s.current ? "Start a project" : "Start or join a group"} meta="Teams appear here" onPress={() => router.push(s.current ? "/new-project" : "/doors")} last /></Panel>}

      {done.length ? <><Eyebrow>Your story</Eyebrow><Sand><IconCircle name="check" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>{`${done.length} thing${done.length === 1 ? "" : "s"} done`}</Text><Meta>Recorded and signed by your groups</Meta></View></Sand></> : null}
    </Screen>
  );
}
