import { useState } from "react";
import { Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { setConnection } from "@/lib/connection";
import { ecosystemToken, filesIn } from "@/lib/ecosystem";
import { networkUrl } from "@/lib/env";
import { send } from "@/lib/transport";
import { useSession } from "@/lib/session";
import { Logo } from "./Context";
import { Buttons, IconCircle, Meta, Notice, Outline, Panel, Primary, Row, Sheet } from "./kit";
import { c, type as t } from "./theme";

/**
 * Copy a group from this phone (or its hub) to the Bayanihan Network: first check it isn't already there under another
 * name, then send its files and records. A one-time copy; afterwards the group works on the Bayanihan Network.
 */
export function CopyToEcosystem({ org, open, onClose }: { org: R; open: boolean; onClose: () => void }) {
  const s = useSession();
  const [step, setStep] = useState<"intro" | "similar" | "copying" | "done">("intro");
  const [similar, setSimilar] = useState<R[]>([]);
  const [progress, setProgress] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; kept: number; refused: number; token: string } | null>(null);
  const me = () => ({ id: s.person!.id, name: s.person!.name, credit: s.person!.credit, description: s.person!.description, publicKey: (s.person!.publicKey ?? []).filter((x: any) => x.status === "active") });
  const check = async () => {
    setErr(null);
    const r = await fetch(`${networkUrl}/$similar?${new URLSearchParams({ name: org.name ?? "" })}`).then((x) => x.json()).catch(() => null);
    if (!r) { setErr("Couldn't reach the Bayanihan Network. Check your internet and try again."); return; }
    const others = (r.entry ?? []).map((e: any) => e.resource).filter((x: R) => x.id !== org.id);
    if (others.length) { setSimilar(others); setStep("similar"); } else copy();
  };
  const copy = async () => {
    setStep("copying"); setErr(null);
    try {
      setProgress("Signing in with this phone's key…");
      const token = await ecosystemToken(networkUrl, me());
      setProgress("Reading the group on this phone…");
      const bundle = await bix.exportOrg(org.id);
      const files = [...filesIn(bundle).values()].filter((a) => !a.showsMinors);
      let n = 0;
      for (const a of files) {
        setProgress(`Copying files (${++n} of ${files.length})…`);
        const res = await send("GET", `${a.url}?b64=1`).catch(() => null);
        if (!res?.ok) continue;
        await fetch(`${networkUrl}/$files?b64=1${a.title ? `&title=${encodeURIComponent(a.title)}` : ""}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(await res.json()) }).catch(() => null);
      }
      setProgress("Copying records…");
      const r = await fetch(`${networkUrl}/$import`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(bundle) });
      const out = await r.json();
      if (!r.ok) throw new Error(String(out.error ?? "The Bayanihan Network didn't take the copy."));
      setResult({ ...out, token }); setStep("done");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setStep("intro"); }
  };
  const close = () => { setStep("intro"); setErr(null); onClose(); };
  return <Sheet open={open} onClose={close}>
    {step === "intro" ? <>
      <Text style={[t.row, { fontSize: 18 }]}>{`Copy ${org.name} to the Bayanihan Network`}</Text>
      <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>
        <Row left={<IconCircle name="cloud" tone="white" />} title="Goes online" meta="The group, its people, projects, teams, tasks and files" />
        <Row left={<IconCircle name="lock" tone="white" />} title="Stays on this phone" meta="Photos marked as showing children" />
        <Row left={<IconCircle name="check" tone="white" />} title="Kept as it is" meta="Who can see the group doesn't change" last />
      </Panel>
      <Meta>{"\nA one-time copy. Afterwards, work on the Bayanihan Network; this phone keeps its own copy."}</Meta>
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Copy to the Bayanihan Network" onPress={check} /></Buttons>
    </> : null}
    {step === "similar" ? <>
      <Text style={[t.row, { fontSize: 18 }]}>Is one of these your group?</Text>
      <Meta>Already on the Bayanihan Network. If one is yours, ask to join it there instead of making a second copy.</Meta>
      <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>{similar.map((g, i) => <Row key={g.id} left={<Logo name={g.name ?? "?"} size={40} image={g.image} />} title={g.name}
        meta={(g.extension ?? []).find((x: any) => x.url === "bayanihan:place-text")?.value} last={i === similar.length - 1} />)}</Panel>
      <Buttons><Primary label="Ours is different. Copy it" onPress={copy} /><Outline label="Cancel" onPress={close} /></Buttons>
      <Meta>{"To ask to join one, open Who's working here while connected to the Bayanihan Network."}</Meta>
    </> : null}
    {step === "copying" ? <><Text style={[t.row, { fontSize: 18 }]}>Copying…</Text><Meta>{progress}</Meta></> : null}
    {step === "done" && result ? <>
      <Text style={[t.row, { fontSize: 18 }]}>{`${org.name} is on the Bayanihan Network`}</Text>
      <Meta>{`${result.added} records copied${result.kept ? `, ${result.kept} were already there` : ""}${result.refused ? `, ${result.refused} couldn't be copied` : ""}.`}</Meta>
      <Buttons><Primary label="Open it on the Bayanihan Network" onPress={async () => { await setConnection({ kind: "ecosystem", url: networkUrl, token: result.token }); await s.refresh(); close(); }} /><Outline label="Stay on this phone" onPress={close} /></Buttons>
    </> : null}
    <View style={{ height: 4 }} />
  </Sheet>;
}
