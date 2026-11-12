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
    if (!onNetwork) { setAcct(null); setLoaded(true); return; }
    try { setAcct(await loadAccount()); } catch { setAcct(null); } finally { setLoaded(true); }
  }, [onNetwork, s.person?.id]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const methods = acct?.methods ?? [];
  const here = methods.find((m) => m.provider === acct?.via) ?? null;
  const how = here ? `Signed in with ${METHOD_LABEL[here.provider] ?? here.provider}${here.email ? ` · ${here.email}` : ""}`
    : methods.length ? `Signed in with ${METHOD_LABEL[methods[0]!.provider] ?? methods[0]!.provider}` : null;
  return { acct, loaded, reload: load, onNetwork, guest: loaded && methods.length === 0, how, emails: emailsOf(acct) };
}
