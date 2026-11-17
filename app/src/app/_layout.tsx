import { listenForPushTaps } from "@/lib/push";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { reportProblem } from "@/ui/About";
import { loadScheme } from "@/ui/scheme";
import { installViewTransitions } from "@/ui/viewTransitions";
import { c, scheme as active } from "@/ui/theme";
import { router, Stack, useSegments, type ErrorBoundaryProps } from "expo-router";
import { trackScreen } from "@/lib/analytics";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SnackbarProvider } from "@/ui/Snackbar";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";
import { KProvider } from "@/ui/kbd";
import { BayaniProvider } from "@/ui/Bayani";
import { ScreenFab } from "@/ui/ScreenFab";
import { ScreenButton } from "@/ui/kit";

/** When a screen crashes: say so in plain words, with a way back and a way to tell us. Drawn outside the providers, so it uses nothing from them. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const button = (label: string, onPress: () => void, filled?: boolean) => <Pressable accessibilityRole="button" onPress={onPress}
    style={{ height: 48, paddingHorizontal: 22, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: filled ? c.accent : "transparent", borderWidth: filled ? 0 : 1, borderColor: c.s300 }}>
    <Text style={{ fontSize: 15, fontWeight: "700", color: filled ? "#FFFFFF" : c.ink }}>{label}</Text></Pressable>;
  return <View style={{ flex: 1, backgroundColor: c.wash, alignItems: "center", justifyContent: "center", padding: 24 }}>
    <Text style={{ fontSize: 22, fontWeight: "700", color: c.ink, textAlign: "center" }}>Something went wrong</Text>
    <Text style={{ fontSize: 14, color: c.s500, textAlign: "center", marginTop: 8, maxWidth: 320 }}>What you saved is safe. Try again, or tell us what happened.</Text>
    <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
      {button("Try again", () => { void retry(); }, true)}
      {button("Tell Dasig", () => { void reportProblem("a crash", `${error.message}\n${(error.stack ?? "").split("\n").slice(0, 5).join("\n")}`); })}
    </View>
  </View>;
}

export default function Layout() {
  // The scheme (light/dark) is decided once, before anything draws, so every screen reads the same palette.
  const [ready, setReady] = useState(false);
  useEffect(() => { loadScheme().finally(() => setReady(true)); installViewTransitions(); }, []);
  // Android app: a tapped push opens the screen it points to (lib/push.ts).
  useEffect(() => { let stop = () => {}; listenForPushTaps((url) => router.push(url as never)).then((f) => { stop = f; }).catch(() => {}); return () => stop(); }, []);
  // Web only: count screens by their route shape (/project/[id]/plan), never their IDs (lib/analytics.web.ts).
  const segments = useSegments() as string[];
  const route = "/" + segments.filter((s) => !s.startsWith("(")).join("/");
  useEffect(() => { trackScreen(route); }, [route]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: "#F2F2F7" }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <KProvider>
      <SessionProvider>
        <StatusBar style={active === "dark" ? "light" : "dark"} />
        {/* Every Screen draws the Bayani button (ui/Bayani.tsx) in the same corner. */}
        <ScreenButton.Provider value={ScreenFab}><BayaniProvider>
          <SnackbarProvider>
            <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom", contentStyle: { backgroundColor: c.wash } }} />
          </SnackbarProvider>
        </BayaniProvider></ScreenButton.Provider>
      </SessionProvider>
      </KProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
