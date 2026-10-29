import { useState } from "react";
import { router } from "expo-router";
import { Platform, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { bix } from "@/lib/bix";
import { parsePair } from "@/lib/pairing";
import { useSession } from "@/lib/session";
import { Buttons, Field, Meta, Notice, Primary, Screen, Title } from "@/ui/kit";
import { c, radius } from "@/ui/theme";

/** Scan a hub's QR: pair with it, and join a team if the QR was a team invite. */
export default function Scan() {
  const s = useSession();
  const [perm, ask] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nick, setNick] = useState("");
  const [manual, setManual] = useState("");
  const pair = async (text: string) => {
    if (busy) return;
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
      <Title sub="Join the hub phone's hotspot first.">Scan the hub's code</Title>
      {!s.person ? <Field label="What should we call you?" value={nick} onChangeText={setNick} placeholder="e.g. Mia" /> : null}
      {Platform.OS !== "web" && perm?.granted ? (
        <View style={{ height: 320, borderRadius: radius.hero, overflow: "hidden", marginTop: 12, backgroundColor: c.ink }}>
          <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={busy ? undefined : (r) => pair(r.data)} />
        </View>
      ) : Platform.OS !== "web" ? <Buttons><Primary label="Allow the camera" onPress={ask} /></Buttons> : null}
      <Meta>{"\nOr paste the code:"}</Meta>
      <Field value={manual} onChangeText={setManual} placeholder="dasig://pair?hub=…" autoCapitalize="none" autoCorrect={false} />
      <Buttons><Primary label="Connect" busy={busy} disabled={!manual.trim()} onPress={() => pair(manual.trim())} /></Buttons>
      {err ? <Notice>{err}</Notice> : null}
      {busy ? <Text style={{ marginTop: 10, color: c.slate }}>Connecting to the hub…</Text> : null}
    </Screen>
  );
}
