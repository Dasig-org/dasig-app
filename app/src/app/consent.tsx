import { useState } from "react";
import { Text } from "react-native";
import { bix, now, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Check, Eyebrow, IconCircle, Meta, Notice, Panel, Row, Screen, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";

const SCOPES = [
  { scope: "share-messages-for-bayani", icon: "spark", title: "Help Bayani learn", meta: "Share messages you pick, names removed first. Off by default." },
  { scope: "appear-in-credits", icon: "heart", title: "Appear in project credits", meta: "As your credit name, or anonymous" },
  { scope: "photo-of-me", icon: "camera", title: "Photos of me in my groups", meta: "Shown only inside the group" },
  { scope: "contact-by-group", icon: "send", title: "Groups may contact me", meta: "About work you signed up for" },
] as const;

/** Consent (BIX Consent): recorded once, withdrawable any time. Defaults keep everything on the phone. */
export default function ConsentScreen() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [msg, setMsg] = useState<string | null>(null);
  const { data, reload } = useLoad(async () => (me ? bix.search("Consent", { person: me }) : []), [me]);
  const find = (scope: string) => (data ?? []).find((c) => c.scope === scope);
  const toggle = async (scope: string) => {
    const cur = find(scope) as R | undefined;
    try {
      if (!cur) await bix.commit(bix.create("Consent", { person: { reference: me }, scope, status: "active", dateTime: now(), sharing: "private" }));
      else await bix.commit(bix.next(cur, { status: cur.status === "active" ? "withdrawn" : "active", dateTime: now() }));
      reload();
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  const defaults: Record<string, boolean> = { "appear-in-credits": true, "photo-of-me": true, "contact-by-group": true, "share-messages-for-bayani": false };
  return (
    <Screen back>
      <Title sub="Nothing happens without your say. Change any of these at any time.">What you've agreed to</Title>
      <Panel>{SCOPES.map((x, i) => { const c = find(x.scope); const on = c ? c.status === "active" : defaults[x.scope];
        return <Row key={x.scope} left={<IconCircle name={x.icon as never} tone={x.scope === "share-messages-for-bayani" ? "bayani" : "sand"} />} title={x.title} meta={x.meta} right={<Check on={!!on} onPress={() => toggle(x.scope)} />} last={i === SCOPES.length - 1} />; })}</Panel>
      <Eyebrow>Photos that show children</Eyebrow>
      <Text style={t.body}>Mark them when you add them. They never leave the group: no link previews, no public pages, no profiles.</Text>
      {msg ? <Notice>{msg}</Notice> : null}
      <Meta>{"\nBayani reads messages on your phone. Nothing is sent anywhere unless you turn on sharing above."}</Meta>
    </Screen>
  );
}
