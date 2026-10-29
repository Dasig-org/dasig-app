import { type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Icon, type IconName } from "./Icon";
import { SyncBar } from "./SyncBar";
import { avatarColors, c, radius, type } from "./theme";

/** A screen on the wash, phone-first, with an optional fixed bottom bar. */
export function Screen({ children, bottom, back }: { children: ReactNode; bottom?: ReactNode; back?: boolean }) {
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.wash }}>
      <ScrollView contentContainerStyle={{ paddingTop: inset.top + 12, paddingHorizontal: 18, paddingBottom: 120, maxWidth: 520, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        <SyncBar />
        {back && <RoundButton icon="back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={{ marginBottom: 14 }} label="Back" />}
        {children}
      </ScrollView>
      {bottom}
    </View>
  );
}
export const Title = ({ children, sub }: { children: ReactNode; sub?: ReactNode }) => (
  <View style={{ marginBottom: 14 }}><Text style={type.title}>{children}</Text>{sub ? <Text style={[type.body, { marginTop: 4 }]}>{sub}</Text> : null}</View>
);
export const Eyebrow = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 20, marginBottom: 8, marginHorizontal: 4 }}>
    <Text style={type.eyebrow}>{children}</Text>{right ? <Text style={{ fontSize: 12.5, fontWeight: "600", color: c.s500 }}>{right}</Text> : null}
  </View>
);
export const Panel = ({ children, style }: { children: ReactNode; style?: ViewStyle }) => (
  <View style={[{ backgroundColor: c.white, borderRadius: radius.field, paddingHorizontal: 16, paddingVertical: 4 }, style]}>{children}</View>
);
export const Hero = ({ children }: { children: ReactNode }) => <View style={{ backgroundColor: c.white, borderRadius: radius.hero, padding: 18 }}>{children}</View>;
export const Meta = ({ children }: { children: ReactNode }) => <Text style={type.meta}>{children}</Text>;
export const Body = ({ children }: { children: ReactNode }) => <Text style={type.body}>{children}</Text>;

export function IconCircle({ name, size = 40, tone = "sand" }: { name: IconName; size?: number; tone?: "sand" | "white" | "grey" | "bayani" }) {
  const bg = { sand: c.sand, white: c.white, grey: c.wash, bayani: c.accent }[tone];
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
    <Icon name={name} size={size * 0.5} color={tone === "grey" ? c.slate : tone === "bayani" ? c.white : c.accent} />
  </View>;
}
export function Avatar({ name, size = 30, index }: { name: string; size?: number; index?: number }) {
  const i = index ?? [...name].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const bg = avatarColors[i % avatarColors.length]!;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.white }}>
    <Text style={{ color: bg === c.gold ? c.ink : c.white, fontWeight: "700", fontSize: size * 0.4 }}>{(name[0] ?? "?").toUpperCase()}</Text>
  </View>;
}
export const Faces = ({ names }: { names: string[] }) => (
  <View style={{ flexDirection: "row" }}>{names.slice(0, 5).map((n, i) => <View key={i} style={{ marginLeft: i ? -7 : 0 }}><Avatar name={n} size={24} /></View>)}</View>
);

export function Row({ left, title, meta, right, onPress, last }: { left?: ReactNode; title: string; meta?: string; right?: ReactNode; onPress?: () => void; last?: boolean }) {
  const style = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingVertical: 13, minHeight: 56, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.s200 };
  const body = <>
    {left}
    <View style={{ flex: 1 }}><Text style={type.row}>{title}</Text>{meta ? <Text style={[type.meta, { marginTop: 2 }]}>{meta}</Text> : null}</View>
    {right ?? (onPress ? <Icon name="chevron" size={18} color={c.s300} /> : null)}
  </>;
  // A row without its own action must not be a (disabled) button: that would mark buttons inside it as disabled for screen readers.
  if (!onPress) return <View style={style}>{body}</View>;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={meta ? `${title}, ${meta}` : title} style={({ pressed }) => ({ ...style, opacity: pressed ? 0.7 : 1 })}>{body}</Pressable>;
}
export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "state" }) {
  const s = { neutral: { bg: c.wash, fg: c.ink, b: c.wash }, ok: { bg: c.white, fg: c.slate, b: c.s200 }, state: { bg: c.accent, fg: c.white, b: c.accent } }[tone];
  return <View style={{ height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: s.bg, borderWidth: 1.5, borderColor: s.b, justifyContent: "center" }}>
    <Text style={{ fontSize: 12, fontWeight: "600", color: s.fg }}>{children}</Text></View>;
}
export function Primary({ label, onPress, busy, disabled }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={busy || disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!(busy || disabled), busy: !!busy }} style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: radius.pill, backgroundColor: pressed ? c.accent : c.primary, opacity: disabled ? 0.5 : 1, alignItems: "center", justifyContent: "center" })}>
    {busy ? <ActivityIndicator color={c.white} /> : <Text style={{ color: c.white, fontWeight: "700", fontSize: 15 }}>{label}</Text>}
  </Pressable>;
}
export function Outline({ label, onPress, flex }: { label: string; onPress: () => void; flex?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ flex: flex ? 1 : undefined, minHeight: 48, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: c.white, borderWidth: 1.5, borderColor: pressed ? c.ink : c.s300, alignItems: "center", justifyContent: "center" })}>
    <Text style={{ color: c.ink, fontWeight: "600", fontSize: 15 }}>{label}</Text></Pressable>;
}
export const Buttons = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>{children}</View>;
export const LinkText = ({ children, onPress }: { children: ReactNode; onPress: () => void }) => (
  <Text onPress={onPress} accessibilityRole="link" suppressHighlighting style={{ fontSize: 14, fontWeight: "600", color: c.ink, textDecorationLine: "underline", paddingVertical: 6 }}>{children}</Text>
);
export function RoundButton({ icon, onPress, style, label }: { icon: IconName; onPress: () => void; style?: ViewStyle; label: string }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.white, alignItems: "center", justifyContent: "center" }, style]}>
    <Icon name={icon} size={18} color={c.ink} /></Pressable>;
}
export const Field = (p: TextInputProps & { label?: string }) => (
  <View style={{ marginTop: 10 }}>
    {p.label ? <Text style={{ fontSize: 12.5, fontWeight: "600", color: c.s500, marginBottom: 6, marginLeft: 4 }}>{p.label}</Text> : null}
    <TextInput placeholderTextColor={c.s400} {...p} style={[{ backgroundColor: c.white, borderRadius: radius.field, paddingHorizontal: 19, paddingVertical: 15, fontSize: 16, color: c.ink }, p.style]} />
  </View>
);
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
    {options.map((o) => <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: o.value === value }} accessibilityLabel={o.label} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: o.value === value ? c.accent : c.white, justifyContent: "center" }}>
      <Text style={{ fontSize: 13.5, fontWeight: "600", color: o.value === value ? c.white : c.ink }}>{o.label}</Text></Pressable>)}
  </View>;
}
export function Check({ on, onPress }: { on: boolean; onPress?: () => void }) {
  return <Pressable onPress={onPress} disabled={!onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} hitSlop={12} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: on ? c.accent : c.white, borderWidth: on ? 0 : 1.5, borderColor: c.s300, alignItems: "center", justifyContent: "center" }}>
    {on ? <Icon name="check" size={14} color={c.white} /> : null}</Pressable>;
}
export function Sand({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: c.sand, borderRadius: radius.tile, padding: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>{children}</View>;
}
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,23,42,.35)" }} />
    <View style={{ backgroundColor: c.white, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: 20, paddingBottom: 34, maxWidth: 520, width: "100%", alignSelf: "center" }}>
      <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.s300, alignSelf: "center", marginBottom: 16 }} />{children}
    </View>
  </Modal>;
}
export const Loading = () => <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.wash }}><ActivityIndicator color={c.accent} /></View>;
export const Notice = ({ children }: { children: ReactNode }) => <Text role="alert" style={{ fontSize: 13, fontWeight: "600", color: c.ink, marginTop: 8, marginHorizontal: 4 }}>{children}</Text>;

/** Bottom navigation. Volunteers: Today · Groups · Nearby · Your story. Coordinators: This week · Plan · People · Nearby. */
export function Nav({ active }: { active: string }) {
  const inset = useSafeAreaInsets();
  const { useSession } = require("@/lib/session") as typeof import("@/lib/session");
  const s = useSession();
  const lead = !!s.current && s.groups.some((g) => g.org.id === s.current!.id && ["officer", "core-member"].includes(g.role.code?.code));
  const items: { k: string; label: string; icon: IconName; to: string }[] = lead
    ? [{ k: "home", label: "This week", icon: "cal", to: "/home" }, { k: "plan", label: "Plan", icon: "flag", to: "/projects" }, { k: "people", label: "People", icon: "users", to: `/org/${s.current!.id}/people` }, { k: "nearby", label: "Nearby", icon: "pin", to: "/nearby" }]
    : [{ k: "home", label: "Today", icon: "check", to: "/home" }, { k: "groups", label: "Groups", icon: "users", to: "/groups" }, { k: "nearby", label: "Nearby", icon: "pin", to: "/nearby" }, { k: "story", label: "Your story", icon: "heart", to: "/story" }];
  return <View accessibilityRole="tablist" style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.white, paddingBottom: inset.bottom + 8, paddingTop: 10, flexDirection: "row", justifyContent: "space-around" }}>
    {items.map((i) => <Pressable key={i.k} onPress={() => router.replace(i.to as never)} accessibilityRole="tab" accessibilityState={{ selected: i.k === active }} accessibilityLabel={i.label} style={{ alignItems: "center", gap: 4, minWidth: 64, minHeight: 44 }}>
      <Icon name={i.icon} size={22} color={i.k === active ? c.accent : c.s400} />
      <Text style={{ fontSize: 11.5, fontWeight: "600", color: i.k === active ? c.accent : c.s400 }}>{i.label}</Text></Pressable>)}
  </View>;
}

/** A first-time tip (guides). Dismissed once, remembered. */
export function Tip({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const { useEffect, useState } = require("react") as typeof import("react");
  const AsyncStorage = (require("@react-native-async-storage/async-storage") as { default: { getItem(k: string): Promise<string | null>; setItem(k: string, v: string): Promise<void> } }).default;
  const [show, setShow] = useState(false);
  useEffect(() => { AsyncStorage.getItem(`dasig.tip.${id}`).then((v) => setShow(!v)); }, [id]);
  if (!show) return null;
  return <View accessibilityRole="summary" style={{ backgroundColor: c.sand, borderRadius: radius.tile, padding: 14, marginTop: 12, flexDirection: "row", gap: 12 }}>
    <IconCircle name="spark" size={34} tone="white" />
    <View style={{ flex: 1 }}><Text style={type.row}>{title}</Text><Text style={[type.body, { marginTop: 2 }]}>{children}</Text>
      <Text onPress={() => { AsyncStorage.setItem(`dasig.tip.${id}`, "1"); setShow(false); }} accessibilityRole="button" style={{ marginTop: 8, fontWeight: "600", color: c.ink, textDecorationLine: "underline" }}>Got it</Text></View>
  </View>;
}
/** The Dasig mark (the hands emblem, as on dasig.org), used on boot, welcome and the app bar. */
export function Mark({ size = 72 }: { size?: number }) {
  const { Image } = require("react-native") as typeof import("react-native");
  return <Image source={require("../../assets/brand/emblem.png")} accessibilityLabel="Dasig" style={{ width: size, height: size }} />;
}
