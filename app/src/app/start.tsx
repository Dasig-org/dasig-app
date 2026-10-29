import { useRef, useState } from "react";
import { router } from "expo-router";
import { Dimensions, FlatList, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { Buttons, Field, IconCircle, Mark, Notice, Outline, Primary, Screen } from "@/ui/kit";
import type { IconName } from "@/ui/Icon";
import { c, type as t } from "@/ui/theme";

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  { icon: "users", title: "Your group, organized", body: "Projects, teams and who's doing what, in one place everyone can see." },
  { icon: "heart", title: "Volunteers are part of it", body: "Anyone can say \u201cI'm in\u201d, help out, suggest work, and get credit." },
  { icon: "lock", title: "Yours, even offline", body: "Everything is kept on your phones. Your group can share one phone as a hub, no internet needed." },
];

/** Welcome: three short guide slides, then a nickname. */
export default function Start() {
  const s = useSession();
  const [i, setI] = useState(0);
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = useRef<FlatList>(null);
  const w = Math.min(Dimensions.get("window").width, 520) - 36;
  const go = async () => {
    setBusy(true); setErr(null);
    try { await s.startWithNickname(name); router.replace("/profile?first=1" as never); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  if (asking) return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 30 }}><Mark size={64} /></View>
      <Text style={[t.title, { textAlign: "center", marginTop: 16 }]}>What should we call you?</Text>
      <Text style={[t.body, { textAlign: "center", marginTop: 4 }]}>A nickname is enough. You can add more next.</Text>
      <Field accessibilityLabel="Your nickname" value={name} onChangeText={setName} placeholder="e.g. Don" autoFocus onSubmitEditing={go} returnKeyType="go" />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Continue" onPress={go} busy={busy} disabled={!name.trim()} /></Buttons>
      <Text style={[t.meta, { textAlign: "center", marginTop: 14 }]}>Kept on this phone. No account or internet needed.</Text>
    </Screen>
  );
  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 24, marginBottom: 10 }}><Mark size={84} /></View>
      <FlatList ref={list} data={SLIDES} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(x) => x.title}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / w))}
        renderItem={({ item }) => <View style={{ width: w, alignItems: "center", paddingTop: 20, paddingHorizontal: 10 }}>
          <IconCircle name={item.icon} size={88} /><Text style={[t.title, { textAlign: "center", marginTop: 18 }]}>{item.title}</Text>
          <Text style={[t.body, { textAlign: "center", marginTop: 8 }]}>{item.body}</Text></View>} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 18 }} accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}`}>
        {SLIDES.map((_, j) => <View key={j} style={{ width: j === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: j === i ? c.accent : c.s300 }} />)}
      </View>
      <Buttons>
        {i < SLIDES.length - 1 ? <><Outline label="Skip" onPress={() => setAsking(true)} /><Primary label="Next" onPress={() => { list.current?.scrollToIndex({ index: i + 1 }); setI(i + 1); }} /></>
          : <Primary label="Get started" onPress={() => setAsking(true)} />}
      </Buttons>
    </Screen>
  );
}
