import { router } from "expo-router";
import { useSession } from "@/lib/session";
import { ROLE_WORDS } from "@/lib/org";
import { Logo } from "@/ui/Context";
import { Eyebrow, IconCircle, Nav, Panel, Row, Screen, Title } from "@/ui/kit";

export default function Groups() {
  const s = useSession();
  return (
    <Screen bottom={<Nav active="groups" />}>
      <Title>Your groups</Title>
      <Panel>
        {s.groups.map((g) => <Row key={g.org.id} left={<Logo name={g.org.name} size={40} />} title={g.org.name} meta={ROLE_WORDS[g.role.code?.code] ?? "Member"} onPress={() => { s.setCurrent(g.org); router.push(`/org/${g.org.id}` as never); }} />)}
        <Row left={<IconCircle name="camera" />} title="Join a group" meta="Scan a code or open a link" onPress={() => router.push("/volunteer" as never)} />
        <Row left={<IconCircle name="flag" />} title="Start a group" onPress={() => router.push("/start-group")} last />
      </Panel>
      <Eyebrow>Projects</Eyebrow>
      <Panel><Row left={<IconCircle name="flag" />} title="See projects" onPress={() => router.push("/projects")} last /></Panel>
    </Screen>
  );
}
