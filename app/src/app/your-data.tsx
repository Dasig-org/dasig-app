import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { saveJson } from "@/lib/save";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Buttons, Check, Eyebrow, IconCircle, Meta, Notice, Outline, Panel, Row, Screen, Sheet, Title } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** Your data (sketch: trust #3, #4): what's kept, download it, choose what shows, delete your account. Not legal advice. */
const isMinimal = (p: any) => (p?.extension ?? []).some((x: any) => x.url === "bayanihan:profile-visibility" && x.value === "nickname-only");
export default function YourData() {
  const s = useSession();
  const minimal = isMinimal(s.person);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const { data, reload } = useLoad(async () => (s.person ? bix.exportMe(s.person.id) : null), [s.person?.id]);
  const entries = (data?.entry ?? []).map((e) => e.resource);
  const count = (type: string) => entries.filter((r) => r.resourceType === type).length;
  const photos = entries.flatMap((r) => [...(r.attachment ?? []), ...((r.output ?? []).flatMap((o: any) => o.attachment ?? []))]).length;
  const dueDelete = (s.person?.extension ?? []).find((x: any) => x.url === "bayanihan:delete-after")?.value;
  const tile = (icon: any, n: string, label: string) => <View style={{ flex: 1, backgroundColor: c.white, borderRadius: 22, padding: 14, gap: 8 }}><IconCircle name={icon} /><Text style={t.row}>{n}</Text><Meta>{label}</Meta></View>;
  return (
    <Screen back>
      <Title sub="What Dasig keeps about you, and what you can do with it.">Your data</Title>
      <View style={{ flexDirection: "row", gap: 10 }}>{tile("check", `${count("Task")}`, "tasks you were part of")}{tile("users", `${count("Role")}`, "groups")}</View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>{tile("camera", `${photos}`, "files and photos")}{tile("lock", "0", "messages: Bayani reads on your phone only")}</View>
      <Eyebrow>You can always</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="download" />} title="Download everything" meta="In BIX, an open format any app can read" onPress={async () => { if (data) await saveJson("my-dasig-story.bix.json", data); }} />
        <Row left={<IconCircle name="pen" />} title="Change your profile and credit name" onPress={() => router.push("/profile" as never)} />
        <Row left={<IconCircle name="eye" />} title="Only show my nickname" meta={minimal ? "Your groups see your nickname, never your photo or skills" : "Your groups see your nickname, photo and skills"}
          right={<Check on={minimal} onPress={async () => { if (!s.person) return; const rest = (s.person.extension ?? []).filter((x: any) => x.url !== "bayanihan:profile-visibility");
            try { await bix.commit(bix.next(s.person, { extension: minimal ? rest : [...rest, { url: "bayanihan:profile-visibility", value: "nickname-only" }] })); await s.refresh(); } catch {} }} />} />
        <Row left={<IconCircle name="lock" />} title="What you've agreed to" meta="Sharing messages, photos" onPress={() => router.push("/consent" as never)} />
        <Row left={<IconCircle name="pending" tone="grey" />} title={dueDelete ? "Deletion scheduled" : "Delete my account"} meta={dueDelete ? `On ${new Date(dueDelete).toLocaleDateString()}. Tap to cancel.` : undefined}
          onPress={dueDelete ? async () => { await bix.deleteMe(true); await s.refresh(); reload(); setMsg("Cancelled. Your account stays."); } : () => setConfirm(true)} last />
      </Panel>
      {msg ? <Notice>{msg}</Notice> : null}
      <Text style={[t.meta, { marginTop: 12 }]}>Starting points under the Data Privacy Act (RA 10173), not legal advice.</Text>
      <Sheet open={confirm} onClose={() => setConfirm(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Delete your account?</Text>
        <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>
          <Row left={<IconCircle name="users" tone="white" />} title="Your profile and photos are removed" />
          <Row left={<IconCircle name="flag" tone="white" />} title="Groups keep the work, without your name" meta="Shown as “a former volunteer”" />
          <Row left={<IconCircle name="download" tone="white" />} title="Download a copy first?" onPress={async () => { if (data) await saveJson("my-dasig-story.bix.json", data); }} last />
        </Panel>
        <Buttons><Outline flex label="Delete in 14 days" onPress={async () => { setConfirm(false); const r = await bix.deleteMe(); await s.refresh(); reload(); setMsg(`Scheduled for ${new Date(r.deleteAfter!).toLocaleDateString()}. You can cancel until then.`); }} /></Buttons>
        <Text style={[t.meta, { textAlign: "center", marginTop: 8 }]}>You have 14 days to change your mind.</Text>
      </Sheet>
    </Screen>
  );
}
