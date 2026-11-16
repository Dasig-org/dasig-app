import { useState } from "react";
import { Text, View } from "react-native";
import type { R } from "@/lib/bix";
import { useLoad, useNow } from "@/lib/use";
import { peopleFor, personName } from "@/lib/work";
import { Avatar, Field, LinkText, Outline, Panel } from "./kit";
import { c, type as t } from "./theme";
import { ago } from "./Where";

/*
 * Updates on a step or a project (BIX Task.note[] and Initiative.note[]): how it's going, said where the work is, so
 * it isn't lost in a chat (Don, 2026-11-16). Newest first; the three latest, the rest on request. Whoever may change
 * the record may post: on a step, the people on it and its leads; on a project, its leads and the group's core team.
 */
export type Note = { author?: { reference: string }; time?: string; text: string };
export function Updates({ notes, onPost, hint = "Say how it's going" }: { notes: Note[]; onPost?: (text: string) => Promise<unknown> | void; hint?: string }) {
  const now = useNow();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);
  const refs = [...new Set(notes.map((n) => n.author?.reference).filter(Boolean) as string[])];
  const { data: people } = useLoad(() => peopleFor(refs, 30), [refs.join(",")]);
  const list = [...notes].reverse();
  const post = async () => { const v = text.trim(); if (!v || !onPost) return; setBusy(true); try { await onPost(v); setText(""); } finally { setBusy(false); } };
  if (!list.length && !onPost) return null;
  return <Panel>
    {onPost ? <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", paddingVertical: 10 }}>
      <View style={{ flex: 1 }}><Field value={text} onChangeText={setText} placeholder={hint} multiline accessibilityLabel="Write an update" /></View>
      <Outline label={busy ? "…" : "Post"} onPress={post} /></View> : null}
    {(all ? list : list.slice(0, 3)).map((n, i) => { const who = n.author?.reference ? people?.[n.author.reference] : undefined;
      return <View key={`${n.time}${i}`} style={{ flexDirection: "row", gap: 10, paddingVertical: 10, borderTopWidth: i === 0 && !onPost ? 0 : 1, borderTopColor: c.s200 }}>
        <Avatar name={personName(who as R | undefined)} photo={(who as R | undefined)?.photo} size={32} />
        <View style={{ flex: 1 }}><Text style={t.meta}>{[personName(who as R | undefined), n.time ? ago(Date.parse(n.time), now) : null].filter(Boolean).join(" · ")}</Text>
          <Text style={[t.body, { marginTop: 2 }]} selectable>{n.text}</Text></View></View>; })}
    {list.length > 3 ? <View style={{ alignItems: "center", paddingBottom: 6 }}><LinkText onPress={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${list.length}`}</LinkText></View> : null}
    {!list.length ? <Text style={[t.meta, { paddingBottom: 12 }]}>No updates yet.</Text> : null}
  </Panel>;
}
