import { env } from "./env";
import { supabase } from "./supabase";
import { getConnection } from "./connection";

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
  if (c.kind === "hub") {
    headers.authorization = `Bearer ${c.token}`;
    return fetch(c.url + path, { method, headers, ...(body !== undefined && body !== null ? { body } : {}) });
  }
  const { data } = await supabase.auth.getSession();
  if (data.session) headers.authorization = `Bearer ${data.session.access_token}`;
  return fetch(env.bixUrl + path, { method, headers, ...(body !== undefined && body !== null ? { body } : {}) });
}
