import { Text, View } from "react-native";
import { SLOTS, useBar, type Slot } from "@/lib/bar";
import { useSession } from "@/lib/session";
import { Buttons, Chips, Eyebrow, Meta, Outline, Screen, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** Me → Your bar: choose slots 2, 4 and 5 of the bottom bar, for this context (personal, or the current group). */
export default function YourBar() {
  const s = useSession();
  const bar = useBar();
  const set = (i: number, k: Slot) => { const next = [...bar.slots] as [Slot, Slot, Slot]; const j = next.indexOf(k); if (j >= 0 && j !== i) next[j] = next[i]!; next[i] = k; bar.save(next); };
  const opts = SLOTS.map((x) => ({ value: x.key, label: x.label }));
  return (
    <Screen back>
      <Title sub={`For ${s.current ? s.current.name : "your personal space"}. Home and + always stay.`}>Your bar</Title>
      {["Second", "Fourth", "Fifth"].map((name, i) => <View key={name}>
        <Eyebrow>{`${name} button`}</Eyebrow>
        <Chips options={opts} value={bar.slots[i]!} onChange={(k) => set(i, k as Slot)} />
        <Meta>{SLOTS.find((x) => x.key === bar.slots[i])?.meta}</Meta>
      </View>)}
      <Text style={[t.meta, { marginTop: 16 }]}>{bar.custom ? "Your choice. " : "The default for your role. "}Switching groups can give a different bar.</Text>
      {bar.custom ? <Buttons><Outline flex label="Reset to default" onPress={() => bar.save(null)} /></Buttons> : null}
    </Screen>
  );
}
