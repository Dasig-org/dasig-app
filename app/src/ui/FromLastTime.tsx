import { useEffect, useState } from "react";
import { Text } from "react-native";
import { evidence } from "@bayanihan/core/memory";
import { bix, refId, type R } from "@/lib/bix";
import { short } from "@/lib/dates";
import { usualDate } from "@/lib/memory";
import { Eyebrow, IconCircle, Panel, Row } from "./kit";
import { c, type as t } from "./theme";

/*
 * From last time (BIX "Project memory: Practices", rule 26; UI_REIMAGINE §7.2e). On a step linked to one of the group's
 * usual steps, whoever can see the step sees what the group learned: when it's usually done (and the date that means
 * in this project), how often it was needed or added late, and its lessons ("Ask the barangay a month ahead").
 * Rules and people's own words only: a plain panel, not the Bayani surface. Hidden when the step isn't linked, or
 * when this person may not see the usual step (the server says no).
 */
export function FromLastTime({ task, project }: { task: R; project: R | null }) {
  const id = refId(task.practice);
  const [p, setP] = useState<R | null>(null);
  const [now] = useState(() => Date.now());
  useEffect(() => { let on = true; if (id) bix.get("Practice", id).then((x) => on && setP(x)).catch(() => on && setP(null)); return () => { on = false; }; }, [id]);
  if (!id || !p || p.id !== id) return null;
  const median = (p.observed as { dayFromStart?: { median?: number } } | undefined)?.dayFromStart?.median;
  const by = project ? usualDate(project, p) : null;
  const open = !["completed", "cancelled"].includes(String(task.status));
  const days = by ? Math.round((by - now) / 86_400_000) : null;
  const timing = typeof median !== "number" ? null : median === 0 ? "Usually done on the day" : `Usually done ${Math.abs(median)} days ${median < 0 ? "before" : "after"} the start`;
  const when = by && open ? `${short(new Date(by).toISOString())}${days! < 0 ? `, ${-days!} days ago` : days === 0 ? ", today" : `, in ${days} days`}` : null;
  const lessons = ((p.lesson ?? []) as { text: string; time?: string }[]).slice(-3).reverse();
  const rows: { icon: "book" | "clock" | "flag"; title: string; meta?: string }[] = [
    { icon: "book", title: `Your group's usual step: ${p.title}`, meta: evidence(p) },
    ...(timing ? [{ icon: "clock" as const, title: timing, meta: when ? `In this project that's ${when}${task.due ? "" : ". This step has no date yet"}` : undefined }] : []),
    ...lessons.map((l) => ({ icon: "flag" as const, title: `“${l.text}”`, meta: l.time ? `A lesson from ${new Date(l.time).getFullYear()}` : "A lesson from last time" })),
  ];
  return <>
    <Eyebrow>From last time</Eyebrow>
    <Panel>{rows.map((r, i) => <Row key={i} left={<IconCircle name={r.icon} />} title={r.title} meta={r.meta} last={i === rows.length - 1} />)}</Panel>
    {days !== null && days < 0 && open ? <Text style={[t.meta, { marginTop: 6, marginHorizontal: 4, color: c.ink }]}>{"Your group usually has this done by now."}</Text> : null}
  </>;
}
