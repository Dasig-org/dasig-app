import { Text, View } from "react-native";
import { Icon } from "./Icon";
import { Outline } from "./kit";
import { c, tone, type as t } from "./theme";

/**
 * When a page can't load (review 2026-11-15: it was one line of plain text on an empty page): an icon, what went wrong
 * in plain words, and Try again. Offline is said as offline, since much of the app still works without signal.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const offline = /network|fetch|offline|timed? ?out|connection/i.test(message);
  return <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 12 }}>
    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: tone.errorContainer, alignItems: "center", justifyContent: "center" }}>
      <Icon name={offline ? "wifioff" : "pending"} size={28} color={tone.onErrorContainer} /></View>
    <Text style={[t.title, { fontSize: 20, marginTop: 14, textAlign: "center" }]}>{offline ? "You're offline" : "This didn't load"}</Text>
    <Text style={[t.meta, { textAlign: "center", marginTop: 6, maxWidth: 320 }]}>{offline ? "Check your signal and try again. What's saved on this phone still works." : message}</Text>
    {onRetry ? <View style={{ marginTop: 14 }}><Outline label="Try again" onPress={onRetry} /></View> : null}
    <Text style={{ height: 0, color: c.s500 }} />
  </View>;
}
