import { router } from "expo-router";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { ContextPill } from "@/ui/Context";
import { Eyebrow, IconCircle, Notice, Panel, Row, Screen, Title } from "@/ui/kit";
import { View } from "react-native";

export default function Projects() {
  const s = useSession();
  const { data, error } = useLoad(async () => (s.current ? bix.search("Initiative", { organization: `Organization/${s.current.id}` }) : s.person ? bix.search("Initiative", { person: `Person/${s.person.id}` }) : []), [s.current?.id]);
  return (
    <Screen back>
      <ContextPill /><View style={{ height: 14 }} />
      <Title>Projects</Title>
      {error ? <Notice>{error}</Notice> : null}
      <Panel>
        {(data ?? []).map((p) => <Row key={p.id} left={<IconCircle name="flag" />} title={p.title} meta={p.description} onPress={() => router.push(`/project/${p.id}`)} />)}
        <Row left={<IconCircle name="plus" tone="grey" />} title="Start a project" onPress={() => router.push("/new-project")} last />
      </Panel>
    </Screen>
  );
}
