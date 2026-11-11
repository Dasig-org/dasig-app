import { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { friendly } from "@/lib/bix";
import { clearRefused, flush, onPending, onRefused, type Refusal } from "@/lib/outbox";
import { Icon } from "./Icon";
import { c, radius } from "./theme";

/** Honest about offline: what's waiting, and anything refused when it synced. Never silently dropped. */
export function SyncBar() {
  const [n, setN] = useState(0);
  const [refused, setRefused] = useState<Refusal[]>([]);
  useEffect(() => onPending(setN), []);
  useEffect(() => onRefused(setRefused), []);
  useEffect(() => {
    const tryFlush = () => flush().catch(() => {});
    tryFlush();
    const t = setInterval(tryFlush, 20000);
    const sub = AppState.addEventListener("change", (s) => s === "active" && tryFlush());
    return () => { clearInterval(t); sub.remove(); };
  }, []);
  if (!n && !refused.length) return null;
  return (
    <View style={{ backgroundColor: c.white, borderRadius: radius.tile, padding: 12, flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 12 }}>
      <Icon name="pending" color={c.slate} />
      <Text style={{ flex: 1, fontSize: 13, color: c.slate }}>
        {n ? `${n} change${n === 1 ? "" : "s"} waiting to sync.` : ""}
        {refused.length ? ` ${refused.length} couldn't be saved: ${refused[0]!.current?.owner ? "someone got there first" : friendly(refused[0]!.reasons[0] ?? "")}.` : ""}
      </Text>
      {refused.length ? <Text onPress={clearRefused} style={{ fontSize: 13, fontWeight: "600", color: c.ink, textDecorationLine: "underline" }}>OK</Text> : null}
    </View>
  );
}
