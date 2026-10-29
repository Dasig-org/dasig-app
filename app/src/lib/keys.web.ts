import { generatePersonKey, keyIdFor, signChallenge } from "@bayanihan/core";

/** On the web the key lives in the browser's storage. Weaker than a phone's Keystore; the web uses the online server. */
const slot = (personId: string) => `dasig.person-key.${personId}`;
export async function personKey(personId: string) {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(slot(personId)) : null;
  const k = saved ? (JSON.parse(saved) as { privateKey: string; publicKey: string }) : await generatePersonKey();
  if (!saved && typeof localStorage !== "undefined") localStorage.setItem(slot(personId), JSON.stringify(k));
  return { ...k, kid: keyIdFor(k.publicKey) };
}
export async function withMyKey(person: { id: string; publicKey?: { key: string; status: string }[] } & Record<string, any>) {
  const k = await personKey(person.id);
  if ((person.publicKey ?? []).some((x) => x.key === k.publicKey && x.status === "active")) return null;
  return { publicKey: [...(person.publicKey ?? []), { kid: k.kid, alg: "Ed25519", key: k.publicKey, created: new Date().toISOString(), status: "active" }] };
}
export async function pairingProof(personId: string, code: string) {
  return signChallenge(code, `Person/${personId}`, "bix-pair", (await personKey(personId)).privateKey);
}
