import { Redirect } from "expo-router";
import { can } from "@/lib/capabilities";
import { useEffect, useEffectEvent, useState } from "react";
import { Platform, Text, View } from "react-native";
import { QR as QRCode } from "@/ui/QR";
import { useSession } from "@/lib/session";
import { pairUrl } from "@/lib/pairing";
import { Body, Buttons, Eyebrow, IconCircle, Meta, Notice, Outline, Panel, Primary, Row, Screen, Title } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";

/** Make this phone the group's hub (spec: Hubs). Other phones join its hotspot and scan the QR. */
export default function Hub() {
  // Phones only: a browser can't be or reach a hub (lib/capabilities).
  return can.hub ? <HubScreen /> : <Redirect href={"/home" as never} />;
}

function HubScreen() {
  const s = useSession();
  const [addr, setAddr] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const native = Platform.OS !== "web";
  // On a phone used on its own, the hub starts as the screen opens.
  const auto = native && s.connection?.kind === "phone";
  const [busy, setBusy] = useState(auto);
  const launch = () => import("@/local/engine").then(({ localEngine }) => localEngine())
    .then((e) => e.startHub().then((a) => { setAddr(a); setCode(e.pairingCode); }))
    .catch((e) => setErr(e instanceof Error ? e.message : String(e))).finally(() => setBusy(false));
  const start = () => { setBusy(true); setErr(null); void launch(); };
  const stop = async () => { const { localEngine } = await import("@/local/engine"); (await localEngine()).stopHub(); setAddr(null); setCode(null); };
  const autoStart = useEffectEvent(() => { if (auto) void launch(); });
  useEffect(() => { autoStart(); }, []);
  if (!native) return <Screen back><Title>Hubs run on Android</Title><Body>Open Dasig on an Android phone to make it your group&apos;s hub.</Body></Screen>;
  if (s.connection?.kind === "hub") return <Screen back><Title>You&apos;re connected to a hub</Title><Body>To make this phone a hub, first go back to using this phone on its own (Your story → Use this phone on its own).</Body></Screen>;
  return (
    <Screen back>
      <Title sub="Phones nearby join this one. No internet needed.">This phone is your group&apos;s hub</Title>
      {addr && code ? <>
        <View style={{ backgroundColor: c.white, borderRadius: radius.hero, padding: 20, alignItems: "center" }}>
          <QRCode value={pairUrl({ hub: addr, code })} size={220} color={c.ink} backgroundColor={c.white} />
          <Text style={[t.meta, { marginTop: 12 }]} selectable>{addr}</Text>
        </View>
        <Eyebrow>How others join</Eyebrow>
        <Panel>
          <Row left={<IconCircle name="link" />} title="1. Turn on this phone's hotspot" meta="Settings → Connections → Mobile Hotspot" />
          <Row left={<IconCircle name="users" />} title="2. Others join the hotspot" meta="Or the same Wi-Fi, if your router allows it" />
          <Row left={<IconCircle name="camera" />} title="3. They scan this code in Dasig" meta="Join a group → Scan a hub" last />
        </Panel>
        <Meta>{"If the address above changed after turning on the hotspot, tap Refresh."}</Meta>
        <Buttons><Outline flex label="Refresh" onPress={start} /><Outline label="Stop the hub" onPress={stop} /></Buttons>
      </> : <Buttons><Primary label="Start the hub" busy={busy} onPress={start} /></Buttons>}
      {err ? <Notice>{err}</Notice> : null}
    </Screen>
  );
}
