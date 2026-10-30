/** On the web there is no on-phone server: the web app uses an online Bayanihan Server. */
export const HUB_PORT = 8787;
export function localEngine(): Promise<never> { return Promise.reject(new Error("The web version uses the online server. Install the Android app to work offline.")); }
