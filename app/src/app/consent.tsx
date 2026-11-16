import { router } from "expo-router";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { Check, IconCircle, Panel, Row, Screen, Title } from "@/ui/kit";
import { useSnackbar } from "@/ui/Snackbar";

const isMinimal = (p: any) => (p?.extension ?? []).some((x: any) => x.url === "bayanihan:profile-visibility" && x.value === "nickname-only");

/**
 * What others can see of you: only choices the app and the server act on today (audit 2026-11-16, D109). The switches
 * for photos of you, contact and sharing messages were recorded as BIX Consent but nothing read them; they come back
 * when something does. Consent records already saved are untouched.
 */
export default function ConsentScreen() {
  const s = useSession();
  const { show } = useSnackbar();
  const minimal = isMinimal(s.person);
  const credit = s.person?.credit === "anonymous" ? "Anonymous" : s.person?.credit === "full" ? "As your full name" : "As your nickname";
  const toggle = async () => {
    if (!s.person) return;
    const rest = (s.person.extension ?? []).filter((x: any) => x.url !== "bayanihan:profile-visibility");
    try { await bix.commit(bix.next(s.person, { extension: minimal ? rest : [...rest, { url: "bayanihan:profile-visibility", value: "nickname-only" }] })); await s.refresh(); }
    catch (e) { show(e instanceof Error ? e.message : String(e), { error: true }); }
  };
  return (
    <Screen back>
      <Title sub="What others can see of you. Change any of these at any time.">What you&apos;ve agreed to</Title>
      <Panel>
        <Row left={<IconCircle name="heart" />} title="Your name in credits" meta={credit} onPress={() => router.push("/profile" as never)} />
        <Row left={<IconCircle name="eye" />} title="Only show my nickname" meta={minimal ? "Your groups see your nickname, never your photo or skills" : "Your groups see your nickname, photo and skills"} right={<Check on={minimal} onPress={toggle} />} />
        <Row left={<IconCircle name="camera" />} title="Photos that show children" meta="Mark them when you add them. They never leave the group." last />
      </Panel>
    </Screen>
  );
}
