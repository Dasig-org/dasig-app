import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SLOTS, useBar, type Slot } from "@/lib/bar";
import { useSession } from "@/lib/session";
import { personName } from "@/lib/work";
import { Buttons, Meta, Outline, Screen, Title } from "@/ui/kit";
import { useSnackbar } from "@/ui/Snackbar";
import { Glyph, LABEL, TabBar, type TabKey } from "@/ui/TabBar";
import { c, radius, tone, type as t } from "@/ui/theme";

/*
 * Me → Your bar (redesigned 2026-11-15; Don: "This should have a preview of how the bar would look like and have icons
 * as well"). The real bar, drawn live at the top: tap one of its buttons to change it, then pick what goes there from
 * tiles with their icons and what they open. Home is always first; the round + button floats above the bar, so it isn't
 * one of the choices. Picking one that's already in the bar swaps the two. Per context (personal, or this group).
 */
export default function YourBar() {
  const s = useSession();
  const bar = useBar();
  const { show } = useSnackbar();
  const [at, setAt] = useState(0);
  const items = ["home", ...bar.slots] as TabKey[];
  const set = (k: Slot) => {
    const next = [...bar.slots] as [Slot, Slot, Slot];
    const j = next.indexOf(k);
    if (j === at) return;
    if (j >= 0) next[j] = next[at]!;
    next[at] = k;
    bar.save(next);
    show(j >= 0 ? `${LABEL[k]} and ${LABEL[bar.slots[at]! as TabKey]} swapped places.` : `${LABEL[k]} is in your bar.`);
  };
  const me = { name: s.person ? personName(s.person) : "Me", photo: s.person?.photo };
  return (
    <Screen back bayani={false}>
      <Title sub={`For ${s.current ? s.current.name : "your personal space"}. Home is always first; the round + button floats above the bar.`}>Your bar</Title>

      {/* The preview: the real bar, as it will look. Tap a button to change it. */}
      <View style={{ marginTop: 12, borderRadius: 24, overflow: "hidden", backgroundColor: c.wash, borderWidth: 1, borderColor: c.s200 }}>
        <View style={{ height: 72, paddingHorizontal: 16, paddingTop: 14 }}>
          <View style={{ height: 10, width: "55%", borderRadius: 5, backgroundColor: c.s200 }} />
          <View style={{ height: 10, width: "35%", borderRadius: 5, backgroundColor: c.s200, marginTop: 8 }} />
          <View style={{ position: "absolute", right: 14, bottom: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", opacity: 0.9 }}>
            <Text style={{ color: c.white, fontSize: 24, lineHeight: 26, fontWeight: "300" }}>+</Text></View>
        </View>
        <TabBar preview items={items} active={items[at + 1]!} me={me} onSelect={(k) => { const i = items.indexOf(k); if (i <= 0) show("Home always stays first."); else setAt(i - 1); }} />
        {/* Which button you're changing: a marker under it. */}
        <View style={{ flexDirection: "row", paddingHorizontal: 8, paddingBottom: 8, backgroundColor: tone.surfaceHigh }}>
          {items.map((k, i) => <View key={k} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ height: 4, width: 28, borderRadius: 2, backgroundColor: i === at + 1 ? c.accent : "transparent" }} /></View>)}
        </View>
      </View>
      <Meta>{"Tap a button in the bar to change it."}</Meta>

      <Text style={[t.eyebrow, { marginTop: 18, marginBottom: 8, marginHorizontal: 4 }]}>{`Button ${at + 2}: choose what it opens`}</Text>
      <Animated.View key={at} entering={FadeIn.duration(180)} style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {SLOTS.map((x) => {
          const on = bar.slots[at] === x.key, elsewhere = !on && bar.slots.includes(x.key);
          return <Pressable key={x.key} onPress={() => set(x.key)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${x.label}. ${x.meta}${elsewhere ? ". Already in the bar; picking it swaps them" : ""}`}
            style={({ pressed }) => ({ width: "48%", flexGrow: 1, minHeight: 112, borderRadius: radius.panel, padding: 14, backgroundColor: on ? tone.primaryContainer : pressed ? c.s200 : c.white,
              borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.s200 })}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: on ? c.white : c.wash, alignItems: "center", justifyContent: "center" }}>
                <Glyph name={x.key as TabKey} color={on ? c.accent : c.ink} strokeWidth={2} /></View>
              {on ? <Text style={{ fontSize: 12, fontWeight: "800", color: tone.onPrimaryContainer }}>HERE</Text>
                : elsewhere ? <Text style={{ fontSize: 12, fontWeight: "700", color: c.s500 }}>{`In the bar`}</Text> : null}
            </View>
            <Text style={[t.row, { marginTop: 10 }]}>{x.label}</Text>
            <Text style={[t.meta, { marginTop: 2 }]}>{x.meta}</Text>
          </Pressable>;
        })}
      </Animated.View>

      <Text style={[t.meta, { marginTop: 16, marginHorizontal: 4 }]}>{bar.custom ? "Your choice for this group. Switching groups can give a different bar." : "The default for your role. Switching groups can give a different bar."}</Text>
      {bar.custom ? <Buttons><Outline flex label="Reset to default" onPress={() => { bar.save(null); show("Back to the default bar."); }} /></Buttons> : null}
    </Screen>
  );
}
