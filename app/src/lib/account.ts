import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "./session";
import { emailsOf, loadAccount, METHOD_LABEL, type Account } from "./signin";

/**
 * Your Bayanihan Network account as Settings, Me and Home show it: the ways to sign in (with their email), this
 * device's method, and whether you're a guest (a nickname with no way back in). Off the network (a phone on its own,
 * or a hub), there's no network account yet: `onNetwork` is false and everyone is a guest of this device.
 */
export function useAccount() {
  const s = useSession();
  const onNetwork = s.connection?.kind === "ecosystem";
  const [acct, setAcct] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (!onNetwork) return; // off the network there is no account: see below
    await loadAccount().then(setAcct, () => setAcct(null)).finally(() => setLoaded(true));
  }, [onNetwork]);
  // Again when someone else signs in on this phone.
  const personId = s.person?.id;
  useEffect(() => { void load(); }, [load, personId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const methods = (onNetwork ? acct?.methods : null) ?? [];
  const here = methods.find((m) => m.provider === (onNetwork ? acct?.via : undefined)) ?? null;
  const how = here ? `Signed in with ${METHOD_LABEL[here.provider] ?? here.provider}${here.email ? ` · ${here.email}` : ""}`
    : methods.length ? `Signed in with ${METHOD_LABEL[methods[0]!.provider] ?? methods[0]!.provider}` : null;
  const done = onNetwork ? loaded : true;
  return { acct: onNetwork ? acct : null, loaded: done, reload: load, onNetwork, guest: done && methods.length === 0, how, emails: emailsOf(onNetwork ? acct : null) };
}
