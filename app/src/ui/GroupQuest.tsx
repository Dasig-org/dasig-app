import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { bix, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { Icon } from "./Icon";
import { Buttons, LinkText, Meta, Outline, Panel, Primary, Row } from "./kit";
import { visibilityOf } from "./Privacy";
import { c, radius, type as t } from "./theme";

/*
 * A new group's first steps, as a short quest (coordinator zero state). Every step is checked from real records, so it
 * can't be ticked by hand and can't drift: logo, what you do, where, the core team, a first event, being findable, and
 * a first volunteer saying "I'm in". Steps can't be ticked by hand, but a group can skip one that isn't for it ("Not for
 * us"), or hide the checklist; both are kept on the group (bayanihan:setup-skipped, bayanihan:setup-hidden) so every
 * officer sees the same. A skipped step that later happens shows as done. Three levels name the progress.
 */
export type QuestFacts = { org: R; people: number; events: number; volunteerIn: boolean };
const LEVELS = [{ at: 0, name: "Just started" }, { at: 3, name: "Ready to recruit" }, { at: 5, name: "Ready for the first event" }, { at: 7, name: "Up and running" }];

export const setupExt = (org: R) => ({
  skipped: (((org.extension ?? []).find((x: any) => x.url === "bayanihan:setup-skipped")?.value as string[]) ?? []),
  hidden: !!(org.extension ?? []).find((x: any) => x.url === "bayanihan:setup-hidden")?.value,
});
export const withSetup = (org: R, next: { skipped?: string[]; hidden?: boolean }) => {
  const cur = setupExt(org);
  const skipped = next.skipped ?? cur.skipped, hidden = next.hidden ?? cur.hidden;
  return [...(org.extension ?? []).filter((x: any) => x.url !== "bayanihan:setup-skipped" && x.url !== "bayanihan:setup-hidden"),
    ...(skipped.length ? [{ url: "bayanihan:setup-skipped", value: skipped }] : []), ...(hidden ? [{ url: "bayanihan:setup-hidden", value: true }] : [])];
};

export function GroupQuest({ org, people, events, volunteerIn }: QuestFacts) {
  const s = useSession();
  const { skipped, hidden } = setupExt(org);
  const save = async (next: { skipped?: string[]; hidden?: boolean }) => { try { await bix.commit(bix.next(org, { extension: withSetup(org, next) })); await s.refresh(); } catch {} };
  const [seen, setSeen] = useState<boolean | null>(null);
  const key = `dasig.quest-done.${org.id}`;
  useEffect(() => { AsyncStorage.getItem(key).then((v) => setSeen(!!v)).catch(() => setSeen(false)); }, [key]);
  const place = (org.extension ?? []).some((x: any) => x.url === "bayanihan:place-text");
  const steps = [
    { key: "logo", done: !!org.image, title: "Add your logo", meta: "It shows on every card and link", go: `/org/${org.id}` },
    { key: "about", done: !!org.description, title: "Say what your group does", meta: "What it is, and who it helps", go: `/org/${org.id}` },
    { key: "place", done: place, title: "Say where you work", meta: "So people nearby can find you", go: `/org/${org.id}` },
    { key: "team", done: people >= 2, title: "Bring in your core team", meta: "Officers and members, by link", go: `/org/${org.id}/people` },
    { key: "event", done: events > 0, title: "Set up your first event", meta: "Teams, leads and the work", go: "/new-project" },
    { key: "findable", done: visibilityOf(org) === "public", title: "Let volunteers find you", meta: "Listed on Nearby. People and tasks stay private", go: `/org/${org.id}` },
    { key: "first-in", done: volunteerIn, title: "Get your first “I'm in”", meta: "Share open slots with your group chat", go: "/home" },
  ];
  const FIRST = ["logo", "about", "place"];
  const state = (x: (typeof steps)[number]) => (x.done ? "done" : skipped.includes(x.key) ? "skipped" : "todo");
  const n = steps.filter((x) => state(x) !== "todo").length;
  const level = [...LEVELS].reverse().find((l) => n >= l.at)!;
  const next = LEVELS.find((l) => l.at > n);
  if (seen === null || hidden) return null;
  if (n === steps.length) {
    if (seen) return null;
    return <View style={{ marginTop: 14, backgroundColor: c.sand, borderRadius: radius.panel, padding: 18, alignItems: "center" }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Icon name="check" size={30} color={c.white} /></View>
      <Text style={[t.title, { fontSize: 22, marginTop: 10, textAlign: "center" }]}>{`${org.name} is up and running`}</Text>
      <Meta>Every step done. Your group is ready for anything.</Meta>
      <Buttons><Outline flex label="Salamat!" onPress={() => { AsyncStorage.setItem(key, "1"); setSeen(true); }} /></Buttons>
    </View>;
  }
  const first = steps.find((x) => state(x) === "todo")!;
  return <View style={{ marginTop: 14 }}>
    <View style={{ backgroundColor: c.white, borderRadius: radius.panel, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Ring done={n} of={steps.length} />
        <View style={{ flex: 1 }}><Meta>{`Level: ${level.name}`}</Meta><Text style={[t.row, { fontSize: 17 }]}>{`Get ${org.name} going`}</Text>
          <Meta>{next ? `${next.at - n} more to “${next.name}”` : "One step left"}</Meta></View>
      </View>
      <Buttons><Primary label={first.title} onPress={() => router.push(first.go as never)} /></Buttons>
    </View>
    <View style={{ marginTop: 10 }}><Panel>{steps.map((x, i) => { const st = state(x);
      return <Row key={x.key} last={i === steps.length - 1} title={x.title}
        meta={st === "done" ? "Done" : st === "skipped" ? "Skipped" : FIRST.includes(x.key) ? `${x.meta}. Volunteers see this first` : x.meta}
        left={<View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: st === "done" ? c.accent : st === "skipped" ? c.wash : c.sand, alignItems: "center", justifyContent: "center" }}>
          {st === "done" ? <Icon name="check" size={15} color={c.white} /> : <Text style={{ fontSize: 12.5, fontWeight: "700", color: st === "skipped" ? c.s400 : c.accent }}>{st === "skipped" ? "–" : i + 1}</Text>}</View>}
        right={st === "skipped" ? <LinkText onPress={() => save({ skipped: skipped.filter((k) => k !== x.key) })}>Undo</LinkText>
          : st === "todo" ? <LinkText onPress={() => save({ skipped: [...skipped, x.key] })}>Not for us</LinkText> : undefined}
        onPress={st === "todo" ? () => router.push(x.go as never) : undefined} />; })}</Panel></View>
    <View style={{ alignItems: "center", marginTop: 8 }}><LinkText onPress={() => save({ hidden: true })}>Hide the checklist</LinkText></View>
  </View>;
}

/** A small progress ring: segments for each step, filled in brand orange. */
function Ring({ done, of }: { done: number; of: number }) {
  return <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
    <View style={{ position: "absolute", width: 56, height: 56, borderRadius: 28, borderWidth: 5, borderColor: c.accent, opacity: Math.max(0.15, done / of) }} />
    <Text style={{ fontSize: 15, fontWeight: "800", color: c.ink }}>{`${done}/${of}`}</Text>
  </View>;
}
