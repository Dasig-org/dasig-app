/** Google sign-in comes to the web version later; the web uses the online server's own sign-in for now. */
export const GOOGLE_WEB_CLIENT_ID = "";
export const googleAvailable = false;
export async function googleIdToken(): Promise<{ idToken: string; email?: string } | null> { return null; }
