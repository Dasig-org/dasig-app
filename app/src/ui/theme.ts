/** Dasig app-parity tokens (design/DESIGN_STANDARD.md §6). */
export const c = {
  wash: "#f1f5f9", white: "#ffffff", ink: "#0F172A", slate: "#475569", s500: "#64748b", s400: "#94a3b8", s300: "#cbd5e1", s200: "#e2e8f0",
  primary: "#F47C26", accent: "#E85C21", gold: "#FBB931", sand: "#FFF6E9",
};
/**
 * One continuous-curve scale (2026-11-07): 24 for outer surfaces (panels, cards, notes, sheets), 16 for elements
 * inside them (fields, thumbnails, file tiles), 999 for anything pill-shaped. 48 is the device frame in mockups only.
 * hero, tile and sheet are kept as names for outer surfaces; field is an inner element.
 */
export const radius = { pill: 999, panel: 24, inner: 16, frame: 48, hero: 24, tile: 24, sheet: 24, field: 16 };
/** Primary button: a subtle vertical gradient of the brand orange, with a soft orange shadow. */
export const primaryFill = { backgroundImage: "linear-gradient(180deg, #F47C26 0%, #E85C21 100%)", boxShadow: "0px 6px 16px rgba(244, 124, 38, 0.25)" };
/** Secondary button: borderless, a tint of ink that reads on both the wash page and white surfaces. */
export const tint = { rest: "rgba(15, 23, 42, 0.06)", pressed: "rgba(15, 23, 42, 0.11)" };
export const type = {
  title: { fontSize: 26, fontWeight: "700" as const, color: c.ink, letterSpacing: -0.5 },
  row: { fontSize: 15, fontWeight: "600" as const, color: c.ink, letterSpacing: -0.15 },
  meta: { fontSize: 13, color: c.s500 },
  body: { fontSize: 14.5, color: c.slate, lineHeight: 21 },
  eyebrow: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 1.4, textTransform: "uppercase" as const, color: c.s500 },
};
export const avatarColors = [c.accent, c.slate, c.gold, c.primary, c.ink, c.s400];
