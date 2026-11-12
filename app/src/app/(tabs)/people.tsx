import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";
import People from "../org/[id]/people";
/** The People tab: the current group's people. In the personal context there's no group, so it shows your groups. */
export default function PeopleTab() {
  const s = useSession();
  return s.current ? <People orgId={s.current.id} /> : <Redirect href={"/groups" as never} />;
}
