/** Dasig app-parity tokens (design/DESIGN_STANDARD.md §6). */
export const c = {
  wash: "#f1f5f9", white: "#ffffff", ink: "#0F172A", slate: "#475569", s500: "#64748b", s400: "#94a3b8", s300: "#cbd5e1", s200: "#e2e8f0",
  primary: "#F47C26", accent: "#E85C21", gold: "#FBB931", sand: "#FFF6E9",
};
export const radius = { pill: 999, hero: 26, field: 22, tile: 20, sheet: 28 };
export const type = {
  title: { fontSize: 26, fontWeight: "700" as const, color: c.ink },
  row: { fontSize: 15, fontWeight: "600" as const, color: c.ink },
  meta: { fontSize: 13, color: c.s500 },
  body: { fontSize: 14.5, color: c.slate, lineHeight: 21 },
  eyebrow: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.8, textTransform: "uppercase" as const, color: c.s400 },
};
export const avatarColors = [c.accent, c.slate, c.gold, c.primary, c.ink, c.s400];
