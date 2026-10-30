import { Redirect, useLocalSearchParams } from "expo-router";
/** dasig://pair?hub=…&code=… opened from the phone's camera: hand it to the scanner screen. */
export default function PairLink() {
  const p = useLocalSearchParams<{ hub?: string; code?: string; link?: string }>();
  return <Redirect href={{ pathname: "/scan-confirm" as never, params: p }} />;
}
