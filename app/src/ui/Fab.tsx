import { Platform, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { usePress } from "./kit";
import { c, primaryFill } from "./theme";

const SPARK = ["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"];
/**
 * The one round action button (UI_REIMAGINE §2.1; round, not a rounded square, 2026-11-15). "+" when the screen has
 * something to add (its sheet also holds "Ask Bayani"); the Bayani spark when the screen has nothing to add and the
 * button only opens Bayani. Position it from outside.
 */
export function Fab({ onPress, label = "Add", icon = "plus", style }: { onPress: () => void; label?: string; icon?: "plus" | "spark"; style?: object }) {
  const pr = usePress();
  return <Pressable onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }}
    onPressIn={pr.onPressIn} onPressOut={pr.onPressOut} accessibilityRole="button" accessibilityLabel={label} style={style}>
    <Animated.View style={[{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", ...primaryFill }, pr.style]}>
      <Svg width={26} height={26} viewBox="0 0 24 24">
        {icon === "plus" ? <Path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
          : SPARK.map((d) => <Path key={d} d={d} stroke="#fff" strokeWidth={1.9} fill="none" strokeLinejoin="round" strokeLinecap="round" />)}
      </Svg>
    </Animated.View>
  </Pressable>;
}
