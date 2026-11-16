import { Text, View } from "react-native";
import { Eyebrow, IconCircle, Panel, Row, Screen, Title } from "@/ui/kit";
import type { IconName } from "@/ui/Icon";
import { type as t } from "@/ui/theme";

const GUIDES: { icon: IconName; q: string; a: string }[] = [
  { icon: "heart", q: "How do I find something to do?", a: "Home shows open work from your groups. Tap one, then “I'm in”. To help someone who already took it, tap “I'll help”." },
  { icon: "users", q: "How do I bring people in?", a: "Open People and tap Invite. At a meeting, turn on your hotspot and show the code; others scan it in Dasig. Or add someone by name and they can claim their record later." },
  { icon: "flag", q: "How do teams work?", a: "Each project has teams (committees) with a lead. Leads add work, ask people, and accept ideas. Anyone on a team can suggest work." },
  { icon: "building", q: "What's a gate?", a: "Something many tasks wait on, like a venue being approved. Mark it on the task (Others wait on this). Tasks that wait on it can be prepared but not taken until it's done." },
  { icon: "lock", q: "Does it need internet?", a: "Mostly, yes: your group's work is kept on the Bayanihan Network. Without signal you can still read what you last opened, and what you do is kept and sent when you're back. A group with no signal at all can keep everything on one phone as a hub (Settings → Working offline)." },
  { icon: "check", q: "What does “recorded and signed” mean?", a: "When work is done, your group's phone signs the record. Anyone can check it hasn't been changed. It goes into the story of everyone who did it." },
  { icon: "download", q: "Can I take my records with me?", a: "Yes. You → Settings → Your data → Download everything. It's in BIX, an open format any app can read." },
];

/** Help: short guides in plain words. */
export default function Help() {
  return (
    <Screen back>
      <Title>How Dasig works</Title>
      {GUIDES.map((g) => <View key={g.q} style={{ marginTop: 10 }}><Panel><View style={{ flexDirection: "row", gap: 12, paddingVertical: 14 }} accessible accessibilityLabel={`${g.q} ${g.a}`}>
        <IconCircle name={g.icon} /><View style={{ flex: 1 }}><Text style={t.row}>{g.q}</Text><Text style={[t.body, { marginTop: 4 }]}>{g.a}</Text></View></View></Panel></View>)}
      <Eyebrow>Show the tips again</Eyebrow>
      <Panel><Row left={<IconCircle name="spark" />} title="Reset first-time tips" onPress={async () => { const A = (await import("@react-native-async-storage/async-storage")).default; const keys = (await A.getAllKeys()).filter((k) => k.startsWith("dasig.tip.")); await A.multiRemove(keys); }} last /></Panel>
    </Screen>
  );
}
