import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { Icon, type IconName } from "./Icon";
import { c, radius, type as t } from "./theme";

/*
 * What BIX describes, as a map a volunteer can tap: each circle is a kind of record, each line a relationship.
 * Plain words first (Volunteer, Group, Project); the BIX name is shown small for the curious. Not a schema diagram.
 */
type Key = "person" | "group" | "team" | "project" | "task" | "need" | "offer" | "vote" | "record" | "report";
const W = 340, H = 470;
const NODES: Record<Key, { x: number; y: number; icon: IconName; name: string; bix: string; what: string; eg: string }> = {
  person:  { x: 60,  y: 46,  icon: "smile",    name: "Volunteer", bix: "Person",       what: "Anyone who helps. A nickname is enough.", eg: "Mia, who likes writing" },
  group:   { x: 280, y: 46,  icon: "building", name: "Group",     bix: "Organization", what: "A club, parish, school org or barangay group.", eg: "Lahug Uplands Runners Club" },
  offer:   { x: 52,  y: 176, icon: "heart",    name: "Offer",     bix: "Offer",        what: "Something a person can give: time, goods, a skill.", eg: "“I can bring 2 sacks of rice”" },
  team:    { x: 170, y: 150, icon: "users",    name: "Team",      bix: "Team",         what: "A committee inside a project, with a lead.", eg: "Communications" },
  project: { x: 286, y: 196, icon: "flag",     name: "Project",   bix: "Initiative",   what: "Something the group is doing, with a date and a place.", eg: "Lahug Uplands Fun Run 2027" },
  need:    { x: 60,  y: 300, icon: "box",      name: "Need",      bix: "Need",         what: "What a project is short of, and how much.", eg: "300 bottles of water" },
  task:    { x: 172, y: 286, icon: "pen",      name: "Task",      bix: "Task",         what: "One piece of work someone can take.", eg: "Draft the call for volunteers" },
  vote:    { x: 290, y: 330, icon: "check",    name: "Vote",      bix: "Decision",     what: "A question the group decides together.", eg: "Which venue layout?" },
  record:  { x: 104, y: 420, icon: "lock",     name: "Signed record", bix: "Provenance", what: "Proof of who did what, signed by the group.", eg: "Mia drafted it, 12 Feb, confirmed" },
  report:  { x: 246, y: 420, icon: "receipt",  name: "Report",    bix: "Report",       what: "Figures counted from confirmed work.", eg: "212 volunteer hours this year" },
};
const EDGES: [Key, Key, string][] = [
  ["person", "group", "is part of, on the core team or as a volunteer"],
  ["group", "project", "runs"],
  ["project", "team", "is organised into"],
  ["person", "team", "joins"],
  ["team", "task", "owns"],
  ["project", "task", "is broken into"],
  ["person", "task", "takes and does"],
  ["project", "need", "has"],
  ["person", "offer", "makes"],
  ["offer", "need", "helps meet"],
  ["project", "vote", "decides with"],
  ["task", "record", "when done, becomes"],
  ["record", "report", "is counted into"],
  ["record", "person", "stays in the story of"],
];

const an = (w: string) => (/^[aeiou]/i.test(w) ? `An ${w}` : `A ${w}`);
const an2 = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);

export function BixMap() {
  const [w, setW] = useState(0);
  const [on, setOn] = useState<Key>("task");
  const k = w ? w / W : 0;
  const links = EDGES.filter(([a, b]) => a === on || b === on);
  const near = new Set(links.flatMap(([a, b]) => [a, b]));
  const n = NODES[on];
  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ backgroundColor: c.white, borderRadius: radius.panel, height: w ? H * k + 8 : 360, overflow: "hidden" }}>
        {w ? <>
          <Svg width={w} height={H * k} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 4 }}>
            {EDGES.map(([a, b]) => { const hot = a === on || b === on;
              return <Line key={a + b} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke={hot ? c.accent : c.s200} strokeWidth={hot ? 2.5 : 1.5} strokeDasharray={hot ? undefined : "4 4"} />; })}
          </Svg>
          {(Object.keys(NODES) as Key[]).map((key) => { const x = NODES[key]; const sel = key === on; const lit = sel || near.has(key); const d = sel ? 52 : 44;
            return <Pressable key={key} onPress={() => setOn(key)} accessibilityRole="button" accessibilityLabel={`${x.name}. ${x.what}`} accessibilityState={{ selected: sel }}
              style={{ position: "absolute", left: x.x * k - 45, top: 4 + x.y * k - d / 2, width: 90, alignItems: "center", opacity: lit ? 1 : 0.45 }}>
              <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: sel ? c.accent : c.sand, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: c.white }}>
                <Icon name={x.icon} size={sel ? 24 : 20} color={sel ? c.white : c.accent} /></View>
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", color: c.ink, marginTop: 3, backgroundColor: c.white, paddingHorizontal: 4, borderRadius: 6 }}>{x.name}</Text>
            </Pressable>; })}
        </> : null}
      </View>
      <Text style={[t.meta, { textAlign: "center", marginTop: 8 }]}>Tap a circle to see what it connects to.</Text>

      <View style={{ backgroundColor: c.sand, borderRadius: radius.panel, padding: 16, marginTop: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}><Text style={[t.row, { fontSize: 18 }]}>{n.name}</Text>
          {n.bix !== n.name ? <Text style={[t.meta, { fontSize: 12 }]}>{`in BIX: ${n.bix}`}</Text> : null}</View>
        <Text style={[t.body, { marginTop: 2 }]}>{n.what}</Text>
        <Text style={[t.meta, { marginTop: 4 }]}>{`For example: ${n.eg}`}</Text>
        <View style={{ marginTop: 10, gap: 6 }}>{links.map(([a, b, verb]) =>
          <Pressable key={a + b} onPress={() => setOn(a === on ? b : a)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
            <Text style={[t.body, { flex: 1 }]}><Text style={{ fontWeight: "700", color: c.ink }}>{an(NODES[a].name.toLowerCase())}</Text>{` ${verb} `}<Text style={{ fontWeight: "700", color: c.ink }}>{an2(NODES[b].name.toLowerCase())}</Text></Text>
          </Pressable>)}</View>
      </View>
    </View>
  );
}
