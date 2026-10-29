import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { pairUrl } from "@/lib/pairing";
import { getConnection } from "@/lib/connection";
import { bix, type R } from "@/lib/bix";
import { appUrl } from "@/lib/env";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { act, shortRef, stateLabel, teamIcon } from "@/lib/work";
import { Avatar, Buttons, Eyebrow, Faces, Field, IconCircle, Meta, Notice, Outline, Panel, Pill, Primary, Row, Screen, Sheet , Skeleton} from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

/** A team page: roster (lead, members, volunteers), ideas waiting for the lead, the team's work, and its invite link. */
export default function Team() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<null | R[]>(null);
  const { data, error, reload } = useLoad(async () => {
    const team = await bix.get("Team", id);
    const tasks = await bix.search("Task", { team: `Team/${id}` });
    const parts = (team.participant ?? []).filter((p: any) => p.status === "active");
    const people: Record<string, R> = {};
    for (const p of parts) { try { people[p.person.reference] = await bix.get("Person", p.person.reference.split("/")[1]); } catch {} }
    return { team, tasks, parts, people };
  }, [id]);
  if (error) return <Screen onRefresh={reload} back><Notice>{error}</Notice></Screen>;
  if (!data) return <Screen onRefresh={reload} back><Skeleton /></Screen>;
  const { team, tasks, parts, people } = data;
  const name = (ref: string) => people[ref]?.name?.text ?? "Someone";
  const leadsIt = parts.some((p: any) => p.person.reference === me && p.role === "lead");
  const lead = leadsIt || s.isLead;
  const byRole = (r: string) => parts.filter((p: any) => p.role === r).map((p: any) => name(p.person.reference));
  const who = (n: string[]) => (n.length ? <View style={{ width: 54 }}><Faces names={n} /></View> : <View style={{ width: 54 }}><IconCircle name="users" tone="grey" size={30} /></View>);
  const ideas = tasks.filter((x) => x.status === "draft");
  const work = tasks.filter((x) => x.status !== "draft");

  const add = async () => {
    if (!title.trim()) return;
    const task = bix.create("Task", { intent: lead ? "plan" : "proposal", status: lead ? "ready" : "draft", title: title.trim(), owner: { reference: `Team/${id}` }, team: { reference: `Team/${id}` }, partOf: team.initiative, audience: "team",
      ...(lead ? {} : { note: [{ author: { reference: me }, time: new Date().toISOString(), text: "Suggested" }] }) });
    try { await bix.commit(task); setTitle(""); setMsg(lead ? null : "Suggested. Your lead will see it."); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    reload();
  };
  const makeInvite = async () => {
    try {
      const l = await bix.link({ reference: `Team/${id}` }, ["view", "join-team"]);
      const conn = await getConnection();
      if (Platform.OS !== "web" && conn.kind !== "cloud" && l.pairingCode !== undefined) {
        // On a hub: one QR pairs the phone with the hub and joins the team.
        const { localEngine } = await import("@/local/engine");
        const hub = conn.kind === "hub" ? conn.url : await (await localEngine()).startHub();
        setQr(pairUrl({ hub, code: l.pairingCode, link: l.token }));
        setInvite(pairUrl({ hub, code: l.pairingCode, link: l.token }));
      } else setInvite(`${appUrl()}/join/${l.token}`);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  return (
    <Screen onRefresh={reload} back>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name={teamIcon(team.name)} size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{leadsIt ? "You lead it" : s.isLead ? "Your group's team" : "Team"}</Meta><Text style={[t.title, { fontSize: 24 }]}>{team.name}</Text></View></View>
      {lead && ideas.length ? <View style={{ marginTop: 14 }}><Panel>{ideas.map((x, i) => <Row key={x.id} left={<IconCircle name="pen" />} title={x.title} meta={`Suggested by ${name(x.note?.[0]?.author?.reference ?? "")}`}
        right={<Outline label="Accept" onPress={async () => { try { await bix.commit(act.accept(x)); } catch {} reload(); }} />} last={i === ideas.length - 1} />)}</Panel></View> : null}
      <Eyebrow right={lead ? undefined : undefined}>The team</Eyebrow>
      <Panel>
        <Row left={who(byRole("lead"))} title="Lead" meta={byRole("lead").join(", ") || (s.isLead ? "No lead yet · tap to choose" : "No lead yet")}
          onPress={s.isLead ? async () => {
            const org = team.organization?.reference;
            const roles = org ? (await bix.search("Role", { organization: org })).filter((r) => r.status === "active") : [];
            const ps: R[] = [];
            for (const r of roles) { try { ps.push(await bix.get("Person", r.person.reference.split("/")[1])); } catch {} }
            setChoosing(ps);
          } : undefined} />
        <Row left={who(byRole("member"))} title="Members" meta={byRole("member").join(", ") || "None yet"} />
        <Row left={who(byRole("volunteer"))} title="Volunteers" meta={byRole("volunteer").join(", ") || "None yet"} last />
      </Panel>
      <Buttons><Outline flex label="Invite your team" onPress={makeInvite} /></Buttons>
      <Eyebrow right={`${work.filter((x) => x.status === "completed").length} of ${work.length} done`}>Our work</Eyebrow>
      <Panel>
        {work.map((x) => <Row key={x.id} left={<IconCircle name={x.status === "completed" ? "check" : "pen"} tone={x.status === "completed" ? "grey" : "sand"} />} title={x.title}
          meta={[shortRef(x), x.owner?.reference?.startsWith("Person/") ? name(x.owner.reference) : null].filter(Boolean).join(" · ")}
          right={<Pill tone={stateLabel(x, me).tone}>{stateLabel(x, me).label}</Pill>} onPress={() => router.push(`/task/${x.id}`)} />)}
        <View style={{ paddingVertical: 8 }}><Field value={title} onChangeText={setTitle} placeholder={lead ? "Add something to do" : "Suggest something to do"} onSubmitEditing={add} returnKeyType="done" style={{ backgroundColor: c.wash }} /></View>
      </Panel>
      {msg ? <Notice>{msg}</Notice> : null}
      <Sheet open={!!choosing} onClose={() => setChoosing(null)}>
        <Text style={[t.row, { fontSize: 18 }]}>{`Who leads ${team.name}?`}</Text>
        <Meta>Leads hand out work and accept ideas for this team.</Meta>
        <Panel style={{ backgroundColor: c.wash, marginTop: 10 }}>
          {(choosing ?? []).map((p, i) => <Row key={p.id} left={<Avatar name={p.name?.text ?? "?"} />} title={p.name?.text ?? "Someone"} last={i === (choosing?.length ?? 0) - 1}
            onPress={async () => { setChoosing(null); try {
              const others = (team.participant ?? []).filter((x: any) => x.person.reference !== `Person/${p.id}`);
              await bix.commit(bix.next(team, { participant: [...others, { person: { reference: `Person/${p.id}` }, role: "lead", status: "active" }] })); setMsg(`${p.name?.text} now leads ${team.name}.`); reload();
            } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } }} />)}
        </Panel>
      </Sheet>

      <Sheet open={!!invite} onClose={() => { setInvite(null); setQr(null); }}>
        <Text style={[t.row, { fontSize: 18 }]}>{`Invite people to ${team.name}`}</Text>
        <Meta>{qr ? "Have them join this phone's hotspot, then scan this in Dasig (Join a group). It connects them to the hub and adds them to the team." : "Anyone with this link can see the team and join it as a volunteer. You can turn it off later."}</Meta>
        {qr ? <View style={{ alignItems: "center", marginTop: 14 }}><QRCode value={qr} size={200} color={c.ink} backgroundColor={c.white} /></View> : null}
        {qr ? null : <View style={{ backgroundColor: c.wash, borderRadius: 16, padding: 12, marginTop: 12 }}><Text selectable style={{ fontSize: 13, color: c.ink }}>{invite}</Text></View>}
        <Buttons><Primary label={qr ? "Share the code as text" : "Share"} onPress={() => { Share.share({ message: `Join ${team.name} in Dasig: ${invite}` }).catch(() => {}); }} /></Buttons>
      </Sheet>
    </Screen>
  );
}
