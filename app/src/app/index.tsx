import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";
import { Loading } from "@/ui/kit";

export default function Index() {
  const s = useSession();
  if (!s.ready) return <Loading />;
  if (!s.person) return <Redirect href="/welcome" />;
  return <Redirect href={s.groups.length ? "/home" : "/doors"} />;
}
