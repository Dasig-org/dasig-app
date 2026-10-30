import { useState } from "react";
import { Text, View } from "react-native";
import type { R } from "@/lib/bix";
import { Buttons, Check, Chips, IconCircle, Meta, Panel, Primary, Row } from "./kit";
import type { IconName } from "./Icon";
import { c, type as t } from "./theme";

/**
 * Who can see a group or project (BIX: publicSummary, plus the bayanihan:visibility extension the server enforces).
 * The most restrictive of a project and its group always applies.
 */
export type Visibility = "group" | "invited" | "public";
export const VISIBILITY: { value: Visibility; icon: IconName; title: string; meta: string }[] = [
  { value: "group", icon: "lock", title: "Only our group", meta: "Hidden from everyone else. No invite links." },
  { value: "invited", icon: "link", title: "Our group and people we invite", meta: "Hidden from the public. Invite links show only what you choose." },
  { value: "public", icon: "eye", title: "Anyone can find it", meta: "A summary is listed: name, place, causes. Never people or tasks." },
];
const RANK: Record<Visibility, number> = { group: 0, invited: 1, public: 2 };
export function visibilityOf(r?: R | null): Visibility {
  const v = (r?.extension ?? []).find((x: any) => x.url === "bayanihan:visibility")?.value;
  if (v === "group" || v === "invited" || v === "public") return v;
  return r?.publicSummary === false ? "invited" : "public";
}
/** The fields to save for a choice, keeping other extensions. */
export function visibilityFields(r: R | null | undefined, v: Visibility) {
  return { publicSummary: v === "public", extension: [...(r?.extension ?? []).filter((x: any) => x.url !== "bayanihan:visibility"), { url: "bayanihan:visibility", value: v }] };
}
export const atMost = (v: Visibility, cap: Visibility): Visibility => (RANK[v] <= RANK[cap] ? v : cap);
export const label = (v: Visibility) => VISIBILITY.find((x) => x.value === v)!.title;

/** The three choices, as rows with a check. `cap` greys out choices more open than the group allows. */
export function VisibilityChoice({ value, onChange, cap }: { value: Visibility; onChange: (v: Visibility) => void; cap?: Visibility }) {
  return <Panel style={{ backgroundColor: c.wash }}>
    {VISIBILITY.map((o, i) => {
      const blocked = cap ? RANK[o.value] > RANK[cap] : false;
      return <Row key={o.value} left={<IconCircle name={o.icon} tone="white" />} title={o.title} meta={blocked ? "Your group's setting doesn't allow this" : o.meta}
        right={<Check on={value === o.value} onPress={blocked ? undefined : () => onChange(o.value)} />} onPress={blocked ? undefined : () => onChange(o.value)} last={i === VISIBILITY.length - 1} />;
    })}
  </Panel>;
}

export type InviteOpts = { preview: "title-only" | "generic"; approval: boolean; days: 0 | 7 | 30 };
/** Before making an invite link: what it shows, whether you approve people, and when it stops working. */
export function InviteOptions({ what, onCreate, busy }: { what: string; onCreate: (o: InviteOpts) => void; busy?: boolean }) {
  const [o, setO] = useState<InviteOpts>({ preview: "title-only", approval: false, days: 30 });
  return <View>
    <Text style={[t.row, { fontSize: 18 }]}>{`Invite people to ${what}`}</Text>
    <Text style={[t.eyebrow, { marginTop: 14 }]}>What the link shows</Text>
    <Chips options={[{ value: "title-only", label: `The name and group` }, { value: "generic", label: "Nothing about it" }]} value={o.preview} onChange={(preview) => setO({ ...o, preview })} />
    <Text style={[t.eyebrow, { marginTop: 14 }]}>Joining</Text>
    <Chips options={[{ value: "now", label: "Join right away" }, { value: "ask", label: "I approve each person" }]} value={o.approval ? "ask" : "now"} onChange={(v) => setO({ ...o, approval: v === "ask" })} />
    <Text style={[t.eyebrow, { marginTop: 14 }]}>Link works for</Text>
    <Chips options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "0", label: "Until I turn it off" }]} value={String(o.days) as "7"} onChange={(v) => setO({ ...o, days: Number(v) as 0 })} />
    <Meta>{"\nYou can turn any link off at once in Links and safety."}</Meta>
    <Buttons><Primary label="Make the invite" busy={busy} onPress={() => onCreate(o)} /></Buttons>
  </View>;
}
export const linkOpts = (o: InviteOpts) => ({ approval: o.approval, ...(o.days ? { expires: new Date(Date.now() + o.days * 86400000).toISOString() } : {}) });
