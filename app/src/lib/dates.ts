/** Small date helpers in plain words. Dates are kept as ISO strings with the phone's offset. */
export const DAY = 86400000;
export function weekLabel(iso?: string): string {
  if (!iso) return "No date yet";
  const d = new Date(iso), now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const diff = Math.floor((d.getTime() - start.getTime()) / (7 * DAY));
  if (diff < 0) return "Earlier";
  if (diff === 0) return "This week";
  if (diff === 1) return "Next week";
  return d.toLocaleDateString(undefined, { month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}
export const short = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
/** Accepts "2027-03-01" or "1 Mar 2027" style input; returns ISO or null. */
export function parseDate(text: string): string | null {
  const t = text.trim(); if (!t) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T09:00:00` : t);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
export const quick = () => { const n = new Date(); n.setHours(17, 0, 0, 0); const fri = new Date(n); fri.setDate(n.getDate() + ((5 - n.getDay() + 7) % 7 || 7)); const nw = new Date(n); nw.setDate(n.getDate() + 7);
  return [{ label: "Today", iso: n.toISOString() }, { label: "Friday", iso: fri.toISOString() }, { label: "In a week", iso: nw.toISOString() }]; };
