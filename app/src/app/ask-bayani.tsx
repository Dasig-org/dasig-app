import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { checkModel, downloadModel, modelMb, modelSpec, pauseDownload, removeModel, updateAvailable, useModel, type ModelSpec } from "@/lib/bayani";
import { AskBox, ModelLine, ProgressBar } from "@/ui/Bayani";
import { Eyebrow, IconCircle, Meta, Outline, Panel, Primary, Row, Screen, Title } from "@/ui/kit";
import { useSnackbar } from "@/ui/Snackbar";
import { c, radius, type as t } from "@/ui/theme";

/**
 * Ask Bayani: answers from the facts library, shown as written with their source; and Bayani-1 on this phone.
 * Bayani-1 is trained on BIX records, not text: it answers its six trained questions about a project's records, and
 * the Bayani sheet (ui/Bayani.tsx, lib/copilot.ts) turns those into suggestions a lead accepts or declines.
 * The download belongs to the app, not this screen (lib/bayani.ts): leave and come back, and it's where it was.
 * "Check that it works" loads the model and answers one question, with timings, or says exactly what went wrong.
 */
const gb = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : `${Math.round(n / 1e6)} MB`);
const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export default function AskBayani() {
  const s = useModel();
  const { show } = useSnackbar();
  const [test, setTest] = useState<{ busy: boolean; result?: string; error?: string }>({ busy: false });
  // A newer Bayani published (a manifest next to its files): offered here, downloaded like the first one.
  const [update, setUpdate] = useState<ModelSpec | null>(null);
  const installed = s.phase === "ready" || s.phase === "loaded" || s.phase === "failed";
  useEffect(() => { let on = true; if (installed) updateAvailable().then((u) => { if (on) setUpdate(u); }).catch(() => {}); return () => { on = false; }; }, [installed]);
  const spec = modelSpec();
  const mb = (x: ModelSpec) => x.files.base.mb + x.files.lora.mb;
  const runCheck = async () => {
    setTest({ busy: true });
    try {
      const r = await checkModel();
      setTest({ busy: false, result: `Works. Started in ${secs(r.loadMs)}${r.loadMs < 300 ? " (already running)" : ""}, answered “${r.answer}” in ${secs(r.answerMs)}.${r.lib ? ` CPU build: ${r.lib.replace(/^rnllama_jni_?/, "") || "generic"}.` : ""}` });
    } catch (e) { setTest({ busy: false, error: e instanceof Error ? e.message : String(e) }); }
  };
  return (
    <Screen back bayani={false}>
      <Title sub="Ask about Dasig, BIX or Bayani and get the answer as written, with its source. On a project or a step, the round button opens Bayani as your copilot: it says what's late and what's missing, and a lead can do it from there.">Ask Bayani</Title>
      <AskBox />

      <Eyebrow>Bayani on this phone</Eyebrow>
      {s.phase === "web" ? <Meta>{"Bayani's model runs in the Android and iPhone apps, not in the browser. The answers above work everywhere."}</Meta>
        : s.phase === "checking" ? null
        : s.phase === "none" ? <Panel>
            <Row left={<IconCircle name="download" />} title="Download Bayani-1" meta={`About ${(modelMb() / 1000).toFixed(1)} GB. Use Wi-Fi. It keeps downloading while you use the app, and continues from where it stopped if the app closes.`} last />
            <View style={{ paddingBottom: 14 }}><Primary label="Download" onPress={() => { void downloadModel(); }} /></View>
          </Panel>
        : s.phase === "downloading" || s.phase === "paused" ? <Panel>
            <Row left={<IconCircle name="download" />} title={s.phase === "downloading" ? `Downloading Bayani-1 · ${Math.min(99, Math.floor((s.got / Math.max(1, s.total)) * 100))}%` : "Download paused"}
              meta={s.phase === "downloading" ? `${gb(s.got)} of ${gb(s.total)}. You can leave this screen or use another app; it keeps going.` : `${gb(s.got)} of ${gb(s.total)}. ${s.why}`} last />
            <View style={{ paddingBottom: 14, gap: 12 }}>
              <ProgressBar share={s.got / Math.max(1, s.total)} />
              {s.phase === "downloading" ? <Outline label="Pause" onPress={() => { void pauseDownload(); }} />
                : <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><Primary label="Continue" onPress={() => { void downloadModel(); }} /></View>
                  <Outline label="Remove" onPress={async () => { await removeModel(); show("Removed the partial download."); }} /></View>}
            </View>
          </Panel>
        : <Panel>
            <Row left={<IconCircle name={s.phase === "failed" ? "pending" : "check"} />} title={s.phase === "failed" ? "Bayani-1 is on this phone, but couldn't start" : "Bayani-1 is on this phone"}
              meta={`${spec.name} ${spec.version}${spec.family ? `, on ${spec.family}` : ""}. For leads, when the group turned on Project memory. On a project or a step it checks usual steps against the ones you have, judges which belong, links steps to your usual steps, suggests a team for steps without one, and at close-out names the steps worth keeping. Each suggestion shows how sure it is; you accept, decline or undo. It also works out what you ask about a project or a step. Offline.`} last />
            <View style={{ paddingBottom: 14, gap: 10 }}>
              <ModelLine />
              {test.result ? <Text style={t.body}>{test.result}</Text> : null}
              {test.error ? <><Text style={t.body}>{"It didn't work:"}</Text><Text style={t.meta} selectable>{test.error}</Text></> : null}
              <Primary label={test.busy ? (s.phase === "loading" ? "Starting Bayani-1…" : "Checking…") : "Check that it works"} disabled={test.busy} onPress={runCheck} />
              {update ? <View style={{ backgroundColor: c.sand, borderRadius: radius.inner, padding: 12, gap: 8 }}>
                <Text style={t.row}>{`A newer Bayani is ready: ${update.version}`}</Text>
                <Meta>{`${update.family ? `On ${update.family}. ` : ""}About ${(mb(update) / 1000).toFixed(1)} GB on Wi-Fi. It replaces the one on this phone.`}</Meta>
                <Primary label="Update Bayani" onPress={async () => { await removeModel(); setUpdate(null); setTest({ busy: false }); void downloadModel(); }} />
              </View> : null}
              <Outline label="Remove it" onPress={async () => { await removeModel(); setTest({ busy: false }); show("Bayani-1 removed from this phone."); }} />
            </View>
          </Panel>}
    </Screen>
  );
}
