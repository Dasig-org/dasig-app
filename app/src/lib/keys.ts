import * as SecureStore from "expo-secure-store";
import { generatePersonKey, keyIdFor, signChallenge } from "@bayanihan/core";

/**
 * This phone's own key for its person (BIX Person.publicKey). The private key stays in the phone's secure storage
 * (Android Keystore); only the public key is written to the Person record, so any Bayanihan Server can check that
 * this phone is that person, without codes or links.
 */
const slot = (personId: string) => `dasig.person-key.${personId}`;

export async function personKey(personId: string): Promise<{ privateKey: string; publicKey: string; kid: string }> {
  const saved = await SecureStore.getItemAsync(slot(personId));
  if (saved) { const k = JSON.parse(saved) as { privateKey: string; publicKey: string }; return { ...k, kid: keyIdFor(k.publicKey) }; }
  const k = await generatePersonKey();
  await SecureStore.setItemAsync(slot(personId), JSON.stringify(k), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return { ...k, kid: keyIdFor(k.publicKey) };
}

/** The Person record with this phone's key listed, or null when it already is. */
export async function withMyKey(person: { id: string; publicKey?: { key: string; status: string }[] } & Record<string, any>) {
  const k = await personKey(person.id);
  if ((person.publicKey ?? []).some((x) => x.key === k.publicKey && x.status === "active")) return null;
  return { publicKey: [...(person.publicKey ?? []), { kid: k.kid, alg: "Ed25519", key: k.publicKey, created: new Date().toISOString(), status: "active" }] };
}

/** Proof for pairing with a hub: this phone signs the hub's pairing code as its person. */
export async function pairingProof(personId: string, code: string) {
  return signChallenge(code, `Person/${personId}`, "bix-pair", (await personKey(personId)).privateKey);
}
