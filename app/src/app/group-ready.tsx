import { can } from "@/lib/capabilities";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { useSession } from "@/lib/session";
import { Body, Eyebrow, IconCircle, Mark, Panel, Row, Screen, Title } from "@/ui/kit";

/** After creating a group: what most groups do next. Everything can wait. */
export default function GroupReady() {
  const { org } = useLocalSearchParams<{ org: string }>();
  const s = useSession();
  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 20, marginBottom: 10 }}><Mark size={64} /></View>
      <Title sub="You're its first officer. Here's what most groups do next.">{`${s.current?.name ?? "Your group"} is ready`}</Title>
      <Panel>
        <Row left={<IconCircle name="users" />} title="Bring your people in" meta="Invite by code or link, or add someone by nickname" onPress={() => router.push(`/org/${org}/people` as never)} />
        <Row left={<IconCircle name="flag" />} title="Start a project" meta="An event, a program, or this year's plan" onPress={() => router.push({ pathname: "/new-project", params: { org } })} />
        <Row left={<IconCircle name="pen" />} title="Finish your group's profile" meta="Logo, about, causes, how you're run" onPress={() => router.push(`/org/${org}` as never)} last />
      </Panel>
      <Eyebrow>Later</Eyebrow>
      <Body>{can.hub ? "Everything stays on your phones. When your people are together, make this phone the group's hub. You can connect to the Bayanihan Network any time." : "Your group is on the Bayanihan Network. Everyone can join from any phone or browser, and you can download all of its records any time."}</Body>
      <Row title="Go to This week" onPress={() => router.replace("/home")} last />
    </Screen>
  );
}
