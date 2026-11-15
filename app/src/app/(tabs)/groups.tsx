import { router } from "expo-router";
import { Text } from "react-native";
import { useSession } from "@/lib/session";
import { ROLE_WORDS } from "@/lib/org";
import { Logo } from "@/ui/Context";
import { Eyebrow, IconCircle, Panel, Row, Screen, Title } from "@/ui/kit";
import { tone } from "@/ui/theme";

/**
 * Your groups (tab). Review 2026-11-15: it ended in "See projects", which duplicated the Projects tab. Now: your groups,
 * the one you're in marked; then the ways to add one (join, start, find one nearby).
 */
export default function Groups() {
  const s = useSession();
  return (
    <Screen>
      <Title sub={s.groups.length ? `${s.groups.length} group${s.groups.length === 1 ? "" : "s"}. Open one to see its page and switch to it.` : "Join a group, or start one."}>Your groups</Title>
      {s.groups.length ? <Panel>
        {s.groups.map((g, i) => { const here = s.current?.id === g.org.id;
          return <Row key={g.org.id} left={<Logo name={g.org.name} size={40} image={g.org.image} />} title={g.org.name} meta={ROLE_WORDS[g.role.code?.code] ?? "Member"} last={i === s.groups.length - 1}
            right={here ? <Text style={{ fontSize: 12, fontWeight: "800", color: tone.onPrimaryContainer, backgroundColor: tone.primaryContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" }}>You're here</Text> : undefined}
            onPress={() => { s.setCurrent(g.org); router.push(`/org/${g.org.id}` as never); }} />; })}
      </Panel> : null}
      <Eyebrow>Add a group</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="camera" />} title="Join a group" meta="Scan a code or open a link" onPress={() => router.push("/volunteer" as never)} />
        <Row left={<IconCircle name="pin" />} title="Find one near you" meta="Groups that chose to be found" onPress={() => router.push("/nearby" as never)} />
        <Row left={<IconCircle name="flag" />} title="Start a group" meta="For your club, school, parish or barangay" onPress={() => router.push("/start-group")} last />
      </Panel>
    </Screen>
  );
}
