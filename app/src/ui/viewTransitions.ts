import { Platform } from "react-native";

/**
 * Web (the PWA): route changes crossfade with the View Transitions API instead of blinking. History pushes and
 * replaces are wrapped: the old page is captured, the router renders the new one, and the browser fades between them
 * (about 200 ms). Back and forward use the browser's own handling. Does nothing where the API is missing or when the
 * person asks for reduced motion. Call once at startup (app/_layout.tsx).
 */
export function installViewTransitions() {
  if (Platform.OS !== "web" || typeof document === "undefined" || typeof history === "undefined") return;
  const doc = document as Document & { startViewTransition?: (cb: () => Promise<void> | void) => unknown };
  if (!doc.startViewTransition || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const w = window as unknown as { __dasigVT?: boolean };
  if (w.__dasigVT) return; w.__dasigVT = true;
  const style = document.createElement("style");
  style.textContent = "::view-transition-old(root),::view-transition-new(root){animation-duration:200ms;animation-timing-function:cubic-bezier(.2,0,0,1)}";
  document.head.appendChild(style);
  for (const m of ["pushState", "replaceState"] as const) {
    const orig = history[m].bind(history);
    history[m] = (...a: Parameters<History["pushState"]>) => {
      const before = location.pathname;
      orig(...a);
      if (location.pathname === before) return;
      try { doc.startViewTransition!(() => new Promise<void>((r) => setTimeout(r, 90))); } catch { /* the page changed anyway */ }
    };
  }
}
