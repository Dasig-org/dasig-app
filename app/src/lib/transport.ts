import { env } from "./env";
import { getConnection } from "./connection";
import { missed, Offline, reached } from "./reach";
/** Supabase is only for the local-development "cloud" connection; loaded on first use, never in the web bundle. */
const sb = async () => (await import("./supabase")).supabase;

/** Send one request to wherever this phone's records live. Same BIX API in every case. */
export async function send(method: string, path: string, body?: BodyInit | null, contentType = "application/json"): Promise<Response> {
  const c = await getConnection();
  const headers: Record<string, string> = body !== undefined && body !== null ? { "content-type": contentType } : {};
  if (c.kind === "phone") {
    const { localEngine } = await import("@/local/engine");
    const e = await localEngine();
    if (c.token) headers.authorization = `Bearer ${c.token}`;
    return e.fetch(new Request(`http://phone${path}`, { method, headers, ...(body !== undefined && body !== null ? { body } : {}) }));
  }
  const remote = async (url: string) => {
    try { const r = await fetch(url, { method, headers, ...(body !== undefined && body !== null ? { body } : {}) }); reached(); return r; }
    catch { missed(); throw new Offline(); }
  };
  if (c.kind === "hub" || c.kind === "ecosystem") {
    headers.authorization = `Bearer ${c.token}`;
    const r = await remote(c.url + path);
    // An expired Ecosystem token: renew it with this phone's key, then try once more. (Bodies here are strings, so a retry can resend them.)
    if (r.status === 401 && c.kind === "ecosystem") {
      const { renewToken } = await import("./ecosystem");
      const fresh = await renewToken();
      if (fresh) { headers.authorization = `Bearer ${fresh}`; return remote(c.url + path); }
    }
    return r;
  }
  const { data } = await (await sb()).auth.getSession();
  if (data.session) headers.authorization = `Bearer ${data.session.access_token}`;
  return remote(env.bixUrl + path);
}
