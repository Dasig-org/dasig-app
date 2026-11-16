import { Redirect, router, useLocalSearchParams } from "expo-router";
import { can } from "@/lib/capabilities";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { bix } from "@/lib/bix";
import { parsePair } from "@/lib/pairing";
import { useSession } from "@/lib/session";
import { Buttons, Field, Meta, Notice, Primary, Screen, Title } from "@/ui/kit";
import { c, radius } from "@/ui/theme";

/** Scan a hub's QR: pair with it, and join a team if the QR was a team invite. */
export default function Scan() {
  // Phones only: a browser can't be or reach a hub (lib/capabilities).
  return can.hub ? <ScanScreen /> : <Redirect href={"/volunteer" as never} />;
}

function ScanScreen() {
  const s = useSession();
  const [perm, ask] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nick, setNick] = useState("");
  const [manual, setManual] = useState("");
  const paste = useLocalSearchParams<{ paste?: string }>().paste === "1";
  const pair = async (text: string) => {
    if (busy) return;
    // A web invite link (…/join/TOKEN) opens the join page; a hub code pairs.
    const web = /\/join\/([A-Za-z0-9_-]+)/.exec(text);
    if (web) { router.push(`/join/${web[1]}`); return; }
    const p = parsePair(text);
    if (!p) { setErr("That isn't a Dasig hub code."); return; }
    if (!s.person && !nick.trim()) { setErr("Tell us your name first."); return; }
    setBusy(true); setErr(null);
    try {
      await s.pairWithHub(p.hub, p.code, nick.trim() || undefined);
      if (p.link) { const team = await bix.joinByLink(p.link); await s.refresh(); router.replace(`/team/${team.id}`); }
      else router.replace("/home");
    } catch (e) { setErr(e instanceof Error ? `${e.message}. Are you on the hub's hotspot?` : String(e)); setBusy(false); }
  };
  return (
    <Screen back>
      <Title sub={paste ? "Paste the link or code someone sent you." : "Join the hub phone's hotspot first, then scan its code."}>{paste ? "Open an invite" : "Scan the hub's code"}</Title>
      {!s.person ? <Field label="What should we call you?" value={nick} onChangeText={setNick} placeholder="e.g. Mia" /> : null}
      {!paste && Platform.OS !== "web" && perm?.granted ? (
        <View style={{ height: 320, borderRadius: radius.hero, overflow: "hidden", marginTop: 12, backgroundColor: c.ink }}>
          <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={busy ? undefined : (r) => pair(r.data)} />
        </View>
      ) : !paste && Platform.OS !== "web" ? <Buttons><Primary label="Allow the camera" onPress={ask} /></Buttons> : null}
      <Meta>{"\nOr paste the code:"}</Meta>
      <Field value={manual} onChangeText={setManual} placeholder="A link or a dasig://pair code" autoCapitalize="none" autoCorrect={false} />
      <Buttons><Primary label="Connect" busy={busy} disabled={!manual.trim()} onPress={() => pair(manual.trim())} /></Buttons>
      {err ? <Notice>{err}</Notice> : null}
      {busy ? <Text style={{ marginTop: 10, color: c.slate }}>Connecting to the hub…</Text> : null}
    </Screen>
  );
}
