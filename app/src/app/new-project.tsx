import { useState } from "react";
import { useLoad } from "@/lib/use";
import { DAY, parseDate } from "@/lib/dates";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { bix, ref } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { SUGGESTED_TEAMS } from "@/lib/work";
import { Buttons, Check, Eyebrow, Field, IconCircle, Meta, Notice, Panel, Pill, Primary, Row, Screen, Title } from "@/ui/kit";
import { atMost, VisibilityChoice, visibilityFields, visibilityOf, type Visibility } from "@/ui/Privacy";
import { type as t } from "@/ui/theme";

/** Onboarding 5–6, in three short steps (UX_GAPS D15): what it is, when and where, who's on it. Teams are suggested; keep, remove, add, pick yours. */
export default function NewProject() {
  const s = useSession();
  const { org } = useLocalSearchParams<{ org?: string }>();
  const orgId = org ?? s.current?.id;
  const [title, setTitle] = useState("");
  const [prefix, setPrefix] = useState("");
  const [place, setPlace] = useState("");
  const [about, setAbout] = useState("");
  const [when, setWhen] = useState("");
  const [from, setFrom] = useState<string>("suggested");
  const { data: saved } = useLoad(async () => (orgId ? bix.search("InitiativeTemplate", { organization: `Organization/${orgId}` }) : []), [orgId]);
  const tmpl = (saved ?? []).find((x) => x.id === from);
  const [teams, setTeams] = useState(SUGGESTED_TEAMS.map((x) => ({ ...x, keep: true })));
  const [mine, setMine] = useState(0);
  const [extra, setExtra] = useState("");
  const groupVis = visibilityOf(s.groups.find((g) => g.org.id === orgId)?.org);
  const [vis, setVis] = useState<Visibility | null>(null);
  const chosen = vis ?? groupVis;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const create = async () => {
    if (!orgId || !s.person) return;
    setBusy(true); setErr(null);
    try {
      const me = ref(s.person);
      const start = parseDate(when);
      const ini = bix.create("Initiative", {
        title: title.trim(), kind: "project", status: "active", organization: { reference: `Organization/${orgId}` }, ...visibilityFields(null, atMost(chosen, groupVis)),
        ...(start ? { period: { start } } : {}),
        ...(about.trim() ? { description: about.trim() } : {}),
        ...(place.trim() ? { extension: [{ url: "bayanihan:place-text", value: place.trim() }] } : {}),
        ...(prefix.trim() ? { identifier: [{ system: "bayanihan:ref-prefix", value: prefix.trim().toUpperCase() }] } : {}),
      });
      const kept = (tmpl ? (tmpl.team ?? []).map((x: any) => ({ name: x.name, icon: "users" as const, keep: true })) : teams).map((x: any, i: number) => ({ ...x, i })).filter((x: any) => x.keep);
      const teamRecs = kept.map((x: any) => bix.create("Team", {
        name: x.name, organization: { reference: `Organization/${orgId}` }, initiative: ref(ini), kind: "initiative",
        access: x.name === "Communications" ? "initiative" : "own-tasks",
        participant: x.i === mine ? [{ person: me, role: "lead", status: "active" }] : [], status: "active",
      }));
      await bix.commit(ini, ...teamRecs);
      if (tmpl) {
        // The usual work for each team, dated from the event when there is a date.
        const anchor = start ? new Date(start).getTime() : null;
        const tasks = (tmpl.action ?? []).map((a: any) => {
          const team = teamRecs.find((r: any) => r.name === a.team);
          const m = /^P(\d+)D-(before|after)$/.exec(a.offset ?? "");
          const due = anchor && m ? new Date(anchor + (m[2] === "before" ? -1 : 1) * Number(m[1]) * DAY).toISOString() : undefined;
          return bix.create("Task", { intent: "plan", status: "ready", title: a.title, partOf: ref(ini), audience: a.audience ?? "team",
            ...(team ? { owner: ref(team), team: ref(team) } : {}), ...(due ? { due } : {}) });
        });
        if (tasks.length) await bix.commit(...tasks);
      }
      router.replace(`/project/${ini.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const back = <Text style={[t.meta, { marginTop: 12, textAlign: "center" }]} onPress={() => setStep((n) => (n > 1 ? ((n - 1) as 1 | 2) : n))}>Back</Text>;
  if (step === 1) return (
    <Screen back>
      <Meta>Step 1 of 3</Meta>
      <Title sub="What's coming up?">New project</Title>
      <Field label="Project" value={title} onChangeText={setTitle} placeholder="e.g. Lahug Uplands Fun Run 2027" />
      <Field label="What it's about" value={about} onChangeText={setAbout} multiline placeholder="What it is, who it's for, and why it matters. Volunteers read this first." />
      <Buttons><Primary label="Next" onPress={() => setStep(2)} disabled={!title.trim()} /></Buttons>
    </Screen>
  );
  if (step === 2) return (
    <Screen>
      <Meta>Step 2 of 3</Meta>
      <Title sub="All optional. You can add these later.">{`When and where is ${title.trim()}?`}</Title>
      <Field label="When" value={when} onChangeText={setWhen} placeholder="e.g. 2027-03-06" />
      <Field label="Where" value={place} onChangeText={setPlace} placeholder="e.g. Mactan Expo" />
      <Field label="Short code for references" value={prefix} onChangeText={setPrefix} placeholder="e.g. LU" autoCapitalize="characters" />
      {when.trim() && !parseDate(when) ? <Notice>That date didn't read right. Try 2027-03-06.</Notice> : null}
      <Buttons><Primary label="Next" onPress={() => setStep(3)} disabled={!!when.trim() && !parseDate(when)} /></Buttons>
      {back}
    </Screen>
  );
  return (
    <Screen>
      <Meta>Step 3 of 3</Meta>
      <Title sub="Suggested teams. Keep, remove or add, and pick yours.">Who's on it?</Title>
      {(saved ?? []).length ? <><Eyebrow>Start from</Eyebrow><Panel>
        {(saved ?? []).map((x) => <Row key={x.id} left={<IconCircle name="repeat" />} title={x.title} meta={`${(x.team ?? []).length} teams · ${(x.action ?? []).length} usual tasks`} right={<Check on={from === x.id} onPress={() => setFrom(x.id)} />} onPress={() => setFrom(x.id)} />)}
        <Row left={<IconCircle name="flag" />} title="Suggested teams" right={<Check on={from === "suggested"} onPress={() => setFrom("suggested")} />} onPress={() => setFrom("suggested")} last />
      </Panel></> : null}
      {tmpl ? null : <>
      <Eyebrow right="Tap to keep or remove">Teams</Eyebrow>
      <Panel>
        {teams.map((x, i) => (
          <View key={x.name + i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: i === teams.length - 1 ? 0 : 1, borderBottomColor: "#e2e8f0" }}>
            <IconCircle name={x.icon} />
            <Text style={[t.row, { flex: 1, opacity: x.keep ? 1 : 0.4 }]}>{x.name}</Text>
            {x.keep ? <Pressable onPress={() => setMine(i)}>{i === mine ? <Pill tone="state">Yours</Pill> : <Text style={t.meta}>Mine?</Text>}</Pressable> : null}
            <Check on={x.keep} onPress={() => setTeams(teams.map((y, j) => (j === i ? { ...y, keep: !y.keep } : y)))} />
          </View>
        ))}
      </Panel>
      <Field value={extra} onChangeText={setExtra} placeholder="Add a team" onSubmitEditing={() => { if (extra.trim()) { setTeams([...teams, { name: extra.trim(), icon: "users", keep: true }]); setExtra(""); } }} returnKeyType="done" />
      </>}
      {err ? <Notice>{err}</Notice> : null}
      <Text style={[t.eyebrow, { marginTop: 18, marginBottom: 8, marginHorizontal: 4 }]}>Who can see this project</Text>
      <VisibilityChoice value={atMost(chosen, groupVis)} onChange={setVis} cap={groupVis} />
      <Buttons><Primary label={tmpl ? `Use these ${(tmpl.team ?? []).length} teams` : `Keep these ${teams.filter((x) => x.keep).length} teams`} onPress={create} busy={busy} disabled={!title.trim() || !orgId} /></Buttons>
      {back}
    </Screen>
  );
}
