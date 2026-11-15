import { useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import Animated, { FadeIn, FadeOut, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Avatar, listLayout, usePress } from "./kit";
import { c, motion, radius, scale, tone } from "./theme";

/** Material 3 building blocks for the reimagined screens (UI_REIMAGINE §3): ring, tabs, carousel, card, FAB corner. */

const ACircle = Animated.createAnimatedComponent(Circle);
/** Progress as a ring that fills in (200ms); the middle says what it counts. */
export function ProgressRing({ value, size = 72, label, sub }: { value: number; size?: number; label: string; sub?: string }) {
  const r = (size - 8) / 2, len = 2 * Math.PI * r;
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 600 }); }, [value]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - k.value) }));
  return <View accessibilityRole="progressbar" accessibilityLabel={`${label}${sub ? ` ${sub}` : ""}`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={tone.primaryContainer} strokeWidth={6} fill="none" />
      <ACircle cx={size / 2} cy={size / 2} r={r} stroke={c.accent} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={len} animatedProps={props} />
    </Svg>
    <Text style={{ fontSize: Math.max(11, size * 0.2), fontWeight: "700", color: c.ink }}>{label}</Text>
    {sub ? <Text style={{ fontSize: 9, color: c.s500, marginTop: -1 }}>{sub}</Text> : null}
  </View>;
}

/** M3 primary tabs: equal-width, an indicator that slides under the active one; the content crossfades (150ms) via <TabPane>. */
export function Segmented<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  const [w, setW] = useState(0);
  const i = Math.max(0, tabs.findIndex((x) => x.key === value));
  const x = useSharedValue(0);
  const seg = w / tabs.length;
  useEffect(() => { x.value = withSpring(i * seg, motion.spring); }, [i, seg]);
  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <View accessibilityRole="tablist" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.s300, marginTop: 14 }}>
    {tabs.map((t) => <Pressable key={t.key} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: t.key === value }} style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center" }}>
      <Text numberOfLines={1} style={{ ...scale.label, color: t.key === value ? c.ink : c.s500 }}>{t.label}{t.count ? <Text style={{ fontWeight: "500" }}>{`  ${t.count}`}</Text> : null}</Text></Pressable>)}
    {w ? <Animated.View pointerEvents="none" style={[{ position: "absolute", bottom: -1, left: 0, width: seg, alignItems: "center" }, bar]}><View style={{ width: Math.min(seg - 24, 56), height: 3, borderRadius: 2, backgroundColor: c.accent }} /></Animated.View> : null}
  </View>;
}
export const TabPane = ({ id, children }: { id: string; children: ReactNode }) => <Animated.View key={id} entering={FadeIn.duration(motion.tab)}>{children}</Animated.View>;

/** A horizontal row of cards that runs to the screen edges (the page has 18 side margins). */
export const Carousel = ({ children }: { children: ReactNode }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 12, paddingVertical: 4 }}>{children}</ScrollView>
);
/** An actionable card: raised 1dp, scales on press. */
export function Card({ children, onPress, w = 248, style, label }: { children: ReactNode; onPress?: () => void; w?: number; style?: ViewStyle; label?: string }) {
  const pr = usePress();
  const body = <Animated.View style={[{ width: w, minHeight: 112, backgroundColor: c.white, borderRadius: radius.panel, padding: 16, boxShadow: "0px 1px 3px rgba(15,23,42,0.12)", elevation: 1 }, style, onPress ? pr.style : null]}>{children}</Animated.View>;
  return onPress ? <Pressable onPress={onPress} onPressIn={pr.onPressIn} onPressOut={pr.onPressOut} accessibilityRole="button" accessibilityLabel={label}>{body}</Pressable> : body;
}
/** A small state chip: open = primary container, done = secondary, late = error container (§2.2). */
export function StateChip({ kind, children }: { kind: "open" | "done" | "late"; children: ReactNode }) {
  const s = { open: [tone.primaryContainer, tone.onPrimaryContainer], done: [tone.secondaryContainer, tone.onSecondaryContainer], late: [tone.errorContainer, tone.onErrorContainer] }[kind];
  return <View style={{ alignSelf: "flex-start", height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: s[0], justifyContent: "center" }}><Text style={{ fontSize: 12, fontWeight: "700", color: s[1] }}>{children}</Text></View>;
}
/**
 * A sticky action bar for pushed screens (the task page): the state's one or two actions stay at the thumb while the
 * page scrolls. Pass as Screen's `bottom`, which also lifts Bayani above it.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  const inset = useSafeAreaInsets();
  return <Animated.View entering={FadeIn.duration(motion.fade)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: tone.surfaceHigh, paddingBottom: inset.bottom + 10, paddingHorizontal: 18, paddingTop: 2, boxShadow: "0px -2px 8px rgba(15,23,42,0.08)", elevation: 8 }}>
    <View style={{ maxWidth: 520, width: "100%", alignSelf: "center" }}>{children}</View>
  </Animated.View>;
}

/**
 * A row you can swipe (the Inbox): right to say yes, left to say no. A light haptic when it passes the threshold, a
 * colour and label behind it, and it springs back if you let go early. The caller removes it from the list on success,
 * and the exit (fade + the others sliding up) is the list's layout animation.
 */
export function SwipeRow({ children, onYes, onNo, yesLabel = "Yes", noLabel = "No" }: { children: ReactNode; onYes?: () => void; onNo?: () => void; yesLabel?: string; noLabel?: string }) {
  const x = useSharedValue(0);
  const passed = useSharedValue(false);
  const { width } = useWindowDimensions();
  const T = 96;
  const buzz = () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); };
  const pan = Gesture.Pan().enabled(!!(onYes || onNo)).activeOffsetX([-16, 16]).failOffsetY([-12, 12])
    .onUpdate((e) => {
      const dx = e.translationX > 0 ? (onYes ? e.translationX : 0) : (onNo ? e.translationX : 0);
      x.value = dx;
      const p = Math.abs(dx) > T;
      if (p !== passed.value) { passed.value = p; if (p) scheduleOnRN(buzz); }
    })
    .onEnd(() => {
      const dx = x.value;
      x.value = withSpring(0, motion.spring);
      if (dx > T && onYes) scheduleOnRN(onYes); else if (dx < -T && onNo) scheduleOnRN(onNo);
      passed.value = false;
    });
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const yes = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, T], [0, 1], "clamp") }));
  const no = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-T, 0], [1, 0], "clamp") }));
  return <Animated.View exiting={FadeOut.duration(motion.fade)} layout={listLayout} style={{ overflow: "hidden" }}>
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 4, bottom: 4, left: 0, right: 0, borderRadius: radius.inner, backgroundColor: tone.primaryContainer, justifyContent: "center", paddingLeft: 16 }, yes]}>
      <Text style={{ fontWeight: "700", color: tone.onPrimaryContainer }}>{yesLabel}</Text></Animated.View>
    <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 4, bottom: 4, left: 0, right: 0, borderRadius: radius.inner, backgroundColor: tone.secondaryContainer, justifyContent: "center", alignItems: "flex-end", paddingRight: 16 }, no]}>
      <Text style={{ fontWeight: "700", color: tone.onSecondaryContainer }}>{noLabel}</Text></Animated.View>
    <GestureDetector gesture={pan}><Animated.View style={[{ backgroundColor: c.white, maxWidth: width }, slide]}>{children}</Animated.View></GestureDetector>
  </Animated.View>;
}

/** One entry of a vertical timeline: a dot on a line, the content beside it. `spark` marks Bayani's own entries. */
export function TimelineItem({ icon, last, children }: { icon?: ReactNode; last?: boolean; children: ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 12 }}>
    <View style={{ alignItems: "center", width: 30 }}>
      {icon ?? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent, marginTop: 14 }} />}
      {last ? null : <View style={{ flex: 1, width: 2, marginTop: 4, backgroundColor: tone.primaryContainer }} />}
    </View>
    <View style={{ flex: 1, paddingVertical: 10 }}>{children}</View>
  </View>;
}

/** A number that rolls to its new value (about 450 ms, ease-out) instead of jumping; the first draw also counts up from 0. */
export function Count({ value, suffix = "", style }: { value: number; suffix?: string; style?: object }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const a = from.current, b = value, t0 = Date.now(), D = 450;
    if (a === b) { setShown(b); return; }
    let raf = 0;
    const tick = () => { const k = Math.min(1, (Date.now() - t0) / D); const e = 1 - Math.pow(1 - k, 3); const v = Math.round(a + (b - a) * e); from.current = v; setShown(v); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style} accessibilityLabel={`${value}${suffix}`}>{`${shown}${suffix}`}</Text>;
}

/** Anything tappable that isn't a Row or Card (a photo tile): scales on press like everything else. */
export function PressScale({ children, onPress, label, style }: { children: ReactNode; onPress: () => void; label?: string; style?: ViewStyle }) {
  const pr = usePress();
  return <Pressable onPress={onPress} onPressIn={pr.onPressIn} onPressOut={pr.onPressOut} accessibilityRole="button" accessibilityLabel={label}><Animated.View style={[style, pr.style]}>{children}</Animated.View></Pressable>;
}

/**
 * The shared element between an event card on Home and its project page: the cover flies from one to the other
 * (Reanimated shared transition, native only; needs the ENABLE_SHARED_ELEMENT_TRANSITIONS flag in package.json and a
 * native rebuild). On web it is a plain View. Use the same `id` on both screens.
 */
export function SharedCover({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  return <Animated.View {...(Platform.OS === "web" ? {} : { sharedTransitionTag: `cover-${id}` })} style={style}>{children}</Animated.View>;
}

/** A grid of faces with first names (and a one-word role when known): who is on a team or in a group at a glance. The roster list stays for the detail. */
export function FaceGrid({ people, onPress, max = 12 }: { people: { name: string; photo?: { hash?: string } | null; role?: string; key?: string }[]; onPress?: (i: number) => void; max?: number }) {
  const shown = people.slice(0, max), more = people.length - shown.length;
  return <Animated.View layout={listLayout} style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14, backgroundColor: c.white, borderRadius: radius.panel, paddingVertical: 16, paddingHorizontal: 8 }}>
    {shown.map((p, i) => <Animated.View key={p.key ?? p.name + i} entering={FadeIn.duration(motion.fade).delay(Math.min(i, 8) * 30)} style={{ width: "25%", alignItems: "center" }}>
      <PressScale onPress={() => onPress?.(i)} label={p.name} style={{ alignItems: "center" }}>
        <Avatar name={p.name} size={56} photo={p.photo} />
        <Text numberOfLines={1} style={{ ...scale.label, color: c.ink, marginTop: 6, maxWidth: 72 }}>{p.name.split(" ")[0]}</Text>
        {p.role ? <Text numberOfLines={1} style={{ fontSize: 12, color: c.s500, maxWidth: 72 }}>{p.role}</Text> : null}
      </PressScale></Animated.View>)}
    {more > 0 ? <View style={{ width: "25%", alignItems: "center", justifyContent: "center" }}><Text style={{ ...scale.label, color: c.s500 }}>{`+${more}`}</Text></View> : null}
  </Animated.View>;
}
