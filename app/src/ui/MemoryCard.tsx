import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import type { R } from "@/lib/bix";
import { addFromMemory, declineFromMemory, loadMemory } from "@/lib/memory";
import { useLoad } from "@/lib/use";
import { Eyebrow, IconCircle, LinkText, Notice, Outline, Panel, Row } from "./kit";
import { type as t } from "./theme";

/*
 * Project memory on the project page, rules only (design/bayani-app-sketches.html 6–7; D29): a plain card (no Bayani
 * surface: rules made it) with what the group's past projects usually had, "Worth a look" (usually done by now) and
 * "Out of order". Add makes the step, recorded as suggested by the memory rule; Not this time is kept, so it isn't
 * suggested again. Leads only, and only when the group turned on Project memory.
 */
export function MemoryCard({ project, tasks, teams, onChanged }: { project: R; tasks: R[]; teams: R[]; onChanged: () => void }) {
  const { data, reload } = useLoad(() => loadMemory(project, tasks), [project.id, tasks.length]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!data || (!data.needed.length && !data.doneByNow.length && !data.outOfOrder.length)) return null;
  const act = async (key: string, f: () => Promise<unknown>, ok: string) => {
    setBusy(key); setMsg(null);
    try { await f(); setMsg(ok); await reload(); onChanged(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  return <View>
    {data.needed.length ? <>
      <Eyebrow right={data.usingStarters ? "starter steps" : "from your past projects"}>Usually needed, not here yet</Eyebrow>
      <Panel>{data.needed.map((n, i) => <Row key={n.practice.id} left={<IconCircle name="book" />} title={String(n.practice.title)}
        meta={[n.practice.team ? String(n.practice.team) : null, n.why].filter(Boolean).join(" · ")} last={i === data.needed.length - 1}
        right={<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <LinkText onPress={() => act(n.practice.id, () => declineFromMemory(project, n), "Okay, not this time.")}>Not now</LinkText>
          <Outline label={busy === n.practice.id ? "…" : "Add"} onPress={() => act(n.practice.id, async () => { const tm = await addFromMemory(project, teams, n); return tm; }, `Added “${n.practice.title}”.`)} /></View>} />)}</Panel>
      <Text style={[t.meta, { marginTop: 6, marginHorizontal: 4 }]}>{data.usingStarters ? "Common steps for projects like this. Your group's own list grows after this one." : "Steps done in two thirds or more of your past projects of this kind."}</Text>
    </> : null}
    {data.doneByNow.length ? <><Eyebrow>Worth a look</Eyebrow><Panel>{data.doneByNow.slice(0, 4).map((x, i, all) => <Row key={x.task.id} left={<IconCircle name="clock" />} title={x.task.title} meta={x.why} onPress={() => router.push(`/task/${x.task.id}`)} last={i === all.length - 1} />)}</Panel></> : null}
    {data.outOfOrder.length ? <><Eyebrow>Out of order</Eyebrow><Panel>{data.outOfOrder.slice(0, 4).map((x, i, all) => <Row key={x.task.id} left={<IconCircle name="pending" />} title={x.task.title} meta={`Usually after “${x.waitOn.title}”`} onPress={() => router.push(`/task/${x.task.id}`)} last={i === all.length - 1} />)}</Panel></> : null}
    {msg ? <Notice>{msg}</Notice> : null}
  </View>;
}
