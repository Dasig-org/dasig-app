import { Text } from "react-native";
import { coreCheck } from "@/lib/core-check";
export default function CoreCheck() {
  let out: string;
  try { out = JSON.stringify(coreCheck()); } catch (e) { out = "ERROR " + String(e); }
  return <Text testID="core">{`core:${out}`}</Text>;
}
