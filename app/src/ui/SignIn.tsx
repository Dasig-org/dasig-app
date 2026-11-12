import { Image, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Icon } from "./Icon";
import { c } from "./theme";

/*
 * Ways to sign in, drawn as in design/account-sketches.html: a white pill per method with its own mark. Google's mark
 * is its four-colour G (Google's sign-in branding), Dasig.org its carabao mark, email the mail icon on Sand.
 */
const DASIG = require("../../assets/images/dasig-mark.png");

export function GoogleG({ size = 22 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>;
}

/** A method's mark, in a circle the size of an avatar (lists) or bare (buttons). */
export function MethodIcon({ via, size = 40, bare }: { via: string; size?: number; bare?: boolean }) {
  const inner = Math.round(size * (bare ? 1 : 0.55));
  const mark = via === "google" ? <GoogleG size={inner} />
    : via === "dasig" ? <Image source={DASIG} style={{ width: bare ? size : size, height: bare ? size : size, borderRadius: bare ? size * 0.28 : size / 2 }} />
    : <Icon name={via === "email" ? "mail" : via === "hub" ? "wifioff" : "lock"} size={inner} color={c.accent} />;
  if (via === "dasig") return mark;
  if (bare && via === "google") return mark;
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: via === "google" ? c.white : c.sand, alignItems: "center", justifyContent: "center",
    ...(via === "google" && !bare ? { borderWidth: 1, borderColor: "rgba(15,23,42,0.08)" } : {}) }}>{mark}</View>;
}

/** One sign-in button: white pill, the method's mark, its label, and "Last used" when it was. */
export function SignInButton({ via, label, last, onPress, busy }: { via: string; label: string; last?: boolean; onPress: () => void; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={busy}
    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, height: 52, borderRadius: 26, backgroundColor: pressed ? c.wash : c.white, paddingHorizontal: 18, marginTop: 10, opacity: busy ? 0.6 : 1 })}>
    <MethodIcon via={via} size={via === "google" ? 22 : 26} bare={via !== "email"} />
    <Text style={{ fontSize: 15, fontWeight: "700", color: c.ink, flex: 1 }}>{busy ? "One moment…" : label}</Text>
    {last ? <View style={{ backgroundColor: c.wash, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ fontSize: 11, fontWeight: "700", color: c.s500 }}>Last used</Text></View> : null}
  </Pressable>;
}
