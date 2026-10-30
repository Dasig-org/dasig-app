/**
 * First open: four beats on one stage, ported from the Dasig Fundraising app's `app/boot.tsx`.
 * The emblem draws itself, then the illustrated props move with the swipe, so the eye
 * follows one continuous scene while the message changes. (The fundraising app's Dax is a carabao,
 * which Dasig no longer uses, so he is left out here.) Every stage value is interpolated from
 * the pager's scroll offset (native driver), and `index` only updates once a page settles, so the
 * screen never re-renders mid-swipe. With Reduce Motion on, the emblem appears without drawing and
 * the decorative zoom and rise are dropped.
 *
 * The stage ground is an SVG path with rounded bottom corners rather than a clipped gradient view:
 * Android does not clip a native SVG child to its parent's borderRadius, and this needs no extra
 * native module.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, type ScrollViewInstance, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { EMBLEM_COLOR, EMBLEM_PATH } from "./Emblem";
import { CommunityScene, k, PROP_LAYOUT, RecordScene, TeamsScene } from "./scenes";
import { useMockupScale } from "./scale";

const COPY_H = 196;
const DASH = 2507;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const CLAMP = "clamp" as const;

const BEATS = [
  { kicker: "Dasig", h2: "Your group, organized", body: "Projects, teams and who's doing what, on everyone's phone." },
  { kicker: "Teams first", h2: "Everyone knows what's theirs", body: "Leads hand out the work. Volunteers say \u201cI'm in.\u201d Nobody waits for a reply." },
  { kicker: "Done is the record", h2: "The work counts, and it shows", body: "Finished work is signed by your group and kept by everyone who did it." },
  { kicker: "Bayanihan", h2: "Start a group, or lend a hand", body: "Works on one phone, or for a whole group with no internet." },
];
const LAST = BEATS.length - 1;

function useReduceMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    let on = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => on && setR(v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setR);
    return () => { on = false; sub.remove(); };
  }, []);
  return r;
}

export function Intro({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { width: W, height: H, s } = useMockupScale();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const [stage, setStage] = useState({ w: W, h: Math.round(H * 0.52) });

  const pageHeights = useRef<number[]>([]);
  const [copyH, setCopyH] = useState(COPY_H);
  const onPageLayout = useCallback((i: number, e: LayoutChangeEvent) => {
    pageHeights.current[i] = e.nativeEvent.layout.height;
    setCopyH(Math.max(COPY_H, Math.ceil(Math.max(0, ...pageHeights.current.map((h) => h ?? 0)))));
  }, []);

  const draw = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) { draw.setValue(1); return; }
    const a = Animated.timing(draw, { toValue: 1, duration: 1350, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [reduceMotion, draw]);

  const onScroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: true,
    listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x, w = e.nativeEvent.layoutMeasurement.width;
      if (w <= 0) return;
      const i = Math.min(LAST, Math.max(0, Math.round(x / w)));
      if (Math.abs(x - i * w) > 1 || i === indexRef.current) return;
      indexRef.current = i; setIndex(i);
    },
  }), [scrollX]);

  const announced = useRef(false);
  useEffect(() => {
    if (!announced.current) { announced.current = true; return; }
    AccessibilityInfo.announceForAccessibility(`Step ${index + 1} of ${BEATS.length}. ${BEATS[index]!.h2}`);
  }, [index]);

  const leaving = useRef(false);
  const finish = () => { if (leaving.current) return; leaving.current = true; onDone(); };
  const isLast = index === LAST;
  const next = () => (isLast ? finish() : scrollRef.current?.scrollTo({ x: (index + 1) * W, animated: true }));

  const stageH = stage.h;
  const anim = useMemo(() => {
    const beats = BEATS.map((_, i) => i * W);
    const emblemOpacity = scrollX.interpolate({ inputRange: [0, W], outputRange: [1, 0], extrapolate: CLAMP });
    const emblemScale = reduceMotion ? 1 : scrollX.interpolate({ inputRange: [0, W], outputRange: [1, 0.9], extrapolate: CLAMP });
    const arcTY = reduceMotion ? -34 : scrollX.interpolate({ inputRange: beats, outputRange: [-34, 84, -20, -20] });
    const arcScale = reduceMotion ? 1 : scrollX.interpolate({ inputRange: beats, outputRange: [1, 0.92, 0.8, 0.8] });
    const arcOpacity = scrollX.interpolate({ inputRange: beats, outputRange: [1, 1, 0, 0] });
    const prop = (n: number) => {
      const inputRange = [(n - 1) * W, n * W, (n + 1) * W];
      const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: CLAMP });
      if (reduceMotion) return { opacity };
      return { opacity, transform: [
        { translateY: scrollX.interpolate({ inputRange, outputRange: [16, 0, 16], extrapolate: CLAMP }) },
        { scale: scrollX.interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: CLAMP }) }] };
    };
    return {
      emblemOpacity, emblemScale, arcTY, arcScale, arcOpacity,
      props: [prop(1), prop(2), prop(3)],
      drawFill: draw.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 0, 1] }),
      drawOffset: draw.interpolate({ inputRange: [0, 1], outputRange: [DASH, 0] }),
      drawStroke: draw.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
    };
  }, [scrollX, draw, W, s, stageH, reduceMotion]);

  const fit = (l: { top: number; height: number }) => Math.min(1, stageH / s(l.top + l.height));
  const frame = (l: { top: number; height: number }) => [st.prop, { top: s(l.top) }, fit(l) < 1 && { transform: [{ scale: fit(l) }], transformOrigin: "top" as const }];
  const R = 44, { w: sw, h: sh } = stage;
  const ground = `M0 0 H${sw} V${sh - R} Q${sw} ${sh} ${sw - R} ${sh} H${R} Q0 ${sh} 0 ${sh - R} Z`;

  return (
    <View style={st.screen}>
      <View style={st.stage} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        onLayout={(e) => setStage({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}>
        <Svg width={sw} height={sh} style={StyleSheet.absoluteFill}>
          <Defs><LinearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={k.stageTop} /><Stop offset="0.56" stopColor={k.stageMid} /><Stop offset="1" stopColor={k.stageBottom} />
          </LinearGradient></Defs>
          <Path d={ground} fill="url(#g)" />
        </Svg>
        <Animated.View style={[st.arc, { opacity: anim.arcOpacity, transform: [{ translateY: anim.arcTY }, { scale: anim.arcScale }] }]}>
          <Svg width={560} height={560} viewBox="0 0 560 560">
            <Circle cx={280} cy={280} r={279} stroke="rgba(244,124,38,0.20)" strokeWidth={1.5} fill="none" />
            <Circle cx={280} cy={280} r={194} stroke="rgba(244,124,38,0.15)" strokeWidth={1} fill="none" />
            <Circle cx={280} cy={280} r={102} stroke="rgba(244,124,38,0.20)" strokeWidth={1} strokeDasharray="4 6" fill="none" />
          </Svg>
        </Animated.View>
        <View style={frame(PROP_LAYOUT.teams)}><Animated.View style={anim.props[0]}><TeamsScene s={s} /></Animated.View></View>
        <View style={frame(PROP_LAYOUT.record)}><Animated.View style={anim.props[1]}><RecordScene s={s} /></Animated.View></View>
        <View style={frame(PROP_LAYOUT.community)}><Animated.View style={anim.props[2]}><CommunityScene s={s} width={W} /></Animated.View></View>
        <Animated.View style={[st.emblem, { width: s(178), height: s(178), marginLeft: -s(89), marginTop: -s(89) },
          { opacity: anim.emblemOpacity, transform: [{ translateY: anim.arcTY }, { scale: anim.emblemScale }] }]}>
          <Svg width="100%" height="100%" viewBox="0 0 375 375">
            <AnimatedPath d={EMBLEM_PATH} fill={EMBLEM_COLOR} opacity={reduceMotion ? 1 : anim.drawFill} />
            {!reduceMotion && <AnimatedPath d={EMBLEM_PATH} fill="none" stroke={EMBLEM_COLOR} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={DASH} strokeDashoffset={anim.drawOffset} opacity={anim.drawStroke} />}
          </Svg>
        </Animated.View>
      </View>

      {!isLast && <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="Skip introduction" hitSlop={8} style={[st.skip, { top: insets.top + 8 }]}>
        <Text style={st.skipText}>Skip</Text></Pressable>}

      <View style={{ zIndex: 2 }}>
        <View style={{ height: copyH }}>
          <Animated.ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} style={{ flex: 1 }}>
            {BEATS.map((b, i) => (
              <View key={i} style={{ width: W, height: copyH }} accessibilityElementsHidden={i !== index} importantForAccessibility={i === index ? "auto" : "no-hide-descendants"}>
                <View style={st.copy} onLayout={(e) => onPageLayout(i, e)}>
                  <Text style={st.kicker} maxFontSizeMultiplier={1.4}>{b.kicker}</Text>
                  <Text style={st.h2} accessibilityRole="header" maxFontSizeMultiplier={1.4}>{b.h2}</Text>
                  <Text style={st.body} maxFontSizeMultiplier={1.8}>{b.body}</Text>
                </View>
              </View>
            ))}
          </Animated.ScrollView>
        </View>
        <View style={st.rail} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: BEATS.length, now: index + 1, text: `Step ${index + 1} of ${BEATS.length}` }}>
          {BEATS.map((_, i) => <View key={i} style={st.railSeg}><View style={[st.railFill, { width: i <= index ? "100%" : "0%" }]} /></View>)}
        </View>
        <View style={[st.foot, { paddingBottom: insets.bottom + 18 }]}>
          <Pressable onPress={next} accessibilityRole="button" style={({ pressed }) => [st.cta, pressed && { opacity: 0.9 }]} android_ripple={{ color: "rgba(255,255,255,0.25)" }}>
            <Text style={st.ctaText}>{isLast ? "Get started" : "Next"}</Text>
          </Pressable>
        </View>
      </View>

    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: k.wash },
  stage: { flex: 1, overflow: "hidden", borderBottomLeftRadius: 44, borderBottomRightRadius: 44, zIndex: 1 },
  arc: { position: "absolute", left: "50%", top: "50%", width: 560, height: 560, marginLeft: -280, marginTop: -280 },
  emblem: { position: "absolute", left: "50%", top: "50%", zIndex: 3 },
  prop: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 2 },
  skip: { position: "absolute", right: 14, zIndex: 6, backgroundColor: "rgba(15,23,42,0.06)", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 999 },
  skipText: { fontSize: 13, fontWeight: "700", color: k.slate },
  copy: { paddingHorizontal: 28, paddingTop: 22 },
  kicker: { fontSize: 11.5, fontWeight: "700", letterSpacing: 1.7, textTransform: "uppercase", color: k.primary, marginBottom: 13 },
  h2: { fontSize: 27, lineHeight: 34, letterSpacing: -0.5, fontWeight: "900", color: k.ink },
  body: { marginTop: 12, fontSize: 15.5, lineHeight: 24, color: k.slate, maxWidth: 332 },
  rail: { flexDirection: "row", gap: 6, paddingHorizontal: 28, marginBottom: 2 },
  railSeg: { height: 3, flex: 1, borderRadius: 99, backgroundColor: k.s200, overflow: "hidden" },
  railFill: { height: 3, borderRadius: 99, backgroundColor: k.primary },
  foot: { paddingHorizontal: 28, paddingTop: 20 },
  cta: { height: 56, borderRadius: 999, backgroundColor: k.primary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  ctaText: { fontSize: 16, fontWeight: "700", color: k.white },
});
