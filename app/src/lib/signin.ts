import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getConnection } from "./connection";
import { networkUrl } from "./env";

/*
 * Ways to sign in to the Bayanihan Network (design/account-sketches.html). The account is your Bayanihan Network
 * account; Google, email (a 6-digit code) and Dasig.org are ways in, and more can be added while signed in.
 * Server: bayanihan/packages/server (POST /$google, /$email/*, /$oidc, GET /$me/account).
 */
export type Method = "google" | "email" | "dasig" | "nickname" | "hub";
export const METHOD_LABEL: Record<string, string> = { google: "Google", email: "Email", dasig: "Dasig.org", nickname: "Nickname only", hub: "Your group's hub" };
const LAST = "dasig.signin.last";

export async function rememberMethod(via: string, email?: string) { await AsyncStorage.setItem(LAST, JSON.stringify({ via, email })); }
export async function lastMethod(): Promise<{ via: string; email?: string } | null> { try { return JSON.parse((await AsyncStorage.getItem(LAST)) ?? "null"); } catch { return null; } }

const base = async () => { const c = await getConnection(); return { url: (c.kind === "ecosystem" ? c.url : networkUrl).replace(/\/$/, ""), token: c.kind === "ecosystem" ? c.token : undefined }; };
async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const b = await base();
  const res = await fetch(`${b.url}${path}`, { method, headers: { "content-type": "application/json", ...(b.token ? { authorization: `Bearer ${b.token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }).catch(() => null);
  if (!res) throw new Error("Couldn't reach the Bayanihan Network. Check your internet and try again.");
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((out as { error?: string }).error ?? `Something went wrong (${res.status}).`));
  return out as T;
}

/** Email, step 1: send a code. */
export const sendEmailCode = (email: string) => call<{ sent: boolean }>("POST", "/$email/start", { email: email.trim() });

export type Account = {
  methods: { provider: string; subject?: string; email: string | null; since: string }[];
  devices: { id: string; name: string | null; via: string | null; since: string; current: boolean }[];
  via: string | null;
  can: Record<string, boolean>;
};
export const loadAccount = () => call<Account>("GET", "/$me/account");
export const removeMethod = (provider: string, subject?: string) => call<{ removed: number }>("POST", "/$me/account/remove", { provider, subject });
export const signOutDevice = (device: string) => call<{ removed: number }>("POST", "/$me/account/remove", { device });
/** Email while signed in: the code adds email to this account. */
export const linkEmail = (email: string, code: string) => call<{ linked: boolean }>("POST", "/$email/verify", { email: email.trim(), code, link: true });

/** The email addresses the network knows you by, for Me and Settings. */
export const emailsOf = (a: Account | null) => [...new Set((a?.methods ?? []).map((m) => m.email).filter(Boolean) as string[])];

/*
 * Google on the web: Google's own sign-in page returns an ID token to /auth/google (response_type=id_token).
 * The web client must list this site's origin and /auth/google as an authorised redirect (Google Cloud console).
 */
const GOOGLE_WEB = "dasig.google.pending";
export async function startGoogleWeb(then = "/", link = false) {
  const { GOOGLE_WEB_CLIENT_ID } = await import("./google");
  const r = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x.toString(16).padStart(2, "0")).join("");
  const state = r(16), nonce = r(16);
  await AsyncStorage.setItem(GOOGLE_WEB, JSON.stringify({ state, nonce, then, link }));
  const q = new URLSearchParams({ client_id: GOOGLE_WEB_CLIENT_ID, redirect_uri: `${window.location.origin}/auth/google`, response_type: "id_token", scope: "openid email profile", state, nonce, prompt: "select_account" });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
}
export async function finishGoogleWeb(hash: string): Promise<{ idToken: string; then: string; link: boolean }> {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const saved = JSON.parse((await AsyncStorage.getItem(GOOGLE_WEB)) ?? "null") as { state: string; then: string; link: boolean } | null;
  await AsyncStorage.removeItem(GOOGLE_WEB);
  if (p.get("error")) throw new Error(p.get("error") === "access_denied" ? "Sign-in was cancelled." : String(p.get("error")));
  if (!saved || p.get("state") !== saved.state || !p.get("id_token")) throw new Error("That sign-in didn't come from this browser. Try again.");
  return { idToken: p.get("id_token")!, then: saved.then || "/", link: saved.link };
}
/** Add Google to the signed-in account (Android: the Google sheet; web: Google's page, back to /auth/google). */
export async function linkGoogle() {
  if (Platform.OS === "web") return startGoogleWeb("/account", true);
  const { googleSignIn } = await import("./ecosystem");
  await googleSignIn((await base()).url, null, true);
}
