import { useRef, useState } from "react";
import { router, Tabs } from "expo-router";
import { PanResponder, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { personName } from "@/lib/work";
import { IconCircle, Panel, Row, Sheet } from "@/ui/kit";
import { TabBar, type TabKey } from "@/ui/TabBar";
import { c, type as t } from "@/ui/theme";

/**
 * The four destinations and the centre "+", as in Dasig Fundraising: a Tabs navigator (switching tabs
 * never animates, like every native app) with the bar drawn by TabBar. Everything else is pushed on the
 * root Stack with the platform's own transition.
 */
export default function TabsLayout() {
  const s = useSession();
  const [adding, setAdding] = useState(false);
  const lead = !!s.current && s.groups.some((g) => g.org.id === s.current!.id && ["officer", "core-member"].includes(g.role.code?.code));
  const go = (to: string, params?: Record<string, string>) => { setAdding(false); router.push((params ? { pathname: to, params } : to) as never); };
  // Swipe left or right on a tab (horizontal carousels and chips keep their own swipes, since they claim it first) to move to the next or previous one (Home, Nearby, Groups, Me).
  const ORDER = ["home", "nearby", "groups", "story"];
  const nav = useRef<{ active: string; go: (name: string) => void } | null>(null);
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5,
    onPanResponderRelease: (_, g) => {
      const n = nav.current; if (!n || Math.abs(g.dx) < 70) return;
      const i = ORDER.indexOf(n.active); const j = i + (g.dx < 0 ? 1 : -1);
      if (i >= 0 && j >= 0 && j < ORDER.length) n.go(ORDER[j]!);
    },
  })).current;
  return <View style={{ flex: 1 }} {...swipe.panHandlers}>
    <Tabs screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => {
        const activeRoute = state.routes[state.index]?.name ?? "home";
        nav.current = { active: activeRoute, go: (name) => { const r = state.routes.find((x) => x.name === name); if (r) navigateToTab(r.key); } };
        return <TabBar active={activeRoute as TabKey} me={{ name: personName(s.person), photo: s.person?.photo }}
          onSelect={(k) => { if (k === "add") return setAdding(true); const r = state.routes.find((x) => x.name === k); if (r && k !== activeRoute) navigateToTab(r.key); }} />;
      }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="nearby" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="story" />
    </Tabs>
    <Sheet open={adding} onClose={() => setAdding(false)}>
      <Text style={[t.row, { fontSize: 18, marginBottom: 6 }]}>Add</Text>
      <Panel style={{ backgroundColor: c.wash }}>
        {lead ? <>
          <Row left={<IconCircle name="flag" tone="white" />} title="Start a project" meta={s.current?.name} onPress={() => go("/new-project", { org: s.current!.id })} />
          <Row left={<IconCircle name="userplus" tone="white" />} title="Invite people" meta="By code, link or nickname" onPress={() => go(`/org/${s.current!.id}/people`)} />
        </> : <>
          <Row left={<IconCircle name="camera" tone="white" />} title="Join a group" meta="Scan a code or open a link" onPress={() => go("/volunteer")} />
          <Row left={<IconCircle name="pen" tone="white" />} title="Something of my own" meta="A personal project" onPress={() => go("/new-project")} />
        </>}
        <Row left={<IconCircle name="users" tone="white" />} title="Start a group" onPress={() => go("/start-group")} last />
      </Panel>
    </Sheet>
  </View>;
}
