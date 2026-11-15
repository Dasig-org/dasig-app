import { listenForPushTaps } from "@/lib/push";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { loadScheme } from "@/ui/scheme";
import { installViewTransitions } from "@/ui/viewTransitions";
import { c, scheme as active } from "@/ui/theme";
import { router, Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SnackbarProvider } from "@/ui/Snackbar";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";
import { KProvider } from "@/ui/kbd";
import { BayaniProvider } from "@/ui/Bayani";
import { ScreenFab } from "@/ui/ScreenFab";
import { ScreenButton } from "@/ui/kit";

export default function Layout() {
  // The scheme (light/dark) is decided once, before anything draws, so every screen reads the same palette.
  const [ready, setReady] = useState(false);
  useEffect(() => { loadScheme().finally(() => setReady(true)); installViewTransitions(); }, []);
  // Android app: a tapped push opens the screen it points to (lib/push.ts).
  useEffect(() => { let stop = () => {}; listenForPushTaps((url) => router.push(url as never)).then((f) => { stop = f; }).catch(() => {}); return () => stop(); }, []);
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
