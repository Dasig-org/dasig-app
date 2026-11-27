import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { checkForUpdate, dismissUpdate, openStore, type UpdateState } from "@/lib/update";
import { c } from "./theme";

/** "A new version is ready" (dismissable) or, below the minimum, a full screen with only Update (lib/update.ts). */
export function UpdateGate() {
  const [state, setState] = useState<UpdateState>({ kind: "none" });
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const run = () => { checkForUpdate().then(setState).catch(() => {}); };
    run();
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") run(); });
    return () => sub.remove();
  }, []);
  if (state.kind === "none") return null;
  const update = <Pressable accessibilityRole="button" onPress={() => openStore(state.url)}
    style={{ height: 44, paddingHorizontal: 20, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.accent }}>
    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>Update</Text></Pressable>;
  if (state.kind === "require") return <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.wash, alignItems: "center", justifyContent: "center", padding: 24 }}>
    <Text style={{ fontSize: 22, fontWeight: "700", color: c.ink, textAlign: "center" }}>Time to update the Dasig app</Text>
    <Text style={{ fontSize: 14, color: c.s500, textAlign: "center", marginTop: 8, marginBottom: 20, maxWidth: 320 }}>{"This version can't keep working with your group's records. Your work is safe: update, and it's all still here."}</Text>
    {update}
  </View>;
  return <View style={{ position: "absolute", left: 12, right: 12, bottom: insets.bottom + 72, backgroundColor: c.white, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 }}>
    <Text style={{ flex: 1, fontSize: 14, color: c.ink }}>A new version of the Dasig app is ready.</Text>
    <Pressable accessibilityRole="button" onPress={() => { void dismissUpdate(state.latest); setState({ kind: "none" }); }} style={{ padding: 8 }}><Text style={{ fontSize: 14, color: c.s500 }}>Later</Text></Pressable>
    {update}
  </View>;
}
