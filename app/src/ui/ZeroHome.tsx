import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { dasigLinked } from "@/lib/dasig-account";
import { networkUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { personName, skillsOf } from "@/lib/work";
import { ContextPill, Logo } from "@/ui/Context";
import { IconCircle, Meta, Panel, Row, RoundButton, Screen } from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { c, radius, type as t } from "@/ui/theme";

/*
 * Home before someone has a group or any work (zero state). Follows design/home-sketches.html: photos carry the meaning,
 * one overlay chip, faces and short lines, details one tap away. Never opens with "nothing here". Real directory content
 * appears when there is some; otherwise that section is left out. Sample photos are illustrations only, credited below.
 */
const PHOTO = {
  hero: require("../../assets/images/zero/youth-group.jpg"),
  help: require("../../assets/images/zero/cleanup.jpg"),
  run: require("../../assets/images/zero/school-cleanup.jpg"),
  invite: require("../../assets/images/zero/tutoring.jpg"),
};

function Choice({ photo, chip, title, meta, onPress }: { photo: number; chip: string; title: string; meta: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${meta}`} style={{ width: 236 }}>
    <View style={{ height: 150, borderRadius: radius.panel, overflow: "hidden", backgroundColor: c.sand }}>
      <Image source={photo} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
      <View style={{ position: "absolute", left: 10, top: 10, height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: c.white, justifyContent: "center" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: c.ink }}>{chip}</Text></View>
    </View>
    <Text style={[t.row, { marginTop: 9, marginHorizontal: 2 }]}>{title}</Text>
    <Text style={[t.meta, { marginHorizontal: 2 }]} numberOfLines={2}>{meta}</Text>
  </Pressable>;
}

type Listed = { id: string; name?: string; title?: string; image?: { hash?: string }; groupName?: string; organization?: { reference?: string } };

export function ZeroHome() {
  const s = useSession();
  const [linked, setLinked] = useState(false);
  const [found, setFound] = useState<{ groups: Listed[]; projects: Listed[] } | null>(null);
  useEffect(() => { dasigLinked().then(setLinked).catch(() => {}); }, []);
  useEffect(() => { fetch(`${networkUrl}/$directory?count=12`).then((r) => r.json()).then(setFound).catch(() => setFound(null)); }, []);
  const p = s.person;
  const skills = skillsOf(p);
  const steps = [
    { done: linked || Platform.OS !== "web", title: "Keep your account", meta: "Sign in on any phone or browser", go: "/story" },
    { done: !!p?.photo, title: "Add a photo", meta: "So your group knows who's coming", go: "/profile" },
    { done: skills.length > 0, title: "What you can help with", meta: "Writing, driving, first aid…", go: "/profile" },
    { done: s.groups.length > 0, title: "Join or start a group", meta: "Where the work happens", go: "/nearby" },
  ];
  const doneN = steps.filter((x) => x.done).length;
  const listed = [...(found?.projects ?? []).map((x) => ({ ...x, kind: "project" as const })), ...(found?.groups ?? []).map((x) => ({ ...x, kind: "group" as const }))].slice(0, 8);
  const first = personName(p).split(/\s+/)[0];

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><ContextPill />
        <RoundButton icon="search" label="Find groups and projects" onPress={() => router.push("/nearby")} /></View>

      {/* Welcome: one photo, one line of what Dasig is, one next step. */}
      <View style={{ marginTop: 14, height: 220, borderRadius: radius.panel, overflow: "hidden", backgroundColor: c.ink }}>
        <Image source={PHOTO.hero} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 140, backgroundImage: "linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.72) 100%)" } as never} />
        <View style={{ position: "absolute", left: 18, right: 18, bottom: 18 }}>
          <Text style={{ fontSize: 26, fontWeight: "700", letterSpacing: -0.5, color: c.white }}>{`Salamat, ${first}.`}</Text>
          <Text style={{ fontSize: 15, lineHeight: 21, color: c.white, marginTop: 4 }}>Dasig helps groups do good work together, and keeps a record of what you helped with.</Text>
        </View>
      </View>

      <Text style={[t.eyebrow, { marginTop: 20, marginBottom: 8, marginHorizontal: 4 }]}>How do you want to start?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 18 }}>
        <Choice photo={PHOTO.help} chip={found?.groups.length ? `${found.groups.length} group${found.groups.length === 1 ? "" : "s"} listed` : "Volunteer"} title="I want to help out" meta="Find a group or project and say “I'm in”" onPress={() => router.push("/nearby")} />
        <Choice photo={PHOTO.run} chip="3 short steps" title="I run a group" meta="Set up your group, a project and its teams" onPress={() => router.push("/start-group")} />
        <Choice photo={PHOTO.invite} chip="Link or code" title="I have an invite" meta="Open the link or code someone sent you" onPress={() => router.push((Platform.OS === "web" ? "/volunteer" : "/scan") as never)} />
      </ScrollView>

      {/* Getting set up: a short checklist with progress, gone once it's all done. */}
      {doneN < steps.length ? <>
        <Text style={[t.eyebrow, { marginTop: 22, marginBottom: 8, marginHorizontal: 4 }]}>{`Get set up · ${doneN} of ${steps.length}`}</Text>
        <Panel>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden", marginTop: 12, marginBottom: 4 }}>
            <View style={{ width: `${(doneN / steps.length) * 100}%`, height: 8, backgroundColor: c.accent }} /></View>
          {steps.map((x, i) => <Row key={x.title} last={i === steps.length - 1} title={x.title} meta={x.done ? "Done" : x.meta}
            left={<View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: x.done ? c.accent : c.sand, alignItems: "center", justifyContent: "center" }}>
              {x.done ? <Icon name="check" size={16} color={c.white} /> : <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent }}>{i + 1}</Text>}</View>}
            onPress={x.done ? undefined : () => router.push(x.go as never)} />)}
        </Panel>
      </> : null}

      {/* Real groups and projects that chose to be found. Left out entirely while there are none. */}
      {listed.length ? <>
        <Text style={[t.eyebrow, { marginTop: 22, marginBottom: 8, marginHorizontal: 4 }]}>Working on Dasig</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 18 }}>
          {listed.map((x) => <Pressable key={`${x.kind}${x.id}`} onPress={() => router.push("/nearby")} style={{ width: 160 }}>
            <View style={{ height: 110, borderRadius: radius.panel, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
              {x.kind === "group" ? <Logo name={x.name ?? "?"} image={x.image} size={56} /> : <IconCircle name="flag" size={56} tone="white" />}</View>
            <Text style={[t.row, { marginTop: 8 }]} numberOfLines={1}>{x.title ?? x.name}</Text>
            <Text style={t.meta} numberOfLines={1}>{x.kind === "project" ? x.groupName ?? "Project" : "Group"}</Text>
          </Pressable>)}
        </ScrollView>
      </> : null}

      {/* What their story will look like: placeholder tiles, honestly labelled. */}
      <Text style={[t.eyebrow, { marginTop: 22, marginBottom: 8, marginHorizontal: 4 }]}>Your story</Text>
      <View style={{ backgroundColor: c.sand, borderRadius: radius.panel, padding: 16 }}>
        <Text style={[t.row, { fontSize: 16 }]}>Starts with your first “I'm in”</Text>
        <Meta>Work you finish shows up here, signed by your group. It's yours to keep, wherever you go.</Meta>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>{[0, 1, 2].map((i) =>
          <View key={i} style={{ width: 78, height: 78, borderRadius: radius.inner, backgroundColor: c.white, opacity: 0.7 - i * 0.18, alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={22} color={c.s300} /></View>)}</View>
      </View>

      <Text style={[t.eyebrow, { marginTop: 22, marginBottom: 8, marginHorizontal: 4 }]}>How Dasig works</Text>
      <Panel>
        <Row left={<IconCircle name="heart" />} title="Say “I'm in”" meta="Take a task; the group sees who's coming" onPress={() => router.push("/help" as never)} />
        <Row left={<IconCircle name="lock" />} title="Recorded when done" meta="Signed by your group, so it can be trusted" onPress={() => router.push("/help" as never)} />
        <Row left={<IconCircle name="download" />} title="Yours to keep" meta="Download your story any time" onPress={() => router.push("/help" as never)} last />
      </Panel>
      <Text style={[t.meta, { fontSize: 11, marginTop: 14, marginHorizontal: 4 }]}>Photos: Wikimedia Commons contributors, CC BY-SA 4.0. Sample pictures, not Dasig groups.</Text>
    </Screen>
  );
}
