import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { personHours } from "@bayanihan/core/figures";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { personName, shortRef } from "@/lib/work";
import { Avatar, Body, Buttons, Eyebrow, IconCircle, LinkText, Meta, Notice, Outline, Panel, Primary, Row, Screen, ScreenTitle, Sheet } from "@/ui/kit";
import { Count } from "@/ui/m3";
import { openSite } from "@/ui/About";
import { c, radius, type as t } from "@/ui/theme";

/** Your story: finished work across every group, with its proof. Settings are one tap away (app/settings.tsx). */
export default function Story() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data } = useLoad(async () => {
    if (!me) return null;
    const done = (await bix.search("Task", { participant: me })).filter((x) => x.status === "completed");
    // Hours by the BIX counting order (own period, own hours, the shift, the estimate), only this person's share.
    const hours = done.reduce((h, x) => { const mine = ((x.participant ?? []) as any[]).find((y) => y.status === "active" && y.person.reference === me); return h + (mine ? personHours(x, mine) : 0); }, 0);
    // Check each item's signature for real, rather than saying "signed" on trust.
    const checks: Record<string, { allValid: boolean; when?: string; by?: string }> = {};
    await Promise.all(done.slice(0, 8).map(async (x) => { try { const v = await bix.verify("Task", x.id); checks[x.id] = { allValid: v.allValid, when: v.signatures.at(-1)?.when, by: v.signatures.at(-1)?.signedBy }; } catch {} }));
    return { done, hours, checks };
  }, [me]);
  const [proof, setProof] = useState<any>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const saveProof = async (x: any) => { try { const b = await bix.proof("Task", x.id); const { saveJson } = await import("@/lib/save"); await saveJson(`dasig-proof-${shortRef(x) ?? x.id}.json`, b); setSaved("Saved. Anyone can check it at bayanihan.dasig.org/trust/check."); } catch (e) { setSaved(e instanceof Error ? e.message : String(e)); } };
  const [all, setAll] = useState(false);
  const done = data?.done ?? [];
  const shown = all ? done : done.slice(0, 3);
  // Big number over a small label; three share one card, separated by hairlines.
  const stat = (n: number, label: string, first?: boolean) => <View style={{ flex: 1, alignItems: "center", paddingVertical: 14, borderLeftWidth: first ? 0 : StyleSheet.hairlineWidth, borderLeftColor: c.s300 }}>
    <Count value={n} style={{ fontSize: 24, fontWeight: "700", color: c.ink }} /><Text style={[t.meta, { marginTop: 2 }]}>{label}</Text></View>;
  return (
    <Screen>
      <ScreenTitle>You</ScreenTitle>
      {/* 1 · Who you are, with the one thing you'd do here: edit it. */}
      <View style={{ alignItems: "center", marginTop: 4 }}>
        <Avatar name={personName(s.person)} size={96} photo={s.person?.photo} />
        <Text style={[t.title, { marginTop: 12, textAlign: "center" }]}>{personName(s.person)}</Text>
        {s.person?.description ? <Text style={[t.body, { textAlign: "center", marginTop: 2 }]} numberOfLines={2}>{s.person.description}</Text> : null}
        <View style={{ marginTop: 12 }}><Outline label="Edit profile" onPress={() => router.push("/profile" as never)} /></View>
      </View>
      {/* 2 · What you've given: one card, three numbers. */}
      <View style={{ flexDirection: "row", backgroundColor: c.white, borderRadius: radius.panel, marginTop: 18 }}>
        {stat(done.length, "things done", true)}{stat(Math.round(data?.hours ?? 0), "hours")}{stat(s.groups.length, "groups")}
      </View>
      {/* 3 · Where to go: always above the fold, never under the list of done work. */}
      <Eyebrow>Account</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="swap" />} title="Settings" meta="Account, appearance, your data, help" onPress={() => router.push("/settings" as never)} />
        <Row left={<IconCircle name="users" />} title="Your groups" meta={s.groups.length ? `${s.groups.length} group${s.groups.length === 1 ? "" : "s"}` : "Join or start one"} onPress={() => router.push("/groups" as never)} last />
      </Panel>
      {/* 4 · Your record: the three latest, the rest on request. */}
      <Eyebrow right={done.length > 3 ? (all ? "Show less" : `Show all ${done.length}`) : done.length ? `${done.length}` : undefined} onRightPress={done.length > 3 ? () => setAll(!all) : undefined}>Done</Eyebrow>
      <Panel>{shown.map((x, i, list) => <Row key={x.id} left={<IconCircle name={data?.checks[x.id]?.allValid ? "lock" : "check"} />} title={x.title}
        meta={[shortRef(x), data?.checks[x.id]?.allValid ? "Signed" : "Recorded"].filter(Boolean).join(" · ")} onPress={() => setProof(x)} last={i === list.length - 1} />)}
        {!done.length ? <Row title="Nothing yet" meta="Work you finish shows up here, signed by your group." last /> : null}</Panel>
      <Sheet open={!!proof} onClose={() => { setProof(null); setSaved(null); }}>
        {proof ? <>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><IconCircle name={data?.checks[proof.id]?.allValid ? "lock" : "check"} size={48} />
            <View style={{ flex: 1 }}><Text style={[t.row, { fontSize: 18 }]}>{proof.title}</Text><Meta>{shortRef(proof) ?? ""}</Meta></View></View>
          <View style={{ marginTop: 12 }}><Body>{data?.checks[proof.id]?.allValid
            ? `Signed by your group${data.checks[proof.id]!.when ? ` on ${new Date(data.checks[proof.id]!.when!).toLocaleDateString()}` : ""}, and unchanged since. Anyone you share the proof with can check it, without signing in.`
            : "Recorded by your group. It hasn't been signed yet, so there's no proof to share."}</Body></View>
          {saved ? <Notice>{saved}</Notice> : null}
          <Buttons>{data?.checks[proof.id]?.allValid ? <Primary label="Save the proof" onPress={() => saveProof(proof)} /> : null}<Outline flex label="Open the task" onPress={() => { setProof(null); router.push(`/task/${proof.id}`); }} /></Buttons>
          {data?.checks[proof.id]?.allValid ? <View style={{ marginTop: 10, alignItems: "center" }}><LinkText onPress={() => openSite("/trust/check")}>How others check it</LinkText></View> : null}
        </> : null}
      </Sheet>
    </Screen>
  );
}
