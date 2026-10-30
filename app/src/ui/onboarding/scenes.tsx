/**
 * The illustrated props on the welcome stage (beats 2–4). Ported from the Dasig Fundraising app's
 * `src/components/onboarding/scenes.tsx` and retold for groups: teams, a finished task that is
 * signed, and a group gathered around one project. Pure drawings; `start.tsx` animates them.
 * Every size is the mockup pixel value passed through `s()` (see `scale.ts`).
 */
import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Icon, type IconName } from "../Icon";
import { Emblem } from "./Emblem";
import type { Scale } from "./scale";

export const k = {
  primary: "#F47C26", ink: "#0F172A", slate: "#475569", white: "#FFFFFF", wash: "#f1f5f9",
  s100: "#f1f5f9", s200: "#e2e8f0", s300: "#cbd5e1", sand: "#FFF6E9", orange50: "#FFF1E6",
  stageTop: "#FFF7EC", stageMid: "#FDEFDD", stageBottom: "#FBE7CC", warmShadow: "rgba(60,40,20,1)",
};

const AV = [
  require("../../../assets/avatars/1.png"), require("../../../assets/avatars/2.png"), require("../../../assets/avatars/3.png"),
  require("../../../assets/avatars/4.png"), require("../../../assets/avatars/5.png"), require("../../../assets/avatars/6.png"),
  require("../../../assets/avatars/7.png"),
];

export const PROP_LAYOUT = {
  teams: { top: 40, height: 346 },
  record: { top: 46, height: 352 },
  community: { top: 20, height: 388 },
} as const;

const TEAMS: { icon: IconName; faces: number[]; lead: boolean }[] = [
  { icon: "mega", faces: [0, 1], lead: true },
  { icon: "building", faces: [2], lead: true },
  { icon: "palette", faces: [3, 4, 5], lead: true },
  { icon: "mic", faces: [], lead: false },
  { icon: "users", faces: [6, 0], lead: true },
  { icon: "video", faces: [1], lead: true },
];

/* ─── Beat 2 · Teams ─── */
export function TeamsScene({ s }: { s: Scale }) {
  const st = useMemo(() => teamsStyles(s), [s]);
  return (
    <View style={st.shot}>
      <View style={st.bar}>
        <View style={st.mark}><Emblem size={s(20)} /></View>
        <Text style={st.barText}>Teams</Text>
      </View>
      <View style={{ paddingTop: s(5) }}>
        {TEAMS.map((r, i) => (
          <View key={i} style={[st.row, i === TEAMS.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={st.tile}><Icon name={r.icon} size={s(17)} color={k.primary} /></View>
            <View style={{ flex: 1 }}><View style={st.line1} /><View style={st.line2} /></View>
            {r.faces.length ? <View style={{ flexDirection: "row" }}>{r.faces.map((f, j) => <Image key={j} source={AV[f]} style={[st.face, j > 0 && { marginLeft: -s(8) }]} />)}</View>
              : <View style={st.need} />}
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── Beat 3 · Done is the record ─── */
export function RecordScene({ s }: { s: Scale }) {
  const st = useMemo(() => recordStyles(s), [s]);
  return (
    <View style={st.shot}>
      <View style={[st.cover, { backgroundColor: k.sand, alignItems: "center", justifyContent: "center" }]}>
        <Emblem size={s(58)} />
      </View>
      <View style={st.body}>
        <View style={st.progress}><View style={st.progressFill} /></View>
        <View style={st.top}>
          <Text style={st.topText}>Smaller steps</Text>
          <View style={st.lock}><Icon name="lock" size={s(12)} color={k.primary} /></View>
        </View>
        {[true, true, false].map((done, r) => (
          <View key={r} style={[st.stepRow, r === 2 && { borderBottomWidth: 0 }]}>
            <View style={[st.check, done ? st.checkOn : null]}>{done ? <Svg width={s(12)} height={s(12)} viewBox="0 0 24 24"><Path d="M5 13l4 4L19 7" stroke={k.white} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}</View>
            <View style={{ flex: 1 }}><View style={[st.rl1, done && { backgroundColor: k.s300 }]} /><View style={st.rl2} /></View>
            <Image source={AV[r + 3]} style={st.face} />
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── Beat 4 · a group around one project ─── */
const FACES: { img: number; left?: number; right?: number; top: number }[] = [
  { img: 0, left: 25, top: 62 }, { img: 1, right: 24, top: 76 }, { img: 2, left: 12, top: 204 },
  { img: 3, right: 11, top: 218 }, { img: 4, left: 72, top: 330 }, { img: 5, right: 69, top: 334 },
];
export function CommunityScene({ s, width }: { s: Scale; width: number }) {
  const st = useMemo(() => communityStyles(s, width), [s, width]);
  return (
    <View style={st.scene}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Path d={`M ${s(52)} ${s(86)} C ${s(16)} ${s(205)} ${s(52)} ${s(300)} ${s(120)} ${s(332)}`} stroke="rgba(244,124,38,0.2)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        <Path d={`M ${width - s(52)} ${s(96)} C ${width - s(16)} ${s(207)} ${width - s(52)} ${s(302)} ${width - s(120)} ${s(334)}`} stroke="rgba(244,124,38,0.2)" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      </Svg>
      <View style={st.card}>
        <View style={st.cover}>
          <Image source={AV[6]} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={st.scrim} />
          <View style={st.ghost}><View style={st.ghost1} /><View style={st.ghost2} /></View>
        </View>
        <View style={{ paddingHorizontal: s(16), paddingTop: s(15) }}>
          <View style={st.line} /><View style={st.lineShort} />
          <View style={st.prog}><View style={st.progFill} /></View>
          <View style={{ flexDirection: "row", marginTop: s(16), paddingLeft: s(3) }}>
            {[1, 2, 3].map((n, i) => <Image key={n} source={AV[n]} style={[st.small, i > 0 && { marginLeft: -s(5) }]} />)}
          </View>
        </View>
      </View>
      {FACES.map((f, i) => <Image key={i} source={AV[f.img]} style={[st.big, { top: s(f.top), ...(f.left !== undefined ? { left: s(f.left) } : null), ...(f.right !== undefined ? { right: s(f.right) } : null) }]} />)}
    </View>
  );
}

const card = (s: Scale) => ({ shadowColor: k.warmShadow, shadowOpacity: 0.15, shadowRadius: s(42), shadowOffset: { width: 0, height: s(20) }, elevation: 10 });

function teamsStyles(s: Scale) {
  return StyleSheet.create({
    shot: { width: s(302), height: s(346), paddingTop: s(16), paddingHorizontal: s(17), paddingBottom: s(14), borderRadius: s(27), backgroundColor: "rgba(255,255,255,0.97)", transform: [{ rotate: "-1.4deg" }], overflow: "hidden", ...card(s) },
    bar: { flexDirection: "row", alignItems: "center", gap: s(10), height: s(38), paddingBottom: s(10), borderBottomWidth: 1, borderBottomColor: k.s100 },
    mark: { width: s(32), height: s(32), borderRadius: s(16), backgroundColor: k.white, alignItems: "center", justifyContent: "center", shadowColor: k.warmShadow, shadowOpacity: 0.14, shadowRadius: s(13), shadowOffset: { width: 0, height: s(5) }, elevation: 3 },
    barText: { fontSize: s(13), fontWeight: "900", color: k.ink },
    row: { flexDirection: "row", alignItems: "center", gap: s(11), height: s(47), borderBottomWidth: 1, borderBottomColor: k.s100 },
    tile: { width: s(34), height: s(34), borderRadius: s(17), backgroundColor: k.orange50, alignItems: "center", justifyContent: "center" },
    line1: { height: s(6), width: "66%", borderRadius: 99, backgroundColor: k.s200 },
    line2: { height: s(4), width: "42%", marginTop: s(6), borderRadius: 99, backgroundColor: k.s100 },
    face: { width: s(26), height: s(26), borderRadius: s(13), borderWidth: 2, borderColor: k.white, backgroundColor: k.s200 },
    need: { width: s(40), height: s(18), borderRadius: 99, backgroundColor: k.primary, opacity: 0.85 },
  });
}
function recordStyles(s: Scale) {
  return StyleSheet.create({
    shot: { width: s(300), height: s(352), borderRadius: s(26), backgroundColor: k.white, overflow: "hidden", transform: [{ rotate: "0.9deg" }], ...card(s) },
    cover: { height: s(116), backgroundColor: k.s200, overflow: "hidden" },
    scrim: { position: "absolute", left: 0, right: 0, bottom: 0, top: "42%", backgroundColor: "rgba(15,23,42,0.36)" },
    mini: { position: "absolute", left: s(16), bottom: s(12), flexDirection: "row", gap: s(5) },
    miniBar1: { width: s(31), height: s(5), borderRadius: 99, backgroundColor: "rgba(255,255,255,0.92)" },
    miniBar2: { width: s(58), height: s(5), borderRadius: 99, backgroundColor: "rgba(255,255,255,0.62)" },
    body: { paddingTop: s(14), paddingHorizontal: s(17), paddingBottom: s(16) },
    progress: { height: s(6), borderRadius: 99, backgroundColor: k.s100, overflow: "hidden", marginBottom: s(14) },
    progressFill: { height: s(6), width: "66%", borderRadius: 99, backgroundColor: k.primary },
    top: { flexDirection: "row", alignItems: "center", height: s(28), borderBottomWidth: 1, borderBottomColor: k.s100, marginBottom: s(5) },
    topText: { fontSize: s(12), fontWeight: "900", color: k.ink },
    lock: { marginLeft: "auto", width: s(22), height: s(22), borderRadius: s(11), backgroundColor: k.orange50, alignItems: "center", justifyContent: "center" },
    stepRow: { flexDirection: "row", alignItems: "center", gap: s(11), minHeight: s(55), borderBottomWidth: 1, borderBottomColor: k.s100 },
    check: { width: s(24), height: s(24), borderRadius: s(12), borderWidth: 1.5, borderColor: k.s300, alignItems: "center", justifyContent: "center" },
    checkOn: { backgroundColor: k.primary, borderWidth: 0 },
    rl1: { height: s(6), width: "72%", borderRadius: 99, backgroundColor: k.s200 },
    rl2: { height: s(4), width: "45%", marginTop: s(6), borderRadius: 99, backgroundColor: k.s100 },
    face: { width: s(26), height: s(26), borderRadius: s(13), backgroundColor: k.s200 },
  });
}
function communityStyles(s: Scale, width: number) {
  return StyleSheet.create({
    scene: { width, height: s(400) },
    card: { position: "absolute", left: "50%", marginLeft: -s(102), top: s(28), width: s(204), height: s(322), borderRadius: s(25), backgroundColor: k.white, overflow: "hidden", transform: [{ rotate: "-1.2deg" }], zIndex: 2, ...card(s) },
    cover: { height: s(177), backgroundColor: k.s200, overflow: "hidden" },
    scrim: { position: "absolute", left: 0, right: 0, bottom: 0, top: "42%", backgroundColor: "rgba(15,23,42,0.36)" },
    ghost: { position: "absolute", left: s(15), right: s(15), bottom: s(14) },
    ghost1: { height: s(7), width: "76%", borderRadius: 99, backgroundColor: k.white },
    ghost2: { height: s(5), width: "48%", marginTop: s(7), borderRadius: 99, backgroundColor: "rgba(255,255,255,0.68)" },
    line: { height: s(7), width: "82%", borderRadius: 99, backgroundColor: k.s200 },
    lineShort: { height: s(5), width: "56%", marginTop: s(8), borderRadius: 99, backgroundColor: k.s100 },
    prog: { height: s(6), borderRadius: 99, backgroundColor: k.s100, overflow: "hidden", marginTop: s(18) },
    progFill: { height: s(6), width: "58%", borderRadius: 99, backgroundColor: k.primary },
    small: { width: s(25), height: s(25), borderRadius: s(13), borderWidth: 2, borderColor: k.white, backgroundColor: k.s200 },
    big: { position: "absolute", width: s(54), height: s(54), borderRadius: s(27), borderWidth: s(4), borderColor: k.white, backgroundColor: k.s200, zIndex: 3, shadowColor: k.ink, shadowOpacity: 0.15, shadowRadius: s(18), shadowOffset: { width: 0, height: s(8) }, elevation: 6 },
  });
}
