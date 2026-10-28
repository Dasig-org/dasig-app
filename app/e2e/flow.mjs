import { chromium } from "playwright-core";
const APP = "http://localhost:8099";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
const shot = async (p, n) => p.screenshot({ path: `/tmp/e2e/${n}.png` });
const log = (...a) => console.log("•", ...a);
const errs = [];
async function ctx() { const c = await browser.newContext(phone); const p = await c.newPage(); p.on("pageerror", (e) => errs.push(String(e))); return p; }

// Don
const don = await ctx();
await don.goto(APP + "/");
await don.getByPlaceholder("e.g. Don").fill("Don");
await don.getByText("Continue", { exact: true }).click();
await don.getByText("Start a group").waitFor(); log("Don signed in with a nickname, sees the three doors"); await shot(don, "01-doors");
await don.getByText("Start a group").click();
await don.getByPlaceholder("e.g. Lahug Uplands Runners Club").fill("Lahug Uplands Runners Club");
await don.getByText("Community or meetup").click();
await shot(don, "02-start-group");
await don.getByText("Create group", { exact: true }).click();
await don.getByPlaceholder("e.g. Lahug Uplands Fun Run 2027").fill("Lahug Uplands Fun Run 2027");
await don.getByPlaceholder("e.g. LU 2027").fill("LU 2027");
await don.getByPlaceholder("e.g. Mactan Expo").fill("Mactan Expo");
await shot(don, "03-new-project");
await don.getByText(/Keep these \d+ teams/).click();
await don.getByText("Needs a lead").first().waitFor(); log("project created with its teams"); await shot(don, "04-project");
await don.getByText("Communications", { exact: true }).click();
await don.getByText("You lead it").waitFor();
await don.getByPlaceholder("Add something to do").fill("Draft call for speakers");
await don.getByPlaceholder("Add something to do").press("Enter");
await don.getByText(/^LU 2027-\d+$/).waitFor(); log("task added with a LU 2027 reference");
await don.getByText("Invite your team").click();
const invite = await don.getByText(/\/join\//).textContent();
log("invite link:", invite); await shot(don, "05-invite");

// Mia
const mia = await ctx();
await mia.goto(invite);
await mia.getByText("Don invited you").waitFor(); log("Mia opens the link and sees who invited her"); await shot(mia, "06-join");
await mia.getByPlaceholder("e.g. Mia").fill("Mia");
await mia.getByText("Join the team", { exact: true }).click();
await mia.getByText("Volunteers", { exact: true }).waitFor();
await mia.getByText("Draft call for speakers").click();
await mia.getByText("I'll take it").click();
await mia.getByText("Mark done").waitFor(); log("Mia took the task"); await shot(mia, "07-task-mine");
await mia.getByLabel("Add a photo or file").click();
const [chooser] = await Promise.all([mia.waitForEvent("filechooser"), mia.getByText("Document", { exact: true }).click()]);
await chooser.setFiles({ name: "speaker-call-draft.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% draft call for speakers\n") });
await mia.getByText("speaker-call-draft.pdf").waitFor(); log("Mia attached her draft (kept by the group's server)");
await mia.getByText("Mark done").click();
await mia.getByText("Recorded and signed by your group").waitFor(); log("Mia marked it done: recorded and signed"); await shot(mia, "08-done-signed");

// Don sees it
await don.goto(APP + "/home");
await don.getByText("Your teams").waitFor();
await don.getByText("Communications", { exact: true }).click();
await don.getByText("1 of 1 done").waitFor(); await don.getByText(/Mia/).first().waitFor(); log("Don's team page shows 1 of 1 done, Mia as a volunteer"); await shot(don, "09-team-done");
console.log("page errors:", errs.length ? errs : "none");
await browser.close();
