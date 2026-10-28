import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { onSynced } from "./outbox";

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
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return { data, error, reload: load };
}
