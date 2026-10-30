// Copying a group from the device to the Ecosystem, with the duplicate check first.
import { chromium } from "playwright-core";
const APP = process.env.APP ?? "http://localhost:8097";
const b = await chromium.launch({ channel: "chrome" });
const errs = [];
const page = async () => { const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.on("pageerror", (e) => errs.push(e.message)); return p; };
const tap = (p, t) => p.getByText(t, { exact: true }).filter({ visible: true }).first().click();
const log = (...a) => console.log("•", ...a);
async function start(p, nick) { await p.goto(APP + "/"); await tap(p, "Skip"); await p.getByLabel("Your nickname").fill(nick); await tap(p, "Continue"); await p.getByText("Tell us about you").waitFor(); await tap(p, "Continue"); }
async function makeGroup(p, name) {
  await p.goto(APP + "/start-group"); await p.getByPlaceholder("e.g. Lahug Uplands Runners Club").fill(name); await tap(p, "Next: how it's run");
  if (await p.getByText("Is this your group?").isVisible().catch(() => false)) await tap(p, "No, ours is a different group");
  await tap(p, "Create the group"); await p.getByText("Bring your people in").waitFor();
}
// Ana already has "Kabataan Tutors" on the Ecosystem, listed publicly.
const ana = await page(); await start(ana, "Ana"); await tap(ana, "Skip for now");
await ana.goto(APP + "/network"); await tap(ana, "Connect to the Dasig Ecosystem"); await ana.getByText("Go back to this phone's records").waitFor();
await makeGroup(ana, "Kabataan Tutors");
// Rhea made her own "Kabataan Tutors Lapu-Lapu" on her device and copies it.
const rhea = await page(); await start(rhea, "Rhea"); await tap(rhea, "I run a group");
await rhea.getByPlaceholder("e.g. Lahug Uplands Runners Club").fill("Kabataan Tutors Lapu-Lapu"); await tap(rhea, "Next: how it's run");
await rhea.getByText("Is this your group?").waitFor(); log("Rhea is asked first: is this your group?"); await tap(rhea, "No, ours is a different group");
await tap(rhea, "Create the group"); await rhea.getByText("Bring your people in").waitFor(); await tap(rhea, "Start a project");
await rhea.getByPlaceholder(/e\.g\./).first().fill("Saturday reading club"); await rhea.getByText(/^Keep these \d+ teams$/).click(); await rhea.getByText("Needs a lead").first().waitFor();
await rhea.goto(APP + "/groups"); await rhea.getByText("Kabataan Tutors Lapu-Lapu").click();
await rhea.goto(APP + "/home"); await rhea.getByText(/Your week, Rhea/).waitFor();
await rhea.getByText("Group profile").click(); await tap(rhea, "Copy this group to the Dasig Ecosystem");
await tap(rhea, "Copy to the Ecosystem"); await rhea.getByText("Is one of these your group?").waitFor(); await rhea.screenshot({ path: "/tmp/e2e/c-similar.png" });
log("before copying: a similar group on the Ecosystem is shown"); await tap(rhea, "Ours is different. Copy it");
await rhea.getByText(/is on the Dasig Ecosystem$/).waitFor(); const counts = await rhea.getByText(/records copied/).textContent(); log(counts);
await rhea.screenshot({ path: "/tmp/e2e/c-done.png" }); await tap(rhea, "Open it on the Ecosystem");
await rhea.goto(APP + "/projects"); await rhea.getByText("Saturday reading club").waitFor(); log("the project is there on the Ecosystem");
await rhea.getByText(/Ecosystem · /).first().waitFor(); log("label says Ecosystem");
console.log("page errors:", errs.length ? errs : "none"); await b.close();
