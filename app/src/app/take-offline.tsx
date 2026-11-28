import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { can } from "@/lib/capabilities";
import { useSession } from "@/lib/session";
import { awayGroup, bringBackOnline, takeOffline } from "@/lib/handover";
import { Body, Buttons, Eyebrow, IconCircle, Notice, Panel, Primary, Row, Screen, Title } from "@/ui/kit";

/**
 * Take the group offline, and bring it back (BIX "Taking a group to a hub and back"). For a lead heading somewhere
 * with weak signal: this phone becomes the group's hub, members join it, and everything goes back online in one step.
 */
export default function TakeOffline() {
  return can.hub ? <TakeOfflineScreen /> : <Redirect href={"/home" as never} />;
}

function TakeOfflineScreen() {
  const s = useSession();
  const [away, setAway] = useState<Awaited<ReturnType<typeof awayGroup>> | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => { awayGroup().then(setAway).catch(() => setAway(null)); }, []);
  const go = async () => {
    if (!s.current || !s.person) return;
    setBusy(true); setErr(null);
    try { await takeOffline({ id: s.current.id, name: s.current.name }, s.person); await s.refresh(); router.replace("/hub" as never); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const back = async () => {
    setBusy(true); setErr(null);
    try {
      const out = await bringBackOnline(); await s.refresh(); setAway(null);
      setDone(out.refused.length ? `Back online. ${out.kept} changes saved; ${out.refused.length} couldn't be, and are listed in Sync.` : `Back online. ${out.kept} changes saved on the Bayanihan Network.`);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  if (away === undefined) return <Screen back><Title>Working offline</Title></Screen>;
  if (away) return (
    <Screen back>
      <Title sub={`${away.name} is on this phone. Members nearby work through it.`}>Bring the group back online</Title>
      <Body>When this phone has signal again, send everything the group did here to the Bayanihan Network. Members can then go back to the Network on their phones.</Body>
      <Buttons><Primary label="Bring it back online" busy={busy} onPress={back} /></Buttons>
      <Panel><Row left={<IconCircle name="users" />} title="Show the hub's code" meta="For members who still need to join" onPress={() => router.push("/hub" as never)} last /></Panel>
      {err ? <Notice>{err}</Notice> : null}
    </Screen>
  );
  return (
    <Screen back>
      <Title sub="For a venue, a barangay or anywhere with weak signal.">Take {s.current?.name ?? "your group"} offline</Title>
      {done ? <Notice>{done}</Notice> : null}
      <Eyebrow>What happens</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="download" />} title="1. This phone copies the group" meta="Needs internet once, now" />
        <Row left={<IconCircle name="wifioff" />} title="2. Members join this phone" meta="Over its hotspot, by scanning its code. No internet needed." />
        <Row left={<IconCircle name="cloud" />} title="3. Bring it back online" meta="Everything done here goes to the Bayanihan Network" last />
      </Panel>
      <Body>While the group is on this phone, the Bayanihan Network keeps it read-only. Changes members make elsewhere wait on their phones until you bring it back.</Body>
      {s.isLead ? <Buttons><Primary label="Take the group offline" busy={busy} onPress={go} /></Buttons> : <Notice>Only the group&apos;s officers can take it offline.</Notice>}
      {err ? <Notice>{err}</Notice> : null}
    </Screen>
  );
}
