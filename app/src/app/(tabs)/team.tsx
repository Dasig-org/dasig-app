import { Redirect } from "expo-router";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Notice, Screen, Skeleton } from "@/ui/kit";
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
  return data.team ? <Redirect href={`/team/${data.team.id}` as never} /> : <Screen><Notice>You're not on a team in this group yet.</Notice></Screen>;
}
