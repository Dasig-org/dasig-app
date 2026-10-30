import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { teamIcon } from "@/lib/work";
import { Avatar, Buttons, Field, IconCircle, Meta, Notice, Primary, Sand, Screen } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** An invite link: useful before joining; a nickname is enough to join (growth loop 1). */
export default function Join() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const s = useSession();
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { data, error } = useLoad(() => bix.openLink(token), [token]);
  if (error) return <Screen><View style={{ height: 60 }} /><Text style={t.title}>This link has expired or was turned off</Text><Meta>Ask whoever sent it for a new one.</Meta></Screen>;
  if (!data) return <Screen><Meta>Opening…</Meta></Screen>;
  const join = async () => {
    setBusy(true); setErr(null);
    try {
      if (!s.person) await s.startWithNickname(nick);
      const out = await bix.joinByLink(token);
      await s.refresh();
      // A team link returns the team; a group or project link returns your Role in the group.
      const me = await bix.me().catch(() => null);
      const waiting = out.resourceType === "Role" ? out.status === "requested" : (out.participant ?? []).some((p: any) => p.person?.reference === `Person/${me?.id}` && p.status === "requested");
      if (waiting) { setSent(true); return; }
      if (out.resourceType === "Team") router.replace(`/team/${out.id}`);
      else if (data.resourceType === "Initiative") router.replace(`/project/${data.id}`);
      else router.replace("/home");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center", marginTop: 30 }}><IconCircle name={teamIcon(data.title ?? "")} size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{[data.project?.title, data.organization?.name].filter(Boolean).join(" · ")}</Meta><Text style={[t.title, { fontSize: 24 }]}>{data.title}</Text></View></View>
      {data.invitedBy ? <View style={{ marginTop: 16 }}><Sand><Avatar name={data.invitedBy} /><View style={{ flex: 1 }}><Text style={t.row}>{`${data.invitedBy} invited you`}</Text><Meta>{data.people ? `${data.people} on the team` : "Invited you on Dasig"}</Meta></View></Sand></View> : null}
      {!s.person ? <Field label="What should we call you?" value={nick} onChangeText={setNick} placeholder="e.g. Mia" /> : null}
      {err ? <Notice>{err}</Notice> : null}
      {sent ? <Notice>{"Your request was sent. You'll see it here once someone in the group accepts it."}</Notice> : null}
      <Buttons><Primary label={data.resourceType === "Team" ? "Join the team" : data.resourceType === "Initiative" ? "Help with this project" : "Join the group"} disabled={sent || (!s.person && !nick.trim())} busy={busy} onPress={join} /></Buttons>
      <Meta>{s.person ? "" : "No account needed to join."}</Meta>
    </Screen>
  );
}
