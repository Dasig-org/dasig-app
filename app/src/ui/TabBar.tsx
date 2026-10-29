/**
 * The bottom bar, drawn to match Dasig Fundraising's docked bar (`apps/mobile/src/components/TabBar.tsx`
 * in the dasig repo): white, edge to edge, 58px, a hairline on top, five equal slots with no labels.
 * The centre "+" is an action, drawn in ink; the active destination is ink with a heavier stroke;
 * Me shows the person's own face. The bar never changes shape between roles.
 */
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { Avatar } from "./kit";
import { c } from "./theme";

export type TabKey = "home" | "nearby" | "add" | "groups" | "story";
export const TAB_BAR_HEIGHT = 58;

function Glyph({ name, color, strokeWidth }: { name: TabKey; color: string; strokeWidth: number }) {
  const p = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home": return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" {...p} /><Path d="M9.5 20.5v-6h5v6" {...p} /></Svg>;
    case "nearby": return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={11} cy={11} r={6.5} {...p} /><Path d="M19.5 19.5 16 16" {...p} /></Svg>;
    case "add": return <Svg width={26} height={26} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" {...p} /></Svg>;
    case "groups": return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={9} cy={8} r={3.4} {...p} /><Path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" {...p} /><Path d="M15.5 4.8a3.2 3.2 0 0 1 0 6.3M17.5 14.2c2 .6 3.5 2.4 3.5 5.3" {...p} /></Svg>;
    default: return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={12} cy={8} r={3.6} {...p} /><Path d="M4.5 20.5c0-3.8 3.4-6.5 7.5-6.5s7.5 2.7 7.5 6.5" {...p} /></Svg>;
  }
}

const ITEMS: { key: TabKey; label: string }[] = [
  { key: "home", label: "Home" }, { key: "nearby", label: "Discover" }, { key: "add", label: "Add" },
  { key: "groups", label: "Groups" }, { key: "story", label: "Me" },
];

export function TabBar({ active, onSelect, me }: { active: TabKey; onSelect: (k: TabKey) => void; me: { name: string; photo?: any } }) {
  const inset = useSafeAreaInsets();
  return (
    <View style={[st.wrap, { paddingBottom: inset.bottom }]}>
      <View style={st.dock} accessibilityRole="tablist">
        {ITEMS.map((i) => {
          const on = i.key === active, action = i.key === "add";
          return (
            <Pressable key={i.key} onPress={() => onSelect(i.key)} style={st.button} accessibilityRole={action ? "button" : "tab"} accessibilityLabel={i.label}
              accessibilityState={action ? undefined : { selected: on }} android_ripple={{ color: "rgba(15,23,42,0.06)", borderless: true, radius: 28 }}>
              {i.key === "story" && me.photo ? <View style={on ? st.ring : st.noRing}><Avatar name={me.name} photo={me.photo} size={28} /></View>
                : <Glyph name={i.key} color={action || on ? c.ink : c.s400} strokeWidth={action ? 2.2 : on ? 2.3 : 1.8} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: c.white },
  dock: { flexDirection: "row", alignItems: "center", height: TAB_BAR_HEIGHT, borderTopWidth: 1, borderTopColor: c.s200 },
  button: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: "center", justifyContent: "center" },
  ring: { borderRadius: 18, borderWidth: 2, borderColor: c.ink, padding: 1 },
  noRing: { padding: 3 },
});
