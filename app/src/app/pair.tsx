import { can } from "@/lib/capabilities";
import { Redirect, useLocalSearchParams } from "expo-router";
/** dasig://pair?hub=…&code=… opened from the phone's camera: hand it to the scanner screen. */
export default function PairLink() {
  // Phones only: a browser can't be or reach a hub (lib/capabilities).
  const p = useLocalSearchParams<{ hub?: string; code?: string; link?: string }>();
  if (!can.hub) return <Redirect href={"/home" as never} />;
  return <Redirect href={{ pathname: "/scan-confirm" as never, params: p }} />;
}
