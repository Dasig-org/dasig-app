import { useEffect, useMemo, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { modelDownloaded, modelSupported } from "@/lib/bayani";
import type { R } from "@/lib/bix";
import { movesFor, noticed, type Move } from "@/lib/copilot";
import { addFromMemory, loadMemory } from "@/lib/memory";
import { useLoad } from "@/lib/use";
import { BayaniMark, BayaniSurface, OnThisPhone } from "./Bayani";
import { Icon } from "./Icon";
import { LinkText, listLayout, Meta, Primary } from "./kit";
import { MoveList, useMoves } from "./Moves";
import { useSnackbar } from "./Snackbar";
import { c, motion, radius, tone, type as t } from "./theme";

/*
 * Plan check (UI_REIMAGINE §7.2e; replaces the "From your past projects" card, 2026-11-15). Leads, on a project's
 * Overview, right under the hero: one card with what needs someone now and what would make the plan better, from the
 * same rules as the Bayani sheet (lib/copilot.ts). Project memory adds its findings when the group turned it on.
 * Every item says why, and has its action and "Not now" at the thumb. Nothing to do shows as "All clear".
 * Bayani-1, when it's on this phone, checks the plan on request ("Check with Bayani"); its findings sit on its own
 * surface, below, never mixed with the rules' (DESIGN_STANDARD §5).
 */
export function PlanCheck({ project, tasks, teams, org, onChanged }: { project: R; tasks: R[]; teams: R[]; org: R | null; onChanged: () => void }) {
  const memoryOn = ((org?.assist ?? []) as { code?: string }[]).some((a) => a.code === "memory");
  const versions = tasks.map((k) => `${k.id}@${k.meta.version}`).join(",");
  const { data: mem, reload } = useLoad(async () => (memoryOn ? loadMemory(project, tasks) : null), [project.id, versions, memoryOn]);
  const here = useMemo(() => ({ kind: "project" as const, project, tasks, teams, org, lead: true }), [project, tasks, teams, org]);
  const api = useMoves(() => { reload(); onChanged(); });
  const moves = useMemo(() => movesFor(here, mem ?? null).filter((m) => m.by !== "bayani"), [here, mem]);
  const judged = useMemo(() => movesFor(here, mem ?? null).filter((m) => m.by === "bayani"), [here, mem]);
  const now = moves.filter((m) => m.group === "now" && !api.gone.has(m.id));
  const plan = moves.filter((m) => m.group !== "now" && !api.gone.has(m.id));
  const runnable = [...now, ...plan].filter((m) => m.run);
  const done = !["active", "planned", "draft"].includes(String(project.status));
  if (done) return null;
  const count = now.length + plan.length;
  return <Animated.View layout={listLayout} style={{ marginTop: 14 }}>
    <View style={{ backgroundColor: c.white, borderRadius: 24, padding: 16, paddingBottom: count ? 6 : 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: now.length ? tone.errorContainer : count ? tone.primaryContainer : tone.secondaryContainer }}>
          {count ? <Text style={{ fontSize: 16, fontWeight: "800", color: now.length ? tone.onErrorContainer : tone.onPrimaryContainer }}>{count}</Text> : <Icon name="check" size={20} color={tone.onSecondaryContainer} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[t.row, { fontSize: 17 }]}>{count ? "Plan check" : "Plan check: all clear"}</Text>
          <Meta>{count ? [now.length ? `${now.length} need${now.length === 1 ? "s" : ""} you now` : null, plan.length ? `${plan.length} to plan` : null].filter(Boolean).join(" · ")
            : memoryOn ? "Nothing late, every step due soon has someone, and nothing usual is missing." : "Nothing late, and every step due soon has someone."}</Meta>
        </View>
      </View>
      {now.length ? <><Text style={[t.eyebrow, { marginTop: 14 }]}>Needs you now</Text><MoveList moves={now} api={api} max={3} /></> : null}
      {plan.length ? <><Text style={[t.eyebrow, { marginTop: 14 }]}>To plan</Text><MoveList moves={plan} api={api} max={3} /></> : null}
      {runnable.length > 1 ? <View style={{ marginBottom: 6 }}><Primary label={api.busy === "all" ? "Working…" : `Do all ${runnable.length}`} disabled={!!api.busy} onPress={() => api.runAll(runnable)} /></View> : null}
      {count ? <Meta>{memoryOn ? `From your plan and ${mem?.usingStarters ? "starter steps for projects like this" : "your group's past projects"}. Each change says what suggested it; you can undo it.` : "From your plan. Turn on Project memory for your group to also see what projects like this usually need."}</Meta> : null}
      {count ? <View style={{ height: 8 }} /> : null}
    </View>
    {memoryOn ? <BayaniPart project={project} tasks={tasks} teams={teams} org={org} judged={judged} mem={mem ?? null} onChanged={() => { reload(); onChanged(); }} /> : null}
  </Animated.View>;
}

/**
 * What Bayani-1 adds, on its surface: the usual steps it judged belong (from project memory), what it matched and left
 * out (so a lead can disagree), and, on request, its check of the plan (links, teams). Only when it's on this phone.
 */
function BayaniPart({ project, tasks, teams, org, judged, mem, onChanged }: { project: R; tasks: R[]; teams: R[]; org: R | null; judged: Move[]; mem: Awaited<ReturnType<typeof loadMemory>> | null; onChanged: () => void }) {
  const [has, setHas] = useState(false);
  const [found, setFound] = useState<Move[]>([]);
  const [checking, setChecking] = useState<number | null>(null);
  const api = useMoves(onChanged);
  const { show } = useSnackbar();
  useEffect(() => { if (modelSupported) modelDownloaded().then(setHas).catch(() => setHas(false)); }, []);
  const check = () => {
    setFound([]); setChecking(0);
    noticed({ kind: "project", project, tasks, teams, org, lead: true }, { onMove: (m) => setFound((f) => [...f.filter((x) => x.id !== m.id), m]), onProgress: setChecking })
      .catch(() => {}).finally(() => setChecking(null));
  };
  const same = mem?.bayani.same ?? [], out = mem?.bayani.notHere ?? [];
  const moves = [...judged, ...found];
  if (!has) return null;
  const add = async (practice: R) => { try { await addFromMemory(project, teams, { practice, starter: !!mem?.usingStarters }); show(`Added “${practice.title}”.`); onChanged(); } catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); } };
  return <View style={{ marginTop: 12 }}><BayaniSurface label="Bayani noticed">
    {moves.length ? <View style={{ backgroundColor: c.white, borderRadius: radius.inner, paddingHorizontal: 12, marginBottom: 8 }}><MoveList moves={moves} api={api} max={4} /></View> : null}
    {same.length ? <Small title="Already in your plan, under other names">{same.map((x) => <Line key={x.practice.id} text={`“${x.practice.title}” is your “${x.task.title}”`}
      sub={`Bayani is ${Math.round(x.judgment.confidence * 100)}% sure`} act="Not the same, add it" onAct={() => add(x.practice)} onOpen={() => router.push(`/task/${x.task.id}`)} />)}</Small> : null}
    {out.length ? <Small title="Left out: doesn't seem to belong here">{out.map((x) => <Line key={x.practice.id} text={String(x.practice.title)}
      sub={`Bayani is ${Math.round(x.judgment.confidence * 100)}% sure`} act="It belongs, add it" onAct={() => add(x.practice)} />)}</Small> : null}
    {checking !== null ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 6 }}><BayaniMark size={22} />
      <Text style={[t.meta, { flex: 1 }]}>{checking ? `Checking ${checking} more step${checking === 1 ? "" : "s"}…` : "Reading the plan…"}</Text></View>
      : <Pressable onPress={check} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: radius.inner, backgroundColor: pressed ? "#FFE9DC" : c.white, marginTop: 2 })}>
        <BayaniMark size={28} /><View style={{ flex: 1 }}><Text style={t.row}>{found.length ? "Check again" : "Check the plan with Bayani"}</Text>
          <Text style={t.meta}>Links steps to your usual ones and suggests teams. About a second a step.</Text></View>
        <Icon name="chevron" size={16} color={c.s300} /></Pressable>}
    <OnThisPhone />
  </BayaniSurface></View>;
}

const Small = ({ title, children }: { title: string; children: ReactNode }) => <Animated.View entering={FadeIn.duration(motion.fade)} style={{ marginBottom: 8 }}>
  <Text style={[t.meta, { fontWeight: "700", marginBottom: 4 }]}>{title}</Text>{children}</Animated.View>;
const Line = ({ text, sub, act, onAct, onOpen }: { text: string; sub: string; act: string; onAct: () => void; onOpen?: () => void }) =>
  <View style={{ backgroundColor: c.white, borderRadius: radius.inner, padding: 12, marginBottom: 6 }}>
    <Text style={t.row} onPress={onOpen}>{text}</Text><Text style={[t.meta, { marginTop: 2 }]}>{sub}</Text>
    <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}><LinkText onPress={onAct}>{act}</LinkText>{onOpen ? <LinkText onPress={onOpen}>Open the step</LinkText> : null}</View>
  </View>;
