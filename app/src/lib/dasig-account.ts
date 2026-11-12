import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getConnection, setConnection } from "./connection";
import { networkUrl } from "./env";

/**
 * Sign in with a Dasig account (dasig.org) through Supabase's OAuth 2.1 server: authorization code with PKCE, as a public
 * client, then the ID token goes once to the Bayanihan Network's POST /$oidc. Design: docs/auth/DASIG_ACCOUNTS.md.
 * Web only for now (a full-page redirect); Android and iOS will use expo-auth-session with the app's own redirect.
 */
export const DASIG_ISSUER = process.env.EXPO_PUBLIC_DASIG_ISSUER ?? "https://turvwsqyusqixhjhvhhy.supabase.co/auth/v1";
export const DASIG_CLIENT_ID = process.env.EXPO_PUBLIC_DASIG_CLIENT_ID ?? "";
/** The Android app's own client (public, PKCE), returning to org.dasig.bayanihan://auth/callback. */
export const DASIG_APP_CLIENT_ID = process.env.EXPO_PUBLIC_DASIG_APP_CLIENT_ID ?? "e80de81a-4bbe-4609-ba04-05a227bbf507";
export const dasigAccountAvailable = Platform.OS === "web" ? !!DASIG_CLIENT_ID : !!DASIG_APP_CLIENT_ID;
const PENDING = "dasig.oauth.pending";

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const random = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));
const redirectUri = () => `${window.location.origin}/auth/callback`;

/** Leave for Dasig's sign-in. `then` is where to land afterwards (e.g. an invite link). */
export async function startDasigSignIn(then = "/", link = false) {
  if (!dasigAccountAvailable) throw new Error("Signing in with a Dasig account isn't set up in this version.");
  const verifier = random(48), state = random(16), nonce = random(16);
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  await AsyncStorage.setItem(PENDING, JSON.stringify({ verifier, state, nonce, then, link }));
  const q = new URLSearchParams({ response_type: "code", client_id: DASIG_CLIENT_ID, redirect_uri: redirectUri(), scope: "openid profile email",
    state, nonce, code_challenge: challenge, code_challenge_method: "S256" });
  window.location.assign(`${DASIG_ISSUER}/oauth/authorize?${q}`);
}

/** Back from Dasig: swap the code for an ID token, then sign in to the Bayanihan Network as that person. Returns where to go. */
export async function finishDasigSignIn(params: URLSearchParams, proof?: () => Promise<Record<string, unknown>>): Promise<string> {
  const saved = JSON.parse((await AsyncStorage.getItem(PENDING)) ?? "null") as { verifier: string; state: string; nonce: string; then: string; link?: boolean } | null;
  await AsyncStorage.removeItem(PENDING);
  if (params.get("error")) throw new Error(params.get("error") === "access_denied" ? "Sign-in was cancelled." : String(params.get("error_description") ?? params.get("error")));
  if (!saved || params.get("state") !== saved.state) throw new Error("That sign-in didn't come from this browser. Try again.");
  const res = await fetch(`${DASIG_ISSUER}/oauth/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code: params.get("code") ?? "", redirect_uri: redirectUri(), client_id: DASIG_CLIENT_ID, code_verifier: saved.verifier }) });
  const tok = (await res.json().catch(() => ({}))) as { id_token?: string; error_description?: string };
  if (!res.ok || !tok.id_token) throw new Error(tok.error_description ?? "Dasig didn't finish the sign-in. Try again.");
  const c = await getConnection();
  const url = c.kind === "ecosystem" ? c.url : networkUrl.replace(/\/$/, "");
  const headers: Record<string, string> = { "content-type": "application/json", ...(c.kind === "ecosystem" && c.token ? { authorization: `Bearer ${c.token}` } : {}) };
  const out = await fetch(`${url}/$oidc`, { method: "POST", headers, body: JSON.stringify({ provider: "dasig", idToken: tok.id_token, ...(saved.link ? { link: true } : proof ? await proof().catch(() => ({})) : {}) }) });
  const body = (await out.json().catch(() => ({}))) as { token?: string; error?: string; linked?: boolean };
  if (saved.link) { if (!out.ok) throw new Error(String(body.error ?? "Dasig.org couldn't be added. Try again.")); return saved.then || "/account"; }
  if (!out.ok || !body.token) throw new Error(String(body.error ?? "The Bayanihan Network didn't accept that sign-in."));
  await setConnection({ kind: "ecosystem", url, token: body.token });
  await AsyncStorage.setItem("dasig.account.linked", "dasig");
  await (await import("./signin")).rememberMethod("dasig");
  return saved.then || "/";
}
export const dasigLinked = async () => (await AsyncStorage.getItem("dasig.account.linked")) === "dasig";

/**
 * Android: Dasig.org's sign-in in the system's secure browser tab, back to org.dasig.bayanihan://auth/callback, then
 * the code is swapped for an ID token (PKCE, no secret). The caller signs in to the network with it (/$oidc).
 */
const qs = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
const parseQs = (url: string) => Object.fromEntries((url.split(/[?#]/)[1] ?? "").split("&").filter(Boolean).map((kv) => { const [k, v = ""] = kv.split("="); return [decodeURIComponent(k!), decodeURIComponent(v.replace(/\+/g, " "))]; })) as Record<string, string>;
export async function dasigIdTokenNative(): Promise<string> {
  const Crypto = await import("expo-crypto");
  const WebBrowser = await import("expo-web-browser");
  const b64 = (s: string) => s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const rand = async (n: number) => b64(btoa(String.fromCharCode(...Crypto.getRandomBytes(n))));
  const verifier = await rand(48), state = await rand(16), nonce = await rand(16);
  const challenge = b64(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }));
  const redirect = "org.dasig.bayanihan://auth/callback";
  const q = qs({ response_type: "code", client_id: DASIG_APP_CLIENT_ID, redirect_uri: redirect, scope: "openid profile email", state, nonce, code_challenge: challenge, code_challenge_method: "S256" });
  const r = await WebBrowser.openAuthSessionAsync(`${DASIG_ISSUER}/oauth/authorize?${q}`, redirect);
  if (r.type !== "success") throw new Error("Sign-in was cancelled.");
  const back = parseQs(r.url);
  if (back["error"]) throw new Error(back["error"] === "access_denied" ? "Sign-in was cancelled." : String(back["error_description"] ?? back["error"]));
  if (back["state"] !== state) throw new Error("That sign-in didn't come from this phone. Try again.");
  const res = await fetch(`${DASIG_ISSUER}/oauth/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: qs({ grant_type: "authorization_code", code: back["code"] ?? "", redirect_uri: redirect, client_id: DASIG_APP_CLIENT_ID, code_verifier: verifier }) });
  const tok = (await res.json().catch(() => ({}))) as { id_token?: string; error_description?: string };
  if (!res.ok || !tok.id_token) throw new Error(tok.error_description ?? "Dasig.org didn't finish the sign-in. Try again.");
  return tok.id_token;
}

