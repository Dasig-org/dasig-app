import { useState } from "react";
import { router } from "expo-router";
import { Platform, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { Buttons, Field, LinkText, Notice, Outline, Primary, Screen } from "@/ui/kit";
import { dasigAccountAvailable, startDasigSignIn } from "@/lib/dasig-account";
import { Emblem } from "@/ui/onboarding/Emblem";
import { c, type as t } from "@/ui/theme";
import { Intro } from "@/ui/onboarding/Intro";


/**
 * Welcome: the four-beat intro, then one screen with three ways in (docs/auth/DASIG_ACCOUNTS.md): your Dasig account
 * (new or returning, any device), a nickname (fastest, from a link), or an invite. Nickname users are offered a Dasig
 * account later, so they can sign in elsewhere.
 */
export default function Start() {
  const s = useSession();
  const [step, setStep] = useState<"intro" | "ways" | "nickname">("intro");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await s.startWithNickname(name); router.replace("/profile?first=1" as never); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const dasig = async () => { setBusy(true); setErr(null); try { await startDasigSignIn("/"); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setBusy(false); } };
  if (step === "ways") return (
    <Screen where={false}>
      <View style={{ alignItems: "center", marginTop: 30 }}><Emblem size={64} /></View>
      <Text style={[t.title, { textAlign: "center", marginTop: 16 }]}>Join Dasig</Text>
      <Text style={[t.body, { textAlign: "center", marginTop: 4 }]}>New here, or coming back.</Text>
      {dasigAccountAvailable ? <>
        <Buttons><Primary label="Continue with your Dasig account" onPress={dasig} busy={busy} /></Buttons>
        <Text style={[t.meta, { textAlign: "center", marginTop: 8 }]}>Google or an email code. The same account as dasig.org, on any device.</Text>
      </> : null}
      <Buttons><Outline flex label="Use a nickname instead" onPress={() => setStep("nickname")} /></Buttons>
      <Text style={[t.meta, { textAlign: "center", marginTop: 8 }]}>{Platform.OS === "web" ? "Fastest. Only on this browser until you add a Dasig account." : "Fastest. Kept on this phone."}</Text>
      {err ? <Notice>{err}</Notice> : null}
      <View style={{ alignItems: "center", marginTop: 22 }}><LinkText onPress={() => router.push((Platform.OS === "web" ? "/volunteer" : "/scan") as never)}>I have an invite or code</LinkText></View>
    </Screen>
  );
  if (step === "nickname") return (
    <Screen where={false}>
      <View style={{ alignItems: "center", marginTop: 30 }}><Emblem size={64} /></View>
      <Text style={[t.title, { textAlign: "center", marginTop: 16 }]}>What should we call you?</Text>
      <Text style={[t.body, { textAlign: "center", marginTop: 4 }]}>A nickname is enough. You can add more next.</Text>
      <Field accessibilityLabel="Your nickname" value={name} onChangeText={setName} placeholder="e.g. Don" autoFocus onSubmitEditing={go} returnKeyType="go" />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Continue" onPress={go} busy={busy} disabled={!name.trim()} /></Buttons>
      <Text style={[t.meta, { textAlign: "center", marginTop: 14 }]}>{Platform.OS === "web" ? "Saved on the Dasig Ecosystem. Add a Dasig account later to sign in on other devices." : "Kept on this phone. No account or internet needed."}</Text>
      <View style={{ alignItems: "center", marginTop: 10 }}><LinkText onPress={() => setStep("ways")}>Back</LinkText></View>
    </Screen>
  );
  return <Intro onDone={() => setStep("ways")} />;
}
