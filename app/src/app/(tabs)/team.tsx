import { Redirect, router } from "expo-router";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Buttons, IconCircle, Panel, Primary, Row, Screen, Skeleton, Title } from "@/ui/kit";
/** The Team tab (team leads): opens the team you lead in the current group. */
export default function TeamTab() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data } = useLoad(async () => {
    if (!s.current) return { team: null };
    const projects = await bix.search("Initiative", { organization: `Organization/${s.current.id}` });
    const teams = (await Promise.all(projects.filter((p) => p.status !== "completed" && p.status !== "cancelled").map((p) => bix.search("Team", { initiative: `Initiative/${p.id}` })))).flat();
    return { team: teams.find((t) => (t.participant ?? []).some((p: any) => p.person.reference === me && p.status === "active" && p.role === "lead"))
      ?? teams.find((t) => (t.participant ?? []).some((p: any) => p.person.reference === me && p.status === "active")) ?? null };
  }, [s.current?.id]);
  if (!data) return <Screen><Skeleton /></Screen>;
  if (data.team) return <Redirect href={`/team/${data.team.id}` as never} />;
  return <Screen>
    <Title sub={s.current?.name}>Team</Title>
    <Panel><Row left={<IconCircle name="users" />} title="You're not on a team here yet" meta="Teams are inside each project. Open one and ask to join a team." last /></Panel>
    <Buttons><Primary label="See projects" onPress={() => router.push("/projects" as never)} /></Buttons>
  </Screen>;
}
