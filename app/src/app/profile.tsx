import { METHOD_LABEL } from "@/lib/signin";
import { useAccount } from "@/lib/account";
import { MethodIcon } from "@/ui/SignIn";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { bix } from "@/lib/bix";
import { fileUri, pickPhoto } from "@/lib/files";
import { useSession } from "@/lib/session";
import { skillCodings, skillsOf } from "@/lib/work";
import { Avatar, Buttons, Chips, Eyebrow, Field, Notice, Primary, Screen, Title } from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { c, radius, type as t } from "@/ui/theme";

const FREE = ["Weekday evenings", "Saturdays", "Sundays", "Mornings", "Any time"];
const SKILLS = ["Writing", "Design", "Photos & video", "Teaching", "Driving", "First aid", "Logistics", "Tech", "Events", "Fundraising"];

/** Your profile: nickname, optional full name, photo, a line about you, skills, and how you're credited. */
export default function Profile() {
  const acct = useAccount();
  const s = useSession();
  const q = useLocalSearchParams<{ first?: string; via?: string; then?: string }>();
  const first = q.first === "1";
  const via = q.via ? METHOD_LABEL[q.via] ?? q.via : null;
  const p = s.person;
  const [nick, setNick] = useState(p?.name?.text ?? "");
  const [full, setFull] = useState((p?.extension ?? []).find((x: any) => x.url === "bayanihan:full-name")?.value ?? "");
  const [about, setAbout] = useState(p?.description ?? "");
  const [skills, setSkills] = useState<string[]>(skillsOf(p));
  const [free, setFree] = useState<string[]>(((p?.extension ?? []).find((x: any) => x.url === "bayanihan:availability")?.value as string[]) ?? []);
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
      const ext = [...(p.extension ?? []).filter((x: any) => !["bayanihan:full-name", "bayanihan:skills", "bayanihan:profile-done", "bayanihan:availability"].includes(x.url)),
        ...(free.length ? [{ url: "bayanihan:availability", value: free }] : []),
        ...(full.trim() ? [{ url: "bayanihan:full-name", value: full.trim() }] : []), { url: "bayanihan:profile-done", value: true }];
      await bix.commit(bix.next(p, { name: { text: nick.trim() || "Friend", use: "nickname" }, credit, skill: skills.length ? skillCodings(skills) : undefined, description: about.trim() || undefined, photo: photo ?? undefined, extension: ext }));
      await s.refresh();
      router.replace(first ? ((via && q.then && q.then !== "/" ? q.then : "/paths") as never) : "/story");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Screen back={!first}>
      <Title sub={first ? (via ? `Your Bayanihan Network account is ready. You signed in with ${via}.` : "Only your nickname is needed. The rest helps your groups know you.") : undefined}>{first ? (via ? "You're in" : "Tell us about you") : "Your profile"}</Title>
      <Pressable onPress={async () => { try { const a = await pickPhoto(false); if (a) setPhoto(a); } catch (e) { setErr(String(e)); } }} accessibilityRole="button" accessibilityLabel="Add a photo of you" style={{ alignSelf: "center", marginVertical: 8 }}>
        {uri ? <Image source={{ uri }} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <Avatar name={nick || "?"} size={96} />}
        <View style={{ position: "absolute", right: -2, bottom: -2, width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.wash }}><Icon name="camera" size={16} color={c.white} /></View>
      </Pressable>
      {/* Which email the Bayanihan Network knows you by (from your ways to sign in); change them in Your account. */}
      {!first ? <Pressable accessibilityRole="button" onPress={() => router.push("/account" as never)} style={{ backgroundColor: c.white, borderRadius: radius.panel, padding: 14, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <MethodIcon via={acct.acct?.via ?? (acct.emails.length ? "email" : "nickname")} size={40} />
        <View style={{ flex: 1 }}><Text style={t.meta}>Email on the Bayanihan Network</Text>
          <Text style={[t.row, { marginTop: 2 }]} numberOfLines={2}>{acct.emails.length ? acct.emails.join(", ") : acct.loaded ? "None yet: you're using a nickname" : " "}</Text>
          {acct.how ? <Text style={[t.meta, { marginTop: 2 }]}>{acct.how}</Text> : null}</View>
        <Icon name="chevron" size={14} color={c.s400} /></Pressable> : null}
      <Field label={first && via ? "What should groups call you?" : "Nickname"} value={nick} onChangeText={setNick} />
      <Field label="Full name (optional)" value={full} onChangeText={setFull} placeholder="Shown only if you choose" />
      <Field label="About you (optional)" value={about} onChangeText={setAbout} placeholder="e.g. Student, loves organizing events" multiline />
      <Eyebrow>What you can help with</Eyebrow>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SKILLS.map((k) => { const on = skills.includes(k); return <Pressable key={k} onPress={() => setSkills(on ? skills.filter((x) => x !== k) : [...skills, k])} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
          style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? c.accent : c.white, justifyContent: "center" }}><Text style={{ fontWeight: "600", color: on ? c.white : c.ink }}>{k}</Text></Pressable>; })}
      </View>
      <Eyebrow>When you're usually free</Eyebrow>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FREE.map((k) => { const on = free.includes(k); return <Pressable key={k} onPress={() => setFree(on ? free.filter((x) => x !== k) : [...free, k])} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
          style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? c.accent : c.white, justifyContent: "center" }}><Text style={{ fontWeight: "600", color: on ? c.white : c.ink }}>{k}</Text></Pressable>; })}
      </View>
      <Eyebrow>How should groups credit you?</Eyebrow>
      <Chips options={[{ value: "nickname", label: "My nickname" }, { value: "full", label: "My full name" }, { value: "anonymous", label: "Anonymous" }]} value={credit} onChange={setCredit} />
      {err ? <Notice>{err}</Notice> : null}
      <Buttons><Primary label={first ? "Continue" : "Save"} onPress={save} busy={busy} disabled={!nick.trim()} /></Buttons>
    </Screen>
  );
}
