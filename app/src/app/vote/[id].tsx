import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix, now } from "@/lib/bix";
import { short } from "@/lib/dates";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Files } from "@/ui/Files";
import { Body, Buttons, Check, Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Pill, Primary, Row, Sand, Screen } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** A vote: options with their files, one vote each (changeable until it closes), result counted by Core, statement by a person. */
export default function Vote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [pick, setPick] = useState<string | null>(null);
  const [stmt, setStmt] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const { data, reload } = useLoad(async () => { const d = await bix.get("Decision", id); const tally = await bix.tally(id).catch(() => null); return { d, tally }; }, [id]);
  if (!data) return <Screen back><Meta>Loading…</Meta></Screen>;
  const { d, tally } = data;
  const canVote = d.status === "open" && (d.eligible ?? []).some((e: any) => e.reference === me);
  const mine = pick ?? tally?.mine?.[0] ?? null;
  const run = async (fn: () => Promise<unknown>, ok?: string) => { try { await fn(); if (ok) setMsg(ok); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  const vote = () => run(() => bix.commit(bix.create("Vote", { decision: { reference: `Decision/${id}` }, voter: { reference: me }, choice: [mine], cast: now() })), "Your vote is in. You can change it until it closes.");
  const close = () => run(async () => { const c1 = bix.next(d, { status: "closed" }); await bix.commit(c1); await bix.commit(bix.next(c1, { status: "decided" })); });
  const decided = d.status === "decided";
  const winner = decided ? (d.option ?? []).find((o: any) => d.outcome?.option?.includes(o.id)) : null;
  const total = Object.values(tally?.tally ?? {}).reduce((a: number, b) => a + (b as number), 0) || 1;
  return (
    <Screen back>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name="flag" size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{decided ? "Decided" : d.status === "no-quorum" ? "Not enough votes" : `Vote · closes ${short(d.closes)}`}</Meta><Text style={[t.title, { fontSize: 24 }]}>{d.question}</Text></View></View>
      {d.description ? <View style={{ marginTop: 10 }}><Body>{d.description}</Body></View> : null}
      {decided && winner ? <View style={{ marginTop: 14 }}><Sand><IconCircle name="check" tone="white" /><View style={{ flex: 1 }}><Text style={t.row}>{winner.label}</Text><Meta>Chosen by majority</Meta></View></Sand></View> : null}
      {d.statement ? <View style={{ marginTop: 10 }}><Sand><Text style={[t.row, { flex: 1 }]}>{`“${d.statement}”`}</Text></Sand></View> : null}
      <Eyebrow right={tally ? `${tally.voted} of ${tally.eligible} voted` : undefined}>Options</Eyebrow>
      <Panel>{(d.option ?? []).map((o: any, i: number) => <View key={o.id} style={{ paddingVertical: 12, borderBottomWidth: i === d.option.length - 1 ? 0 : 1, borderBottomColor: c.s200 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}><Text style={t.row}>{`${o.id} · ${o.label}`}</Text>{tally?.tally ? <Meta>{`${tally.tally[o.id] ?? 0} vote${(tally.tally[o.id] ?? 0) === 1 ? "" : "s"}`}</Meta> : null}</View>
          {canVote ? <Check on={mine === o.id} onPress={() => setPick(o.id)} /> : mine === o.id ? <Pill tone="state">Your vote</Pill> : null}
        </View>
        {tally?.tally ? <View style={{ height: 8, borderRadius: 4, backgroundColor: c.wash, marginTop: 8, overflow: "hidden" }}><View style={{ width: `${((tally.tally[o.id] ?? 0) / total) * 100}%`, height: 8, backgroundColor: c.accent }} /></View> : null}
        {(o.attachment ?? []).length ? <View style={{ marginTop: 8 }}><Files items={o.attachment} /></View> : null}
      </View>)}</Panel>
      {!tally?.tally && d.status === "open" ? <Meta>{"Results show when voting closes."}</Meta> : null}
      {canVote ? <Buttons><Primary label={mine ? `Vote for ${mine}` : "Pick an option"} disabled={!mine} onPress={vote} /></Buttons> : null}
      {d.status === "open" && s.isLead ? <Buttons><Outline flex label="Close voting now" onPress={close} /></Buttons> : null}
      {decided && s.isLead && !d.statement ? <><Field label="Say what was decided (shown to everyone)" value={stmt} onChangeText={setStmt} placeholder="e.g. Concept B, with the colours from A" />
        <Buttons><Primary label="Post" disabled={!stmt.trim()} onPress={() => run(() => bix.commit(bix.next(d, { statement: stmt.trim() })))} /></Buttons></> : null}
      {msg ? <Notice>{msg}</Notice> : null}
    </Screen>
  );
}
