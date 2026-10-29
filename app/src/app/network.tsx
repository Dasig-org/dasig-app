import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Network from "expo-network";
import { networkUrl } from "@/lib/env";
import { pending } from "@/lib/outbox";
import { useSession } from "@/lib/session";
import { Body, Eyebrow, IconCircle, Meta, Panel, Pill, Row, Screen, Title } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** Where records live, and what needs the internet. Truthful by design. */
export default function NetworkScreen() {
  const s = useSession();
  const [online, setOnline] = useState<boolean | null>(null);
  const [waiting, setWaiting] = useState(0);
  useEffect(() => { Network.getNetworkStateAsync().then((n) => setOnline(!!n.isInternetReachable)).catch(() => setOnline(null)); pending().then((p) => setWaiting(p.length)); }, []);
  const k = s.connection?.kind;
  return (
    <Screen back>
      <Title sub="Your group's work never needs the internet. Some extras do.">Where your records live</Title>
      <Panel>
        <Row left={<IconCircle name="lock" />} title="This phone" meta="Bayanihan Server runs inside Dasig. Works with no internet." right={k === "phone" ? <Pill tone="state">In use</Pill> : undefined} />
        <Row left={<IconCircle name="users" />} title="Your group's hub" meta={k === "hub" ? s.connection!.kind === "hub" ? (s.connection as any).url : "" : "One phone your group shares, over its hotspot. No internet."} right={k === "hub" ? <Pill tone="state">In use</Pill> : undefined} />
        <Row left={<IconCircle name="building" />} title="The Dasig Ecosystem" meta={networkUrl ? "Dasig's hosted Bayanihan Server" : "Not open yet. Needs internet."} right={<Pill>{networkUrl ? "Available" : "Coming"}</Pill>} last />
      </Panel>
      <Eyebrow>Right now</Eyebrow>
      <Panel>
        <Row left={<IconCircle name={online ? "link" : "wifioff"} tone={online ? "sand" : "grey"} />} title={online === null ? "Checking the internet…" : online ? "Internet: connected" : "Internet: none"} />
        <Row left={<IconCircle name="pending" tone="grey" />} title={waiting ? `${waiting} change${waiting === 1 ? "" : "s"} waiting to sync` : "Nothing waiting to sync"} meta={k === "hub" ? "Sent when you're back near the hub" : undefined} last />
      </Panel>
      <Eyebrow>What needs the internet</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="pin" />} title="Finding groups near you" meta="Needs the Dasig Ecosystem" />
        <Row left={<IconCircle name="heart" />} title="A public Dasig profile" meta="Showing your story on dasig.org, if you choose" />
        <Row left={<IconCircle name="download" />} title="Cloud backup of your group" meta="Optional, when the Dasig Ecosystem opens" last />
      </Panel>
      <View style={{ marginTop: 14 }}><Body>Everything else (groups, teams, tasks, photos, votes and your story) works on your phones and hub.</Body></View>
    </Screen>
  );
}
