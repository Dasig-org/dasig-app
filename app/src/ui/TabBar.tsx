import { useState } from "react";
/**
 * The bottom bar (2026-11-11): a floating, fully rounded light pill, after Netflix's bar, in Dasig's colours. Five
 * equal slots, each an icon over a short label; the active one sits in a soft pill of its own. Me shows the person's
 * face. It floats on the page's wash with a soft shadow; the bar never changes shape between roles.
 */
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Avatar } from "./kit";
import { c } from "./theme";

export type TabKey = "home" | "nearby" | "add" | "groups" | "story" | "projects" | "inbox" | "people" | "team";
export const TAB_BAR_HEIGHT = 64;

// Drawn to match design/archive/navbar.py (the sketches' bar), 2026-11-12.
const PATHS: Partial<Record<TabKey, string[]>> = {
  home: ["M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"],
  projects: ["M5 21V4.5h11.5l-1.6 3.5 1.6 3.5H5"],
  nearby: ["M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"],
  inbox: ["M4 13.5 6.5 5h11L20 13.5V19H4z", "M4 13.5h4.5l1.2 2.5h4.6l1.2-2.5H20"],
  people: ["M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2", "M15.5 5.8a3 3 0 0 1 0 5.4M17.5 14.2c1.8.7 3 2.5 3 4.8"],
  groups: ["M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2", "M15.5 5.8a3 3 0 0 1 0 5.4M17.5 14.2c1.8.7 3 2.5 3 4.8"],
  team: ["M5.5 20c0-3.4 2.9-5.8 6.5-5.8s6.5 2.4 6.5 5.8", "M4 11.5h2.5M17.5 11.5H20"],
  story: ["M5.5 20c0-3.4 2.9-5.8 6.5-5.8s6.5 2.4 6.5 5.8"],
};
const CIRCLES: Partial<Record<TabKey, [number, number, number]>> = { nearby: [12, 10, 2.3], people: [9, 8.5, 3], groups: [9, 8.5, 3], team: [12, 8, 3.2], story: [12, 8, 3.2] };
function Glyph({ name, color, strokeWidth }: { name: TabKey; color: string; strokeWidth: number }) {
  const p = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const ci = CIRCLES[name];
  return <Svg width={23} height={23} viewBox="0 0 24 24">{(PATHS[name] ?? []).map((d) => <Path key={d} d={d} {...p} />)}{ci ? <Circle cx={ci[0]} cy={ci[1]} r={ci[2]} {...p} /> : null}</Svg>;
}
/** The orange round "+" in the middle: the bar's one orange. */
function Plus() {
  return <View style={st.plusShadow}><Svg width={46} height={46} viewBox="0 0 46 46">
    <Defs><LinearGradient id="tabplus" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#F47C26" /><Stop offset="1" stopColor="#E85C21" /></LinearGradient></Defs>
    <Circle cx={23} cy={23} r={23} fill="url(#tabplus)" /><Path d="M23 14v18M14 23h18" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" /></Svg></View>;
}
/** The active tab's soft grey pill, as a rounded shape that fills the item. */
function ActivePill() {
  const [w, setW] = useState(0);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
    {w ? <Svg width={w} height={52}><Rect x={0} y={0} width={w} height={52} rx={26} ry={26} fill="rgba(15,23,42,0.06)" /></Svg> : null}
  </View>;
}
/** Me: your photo, or your initial on a warm circle. */
function MeDot({ name, photo }: { name: string; photo?: any }) {
  if (photo) return <Avatar name={name} photo={photo} size={24} />;
  return <View style={st.me}><Svg width={24} height={24} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}><Defs><LinearGradient id="tabme" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FBB931" /><Stop offset="1" stopColor="#F47C26" /></LinearGradient></Defs>
    <Circle cx={12} cy={12} r={12} fill="url(#tabme)" /></Svg><Text style={st.meText}>{(name.trim()[0] ?? "?").toUpperCase()}</Text></View>;
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
            <Pressable key={i.key} onPress={() => onSelect(i.key)} style={({ pressed }) => [st.button, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole={action ? "button" : "tab"} accessibilityLabel={i.label}
              accessibilityState={action ? undefined : { selected: on }}>
              {action ? <Plus /> : <View style={st.item}>
                {/* The active pill is drawn, not a View background: some Android builds showed it square (2026-11-13). */}
                {on ? <ActivePill /> : null}
                {i.key === "story" ? <MeDot name={me.name} photo={me.photo} /> : <Glyph name={i.key} color={tint} strokeWidth={on ? 2.1 : 1.9} />}
                {i.key === "inbox" && badge > 0 ? <View style={st.badge}><Text style={st.badgeText}>{badge > 9 ? "9+" : String(badge)}</Text></View> : null}
                <Text numberOfLines={1} style={[st.label, { color: tint }]}>{i.label}</Text>
              </View>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: c.wash, paddingHorizontal: 14, paddingTop: 6 },
  // Radius is half the height, not 999, so Android draws it round.
  dock: { flexDirection: "row", alignItems: "center", height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2, backgroundColor: c.white, paddingHorizontal: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 8px 24px rgba(15, 23, 42, 0.10)" } as object : { shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }) },
  button: { flex: 1, height: TAB_BAR_HEIGHT, alignItems: "center", justifyContent: "center" },
  // Android draws borderRadius 999 on a stretched View as square; use half the height and clip (2026-11-12).
  item: { alignItems: "center", justifyContent: "center", gap: 2, height: 52, minWidth: 58, paddingHorizontal: 10, borderRadius: 26 },
  label: { fontSize: 11, fontWeight: "600" },
  me: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  meText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  plusShadow: { width: 46, height: 46, borderRadius: 23,
    ...(Platform.OS === "web" ? { boxShadow: "0px 6px 16px rgba(244, 124, 38, 0.30)" } as object : { shadowColor: "#F47C26", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }) },
  badge: { position: "absolute", top: 3, right: 10, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  badgeText: { color: c.white, fontSize: 10.5, fontWeight: "800" },
});
