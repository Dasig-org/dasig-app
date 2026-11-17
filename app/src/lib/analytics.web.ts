/*
 * Google Analytics 4 on volunteer.dasig.org. gtag.js is added to index.html by scripts/pwa.mjs for the production
 * build only, so local dev and the Android app send nothing.
 *
 * Only the route's shape is sent (/project/[id]/plan, /join/[token]), never IDs, invite codes, names or query strings.
 * Each view says whether Dasig was opened as an installed app (PWA) or in a browser tab.
 */
declare global { interface Window { gtag?: (...a: unknown[]) => void } }

const mode = () =>
  (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches) || (navigator as { standalone?: boolean }).standalone
    ? "installed" : "browser";

let last = "";
export function trackScreen(route: string): void {
  if (typeof window === "undefined" || !window.gtag || route === last) return;
  last = route;
  const m = mode();
  window.gtag("set", "user_properties", { app_mode: m });
  // "set" applies to every later event, including Google's automatic ones, so raw URLs (IDs, codes) are never sent.
  window.gtag("set", { page_location: location.origin + route, page_path: route });
  window.gtag("event", "page_view", { page_path: route, page_location: location.origin + route, page_title: route, app_mode: m });
}
