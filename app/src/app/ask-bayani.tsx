import { useEffect, useState } from "react";
import { View } from "react-native";
import { downloadModel, modelDownloaded, modelSupported, MODEL_MB, removeModel } from "@/lib/bayani";
import { AskBox } from "@/ui/Bayani";
import { Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Primary, Row, Screen, Title } from "@/ui/kit";
import { useSnackbar } from "@/ui/Snackbar";

/**
 * Ask Bayani: answers from the facts library, shown as written with their source; and Bayani-1 on this phone.
 * Bayani-1 is trained on BIX records, not text: it answers its six trained questions about a project's records, and
 * the Bayani sheet (ui/Bayani.tsx, lib/copilot.ts) turns those into suggestions a lead accepts or declines.
 */
export default function AskBayani() {
  const [pct, setPct] = useState(0);
  const [has, setHas] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  useEffect(() => { modelDownloaded().then(setHas).catch(() => setHas(false)); }, []);
  const get = async () => {
    setBusy(true); setMsg(null);
    try { setPct(0); await downloadModel(setPct); setHas(await modelDownloaded()); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  return (
    <Screen back bayani={false}>
      <Title sub="Ask about Dasig, BIX or Bayani and get the answer as written, with its source. On a project or a step, the round button opens Bayani as your copilot: it says what's late and what's missing, and a lead can do it from there.">Ask Bayani</Title>
      <AskBox />

      <Eyebrow>Bayani on this phone</Eyebrow>
      {!modelSupported ? <Meta>Bayani's model runs in the Android and iPhone apps, not in the browser. The answers above work everywhere.</Meta>
        : has ? <Panel>
            <Row left={<IconCircle name="check" />} title="Bayani-1 is on this phone" meta="For leads, when the group turned on Project memory. On a project or a step it checks usual steps against the ones you have, judges which belong, links steps to your usual steps, suggests a team for steps without one, and at close-out names the steps worth keeping. Each suggestion shows how sure it is; you accept, decline or undo. Offline." last />
            <View style={{ paddingBottom: 14 }}><Outline label="Remove it" onPress={async () => { await removeModel(); setHas(false); }} /></View>
          </Panel>
        : <Panel>
            <Row left={<IconCircle name="download" />} title="Download Bayani-1" meta={`About ${(MODEL_MB / 1000).toFixed(1)} GB. Use Wi-Fi. In development.`} last />
            <View style={{ paddingBottom: 14 }}><Primary label={busy ? `Downloading… ${Math.round(pct * 100)}%` : "Download"} disabled={busy} onPress={get} /></View>
          </Panel>}
    </Screen>
  );
}
