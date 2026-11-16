/** The web's copy of lib/cache.ts, on IndexedDB (this browser only, cleared on signing out). Never breaks a request. */
let db: Promise<IDBDatabase> | null = null;
const open = () => (db ??= new Promise<IDBDatabase>((ok, no) => {
  const r = indexedDB.open("dasig-cache", 1);
  r.onupgradeneeded = () => { r.result.createObjectStore("c"); };
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
}));
const run = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => {
  const s = (await open()).transaction("c", mode).objectStore("c");
  return new Promise<T>((ok, no) => { const r = f(s); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
};

export async function getCached(k: string): Promise<string | null> {
  try { return ((await run("readonly", (s) => s.get(k))) as { v: string } | undefined)?.v ?? null; } catch { return null; }
}
export async function putCached(k: string, v: string): Promise<void> {
  if (v.length > 300000) return;
  try { if ((await run("readonly", (s) => s.count())) > 800) await run("readwrite", (s) => s.clear()); await run("readwrite", (s) => s.put({ v, t: Date.now() }, k)); } catch {}
}
export async function clearCache(): Promise<void> { try { await run("readwrite", (s) => s.clear()); } catch {} }
