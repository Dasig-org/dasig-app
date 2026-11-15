import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { c, radius, tone, type as t } from "./theme";

/**
 * A request you answer (someone asking to join, an ask, an offer): who or what on the left, the request, then its
 * buttons on their own line under the text, so the text never squeezes into a narrow column (review 2026-11-15).
 * Used by the Inbox, People and a team's page.
 */
export function SmallButton({ label, onPress, primary, busy }: { label: string; onPress: () => void; primary?: boolean; busy?: boolean }) {
  return <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: "center", opacity: busy ? 0.6 : 1,
      backgroundColor: primary ? (pressed ? "#C2410C" : c.accent) : pressed ? c.s200 : tone.surfaceHigh, borderWidth: primary ? 0 : 1, borderColor: c.s200 })}>
    <Text style={{ fontSize: 14, fontWeight: "700", color: primary ? c.white : c.ink }}>{busy ? "…" : label}</Text></Pressable>;
}
export function AnswerRow({ left, title, meta, yesLabel = "Accept", noLabel = "Decline", onYes, onNo, first, busy }: {
  left: ReactNode; title: string; meta?: string; yesLabel?: string; noLabel?: string; onYes: () => void; onNo?: () => void; first?: boolean; busy?: boolean;
}) {
  return <View style={{ paddingVertical: 14, borderTopWidth: first ? 0 : 1, borderTopColor: c.s200 }}>
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>{left}<View style={{ flex: 1 }}><Text style={t.row}>{title}</Text>{meta ? <Text style={[t.meta, { marginTop: 2 }]}>{meta}</Text> : null}</View></View>
    <View style={{ flexDirection: "row", gap: 8, marginTop: 10, marginLeft: 52 }}>
      <SmallButton primary label={yesLabel} busy={busy} onPress={onYes} />
      {onNo ? <SmallButton label={noLabel} onPress={onNo} /> : null}
    </View>
  </View>;
}
