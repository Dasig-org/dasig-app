import { useEffect, useState } from "react";
import { Linking, Text } from "react-native";
import { ask, downloadModel, modelDownloaded, modelSupported, MODEL_MB, removeModel } from "@/lib/bayani";
import { Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Primary, Row, Sand, Screen, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";

const EXAMPLES = ["What is BIX?", "Does it work without signal?", "Who are you?", "Is our data used to train AI?"];

/** Ask Bayani: answers from the facts library, shown as written with their source; and Bayani-1 on this phone. */
export default function AskBayani() {
  const [q, setQ] = useState("");
  const found = q.trim().length > 2 ? ask(q) : [];
  const [has, setHas] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { modelDownloaded().then(setHas).catch(() => setHas(false)); }, []);
  const get = async () => {
    setBusy(true); setMsg(null);
    try { await downloadModel(); setHas(await modelDownloaded()); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  return (
    <Screen back>
      <Title sub="Answers come from Dasig's facts, word for word, with where they come from.">Ask Bayani</Title>
      <Field icon="spark" placeholder="Ask about Dasig, BIX or Bayani" value={q} onChangeText={setQ} autoCorrect={false} />
      {q.trim().length > 2 ? (found.length ? found.map((f, i) => (
        <Panel key={f.fact.id}>
          <Row left={<IconCircle name="spark" tone="bayani" />} title={f.fact.questions[0] ?? ""} meta={i === 0 ? "Best match" : "Also related"} last />
          <Text style={[t.body, { marginTop: 4 }]}>{f.fact.answer}</Text>
          <Meta>{`\nFrom ${f.fact.source.replace("https://", "")} · checked ${f.fact.updated}`}</Meta>
          <Outline label="Open the page" onPress={() => Linking.openURL(f.fact.source)} />
        </Panel>
      )) : <Sand><Text style={t.body}>I don't know that yet. I can answer questions about Dasig, BIX and Bayani, and help with your group's projects.</Text></Sand>)
        : <Panel>{EXAMPLES.map((x, i) => <Row key={x} left={<IconCircle name="spark" />} title={x} onPress={() => setQ(x)} last={i === EXAMPLES.length - 1} />)}</Panel>}

      <Eyebrow>Bayani on this phone</Eyebrow>
      {!modelSupported ? <Meta>Bayani's model runs in the Android and iPhone apps, not in the browser. The answers above work everywhere.</Meta>
        : has ? <Panel>
            <Row left={<IconCircle name="check" />} title="Bayani-1 is on this phone" meta="It checks project suggestions against steps you already have, worded differently. Works offline." last />
            <Outline label="Remove it" onPress={async () => { await removeModel(); setHas(false); }} />
          </Panel>
        : <Panel>
            <Row left={<IconCircle name="download" />} title="Download Bayani-1" meta={`About ${(MODEL_MB / 1000).toFixed(1)} GB. Use Wi-Fi. In development.`} last />
            <Primary label={busy ? "Downloading…" : "Download"} busy={busy} disabled={busy} onPress={get} />
          </Panel>}
      {msg ? <Notice>{msg}</Notice> : null}
    </Screen>
  );
}
