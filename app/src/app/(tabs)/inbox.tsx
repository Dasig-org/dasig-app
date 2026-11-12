import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { loadInbox, type Item } from "@/lib/inbox";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Avatar, IconCircle, LinkText, Meta, Notice, Outline, Panel, Row, Screen, Skeleton, Title } from "@/ui/kit";
import type { IconName } from "@/ui/Icon";
import { PushToggle } from "@/ui/PushToggle";
import { type as t } from "@/ui/theme";

const ICON: Record<Item["kind"], IconName> = { ask: "pen", join: "userplus", "team-join": "users", unanswered: "pending", idea: "spark", offer: "heart", report: "receipt" };

/** Inbox: what needs your answer, newest first, with the action in place. */
export default function Inbox() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data, error, reload } = useLoad(() => loadInbox(me, s.groups), [me, s.groups.length]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (x: Item, f?: () => Promise<unknown>) => { if (!f) return; setBusy(x.id); setMsg(null); try { await f(); await reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); } };
  return (
    <Screen onRefresh={reload}>
      <Title sub={data ? (data.length ? `${data.length} thing${data.length === 1 ? "" : "s"} for you, from all your groups` : "From all your groups") : undefined}>Inbox</Title>
      {error ? <Notice>{error}</Notice> : null}{msg ? <Notice>{msg}</Notice> : null}
      {!data ? <Skeleton /> : !data.length ? <View style={{ marginTop: 12 }}><Panel><Row left={<IconCircle name="check" />} title="Nothing needs you right now"
        meta={s.groups.length ? "Asks, people asking to join, offers and reports will show here." : "When a group asks you something, it shows here."} last /></Panel></View>
        : <Panel>{data.map((x, i) => <Row key={x.id} last={i === data.length - 1} title={x.title} meta={x.meta}
          left={x.who ? <Avatar name={(x.who as any).name?.text ?? "?"} photo={(x.who as any).photo} size={40} /> : <IconCircle name={ICON[x.kind]} />}
          onPress={x.go ? () => router.push(x.go as never) : undefined}
          right={x.yes ? <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            {x.no ? <LinkText onPress={() => run(x, x.no)}>{x.noLabel ?? "No"}</LinkText> : null}
            <Outline label={busy === x.id ? "…" : x.yesLabel ?? "Yes"} onPress={() => run(x, x.yes)} /></View> : undefined} />)}</Panel>}
      <View style={{ marginTop: 12 }}><PushToggle card /></View>
      <Text style={[t.meta, { textAlign: "center", marginTop: 14 }]}>Pull down to refresh.</Text>
    </Screen>
  );
}
