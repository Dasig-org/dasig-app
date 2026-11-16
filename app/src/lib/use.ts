import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { onSynced } from "./outbox";
import { onLocalChange, swap } from "./bix";

/** Load data, reload when the screen comes back into focus. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const had = useRef(false);
  // The latest `fn`, so `load` can stay the same function; `deps` changing (compared item by item) counts as a new load.
  const latest = useRef(fn);
  useEffect(() => { latest.current = fn; });
  const [seen, setSeen] = useState(deps);
  const [round, setRound] = useState(0);
  if (deps.length !== seen.length || deps.some((d, i) => !Object.is(d, seen[i]))) { setSeen(deps); setRound(round + 1); }
  const load = useCallback(() => latest.current().then((d) => { had.current = true; setError(null); setData(d); },
    // Offline: keep showing what we had rather than replacing the screen with an error.
    (e) => { if (!had.current) setError(e instanceof Error ? e.message : String(e)); }), []);
  useEffect(() => { void load(); }, [load, round]);
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

/**
 * The time now, for what a screen shows ("late", "this week", "up to date"), kept in state and moved on every `everyMs`
 * so the screen updates on its own. Reading Date.now() while rendering would leave a memoized screen on a stale time.
 */
export function useNow(everyMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), everyMs); return () => clearInterval(h); }, [everyMs]);
  return now;
}
