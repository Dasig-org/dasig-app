import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Platform, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { bix, now, type R } from "@/lib/bix";
import { getConnection } from "@/lib/connection";
import { appUrl } from "@/lib/env";
import { ROLE_WORDS } from "@/lib/org";
import { pairUrl } from "@/lib/pairing";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { teamIcon } from "@/lib/work";
import { Avatar, Buttons, Chips, Eyebrow, Field, IconCircle, Meta, Nav, Notice, Outline, Panel, Pill, Primary, Row, Screen, Sheet, Tip, Title } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

const ROLES = [{ value: "officer", label: "Officer" }, { value: "core-member", label: "Core member" }, { value: "member", label: "Member" }, { value: "volunteer-regular", label: "Regular volunteer" }, { value: "volunteer-episodic", label: "Volunteer" }] as const;

/** People: everyone in the group, their role and position; invite, add by nickname, approve requests, change roles, add to teams. */
export default function People() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [inviting, setInviting] = useState<{ text: string; qr?: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [nick, setNick] = useState("");
  const [role, setRole] = useState<string>("volunteer-episodic");
  const [open, setOpen] = useState<{ role: R; person: R | null } | null>(null);
  const { data, reload } = useLoad(async () => {
    const roles = await bix.search("Role", { organization: `Organization/${id}` });
    const [positions, projects] = await Promise.all([bix.search("Position", { organization: `Organization/${id}` }), bix.search("Initiative", { organization: `Organization/${id}` })]);
    const teams = (await Promise.all(projects.map((p) => bix.search("Team", { initiative: `Initiative/${p.id}` })))).flat();
    const people: Record<string, R> = {};
    for (const r of roles) { try { people[r.person.reference] = await bix.get("Person", r.person.reference.split("/")[1]); } catch {} }
    return { roles, positions, teams, people };
  }, [id]);
  const manage = s.groups.some((g) => g.org.id === id && ["officer"].includes(g.role.code?.code)) || s.isLead;
  const name = (r: R) => data?.people[r.person.reference]?.name?.text ?? "Someone";
  const act = async (fn: () => Promise<unknown>, ok?: string) => { setMsg(null); try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } reload(); };

  const invite = async () => act(async () => {
    const l = await bix.link({ reference: `Organization/${id}` }, ["view", "join-org"]);
    const conn = await getConnection();
    if (Platform.OS !== "web" && conn.kind !== "cloud" && l.pairingCode !== undefined) {
      const { localEngine } = await import("@/local/engine");
      const hub = conn.kind === "hub" ? conn.url : await (await localEngine()).startHub();
      const u = pairUrl({ hub, code: l.pairingCode, link: l.token });
      setInviting({ text: u, qr: u });
    } else setInviting({ text: `${appUrl()}/join/${l.token}` });
  });
  const addByNickname = () => act(async () => {
    const person = bix.create("Person", { name: { text: nick.trim(), use: "nickname" }, credit: "nickname", managedBy: { reference: `Organization/${id}` }, sharing: "organization" });
    const r = bix.create("Role", { person: { reference: `Person/${person.id}` }, organization: { reference: `Organization/${id}` }, code: { system: "bayanihan:role", code: role }, status: "active", period: { start: now() } });
    await bix.commit(person, r); setNick(""); setAdding(false);
  }, `${nick.trim()} added. They can claim their record later by joining with your invite.`);

  const active = (data?.roles ?? []).filter((r) => r.status === "active");
  const requests = (data?.roles ?? []).filter((r) => r.status === "requested");
  const byRole = (codes: string[]) => active.filter((r) => codes.includes(r.code?.code));
  const pos = (r: R) => data?.positions.find((p) => `Position/${p.id}` === r.position?.reference)?.title;
  const list = (title: string, rs: R[]) => rs.length ? <><Eyebrow right={`${rs.length}`}>{title}</Eyebrow><Panel>
    {rs.map((r, i) => <Row key={r.id} left={<Avatar name={name(r)} />} title={name(r)} meta={[pos(r), ROLE_WORDS[r.code?.code] ?? "", data?.people[r.person.reference]?.managedBy ? "added by the group" : ""].filter(Boolean).join(" · ")}
      onPress={manage ? () => setOpen({ role: r, person: data?.people[r.person.reference] ?? null }) : undefined} last={i === rs.length - 1} />)}
  </Panel></> : null;

  return (
    <Screen bottom={<Nav active="people" />}>
      <Title sub={s.current?.name}>People</Title>
      <Tip id="people" title="Everyone counts">Volunteers are part of your group, not a list beside it. Add them, give them roles, and put them on teams. They can always see and take their own story.</Tip>
      {manage ? <Buttons><Primary label="Invite people" onPress={invite} /><Outline label="Add by name" onPress={() => setAdding(true)} /></Buttons> : null}
      {msg ? <Notice>{msg}</Notice> : null}
      {requests.length && manage ? <><Eyebrow right={`${requests.length}`}>Asking to join</Eyebrow><Panel>
        {requests.map((r, i) => <Row key={r.id} left={<Avatar name={name(r)} />} title={name(r)} meta="Wants to join as a volunteer" last={i === requests.length - 1}
          right={<View style={{ flexDirection: "row", gap: 6 }}><Outline label="Accept" onPress={() => act(() => bix.commit(bix.next(r, { status: "active", period: { start: now() } })))} /></View>} />)}
      </Panel></> : null}
      {list("Officers", byRole(["officer"]))}
      {list("Core members", byRole(["core-member"]))}
      {list("Members", byRole(["member"]))}
      {list("Volunteers", byRole(["volunteer-regular", "volunteer-episodic"]))}

      <Sheet open={!!inviting} onClose={() => setInviting(null)}>
        <Text style={[t.row, { fontSize: 18 }]}>{`Invite people to ${s.current?.name ?? "your group"}`}</Text>
        <Meta>{inviting?.qr ? "They join this phone's hotspot, then scan this in Dasig (I have an invite). They join as volunteers; you can change their role." : "Anyone with this link can join as a volunteer. Turn it off any time in Links and safety."}</Meta>
        {inviting?.qr ? <View style={{ alignItems: "center", marginTop: 14 }}><QRCode value={inviting.qr} size={200} color={c.ink} backgroundColor={c.white} /></View>
          : <View style={{ backgroundColor: c.wash, borderRadius: 16, padding: 12, marginTop: 12 }}><Text selectable>{inviting?.text}</Text></View>}
        <Buttons><Primary label="Share" onPress={() => { Share.share({ message: inviting?.text ?? "" }).catch(() => {}); }} /></Buttons>
      </Sheet>
      <Sheet open={adding} onClose={() => setAdding(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Add someone by name</Text>
        <Meta>For people without the app yet. You can record their work; they can claim it later.</Meta>
        <Field label="Nickname" value={nick} onChangeText={setNick} placeholder="e.g. Liza" autoFocus />
        <Chips options={[...ROLES]} value={role as never} onChange={(v) => setRole(v)} />
        <Buttons><Primary label="Add" onPress={addByNickname} disabled={!nick.trim()} /></Buttons>
      </Sheet>
      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open ? <>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><Avatar name={name(open.role)} size={44} /><View><Text style={[t.row, { fontSize: 18 }]}>{name(open.role)}</Text><Meta>{open.person?.description ?? ""}</Meta></View></View>
          <Eyebrow>Role</Eyebrow>
          <Chips options={[...ROLES]} value={open.role.code?.code} onChange={(v) => { act(() => bix.commit(bix.next(open.role, { code: { system: "bayanihan:role", code: v } }))); setOpen(null); }} />
          {data?.positions.length ? <><Eyebrow>Position</Eyebrow>
            <Chips options={[{ value: "", label: "None" }, ...data.positions.map((p) => ({ value: `Position/${p.id}`, label: p.title }))]} value={open.role.position?.reference ?? ""}
              onChange={(v) => { act(() => bix.commit(bix.next(open.role, { position: v ? { reference: v } : undefined }))); setOpen(null); }} /></> : null}
          {data?.teams.length ? <><Eyebrow>Add to a team</Eyebrow><Panel style={{ backgroundColor: c.wash }}>
            {data.teams.map((tm) => { const on = (tm.participant ?? []).some((p: any) => p.person.reference === open.role.person.reference && p.status === "active");
              return <Row key={tm.id} left={<IconCircle name={teamIcon(tm.name)} tone="white" />} title={tm.name} right={on ? <Pill tone="state">On it</Pill> : <Pill>Add</Pill>}
                onPress={on ? undefined : () => { act(() => bix.commit(bix.next(tm, { participant: [...(tm.participant ?? []), { person: open.role.person, role: open.role.code?.code?.startsWith("volunteer") ? "volunteer" : "member", status: "active" }] })), `Added to ${tm.name}.`); setOpen(null); }} />; })}
          </Panel></> : null}
          <Buttons><Outline flex label="Remove from the group" onPress={() => { act(() => bix.commit(bix.next(open.role, { status: "ended", period: { ...(open.role.period ?? {}), end: now() } })), "Removed. Their past work stays in the group's history and their story."); setOpen(null); }} /></Buttons>
        </> : null}
      </Sheet>
    </Screen>
  );
}
