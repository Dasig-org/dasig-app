import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Share, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { appUrl } from "@/lib/env";
import { loadInbox, type Item } from "@/lib/inbox";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Avatar, Eyebrow, IconCircle, Panel, Screen, Skeleton, Title } from "@/ui/kit";
import { ErrorState } from "@/ui/ErrorState";
import { SmallButton } from "@/ui/Answer";
import { Icon, type IconName } from "@/ui/Icon";
import { SwipeRow } from "@/ui/m3";
import { PushToggle } from "@/ui/PushToggle";
import { useSnackbar } from "@/ui/Snackbar";
import { c, radius, tone, type as t } from "@/ui/theme";

/*
 * Inbox (redesigned 2026-11-15 after a review): what needs your answer, from all your groups.
 * - Each item: who (a face) or what (an icon), the request in one line, then its group and how long ago; its answer
 *   buttons on their own line under the text (they used to squeeze the text into three-line wraps). Swipe still works.
 * - Needs you (has an answer) first; For your information next, each with its next step ("Review", "Remind",
 *   "Check and send"), not just a chevron.
 * - Filter by group when items come from more than one. The badge counts only what needs an answer.
 * - All caught up: a calm empty state, with the notifications switch while they're off. No "pull down" hint.
 */
const ICON: Record<Item["kind"], IconName> = { ask: "pen", invitation: "mail", "asked-to-do": "userplus", join: "userplus", "team-join": "users", unanswered: "pending", idea: "spark", offer: "heart", report: "receipt" };
const ago = (iso: string, now: number) => {
  const m = Math.round((now - Date.parse(iso)) / 60000);
  if (!iso || !Number.isFinite(m)) return null;
  if (m < 0) return null;
  if (m < 60) return m <= 1 ? "just now" : `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? "yesterday" : d < 7 ? `${d} days ago` : new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export default function Inbox() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data, error, reload } = useLoad(() => loadInbox(me, s.groups), [me, s.groups.length]);
  const [busy, setBusy] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const { show } = useSnackbar();
  const run = async (x: Item, f?: () => Promise<unknown>, done?: string) => { if (!f) return; setBusy(x.id); try { await f(); await reload(); if (done) show(done); } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); } finally { setBusy(null); } };
  const groups = [...new Set((data ?? []).map((x) => x.group).filter(Boolean) as string[])];
  const shown = (data ?? []).filter((x) => !group || x.group === group);
  const needs = shown.filter((x) => x.yes), info = shown.filter((x) => !x.yes);
  const next = (x: Item) => {
    if (!x.next) return;
    if (x.next.share) Share.share({ message: `Hi! Can you say yes or no to "${x.title}"? ${appUrl()}${x.next.share}` }).catch(() => {});
    else if (x.next.go) router.push(x.next.go as never);
  };
  const card = (x: Item, i: number) => {
    const when = ago(x.at, now);
    const body = <View style={{ paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.s200 }}>
      <Pressable disabled={!x.go} onPress={() => router.push(x.go as never)} accessibilityRole={x.go ? "button" : undefined} style={{ flexDirection: "row", gap: 12 }}>
        {x.who ? <Avatar name={(x.who as any).name?.text ?? "?"} photo={(x.who as any).photo} size={40} /> : <IconCircle name={ICON[x.kind]} />}
        <View style={{ flex: 1 }}>
          <Text style={t.row}>{x.title}</Text>
          <Text style={[t.meta, { marginTop: 2 }]}>{[x.meta !== x.group ? x.meta : null, groups.length > 1 || !group ? x.group : null, when].filter(Boolean).filter((v, j, a) => a.indexOf(v) === j).join(" · ")}</Text>
        </View>
        {x.go && !x.yes && !x.next ? <Icon name="chevron" size={16} color={c.s300} /> : null}
      </Pressable>
      {x.yes || x.next ? <View style={{ flexDirection: "row", gap: 8, marginTop: 10, marginLeft: 52 }}>
        {x.yes ? <SmallButton primary label={x.yesLabel ?? "Yes"} busy={busy === x.id} onPress={() => run(x, x.yes, `${x.yesLabel ?? "Done"}.`)} /> : null}
        {x.no ? <SmallButton label={x.noLabel ?? "No"} onPress={() => run(x, x.no, `${x.noLabel ?? "Declined"}.`)} /> : null}
        {x.next ? <SmallButton label={x.next.label} onPress={() => next(x)} /> : null}
      </View> : null}
    </View>;
    return <Animated.View key={x.id} entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} layout={LinearTransition}>
      {x.yes ? <SwipeRow yesLabel={x.yesLabel ?? "Yes"} noLabel={x.noLabel ?? "No"} onYes={() => run(x, x.yes, `${x.yesLabel ?? "Done"}.`)} onNo={x.no ? () => run(x, x.no, `${x.noLabel ?? "Declined"}.`) : undefined}>{body}</SwipeRow> : body}
    </Animated.View>;
  };
  const total = (data ?? []).filter((x) => x.yes).length;
  return (
    <Screen onRefresh={reload}>
      <Title sub={!data ? undefined : total ? `${total} need${total === 1 ? "s" : ""} your answer, from all your groups` : data.length ? "Nothing needs your answer. A few things to know." : "From all your groups"}>Inbox</Title>
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {groups.length > 1 ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
        {[null, ...groups].map((g) => { const on = group === g;
          return <Pressable key={g ?? "all"} onPress={() => setGroup(g)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: "center", backgroundColor: on ? c.ink : c.white, borderWidth: on ? 0 : 1, borderColor: c.s200 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: on ? c.white : c.ink }}>{g ?? "All groups"}</Text></Pressable>; })}
      </View> : null}
      {!data && !error ? <Skeleton />
        : data && !data.length ? <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: tone.secondaryContainer, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={34} color={tone.onSecondaryContainer} /></View>
          <Text style={[t.title, { fontSize: 22, marginTop: 14 }]}>{"You're all caught up"}</Text>
          <Text style={[t.meta, { textAlign: "center", marginTop: 6, maxWidth: 300 }]}>{s.groups.length ? "When someone asks you something, wants to join, offers help, or a report is ready, it shows here." : "When a group asks you something, it shows here."}</Text>
        </View>
        : <>
          {needs.length ? <><Eyebrow right={`${needs.length}`}>Needs you</Eyebrow><Panel>{needs.map(card)}</Panel>
            <Text style={[t.meta, { marginTop: 6, marginHorizontal: 4 }]}>Or swipe right to say yes, left to decline.</Text></> : null}
          {info.length ? <><Eyebrow right={`${info.length}`}>For your information</Eyebrow><Panel>{info.map(card)}</Panel></> : null}
        </>}
      <View style={{ marginTop: 16 }}><PushToggle card /></View>
    </Screen>
  );
}
