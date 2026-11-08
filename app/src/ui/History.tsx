import { useState } from "react";
import { Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useLoad } from "@/lib/use";
import { peopleFor, personName } from "@/lib/work";
import { Avatar, Eyebrow, IconCircle, LinkText, Panel } from "./kit";
import { Icon } from "./Icon";
import { c, type as t } from "./theme";

/** What happened to a record, in plain words (BIX Provenance). Folded to the latest three; signed entries carry a lock. */
const WORDS: Record<string, string> = {
  create: "Added", update: "Updated", claim: "Took it", assign: "Asked someone", accept: "Said yes", decline: "Couldn't make it",
  release: "Handed it back", complete: "Marked done", confirm: "Confirmed", dispute: "Questioned", cancel: "Cancelled",
  submit: "Sent for review", return: "Sent back", acknowledge: "Acknowledged", propose: "Suggested",
};
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });

export function History({ type, id, groupName, version }: { type: string; id: string; groupName?: string; version?: number }) {
  const [all, setAll] = useState(false);
  const { data } = useLoad(async () => {
    const h = (await bix.history(type, id)).entry;
    const people = await peopleFor(h.map((x) => x.by).filter(Boolean) as string[], 12);
    return { h, people };
  }, [type, id, version]);
  if (!data?.h.length) return null;
  const rows = [...data.h].reverse();
  const shown = all ? rows : rows.slice(0, 3);
  return <>
    <Eyebrow right={rows.length > 3 ? `${rows.length}` : undefined}>History</Eyebrow>
    <Panel>
      {shown.map((x, i) => { const who: R | undefined = x.by ? data.people[x.by] : undefined;
        const name = x.rule ? "Dasig" : who ? personName(who) : "Someone";
        return <View key={x.version + x.activity} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 11, borderBottomWidth: i === shown.length - 1 ? 0 : 1, borderBottomColor: c.s200 }}>
          {x.rule ? <IconCircle name="spark" size={30} /> : <Avatar name={name} size={30} photo={who?.photo} />}
          <View style={{ flex: 1 }}>
            <Text style={t.row}>{`${WORDS[x.activity] ?? x.activity}${x.model ? " · Bayani suggested" : ""}`}</Text>
            <Text style={t.meta}>{[name, when(x.when), x.offline ? "while offline" : null].filter(Boolean).join(" · ")}</Text>
            {x.signed ? <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}><Icon name="lock" size={12} color={x.signed.unchanged ? c.accent : c.s500} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: x.signed.unchanged ? c.accent : c.s500 }}>{x.signed.unchanged ? `Signed by ${groupName ?? "the group"} · unchanged` : "Signature doesn't match"}</Text></View> : null}
          </View>
        </View>; })}
    </Panel>
    {rows.length > 3 ? <View style={{ marginTop: 6, marginLeft: 4 }}><LinkText onPress={() => setAll(!all)}>{all ? "Show less" : `Show all ${rows.length}`}</LinkText></View> : null}
  </>;
}
