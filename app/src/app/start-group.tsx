import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { bix, ref } from "@/lib/bix";
import { fileUri, pickPhoto, type Attachment } from "@/lib/files";
import { useSession } from "@/lib/session";
import { CAUSES, STRUCTURES, type StructureKey } from "@/lib/org";
import { Buttons, Chips, Eyebrow, Field, Notice, Primary, Screen, Title, Panel, Row, IconCircle, Check, Meta } from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { VisibilityChoice, visibilityFields, type Visibility } from "@/ui/Privacy";
import { c, type as t } from "@/ui/theme";

const KINDS = [
  { value: "civic-club", label: "Club or chapter" }, { value: "community", label: "Community or meetup" },
  { value: "registered-npo", label: "Registered nonprofit" }, { value: "school-org", label: "School org" },
  { value: "faith-based", label: "Faith-based" }, { value: "event-team", label: "Event team" }, { value: "informal", label: "Other" },
] as const;
const initials = (n: string) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

/** Your organization's profile, set up before (or without) a first project. Two steps: who you are, then how you're run. */
export default function StartGroup() {
  const s = useSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("community");
  const [about, setAbout] = useState("");
  const [place, setPlace] = useState("");
  const [causes, setCauses] = useState<string[]>([]);
  const [logo, setLogo] = useState<Attachment | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [structure, setStructure] = useState<StructureKey>("community");
  const [vis, setVis] = useState<Visibility>("public");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (logo) fileUri(logo).then(setLogoUri).catch(() => {}); }, [logo?.hash]);
  useEffect(() => { setStructure(kind === "civic-club" ? "club" : kind === "registered-npo" ? "nonprofit" : kind === "informal" ? "own" : "community"); }, [kind]);

  const create = async () => {
    if (!s.person) return;
    setBusy(true); setErr(null);
    try {
      const org = bix.create("Organization", {
        name: name.trim(), kind, ...visibilityFields(null, vis), ...(about.trim() ? { description: about.trim() } : {}), ...(logo ? { image: logo } : {}),
        cause: causes.map((code) => ({ system: "bayanihan:cause", code, display: CAUSES.find((x) => x.code === code)?.label })),
        ...(place.trim() ? { extension: [{ url: "bayanihan:place-text", value: place.trim() }] } : {}),
      });
      await bix.commit(org);
      // The server made you its officer. Now the starting structure: positions with seats and terms.
      const orgRef = { reference: `Organization/${org.id}` };
      const positions = STRUCTURES[structure].positions.map((p) => bix.create("Position", { organization: orgRef, title: p.title, kind: p.kind, seats: p.seats, term: "P1Y", status: "active",
        permissions: p.permissions.map((code) => ({ system: "bayanihan:permission", code })) }));
      if (positions.length) await bix.commit(...positions);
      // Hold the first position (e.g. President / Lead organizer).
      await s.refresh();
      const mine = s.groups.find((g) => g.org.id === org.id)?.role ?? (await bix.search("Role", { person: ref(s.person).reference, organization: orgRef.reference }))[0];
      if (mine && positions[0]) await bix.commit(bix.next(mine, { position: ref(positions[0]) }));
      await s.refresh(); s.setCurrent(org);
      router.replace({ pathname: "/group-ready" as never, params: { org: org.id } });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  if (step === 2) return (
    <Screen>
      <Title sub="Who's in charge, and for how long. You can change all of this later.">How is {name.trim() || "your group"} run?</Title>
      <Panel>
        {(Object.keys(STRUCTURES) as StructureKey[]).map((k, i, all) => (
          <Row key={k} left={<IconCircle name={STRUCTURES[k].icon} />} title={STRUCTURES[k].label} meta={STRUCTURES[k].summary} last={i === all.length - 1}
            right={<Check on={structure === k} onPress={() => setStructure(k)} />} onPress={() => setStructure(k)} />
        ))}
      </Panel>
      <Meta>{"Starting points, not legal advice. Check your bylaws."}</Meta>
      <Text style={[t.eyebrow, { marginTop: 18, marginBottom: 8, marginHorizontal: 4 }]}>Who can see your group</Text>
      <VisibilityChoice value={vis} onChange={setVis} />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label="Create the group" onPress={create} busy={busy} /></Buttons>
      <Text style={[t.meta, { marginTop: 12, textAlign: "center" }]} onPress={() => setStep(1)}>Back</Text>
    </Screen>
  );
  return (
    <Screen back>
      <Title>Your group</Title>
      <Pressable onPress={async () => { try { const a = await pickPhoto(false); if (a) setLogo(a); } catch (e) { setErr(String(e)); } }} accessibilityRole="button" accessibilityLabel="Add your group's logo" style={{ alignSelf: "center", marginBottom: 6 }}>
        {logoUri ? <Image source={{ uri: logoUri }} style={{ width: 84, height: 84, borderRadius: 26 }} />
          : <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Text style={{ color: c.white, fontWeight: "800", fontSize: 26 }}>{initials(name)}</Text></View>}
        <View style={{ position: "absolute", right: -4, bottom: -4, width: 32, height: 32, borderRadius: 16, backgroundColor: c.white, alignItems: "center", justifyContent: "center" }}><Icon name="camera" size={16} /></View>
      </Pressable>
      <Text style={[t.meta, { textAlign: "center" }]}>Add a logo, or keep the initials</Text>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Lahug Uplands Runners Club" />
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: c.s500, marginTop: 14, marginLeft: 4 }}>What kind of group?</Text>
      <Chips options={[...KINDS]} value={kind} onChange={setKind} />
      <Field label="What you do (optional)" value={about} onChangeText={setAbout} placeholder="One or two lines" multiline />
      <Field label="Where (optional)" value={place} onChangeText={setPlace} placeholder="e.g. Lapu-Lapu City, Cebu" />
      <Eyebrow>Causes (optional)</Eyebrow>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CAUSES.map((x) => { const on = causes.includes(x.code); return <Pressable key={x.code} onPress={() => setCauses(on ? causes.filter((y) => y !== x.code) : [...causes, x.code])} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
          style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? c.accent : c.white, justifyContent: "center" }}><Text style={{ fontWeight: "600", color: on ? c.white : c.ink }}>{x.label}</Text></Pressable>; })}
      </View>
      <Buttons><Primary label="Next: how it's run" onPress={() => setStep(2)} disabled={!name.trim()} /></Buttons>
    </Screen>
  );
}
