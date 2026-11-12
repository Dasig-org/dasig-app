/** On the web, Google sign-in happens on Google's own page (lib/signin.ts startGoogleWeb), with the web OAuth client. */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "1071404459109-g0e3ucbmkeg7pfacb09ivffi1s6a6igi.apps.googleusercontent.com";
export const googleAvailable = false;
export async function googleIdToken(): Promise<{ idToken: string; email?: string } | null> { return null; }
