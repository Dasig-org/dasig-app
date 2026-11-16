import * as SQLite from "expo-sqlite";

/**
 * The last answer to every read, kept on this phone so screens still show something without signal (lib/bix.ts call).
 * Its own small database, so it can be pruned and cleared apart from the records. It never breaks a request: every
 * function swallows its own errors.
 */
let db: Promise<SQLite.SQLiteDatabase> | null = null;
const open = () => (db ??= SQLite.openDatabaseAsync("dasig-cache.db").then(async (d) => { await d.execAsync("create table if not exists c (k text primary key, v text not null, t integer not null)"); return d; }));
let puts = 0;

export async function getCached(k: string): Promise<string | null> {
  try { return (await (await open()).getFirstAsync<{ v: string }>("select v from c where k = ?", [k]))?.v ?? null; } catch { return null; }
}
export async function putCached(k: string, v: string): Promise<void> {
  if (v.length > 300000) return;
  try {
    const d = await open();
    await d.runAsync("insert into c (k, v, t) values (?, ?, ?) on conflict(k) do update set v = excluded.v, t = excluded.t", [k, v, Date.now()]);
    if (++puts % 50 === 0) await d.runAsync("delete from c where k not in (select k from c order by t desc limit 500)");
  } catch {}
}
export async function clearCache(): Promise<void> { try { await (await open()).runAsync("delete from c"); } catch {} }
