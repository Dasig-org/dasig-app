import * as SecureStore from "expo-secure-store";
import { ring } from "./keyring";

/** This phone's keys for its person, in the phone's secure storage (Android Keystore). Only public keys leave the phone. */
const keys = ring({
  get: (s) => SecureStore.getItemAsync(s),
  set: (s, v) => SecureStore.setItemAsync(s, v, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
});
export const personKey = (personId: string) => keys.current(personId);
export const withMyKey = keys.withMyKey;
export const keyRotation = keys.rotation;
export const signAs = keys.sign;
/** Proof for pairing with a hub: signed with the key that hub's record of you lists. */
export const pairingProof = (personId: string, code: string, listed?: { key: string; status: string }[]) => keys.sign(personId, code, "bix-pair", listed);
