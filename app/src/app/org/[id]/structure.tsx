import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Buttons, Check, Eyebrow, Faces, Field, IconCircle, Meta, Notice, Panel, Primary, Row, Screen, Sheet, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";
import { useSnackbar } from "@/ui/Snackbar";

const PERMS = [{ code: "initiative.plan", label: "Plan projects" }, { code: "task.assign", label: "Hand out work" }, { code: "task.confirm", label: "Confirm work" }, { code: "report.submit", label: "Send reports" }, { code: "member.manage", label: "Manage people" }, { code: "org.manage", label: "Manage the group" }];

/** How the group is run: positions with seats, terms and what they can do (BIX Position, from Popolo Post). */
export default function Structure() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const [open, setOpen] = useState<any>(null);
  const [title, setTitle] = useState("");
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const { data, reload } = useLoad(async () => {
    const [positions, roles] = await Promise.all([bix.search("Position", { organization: `Organization/${id}` }), bix.search("Role", { organization: `Organization/${id}` })]);
    const names: Record<string, string> = {};
    for (const r of roles) { try { names[r.person.reference] = (await bix.get("Person", r.person.reference.split("/")[1])).name?.text; } catch {} }
    return { positions, roles: roles.filter((r) => r.status === "active"), names };
  }, [id]);
  const officer = s.groups.some((g) => g.org.id === id && g.role.code?.code === "officer");
  const holders = (p: any) => (data?.roles ?? []).filter((r) => r.position?.reference === `Position/${p.id}`).map((r) => data?.names[r.person.reference] ?? "Someone");
  const save = async (r: any) => { try { await bix.commit(r); reload(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } };
  return (
    <Screen back>
      <Title sub="Positions with seats and terms. Starting points, not legal advice.">People in charge</Title>
      <Panel>
        {(data?.positions ?? []).map((p, i) => <Row key={p.id} left={<View style={{ width: 54 }}>{holders(p).length ? <Faces names={holders(p)} /> : <IconCircle name="users" tone="grey" size={30} />}</View>}
          title={p.title} meta={`${p.seats} seat${p.seats === 1 ? "" : "s"} · ${holders(p).length ? holders(p).join(", ") : `${p.seats} open`}`} onPress={officer ? () => setOpen(p) : undefined} last={i === (data?.positions.length ?? 0) - 1} />)}
        {!data?.positions.length ? <Row title="No positions yet" last /> : null}
      </Panel>
      {officer ? <><Field value={title} onChangeText={setTitle} placeholder="Add a position, e.g. Auditor" onSubmitEditing={() => { if (title.trim()) { save(bix.create("Position", { organization: { reference: `Organization/${id}` }, title: title.trim(), kind: "officer", seats: 1, term: "P1Y", status: "active", permissions: [] })); setTitle(""); } }} returnKeyType="done" />
        <Meta>{"Give someone a position from People."}</Meta></> : null}
      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open ? <>
          <Text style={[t.row, { fontSize: 18 }]}>{open.title}</Text>
          <Meta>{`${open.seats} seat${open.seats === 1 ? "" : "s"} · 1-year term`}</Meta>
          <Eyebrow>They can</Eyebrow>
          <Panel>{PERMS.map((p, i) => { const on = (open.permissions ?? []).some((x: any) => x.code === p.code);
            return <Row key={p.code} title={p.label} last={i === PERMS.length - 1} right={<Check on={on} onPress={() => { const next = bix.next(open, { permissions: on ? open.permissions.filter((x: any) => x.code !== p.code) : [...(open.permissions ?? []), { system: "bayanihan:permission", code: p.code }] }); save(next); setOpen(next); }} />} />; })}</Panel>
          <Buttons><Primary label="Done" onPress={() => setOpen(null)} /></Buttons>
        </> : null}
      </Sheet>
    </Screen>
  );
}
