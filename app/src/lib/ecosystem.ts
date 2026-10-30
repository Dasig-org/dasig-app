import AsyncStorage from "@react-native-async-storage/async-storage";
import { getConnection, setConnection } from "./connection";
import { signAs } from "./keys";

/**
 * Joining the Dasig Ecosystem, and staying joined. A phone token stops working after a while (the server sets the age);
 * the phone gets a new one by signing a fresh challenge with its own key. No password, no codes.
 */
const ME = "dasig.ecosystem.person";
type Me = { id: string; name: unknown; credit?: string; description?: string; publicKey: unknown[] };

export async function joinWithKey(url: string, me: Me): Promise<{ token: string; person: any }> {
  const ch = (await fetch(`${url}/$challenge`).then((r) => r.json()).catch(() => null)) as { challenge?: string; audience?: string } | null;
  if (!ch?.challenge || !ch.audience) throw new Error("Couldn't reach the Dasig Ecosystem. Check your internet and try again.");
  const person = { resourceType: "Person", id: me.id, meta: { version: 1 }, name: me.name, credit: me.credit ?? "nickname", ...(me.description ? { description: me.description } : {}), publicKey: me.publicKey };
  const res = await fetch(`${url}/$join`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ person, challenge: ch.challenge, proof: await signAs(me.id, ch.challenge, ch.audience, me.publicKey as never) }) }).catch(() => null);
  if (!res) throw new Error("Couldn't reach the Dasig Ecosystem. Check your internet and try again.");
  const out = await res.json().catch(() => ({ error: `the Ecosystem didn't answer (${res.status})` }));
  if (!res.ok) throw new Error(String(out.error ?? "Couldn't join the Dasig Ecosystem."));
  await AsyncStorage.setItem(ME, JSON.stringify(me));
  return out;
}

let renewing: Promise<string | null> | null = null;
/** A fresh token for the current Ecosystem connection, signed with this phone's key. Null when it can't be renewed. */
export function renewToken(): Promise<string | null> {
  return (renewing ??= (async () => {
    try {
      const c = await getConnection();
      const saved = await AsyncStorage.getItem(ME);
      if (c.kind !== "ecosystem" || !saved) return null;
      const out = await joinWithKey(c.url, JSON.parse(saved) as Me);
      await setConnection({ kind: "ecosystem", url: c.url, token: out.token });
      return out.token as string;
    } catch { return null; } finally { renewing = null; }
  })());
}

const TOKEN = "dasig.ecosystem.token";
/** A working Ecosystem token for this person without switching the phone to the Ecosystem. */
export async function ecosystemToken(url: string, me: Me): Promise<string> {
  const c = await getConnection();
  if (c.kind === "ecosystem" && c.url === url) return c.token;
  const saved = await AsyncStorage.getItem(TOKEN);
  if (saved) {
    const ok = await fetch(`${url}/$me`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${saved}` }, body: "{}" }).then((r) => r.ok).catch(() => false);
    if (ok) return saved;
  }
  const out = await joinWithKey(url, me);
  await AsyncStorage.setItem(TOKEN, out.token);
  return out.token;
}
export const rememberToken = (t: string) => AsyncStorage.setItem(TOKEN, t);

/** Every file a bundle points to (logo, photos, attachments), once each. */
export function filesIn(x: unknown, out = new Map<string, any>()): Map<string, any> {
  if (Array.isArray(x)) x.forEach((y) => filesIn(y, out));
  else if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o.hash === "string" && typeof o.url === "string" && typeof o.contentType === "string") out.set(o.hash, o);
    else Object.values(o).forEach((y) => filesIn(y, out));
  }
  return out;
}
