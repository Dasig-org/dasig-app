import { Platform, Share, Text, View } from "react-native";
import { router } from "expo-router";
import { bix } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { personName, shortRef } from "@/lib/work";
import { Avatar, Eyebrow, IconCircle, LinkText, Meta, Nav, Panel, Row, Screen } from "@/ui/kit";
import { type as t } from "@/ui/theme";

/** Your story: completed work across every group, and yours to take anywhere (rule 18). */
export default function Story() {
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { data } = useLoad(async () => (me ? (await bix.search("Task", { participant: me })).filter((x) => x.status === "completed") : []), [me]);
  return (
    <Screen bottom={<Nav active="story" />}>
      <View style={{ alignItems: "center", marginTop: 20 }}><Avatar name={personName(s.person)} size={76} /></View>
      <Text style={[t.title, { textAlign: "center", marginTop: 10 }]}>Your story</Text>
      <Meta>{""}</Meta>
      <Eyebrow right={`${data?.length ?? 0}`}>Done</Eyebrow>
      <Panel>{(data ?? []).map((x, i) => <Row key={x.id} left={<IconCircle name="check" />} title={x.title} meta={shortRef(x)} last={i === (data?.length ?? 0) - 1} />)}
        {!data?.length ? <Row title="Nothing yet" meta="Work you finish shows up here, signed by your group." last /> : null}</Panel>
      <Eyebrow>Yours to keep</Eyebrow>
      <Panel><Row left={<IconCircle name="download" />} title="Download everything" meta="In BIX, an open format" last onPress={async () => {
        if (!s.person) return;
        const json = JSON.stringify(await bix.exportMe(s.person.id), null, 1);
        if (Platform.OS === "web") {
          const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = "my-dasig-story.bix.json"; a.click();
        } else await Share.share({ message: json, title: "My Dasig story (BIX)" });
      }} /></Panel>
      <Eyebrow>Where your records live</Eyebrow>
      <Panel>
        <Row left={<IconCircle name={s.connection?.kind === "hub" ? "link" : s.connection?.kind === "cloud" ? "building" : "lock"} />}
          title={s.connection?.kind === "hub" ? "Connected to your group's hub" : s.connection?.kind === "cloud" ? "Online server" : "On this phone"}
          meta={s.connection?.kind === "hub" ? s.connection.url : s.connection?.kind === "cloud" ? "Bayanihan Server" : "Works with no internet"} last={s.connection?.kind === "cloud"} />
        {s.connection?.kind === "phone" ? <Row left={<IconCircle name="users" />} title="Make this phone your group's hub" meta="Others join over its hotspot" onPress={() => router.push("/hub" as never)} last /> : null}
        {s.connection?.kind === "hub" ? <Row left={<IconCircle name="back" />} title="Use this phone on its own" meta="Your own records stay on this phone" onPress={() => s.useThisPhone()} last /> : null}
      </Panel>
      {s.connection?.kind === "cloud" ? <View style={{ marginTop: 18, alignItems: "center" }}><LinkText onPress={() => s.signOut()}>Sign out</LinkText></View> : null}
    </Screen>
  );
}
