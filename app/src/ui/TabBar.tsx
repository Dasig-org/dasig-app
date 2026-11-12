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

export type TabKey = "home" | "nearby" | "add" | "groups" | "story" | "projects" | "inbox" | "people" | "team";
export const TAB_BAR_HEIGHT = 64;

function Glyph({ name, color, strokeWidth }: { name: TabKey; color: string; strokeWidth: number }) {
  const p = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home": return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" {...p} /><Path d="M9.5 20.5v-6h5v6" {...p} /></Svg>;
    case "nearby": return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" {...p} /><Circle cx={12} cy={10} r={2.4} {...p} /></Svg>;
    case "projects": return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M5 21V4.5h11.5l-1.6 3.5 1.6 3.5H5" {...p} /></Svg>;
    case "inbox": return <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 13.5 6.5 5h11L20 13.5V19H4z" {...p} /><Path d="M4 13.5h4.5l1.2 2.5h4.6l1.2-2.5H20" {...p} /></Svg>;
    case "team": return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={12} cy={8} r={3.2} {...p} /><Path d="M5.5 20c0-3.4 2.9-5.8 6.5-5.8s6.5 2.4 6.5 5.8" {...p} /><Path d="M4 11.5h2.5M17.5 11.5H20" {...p} /></Svg>;
    case "add": return <Svg width={26} height={26} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" {...p} /></Svg>;
    case "people": case "groups": return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={9} cy={8} r={3.4} {...p} /><Path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" {...p} /><Path d="M15.5 4.8a3.2 3.2 0 0 1 0 6.3M17.5 14.2c2 .6 3.5 2.4 3.5 5.3" {...p} /></Svg>;
    default: return <Svg width={24} height={24} viewBox="0 0 24 24"><Circle cx={12} cy={8} r={3.6} {...p} /><Path d="M4.5 20.5c0-3.8 3.4-6.5 7.5-6.5s7.5 2.7 7.5 6.5" {...p} /></Svg>;
  }
}

const LABEL: Record<TabKey, string> = { home: "Home", nearby: "Nearby", add: "Add", groups: "Groups", story: "Me", projects: "Projects", inbox: "Inbox", people: "People", team: "Team" };

export function TabBar({ active, onSelect, me, items, badge = 0 }: { active: TabKey; onSelect: (k: TabKey) => void; me: { name: string; photo?: any }; items: TabKey[]; badge?: number }) {
  const ITEMS = items.map((key) => ({ key, label: LABEL[key] }));
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
                {i.key === "inbox" && badge > 0 ? <View style={st.badge}><Text style={st.badgeText}>{badge > 9 ? "9+" : String(badge)}</Text></View> : null}
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
  // Android draws borderRadius 999 on a stretched View as square; use half the height and clip (2026-11-12).
  item: { alignItems: "center", justifyContent: "center", gap: 2, height: 52, minWidth: 62, paddingHorizontal: 12, borderRadius: 26, overflow: "hidden" },
  itemOn: { backgroundColor: "rgba(15,23,42,0.06)" },
  label: { fontSize: 11 },
  badge: { position: "absolute", top: 4, right: 12, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  badgeText: { color: c.white, fontSize: 10.5, fontWeight: "800" },
  ring: { borderRadius: 16, borderWidth: 2, borderColor: c.ink, padding: 1 },
  noRing: { padding: 3 },
});
