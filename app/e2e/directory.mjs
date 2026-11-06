// Duplicate check and directory on the Ecosystem: Ana lists her club; Ben tries to start the same one and asks to join instead.
import { chromium } from "playwright-core";
const APP = process.env.APP ?? "http://localhost:8097";
const b = await chromium.launch({ channel: "chrome" });
const errs = [];
const page = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on("pageerror", (e) => errs.push(e.message)); return p; };
const tap = (p, t) => p.getByText(t, { exact: true }).filter({ visible: true }).first().click();
const log = (...a) => console.log("•", ...a);
async function onEcosystem(p, nick) {
  await p.goto(APP + "/"); await tap(p, "Skip"); await p.getByLabel("Your nickname").fill(nick); await tap(p, "Continue");
  await p.getByText("Tell us about you").waitFor(); await tap(p, "Continue"); await tap(p, "Skip for now");
  await p.goto(APP + "/network"); await tap(p, "Connect to the Dasig Ecosystem"); await p.getByText("Go back to this phone's records").waitFor();
}
const ana = await page(); await onEcosystem(ana, "Ana");
await ana.goto(APP + "/start-group"); await ana.getByPlaceholder("e.g. Lahug Uplands Runners Club").fill("Rotaract Club of Lahug Uplands");
await tap(ana, "Next"); await ana.getByLabel("Where (optional)").fill("Lahug, Cebu City"); await tap(ana, "Environment");
await tap(ana, "Next: how it's run"); await ana.waitForTimeout(1200); if (await ana.getByText("Is this your group?").isVisible().catch(() => false)) await tap(ana, "No, ours is a different group"); await tap(ana, "Create the group"); await ana.getByText("Bring your people in").waitFor(); log("Ana's club is on the Ecosystem, listed");
const ben = await page(); await onEcosystem(ben, "Ben");
await ben.goto(APP + "/start-group"); await ben.getByPlaceholder("e.g. Lahug Uplands Runners Club").fill("Lahug Uplands Rotaract");
await tap(ben, "Next"); await tap(ben, "Next: how it's run"); await ben.getByText("Is this your group?").waitFor(); await ben.screenshot({ path: "/tmp/e2e/d-similar.png" });
log("Ben is asked: is this your group?"); await tap(ben, "Ask to join"); await ben.getByText(/Asked to join Rotaract Club of Lahug Uplands/).waitFor(); log("Ben asked to join instead of duplicating");
await ben.goto(APP + "/nearby"); await ben.getByText("Rotaract Club of Lahug Uplands").waitFor(); await tap(ben, "Environment"); await ben.getByText("Rotaract Club of Lahug Uplands").waitFor();
await ben.screenshot({ path: "/tmp/e2e/d-nearby.png" }); log("the directory lists it, filtered by cause");
await ana.goto(APP + "/home"); await ana.getByText("Your week, Ana").waitFor(); await ana.getByRole("button", { name: "Add", exact: true }).click(); await tap(ana, "Invite people");
await ana.getByText("Wants to join as a volunteer").waitFor(); log("Ana sees Ben's request");
console.log("page errors:", errs.length ? errs : "none"); await b.close();
