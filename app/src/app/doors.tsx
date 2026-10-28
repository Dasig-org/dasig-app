import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { personName } from "@/lib/work";
import { Field, IconCircle, Primary, Screen, Sheet, Title, Buttons } from "@/ui/kit";
import { Icon, type IconName } from "@/ui/Icon";
import { c, radius, type as t } from "@/ui/theme";

function Door({ icon, title, meta, onPress }: { icon: IconName; title: string; meta: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={{ backgroundColor: c.white, borderRadius: radius.field, padding: 16, flexDirection: "row", gap: 14, alignItems: "center", marginTop: 10 }}>
    <IconCircle name={icon} size={56} /><View style={{ flex: 1 }}><Text style={t.row}>{title}</Text><Text style={t.meta}>{meta}</Text></View>
    <Icon name="chevron" size={18} color={c.s300} /></Pressable>;
}

/** Onboarding 2: three doors. "Start a group" is growth loop 2. */
export default function Doors() {
  const s = useSession();
  const [joining, setJoining] = useState(false);
  const [link, setLink] = useState("");
  const token = link.trim().split("/").filter(Boolean).pop() ?? "";
  return (
    <Screen>
      <View style={{ height: 30 }} />
      <Title>{`Hi, ${personName(s.person)}.\nWhat brings you here?`}</Title>
      <Door icon="users" title="Join a group" meta="You have an invite link" onPress={() => setJoining(true)} />
      <Door icon="flag" title="Start a group" meta="A club, a community, an event team" onPress={() => router.push("/start-group")} />
      <Door icon="heart" title="Just help out" meta="See your work and your story" onPress={() => router.replace("/home")} />
      <Sheet open={joining} onClose={() => setJoining(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Paste your invite link</Text>
        <Field value={link} onChangeText={setLink} placeholder="https://…/join/…" autoCapitalize="none" autoCorrect={false} />
        <Buttons><Primary label="Open the invite" disabled={!token} onPress={() => { setJoining(false); router.push(`/join/${token}`); }} /></Buttons>
      </Sheet>
    </Screen>
  );
}
