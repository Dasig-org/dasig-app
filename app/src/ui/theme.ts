/** Dasig app-parity tokens (design/DESIGN_STANDARD.md §6). */
export const c: Record<"wash" | "white" | "ink" | "slate" | "s500" | "s400" | "s300" | "s200" | "primary" | "accent" | "gold" | "sand", string> = {
  wash: "#F2F2F7", white: "#ffffff", ink: "#0F172A", slate: "#475569", s500: "#6B7280", s400: "#9CA3AF", s300: "#D1D1D6", s200: "#E5E5EA",
  primary: "#F47C26", accent: "#E85C21", gold: "#FBB931", sand: "#FFF8F1",
};
/**
 * Light and dark palettes (UI_REIMAGINE §2.2, step 5). `c` and `tone` are plain mutable objects read at render time, so
 * switching is `applyScheme()` once at startup (ui/scheme.ts) before the first screen draws; a change in Settings
 * takes effect the next time the app opens (switching live would remount the navigator and lose the person's place).
 */
export type Scheme = "light" | "dark";
const LIGHT = { c: { ...c }, tone: { primaryContainer: "#FFE9DC", onPrimaryContainer: "#3A0B00", secondaryContainer: "#E9E9EE", onSecondaryContainer: "#0F172A", errorContainer: "#FFDAD6", onErrorContainer: "#410002", error: "#BA1A1A", surface: "#FFFFFF", surfaceContainer: "#F2F2F7", surfaceHigh: "#F9F9FB" }, tint: { rest: "rgba(15, 23, 42, 0.06)", pressed: "rgba(15, 23, 42, 0.11)" } };
const DARK = { c: { wash: "#171310", white: "#231E1B", ink: "#F5EEEA", slate: "#CFC5BF", s500: "#A99F99", s400: "#8B817B", s300: "#4D4541", s200: "#3A332F", primary: "#F47C26", accent: "#FF8A4A", gold: "#FBB931", sand: "#3A2B1E" },
  tone: { primaryContainer: "#5C2A10", onPrimaryContainer: "#FFDBC9", secondaryContainer: "#3A332F", onSecondaryContainer: "#F5EEEA", errorContainer: "#5C1A16", onErrorContainer: "#FFDAD6", error: "#FFB4AB", surface: "#171310", surfaceContainer: "#231E1B", surfaceHigh: "#2D2724" },
  tint: { rest: "rgba(255, 255, 255, 0.08)", pressed: "rgba(255, 255, 255, 0.14)" } };
export let scheme: Scheme = "light";
export function applyScheme(next: Scheme) {
  scheme = next;
  const p = next === "dark" ? DARK : LIGHT;
  Object.assign(c, p.c); Object.assign(tone, p.tone); Object.assign(tint, p.tint);
}
/**
 * One continuous-curve scale (2026-11-07): 24 for outer surfaces (panels, cards, notes, sheets), 16 for elements
 * inside them (fields, thumbnails, file tiles), 999 for anything pill-shaped. 48 is the device frame in mockups only.
 * hero, tile and sheet are kept as names for outer surfaces; field is an inner element.
 */
export const radius = { pill: 999, panel: 24, inner: 16, frame: 48, hero: 24, tile: 24, sheet: 24, field: 16 };
/** Primary button: a subtle vertical gradient of the brand orange, with a soft orange shadow. */
export const primaryFill = { backgroundImage: "linear-gradient(180deg, #F47C26 0%, #E85C21 100%)", boxShadow: "0px 6px 16px rgba(244, 124, 38, 0.25)" };
/** Secondary button: borderless, a tint of ink that reads on both the wash page and white surfaces. */
export const tint: { rest: string; pressed: string } = { rest: "rgba(15, 23, 42, 0.06)", pressed: "rgba(15, 23, 42, 0.11)" };
/** Material 3 scale (UI_REIMAGINE §2.2): nothing below 12, body 16/24. Letter-spacing per Material, not tuned for SF. */
export const scale = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const },
  titleSmall: { fontSize: 17, lineHeight: 24, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600" as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: "700" as const },
};
/** Getters, so colours follow the active scheme (read at render, after applyScheme at startup). */
export const type = {
  get title() { return { ...scale.display, color: c.ink }; },
  get row() { return { ...scale.titleSmall, color: c.ink }; },
  get meta() { return { fontSize: 14, lineHeight: 20, color: c.s500 }; },
  get body() { return { ...scale.body, color: c.slate }; },
  get eyebrow() { return { ...scale.overline, letterSpacing: 1.2, textTransform: "uppercase" as const, color: c.s500 }; },
};
/** M3 tonal roles from the brand orange; chips and state colour (open / done / late). */
export const tone: Record<"primaryContainer" | "onPrimaryContainer" | "secondaryContainer" | "onSecondaryContainer" | "errorContainer" | "onErrorContainer" | "error" | "surface" | "surfaceContainer" | "surfaceHigh", string> = {
  primaryContainer: "#FFE9DC", onPrimaryContainer: "#3A0B00",
  secondaryContainer: "#E9E9EE", onSecondaryContainer: "#0F172A",
  errorContainer: "#FFDAD6", onErrorContainer: "#410002", error: "#BA1A1A",
  surface: "#FFFFFF", surfaceContainer: "#F2F2F7", surfaceHigh: "#F9F9FB",
};
/** Motion (§2.3): springs and durations shared by every component so the app moves as one. */
export const motion = {
  spring: { stiffness: 380, damping: 30 },
  sheet: { stiffness: 260, damping: 28, mass: 0.9 },
  press: { in: 90, scale: 0.97 },
  fade: 200, tab: 150, transform: 350,
};
/** Fixed hues: a person's colour doesn't change with the scheme. */
export const avatarColors = ["#E85C21", "#475569", "#FBB931", "#F47C26", "#0F172A", "#94a3b8"];
