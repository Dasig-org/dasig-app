import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { bix } from "@/lib/bix";
import { saveJson } from "@/lib/save";
import { Body, Buttons, Notice, Primary, Screen, Title } from "@/ui/kit";

/** Rule 18: a group exports everything it owns, any time, in BIX. */
export default function OrgExport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Screen back>
      <Title>Your group's records</Title>
      <Body>Everything your group owns, with its full history: people, projects, teams, tasks, votes and reports. In BIX, an open format any BIX app can read.</Body>
      <Buttons><Primary label="Download everything" busy={busy} onPress={async () => { setBusy(true); setMsg(null); try { const b = await bix.exportOrg(id); await saveJson("group-records.bix.json", b); setMsg(`${b.entry.length} records saved.`); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } }} /></Buttons>
      {msg ? <Notice>{msg}</Notice> : null}
    </Screen>
  );
}
