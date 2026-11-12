import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";

/**
 * Google sign-in on Android: Google's own account picker returns a signed ID token for the Bayanihan Network's web client.
 * The server checks it against Google's keys; Dasig never sees a password.
 */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "1071404459109-g0e3ucbmkeg7pfacb09ivffi1s6a6igi.apps.googleusercontent.com";
export const googleAvailable = true;
export async function googleIdToken(): Promise<{ idToken: string; email?: string } | null> {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const r = await GoogleSignin.signIn();
  if (!isSuccessResponse(r) || !r.data.idToken) return null;
  return { idToken: r.data.idToken, email: r.data.user.email };
}
