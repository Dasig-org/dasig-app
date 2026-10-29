import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Image, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { c, type as t } from "@/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Boot: the Dasig mark while the phone's own server starts, then the right first screen. */
export default function Boot() {
  const s = useSession();
  const [held, setHeld] = useState(true);
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); const t = setTimeout(() => setHeld(false), 900); return () => clearTimeout(t); }, []);
  if (!s.ready || held) return (
    <View accessibilityLabel="Dasig is starting" style={{ flex: 1, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
      <Image source={require("../../assets/brand/emblem.png")} style={{ width: 96, height: 96 }} accessibilityLabel="Dasig" />
      <Text style={{ fontSize: 30, fontWeight: "800", color: c.primary, marginTop: 14, letterSpacing: 0.3 }}>Dasig</Text>
      <Text style={[t.meta, { marginTop: 18 }]}>Doing good work, together</Text>
    </View>
  );
  if (!s.person) return <Redirect href={"/start" as never} />;
  if (!s.profileDone) return <Redirect href={"/profile?first=1" as never} />;
  if (!s.groups.length) return <Redirect href={"/paths" as never} />;
  return <Redirect href="/home" />;
}
