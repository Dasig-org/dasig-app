import { listenForPushTaps } from "@/lib/push";
import { useEffect } from "react";
import { router, Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";
import { KProvider } from "@/ui/kbd";

export default function Layout() {
  // Android app: a tapped push opens the screen it points to (lib/push.ts).
  useEffect(() => { let stop = () => {}; listenForPushTaps((url) => router.push(url as never)).then((f) => { stop = f; }).catch(() => {}); return () => stop(); }, []);
  return (
    <SafeAreaProvider>
      <KProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#f1f5f9" } }} />
      </SessionProvider>
      </KProvider>
    </SafeAreaProvider>
  );
}
