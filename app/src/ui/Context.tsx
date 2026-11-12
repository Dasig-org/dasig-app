import { useState } from "react";
import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { personName } from "@/lib/work";
import { Avatar, IconCircle, LinkText, Panel, Row, Sheet, usePhoto } from "./kit";
import { Icon } from "./Icon";
import { c, radius, type as t } from "./theme";

/** A group's logo when it has one, otherwise its initials. */
const Logo = ({ name, size = 30, image }: { name: string; size?: number; image?: { hash?: string } | null }) => {
  const uri = usePhoto(image);
  if (uri) return <Image source={{ uri }} accessibilityLabel={name} style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: c.white }} />;
  return <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: c.white, fontWeight: "800", fontSize: size * 0.36 }}>{name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</Text></View>;
};
export { Logo };

/** The context switcher: personal, or one of your groups (sketch: trust-sketches #1). */
export function ContextPill() {
  const s = useSession();
  const [open, setOpen] = useState(false);
  const label = s.current ? (s.current.name as string) : personName(s.person);
  return <>
    <Pressable onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingLeft: 5, paddingRight: 14, backgroundColor: c.white, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      {s.current ? <Logo name={label} image={s.current.image} /> : <Avatar name={label} photo={s.person?.photo} />}
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink, maxWidth: 220 }} numberOfLines={1}>{label}</Text>
      <Icon name="chevron" size={12} color={c.s400} />
    </Pressable>
    <Sheet open={open} onClose={() => setOpen(false)}>
      <Panel style={{ backgroundColor: c.wash }}>
        <Row left={<Avatar name={personName(s.person)} photo={s.person?.photo} />} title={personName(s.person)} meta="Just me: my work and my story" last onPress={() => { s.setCurrent(null); setOpen(false); }} />
      </Panel>
      {s.groups.length ? <Text style={[t.eyebrow, { marginTop: 18, marginBottom: 8, marginLeft: 4 }]}>Your groups</Text> : null}
      <Panel style={{ backgroundColor: c.wash }}>
        {s.groups.map((g, i) => <Row key={g.org.id} left={<Logo name={g.org.name} size={40} image={g.org.image} />} title={g.org.name} meta={roleWords(g.role.code?.code)} last={i === s.groups.length - 1}
          right={s.current?.id === g.org.id ? <Icon name="check" color={c.accent} /> : undefined} onPress={() => { s.setCurrent(g.org); setOpen(false); }} />)}
      </Panel>
      {s.current ? <><Text style={[t.eyebrow, { marginTop: 18, marginBottom: 8, marginLeft: 4 }]}>{s.current.name}</Text>
        <Panel style={{ backgroundColor: c.wash }}><Row left={<IconCircle name="building" tone="white" />} title="Group page and settings" meta="Profile, causes, place, who can find you, how you're run" last
          onPress={() => { setOpen(false); router.push(`/org/${s.current!.id}` as never); }} /></Panel></> : null}
      <View style={{ marginTop: 14, marginLeft: 4, flexDirection: "row", gap: 18 }}><LinkText onPress={() => { setOpen(false); router.push("/groups" as never); }}>All your groups</LinkText>
        <LinkText onPress={() => { setOpen(false); router.push("/start-group"); }}>＋ Start a group</LinkText></View>
    </Sheet>
  </>;
}
export const roleWords = (code?: string) => ({ officer: "Officer", "core-member": "Core member", member: "Member", "volunteer-regular": "Regular volunteer", "volunteer-episodic": "Volunteer" } as Record<string, string>)[code ?? ""] ?? "Member";
