import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, Platform, Pressable, Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { fileUri, pickPhoto } from "@/lib/files";
import { CAUSES } from "@/lib/org";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Body, Buttons, Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Pill, Primary, Row, Screen, Sheet, Skeleton } from "@/ui/kit";
import { Logo } from "@/ui/Context";
import { Icon } from "@/ui/Icon";
import { directoryOpen, networkOpen } from "@/lib/network";
import { useWhere } from "@/ui/Where";
import { label, VISIBILITY, VisibilityChoice, visibilityFields, visibilityOf } from "@/ui/Privacy";
import { CopyToEcosystem } from "@/ui/CopyToEcosystem";
import { c, type as t } from "@/ui/theme";

/** A group's page: its profile (editable by officers), people, how it's run, projects, links and safety. */
export default function Org() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const where = useWhere();
  const [privacy, setPrivacy] = useState(false);
  const [copying, setCopying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { data, reload } = useLoad(async () => {
    const org = await bix.get("Organization", id);
    const [roles, projects] = await Promise.all([bix.search("Role", { organization: `Organization/${id}` }), bix.search("Initiative", { organization: `Organization/${id}` })]);
    return { org, roles: roles.filter((r) => r.status === "active"), requests: roles.filter((r) => r.status === "requested"), projects };
  }, [id]);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  useEffect(() => { if (data?.org.image) fileUri(data.org.image).then(setLogoUri).catch(() => {}); }, [data?.org.image?.hash]);
  const [name, setName] = useState(""); const [about, setAbout] = useState("");
  useEffect(() => { if (data) { setName(data.org.name); setAbout(data.org.description ?? ""); } }, [data?.org.meta.version]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { org, roles, requests, projects } = data;
  const officer = s.groups.some((g) => g.org.id === id && g.role.code?.code === "officer");
  const save = async (fields: Record<string, unknown>) => { try { await bix.commit(bix.next(org, fields)); setMsg("Saved."); setEditing(false); reload(); s.refresh(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } };
  return (
    <Screen back>
      <View style={{ alignItems: "center" }}>
        <Pressable disabled={!officer} accessibilityLabel="Change your group's logo" onPress={async () => { const a = await pickPhoto(false).catch(() => null); if (a) save({ image: a }); }}>
          {logoUri ? <Image source={{ uri: logoUri }} style={{ width: 84, height: 84, borderRadius: 26 }} /> : <Logo name={org.name} size={84} />}
        </Pressable>
        <Text style={[t.title, { textAlign: "center", marginTop: 10 }]}>{org.name}</Text>
        <Meta>{[(org.extension ?? []).find((x: any) => x.url === "bayanihan:place-text")?.value, org.publicSummary !== false ? "Findable" : "Private"].filter(Boolean).join(" · ")}</Meta>
      </View>
      {editing ? <>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="What you do" value={about} onChangeText={setAbout} multiline />
        <Buttons><Primary label="Save" onPress={() => save({ name: name.trim(), description: about.trim() || undefined })} /><Outline label="Cancel" onPress={() => setEditing(false)} /></Buttons>
      </> : <>
        {org.description ? <View style={{ marginTop: 10 }}><Body>{org.description}</Body></View> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" }}>{(org.cause ?? []).map((x: any) => <Pill key={x.code}>{CAUSES.find((y) => y.code === x.code)?.label ?? x.code}</Pill>)}</View>
        {officer ? <Buttons><Outline flex label="Edit profile" onPress={() => setEditing(true)} /></Buttons> : null}
      </>}
      {msg ? <Notice>{msg}</Notice> : null}
      <Eyebrow>Your group's home</Eyebrow>
      <Panel><Row left={<IconCircle name={where.icon} />} last={!(officer && networkOpen && s.connection?.kind !== "ecosystem")} title={where.text} meta={s.connection?.kind === "ecosystem" ? "On the Dasig Ecosystem" : networkOpen ? "Connect to the Dasig Ecosystem to work from anywhere" : "Dasig Ecosystem: coming in 2027"} onPress={() => router.push("/network" as never)} />
        {officer && networkOpen && s.connection?.kind !== "ecosystem" ? <Row left={<IconCircle name="cloud" />} title="Copy this group to the Dasig Ecosystem" meta="Work from anywhere; this phone keeps its copy" onPress={() => setCopying(true)} last /> : null}</Panel>
      <CopyToEcosystem org={org} open={copying} onClose={() => { setCopying(false); reload(); }} />
      <Eyebrow right={`${roles.length}`}>People</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="users" />} title="Members and volunteers" meta={requests.length ? `${requests.length} asking to join` : "Roles, positions, invites"} onPress={() => router.push(`/org/${id}/people` as never)} />
        <Row left={<IconCircle name="building" />} title="How you're run" meta="Positions, seats and terms" onPress={() => router.push(`/org/${id}/structure` as never)} last />
      </Panel>
      <Eyebrow right={`${projects.length}`}>Projects</Eyebrow>
      <Panel>
        {projects.map((p) => <Row key={p.id} left={<IconCircle name="flag" />} title={p.title} meta={p.status === "completed" ? "Done" : p.description} onPress={() => router.push(`/project/${p.id}`)} />)}
        <Row left={<IconCircle name="plus" tone="grey" />} title="Start a project" onPress={() => router.push({ pathname: "/new-project", params: { org: id } })} last />
      </Panel>
      {officer ? <><Eyebrow>Settings</Eyebrow><Panel>
        <Row left={<IconCircle name={VISIBILITY.find((x) => x.value === visibilityOf(org))!.icon} />} title="Who can see this group" meta={label(visibilityOf(org)) + (visibilityOf(org) === "public" && s.connection?.kind !== "ecosystem" ? " · listed once the group is on the Dasig Ecosystem" : "")} onPress={() => setPrivacy(true)} />
        <Row left={<IconCircle name="lock" />} title="Links and safety" meta="See and turn off invite links" onPress={() => router.push("/links" as never)} />
        <Row left={<IconCircle name="download" />} title="Download your group's records" meta="Everything, in BIX" onPress={() => router.push(`/org/${id}/export` as never)} last />
      </Panel></> : null}
      <Sheet open={privacy} onClose={() => setPrivacy(false)}>
        <Text style={[t.row, { fontSize: 18, marginBottom: 8 }]}>Who can see this group</Text>
        <VisibilityChoice value={visibilityOf(org)} onChange={(v) => {
          const go = () => { setPrivacy(false); save(visibilityFields(org, v)); };
          if (v !== "public" || Platform.OS === "web") return go();
          Alert.alert("List your group publicly?", "Its name, kind, place and causes can be found by anyone. Never people or tasks. You can change this any time.", [{ text: "Not now", style: "cancel" }, { text: "List it", onPress: go }]);
        }} />
        <Meta>{"\nProjects are never more open than their group. Making the group private also hides its open work from outsiders."}</Meta>
      </Sheet>
      <View style={{ height: 8 }}><Icon name="chevron" size={1} /></View>
    </Screen>
  );
}
