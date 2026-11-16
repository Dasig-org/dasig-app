import { useEffect, useEffectEvent, useState } from "react";
import { useBar } from "@/lib/bar";
import { loadInbox, onInboxCount } from "@/lib/inbox";
import { Tabs } from "expo-router";
import { PanResponder, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Fab } from "@/ui/Fab";
import { useBayani } from "@/ui/Bayani";
import { useSession } from "@/lib/session";
import { personName } from "@/lib/work";
import { AddSheet } from "@/ui/AddSheet";
import { bix, type R } from "@/lib/bix";
import { TAB_BAR_HEIGHT, TabBar, type TabKey } from "@/ui/TabBar";

/**
 * The four destinations and the centre "+", as in Dasig Fundraising: a Tabs navigator (switching tabs
 * never animates, like every native app) with the bar drawn by TabBar. Everything else is pushed on the
 * root Stack with the platform's own transition.
 */
export default function TabsLayout() {
  const s = useSession();
  const [adding, setAdding] = useState(false);
  const bar = useBar();
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bayani = useBayani();
  const items = ["home", bar.slots[0], "add", bar.slots[1], bar.slots[2]] as TabKey[];
  const [badge, setBadge] = useState(0);
  // The next event in this group, so "+" can offer "Add work to <event>".
  const [nextEvent, setNextEvent] = useState<R | null>(null);
  const groupId = s.current?.id, isLead = s.isLead;
  useEffect(() => { if (!adding || !groupId || !isLead) return;
    bix.search("Initiative", { organization: `Organization/${groupId}` }).then((ps) => setNextEvent(ps.filter((p) => p.status === "active" && p.period?.start && Date.parse(p.period.start) > Date.now() - 86400000)
      .sort((a, b) => a.period.start.localeCompare(b.period.start))[0] ?? ps.filter((p) => p.status === "active")[0] ?? null)).catch(() => setNextEvent(null)); }, [adding, groupId, isLead]);
  useEffect(() => onInboxCount(setBadge), []);
  const me = s.person ? `Person/${s.person.id}` : "";
  const tickInbox = useEffectEvent(() => { loadInbox(me, s.groups).catch(() => {}); });
  useEffect(() => { if (!me) return; tickInbox(); const h = setInterval(tickInbox, 90000); return () => clearInterval(h); }, [me, s.groups.length]);
  return <View style={{ flex: 1 }} {...swipe.panHandlers}>
    <Tabs screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => {
        const activeRoute = state.routes[state.index]?.name ?? "home";
        const props = { active: activeRoute as TabKey, items, badge, me: { name: personName(s.person), photo: s.person?.photo },
          onSelect: (k: TabKey) => { if (k === "add") return setAdding(true); const r = state.routes.find((x) => x.name === k); if (r && k !== activeRoute) navigateToTab(r.key); } };
        return <><SwipeTo order={items.filter((k) => k !== "add")} active={activeRoute} go={(name) => { const r = state.routes.find((x) => x.name === name); if (r) navigateToTab(r.key); }} /><TabBar {...props} /></>;
      }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="nearby" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="story" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="people" />
      <Tabs.Screen name="team" />
    </Tabs>
    <Fab onPress={() => setAdding(true)} style={{ position: "absolute", right: Math.max(18, (width - 520) / 2 + 18), bottom: TAB_BAR_HEIGHT + inset.bottom + 16 }} />
    <AddSheet open={adding} onClose={() => setAdding(false)} ctx={{ kind: "home", event: nextEvent }} onAsk={() => { setAdding(false); setTimeout(bayani.open, 260); }} />
  </View>;
}

/*
 * Swipe left or right on a tab (horizontal carousels and chips keep their own swipes, since they claim it first) to
 * move to the next or previous one. There is one tab bar, so what it shows lives here, set after each of its renders.
 */
let showing: { active: string; order: string[]; go: (name: string) => void } | null = null;
const swipe = PanResponder.create({
  onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5,
  onPanResponderRelease: (_, g) => {
    const n = showing; if (!n || Math.abs(g.dx) < 70) return;
    const i = n.order.indexOf(n.active), j = i + (g.dx < 0 ? 1 : -1);
    if (i >= 0 && j >= 0 && j < n.order.length) n.go(n.order[j]!);
  },
});
function SwipeTo(p: { active: string; order: string[]; go: (name: string) => void }) {
  useEffect(() => { showing = p; return () => { showing = null; }; });
  return null;
}
