import { createElement, useEffect, useEffectEvent, useRef, useState, type ComponentRef } from "react";
import { Alert, Image, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { fileText, fileUri, kindOf, openOutside, shareFile, webPreviewUrl, type Attachment } from "@/lib/files";
import { FileBadge, kb } from "./Files";
import { Icon } from "./Icon";
import { useSnackbar } from "./Snackbar";
import { c, radius } from "./theme";

/*
 * A file, opened (UI_REIMAGINE §7.2g). Full screen, dark, like a phone's own photo viewer:
 * - images: pinch or double-tap to zoom, drag when zoomed, swipe to the next file;
 * - text: shown as text; PDFs on the web: the browser's own viewer, inline;
 * - Word, Excel, slides, PDFs on a phone, anything else: a clear card, and "Open in another app" (Android "Open with",
 *   iPhone's preview and "Open in…"), where they're read properly.
 * Every file: Share (the file itself) and, when you may, Remove. "2 of 5" and swiping go through the page's files.
 */
/** Mount it when a file is opened (`index`), unmount on close: it starts on that file. */
export function FileViewer({ items, index, onClose, onRemove }: { items: Attachment[]; index: number; onClose: () => void; onRemove?: (a: Attachment) => void }) {
  const { width } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const [at, setAt] = useState(index);
  const [zoomed, setZoomed] = useState(false);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const { show } = useSnackbar();
  const a = items[at];
  const go = (i: number) => { const n = Math.max(0, Math.min(items.length - 1, i)); setAt(n); setZoomed(false); scroller.current?.scrollTo({ x: n * width, animated: true }); };
  const act = (f: () => Promise<void>) => f().catch((e) => show(e instanceof Error ? e.message : "That didn't work. Try again.", { error: true }));
  const remove = () => {
    if (!a || !onRemove) return;
    const done = () => { onRemove(a); onClose(); };
    if (Platform.OS === "web") return done();
    Alert.alert("Remove this file?", "It's taken off this page. The page's history still shows it was here.", [{ text: "Keep it", style: "cancel" }, { text: "Remove", style: "destructive", onPress: done }]);
  };
  const outside = a && kindOf(a) !== "image";
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0B0B0F" }}>
      <ScrollView ref={scroller} horizontal pagingEnabled contentOffset={{ x: index * width, y: 0 }} onLayout={() => scroller.current?.scrollTo({ x: at * width, animated: false })} scrollEnabled={!zoomed && items.length > 1} showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / width); if (i !== at) { setAt(i); setZoomed(false); } }}
        onScroll={Platform.OS === "web" ? (e) => { const i = Math.round(e.nativeEvent.contentOffset.x / width); if (i !== at) setAt(i); } : undefined} scrollEventThrottle={64}>
        {items.map((x, i) => <View key={x.hash} style={{ width, flex: 1, paddingTop: inset.top + 56, paddingBottom: inset.bottom + 88 }}>
          {Math.abs(i - at) <= 1 ? <Page a={x} active={i === at} zoomed={zoomed && i === at} onZoom={setZoomed} onOpen={() => act(() => openOutside(x))} /> : null}
        </View>)}
      </ScrollView>

      {/* Top: close, "2 of 5", the name. */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: inset.top + 6, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontSize: 28, lineHeight: 30 }}>×</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{a?.title ?? (a && kindOf(a) === "image" ? "Photo" : "File")}</Text>
          <Text style={{ color: "rgba(255,255,255,.65)", fontSize: 12.5 }}>{[items.length > 1 ? `${at + 1} of ${items.length}` : null, a ? kb(a.size) : null, a?.capturedAt ? new Date(a.capturedAt).toLocaleDateString() : null, a?.showsMinors ? "Shows children · stays in the group" : null].filter(Boolean).join(" · ")}</Text>
        </View>
      </View>
      {/* Wide screens and the web: arrows as well as swiping. */}
      {items.length > 1 && width > 700 ? <>
        {at > 0 ? <Arrow side="left" onPress={() => go(at - 1)} /> : null}
        {at < items.length - 1 ? <Arrow side="right" onPress={() => go(at + 1)} /> : null}
      </> : null}

      {/* Bottom: what you can do with it. */}
      {a ? <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: inset.bottom + 14, paddingTop: 10, paddingHorizontal: 16, flexDirection: "row", gap: 10, justifyContent: "center" }}>
        {outside ? <Btn primary icon="external" label={width > 420 ? (Platform.OS === "web" ? "Open in a new tab" : "Open in another app") : "Open"} onPress={() => act(() => openOutside(a))} /> : null}
        <Btn icon="share" label={Platform.OS === "web" && !outside ? "Save" : "Share"} onPress={() => act(() => shareFile(a))} />
        {onRemove ? <Btn icon="trash" label="Remove" iconOnly onPress={remove} /> : null}
      </View> : null}
    </GestureHandlerRootView>
  </Modal>;
}

function Btn({ label, icon, onPress, primary, iconOnly }: { label: string; icon: "external" | "share" | "trash"; onPress: () => void; primary?: boolean; iconOnly?: boolean }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, minWidth: 48, paddingHorizontal: iconOnly ? 0 : 18, borderRadius: radius.pill, backgroundColor: primary ? c.accent : pressed ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.12)" })}>
    <Icon name={icon} size={18} color="#fff" />{iconOnly ? null : <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{label}</Text>}</Pressable>;
}
const Arrow = ({ side, onPress }: { side: "left" | "right"; onPress: () => void }) => <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={side === "left" ? "Previous" : "Next"}
  style={{ position: "absolute", top: "50%", [side]: 12, width: 48, height: 48, marginTop: -24, borderRadius: 24, backgroundColor: "rgba(255,255,255,.14)", alignItems: "center", justifyContent: "center" }}>
  <View style={{ transform: [{ rotate: side === "left" ? "180deg" : "0deg" }] }}><Icon name="chevron" size={20} color="#fff" /></View></Pressable>;

/** One file's page: what the app can show, or a card that says where it opens. */
function Page({ a, active, zoomed, onZoom, onOpen }: { a: Attachment; active: boolean; zoomed: boolean; onZoom: (z: boolean) => void; onOpen: () => void }) {
  const k = kindOf(a);
  const [src, setSrc] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // Loads again only when the file itself changes (its hash), not when the same file's record is re-read.
  const load = useEffectEvent((on: () => boolean) => {
    const fail = () => { if (on()) setFailed(true); };
    if (k === "image") fileUri(a).then((u) => { if (on()) setSrc(u); }).catch(fail);
    else if (k === "text") fileText(a).then((x) => { if (on()) setText(x); }).catch(fail);
    else if (k === "pdf" && Platform.OS === "web") webPreviewUrl(a).then((u) => { if (on()) setSrc(u); }).catch(fail);
  });
  useEffect(() => {
    let on = true;
    load(() => on);
    return () => { on = false; };
  }, [a.hash, k]);
  if (failed) return <DocCard a={a} note="This file didn't load. Check your connection, or open it in another app." onOpen={onOpen} />;
  if (k === "image") return src ? <Zoomable uri={src} active={active} zoomed={zoomed} onZoom={onZoom} /> : <Loading />;
  if (k === "text") return text === null ? <Loading /> : <ScrollView style={{ flex: 1, marginHorizontal: 12, borderRadius: 16, backgroundColor: c.white }} contentContainerStyle={{ padding: 16 }}>
    <Text selectable style={{ fontSize: 14, lineHeight: 20, color: c.ink, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>{text || "(This file is empty.)"}</Text></ScrollView>;
  // The browser renders a PDF itself; react-native-web passes a DOM element through.
  if (k === "pdf" && Platform.OS === "web") return src ? <View style={{ flex: 1, marginHorizontal: 12, borderRadius: 16, overflow: "hidden", backgroundColor: c.white }}>
    {createElement("iframe", { src, title: a.title ?? "PDF", style: { border: 0, width: "100%", height: "100%" } })}</View> : <Loading />;
  return <DocCard a={a} onOpen={onOpen} note={k === "pdf" ? "Opens in your phone's PDF viewer, where you can read every page."
    : Platform.OS === "web" ? "Downloads it, so you can open it in Word, Excel, Docs or Sheets and see it the way it was made."
    : "Opens in the app that reads it (Word, Excel, Docs, Sheets…), so it looks the way it was made."} />;
}

const Loading = () => <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "rgba(255,255,255,.6)" }}>Loading…</Text></View>;

function DocCard({ a, note, onOpen }: { a: Attachment; note: string; onOpen: () => void }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${a.title ?? "the file"} in another app`}
      style={{ width: "100%", maxWidth: 360, borderRadius: 24, backgroundColor: c.white, padding: 24, alignItems: "center" }}>
      <FileBadge a={a} size={72} />
      <Text numberOfLines={3} style={{ fontSize: 17, fontWeight: "700", color: c.ink, textAlign: "center", marginTop: 14 }}>{a.title ?? "File"}</Text>
      <Text style={{ fontSize: 13, color: c.s500, marginTop: 4 }}>{kb(a.size)}</Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: c.ink, textAlign: "center", marginTop: 14 }}>{note}</Text>
    </Pressable>
  </View>;
}

/** An image you can pinch, double-tap and drag when zoomed (Reanimated + gesture-handler, on the UI thread). */
function Zoomable({ uri, active, zoomed, onZoom }: { uri: string; active: boolean; zoomed: boolean; onZoom: (z: boolean) => void }) {
  const scale = useSharedValue(1), base = useSharedValue(1), x = useSharedValue(0), y = useSharedValue(0), sx = useSharedValue(0), sy = useSharedValue(0);
  useEffect(() => { if (!active) { scale.set(withTiming(1)); base.set(1); x.set(withTiming(0)); y.set(withTiming(0)); } }, [active, scale, base, x, y]);
  const settle = (s: number) => { "worklet"; scheduleOnRN(onZoom, s > 1.01); };
  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.set(Math.max(1, Math.min(5, base.get() * e.scale))); })
    .onEnd(() => { const z = scale.get(); base.set(z); if (z <= 1.01) { x.set(withTiming(0)); y.set(withTiming(0)); } settle(z); });
  // Dragging only while zoomed; otherwise a swipe goes to the pager (the next file).
  const pan = Gesture.Pan().enabled(zoomed).averageTouches(true)
    .onBegin(() => { sx.set(x.get()); sy.set(y.get()); })
    .onUpdate((e) => { if (scale.get() > 1.01) { x.set(sx.get() + e.translationX); y.set(sy.get() + e.translationY); } });
  const twice = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    const to = scale.get() > 1.01 ? 1 : 2.5;
    scale.set(withTiming(to)); base.set(to); if (to === 1) { x.set(withTiming(0)); y.set(withTiming(0)); }
    settle(to);
  });
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));
  const g = Gesture.Exclusive(twice, Gesture.Simultaneous(pinch, pan));
  return <GestureDetector gesture={g}>
    <Animated.View style={[{ flex: 1 }, st]}><Image source={{ uri }} resizeMode="contain" style={{ flex: 1 }} accessibilityIgnoresInvertColors /></Animated.View>
  </GestureDetector>;
}
