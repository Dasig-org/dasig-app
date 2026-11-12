import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAccount } from "@/lib/account";
import { useSession } from "@/lib/session";
import { personName } from "@/lib/work";
import { Avatar, Buttons, Eyebrow, IconCircle, Panel, Primary, Row, Sand, Screen } from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { PushToggle } from "@/ui/PushToggle";
import { c, radius, type as t } from "@/ui/theme";

/*
 * Settings (design/account-sketches.html 8, 11): who you are and how you signed in, first; then this app, your data,
 * and the rest. Where records live is under "Working offline", for the few groups that need it.
 */
export default function Settings() {
  const s = useSession();
  const a = useAccount();
  const web = typeof document !== "undefined";
  const meta = a.how ?? (a.loaded ? `Nickname only · this ${web ? "browser" : "phone"}` : " ");
  return (
    <Screen back>
      <Text style={t.title}>Settings</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Your account" onPress={() => router.push("/account" as never)}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.white, borderRadius: radius.panel, padding: 14, marginTop: 12 }}>
        <Avatar name={personName(s.person)} photo={s.person?.photo} size={44} />
        <View style={{ flex: 1 }}><Text style={t.row}>{personName(s.person)}</Text><Text style={[t.meta, { marginTop: 2 }]} numberOfLines={1}>{meta}</Text></View>
        <Icon name="chevron" size={14} color={c.s400} />
      </Pressable>
      {a.guest ? <View style={{ marginTop: 10 }}><Sand><View style={{ flex: 1 }}>
        <Text style={t.row}>Keep your work</Text>
        <Text style={[t.meta, { marginTop: 4 }]}>{`Add Google, email or Dasig.org. If you lose this ${web ? "browser" : "phone"}, it's how you get back in.`}</Text>
        <Buttons><Primary label="Add a way to sign in" onPress={() => router.push("/account?add=1" as never)} /></Buttons>
      </View></Sand></View> : null}
      <Eyebrow>This app</Eyebrow>
      <Panel>
        <PushToggle />
        <Row left={<IconCircle name="swap" />} title="Your bar" meta="What's on the bottom bar" onPress={() => router.push("/your-bar" as never)} />
        <Row left={<IconCircle name="users" />} title="Your groups" meta="Pages, settings, joining and leaving" onPress={() => router.push("/groups" as never)} last />
      </Panel>
      <Eyebrow>Your data</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="download" />} title="Your data" meta="Download, choose what shows, delete" onPress={() => router.push("/your-data" as never)} />
        <Row left={<IconCircle name="lock" />} title="What you've agreed to" onPress={() => router.push("/consent" as never)} last />
      </Panel>
      <Eyebrow>More</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="wifioff" />} title="Working offline" meta={s.connection?.kind === "ecosystem" ? "Saved on the Bayanihan Network" : s.connection?.kind === "hub" ? "Your group's hub" : "On this phone only"} onPress={() => router.push("/offline" as never)} />
        <Row left={<IconCircle name="spark" />} title="How Dasig works" meta="Short guides" onPress={() => router.push("/help" as never)} />
        <Row left={<IconCircle name="book" />} title="BIX, Bayanihan and Bayani" meta="Open source from Dasig Inc., and why we share it" onPress={() => router.push("/about" as never)} last />
      </Panel>
    </Screen>
  );
}
