import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix, now } from "@/lib/bix";
import { DAY } from "@/lib/dates";
import { pickDocument, pickPhoto, type Attachment } from "@/lib/files";
import { useLoad } from "@/lib/use";
import { Files } from "@/ui/Files";
import { Buttons, Chips, Eyebrow, Field, Meta, Notice, Panel, Primary, Row, Screen, Title } from "@/ui/kit";

/** Start a vote (BIX Decision). Voters are fixed when it opens; Core counts the result. */
export default function NewVote() {
  const { project, about } = useLocalSearchParams<{ project: string; about?: string }>();
  const [q, setQ] = useState("");
  const [desc, setDesc] = useState("");
  const [opts, setOpts] = useState<{ label: string; files: Attachment[] }[]>([{ label: "", files: [] }, { label: "", files: [] }]);
  const [who, setWho] = useState<"leads" | "everyone">("leads");
  const [days, setDays] = useState("3");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data } = useLoad(async () => {
    const [p, teams] = await Promise.all([bix.get("Initiative", project), bix.search("Team", { initiative: `Initiative/${project}` })]);
    const roles = p.organization ? (await bix.search("Role", { organization: p.organization.reference })).filter((r) => r.status === "active") : [];
    return { p, teams, roles };
  }, [project]);
  const eligible = () => {
    if (!data) return [];
    const refs = who === "leads"
      ? data.teams.flatMap((t) => (t.participant ?? []).filter((x: any) => x.role === "lead" && x.status === "active").map((x: any) => x.person.reference))
      : data.roles.map((r) => r.person.reference);
    return [...new Set(refs)].map((reference) => ({ reference }));
  };
  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const options = opts.filter((o) => o.label.trim()).map((o, i) => ({ id: String.fromCharCode(65 + i), label: o.label.trim(), ...(o.files.length ? { attachment: o.files } : {}) }));
      if (options.length < 2) throw new Error("Add at least two options.");
      const el = eligible();
      if (!el.length) throw new Error(who === "leads" ? "No team has a lead yet." : "No one to vote yet.");
      const d = bix.create("Decision", { partOf: { reference: `Initiative/${project}` }, ...(about ? { about: { reference: about } } : {}), question: q.trim(), ...(desc.trim() ? { description: desc.trim() } : {}),
        method: "choose-one", option: options, eligible: el, opens: now(), closes: new Date(Date.now() + Number(days || "3") * DAY).toISOString(),
        quorum: Math.ceil(el.length / 2), threshold: "majority", showResults: "after-close", status: "open" });
      await bix.commit(d);
      router.replace(`/vote/${d.id}` as never);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen back>
      <Title sub={data?.p.title}>Start a vote</Title>
      <Field label="Question" value={q} onChangeText={setQ} placeholder="e.g. Which design concept?" />
      <Field label="Context (optional)" value={desc} onChangeText={setDesc} multiline placeholder="What people should know before voting" />
      <Eyebrow>Options</Eyebrow>
      {opts.map((o, i) => <Panel key={i} style={{ marginBottom: 8, paddingVertical: 10 }}>
        <Field value={o.label} onChangeText={(v) => setOpts(opts.map((x, j) => (j === i ? { ...x, label: v } : x)))} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
        <View style={{ marginTop: 8 }}><Files items={o.files} onAdd={async () => { const a = (await pickPhoto(false).catch(() => null)) ?? (await pickDocument().catch(() => null)); if (a) setOpts(opts.map((x, j) => (j === i ? { ...x, files: [...x.files, a] } : x))); }} /></View>
      </Panel>)}
      <Row title="＋ Add an option" onPress={() => setOpts([...opts, { label: "", files: [] }])} last />
      <Eyebrow>Who votes</Eyebrow>
      <Chips options={[{ value: "leads", label: "Team leads" }, { value: "everyone", label: "Everyone in the group" }]} value={who} onChange={setWho} />
      <Meta>{`${eligible().length} can vote. Fixed when the vote opens.`}</Meta>
      <Field label="Days open" value={days} onChangeText={setDays} keyboardType="numeric" />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Open the vote" onPress={start} busy={busy} disabled={!q.trim()} /></Buttons>
      <Text style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>Results show when voting closes, so later voters aren&apos;t swayed.</Text>
    </Screen>
  );
}
