import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";
import * as Network from "expo-network";
import { networkUrl } from "@/lib/env";
import { CAUSES } from "@/lib/org";
import { useSession } from "@/lib/session";
import { Body, Buttons, Chips, Eyebrow, IconCircle, Meta, Nav, Outline, Panel, Pill, Primary, Row, Sand, Screen, Title } from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { c, radius, type as t } from "@/ui/theme";

type Status = "checking" | "offline" | "not-open" | "online";

function MapPreview({ dim }: { dim?: boolean }) {
  const pins = [[90, 70, "3"], [200, 110, "2"], [280, 55, "1"], [150, 140, "4"]] as const;
  return <View style={{ borderRadius: radius.field, overflow: "hidden", opacity: dim ? 0.45 : 1 }} accessibilityLabel="Map preview">
    <Svg width="100%" height={180} viewBox="0 0 354 180">
      <Path d="M0 0H354V180H0Z" fill="#e0f2fe" /><Path d="M0 100 C80 80 120 125 200 108 S320 72 354 90 V180 H0Z" fill={c.sand} />
      <Path d="M40 180 L120 20 M180 180 L260 10 M0 145 L354 125" stroke="#fff" strokeWidth={6} />
      {pins.map(([x, y, n]) => <View key={n}><Circle cx={x} cy={y} r={16} fill={c.accent} /><SvgText x={x} y={y + 4} fontSize={12} fontWeight="700" fill="#fff" textAnchor="middle">{n}</SvgText></View>)}
    </Svg>
  </View>;
}

/** Who's working near you, from the Dasig Ecosystem. Honest about what it needs: internet, and Dasig's hosted Bayanihan Server. */
export default function Nearby() {
  const s = useSession();
  const [status, setStatus] = useState<Status>("checking");
  const [cause, setCause] = useState("education");
  const check = async () => {
    setStatus("checking");
    const net = await Network.getNetworkStateAsync().catch(() => null);
    if (!net?.isInternetReachable) return setStatus("offline");
    if (!networkUrl) return setStatus("not-open");
    try { const r = await fetch(`${networkUrl}/metadata`); setStatus(r.ok ? "online" : "not-open"); } catch { setStatus("not-open"); }
  };
  useEffect(() => { check(); }, []);
  return (
    <Screen bottom={<Nav active="nearby" />}>
      <Title sub="Groups, projects and goals near you.">Who's working here</Title>
      <Chips options={CAUSES.slice(0, 6).map((x) => ({ value: x.code, label: x.label }))} value={cause} onChange={setCause} />
      <View style={{ height: 10 }} />
      <MapPreview dim={status !== "online"} />
      {status === "online" ? <Eyebrow>Projects nearby</Eyebrow> : null}
      {status !== "online" ? <View style={{ marginTop: 12 }}><Sand>
        <IconCircle name={status === "offline" ? "wifioff" : "building"} tone="white" />
        <View style={{ flex: 1 }}>
          <Text style={t.row}>{status === "checking" ? "Checking…" : status === "offline" ? "You're offline" : "The Dasig Ecosystem isn't open yet"}</Text>
          <Meta>{status === "offline" ? "Finding groups near you needs internet. Your own groups keep working on your phones and hub." : "This view needs internet and the Dasig Ecosystem, Dasig's hosted Bayanihan Server. It opens after the first pilots. Until then, the map above is a preview with sample pins."}</Meta>
        </View>
      </Sand></View> : null}
      <Eyebrow>How it works</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="eye" />} title="Groups choose to be found" meta="Only a public summary: name, place, causes, who it's for. Never people or tasks." />
        <Row left={<IconCircle name="users" />} title="Follow, offer help, or partner" meta="Nobody has to work with anyone. Groups decide." />
        <Row left={<IconCircle name="flag" />} title="Join a shared goal" meta="A city or foundation sets a goal; groups can enroll their projects" last />
      </Panel>
      <Buttons><Outline flex label="Check again" onPress={check} /></Buttons>
      <Eyebrow>Your connection</Eyebrow>
      <Panel><Row left={<IconCircle name={s.connection?.kind === "hub" ? "link" : "lock"} />} title={s.connection?.kind === "hub" ? "On your group's hub" : s.connection?.kind === "cloud" ? "Online server" : "On this phone"}
        meta="Where your group's records live" onPress={() => router.push("/network" as never)} last /></Panel>
    </Screen>
  );
}
