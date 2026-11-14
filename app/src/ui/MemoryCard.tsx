import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable } from "react-native";
import { Icon } from "./Icon";
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
  // Collapsible and hideable, remembered per project on this device (Don, 14 Nov: "dismissable… and can be revisited").
  const key = `dasig.memory.${project.id}`;
  const [view, setView] = useState<{ open: boolean; hiddenUntil: number }>({ open: true, hiddenUntil: 0 });
  useEffect(() => { AsyncStorage.getItem(key).then((v) => { if (v) setView(JSON.parse(v)); }).catch(() => {}); }, [key]);
  const save = (v: typeof view) => { setView(v); AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {}); };
  if (!data || (!data.needed.length && !data.doneByNow.length && !data.outOfOrder.length)) return null;
  const count = data.needed.length + data.doneByNow.length + data.outOfOrder.length;
  const head = <Pressable accessibilityRole="button" accessibilityState={{ expanded: view.open }} onPress={() => save({ ...view, open: !view.open })}
    style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 6, marginHorizontal: 4 }}>
    <Text style={[t.eyebrow, { flex: 1 }]}>{`From your past projects · ${count}`}</Text>
    <Text style={[t.meta, { fontWeight: "600" }]}>{view.open ? "Hide" : "Show"}</Text>
    <View style={{ transform: [{ rotate: view.open ? "-90deg" : "90deg" }] }}><Icon name="chevron" size={14} color="#94a3b8" /></View>
  </Pressable>;
  if (view.hiddenUntil > Date.now()) return <Pressable accessibilityRole="button" onPress={() => save({ open: true, hiddenUntil: 0 })} style={{ marginTop: 14 }}>
    <Panel><Row left={<IconCircle name="book" />} title={`${count} suggestion${count === 1 ? "" : "s"} hidden`} meta={`Until ${new Date(view.hiddenUntil).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}. Tap to show them now.`} last /></Panel></Pressable>;
  if (!view.open) return head;
  const act = async (key: string, f: () => Promise<unknown>, ok: string) => {
    setBusy(key); setMsg(null);
    try { await f(); setMsg(ok); await reload(); onChanged(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  return <View>
    {head}
    {data.needed.length ? <>
      <Eyebrow right={data.usingStarters ? "starter steps" : undefined}>Usually needed, not here yet</Eyebrow>
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
    <View style={{ alignItems: "center", marginTop: 8 }}><LinkText onPress={() => save({ open: true, hiddenUntil: Date.now() + 7 * 86400000 })}>Hide these for a week</LinkText></View>
  </View>;
}
