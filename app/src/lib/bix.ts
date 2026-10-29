import { randomUUID } from "expo-crypto";
import { send } from "./transport";

export type Ref = { reference: string };
export type R = { resourceType: string; id: string; meta: { version: number }; [k: string]: any };
export const ref = (r: R | string): Ref => ({ reference: typeof r === "string" ? r : `${r.resourceType}/${r.id}` });
export const refId = (x?: Ref | null) => x?.reference.split("/")[1] ?? "";
export const newId = () => randomUUID();
export const now = () => new Date().toISOString();

export class BixError extends Error {
  constructor(public reasons: string[], public current: R | null = null) { super(reasons.join("; ")); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await send(method, path, body === undefined ? undefined : JSON.stringify(body));
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
  link: (target: Ref, grants: string[], preview = "title-only") => call<{ token: string; link: R; pairingCode?: string }>("POST", "/$links", { target, grants, preview }),
  openLink: (token: string) => call<any>("GET", `/$link/${token}`),
  joinByLink: (token: string) => call<R>("POST", `/$link/${token}/join`, {}),
  tally: (decisionId: string) => call<{ voted: number; eligible: number; mine: string[] | null; tally: Record<string, number> | null }>("GET", `/Decision/${decisionId}/$tally`),
  links: () => call<{ link: R; target: { resourceType: string; id: string; title?: string } | null }[]>("GET", "/$links"),
  revokeLink: (id: string) => call<R>("POST", `/$links/${id}/revoke`, {}),
  deleteMe: (cancel = false) => call<{ deleteAfter: string | null }>("POST", `/$me/delete${cancel ? "?cancel=1" : ""}`, {}),
  exportOrg: (orgId: string) => call<{ entry: unknown[] }>("GET", `/Organization/${orgId}/$export`),
  /** Everything that names you, as a BIX Bundle (rule 18). */
  exportMe: (personId: string) => call<{ entry: { resource: R }[] }>("GET", `/Person/${personId}/$export`),
};
