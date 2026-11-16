import { can } from "@/lib/capabilities";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { Body, Eyebrow, IconCircle, Panel, Row, Screen, Tip, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** The volunteer path: how to find your way into a group, honestly, with or without internet. */
export default function Volunteer() {
  return (
    <Screen back>
      <Title sub="Groups bring volunteers in three ways. Pick the one that fits you.">Joining as a volunteer</Title>
      <Panel>
        {can.hub ? <Row left={<IconCircle name="camera" />} title="A coordinator shows you a code" meta="At a meeting or event: join their phone's hotspot, then scan" onPress={() => router.push("/scan" as never)} /> : null}
        <Row left={<IconCircle name="link" />} title="Someone sent you a link" meta="Open it on this phone, or paste it here" onPress={() => router.push("/scan?paste=1" as never)} />
        <Row left={<IconCircle name="pin" />} title="Find groups near you" meta="Needs internet and the Bayanihan Network" onPress={() => router.push("/nearby")} last />
      </Panel>
      <Tip id="volunteer-what-happens" title="When you join">Take open work with “I&apos;m in”. What you finish goes into your story.</Tip>
      <Eyebrow>Already know a group?</Eyebrow>
      <Body>Ask their coordinator for their code. In Dasig, coordinators open their team and tap “Invite your team”.</Body>
      <View style={{ height: 10 }} />
      <Text accessibilityRole="button" style={t.meta} onPress={() => router.replace("/home")}>Go to Home</Text>
    </Screen>
  );
}
