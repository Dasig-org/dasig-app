import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { evidence, type Observed } from "@bayanihan/core/memory";
import { ask, downloadModel, modelReady, removeModel, retryModel, startModel, useModel, type ModelState } from "@/lib/bayani";
import { intentOf, movesFor, noticed, NOTHING, pick, STARTERS, type Intent, type Move } from "@/lib/copilot";
import { MoveList, useMoves } from "./Moves";
import { bix, refId, type R } from "@/lib/bix";
import { short } from "@/lib/dates";
import { loadMemory, type Memory } from "@/lib/memory";
import { Icon } from "./Icon";
import { Eyebrow, Field, IconCircle, LinkText, listLayout, Meta, Outline, Panel, Primary, Row, Sand, Sheet } from "./kit";
import { c, motion, radius, tone, type as t } from "./theme";

/*
 * Bayani, reachable from every screen (Don, 2026-11-15: "a Bayani button reachable by the thumb and consistently
 * located"). One round button, bottom right above the bar, on every Screen. It opens a sheet that knows the screen
 * (a group, a project or a step) and acts as a COPILOT: it reads the records, says what needs doing (late, nobody on
 * it, out of order, usually needed), and lets a lead do those things one by one or together, with Undo (lib/copilot.ts).
 * Bayani-1 was trained on BIX records, not on text, so there are no open written answers. Questions are matched to
 * what the copilot knows, or to the facts library, shown as written with sources. A person decides.
 * Look: DESIGN_STANDARD §5 (outline gradient spark in a ringed white circle; the Bayani surface for its own judgments).
 */
export type Here =
  | { kind: "project"; project: R; tasks: R[]; teams: R[]; org: R | null; lead: boolean }
  | { kind: "task"; task: R; project: R | null; team: R | null; siblings: R[]; org?: R | null; lead?: boolean; subs?: R[] }
  /*
   * A group. With `tasks` and `teams` (the coordinator's Home loads them), Bayani looks across every project on the go:
   * what's late, who's needed, which team has no lead; `requests` (people who asked to join), `unreported` (events that
   * happened with no report sent) and `needs` (what projects are still short of) add what waits on an officer.
   */
  | { kind: "group"; org: R; projects: R[]; officer: boolean; tasks?: R[]; teams?: R[]; needs?: R[]; requests?: number; unreported?: R[] };

const SPARK = ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"];
const Grad = ({ id, down }: { id: string; down?: boolean }) => (
  <LinearGradient id={id} x1="0" y1="0" x2={down ? "0" : "1"} y2="1"><Stop offset="0" stopColor={down ? "#FFF3E6" : c.accent} /><Stop offset="1" stopColor={down ? "#FFFDF8" : c.gold} /></LinearGradient>
);

/** The Bayani mark: an outline spark in the brand gradient, in a white circle with a 1.5px gradient ring. Never a solid fill. */
export function BayaniMark({ size = 40 }: { size?: number }) {
  const r = size / 2, k = (size * 0.52) / 24;
  return <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <Defs><Grad id="bym" /></Defs>
    <Circle cx={r} cy={r} r={r - 1} fill={c.white} stroke="url(#bym)" strokeWidth={1.5} />
    <G transform={`translate(${size * 0.24} ${size * 0.24}) scale(${k})`}>{SPARK.map((d) => <Path key={d} d={d} stroke="url(#bym)" strokeWidth={1.9} fill="none" strokeLinejoin="round" strokeLinecap="round" />)}</G>
  </Svg>;
}

/** The Bayani surface: warm tint, gradient hairline, faint sparkles, an uppercase label. Only for Bayani's own judgments. */
export function BayaniSurface({ label, children }: { label: string; children: ReactNode }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  return <View onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ borderRadius: radius.panel, padding: 14, overflow: "hidden" }}>
    {box.w && box.h ? <View pointerEvents="none" style={StyleSheet.absoluteFill}><Svg width={box.w} height={box.h}>
      <Defs><Grad id="bys" down /><Grad id="byb" /></Defs>
      <Rect x={0.75} y={0.75} width={box.w - 1.5} height={box.h - 1.5} rx={radius.panel - 0.75} fill="url(#bys)" stroke="url(#byb)" strokeWidth={1.5} />
      <G opacity={0.35} transform={`translate(${box.w - 38} 8) scale(0.9)`}>{SPARK.map((d) => <Path key={d} d={d} stroke={c.gold} strokeWidth={1.6} fill="none" strokeLinejoin="round" />)}</G>
    </Svg></View> : null}
    <Text style={[t.eyebrow, { color: "#B4500F", marginBottom: 8 }]}>{label}</Text>
    {children}
  </View>;
}

/** Under every Bayani judgment: it was worked out here, and nothing left the phone. */
export const OnThisPhone = ({ children = "Worked out on this phone. Nothing leaves it." }: { children?: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 28, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: c.white, marginTop: 10 }}>
    <Icon name="lock" size={12} color={c.accent} /><Text style={{ fontSize: 12, fontWeight: "600", color: c.ink }}>{children}</Text></View>
);

export const FACT_EXAMPLES = ["What is BIX?", "Does it work without signal?", "Who are you?", "Is our data used to train AI?"];
/** Answers from the facts library, as written, with their source. With no question: the examples to tap. */
export function FactAnswers({ q, onPick, onSheet }: { q: string; onPick: (q: string) => void; onSheet?: boolean }) {
  const bg = onSheet ? c.wash : c.white;
  if (q.trim().length <= 2) return <View style={{ marginTop: 12 }}><Panel style={{ backgroundColor: bg }}>{FACT_EXAMPLES.map((x, i) => <Row key={x} left={<IconCircle name="spark" tone={onSheet ? "white" : "sand"} />} title={x} onPress={() => onPick(x)} last={i === FACT_EXAMPLES.length - 1} />)}</Panel></View>;
  const found = ask(q);
  if (!found.length) return <View style={{ marginTop: 12 }}><Sand><Text style={[t.body, { flex: 1 }]}>{"I don't know that yet. I can answer questions about Dasig, BIX and Bayani, and on a project I can say what's late, who's still needed and what's usually missing."}</Text></Sand></View>;
  return <>{found.map((f, i) => (
    <View key={f.fact.id} style={{ marginTop: 12 }}><Panel style={{ backgroundColor: bg }}>
      <Row left={<BayaniMark />} title={f.fact.questions[0] ?? ""} meta={i === 0 ? "Best match" : "Also related"} last />
      <View style={{ paddingBottom: 14, gap: 8 }}>
        <Text style={t.body}>{f.fact.answer}</Text>
        <Meta>{`From ${f.fact.source.replace("https://", "")} · checked ${f.fact.updated}`}</Meta>
        <View style={{ alignSelf: "flex-start" }}><Outline label="Open the page" onPress={() => Linking.openURL(f.fact.source)} /></View>
      </View>
    </Panel></View>
  ))}</>;
}

const pctOf = (s: { got: number; total: number }) => Math.min(99, Math.floor((s.got / Math.max(1, s.total)) * 100));
const gb = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : `${Math.round(n / 1e6)} MB`);
/** A thin progress bar, in the accent. */
export function ProgressBar({ share }: { share: number }) {
  return <View style={{ height: 6, borderRadius: 3, backgroundColor: c.s200, overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(share * 100) }}>
    <View style={{ height: 6, width: `${Math.max(2, Math.min(100, share * 100))}%`, borderRadius: 3, backgroundColor: c.accent }} /></View>;
}
/** One line for the model's state, in words: downloading, paused, starting, or couldn't start (with what to do). */
export function modelWords(s: ModelState): string {
  switch (s.phase) {
    case "web": return "Bayani-1 runs in the Android and iPhone apps";
    case "checking": return " ";
    case "none": return "Bayani-1 isn't on this phone yet";
    case "downloading": return `Downloading Bayani-1 · ${pctOf(s)}%`;
    case "paused": return `Bayani-1's download is paused at ${pctOf(s)}%`;
    case "loading": return "Starting Bayani-1…";
    case "failed": return "Bayani-1 couldn't start";
    default: return "Bayani-1 is on this phone · works offline";
  }
}
/**
 * Where Bayani-1's work shows (the sheet, Plan check): what's in the way, if anything. Nothing when it's ready.
 * Device pass v0.19: when it failed, nothing said so anywhere.
 */
export function ModelLine() {
  const s = useModel();
  if (s.phase === "loading") return <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 6 }}><Thinking on><BayaniMark size={22} /></Thinking>
    <Text style={[t.meta, { flex: 1 }]}>Starting Bayani-1. The first time after opening the app takes a few seconds.</Text></View>;
  if (s.phase === "failed") return <View style={{ marginVertical: 6, gap: 8 }}>
    <Text style={t.body}>{s.damaged ? "Bayani-1 couldn't start. Its download looks damaged." : "Bayani-1 couldn't start on this phone."}</Text>
    <Text style={t.meta} selectable>{s.error}</Text>
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      <Outline label="Try again" onPress={retryModel} />
      {s.damaged ? <Outline label="Download it again" onPress={() => { removeModel().then(() => downloadModel()).catch(() => {}); }} /> : null}
    </View></View>;
  if (s.phase === "downloading" || s.phase === "paused") return <View style={{ marginVertical: 6, gap: 6 }}>
    <Text style={t.meta}>{s.phase === "downloading" ? `Downloading Bayani-1: ${gb(s.got)} of ${gb(s.total)}. It keeps going while you use the app.` : `Paused at ${pctOf(s)}%. ${s.why}`}</Text>
    <ProgressBar share={s.got / Math.max(1, s.total)} />
    {s.phase === "paused" ? <View style={{ alignSelf: "flex-start" }}><Outline label="Continue" onPress={() => { void downloadModel(); }} /></View> : null}
  </View>;
  return null;
}

type Line = { icon: "check" | "book" | "clock" | "pending" | "flag" | "pen" | "users"; title: string; meta?: string; go?: () => void };
const Lines = ({ lines }: { lines: Line[] }) => lines.length ? <Panel style={{ backgroundColor: c.wash }}>{lines.map((l, i) => <Row key={l.title} left={<IconCircle name={l.icon} tone="white" />} title={l.title} meta={l.meta} onPress={l.go} last={i === lines.length - 1} />)}</Panel> : null;
const live = (tasks: R[]) => tasks.filter((k) => k.status !== "draft" && k.status !== "cancelled");

/** A project: what's open, then what project memory found (leads, when the group turned it on). */
function HereProject({ h, mem, onClose }: { h: Extract<Here, { kind: "project" }>; mem: Memory | null; onClose: () => void }) {
  const memoryOn = ((h.org?.assist ?? []) as { code?: string }[]).some((a) => a.code === "memory");
  const [now] = useState(() => Date.now());
  const all = live(h.tasks), done = all.filter((k) => k.status === "completed").length;
  const soon = all.filter((k) => k.status !== "completed" && k.due && Date.parse(k.due) - now < 7 * 86400000).length;
  const lines: Line[] = [{ icon: "check", title: all.length ? `${all.length - done} of ${all.length} steps still open` : "No work added yet",
    meta: soon ? `${soon} due in the next 7 days` : h.project.period?.start ? `Starts ${short(h.project.period.start)}` : undefined }];
  if (h.lead && !memoryOn && h.org) lines.push({ icon: "book", title: "Project memory is off", meta: `Turn it on for ${h.org.name} to see what projects like this usually need`, go: () => { onClose(); router.push(`/org/${h.org!.id}` as never); } });
  return <>
    <Eyebrow>{h.project.title}</Eyebrow>
    <Lines lines={lines} />
    {mem?.bayani.same.length ? <Meta>{`Bayani matched ${mem.bayani.same.length} usual step${mem.bayani.same.length === 1 ? "" : "s"} to steps you already have. Check them on the page.`}</Meta> : null}
  </>;
}

const STATE: Record<string, string> = { draft: "an idea", ready: "open", accepted: "taken", "in-progress": "being done", completed: "done", cancelled: "cancelled" };
/** A step: where it stands, and what the group usually does for a step like it (its Practice), with lessons. */
function HereTask({ h, onClose }: { h: Extract<Here, { kind: "task" }>; onClose: () => void }) {
  const pid = refId(h.task.practice);
  const [loaded, setLoaded] = useState<R | null>(null);
  useEffect(() => { if (pid) bix.get("Practice", pid).then(setLoaded).catch(() => setLoaded(null)); }, [pid]);
  const practice = pid && loaded && loaded.id === pid ? loaded : null;
  const day = (practice?.observed as Observed | undefined)?.dayFromStart?.median;
  const timing = typeof day !== "number" ? null : day < -1 ? `usually ${-day} days before the start` : day === -1 ? "usually the day before" : day === 0 ? "usually on the day" : `usually ${day} days after the start`;
  const lines: Line[] = [{ icon: "pen", title: `This step is ${STATE[h.task.status] ?? h.task.status}`, meta: [h.team?.name, h.task.due ? `due ${short(h.task.due)}` : null].filter(Boolean).join(" · ") || undefined }];
  if (practice) lines.push({ icon: "book", title: `Usually: ${practice.title}`, meta: [evidence(practice), timing, practice.team ? `usually ${practice.team}` : null].filter(Boolean).join(" · ") });
  else if (pid) lines.push({ icon: "book", title: "Linked to a usual step", meta: "Its memory isn't on this phone yet" });
  else lines.push({ icon: "book", title: "Not linked to one of your group's usual steps", meta: "What's remembered about a step comes from your group's finished projects" });
  for (const l of ((practice?.lesson ?? []) as { text: string; time?: string }[]).slice(-2)) lines.push({ icon: "flag", title: `“${l.text}”`, meta: l.time ? `From last time · ${new Date(l.time).getFullYear()}` : "From last time" });
  if (h.project) { const open = live(h.siblings).filter((x) => x.status !== "completed").length; lines.push({ icon: "check", title: `${open} other step${open === 1 ? "" : "s"} open in ${h.project.title}`, go: () => { onClose(); router.push(`/project/${h.project!.id}`); } }); }
  return <><Eyebrow>{h.task.title}</Eyebrow><Lines lines={lines} /></>;
}

/** A group: its projects, and whether project memory is on. */
function HereGroup({ h }: { h: Extract<Here, { kind: "group" }> }) {
  const on = ((h.org.assist ?? []) as { code?: string }[]).some((a) => a.code === "memory");
  const active = h.projects.filter((p) => p.status === "active").length, done = h.projects.filter((p) => p.status === "completed").length;
  const lines: Line[] = [{ icon: "flag", title: active ? `${active} project${active === 1 ? "" : "s"} on the go` : "No project on the go", meta: done ? `${done} done, which is what project memory learns from` : "Project memory learns from finished projects" },
    { icon: "book", title: `Project memory is ${on ? "on" : "off"}`, meta: on ? "Projects show what projects like them usually need" : h.officer ? "Officers can turn it on, under How it's run on this page" : "An officer can turn it on" }];
  const [now] = useState(() => Date.now());
  const open = live(h.tasks ?? []).filter((k) => k.status !== "completed");
  const late = open.filter((k) => k.due && Date.parse(k.due) < now).length;
  if (h.tasks) lines.splice(1, 0, { icon: "check", title: open.length ? `${open.length} step${open.length === 1 ? "" : "s"} still open across them` : "No open steps", meta: late ? `${late} late` : open.length ? "None late" : undefined });
  return <><Eyebrow>{h.org.name}</Eyebrow><Lines lines={lines} /></>;
}

/** The mark pulses while Bayani-1 works through its questions (never a spinner). */
function Thinking({ on, children }: { on: boolean; children: ReactNode }) {
  const k = useSharedValue(1);
  useEffect(() => { k.value = on ? withRepeat(withSequence(withTiming(1.14, { duration: 520 }), withTiming(1, { duration: 520 })), -1) : withTiming(1, { duration: 150 }); }, [on, k]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: k.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/**
 * Ask Bayani, as a copilot. Under the field: what needs doing on this screen (rules, on a plain panel), then what
 * Bayani-1 noticed (its own judgments, on the Bayani surface, with how sure it is), each one openable or, for a lead,
 * runnable, with Not now. "Do all" runs the runnable ones together with one Undo. A question picks what to show
 * (late, who's needed, what's missing); any other question goes to the facts library.
 */
export function AskBox({ here, mem, onSheet, onClose, noticed = [], checking = 0, why = null }: { here?: Here; mem?: Memory | null; onSheet?: boolean; onClose?: () => void; noticed?: Move[]; checking?: number; why?: string | null }) {
  const ms = useModel();
  const modelBusy = ms.phase === "loading" || ms.phase === "failed";
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState<{ q: string; intent: Intent | null } | null>(null);
  const api = useMoves();
  const all = useMemo(() => [...movesFor(here, mem ?? null), ...noticed].sort((a, b) => b.rank - a.rank), [here, mem, noticed]);
  const go = (question = q, intent: Intent | null = intentOf(question)) => { if (question.trim().length < 3) return; setQ(question); setAsked({ q: question, intent }); };
  const starters = STARTERS[here?.kind ?? ""] ?? [];
  const facts = asked !== null && asked.intent === null;
  const intent: Intent = asked?.intent ?? "week";
  const picked = pick(all, intent).filter((m) => !api.gone.has(m.id));
  const rules = picked.filter((m) => m.by !== "bayani").slice(0, asked ? 8 : 4);
  const model = picked.filter((m) => m.by === "bayani").slice(0, 8);
  const runnable = [...rules, ...model].filter((m) => m.run);
  return <Animated.View layout={listLayout} style={{ marginTop: 6 }}>
    <Field icon="spark" placeholder={here ? "Ask what's late, who's needed, what's missing" : "Ask about Dasig, BIX or Bayani"} value={q}
      onChangeText={(x) => { setQ(x); if (!here) setAsked({ q: x, intent: null }); }} autoCorrect={false} returnKeyType="send" onSubmitEditing={() => go()} />
    {here ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>{starters.map((x) =>
      <Pressable key={x.q} onPress={() => go(x.q, x.intent)} accessibilityRole="button" style={{ paddingHorizontal: 12, minHeight: 40, borderRadius: radius.pill, backgroundColor: asked?.q === x.q ? tone.primaryContainer : onSheet ? c.wash : c.white, justifyContent: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: asked?.q === x.q ? tone.onPrimaryContainer : c.ink }}>{x.q}</Text></Pressable>)}</View> : null}
    {here && facts ? <FactAnswers q={asked!.q} onPick={setQ} onSheet={onSheet} />
      : here ? <Animated.View key={intent + String(!!asked)} layout={listLayout} entering={FadeIn.duration(motion.fade)} style={{ marginTop: 12 }}>
        <Eyebrow>{asked ? "What needs doing" : "What needs doing, right now"}</Eyebrow>
        <Panel style={{ backgroundColor: onSheet ? c.wash : c.white }}>{rules.length ? <MoveList moves={rules} api={api} onOpen={onClose} /> : <Text style={[t.body, { paddingVertical: 14 }]}>{NOTHING[intent]}</Text>}</Panel>
        {model.length || checking > 0 || modelBusy || (why && !asked) ? <View style={{ marginTop: 12 }}><BayaniSurface label="Bayani noticed">
          <ModelLine />
          {checking > 0 && !modelBusy ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: model.length ? 8 : 0 }}><Thinking on><BayaniMark size={24} /></Thinking>
            <Text style={[t.meta, { flex: 1 }]}>{`Bayani-1 is checking ${checking} more step${checking === 1 ? "" : "s"}…`}</Text></View> : null}
          {why && !model.length && checking === 0 && !modelBusy ? <Text style={t.meta}>{why}</Text> : null}
          {model.length ? <View style={{ backgroundColor: c.white, borderRadius: radius.inner, paddingHorizontal: 12 }}><MoveList moves={model} api={api} onOpen={onClose} /></View> : null}
          <OnThisPhone />
        </BayaniSurface></View> : null}
        {runnable.length > 1 ? <View style={{ marginTop: 10 }}><Primary label={api.busy === "all" ? "Working…" : `Do all ${runnable.length}`} disabled={!!api.busy} onPress={() => api.runAll(runnable)} /></View> : null}
        {runnable.length ? <Meta>{"Each one is recorded with what suggested it: a rule, or Bayani-1 and how sure it was. You can undo it."}</Meta> : null}
      </Animated.View>
      : <FactAnswers q={q} onPick={setQ} onSheet={onSheet} />}
  </Animated.View>;
}

export function BayaniSheet({ open, onClose, here }: { open: boolean; onClose: () => void; here?: Here }) {
  const ms = useModel();
  const has = modelReady(ms);
  const [mem, setMem] = useState<Memory | null>(null);
  const [found, setFound] = useState<Move[]>([]);
  const [checking, setChecking] = useState(0);
  const [why, setWhy] = useState<string | null>(null);
  const memoryOn = here?.kind === "project" && ((here.org?.assist ?? []) as { code?: string }[]).some((a) => a.code === "memory");
  // Project memory, for leads when the group turned it on. Bayani-1 sharpens it when it's on this phone.
  useEffect(() => {
    if (open && here?.kind === "project" && here.lead && memoryOn) loadMemory(here.project, here.tasks).then(setMem).catch(() => setMem(null));
    else Promise.resolve().then(() => setMem(null));
  }, [open, here, memoryOn]);
  // Bayani-1's own moves, one question at a time, shown as they're found; stops when the sheet closes.
  useEffect(() => {
    let stop = false;
    Promise.resolve().then(() => { setFound([]); setChecking(0); setWhy(null); });
    if (open && has) noticed(here, { onMove: (m) => setFound((f) => [...f.filter((x) => x.id !== m.id), m]), onProgress: setChecking, cancelled: () => stop })
      .then((w) => { if (!stop) setWhy(w); }).catch(() => {}).finally(() => { if (!stop) setChecking(0); });
    return () => { stop = true; };
  }, [open, here, has]);
  const status = ms.phase === "web" ? "Works on this page's records · Bayani-1 runs in the Android and iPhone apps" : modelWords(ms);
  return <Sheet open={open} onClose={onClose} snap>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <BayaniMark size={44} />
      <View style={{ flex: 1 }}><Text style={[t.row, { fontSize: 18 }]}>Bayani</Text><Text style={[t.meta, { marginTop: 2 }]}>{status}</Text></View>
      {ms.phase === "none" || ms.phase === "paused" ? <Outline label={ms.phase === "paused" ? "Continue" : "Get it"} onPress={() => { onClose(); router.push("/ask-bayani"); }} /> : null}
    </View>
    {ms.phase === "downloading" ? <View style={{ marginTop: 10 }}><ProgressBar share={ms.got / Math.max(1, ms.total)} /></View> : null}
    <AskBox here={here} mem={mem} onSheet onClose={onClose} noticed={found} checking={checking} why={why} />
    <View style={{ marginTop: 18 }}>{here?.kind === "project" ? <HereProject h={here} mem={mem} onClose={onClose} /> : here?.kind === "task" ? <HereTask h={here} onClose={onClose} /> : here?.kind === "group" ? <HereGroup h={here} />
      : <Sand><IconCircle name="book" tone="white" /><Text style={[t.body, { flex: 1 }]}>{"Open a project or a step and I can say what's late, who's needed and what it usually needs."}</Text></Sand>}</View>
    <View style={{ marginTop: 14, gap: 2 }}>
      <Meta>{"Bayani suggests; a person decides. Bayani-1 was trained on BIX records: it matches steps to your usual ones, judges what belongs and which team fits, and names steps worth keeping. It doesn't write free text. Facts are shown as written, from Dasig's public pages."}</Meta>
      <LinkText onPress={() => { onClose(); router.push("/ask-bayani"); }}>Bayani on this phone</LinkText>
    </View>
  </Sheet>;
}

const QUESTION: Record<string, string> = { "same-practice": "Already in the plan", "which-practice": "Linked to a usual step", applies: "Belongs in this project", "one-off": "One-off or not", "which-team": "Which team", "general-title": "Kept for next time", "usually-needed": "Usually needed (rule)", "out-of-order": "Make it wait (rule)", timing: "Usual date (rule)", "usually-done-by-now": "Usually done by now (rule)" };
/**
 * How Bayani's suggestions went for this group (the product measure, bayani README point 7): per question, how many a
 * person accepted unchanged, edited, or declined. Read from Provenance and declined proposals; nothing else is collected.
 */
export function SuggestionMeasure({ orgId }: { orgId: string }) {
  const [m, setM] = useState<Awaited<ReturnType<typeof bix.suggestions>> | null>(null);
  useEffect(() => { bix.suggestions(orgId).then(setM).catch(() => setM(null)); }, [orgId]);
  const rows = Object.entries(m?.byQuestion ?? {}).filter(([, v]) => v.used + v.edited + v.declined > 0);
  if (!m || !rows.length) return null;
  return <>
    <Eyebrow>{`How Bayani's suggestions went · ${m.days} days`}</Eyebrow>
    <Panel>{rows.map(([q, v], i) => { const n = v.used + v.edited + v.declined;
      return <Row key={q} left={<IconCircle name="spark" />} title={QUESTION[q] ?? q} meta={`${v.used} accepted${v.edited ? `, ${v.edited} edited` : ""}, ${v.declined} declined · ${Math.round((v.used / n) * 100)}% accepted as suggested`} last={i === rows.length - 1} />; })}</Panel>
  </>;
}

/**
 * Bayani has no button of its own any more (Don, 2026-11-15: it competed with "+"). It is "Ask Bayani" inside the
 * round action button's sheet (ui/ScreenFab.tsx, AddSheet), or the button itself on screens with nothing to add.
 * Each Screen registers what it shows (`here`) while it is in front; opening Bayani reads that.
 */
type BayaniApi = { register: (h?: Here) => void; open: () => void };
const BayaniCtx = createContext<BayaniApi>({ register: () => {}, open: () => {} });
export const useBayani = () => useContext(BayaniCtx);
export function BayaniProvider({ children }: { children: ReactNode }) {
  const ref = useRef<Here | undefined>(undefined);
  const [state, setState] = useState<{ open: boolean; here?: Here }>({ open: false });
  // Bayani-1's state for the whole app, and a download that was going on when the app was stopped continues (on Wi-Fi).
  useEffect(() => { void startModel(); }, []);
  const api = useMemo<BayaniApi>(() => ({
    register: (h) => { ref.current = h; },
    open: () => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setState({ open: true, here: ref.current }); },
  }), []);
  return <BayaniCtx.Provider value={api}>{children}<BayaniSheet open={state.open} onClose={() => setState((x) => ({ ...x, open: false }))} here={state.here} /></BayaniCtx.Provider>;
}
