import { useEffect, useState, useEffectEvent } from "react";
import { router } from "expo-router";
import { Platform, Text, View } from "react-native";
import { finishDasigSignIn } from "@/lib/dasig-account";
import { useSession } from "@/lib/session";
import { Buttons, Notice, Primary, Screen, Skeleton } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** Where Dasig's sign-in returns to (web): https://my.dasig.app/auth/callback?code=…&state=… */
export default function AuthCallback() {
  const s = useSession();
  const [err, setErr] = useState<string | null>(null);
  // Once, as the screen opens.
  const finish = useEffectEvent(() => {
    // On Android the sign-in tab hands the result straight back to the screen that opened it; nothing to do here.
    if (Platform.OS !== "web") { router.replace("/" as never); return; }
    if (typeof window === "undefined") return;
    finishDasigSignIn(new URLSearchParams(window.location.search))
      .then(async (then) => { await s.refresh(); router.replace(then as never); })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  });
  useEffect(() => { finish(); }, []);
  return <Screen where={false}>
    <View style={{ marginTop: 40 }}><Text style={[t.title, { textAlign: "center" }]}>{err ? "Sign-in didn't finish" : "Signing you in…"}</Text></View>
    {err ? <><Notice>{err}</Notice><Buttons><Primary label="Back to the start" onPress={() => router.replace("/start" as never)} /></Buttons></> : <Skeleton rows={2} />}
  </Screen>;
}
