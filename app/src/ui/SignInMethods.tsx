import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Platform, Text, View } from "react-native";
import { dasigAccountAvailable, startDasigSignIn } from "@/lib/dasig-account";
import { networkUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { lastMethod, startGoogleWeb } from "@/lib/signin";
import { LinkText, Notice } from "./kit";
import { SignInButton } from "./SignIn";
import { c, type as t } from "./theme";
import { openSite } from "@/ui/About";

/**
 * Google, email and Dasig.org, side by side, then "Try it with a nickname" (design/account-sketches.html 1, 2, 7).
 * Only the ways this network offers (GET /$signin) are shown; the last one used on this device is marked.
 * `then` is where to land after signing in (an invite link comes back to itself).
 */
export function SignInMethods({ then = "/", onNickname }: { then?: string; onNickname?: () => void }) {
  const s = useSession();
  const [offers, setOffers] = useState<{ google: boolean; email: boolean; oidc: string[] } | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${networkUrl.replace(/\/$/, "")}/$signin`).then((r) => r.json()).then(setOffers).catch(() => setOffers({ google: true, email: false, oidc: ["dasig"] }));
    lastMethod().then((m) => setLast(m?.via ?? null)).catch(() => {});
  }, []);
  const run = async (via: string, f: () => Promise<unknown>) => { setBusy(via); setErr(null); try { await f(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); } };
  const google = () => run("google", async () => { if (Platform.OS === "web") await startGoogleWeb(then); else { await s.googleEcosystem(); router.replace(then as never); } });
  const dasig = () => run("dasig", async () => {
    if (Platform.OS === "web") return startDasigSignIn(then);
    const { dasigIdTokenNative } = await import("@/lib/dasig-account");
    const r = await s.networkSignIn("/$oidc", { provider: "dasig", idToken: await dasigIdTokenNative() }, { via: "dasig" });
    router.replace((r.created ? `/profile?first=1&via=dasig&then=${encodeURIComponent(then)}` : then) as never);
  });
  const email = () => router.push({ pathname: "/signin-email", params: { then } } as never);
  if (!offers) return <View style={{ height: 180 }} />;
  const list = [
    offers.google ? { via: "google", label: "Continue with Google", go: google } : null,
    offers.email ? { via: "email", label: "Continue with email", go: email } : null,
    offers.oidc.includes("dasig") && dasigAccountAvailable ? { via: "dasig", label: "Continue with Dasig.org", go: dasig } : null,
  ].filter(Boolean) as { via: string; label: string; go: () => void }[];
  return <View>
    {list.map((m) => <SignInButton key={m.via} via={m.via} label={m.label} last={last === m.via} busy={busy === m.via} onPress={m.go} />)}
    {err ? <Notice>{err}</Notice> : null}
    {onNickname ? <View style={{ alignItems: "center", marginTop: 16 }}><LinkText onPress={onNickname}>Try it with a nickname</LinkText></View> : null}
    <Text style={[t.meta, { textAlign: "center", marginTop: 14, marginHorizontal: 8, color: c.s500 }]}>Your account is on the <Text style={{ fontWeight: "700" }}>Bayanihan Network</Text>, where groups keep their work. Use any of these; you can add more later.</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 6 }}>
      <Text style={[t.meta, { color: c.s500 }]}>By continuing you accept how Dasig handles your data:</Text>
      <LinkText onPress={() => openSite("/trust/privacy")}>Privacy</LinkText><LinkText onPress={() => openSite("/trust/safety")}>Safety</LinkText>
    </View>
  </View>;
}
