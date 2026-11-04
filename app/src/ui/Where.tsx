import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { onPending } from "@/lib/outbox";
import { onReach, reach } from "@/lib/reach";
import { useSession } from "@/lib/session";
import { Icon, type IconName } from "./Icon";
import { c, radius } from "./theme";

export function ago(t: number | null, now = Date.now()) {
  if (!t) return "not yet";
  const m = Math.round((now - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(t).toLocaleDateString();
}

/** Where this screen's records come from and how fresh they are, in a few words. */
export function useWhere(): { icon: IconName; text: string; warn: boolean; detail: string } {
  const s = useSession();
  const [r, setR] = useState(reach());
  const [waiting, setWaiting] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => onReach(setR), []);
  useEffect(() => onPending(setWaiting), []);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const kind = s.connection?.kind ?? "phone";
  const w = waiting ? ` · ${waiting} waiting` : "";
  if (kind === "phone") return r.hosting
    ? { icon: "wifi", text: "This phone is the hub", warn: false, detail: "Your group's records are kept on this phone. Paired phones save here." }
    : { icon: "phone", text: "Saved on this phone", warn: false, detail: "Everything is kept on this phone. Nothing needs the internet." };
  const place = kind === "hub" ? "Hub" : kind === "ecosystem" ? "Ecosystem" : "Online";
  const down = r.lastFail !== null && (r.lastOk === null || r.lastFail > r.lastOk);
  if (down) return { icon: "wifioff", warn: true, text: `${place} not reachable · from ${ago(r.lastOk)}${w}`,
    detail: kind === "hub" ? "Join the hub phone's Wi-Fi or hotspot. What you add is kept here and sent when you're back." : "You're offline. What you add is kept here and sent when you're back." };
  const fresh = r.lastOk !== null && Date.now() - r.lastOk < 120000;
  return { icon: kind === "hub" ? "wifi" : "cloud", warn: !!waiting, text: fresh && !waiting ? `${place} · up to date` : `${place} · updated ${ago(r.lastOk)}${w}`,
    detail: kind === "hub" ? `Saved on ${(s.connection as { name?: string }).name ?? "your group's hub"} and copied to this phone.` : kind === "ecosystem" ? "Saved on the Dasig Ecosystem, Dasig's online Bayanihan Server, and backed up." : "Saved on the online Bayanihan Server." };
}

/** The small "where is this saved" pill at the top of every screen. Tap for Sync. */
export function Where() {
  const w = useWhere();
  return (
    <Pressable onPress={() => router.push("/sync" as never)} accessibilityRole="button" accessibilityLabel={`${w.text}. Open sync.`} hitSlop={6}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: w.warn ? c.sand : "transparent", alignSelf: "center", maxWidth: 250 }}>
      <Icon name={w.icon} size={12} color={w.warn ? c.accent : c.s400} />
      <Text numberOfLines={1} style={{ fontSize: w.warn ? 12 : 11.5, fontWeight: w.warn ? "600" : "500", color: w.warn ? c.accent : c.s400, flexShrink: 1 }}>{w.text}</Text>
      {w.warn ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} /> : null}
    </Pressable>
  );
}
