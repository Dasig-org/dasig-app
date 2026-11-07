import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { dasigAccountAvailable, dasigLinked, startDasigSignIn } from "@/lib/dasig-account";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { personName, shortRef } from "@/lib/work";
import { Avatar, Eyebrow, IconCircle, LinkText, Meta, Panel, Row, Screen } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";

/** Your story: finished work across every group, and everything about you and your connection. */
export default function Story() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data } = useLoad(async () => {
    if (!me) return null;
    const done = (await bix.search("Task", { participant: me })).filter((x) => x.status === "completed");
    const hours = done.reduce((h, x) => h + (x.executionPeriod?.start && x.executionPeriod?.end ? (Date.parse(x.executionPeriod.end) - Date.parse(x.executionPeriod.start)) / 3600000 : 0), 0);
    return { done, hours };
  }, [me]);
  const [linked, setLinked] = useState(false);
  useEffect(() => { dasigLinked().then(setLinked).catch(() => {}); }, [me]);
  const k = s.connection?.kind;
  const web = Platform.OS === "web";
  const out = async (then: "start" | "dasig") => { await s.signOut(); if (then === "dasig") await startDasigSignIn("/home").catch(() => {}); else router.replace("/start" as never); };
  const signOut = () => {
    const warn = web && !linked ? "You signed in with a nickname only, so you can't get back into this account after signing out. Add your Dasig account first to keep it." : "You can sign back in with your Dasig account.";
    if (web) { if (typeof window === "undefined" || window.confirm(`Sign out?\n\n${warn}`)) out("start"); return; }
    Alert.alert("Sign out?", warn, [{ text: "Stay signed in", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => out("start") }]);
  };
  const tile = (icon: any, n: string, label: string) => <View style={{ flex: 1, backgroundColor: c.white, borderRadius: radius.panel, padding: 14, gap: 8 }}><IconCircle name={icon} /><Text style={t.row}>{n}</Text><Meta>{label}</Meta></View>;
  return (
    <Screen>
      <View style={{ alignItems: "center", marginTop: 10 }}><Avatar name={personName(s.person)} size={80} photo={s.person?.photo} /></View>
      <Text style={[t.title, { textAlign: "center", marginTop: 10 }]}>{personName(s.person)}</Text>
      {s.person?.description ? <Text style={[t.body, { textAlign: "center" }]}>{s.person.description}</Text> : null}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>{tile("check", `${data?.done.length ?? 0}`, "things done")}{tile("clock", `${Math.round(data?.hours ?? 0)}`, "hours")}{tile("users", `${s.groups.length}`, "groups")}</View>
      <Eyebrow right={data?.done.length ? `${data.done.length}` : undefined}>Done</Eyebrow>
      <Panel>{(data?.done ?? []).slice(0, 8).map((x, i, all) => <Row key={x.id} left={<IconCircle name="check" />} title={x.title} meta={[shortRef(x), "signed by your group"].filter(Boolean).join(" · ")} onPress={() => router.push(`/task/${x.id}`)} last={i === all.length - 1} />)}
        {!data?.done.length ? <Row title="Nothing yet" meta="Work you finish shows up here, signed by your group." last /> : null}</Panel>
      <Eyebrow>You</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="pen" />} title="Your profile" meta="Name, photo, skills, credit name" onPress={() => router.push("/profile" as never)} />
        <Row left={<IconCircle name="download" />} title="Your data" meta="Download, choose what shows, delete" onPress={() => router.push("/your-data" as never)} />
        <Row left={<IconCircle name="lock" />} title="What you've agreed to" onPress={() => router.push("/consent" as never)} last />
      </Panel>
      {/* Account: who you're signed in as, how you get back in, sign out (docs/auth/DASIG_ACCOUNTS.md). */}
      <Eyebrow>Account</Eyebrow>
      <Panel>
        <Row left={<IconCircle name={linked ? "check" : "lock"} />} title={linked ? "Your Dasig account" : "Nickname only"}
          meta={linked ? "Sign in with it on any phone or browser" : web ? "Only on this browser. Add a Dasig account to keep it" : k === "ecosystem" ? "On the Dasig Ecosystem from this phone" : "On this phone"} last={!(dasigAccountAvailable && !linked) && !(k === "ecosystem" || k === "cloud")} />
        {dasigAccountAvailable && !linked ? <Row left={<IconCircle name="userplus" />} title="Add your Dasig account" meta="Google or an email code, the same account as dasig.org" onPress={() => { startDasigSignIn("/story").catch(() => {}); }} /> : null}
        {dasigAccountAvailable && (k === "ecosystem" || k === "cloud") ? <Row left={<IconCircle name="swap" />} title="Sign in as someone else" meta="With a different Dasig account" onPress={() => out("dasig")} /> : null}
        {k === "ecosystem" || k === "cloud" ? <Row left={<IconCircle name="back" />} title="Sign out" onPress={signOut} last /> : null}
      </Panel>
      <Eyebrow>Where your records live</Eyebrow>
      <Panel>
        <Row left={<IconCircle name={s.connection?.kind === "hub" ? "link" : s.connection?.kind === "cloud" ? "building" : "lock"} />}
          title={k === "hub" ? "Your group's hub" : k === "ecosystem" ? "The Dasig Ecosystem" : k === "cloud" ? "Online server" : "On this phone"} meta="What needs the internet, and what doesn't" onPress={() => router.push("/network" as never)} />
        <Row left={<IconCircle name="pending" />} title="Sync" meta="What's waiting to be saved" onPress={() => router.push("/sync" as never)} />
        {!web && (k === "phone" || k === "hub") ? <Row left={<IconCircle name="cloud" />} title="Use the Dasig Ecosystem" meta="Work from anywhere; iPhone teammates can join" onPress={() => router.push("/network" as never)} /> : null}
        {s.connection?.kind === "phone" ? <Row left={<IconCircle name="users" />} title="Make this phone your group's hub" meta="Others join over its hotspot" onPress={() => router.push("/hub" as never)} /> : null}
        {s.connection?.kind === "hub" ? <Row left={<IconCircle name="back" />} title="Use this phone on its own" meta="Your own records stay on this phone" onPress={() => s.useThisPhone()} /> : null}
        <Row left={<IconCircle name="spark" />} title="How Dasig works" meta="Short guides" onPress={() => router.push("/help" as never)} last />
      </Panel>
    </Screen>
  );
}
