import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { bix } from "@/lib/bix";
import { ROLE_WORDS } from "@/lib/org";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { peopleFor, personName } from "@/lib/work";
import { Avatar, Buttons, Check, Eyebrow, Field, IconCircle, Meta, Notice, Panel, Primary, Row, Screen, Skeleton, Title } from "@/ui/kit";
import { useSnackbar } from "@/ui/Snackbar";

/*
 * End of term: hand the group to the next officer (coordinator sketches E16). The successor becomes an officer first,
 * then you step down to core member, so the group always has an officer (the server refuses the reverse order).
 * Everything stays: projects, reports, saved events, people. A note for them is kept on the group.
 */
export default function Handover() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const { data } = useLoad(async () => {
    const [org, roles, projects, templates] = await Promise.all([bix.get("Organization", id), bix.search("Role", { organization: `Organization/${id}` }),
      bix.search("Initiative", { organization: `Organization/${id}` }), bix.search("InitiativeTemplate", { organization: `Organization/${id}` }).catch(() => [])]);
    const active = roles.filter((r) => r.status === "active");
    return { org, active, projects, templates, people: await peopleFor(active.map((r) => r.person.reference), 40) };
  }, [id]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const mine = data.active.find((r) => r.person.reference === me && r.code?.code === "officer");
  const others = data.active.filter((r) => r.person.reference !== me);
  const go = async () => {
    const next = others.find((r) => r.person.reference === to); if (!mine || !next) return;
    setBusy(true); setMsg(null);
    try {
      await bix.commit(bix.next(next, { code: { system: "bayanihan:role", code: "officer" } }));
      await bix.commit(bix.next(mine, { code: { system: "bayanihan:role", code: "core-member" } }));
      if (note.trim()) await bix.commit(bix.next(data.org, { extension: [...(data.org.extension ?? []).filter((x: any) => x.url !== "bayanihan:handover-note"), { url: "bayanihan:handover-note", value: note.trim() }] })).catch(() => {});
      await s.refresh(); router.replace(`/org/${id}` as never);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen back>
      <Title sub={data.org.name}>Hand over to the next officer</Title>
      {!mine ? <Notice>Only an officer can hand over the group.</Notice> : null}
      <Eyebrow>Who takes over</Eyebrow>
      <Panel>{others.map((r, i) => <Row key={r.id} left={<Avatar name={personName(data.people[r.person.reference])} photo={data.people[r.person.reference]?.photo} />}
        title={personName(data.people[r.person.reference])} meta={ROLE_WORDS[r.code?.code] ?? ""} right={<Check on={to === r.person.reference} onPress={() => setTo(r.person.reference)} />}
        onPress={() => setTo(r.person.reference)} last={i === others.length - 1} />)}</Panel>
      <Eyebrow>What they get</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="flag" />} title="Every project and its report" meta={`${data.projects.length} so far`} />
        <Row left={<IconCircle name="repeat" />} title="Your saved events" meta={data.templates.length ? data.templates.map((x) => x.title).join(", ") : "None saved yet"} />
        <Row left={<IconCircle name="users" />} title="People and their roles" meta={`${data.active.length} people`} last />
      </Panel>
      <Field label="A note for them" value={note} onChangeText={setNote} multiline placeholder="What I'd do differently next time…" />
      <Buttons><Primary label={to ? `Hand over to ${personName(data.people[to])}` : "Choose who takes over"} onPress={go} busy={busy} disabled={!to || !mine} /></Buttons>
      <Text style={{ textAlign: "center", marginTop: 10 }}><Meta>You stay in the group as a core member. Nothing is lost.</Meta></Text>
    </Screen>
  );
}
