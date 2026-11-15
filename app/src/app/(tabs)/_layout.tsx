import { useEffect, useRef, useState } from "react";
import { useBar } from "@/lib/bar";
import { loadInbox, onInboxCount } from "@/lib/inbox";
import { Tabs } from "expo-router";
import { PanResponder, Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Fab } from "@/ui/Fab";
import { useSnackbar } from "@/ui/Snackbar";
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
  const { show } = useSnackbar();
  const bayani = useBayani();
  // The "+" moved from the middle of the bar to the corner (2026-11-15): say so once.
  useEffect(() => { AsyncStorage.getItem("dasig.tip.fab").then((v) => { if (v) return; AsyncStorage.setItem("dasig.tip.fab", "1").catch(() => {}); show("The + is now the orange button in the corner.", { ms: 6000 }); }).catch(() => {}); }, []);
  const items = ["home", bar.slots[0], "add", bar.slots[1], bar.slots[2]] as TabKey[];
  const [badge, setBadge] = useState(0);
  // The next event in this group, so "+" can offer "Add work to <event>".
  const [nextEvent, setNextEvent] = useState<R | null>(null);
  useEffect(() => { if (!adding || !s.current || !s.isLead) return;
    bix.search("Initiative", { organization: `Organization/${s.current.id}` }).then((ps) => setNextEvent(ps.filter((p) => p.status === "active" && p.period?.start && Date.parse(p.period.start) > Date.now() - 86400000)
      .sort((a, b) => a.period.start.localeCompare(b.period.start))[0] ?? ps.filter((p) => p.status === "active")[0] ?? null)).catch(() => setNextEvent(null)); }, [adding, s.current?.id]);
  useEffect(() => onInboxCount(setBadge), []);
  useEffect(() => { const me = s.person ? `Person/${s.person.id}` : ""; if (!me) return; const tick = () => loadInbox(me, s.groups).catch(() => {}); tick(); const h = setInterval(tick, 90000); return () => clearInterval(h); }, [s.person?.id, s.groups.length]);
  // Swipe left or right on a tab (horizontal carousels and chips keep their own swipes, since they claim it first) to move to the next or previous one (Home, Nearby, Groups, Me).
  const order = useRef<string[]>([]); order.current = items.filter((k) => k !== "add");
  const nav = useRef<{ active: string; go: (name: string) => void } | null>(null);
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5,
    onPanResponderRelease: (_, g) => {
      const n = nav.current; if (!n || Math.abs(g.dx) < 70) return;
      const O = order.current; const i = O.indexOf(n.active); const j = i + (g.dx < 0 ? 1 : -1);
      if (i >= 0 && j >= 0 && j < O.length) n.go(O[j]!);
    },
  })).current;
  return <View style={{ flex: 1 }} {...swipe.panHandlers}>
    <Tabs screenOptions={{ headerShown: false }}
      tabBar={({ state, navigateToTab }) => {
        const activeRoute = state.routes[state.index]?.name ?? "home";
        nav.current = { active: activeRoute, go: (name) => { const r = state.routes.find((x) => x.name === name); if (r) navigateToTab(r.key); } };
        const props = { active: activeRoute as TabKey, items, badge, me: { name: personName(s.person), photo: s.person?.photo },
          onSelect: (k: TabKey) => { if (k === "add") return setAdding(true); const r = state.routes.find((x) => x.name === k); if (r && k !== activeRoute) navigateToTab(r.key); } };
        return <TabBar {...props} />;
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
