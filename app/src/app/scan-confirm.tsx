import { Redirect, router, useLocalSearchParams } from "expo-router";
import { can } from "@/lib/capabilities";
import { useState } from "react";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { Body, Buttons, Field, Notice, Primary, Screen, Title } from "@/ui/kit";

export default function ScanConfirm() {
  // Phones only: a browser can't be or reach a hub (lib/capabilities).
  return can.hub ? <ScanConfirmScreen /> : <Redirect href={"/volunteer" as never} />;
}

function ScanConfirmScreen() {
  const p = useLocalSearchParams<{ hub?: string; code?: string; link?: string }>();
  const s = useSession();
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    if (!p.hub || !p.code) return;
    setBusy(true); setErr(null);
    try {
      await s.pairWithHub(p.hub, p.code, nick.trim() || undefined);
      if (p.link) { const team = await bix.joinByLink(p.link); await s.refresh(); router.replace(`/team/${team.id}`); } else router.replace("/home");
    } catch (e) { setErr(e instanceof Error ? `${e.message}. Are you on the hub's hotspot?` : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <Title>{p.link ? "Join the team on this hub" : "Connect to this hub"}</Title>
      <Body>{p.hub ?? ""}</Body>
      {!s.person ? <Field label="What should we call you?" value={nick} onChangeText={setNick} placeholder="e.g. Mia" /> : null}
      <Buttons><Primary label="Connect" busy={busy} disabled={!s.person && !nick.trim()} onPress={go} /></Buttons>
      {err ? <Notice>{err}</Notice> : null}
    </Screen>
  );
}
