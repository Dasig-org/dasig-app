import { ring } from "./keyring";

/** On the web the keys live in the browser's storage. Weaker than a phone's Keystore; the web uses the online server. */
const keys = ring({
  get: async (s) => (typeof localStorage !== "undefined" ? localStorage.getItem(s) : null),
  set: async (s, v) => { if (typeof localStorage !== "undefined") localStorage.setItem(s, v); },
});
export const personKey = (personId: string) => keys.current(personId);
export const withMyKey = keys.withMyKey;
export const keyRotation = keys.rotation;
export const signAs = keys.sign;
export const pairingProof = (personId: string, code: string, listed?: { key: string; status: string }[]) => keys.sign(personId, code, "bix-pair", listed);
export const copyKeys = keys.copy;
