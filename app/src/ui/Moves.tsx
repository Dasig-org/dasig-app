import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { runTogether, type Move } from "@/lib/copilot";
import { Icon } from "./Icon";
import { Field, listLayout } from "./kit";
import { useCommit, useSnackbar } from "./Snackbar";
import { c, motion, radius, tone, type as t } from "./theme";

/*
 * Suggestions as a list you act on (UI_REIMAGINE §7.2e). One look everywhere: the project page's Plan check and the
 * Bayani sheet. Each item: a tinted icon that says what kind it is (late, people, plan, Bayani), the finding in one
 * line, why in plain words, then its action and "Not now" on their own line at the thumb, never squeezed beside the
 * title. Tapping the item opens the record. Acting gives a snackbar with Undo; "Not now" is remembered for that record.
 */

const TINT: Record<string, [string, string]> = {
  late: [tone.errorContainer, tone.onErrorContainer],
  people: [tone.primaryContainer, tone.onPrimaryContainer],
  check: [tone.secondaryContainer, tone.onSecondaryContainer],
  needed: [tone.secondaryContainer, tone.onSecondaryContainer],
  bayani: [c.white, c.accent],
};
function Mark({ m }: { m: Move }) {
  const [bg, fg] = TINT[m.by === "bayani" ? "bayani" : m.tag] ?? TINT.check!;
  return <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, alignItems: "center", justifyContent: "center", marginTop: 2 }}><Icon name={m.icon} size={18} color={fg} /></View>;
}

/** The small actions under an item: a tonal button for the move, text for "Not now". 40px tall, at the thumb. */
function Act({ label, onPress, busy, quiet }: { label: string; onPress: () => void; busy?: boolean; quiet?: boolean }) {
  return <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: quiet ? 8 : 16, borderRadius: radius.pill, justifyContent: "center", backgroundColor: quiet ? "transparent" : pressed ? tone.primaryContainer : tone.surfaceHigh, borderWidth: quiet ? 0 : 1, borderColor: c.s200, opacity: busy ? 0.6 : 1 })}>
    <Text style={{ fontSize: 14, fontWeight: "600", color: quiet ? c.s500 : c.ink }}>{busy ? "…" : label}</Text></Pressable>;
}

export type MovesApi = ReturnType<typeof useMoves>;
/** Running, declining and undoing moves, shared by every list of them. `onChanged` runs after anything is committed. */
export function useMoves(onChanged?: () => void) {
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const commit = useCommit();
  const { show } = useSnackbar();
  const forget = (ids: string[], on: boolean) => setGone((g) => { const n = new Set(g); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; });
  const done = (ids: string[]) => { forget(ids, true); onChanged?.(); };
  const back = (ids: string[]) => { forget(ids, false); onChanged?.(); };
  return {
    gone, busy, texts,
    setText: (id: string, v: string) => setTexts((x) => ({ ...x, [id]: v })),
    run: async (m: Move) => {
      if (!m.run) return;
      setBusy(m.id);
      let undo: (() => Promise<void>) | undefined;
      const ok = await commit(`Done: ${m.title}`, async () => { undo = await m.run!(texts[m.id]); return true; }, { undo: () => { undo?.().then(() => back([m.id])).catch(() => show("Couldn't undo that.", { error: true })); } });
      if (ok) done([m.id]);
      setBusy(null);
    },
    decline: async (m: Move) => {
      if (!m.decline) return;
      setBusy(m.id);
      const ok = await commit("Okay, not this time. It won't be suggested again here.", async () => { await m.decline!(); return true; });
      if (ok) done([m.id]);
      setBusy(null);
    },
    runAll: async (ms: Move[]) => {
      setBusy("all");
      const r = await runTogether(ms, texts);
      if (r.done) done(ms.slice(0, r.done).map((m) => m.id));
      if (r.done) show(`Done ${r.done} thing${r.done === 1 ? "" : "s"}${r.error ? `, then stopped: ${r.error}` : "."}`, { undo: () => { r.undo().then(() => back(ms.map((m) => m.id))).catch(() => show("Couldn't undo all of it.", { error: true })); }, ms: 7000 });
      else if (r.error) show(r.error, { error: true });
      setBusy(null);
    },
  };
}

/** A list of moves. `onOpen` runs before a move's page opens (e.g. to close a sheet). */
export function MoveList({ moves, api, onOpen, max }: { moves: Move[]; api: MovesApi; onOpen?: () => void; max?: number }) {
  const [all, setAll] = useState(false);
  const shown = moves.filter((m) => !api.gone.has(m.id));
  const list = max && !all ? shown.slice(0, max) : shown;
  if (!shown.length) return null;
  return <View>
    {list.map((m, i) => <Animated.View key={m.id} entering={FadeIn.duration(motion.fade)} exiting={FadeOut.duration(motion.tab)} layout={listLayout}
      style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.s200 }}>
      <Pressable disabled={!m.go} onPress={() => { onOpen?.(); router.push(m.go as never); }} accessibilityRole={m.go ? "button" : undefined} accessibilityLabel={`${m.title}. ${m.why}`}
        style={({ pressed }) => ({ flexDirection: "row", gap: 12, paddingVertical: 12, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: radius.inner, backgroundColor: pressed ? "rgba(15,23,42,0.05)" : "transparent" })}>
        <Mark m={m} />
        <View style={{ flex: 1 }}>
          <Text style={t.row}>{m.title}</Text>
          <Text style={[t.meta, { marginTop: 2 }]}>{m.why}</Text>
        </View>
        {m.go ? <View style={{ paddingTop: 10 }}><Icon name="chevron" size={16} color={c.s300} /></View> : null}
      </Pressable>
      {m.edit !== undefined ? <View style={{ marginLeft: 48, marginTop: -8 }}><Field value={api.texts[m.id] ?? m.edit} onChangeText={(v) => api.setText(m.id, v)} maxLength={60} accessibilityLabel="Name to keep for next time" /></View> : null}
      {m.run || m.decline ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 48, paddingBottom: 12, marginTop: m.edit !== undefined ? 8 : -2 }}>
        {m.run ? <Act label={m.runLabel ?? "Do it"} busy={api.busy === m.id} onPress={() => api.run(m)} /> : null}
        {m.decline ? <Act quiet label="Not now" onPress={() => api.decline(m)} /> : null}
      </View> : null}
    </Animated.View>)}
    {max && shown.length > max ? <Pressable onPress={() => setAll(!all)} accessibilityRole="button" style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderTopColor: c.s200 }}>
      <Text style={[t.meta, { fontWeight: "600", color: c.accent }]}>{all ? "Show fewer" : `Show ${shown.length - max} more`}</Text>
      <View style={{ transform: [{ rotate: all ? "-90deg" : "90deg" }] }}><Icon name="chevron" size={14} color={c.accent} /></View>
    </Pressable> : null}
  </View>;
}
