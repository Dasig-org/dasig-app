import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { personName } from "@/lib/work";
import { Avatar, Panel, Row, Sheet, LinkText } from "./kit";
import { Icon } from "./Icon";
import { c, radius, type as t } from "./theme";

const Logo = ({ name, size = 30 }: { name: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: c.white, fontWeight: "800", fontSize: size * 0.36 }}>{name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</Text></View>
);
export { Logo };

/** The context switcher: personal, or one of your groups (sketch: trust-sketches #1). */
export function ContextPill() {
  const s = useSession();
  const [open, setOpen] = useState(false);
  const label = s.current ? (s.current.name as string) : personName(s.person);
  return <>
    <Pressable onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingLeft: 5, paddingRight: 14, backgroundColor: c.white, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      {s.current ? <Logo name={label} /> : <Avatar name={label} />}
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink, maxWidth: 220 }} numberOfLines={1}>{label}</Text>
      <Icon name="chevron" size={12} color={c.s400} />
    </Pressable>
    <Sheet open={open} onClose={() => setOpen(false)}>
      <Panel style={{ backgroundColor: c.wash }}>
        <Row left={<Avatar name={personName(s.person)} />} title={personName(s.person)} meta="Just me: my work and my story" last onPress={() => { s.setCurrent(null); setOpen(false); }} />
      </Panel>
      {s.groups.length ? <Text style={[t.eyebrow, { marginTop: 18, marginBottom: 8, marginLeft: 4 }]}>Your groups</Text> : null}
      <Panel style={{ backgroundColor: c.wash }}>
        {s.groups.map((g, i) => <Row key={g.org.id} left={<Logo name={g.org.name} size={40} />} title={g.org.name} meta={roleWords(g.role.code?.code)} last={i === s.groups.length - 1}
          right={s.current?.id === g.org.id ? <Icon name="check" color={c.accent} /> : undefined} onPress={() => { s.setCurrent(g.org); setOpen(false); }} />)}
      </Panel>
      <View style={{ marginTop: 14, marginLeft: 4 }}><LinkText onPress={() => { setOpen(false); router.push("/start-group"); }}>＋ Start a group</LinkText></View>
    </Sheet>
  </>;
}
export const roleWords = (code?: string) => ({ officer: "Officer", "core-member": "Core member", member: "Member", "volunteer-regular": "Regular volunteer", "volunteer-episodic": "Volunteer" } as Record<string, string>)[code ?? ""] ?? "Member";
