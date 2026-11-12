import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Image, Platform, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { lastMethod, METHOD_LABEL } from "@/lib/signin";
import { Buttons, Field, LinkText, Notice, Primary, Sand, Screen } from "@/ui/kit";
import { Intro } from "@/ui/onboarding/Intro";
import { SignInMethods } from "@/ui/SignInMethods";
import { c, radius, type as t } from "@/ui/theme";

const PHOTO = require("../../assets/images/zero/cleanup.jpg");

/*
 * Sign in to the Bayanihan Network (design/account-sketches.html 1, 2, 6). One account, several ways in: Google, email
 * (a code) and Dasig.org. Signing in and signing up are the same screen. A nickname lets people try it on one device.
 */
export default function Start() {
  const s = useSession();
  const [step, setStep] = useState<"intro" | "ways" | "nickname">("intro");
  const [last, setLast] = useState<{ via: string; email?: string } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { lastMethod().then((m) => { setLast(m); if (m) setStep("ways"); }).catch(() => {}); }, []);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await s.startWithNickname(name); router.replace("/profile?first=1" as never); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const back = last && last.via !== "nickname";
  if (step === "ways") return (
    <Screen where={false}>
      <Image source={PHOTO} style={{ height: back ? 170 : 230, borderRadius: radius.panel, marginTop: 8 }} />
      <Text style={[t.title, { marginTop: 16 }]}>{back ? "Welcome back" : "Sign in to the Bayanihan Network"}</Text>
      <Text style={[t.body, { color: c.s500, marginTop: 2 }]}>{back ? `Last time you signed in with ${METHOD_LABEL[last!.via] ?? last!.via}${last!.email ? ` as ${last!.email}` : ""}.` : "New here? The same buttons make your account."}</Text>
      <SignInMethods then="/" onNickname={() => setStep("nickname")} />
      <View style={{ alignItems: "center", marginTop: 16 }}><LinkText onPress={() => router.push((Platform.OS === "web" ? "/volunteer" : "/scan") as never)}>I have an invite or code</LinkText></View>
    </Screen>
  );
  if (step === "nickname") return (
    <Screen where={false}>
      <View style={{ marginTop: 8 }}><LinkText onPress={() => setStep("ways")}>‹ Back</LinkText></View>
      <Text style={[t.title, { marginTop: 14 }]}>Try it with a nickname</Text>
      <Text style={[t.body, { color: c.s500, marginTop: 2 }]}>Look around, join a group, help out.</Text>
      <Field label="Nickname" accessibilityLabel="Your nickname" value={name} onChangeText={setName} placeholder="e.g. Don" autoFocus onSubmitEditing={go} returnKeyType="go" />
      <View style={{ marginTop: 12 }}><Sand><View style={{ flex: 1 }}><Text style={t.row}>{Platform.OS === "web" ? "Only on this browser" : "Only on this phone"}</Text>
        <Text style={[t.meta, { marginTop: 4 }]}>{`There's no way back in if you lose it${Platform.OS === "web" ? " or clear the browser" : ""}. Add Google, email or Dasig.org any time to keep your work.`}</Text></View></Sand></View>
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Start with a nickname" onPress={go} busy={busy} disabled={!name.trim()} /></Buttons>
    </Screen>
  );
  return <Intro onDone={() => setStep("ways")} />;
}
