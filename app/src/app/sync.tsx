import { useEffect, useState } from "react";
import { Text } from "react-native";
import { flush, pending, type Pending } from "@/lib/outbox";
import { useSession } from "@/lib/session";
import { Buttons, Eyebrow, IconCircle, Meta, Panel, Pill, Primary, Row, Screen, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";
import { ago, useWhere } from "@/ui/Where";
import { onReach, reach } from "@/lib/reach";
import { router } from "expo-router";
import { useSnackbar } from "@/ui/Snackbar";

/** Sync (sketch: P2 #14): what's waiting, where it goes, and anything that couldn't be saved. Never silently dropped. */
export default function Sync() {
  const s = useSession();
  const [items, setItems] = useState<Pending[]>([]);
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const [busy, setBusy] = useState(false);
  const load = () => pending().then(setItems);
  useEffect(() => { load(); }, []);
  const where = s.connection?.kind === "hub" ? "Your group's hub" : s.connection?.kind === "ecosystem" ? "The Bayanihan Network" : s.connection?.kind === "cloud" ? "The online server" : "This phone";
  const w = useWhere();
  const [r, setR] = useState(reach());
  useEffect(() => onReach(setR), []);
  const label = (p: Pending) => `${p.resource.resourceType === "Task" ? (p.resource.status === "completed" ? "Marked done" : p.resource.status === "accepted" ? "Took" : "Changed") : "Added"}: ${p.resource.title ?? p.resource.name ?? p.resource.resourceType}`;
  return (
    <Screen back>
      <Title>Where your records are</Title>
      <Panel><Row left={<IconCircle name={w.icon} tone={w.warn ? "sand" : undefined} />} title={w.text} meta={w.detail} last /></Panel>
      {s.connection?.kind !== "phone" ? <Panel style={{ marginTop: 10 }}>
        <Row left={<IconCircle name="check" tone="grey" />} title="Last reached" meta={ago(r.lastOk)} />
        <Row left={<IconCircle name="wifioff" tone="grey" />} title="Last missed" meta={r.lastFail ? ago(r.lastFail) : "Never"} last={s.connection?.kind !== "hub"} />
        {s.connection?.kind === "hub" ? <Row left={<IconCircle name="wifi" />} title="Pair with a hub again" meta="Scan the hub's QR" onPress={() => router.push("/scan" as never)} last /> : null}
      </Panel> : null}
      <Eyebrow>Changes</Eyebrow>
      <Panel><Row left={<IconCircle name={items.length ? "pending" : "check"} />} title={items.length ? `${items.length} change${items.length === 1 ? "" : "s"} waiting` : "Everything is saved"} meta={`Goes to: ${where}`} last /></Panel>
      {items.length ? <Panel style={{ marginTop: 10 }}>{items.map((p, i) => <Row key={i} left={<IconCircle name="pending" tone="grey" />} title={label(p)} meta={new Date(p.occurredAt).toLocaleString()} right={<Pill>Waiting</Pill>} last={i === items.length - 1} />)}</Panel> : null}
      {s.connection?.kind === "phone" ? <Text style={[t.meta, { marginTop: 12 }]}>On this phone, changes are saved at once. Waiting changes only happen when you&apos;re connected to a hub or the online server.</Text> : null}
      {items.length ? <Buttons><Primary label="Send now" busy={busy} onPress={async () => { setBusy(true); try { const r = await flush(); setMsg(r.refused.length ? `${r.refused.length} couldn't be saved: someone got there first.` : "Sent."); } catch { setMsg("Still can't reach it. We'll keep trying."); } finally { setBusy(false); load(); } }} /></Buttons> : null}
      <Meta>{"\nChanges replay in the order they happened. Anything refused is shown, never quietly dropped."}</Meta>
    </Screen>
  );
}
