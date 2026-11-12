import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Platform, View } from "react-native";
import * as Network from "expo-network";
import { networkUrl } from "@/lib/env";
import { pending } from "@/lib/outbox";
import { useSession } from "@/lib/session";
import { Body, Buttons, Eyebrow, IconCircle, LinkText, Meta, Notice, Outline, Panel, Pill, Primary, Row, Screen, Title } from "@/ui/kit";

/*
 * Where your records live (behind Settings → Working offline): this phone, your group's hub, or the Bayanihan Network,
 * and what needs the internet. Your account (ways to sign in) is separate: Settings → Your account.
 */
export default function NetworkScreen() {
  const s = useSession();
  const [online, setOnline] = useState<boolean | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { Network.getNetworkStateAsync().then((n) => setOnline(!!n.isInternetReachable)).catch(() => setOnline(null)); pending().then((p) => setWaiting(p.length)); }, []);
  const k = s.connection?.kind;
  // A browser lives on the network only: it can't host a group or reach a hub (docs/pwa/PWA_PLAN.md).
  const web = Platform.OS === "web";
  const host = (k === "ecosystem" ? (s.connection as { url: string }).url : networkUrl).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <Screen back>
      <Title sub={web ? "In a browser, your groups are saved on the Bayanihan Network. The Android app can also keep them on a phone or a hub." : "Your group's work never needs the internet. Some extras do."}>Where your records live</Title>
      <Panel>
        {web ? null : <><Row left={<IconCircle name="lock" />} title="This phone" meta="Works with no internet. Nothing leaves it until you choose." right={k === "phone" ? <Pill tone="state">In use</Pill> : undefined} />
          <Row left={<IconCircle name="users" />} title="Your group's hub" meta={k === "hub" ? (s.connection as { url: string }).url : "One phone your group shares, over the same wifi. No internet."} right={k === "hub" ? <Pill tone="state">In use</Pill> : undefined} /></>}
        <Row left={<IconCircle name="building" />} title="The Bayanihan Network" meta={`${host} · online, backed up, reachable from any phone or browser`} right={k === "ecosystem" ? <Pill tone="state">In use</Pill> : undefined} last />
      </Panel>
      {k !== "ecosystem" ? <>
        <Eyebrow>Save on the Bayanihan Network</Eyebrow>
        <Panel>
          <Row left={<IconCircle name="link" />} title="Work from anywhere" meta="Your groups online, reachable without a hub; iPhone teammates can join" />
          <Row left={<IconCircle name="download" />} title="Backed up" meta="If a phone is lost, your records are safe" last />
        </Panel>
        <View style={{ marginTop: 10, marginHorizontal: 4 }}><Meta>{"You start fresh online. Your groups on this phone stay here, and you can switch back any time. To bring a group along, use Copy to the Bayanihan Network on its page."}</Meta></View>
        {err ? <Notice>{err}</Notice> : null}
        <Buttons><Primary label="Save on the Bayanihan Network" busy={busy} onPress={async () => { setBusy(true); setErr(null); try { await s.joinEcosystem(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } }} /></Buttons>
      </> : null}
      {k === "ecosystem" && !web ? <View style={{ marginTop: 6 }}><Buttons><Outline flex label="Go back to this phone's records" onPress={() => s.useThisPhone()} /></Buttons></View> : null}
      <Eyebrow>Right now</Eyebrow>
      <Panel>
        <Row left={<IconCircle name={online ? "link" : "wifioff"} tone={online ? "sand" : "grey"} />} title={online === null ? "Checking the internet…" : online ? "Internet: connected" : "Internet: none"} />
        <Row left={<IconCircle name="pending" tone="grey" />} title={waiting ? `${waiting} change${waiting === 1 ? "" : "s"} waiting to sync` : "Nothing waiting to sync"} meta={k === "hub" ? "Sent when you're back near the hub" : undefined} last />
      </Panel>
      {web ? null : <>
        <Eyebrow>What needs the internet</Eyebrow>
        <Panel>
          <Row left={<IconCircle name="pin" />} title="Finding groups near you" meta="Needs the Bayanihan Network" />
          <Row left={<IconCircle name="heart" />} title="A public profile" meta="Showing your story publicly, if you choose" last />
        </Panel>
        <View style={{ marginTop: 10, marginHorizontal: 4 }}><Meta>{"Never online: photos marked as showing children. The people you serve are only ever counts."}</Meta></View>
      </>}
      <View style={{ marginTop: 14 }}><Body>Signing in, and getting back in on another device, is in Settings → Your account.</Body></View>
      <View style={{ marginTop: 6 }}><LinkText onPress={() => router.push("/account" as never)}>Open Your account</LinkText></View>
    </Screen>
  );
}
