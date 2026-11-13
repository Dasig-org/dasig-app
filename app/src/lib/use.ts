import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { onSynced } from "./outbox";
import { onLocalChange, type R } from "./bix";

/** Swap in any record with the same type and id (a few levels deep), keeping everything else as it is. */
function swap<T>(x: T, by: Map<string, R>, depth = 0): T {
  if (depth > 5 || x === null || typeof x !== "object") return x;
  if (Array.isArray(x)) { let changed = false; const out = x.map((v) => { const n = swap(v, by, depth + 1); if (n !== v) changed = true; return n; }); return (changed ? out : x) as T; }
  const o = x as Record<string, unknown>;
  if (typeof o.resourceType === "string" && typeof o.id === "string") { const n = by.get(`${o.resourceType}/${o.id}`); if (n && ((n.meta as any)?.version ?? 0) >= ((o.meta as any)?.version ?? 0)) return n as T; }
  let changed = false; const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) { const n = swap(v, by, depth + 1); if (n !== v) changed = true; out[k] = n; }
  return (changed ? out : x) as T;
}

/** Load data, reload when the screen comes back into focus. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const had = useRef(false);
  const load = useCallback(async () => {
    // Offline: keep showing what we had rather than replacing the screen with an error.
    try { const d = await fn(); had.current = true; setError(null); setData(d); } catch (e) { if (!had.current) setError(e instanceof Error ? e.message : String(e)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  useEffect(() => onSynced(() => { load(); }), [load]);
  // Optimistic: show a change the moment it's made; reload if the server refuses it.
  useEffect(() => onLocalChange((e) => {
    if (e.kind === "revert") { load(); return; }
    const by = new Map(e.records.map((r) => [`${r.resourceType}/${r.id}`, r]));
    setData((d) => (d === null ? d : swap(d, by)));
  }), [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return { data, error, reload: load };
}
