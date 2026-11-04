import { chromium } from "playwright-core";
const APP = "http://localhost:8099";
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const ctx = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); return [c, await c.newPage()]; };
const log = (...a) => console.log("•", ...a);
// Ana sets up a group with one open slot, invites Liza and Rhea.
const [, ana] = await ctx();
await ana.goto(APP + "/"); await ana.getByPlaceholder("e.g. Don").fill("Ana"); await ana.getByText("Continue", { exact: true }).click();
await ana.getByText("Start a group").click(); await ana.getByPlaceholder("e.g. Lahug Uplands Runners Club").fill("Rotaract Lahug Uplands");
await ana.getByText("Create group", { exact: true }).click();
await ana.getByPlaceholder("e.g. Lahug Uplands Fun Run 2027").fill("Coastal cleanup"); await ana.getByText(/Keep these/).click();
await ana.getByText("Ask someone to lead").first().waitFor(); await ana.getByText("Communications", { exact: true }).click();
await ana.getByPlaceholder("Add something to do").fill("Marshal, km 3"); await ana.getByPlaceholder("Add something to do").press("Enter");
await ana.getByText("Marshal, km 3").waitFor();
await ana.getByText("Invite your team").click(); const invite = await ana.getByText(/\/join\//).textContent();
const join = async (p, nick) => { await p.goto(invite); await p.getByPlaceholder("e.g. Mia").fill(nick); await p.getByText("Join the team", { exact: true }).click(); await p.getByText("Marshal, km 3").click(); await p.getByText("I'll take it").waitFor(); };
const [lizaCtx, liza] = await ctx(); await join(liza, "Liza");
const [, rhea] = await ctx(); await join(rhea, "Rhea");
// Liza loses signal and claims; Rhea, online, claims a moment later.
await lizaCtx.setOffline(true);
await liza.getByText("I'll take it").click();
await liza.getByText(/Saved on this phone/).waitFor(); log("Liza (offline) claimed: kept on her phone, waiting to sync");
await liza.screenshot({ path: "/tmp/e2e/10-offline-pending.png" });
await rhea.getByText("I'll take it").click(); await rhea.getByText("Mark done").waitFor(); log("Rhea (online) claimed it");
await lizaCtx.setOffline(false);
await liza.waitForFunction(() => document.body.innerText.includes("couldn't be saved: someone got there first"), null, { timeout: 40000 }); log("Liza back online: told someone got there first, nothing merged");
await liza.screenshot({ path: "/tmp/e2e/11-refused.png" });
await b.close();
