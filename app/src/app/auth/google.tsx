import { useEffect, useState, useEffectEvent } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { networkUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { finishGoogleWeb } from "@/lib/signin";
import { Buttons, Notice, Primary, Screen, Skeleton } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** Where Google's sign-in comes back to on the web (#id_token=…): sign in, or add Google to the signed-in account. */
export default function GoogleReturn() {
  const s = useSession();
  const [err, setErr] = useState<string | null>(null);
  // Once, as the screen opens.
  const finish = useEffectEvent(() => {
    if (typeof window === "undefined") return;
    (async () => {
      const g = await finishGoogleWeb(window.location.hash);
      if (g.link) { const { networkSignIn } = await import("@/lib/ecosystem"); await networkSignIn(networkUrl.replace(/\/$/, ""), null, "/$google", { idToken: g.idToken }, true); router.replace("/account" as never); return; }
      const r = await s.networkSignIn("/$google", { idToken: g.idToken }, { via: "google" });
      router.replace((r.created ? `/profile?first=1&via=google&then=${encodeURIComponent(g.then)}` : g.then) as never);
    })().catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  });
  useEffect(() => { finish(); }, []);
  return <Screen where={false}>
    <View style={{ marginTop: 40 }}><Text style={[t.title, { textAlign: "center" }]}>{err ? "Sign-in didn't finish" : "Signing you in…"}</Text></View>
    {err ? <><Notice>{err}</Notice><Buttons><Primary label="Back to the start" onPress={() => router.replace("/start" as never)} /></Buttons></> : <Skeleton rows={2} />}
  </Screen>;
}
