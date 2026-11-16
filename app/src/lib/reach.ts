/**
 * When this phone last reached where its records live, so every screen can say how fresh its data is.
 * Records on "phone" are always current; a hub or the online server can be out of reach.
 */
/** The request never got there (no signal, hub out of range). The only error that means "keep it and send later". */
export class Offline extends Error { constructor() { super("offline: couldn't reach where your records are kept"); } }
type Reach = { lastOk: number | null; lastFail: number | null; hosting: boolean };
let state: Reach = { lastOk: null, lastFail: null, hosting: false };
const listeners = new Set<(r: Reach) => void>();
const set = (p: Partial<Reach>) => { state = { ...state, ...p }; listeners.forEach((l) => l(state)); };
export const reached = () => set({ lastOk: Date.now() });
export const missed = () => set({ lastFail: Date.now() });
export const hosting = (on: boolean) => set({ hosting: on });
export const reach = () => state;
export function onReach(l: (r: Reach) => void) { listeners.add(l); l(state); return () => { listeners.delete(l); }; }
