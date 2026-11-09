import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { fileUri, pickPhoto } from "@/lib/files";
import { useSession } from "@/lib/session";
import { skillCodings, skillsOf } from "@/lib/work";
import { Avatar, Buttons, Chips, Eyebrow, Field, Notice, Primary, Screen, Title } from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { c } from "@/ui/theme";

const SKILLS = ["Writing", "Design", "Photos & video", "Teaching", "Driving", "First aid", "Logistics", "Tech", "Events", "Fundraising"];

/** Your profile: nickname, optional full name, photo, a line about you, skills, and how you're credited. */
export default function Profile() {
  const s = useSession();
  const first = useLocalSearchParams<{ first?: string }>().first === "1";
  const p = s.person;
  const [nick, setNick] = useState(p?.name?.text ?? "");
  const [full, setFull] = useState((p?.extension ?? []).find((x: any) => x.url === "bayanihan:full-name")?.value ?? "");
  const [about, setAbout] = useState(p?.description ?? "");
  const [skills, setSkills] = useState<string[]>(skillsOf(p));
  const [credit, setCredit] = useState<"nickname" | "full" | "anonymous">(p?.credit ?? "nickname");
  const [photo, setPhoto] = useState<any>(p?.photo ?? null);
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (photo) fileUri(photo).then(setUri).catch(() => {}); }, [photo?.hash]);
  const save = async () => {
    if (!p) return;
    setBusy(true); setErr(null);
    try {
      const ext = [...(p.extension ?? []).filter((x: any) => !["bayanihan:full-name", "bayanihan:skills", "bayanihan:profile-done"].includes(x.url)),
        ...(full.trim() ? [{ url: "bayanihan:full-name", value: full.trim() }] : []), { url: "bayanihan:profile-done", value: true }];
      await bix.commit(bix.next(p, { name: { text: nick.trim() || "Friend", use: "nickname" }, credit, skill: skills.length ? skillCodings(skills) : undefined, description: about.trim() || undefined, photo: photo ?? undefined, extension: ext }));
      await s.refresh();
      router.replace(first ? ("/paths" as never) : "/story");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen back={!first}>
      <Title sub={first ? "Only your nickname is needed. The rest helps your groups know you." : undefined}>{first ? "Tell us about you" : "Your profile"}</Title>
      <Pressable onPress={async () => { try { const a = await pickPhoto(false); if (a) setPhoto(a); } catch (e) { setErr(String(e)); } }} accessibilityRole="button" accessibilityLabel="Add a photo of you" style={{ alignSelf: "center", marginVertical: 8 }}>
        {uri ? <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <Avatar name={nick || "?"} size={96} />}
        <View style={{ position: "absolute", right: -2, bottom: -2, width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.wash }}><Icon name="camera" size={16} color={c.white} /></View>
      </Pressable>
      <Field label="Nickname" value={nick} onChangeText={setNick} />
      <Field label="Full name (optional)" value={full} onChangeText={setFull} placeholder="Shown only if you choose" />
      <Field label="About you (optional)" value={about} onChangeText={setAbout} placeholder="e.g. Student, loves organizing events" multiline />
      <Eyebrow>What you can help with</Eyebrow>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SKILLS.map((k) => { const on = skills.includes(k); return <Pressable key={k} onPress={() => setSkills(on ? skills.filter((x) => x !== k) : [...skills, k])} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
          style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? c.accent : c.white, justifyContent: "center" }}><Text style={{ fontWeight: "600", color: on ? c.white : c.ink }}>{k}</Text></Pressable>; })}
      </View>
      <Eyebrow>How should groups credit you?</Eyebrow>
      <Chips options={[{ value: "nickname", label: "My nickname" }, { value: "full", label: "My full name" }, { value: "anonymous", label: "Anonymous" }]} value={credit} onChange={setCredit} />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label={first ? "Continue" : "Save"} onPress={save} busy={busy} disabled={!nick.trim()} /></Buttons>
    </Screen>
  );
}
