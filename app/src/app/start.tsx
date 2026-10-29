import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { Buttons, Field, Notice, Primary, Screen } from "@/ui/kit";
import { Emblem } from "@/ui/onboarding/Emblem";
import type { IconName } from "@/ui/Icon";
import { c, type as t } from "@/ui/theme";
import { Intro } from "@/ui/onboarding/Intro";

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  { icon: "users", title: "Your group, organized", body: "Projects, teams and who's doing what, in one place everyone can see." },
  { icon: "heart", title: "Volunteers are part of it", body: "Anyone can say \u201cI'm in\u201d, help out, suggest work, and get credit." },
  { icon: "lock", title: "Yours, even offline", body: "Everything is kept on your phones. Your group can share one phone as a hub, no internet needed." },
];

/** Welcome: the four-beat intro (ported from Dasig Fundraising), then a nickname. */
export default function Start() {
  const s = useSession();
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await s.startWithNickname(name); router.replace("/profile?first=1" as never); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  if (asking) return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 30 }}><Emblem size={64} /></View>
      <Text style={[t.title, { textAlign: "center", marginTop: 16 }]}>What should we call you?</Text>
      <Text style={[t.body, { textAlign: "center", marginTop: 4 }]}>A nickname is enough. You can add more next.</Text>
      <Field accessibilityLabel="Your nickname" value={name} onChangeText={setName} placeholder="e.g. Don" autoFocus onSubmitEditing={go} returnKeyType="go" />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Continue" onPress={go} busy={busy} disabled={!name.trim()} /></Buttons>
      <Text style={[t.meta, { textAlign: "center", marginTop: 14 }]}>Kept on this phone. No account or internet needed.</Text>
    </Screen>
  );
  return <Intro onDone={() => setAsking(true)} />;
}
