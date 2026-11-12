import { PlaceField, placeExtensions, type PlaceValue } from "@/ui/PlaceField";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, Platform, Pressable, Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { fileUri, pickPhoto } from "@/lib/files";
import { CAUSES } from "@/lib/org";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Body, Buttons, Faces, Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Pill, Primary, Row, Screen, Sheet, Skeleton } from "@/ui/kit";
import { Logo } from "@/ui/Context";
import { Icon } from "@/ui/Icon";
import { directoryOpen, networkOpen } from "@/lib/network";
import { useWhere } from "@/ui/Where";
import { label, VISIBILITY, VisibilityChoice, visibilityFields, visibilityOf } from "@/ui/Privacy";
import { CopyToEcosystem } from "@/ui/CopyToEcosystem";
import { setupExt, withSetup } from "@/ui/GroupQuest";
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
    const active = roles.filter((r) => r.status === "active");
    const contacts: { name: string; photo?: any }[] = [];
    for (const r of active.filter((x) => x.code?.code === "officer").slice(0, 3)) { try { const pp = await bix.get("Person", r.person.reference.split("/")[1]); if (pp.name?.text) contacts.push({ name: pp.name.text, photo: pp.photo }); } catch {} }
    return { org, roles: active, requests: roles.filter((r) => r.status === "requested"), projects, contacts };
  }, [id]);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const { data: storage } = useLoad(async () => (s.connection?.kind === "ecosystem" ? bix.storage(id).catch(() => null) : null), [id]);
  useEffect(() => { if (data?.org.image) fileUri(data.org.image).then(setLogoUri).catch(() => {}); }, [data?.org.image?.hash]);
  const [name, setName] = useState(""); const [about, setAbout] = useState("");
  const [placeV, setPlaceV] = useState<PlaceValue>({ text: "" }); const [causes, setCauses] = useState<string[]>([]);
  useEffect(() => { if (data) { const ex = (data.org.extension ?? []) as { url: string; value: string }[];
    setName(data.org.name); setAbout(data.org.description ?? ""); setCauses((data.org.cause ?? []).map((x: any) => x.code));
    setPlaceV({ text: ex.find((x) => x.url === "bayanihan:place-text")?.value ?? "", code: ex.find((x) => x.url === "bayanihan:psgc")?.value }); } }, [data?.org.meta.version]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { org, roles, requests, projects, contacts } = data;
  const place = (org.extension ?? []).find((x: any) => x.url === "bayanihan:place-text")?.value as string | undefined;
  const officer = s.groups.some((g) => g.org.id === id && g.role.code?.code === "officer");
  const save = async (fields: Record<string, unknown>) => { try { await bix.commit(bix.next(org, fields)); setMsg("Saved."); setEditing(false); reload(); s.refresh(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } };
  return (
    <Screen back>
      <View style={{ alignItems: "center" }}>
        <Pressable disabled={!officer} accessibilityLabel="Change your group's logo" onPress={async () => { const a = await pickPhoto(false).catch(() => null); if (a) save({ image: a }); }}>
          {logoUri ? <Image source={{ uri: logoUri }} style={{ width: 84, height: 84, borderRadius: 26 }} /> : <Logo name={org.name} size={84} />}
        </Pressable>
        <Text style={[t.title, { textAlign: "center", marginTop: 10 }]}>{org.name}</Text>
        <Meta>{[place, org.publicSummary !== false ? "Findable" : "Private"].filter(Boolean).join(" · ")}</Meta>
      </View>
      {editing ? <>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="What you do" value={about} onChangeText={setAbout} multiline />
        <PlaceField label="Where" value={placeV} onChange={setPlaceV} placeholder="e.g. Lapu-Lapu City, Cebu" />
        <Eyebrow>Causes</Eyebrow>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {CAUSES.map((x) => { const on = causes.includes(x.code); return <Pressable key={x.code} onPress={() => setCauses(on ? causes.filter((y) => y !== x.code) : [...causes, x.code])} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
            style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? c.accent : c.white, justifyContent: "center" }}><Text style={{ fontWeight: "600", color: on ? c.white : c.ink }}>{x.label}</Text></Pressable>; })}
        </View>
        <Buttons><Primary label="Save" onPress={() => {
          // Keep every other extension (setup checklist state, etc.); replace only the place ones.
          const other = ((org.extension ?? []) as { url: string }[]).filter((x) => x.url !== "bayanihan:place-text" && x.url !== "bayanihan:psgc");
          const ext = [...other, ...(placeV.text.trim() ? placeExtensions(placeV) : [])];
          save({ name: name.trim(), description: about.trim() || undefined, cause: causes.map((code) => ({ system: "bayanihan:cause", code, display: CAUSES.find((x) => x.code === code)?.label })), extension: ext.length ? ext : undefined });
        }} /><Outline label="Cancel" onPress={() => setEditing(false)} /></Buttons>
      </> : <>
        {/* About (UX_GAPS A4): what the group does, where, its causes, and who to contact. Task and project pages link here. */}
        <Eyebrow>About</Eyebrow>
        <Panel>
          <View style={{ paddingVertical: 10 }}>{org.description ? <Body>{org.description}</Body>
            : officer ? <Text style={[t.meta, { color: c.accent, fontWeight: "600" }]} onPress={() => setEditing(true)}>＋ Say what your group does, so volunteers know who they're helping</Text>
            : <Meta>The group hasn't written about itself yet.</Meta>}</View>
          {(org.cause ?? []).length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, paddingBottom: 10 }}>{(org.cause ?? []).map((x: any) => <Pill key={x.code}>{CAUSES.find((y) => y.code === x.code)?.label ?? x.code}</Pill>)}</View> : null}
          {place ? <Row left={<IconCircle name="pin" />} title={place} meta="Where it works" last={!contacts.length} /> : null}
          {contacts.length ? <Row left={<View style={{ width: 54 }}><Faces names={contacts.map((x) => x.name)} photos={contacts.map((x) => x.photo)} /></View>} title={contacts.map((x) => x.name).join(", ")} meta={contacts.length === 1 ? "Officer · ask them about the group" : "Officers · ask them about the group"} last /> : null}
        </Panel>
        {officer ? <Buttons><Outline flex label="Edit profile" onPress={() => setEditing(true)} /></Buttons> : null}
      </>}
      {msg ? <Notice>{msg}</Notice> : null}
      <Eyebrow>Your group's home</Eyebrow>
      <Panel><Row left={<IconCircle name={where.icon} />} last={!(officer && networkOpen && s.connection?.kind !== "ecosystem")} title={where.text} meta={s.connection?.kind === "ecosystem" ? "On the Bayanihan Network" : networkOpen ? "Connect to the Bayanihan Network to work from anywhere" : "Bayanihan Network: coming in 2027"} onPress={() => router.push("/network" as never)} />
        {officer && networkOpen && s.connection?.kind !== "ecosystem" ? <Row left={<IconCircle name="cloud" />} title="Copy this group to the Bayanihan Network" meta="Work from anywhere; this phone keeps its copy" onPress={() => setCopying(true)} last /> : null}</Panel>
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
        <Row left={<IconCircle name={VISIBILITY.find((x) => x.value === visibilityOf(org))!.icon} />} title="Who can see this group" meta={label(visibilityOf(org)) + (visibilityOf(org) === "public" && s.connection?.kind !== "ecosystem" ? " · listed once the group is on the Bayanihan Network" : "")} onPress={() => setPrivacy(true)} />
        {storage?.allowance ? (() => { const mb = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`); const pct = Math.min(100, (100 * (storage.used ?? 0)) / storage.allowance);
          return <Row left={<IconCircle name="cloud" />} title="Storage on the Bayanihan Network" meta={`${mb(storage.used ?? 0)} of ${mb(storage.allowance)}${pct >= 80 ? " · nearly full. Photos already here stay" : " · free for every group"}`}
            right={<View style={{ width: 60, height: 8, borderRadius: 4, backgroundColor: c.wash, overflow: "hidden" }}><View style={{ width: `${pct}%`, height: 8, backgroundColor: c.accent }} /></View>} />; })() : null}
        {setupExt(org).hidden ? <Row left={<IconCircle name="check" />} title="Show the setup checklist" meta="Back on your group's home" onPress={() => save({ extension: withSetup(org, { hidden: false }) })} /> : null}
        <Row left={<IconCircle name="repeat" />} title="Hand over to the next officer" meta="At the end of your term" onPress={() => router.push(`/org/${id}/handover` as never)} />
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
