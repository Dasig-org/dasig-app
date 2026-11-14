// Polyfills first: the signing library reads crypto.getRandomValues when it loads.
import "react-native-get-random-values";
// Hermes (Android) has crypto.getRandomValues from the line above, but no crypto.randomUUID (2026-11-14: "undefined is
// not a function" when creating an event). A version-4 UUID from getRandomValues (not expo-crypto: on the web it calls
// crypto.randomUUID itself).
if (globalThis.crypto && typeof globalThis.crypto.randomUUID !== "function") {
  globalThis.crypto.randomUUID = () => {
    const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
}
import "react-native-url-polyfill/auto";
import "expo-router/entry";
