import AsyncStorage from "@react-native-async-storage/async-storage";
import { env } from "./env";
import { supabase } from "./supabase";
import type { R } from "./bix";

/** Changes made while offline, replayed in order when back online (BIX rule 10). */
const KEY = "dasig.outbox.v1";
export type Pending = { resource: R; occurredAt: string };
export type Refusal = { record: R; reasons: string[]; current: R | null };
type Listener = (n: number) => void;
const listeners = new Set<Listener>();
let refusedNow: Refusal[] = [];
const refusedListeners = new Set<(r: Refusal[]) => void>();
const syncedListeners = new Set<() => void>();
export function onRefused(l: (r: Refusal[]) => void) { refusedListeners.add(l); l(refusedNow); return () => { refusedListeners.delete(l); }; }
export function clearRefused() { refusedNow = []; refusedListeners.forEach((l) => l(refusedNow)); }
/** Called after a sync, so screens can reload what changed. */
export function onSynced(l: () => void) { syncedListeners.add(l); return () => { syncedListeners.delete(l); }; }

export async function pending(): Promise<Pending[]> { return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]"); }
async function save(p: Pending[]) { await AsyncStorage.setItem(KEY, JSON.stringify(p)); listeners.forEach((l) => l(p.length)); }
export async function enqueue(resources: R[]) { const p = await pending(); await save([...p, ...resources.map((resource) => ({ resource, occurredAt: new Date().toISOString() }))]); }
export function onPending(l: Listener) { listeners.add(l); pending().then((p) => l(p.length)); return () => { listeners.delete(l); }; }

export const isNetworkError = (e: unknown) => e instanceof TypeError || /network|fetch|Failed to fetch/i.test(String(e));

/** Send everything waiting. Returns what the server refused (e.g. someone else took the slot first). */
let flushing: Promise<{ sent: number; refused: Refusal[] }> | null = null;
export function flush() { return (flushing ??= doFlush().finally(() => { flushing = null; })); }
async function doFlush(): Promise<{ sent: number; refused: Refusal[] }> {
  const p = await pending();
  if (!p.length) return { sent: 0, refused: [] };
  const { data } = await supabase.auth.getSession();
  const res = await fetch(env.bixUrl + "/", { method: "POST", headers: { "content-type": "application/json", ...(data.session ? { authorization: `Bearer ${data.session.access_token}` } : {}) },
    body: JSON.stringify({ type: "sync", entry: p }) });
  if (!res.ok) throw new Error(`sync failed: ${res.status}`);
  const out = (await res.json()) as { accepted: R[]; refused: Refusal[] };
  await save([]);
  if (out.refused.length) { refusedNow = [...refusedNow, ...out.refused]; refusedListeners.forEach((l) => l(refusedNow)); }
  syncedListeners.forEach((l) => l());
  return { sent: p.length, refused: out.refused };
}
