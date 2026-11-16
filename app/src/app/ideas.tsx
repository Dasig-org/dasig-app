
import { suggester, act } from "@/lib/work";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { bix, type R } from "@/lib/bix";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { Avatar, Buttons, Meta, Outline, Panel, Screen, Title } from "@/ui/kit";
import { c, radius, type as t } from "@/ui/theme";
import { useSnackbar } from "@/ui/Snackbar";

/** Ideas from the team (sketch: P1 #5): accept, or "Not now" which keeps it as a draft with a note. */
export default function Ideas() {
  const s = useSession();
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const { data, reload } = useLoad(async () => {
    if (!s.current) return [];
    const projects = await bix.search("Initiative", { organization: `Organization/${s.current.id}` });
    const drafts = (await Promise.all(projects.map((p) => bix.search("Task", { partOf: `Initiative/${p.id}` })))).flat().filter((x) => x.status === "draft");
    const out: { task: R; who: string; photo?: any }[] = [];
    for (const x of drafts) {
      const by = await suggester(x);
      let who = "Someone", photo: any; if (by) { try { const p = await bix.get("Person", by.split("/")[1]!); who = p.name?.text ?? who; photo = p.photo; } catch {} }
      out.push({ task: x, who, photo });
    }
    return out;
  }, [s.current?.id]);
  const run = async (n: R, ok: string) => { try { await bix.commit(n); setMsg(ok); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  return (
    <Screen back>
      <Title sub="Accepted ideas credit the person who suggested them.">Ideas from the team</Title>
      {(data ?? []).map(({ task, who, photo }) => <View key={task.id} style={{ backgroundColor: c.white, borderRadius: radius.panel, padding: 16, marginTop: 10 }}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><Avatar name={who} size={40} photo={photo} /><View style={{ flex: 1 }}><Text style={t.eyebrow}>{`${who} suggested`}</Text><Text accessibilityRole="button" style={[t.row, { marginTop: 2 }]} onPress={() => router.push(`/task/${task.id}`)}>{task.title}</Text></View></View>
        {(task.note ?? []).length ? <Meta>{task.note[task.note.length - 1].text}</Meta> : null}
        <Buttons><Outline flex label="Accept" onPress={() => run(act.accept(task), "Accepted. It's now open work.")} /><Outline label="Not now" onPress={() => run(bix.next(task, { note: [...(task.note ?? []), { text: "Not now — kept for later.", time: new Date().toISOString() }] }), "Kept for later.")} /></Buttons>
      </View>)}
      {data && !data.length ? <Panel><Text style={[t.body, { paddingVertical: 14 }]}>No ideas waiting. When someone on a team suggests work, it shows up here.</Text></Panel> : null}
    </Screen>
  );
}
