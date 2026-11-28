import { router } from "expo-router";
import { Platform, Text } from "react-native";
import { networkUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { Eyebrow, IconCircle, Panel, Row, Screen, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/*
 * Working offline (design/account-sketches.html 13): where your records live, kept apart from your account. The
 * Bayanihan Network is the default and needs nothing; a phone on its own, a hub, or an LGU's own network are for field
 * teams without signal and for groups that run their own.
 */
export default function Offline() {
  const s = useSession();
  const k = s.connection?.kind;
  const web = Platform.OS === "web";
  const host = (s.connection && "url" in s.connection ? s.connection.url : networkUrl).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <Screen back>
      <Title sub="Most groups never need this.">Working offline</Title>
      <Panel>
        <Row left={<IconCircle name={k === "ecosystem" ? "check" : k === "hub" ? "link" : "lock"} />}
          title={k === "ecosystem" ? "Saved on the Bayanihan Network" : k === "hub" ? "On your group's hub" : k === "cloud" ? "On your group's own server" : "Only on this phone"}
          meta={k === "ecosystem" || k === "cloud" ? host : k === "hub" ? "Shared over the same wifi" : "Nothing leaves it until you choose"} onPress={() => router.push("/network" as never)} />
        <Row left={<IconCircle name="pending" />} title="Sync" meta="What's waiting to be saved" onPress={() => router.push("/sync" as never)} last />
      </Panel>
      {!web ? <><Eyebrow>For groups without signal</Eyebrow>
        <Panel>
          {k === "hub" ? <Row left={<IconCircle name="lock" />} title="Keep records on this phone only" meta="Nothing leaves it until you choose" onPress={() => s.useThisPhone()} /> : null}
          {k === "phone" ? <Row left={<IconCircle name="cloud" />} title="Save on the Bayanihan Network" meta="Work from anywhere; iPhone teammates can join" onPress={() => router.push("/network" as never)} /> : null}
          {k === "phone" ? <Row left={<IconCircle name="users" />} title="Make this phone your group's hub" meta="Others join over the same wifi" onPress={() => router.push("/hub" as never)} last /> : null}
          {k !== "phone" ? <Row left={<IconCircle name="wifioff" />} title="Join a hub nearby" meta="Your group's phone, over the same wifi" onPress={() => router.push("/pair" as never)} last /> : null}
        </Panel></> : null}
      {/* "Use your LGU's network" returns when partner and LGU networks work in the app (#16). */}
      <Text style={[t.meta, { marginTop: 14, marginHorizontal: 4 }]}>Your account and where records live are separate: signing in with Google, email or Dasig.org works the same wherever your group keeps its records.</Text>
    </Screen>
  );
}
