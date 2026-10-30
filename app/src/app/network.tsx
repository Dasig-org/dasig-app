import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Network from "expo-network";
import { networkUrl } from "@/lib/env";
import { pending } from "@/lib/outbox";
import { interested, markInterested } from "@/lib/network";
import { useSession } from "@/lib/session";
import { Body, Buttons, Eyebrow, IconCircle, Meta, Notice, Panel, Pill, Primary, Row, Screen, Title } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** Where records live, and what needs the internet. Truthful by design. */
export default function NetworkScreen() {
  const s = useSession();
  const [online, setOnline] = useState<boolean | null>(null);
  const [waiting, setWaiting] = useState(0);
  const [asked, setAsked] = useState<{ at: string } | null>(null);
  useEffect(() => { interested().then(setAsked); }, []);
  useEffect(() => { Network.getNetworkStateAsync().then((n) => setOnline(!!n.isInternetReachable)).catch(() => setOnline(null)); pending().then((p) => setWaiting(p.length)); }, []);
  const k = s.connection?.kind;
  return (
    <Screen back>
      <Title sub="Your group's work never needs the internet. Some extras do.">Where your records live</Title>
      <Panel>
        <Row left={<IconCircle name="lock" />} title="This phone" meta="Bayanihan Server runs inside Dasig. Works with no internet." right={k === "phone" ? <Pill tone="state">In use</Pill> : undefined} />
        <Row left={<IconCircle name="users" />} title="Your group's hub" meta={k === "hub" ? s.connection!.kind === "hub" ? (s.connection as any).url : "" : "One phone your group shares, over its hotspot. No internet."} right={k === "hub" ? <Pill tone="state">In use</Pill> : undefined} />
        <Row left={<IconCircle name="building" />} title="The Dasig Ecosystem" meta={networkUrl ? "Dasig's hosted Bayanihan Server" : "Not open yet. Coming in 2027. Needs internet."} right={<Pill>{networkUrl ? "Available" : "Coming"}</Pill>} last />
      </Panel>
      {!networkUrl ? <>
        <Eyebrow>When the Ecosystem opens</Eyebrow>
        <Panel>
          <Row left={<IconCircle name="lock" />} title="Keep a copy online" meta="If a phone is lost, your records are safe" />
          <Row left={<IconCircle name="wifi" />} title="Work from anywhere" meta="People join without being near the hub" />
          <Row left={<IconCircle name="pin" />} title="Be found" meta="Other groups and volunteers see your public summary" last />
        </Panel>
        <View style={{ marginTop: 10, marginHorizontal: 4 }}><Meta>{"Never online: photos marked as showing children. The people you serve are only ever counts."}</Meta></View>
        {asked ? <Notice>{`Noted on ${new Date(asked.at).toLocaleDateString()}. Dasig will show it here when the Ecosystem opens.`}</Notice>
          : <Buttons><Primary label="Tell me when it opens" onPress={async () => setAsked(await markInterested(s.current?.id))} /></Buttons>}
      </> : null}
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
