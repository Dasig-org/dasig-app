import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, motion } from "./theme";

type Item = { id: number; text: string; undo?: () => void; error?: boolean };
type Api = { show: (text: string, o?: { undo?: () => void; error?: boolean; ms?: number }) => void };
const Ctx = createContext<Api>({ show: () => {} });
export const useSnackbar = () => useContext(Ctx);

/** One place for feedback, at the thumb above the bar (UI_REIMAGINE §2.4). Replaces Notice text and most Alerts. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<Item | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = useRef(0);
  const inset = useSafeAreaInsets();
  const dismiss = useCallback(() => { if (timer.current) clearTimeout(timer.current); setItem(null); }, []);
  const show = useCallback<Api["show"]>((text, o) => {
    if (timer.current) clearTimeout(timer.current);
    setItem({ id: ++n.current, text, undo: o?.undo, error: o?.error });
    timer.current = setTimeout(() => setItem(null), o?.ms ?? (o?.undo ? 5000 : 3000));
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const api = useMemo(() => ({ show }), [show]);
  return <Ctx.Provider value={api}>
    {children}
    {item ? <Animated.View key={item.id} entering={FadeInDown.duration(motion.fade)} exiting={FadeOut.duration(motion.tab)} layout={LinearTransition.springify().stiffness(motion.spring.stiffness).damping(motion.spring.damping)}
      pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: inset.bottom + 84, alignItems: "center" }}>
      <View role="alert" style={{ flexDirection: "row", alignItems: "center", maxWidth: 520, width: "100%", minHeight: 48, borderRadius: 16, backgroundColor: item.error ? "#BA1A1A" : c.ink, paddingLeft: 16, paddingRight: item.undo ? 4 : 16, paddingVertical: 6, elevation: 6, boxShadow: "0px 4px 16px rgba(15,23,42,0.25)" }}>
        <Text style={{ flex: 1, color: c.white, fontSize: 14, lineHeight: 20, fontWeight: "500" }}>{item.text}</Text>
        {item.undo ? <Pressable accessibilityRole="button" accessibilityLabel="Undo" onPress={() => { const u = item.undo; dismiss(); u?.(); }} style={{ minHeight: 48, minWidth: 64, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
          <Text style={{ color: c.gold, fontWeight: "700", fontSize: 14 }}>Undo</Text></Pressable> : null}
      </View>
    </Animated.View> : null}
  </Ctx.Provider>;
}

/**
 * The commit pattern (§2.3): run the action, light haptic, snackbar with Undo.
 * `commit("Added Recruit route marshals", () => add(), { undo: () => remove() })` — `do` may throw; the error shows in the snackbar.
 */
export function useCommit() {
  const { show } = useSnackbar();
  return useCallback(async <T,>(message: string, run: () => Promise<T> | T, o?: { undo?: () => void }) => {
    try {
      const r = await run();
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      show(message, { undo: o?.undo });
      return r;
    } catch (e) {
      show(e instanceof Error ? e.message : "That didn't work. Try again.", { error: true });
      return undefined;
    }
  }, [show]);
}
