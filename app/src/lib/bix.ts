import { randomUUID } from "expo-crypto";
import { env } from "./env";
import { supabase } from "./supabase";

export type Ref = { reference: string };
export type R = { resourceType: string; id: string; meta: { version: number }; [k: string]: any };
export const ref = (r: R | string): Ref => ({ reference: typeof r === "string" ? r : `${r.resourceType}/${r.id}` });
export const refId = (x?: Ref | null) => x?.reference.split("/")[1] ?? "";
export const newId = () => randomUUID();
export const now = () => new Date().toISOString();

export class BixError extends Error {
  constructor(public reasons: string[], public current: R | null = null) { super(reasons.join("; ")); }
}

async function headers(extra: Record<string, string> = {}) {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  return { "content-type": "application/json", ...(t ? { authorization: `Bearer ${t}` } : {}), ...extra };
}
async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(env.bixUrl + path, { method, headers: await headers(), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok && !(res.status === 409 && json?.entry)) throw new BixError([json?.error ? String(json.error) : `HTTP ${res.status}`]);
  return json as T;
}
const entries = (b: { entry?: { resource: R }[] }) => (b.entry ?? []).map((e) => e.resource);

/** A thin client for any Bayanihan Server: the same calls any BIX app makes. */
export const bix = {
  me: (nickname?: string) => call<R>("POST", "/$me", { nickname }),
  get: (type: string, id: string) => call<R>("GET", `/${type}/${id}`),
  byRef: (r: string) => call<R>("GET", `/$ref/${encodeURIComponent(r)}`),
  search: async (type: string, q: Record<string, string>) => entries(await call<{ entry: { resource: R }[] }>("GET", `/${type}?${new URLSearchParams(q)}`)),
  verify: (type: string, id: string) => call<{ allValid: boolean; signatures: { signedBy: string; when: string; unchanged: boolean }[] }>("GET", `/${type}/${id}/$verify`),
  /** Apply changes now; if there's no connection, keep them to sync later. Throws BixError if refused. */
  async commit(...records: R[]): Promise<R[]> {
    try { return await this.commitNow(...records); }
    catch (e) {
      const { isNetworkError, enqueue } = await import("./outbox");
      if (isNetworkError(e)) { await enqueue(records); throw new BixError(["Saved on this phone. We'll send it when you're back online."]); }
      throw e;
    }
  },
  async commitNow(...records: R[]): Promise<R[]> {
    const b = await call<{ entry: ({ ok: true; record: R } | { ok: false; reasons: string[]; current: R | null })[] }>("POST", "/", { type: "transaction", entry: records.map((resource) => ({ resource })) });
    const bad = b.entry.find((e) => !e.ok) as { reasons: string[]; current: R | null } | undefined;
    if (bad) throw new BixError(bad.reasons, bad.current);
    return b.entry.map((e) => (e as { record: R }).record);
  },
  /** A new record at version 1. */
  create: (resourceType: string, fields: Record<string, any>): R => ({ resourceType, id: newId(), meta: { version: 1 }, ...fields }),
  /** The next version of a record. */
  next: (r: R, fields: Record<string, any>): R => ({ ...r, ...fields, meta: { ...r.meta, version: r.meta.version + 1 } }),
  link: (target: Ref, grants: string[], preview = "title-only") => call<{ token: string; link: R }>("POST", "/$links", { target, grants, preview }),
  openLink: (token: string) => call<any>("GET", `/$link/${token}`),
  joinByLink: (token: string) => call<R>("POST", `/$link/${token}/join`, {}),
  /** Everything that names you, as a BIX Bundle (rule 18). */
  exportMe: (personId: string) => call<object>("GET", `/Person/${personId}/$export`),
};
