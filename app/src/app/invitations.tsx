import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { answerInvitation, myInvitations, type Invitation } from "@/lib/invites";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Buttons, IconCircle, LinkText, Meta, Outline, Panel, Primary, Row, Screen, Skeleton, Title } from "@/ui/kit";
import { type as t } from "@/ui/theme";
import { useSnackbar } from "@/ui/Snackbar";

const WHAT: Record<string, string> = { volunteer: "to volunteer with the group", member: "to join the core team", "team-member": "to join the team", helper: "to help with a task" };

/*
 * Invitations (teamwork sketches C9; BIX "Usernames and invitations"). Where invitation emails and pushes open. Join,
 * Not now, or don't let this group invite me again. Off the network there are none.
 */
export default function Invitations() {
  const s = useSession();
  const { data, reload } = useLoad(() => myInvitations(), [s.person?.id]);
  const [busy, setBusy] = useState<string | null>(null);
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const answer = async (v: Invitation, a: "accept" | "decline" | "block") => {
    setBusy(v.id); setMsg(null);
    try { const r = await answerInvitation(v.id, a); await s.refresh(); if (a === "accept" && r.target) { const [tt, id] = r.target.split("/"); router.replace((tt === "Team" ? `/team/${id}` : tt === "Task" ? `/task/${id}` : tt === "Initiative" ? `/project/${id}` : "/home") as never); return; }
      setMsg(a === "block" ? "They won't be able to invite you again." : "Declined."); await reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  return (
    <Screen back onRefresh={reload}>
      <Title sub={s.connection?.kind === "ecosystem" ? "Answer them here. Nothing happens unless you join." : "Invitations come with a Bayanihan Network account. Sign in from Settings → Your account."}>Invitations</Title>
      {!data ? <Skeleton /> : !data.length ? <Panel><Row left={<IconCircle name="check" />} title="No invitations right now" meta="When someone invites you by username or email, it shows here." last /></Panel>
        : data.map((v) => <View key={v.id} style={{ marginTop: 12 }}><Panel>
          <Row left={<IconCircle name="mail" />} title={`${v.invitedBy.name} invited you ${WHAT[v.role] ?? ""}`} meta={[v.group?.name, v.target.reference.startsWith("Organization/") ? null : v.target.title].filter(Boolean).join(" · ")} last={!v.message} />
          {v.message ? <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}><Text style={t.body}>{`“${v.message}”`}</Text></View> : null}
        </Panel>
          <Buttons><Primary label={busy === v.id ? "…" : "Join"} onPress={() => answer(v, "accept")} /><Outline label="Not now" onPress={() => answer(v, "decline")} /></Buttons>
          <View style={{ alignItems: "center", marginTop: 8 }}><LinkText onPress={() => answer(v, "block")}>{`Don't let ${v.group?.name ?? "this group"} invite me again`}</LinkText></View>
          <Meta>{`Expires ${new Date(v.expires).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}</Meta>
        </View>)}
    </Screen>
  );
}
