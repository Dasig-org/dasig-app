import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { Buttons, Chips, Field, Notice, Primary, Screen, Title } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

const KINDS = [
  { value: "civic-club", label: "Club or chapter" }, { value: "community", label: "Community or meetup" },
  { value: "event-team", label: "Event team" }, { value: "informal", label: "Other" },
] as const;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

/** Onboarding 3: start a group. The server makes its founder an officer by rule. */
export default function StartGroup() {
  const s = useSession();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("community");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const create = async () => {
    setBusy(true); setErr(null);
    try {
      const [org] = await bix.commit(bix.create("Organization", { name: name.trim(), kind, publicSummary: true }));
      await s.refresh(); s.setCurrent(org!);
      router.replace({ pathname: "/new-project", params: { org: org!.id } });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen back>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: c.accent, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Text style={{ color: c.white, fontWeight: "800", fontSize: 22 }}>{initials(name)}</Text></View>
      <Title>Start a group</Title>
      <Field label="Group name" value={name} onChangeText={setName} placeholder="e.g. Lahug Uplands Runners Club" />
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: c.s500, marginTop: 14, marginLeft: 4 }}>What kind of group?</Text>
      <Chips options={[...KINDS]} value={kind} onChange={setKind} />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Create group" onPress={create} busy={busy} disabled={!name.trim()} /></Buttons>
      <Text style={[t.meta, { marginTop: 12, textAlign: "center" }]}>Your group's name and kind are public, so others can find you. You can change this later.</Text>
    </Screen>
  );
}
