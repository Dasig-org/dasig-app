import { getConnection } from "./connection";
import { networkUrl } from "./env";

/*
 * Usernames and invitations on the Bayanihan Network (server: bayanihan/packages/server/src/invites.ts; BIX
 * "Usernames and invitations"). Only on the network: a phone or hub on its own has no usernames.
 */
async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const c = await getConnection();
  const url = (c.kind === "ecosystem" ? c.url : networkUrl).replace(/\/$/, "");
  const res = await fetch(`${url}${path}`, { method, headers: { "content-type": "application/json", ...(c.kind === "ecosystem" ? { authorization: `Bearer ${c.token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }).catch(() => null);
  if (!res) throw new Error("Couldn't reach the Bayanihan Network. Check your internet and try again.");
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((out as { error?: string }).error ?? `Something went wrong (${res.status}).`));
  return out as T;
}
export const lookupHandle = async (h: string) => {
  try { return await call<{ person: string; name: string; photo?: any; handle: string }>("GET", `/$handle/${encodeURIComponent(h)}`).then((r) => ({ ref: r.person, name: r.name, photo: r.photo, handle: r.handle })); }
  catch { return null; }
};
export const setHandle = (value: string | null) => call<{ handle: { value: string; findable?: boolean } | null }>("POST", "/$me/handle", { value });
export const setFindable = (findable: boolean) => call<{ handle: { value: string; findable?: boolean } | null }>("POST", "/$me/handle", { findable });
export const invite = (o: { target: string; role: string; handle?: string; email?: string; person?: string; message?: string }) =>
  call<{ sent: boolean }>("POST", "/$invite", { target: { reference: o.target }, role: o.role, ...(o.handle ? { handle: o.handle } : {}), ...(o.email ? { email: o.email } : {}), ...(o.person ? { person: o.person } : {}), ...(o.message ? { message: o.message } : {}) });
export type Invitation = { id: string; role: string; via: string; message: string | null; expires: string; target: { reference: string; title: string }; group: { id: string; name: string } | null; invitedBy: { reference: string; name: string } };
export const myInvitations = () => call<{ entry: Invitation[] }>("GET", "/$invitations").then((r) => r.entry).catch(() => [] as Invitation[]);
export const answerInvitation = (id: string, answer: "accept" | "decline" | "block") => call<{ status: string; target?: string }>("POST", `/$invitations/${id}`, { answer });
/** Handle rules (BIX): 3–20 lowercase letters, digits, dot, underscore; starts with a letter. The server checks the rest. */
export const handleProblem = (v: string) => (v.length < 3 || v.length > 20 ? "3 to 20 characters" : !/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/.test(v) ? "Lowercase letters, numbers, dots and underscores, starting with a letter" : null);
