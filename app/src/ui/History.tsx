import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useLoad } from "@/lib/use";
import { peopleFor, personName } from "@/lib/work";
import { Avatar, IconCircle, Meta, Panel, Sheet } from "./kit";
import { Icon } from "./Icon";
import { TimelineItem } from "./m3";
import { c, type as t } from "./theme";

/*
 * What happened to a record, in plain words (BIX Provenance).
 * 2026-11-15 (Don: "the history takes so much space and emphasis… it should be low in the page hierarchy"): on every
 * page it is one quiet line at the very bottom, "History · 4 changes · last: Took it, Ana, Nov 13", that opens the full
 * timeline in a sheet. Signed entries carry a lock there; the line says when the record is signed and unchanged.
 */
const WORDS: Record<string, string> = {
  create: "Added", update: "Updated", claim: "Took it", assign: "Asked someone", accept: "Said yes", decline: "Couldn't make it",
  release: "Handed it back", complete: "Marked done", confirm: "Confirmed", dispute: "Questioned", cancel: "Cancelled",
  submit: "Sent for review", return: "Sent back", acknowledge: "Acknowledged", propose: "Suggested",
};
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });

export function History({ type, id, groupName, version }: { type: string; id: string; groupName?: string; version?: number }) {
  const [open, setOpen] = useState(false);
  const { data } = useLoad(async () => {
    const h = (await bix.history(type, id)).entry;
    const people = await peopleFor(h.map((x) => x.by).filter(Boolean) as string[], 12);
    return { h, people };
  }, [type, id, version]);
  if (!data?.h.length) return null;
  const rows = [...data.h].reverse();
  const who = (x: (typeof rows)[number]) => { const p: R | undefined = x.by ? data.people[x.by] : undefined; return { p, name: p ? personName(p) : x.rule ? "Dasig" : "Someone" }; };
  const last = rows[0]!, lw = who(last);
  const signed = rows.find((x) => x.signed);
  return <>
    <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`History, ${rows.length} changes. Open`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, marginTop: 24, paddingHorizontal: 4, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={signed?.signed?.unchanged ? "lock" : "clock"} size={14} color={c.s500} />
      <Text numberOfLines={1} style={[t.meta, { flex: 1 }]}>
        <Text style={{ fontWeight: "700", color: c.s500 }}>History</Text>{` · ${rows.length} change${rows.length === 1 ? "" : "s"} · last: ${WORDS[last.activity] ?? last.activity}, ${lw.name.split(" ")[0]}, ${when(last.when)}`}
      </Text>
      <Icon name="chevron" size={14} color={c.s300} />
    </Pressable>
    <Sheet open={open} onClose={() => setOpen(false)} tall>
      <Text style={[t.row, { fontSize: 18 }]}>History</Text>
      <Meta>{signed?.signed?.unchanged ? `Every change, who made it and when. Signed by ${groupName ?? "the group"}, unchanged.` : "Every change, who made it and when."}</Meta>
      <Panel style={{ backgroundColor: c.wash, marginTop: 12 }}>
        {rows.map((x, i) => { const w = who(x);
          return <TimelineItem key={`${i}-${x.version}-${x.activity}`} last={i === rows.length - 1} icon={x.rule || x.model ? <IconCircle name="spark" size={28} tone="white" /> : <Avatar name={w.name} size={28} photo={w.p?.photo} />}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{`${WORDS[x.activity] ?? x.activity}${x.model ? " · Bayani suggested" : x.rule ? " · a rule suggested" : ""}`}</Text>
            <Text style={t.meta}>{[w.name, when(x.when), x.offline ? "while offline" : null].filter(Boolean).join(" · ")}</Text>
            {x.signed ? <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}><Icon name="lock" size={12} color={x.signed.unchanged ? c.accent : c.s500} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: x.signed.unchanged ? c.accent : c.s500 }}>{x.signed.unchanged ? `Signed by ${groupName ?? "the group"} · unchanged` : "Signature doesn't match"}</Text></View> : null}
          </TimelineItem>; })}
      </Panel>
    </Sheet>
  </>;
}
