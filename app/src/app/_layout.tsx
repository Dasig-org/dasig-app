import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", gestureEnabled: true, contentStyle: { backgroundColor: "#f1f5f9" } }} />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
