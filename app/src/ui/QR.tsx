import { lazy, Suspense } from "react";
import { View } from "react-native";

/** A QR code, loaded only when shown (it's used for hub pairing on phones, so the web bundle never carries it). */
const Code = lazy(() => import("react-native-qrcode-svg"));
export function QR(props: { value: string; size?: number; color?: string; backgroundColor?: string }) {
  return <Suspense fallback={<View style={{ width: props.size ?? 200, height: props.size ?? 200 }} />}><Code {...props} /></Suspense>;
}
