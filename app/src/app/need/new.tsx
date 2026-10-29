import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { bix } from "@/lib/bix";
import { parseDate, quick } from "@/lib/dates";
import { Buttons, Check, Chips, Eyebrow, Field, IconCircle, Notice, Panel, Primary, Row, Screen, Title } from "@/ui/kit";
import { c } from "@/ui/theme";

const KINDS = [{ value: "goods", label: "Goods" }, { value: "venue", label: "A venue" }, { value: "skill", label: "A skill" }, { value: "people", label: "People" }, { value: "transport", label: "Transport" }, { value: "money", label: "Money" }] as const;
const UNITS = ["piece", "box", "pack", "sack", "kg", "L", "person", "PHP"] as const;

/** Post a need (BIX Need): what, how many, by when; open to offers. */
export default function NewNeed() {
  const { project } = useLocalSearchParams<{ project: string }>();
  const [what, setWhat] = useState("");
  const [kind, setKind] = useState<string>("goods");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<string>("piece");
  const [by, setBy] = useState<string | null>(null);
  const [byText, setByText] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [open, setOpen] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const post = async () => {
    setBusy(true); setErr(null);
    try {
      const n = Number(qty);
      const need = bix.create("Need", { initiative: { reference: `Initiative/${project}` }, category: { system: "bayanihan:category", code: kind, display: what.trim() },
        ...(n > 0 ? { quantity: { value: n, unit }, received: { value: 0, unit } } : {}), ...(by || parseDate(byText) ? { neededBy: by ?? parseDate(byText) } : {}),
        priority: urgent ? "urgent" : "routine", status: "open", sharing: open ? "public" : "organization" });
      await bix.commit(need);
      router.replace(`/need/${need.id}` as never);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen back>
      <Title>What do you need?</Title>
      <Field label="What" value={what} onChangeText={setWhat} placeholder="e.g. Bottled water for runners" />
      <Chips options={[...KINDS]} value={kind} onChange={setKind} />
      {kind !== "venue" && kind !== "skill" ? <><Field label="How many (optional)" value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="e.g. 300" />
        <Chips options={UNITS.map((u) => ({ value: u, label: u }))} value={unit} onChange={setUnit} /></> : null}
      <Eyebrow>By when</Eyebrow>
      <Chips options={[...quick().map((q) => ({ value: q.iso, label: q.label })), { value: "", label: "Pick a date" }]} value={by ?? ""} onChange={(v) => setBy(v || null)} />
      {!by ? <Field value={byText} onChangeText={setByText} placeholder="e.g. 2027-03-01" /> : null}
      <Eyebrow>Options</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="eye" />} title="Anyone can offer" meta="Shown on your public page" right={<Check on={open} onPress={() => setOpen(!open)} />} />
        <Row left={<IconCircle name="pending" />} title="Urgent" meta="Use only when it really is" right={<Check on={urgent} onPress={() => setUrgent(!urgent)} />} last />
      </Panel>
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Post the need" onPress={post} busy={busy} disabled={!what.trim()} /></Buttons>
      <Text style={{ color: c.s500, fontSize: 13, marginTop: 10, textAlign: "center" }}>People who see your project can offer to help.</Text>
    </Screen>
  );
}
