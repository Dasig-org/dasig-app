/**
 * The bottom bar (2026-11-15, UI_REIMAGINE §2.1): an iOS-style tab bar, full width with a hairline on top, the active destination tinted orange. Me shows the person's face. The "+" is a FAB (ui/Fab.tsx), not in the bar.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { Avatar, usePress } from "./kit";
import { c, tone } from "./theme";

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
export function Glyph({ name, color, strokeWidth }: { name: TabKey; color: string; strokeWidth: number }) {
  const p = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const ci = CIRCLES[name];
  return <Svg width={23} height={23} viewBox="0 0 24 24">{(PATHS[name] ?? []).map((d) => <Path key={d} d={d} {...p} />)}{ci ? <Circle cx={ci[0]} cy={ci[1]} r={ci[2]} {...p} /> : null}</Svg>;
}
/** Me: your photo, or your initial on a warm circle. */
function MeDot({ name, photo }: { name: string; photo?: any }) {
  if (photo) return <Avatar name={name} photo={photo} size={24} />;
  return <View style={st.me}><Svg width={24} height={24} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}><Defs><LinearGradient id="tabme" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FBB931" /><Stop offset="1" stopColor="#F47C26" /></LinearGradient></Defs>
    <Circle cx={12} cy={12} r={12} fill="url(#tabme)" /></Svg><Text style={st.meText}>{(name.trim()[0] ?? "?").toUpperCase()}</Text></View>;
}

export const LABEL: Record<TabKey, string> = { home: "Home", nearby: "Nearby", add: "Add", groups: "Groups", story: "Me", projects: "Projects", inbox: "Inbox", people: "People", team: "Team" };


function Destination({ k, on, me, badge, onPress }: { k: TabKey; on: boolean; me: { name: string; photo?: any }; badge: number; onPress: () => void }) {
  const pr = usePress();
  // iOS-style: the selected destination is simply tinted in the brand orange (icon and label); the rest are grey.
  const tint = on ? c.accent : c.s500;
  return <Pressable onPress={onPress} onPressIn={pr.onPressIn} onPressOut={pr.onPressOut} accessibilityRole="tab" accessibilityLabel={LABEL[k]} accessibilityState={{ selected: on }}
    style={{ flex: 1, height: TAB_BAR_HEIGHT, alignItems: "center", justifyContent: "center" }}>
    <Animated.View style={[{ alignItems: "center", gap: 3 }, pr.style]}>
      <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
        {k === "story" ? <View style={{ borderRadius: 14, borderWidth: on ? 2 : 0, borderColor: c.accent, padding: on ? 1 : 0 }}><MeDot name={me.name} photo={me.photo} /></View> : <Glyph name={k} color={tint} strokeWidth={on ? 2.2 : 1.8} />}
        {k === "inbox" && badge > 0 ? <View style={st.badge}><Text style={st.badgeText}>{badge > 9 ? "9+" : String(badge)}</Text></View> : null}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, fontWeight: on ? "700" : "500", color: tint }}>{LABEL[k]}</Text>
    </Animated.View>
  </Pressable>;
}

/** Material 3 navigation bar: full width, edge to edge, the destinations only (the "+" is the FAB now, ui/Fab.tsx). */
/** `preview`: drawn inside a page (Me → Your bar), without the safe-area padding. */
export function TabBar({ active, onSelect, me, items, badge = 0, preview }: { active: TabKey; onSelect: (k: TabKey) => void; me: { name: string; photo?: any }; items: TabKey[]; badge?: number; preview?: boolean }) {
  const inset = useSafeAreaInsets();
  return <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: tone.surfaceHigh, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.s300, paddingBottom: preview ? 0 : inset.bottom, paddingHorizontal: 8 }}>
    {items.filter((k) => k !== "add").map((k) => <Destination key={k} k={k} on={k === active} me={me} badge={badge} onPress={() => onSelect(k)} />)}
  </View>;
}
const st = StyleSheet.create({
  me: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  meText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  badge: { position: "absolute", top: -2, right: 8, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" },
  badgeText: { color: c.white, fontSize: 10.5, fontWeight: "800" },
});
