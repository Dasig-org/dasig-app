import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { Avatar, Buttons, Field, Notice, Primary, Screen } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** Onboarding 1: a nickname is enough to start (Person.name.use = nickname). */
export default function Welcome() {
  const s = useSession();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await s.startWithNickname(name); router.replace("/"); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 40, marginBottom: 18 }}><Avatar name={name || "?"} size={76} /></View>
      <Text style={[t.title, { textAlign: "center" }]}>What should we call you?</Text>
      <Text style={[t.body, { textAlign: "center", marginTop: 4 }]}>A nickname is enough to start.</Text>
      <Field value={name} onChangeText={setName} placeholder="e.g. Don" autoFocus onSubmitEditing={go} returnKeyType="go" />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Continue" onPress={go} busy={busy} disabled={!name.trim()} /></Buttons>
      <Text style={[t.meta, { textAlign: "center", marginTop: 14 }]}>You can keep your story with Google or email later.</Text>
    </Screen>
  );
}
