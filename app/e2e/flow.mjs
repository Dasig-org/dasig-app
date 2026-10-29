import { chromium } from "playwright-core";
const APP = "http://localhost:8099";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
const shot = async (p, n) => p.screenshot({ path: `/tmp/e2e/${n}.png` });
const log = (...a) => console.log("•", ...a);
const errs = [];
async function ctx() { const c = await browser.newContext(phone); const p = await c.newPage(); p.on("pageerror", (e) => errs.push(String(e))); return p; }
const tap = (p, text) => p.getByText(text, { exact: true }).filter({ visible: true }).first().click();

// Don: welcome, profile, run a group, project
const don = await ctx();
await don.goto(APP + "/");
await don.getByText("Your group, organized").waitFor(); await shot(don, "01-welcome"); log("welcome slides");
await tap(don, "Skip");
await don.getByLabel("Your nickname").fill("Don"); await tap(don, "Continue");
await don.getByText("Tell us about you").waitFor(); await shot(don, "02-profile"); log("profile");
await don.getByPlaceholder("e.g. Student, loves organizing events").fill("Communications lead, LU 2027");
await tap(don, "Writing"); await tap(don, "Continue");
await don.getByText("I run a group").waitFor(); await shot(don, "03-paths"); log("three ways in");
await tap(don, "I run a group");
await don.getByPlaceholder("e.g. Lahug Uplands Runners Club").fill("Lahug Uplands Runners Club");
await tap(don, "Community or meetup"); await tap(don, "Tech").catch(() => {});
await don.getByPlaceholder("e.g. Lapu-Lapu City, Cebu").fill("Cebu");
await shot(don, "04-group"); await tap(don, "Next: how it's run");
await don.getByText("Organizers and co-organizers").waitFor(); await shot(don, "05-structure"); log("how it's run");
await tap(don, "Create the group");
await don.getByText("Bring your people in").waitFor(); await shot(don, "06-ready"); log("group ready");
await tap(don, "Start a project");
await don.getByPlaceholder("e.g. Lahug Uplands Fun Run 2027").fill("Lahug Uplands Fun Run 2027");
await don.getByPlaceholder("e.g. LU 2027").fill("LU 2027");
await don.getByPlaceholder("e.g. 2027-03-06").fill("2027-03-06");
await don.getByText(/Keep these \d+ teams/).click();
await don.getByText("Needs a lead").first().waitFor(); await shot(don, "07-project"); log("project page");
await don.getByText("Communications", { exact: true }).click();
await don.getByText("You lead it").waitFor();
await don.getByPlaceholder("Add something to do").fill("Draft call for speakers"); await don.getByPlaceholder("Add something to do").press("Enter");
await don.getByText(/^LU 2027-\d+$/).waitFor(); log("task with a LU 2027 reference");
await tap(don, "Invite your team");
const invite = await don.getByText(/\/join\//).textContent(); log("invite:", invite);

// Mia: volunteer joins by link
const mia = await ctx();
await mia.goto(invite);
await mia.getByText("Don invited you").waitFor(); await shot(mia, "08-join");
await mia.getByPlaceholder("e.g. Mia").fill("Mia"); await tap(mia, "Join the team");
await mia.getByText("Draft call for speakers").click();
await tap(mia, "I'll take it"); await mia.getByText("Mark done").waitFor();
await tap(mia, "Mark done");
await mia.getByText("Recorded and signed by your group").waitFor(); await shot(mia, "09-done"); log("Mia did it: recorded and signed");
await mia.goto(APP + "/home"); await mia.getByText(/Good (morning|afternoon|evening), Mia/).waitFor(); await shot(mia, "10-volunteer-home"); log("volunteer home");

// Don: people, need, vote, timeline, credits, wrap-up
await don.goto(APP + "/home"); await don.getByText("Your week, Don").waitFor(); await shot(don, "11-coordinator-home"); log("coordinator home");
await don.getByRole("tab", { name: "People" }).click();
await don.getByText("Mia", { exact: true }).waitFor(); await shot(don, "12-people"); log("people shows Mia as a volunteer");
await tap(don, "Add by name"); await don.getByPlaceholder("e.g. Liza").fill("Liza"); await tap(don, "Add");
await don.getByText("Liza", { exact: true }).waitFor(); log("added Liza by name");
await don.goto(APP + "/projects"); await don.getByText("Lahug Uplands Fun Run 2027").click();
await tap(don, "Post a need"); await don.getByPlaceholder("e.g. Bottled water for runners").fill("Bottled water");
await don.getByPlaceholder("e.g. 300").fill("300"); await tap(don, "Post the need");
await don.getByText("I can help with this").waitFor(); await tap(don, "I can help with this");
await don.getByLabel(/How many/).fill("120").catch(async () => { await don.locator("input").nth(0).fill("120"); });
await tap(don, "Offer"); await don.getByRole("button", { name: "Accept", exact: true }).filter({ visible: true }).first().click();
await don.getByText("120 of 300 piece").waitFor(); await shot(don, "13-need"); log("need: offer accepted, 120 of 300 covered");
await don.goBack(); await don.getByText("Start a vote").click();
await don.getByPlaceholder("e.g. Which design concept?").fill("Which venue layout?");
await don.getByPlaceholder("Option A").fill("Beachfront hall"); await don.getByPlaceholder("Option B").fill("Garden pavilion");
await tap(don, "Open the vote"); await don.getByText("A · Beachfront hall").waitFor();
await don.getByLabel("checkbox").first().click().catch(async () => { await don.getByRole("checkbox").first().click(); });
await don.getByText(/Vote for A/).click(); await don.getByText(/Your vote is in/).waitFor();
await tap(don, "Close voting now"); await don.getByText("Chosen by majority").waitFor(); await shot(don, "14-vote"); log("vote decided by Core's count");
await don.goBack(); await tap(don, "Timeline"); await don.getByText("Draft call for speakers").waitFor(); await shot(don, "15-timeline"); log("timeline");
await don.goBack(); await tap(don, "Credits"); await don.getByText(/made it happen/).waitFor(); await shot(don, "16-credits"); log("credits");
await don.goBack(); await tap(don, "Wrap up the project"); await tap(don, "Save these teams for next time"); await don.getByText(/Saved\. Next time/).waitFor(); await shot(don, "17-wrap"); log("teams saved for next time");
await don.goto(APP + "/nearby"); await don.getByText("Who's working here").waitFor(); await shot(don, "18-nearby"); log("nearby, honest about the network");
console.log("page errors:", errs.length ? errs : "none");
await browser.close();
