import { generatePersonKey, keyIdFor, signChallenge } from "@bayanihan/core";

/**
 * A person's keys on this phone, newest last. The newest signs everything new. Older keys stay so servers that still
 * list them (a hub you paired with months ago) keep accepting this phone. Rotation: every ROTATE_DAYS the phone makes a
 * new key, publishes it next to the old one, and only then makes it current (a key the server hasn't recorded is never used).
 */
export type Key = { privateKey: string; publicKey: string; created: string };
export type Store = { get(slot: string): Promise<string | null>; set(slot: string, v: string): Promise<void> };
export const ROTATE_DAYS = 90;
const slot = (personId: string) => `dasig.person-key.${personId}`;

export function ring(store: Store) {
  async function load(personId: string): Promise<Key[]> {
    const raw = await store.get(slot(personId));
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [{ ...v, created: v.created ?? new Date().toISOString() }]; // older phones stored one key
  }
  const save = (personId: string, keys: Key[]) => store.set(slot(personId), JSON.stringify(keys));
  async function current(personId: string) {
    let keys = await load(personId);
    if (!keys.length) { const k = await generatePersonKey(); keys = [{ ...k, created: new Date().toISOString() }]; await save(personId, keys); }
    const k = keys[keys.length - 1]!;
    return { ...k, kid: keyIdFor(k.publicKey) };
  }
  /** The key a record trusts: the newest one this phone holds that the record lists as active, else the newest. */
  async function forRecord(personId: string, listed: { key: string; status: string }[] = []) {
    const keys = await load(personId);
    const ok = [...keys].reverse().find((k) => listed.some((x) => x.key === k.publicKey && x.status === "active"));
    return ok ?? (await current(personId));
  }
  return {
    load, current, forRecord,
    /** Person.publicKey with this phone's current key listed, or null when it already is. */
    async withMyKey(person: { id: string; publicKey?: { key: string; status: string }[] }) {
      const k = await current(person.id);
      if ((person.publicKey ?? []).some((x) => x.key === k.publicKey && x.status === "active")) return null;
      return { publicKey: [...(person.publicKey ?? []), { kid: k.kid, alg: "Ed25519", key: k.publicKey, created: k.created, status: "active" }] };
    },
    /** When the current key is old: a new key, the fields that publish it (old keys revoked), and `adopt` once saved. */
    async rotation(person: { id: string; publicKey?: { key: string; status: string }[] }, now = Date.now()) {
      const cur = await current(person.id);
      if (now - Date.parse(cur.created) < ROTATE_DAYS * 86400000) return null;
      const k = await generatePersonKey();
      const next: Key = { ...k, created: new Date(now).toISOString() };
      const publicKey = [...(person.publicKey ?? []).map((x) => (x.key === cur.publicKey ? { ...x, status: "revoked" } : x)), { kid: keyIdFor(k.publicKey), alg: "Ed25519", key: k.publicKey, created: next.created, status: "active" }];
      return { publicKey, adopt: async () => { const keys = await load(person.id); await save(person.id, [...keys, next].slice(-5)); } };
    },
    /** After Google brings back an older person, this phone's keys serve that person too. */
    async copy(fromId: string, toId: string) { const from = await load(fromId); if (!from.length) return; const to = await load(toId); await save(toId, [...to, ...from.filter((k) => !to.some((x) => x.publicKey === k.publicKey))].slice(-5)); },
    async sign(personId: string, challenge: string, audience: string, listed?: { key: string; status: string }[]) {
      const k = listed ? await forRecord(personId, listed) : await current(personId);
      return signChallenge(challenge, `Person/${personId}`, audience, k.privateKey);
    },
  };
}
