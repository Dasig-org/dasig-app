/**
 * The bottom bar (2026-11-11): a floating, fully rounded light pill, after Netflix's bar, in Dasig's colours. Five
 * equal slots, each an icon over a short label; the active one sits in a soft pill of its own. Me shows the person's
 * face. It floats on the page's wash with a soft shadow; the bar never changes shape between roles.
 */
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { Avatar } from "./kit";
import { c } from "./theme";

export type TabKey = "home" | "nearby" | "add" | "groups" | "story";
export const TAB_BAR_HEIGHT = 64;

function Glyph({ name, color, strokeWidth }: { name: TabKey; color: string; strokeWidth: number }) {
  const p = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home": return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" {...p} /><Path d="M9.5 20.5v-6h5v6" {...p} /></Svg>;
    case "nearby": return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" {...p} /><Circle cx={12} cy={10} r={2.4} {...p} /></Svg>;
    case "add": return <Svg width={26} height={26} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" {...p} /></Svg>;
    case "groups": return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={9} cy={8} r={3.4} {...p} /><Path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" {...p} /><Path d="M15.5 4.8a3.2 3.2 0 0 1 0 6.3M17.5 14.2c2 .6 3.5 2.4 3.5 5.3" {...p} /></Svg>;
    default: return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={12} cy={8} r={3.6} {...p} /><Path d="M4.5 20.5c0-3.8 3.4-6.5 7.5-6.5s7.5 2.7 7.5 6.5" {...p} /></Svg>;
  }
}

const ITEMS: { key: TabKey; label: string }[] = [
  { key: "home", label: "Home" }, { key: "nearby", label: "Nearby" }, { key: "add", label: "Add" },
  { key: "groups", label: "Groups" }, { key: "story", label: "Me" },
];

export function TabBar({ active, onSelect, me }: { active: TabKey; onSelect: (k: TabKey) => void; me: { name: string; photo?: any } }) {
  const inset = useSafeAreaInsets();
  return (
    <View style={[st.wrap, { paddingBottom: Math.max(inset.bottom, 10) }]}>
      <View style={st.dock} accessibilityRole="tablist">
        {ITEMS.map((i) => {
          const on = i.key === active, action = i.key === "add";
          const tint = on ? c.ink : c.s500;
          return (
            <Pressable key={i.key} onPress={() => onSelect(i.key)} style={st.button} accessibilityRole={action ? "button" : "tab"} accessibilityLabel={i.label}
              accessibilityState={action ? undefined : { selected: on }}>
              <View style={[st.item, on && st.itemOn]}>
                {i.key === "story" && me.photo ? <View style={on ? st.ring : st.noRing}><Avatar name={me.name} photo={me.photo} size={24} /></View>
                  : <Glyph name={i.key} color={tint} strokeWidth={on ? 2.1 : 1.7} />}
                <Text numberOfLines={1} style={[st.label, { color: tint, fontWeight: on ? "700" : "500" }]}>{i.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: c.wash, paddingHorizontal: 14, paddingTop: 6 },
  dock: { flexDirection: "row", alignItems: "center", height: TAB_BAR_HEIGHT, borderRadius: 999, backgroundColor: c.white, paddingHorizontal: 6,
    borderWidth: 1, borderColor: "rgba(15,23,42,0.06)",
    ...(Platform.OS === "web" ? { boxShadow: "0px 8px 24px rgba(15, 23, 42, 0.10)" } as object : { shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }) },
  button: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: "center", justifyContent: "center" },
  item: { alignItems: "center", justifyContent: "center", gap: 2, height: 52, minWidth: 62, paddingHorizontal: 10, borderRadius: 999 },
  itemOn: { backgroundColor: "rgba(15,23,42,0.06)" },
  label: { fontSize: 11 },
  ring: { borderRadius: 16, borderWidth: 2, borderColor: c.ink, padding: 1 },
  noRing: { padding: 3 },
});
