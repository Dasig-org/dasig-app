import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSession } from "@/lib/session";
import { linkEmail, sendEmailCode } from "@/lib/signin";
import { Buttons, Field, LinkText, Notice, Primary, Screen } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/*
 * Continue with email (design/account-sketches.html 3, 4): an address, then a 6-digit code. No password. New and
 * returning people use the same two steps. With ?link=1 the code adds email to the account that's signed in.
 */
export default function SignInEmail() {
  const s = useSession();
  const { then, link } = useLocalSearchParams<{ then?: string; link?: string }>();
  const adding = link === "1";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"address" | "code">("address");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const input = useRef<any>(null);
  useEffect(() => { if (wait <= 0) return; const h = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(h); }, [wait]);
  const send = async () => {
    setBusy(true); setErr(null);
    try { await sendEmailCode(email); setStep("code"); setCode(""); setWait(30); setTimeout(() => input.current?.focus(), 200); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const verify = async (value = code) => {
    if (value.length !== 6 || busy) return;
    setBusy(true); setErr(null);
    try {
      if (adding) { await linkEmail(email, value); router.replace("/account" as never); return; }
      const r = await s.networkSignIn("/$email/verify", { email: email.trim(), code: value }, { via: "email", email: email.trim().toLowerCase() });
      router.replace((r.created ? `/profile?first=1&via=email&then=${encodeURIComponent((then as string) || "/")}` : (then as string) || "/") as never);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setCode(""); } finally { setBusy(false); }
  };
  const back = <View style={{ marginTop: 8 }}><LinkText onPress={() => (step === "code" ? setStep("address") : router.back())}>‹ Back</LinkText></View>;
  if (step === "address") return (
    <Screen where={false}>
      {back}
      <Text style={[t.title, { marginTop: 14 }]}>{adding ? "Add email" : "Continue with email"}</Text>
      <Text style={[t.body, { color: c.s500, marginTop: 2 }]}>We'll send a 6-digit code. No password to remember.</Text>
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.org" autoFocus keyboardType="email-address" autoCapitalize="none" autoComplete="email" onSubmitEditing={send} returnKeyType="send" />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Send the code" onPress={send} busy={busy} disabled={!/.+@.+\..+/.test(email.trim())} /></Buttons>
      <Text style={[t.meta, { marginTop: 14, marginHorizontal: 4 }]}>{adding ? "The code adds this email to your account, as another way to sign in." : "If this email is new, we make your account. If it's already yours, you're back in."}</Text>
    </Screen>
  );
  return (
    <Screen where={false}>
      {back}
      <Text style={[t.title, { marginTop: 14 }]}>Check your email</Text>
      <Text style={[t.body, { color: c.s500, marginTop: 2 }]}>{`We sent a code to ${email.trim()}. It works for 10 minutes.`}</Text>
      {/* Six boxes over one hidden field, so pasting and the phone's code suggestion both work. */}
      <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: "row", gap: 8, marginTop: 16 }} accessibilityLabel="The 6-digit code">
        {Array.from({ length: 6 }, (_, i) => <View key={i} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: c.white, alignItems: "center", justifyContent: "center",
          borderWidth: 1.5, borderColor: i === Math.min(code.length, 5) ? c.s300 : "transparent" }}><Text style={{ fontSize: 24, fontWeight: "700", color: c.ink }}>{code[i] ?? ""}</Text></View>)}
      </Pressable>
      <TextInput ref={input} value={code} onChangeText={(v) => { const d = v.replace(/\D/g, "").slice(0, 6); setCode(d); if (d.length === 6) verify(d); }}
        keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} autoFocus
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }} />
      <Text style={[t.meta, { marginTop: 10, marginHorizontal: 4 }]}>Not there? Check Spam or Promotions. </Text>
      <View style={{ marginHorizontal: 4, marginTop: 2 }}>{wait > 0 ? <Text style={t.meta}>{`Send a new code in 0:${String(wait).padStart(2, "0")}`}</Text> : <LinkText onPress={send}>Send a new code</LinkText>}</View>
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Continue" onPress={() => verify()} busy={busy} disabled={code.length !== 6} /></Buttons>
    </Screen>
  );
}
