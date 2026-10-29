import * as SQLite from "expo-sqlite";
import type { Db } from "@bayanihan/server";

/** expo-sqlite adapter for Bayanihan Server's storage. */
export async function openDb(name = "dasig-bix.db"): Promise<Db> {
  const d = await SQLite.openDatabaseAsync(name);
  await d.execAsync("pragma journal_mode = wal;");
  let depth = 0;
  return {
    async exec(sql) { await d.execAsync(sql); },
    async run(sql, ...p) { const r = await d.runAsync(sql, p as SQLite.SQLiteBindParams); return { changes: r.changes }; },
    async all(sql, ...p) { return (await d.getAllAsync(sql, p as SQLite.SQLiteBindParams)) as never; },
    async tx(fn) {
      const outer = depth === 0; depth++;
      if (outer) await d.execAsync("begin");
      try { const r = await fn(); if (outer) await d.execAsync("commit"); return r; }
      catch (e) { if (outer) await d.execAsync("rollback"); throw e; }
      finally { depth--; }
    },
  };
}
