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
  const { data, error } = useLoad(() => bix.openLink(token), [token]);
  if (error) return <Screen><View style={{ height: 60 }} /><Text style={t.title}>This link has expired or was turned off</Text><Meta>Ask whoever sent it for a new one.</Meta></Screen>;
  if (!data) return <Screen><Meta>Opening…</Meta></Screen>;
  const join = async () => {
    setBusy(true); setErr(null);
    try {
      if (!s.person) await s.startWithNickname(nick);
      const team = await bix.joinByLink(token);
      await s.refresh();
      router.replace(`/team/${team.id}`);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center", marginTop: 30 }}><IconCircle name={teamIcon(data.title ?? "")} size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{[data.project?.title, data.organization?.name].filter(Boolean).join(" · ")}</Meta><Text style={[t.title, { fontSize: 24 }]}>{data.title}</Text></View></View>
      {data.invitedBy ? <View style={{ marginTop: 16 }}><Sand><Avatar name={data.invitedBy} /><View style={{ flex: 1 }}><Text style={t.row}>{`${data.invitedBy} invited you`}</Text><Meta>{`${data.people} on the team`}</Meta></View></Sand></View> : null}
      {!s.person ? <Field label="What should we call you?" value={nick} onChangeText={setNick} placeholder="e.g. Mia" /> : null}
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Join the team" busy={busy} disabled={!s.person && !nick.trim()} onPress={join} /></Buttons>
      <Meta>{s.person ? "" : "No account needed to join."}</Meta>
    </Screen>
  );
}
