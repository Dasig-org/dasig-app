import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { personName } from "@/lib/work";
import { IconCircle, Screen, Title } from "@/ui/kit";
import { Icon, type IconName } from "@/ui/Icon";
import { c, radius, type as t } from "@/ui/theme";

function Path({ icon, title, meta, onPress }: { icon: IconName; title: string; meta: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${meta}`} style={{ backgroundColor: c.white, borderRadius: radius.field, padding: 16, flexDirection: "row", gap: 14, alignItems: "center", marginTop: 10 }}>
    <IconCircle name={icon} size={56} /><View style={{ flex: 1 }}><Text style={t.row}>{title}</Text><Text style={t.meta}>{meta}</Text></View>
    <Icon name="chevron" size={18} color={c.s300} /></Pressable>;
}

/** Three ways in: lend a hand, run a group, or join with an invite. */
export default function Paths() {
  const s = useSession();
  return (
    <Screen>
      <View style={{ height: 24 }} />
      <Title>{`Salamat, ${personName(s.person)}.\nHow do you want to start?`}</Title>
      <Path icon="heart" title="I want to help out" meta="Join a group as a volunteer" onPress={() => router.push("/volunteer" as never)} />
      <Path icon="flag" title="I run a group" meta="Set up your organization and its people" onPress={() => router.push("/start-group")} />
      <Path icon="camera" title="I have an invite" meta="Scan a code or open a link someone sent" onPress={() => router.push("/scan" as never)} />
      <Text style={[t.meta, { marginTop: 18, textAlign: "center" }]} onPress={() => router.replace("/home")}>Skip for now</Text>
    </Screen>
  );
}
