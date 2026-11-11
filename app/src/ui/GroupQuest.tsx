import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { R } from "@/lib/bix";
import { Icon } from "./Icon";
import { Buttons, Meta, Outline, Panel, Primary, Row } from "./kit";
import { visibilityOf } from "./Privacy";
import { c, radius, type as t } from "./theme";

/*
 * A new group's first steps, as a short quest (coordinator zero state). Every step is checked from real records, so it
 * can't be ticked by hand and can't drift: logo, what you do, where, the core team, a first event, being findable, and
 * a first volunteer saying "I'm in". Three levels name the progress; finishing shows a one-time celebration.
 */
export type QuestFacts = { org: R; people: number; events: number; volunteerIn: boolean };
const LEVELS = [{ at: 0, name: "Just started" }, { at: 3, name: "Ready to recruit" }, { at: 5, name: "Ready for the first event" }, { at: 7, name: "Up and running" }];

export function GroupQuest({ org, people, events, volunteerIn }: QuestFacts) {
  const [seen, setSeen] = useState<boolean | null>(null);
  const key = `dasig.quest-done.${org.id}`;
  useEffect(() => { AsyncStorage.getItem(key).then((v) => setSeen(!!v)).catch(() => setSeen(false)); }, [key]);
  const place = (org.extension ?? []).some((x: any) => x.url === "bayanihan:place-text");
  const steps = [
    { done: !!org.image, title: "Add your logo", meta: "It shows on every card and link", go: `/org/${org.id}` },
    { done: !!org.description, title: "Say what your group does", meta: "Volunteers read this first", go: `/org/${org.id}` },
    { done: place, title: "Say where you work", meta: "So people nearby can find you", go: `/org/${org.id}` },
    { done: people >= 2, title: "Bring in your core team", meta: "Officers and members, by link", go: `/org/${org.id}/people` },
    { done: events > 0, title: "Set up your first event", meta: "Teams, leads and the work", go: "/new-project" },
    { done: visibilityOf(org) === "public", title: "Let volunteers find you", meta: "Listed on Nearby. People and tasks stay private", go: `/org/${org.id}` },
    { done: volunteerIn, title: "Get your first “I'm in”", meta: "Share open slots with your group chat", go: "/home" },
  ];
  const n = steps.filter((x) => x.done).length;
  const level = [...LEVELS].reverse().find((l) => n >= l.at)!;
  const next = LEVELS.find((l) => l.at > n);
  if (seen === null) return null;
  if (n === steps.length) {
    if (seen) return null;
    return <View style={{ marginTop: 14, backgroundColor: c.sand, borderRadius: radius.panel, padding: 18, alignItems: "center" }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={30} color={c.white} /></View>
      <Text style={[t.title, { fontSize: 22, marginTop: 10, textAlign: "center" }]}>{`${org.name} is up and running`}</Text>
      <Meta>Every step done. Your group is ready for anything.</Meta>
      <Buttons><Outline flex label="Salamat!" onPress={() => { AsyncStorage.setItem(key, "1"); setSeen(true); }} /></Buttons>
    </View>;
  }
  const first = steps.find((x) => !x.done)!;
  return <View style={{ marginTop: 14 }}>
    <View style={{ backgroundColor: c.white, borderRadius: radius.panel, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Ring done={n} of={steps.length} />
        <View style={{ flex: 1 }}><Meta>{`Level: ${level.name}`}</Meta><Text style={[t.row, { fontSize: 17 }]}>{`Get ${org.name} going`}</Text>
          <Meta>{next ? `${next.at - n} more to “${next.name}”` : "One step left"}</Meta></View>
      </View>
      <Buttons><Primary label={first.title} onPress={() => router.push(first.go as never)} /></Buttons>
    </View>
    <View style={{ marginTop: 10 }}><Panel>{steps.map((x, i) => <Row key={x.title} last={i === steps.length - 1} title={x.title} meta={x.done ? "Done" : x.meta}
      left={<View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: x.done ? c.accent : c.sand, alignItems: "center", justifyContent: "center" }}>
        {x.done ? <Icon name="check" size={15} color={c.white} /> : <Text style={{ fontSize: 12.5, fontWeight: "700", color: c.accent }}>{i + 1}</Text>}</View>}
      onPress={x.done ? undefined : () => router.push(x.go as never)} />)}</Panel></View>
  </View>;
}

/** A small progress ring: segments for each step, filled in brand orange. */
function Ring({ done, of }: { done: number; of: number }) {
  return <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
    <View style={{ position: "absolute", width: 56, height: 56, borderRadius: 28, borderWidth: 5, borderColor: c.accent, opacity: Math.max(0.15, done / of) }} />
    <Text style={{ fontSize: 15, fontWeight: "800", color: c.ink }}>{`${done}/${of}`}</Text>
  </View>;
}
