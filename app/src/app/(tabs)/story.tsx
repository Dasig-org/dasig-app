import { router } from "expo-router";
import { Text, View } from "react-native";
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
      <Eyebrow>Where your records live</Eyebrow>
      <Panel>
        <Row left={<IconCircle name={s.connection?.kind === "hub" ? "link" : s.connection?.kind === "cloud" ? "building" : "lock"} />}
          title={s.connection?.kind === "hub" ? "Your group's hub" : s.connection?.kind === "cloud" ? "Online server" : "On this phone"} meta="What needs the internet, and what doesn't" onPress={() => router.push("/network" as never)} />
        <Row left={<IconCircle name="pending" />} title="Sync" meta="What's waiting to be saved" onPress={() => router.push("/sync" as never)} />
        {s.connection?.kind === "phone" ? <Row left={<IconCircle name="users" />} title="Make this phone your group's hub" meta="Others join over its hotspot" onPress={() => router.push("/hub" as never)} /> : null}
        {s.connection?.kind === "hub" ? <Row left={<IconCircle name="back" />} title="Use this phone on its own" meta="Your own records stay on this phone" onPress={() => s.useThisPhone()} /> : null}
        <Row left={<IconCircle name="spark" />} title="How Dasig works" meta="Short guides" onPress={() => router.push("/help" as never)} last />
      </Panel>
      {s.connection?.kind === "cloud" ? <View style={{ marginTop: 18, alignItems: "center" }}><LinkText onPress={() => s.signOut()}>Sign out</LinkText></View> : null}
    </Screen>
  );
}
