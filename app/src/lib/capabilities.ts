import { Platform } from "react-native";

/**
 * What this build can do (workspace/docs/pwa/PWA_PLAN.md). The web app and the PWA work against the Dasig Ecosystem
 * only: a browser can't host a group, find phones on the network, or reach a hub over plain http from an https page.
 * Screens hide what isn't possible here instead of showing it greyed out.
 */
const web = Platform.OS === "web";
export const can = {
  hub: !web,          // be or join a phone hub, pair by QR
  localGroups: !web,  // keep a group only on this phone
  scan: !web,         // scan a code with the camera
  haptics: !web,
};
/** Installed to the Home Screen (iOS/Android) rather than opened in a browser tab. */
export const installed = () => web && typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
/** Opened inside Messenger, Facebook, Instagram or similar, where installing and keeping storage don't work. */
export const inAppBrowser = () => web && typeof navigator !== "undefined" && /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Messenger/i.test(navigator.userAgent);
