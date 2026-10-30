import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

/** The bayanihan-site IAM user's key. Vercel reserves the usual AWS_* names, so these have their own. */
const credentials = process.env.PILOT_AWS_ACCESS_KEY_ID && process.env.PILOT_AWS_SECRET_ACCESS_KEY
  ? { accessKeyId: process.env.PILOT_AWS_ACCESS_KEY_ID, secretAccessKey: process.env.PILOT_AWS_SECRET_ACCESS_KEY } : undefined;

/** A pilot request, as submitted. Kept outside Dasig Fundraising's database on purpose. */
export type PilotRequest = {
  name: string; contact: string; group: string; kind: string; place: string; size: string; use: string; consent: true;
};

import { KINDS, SIZES } from "./pilot-options";
import { esc, facts, layout, p, text } from "./email";

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isMobile = (s: string) => /^(\+?63|0)9\d{9}$/.test(s.replace(/[\s-]/g, ""));

/** Validate at the trust boundary: lengths, required fields, a contact we can actually use, consent. */
export function parse(body: Record<string, unknown>): { ok: true; value: PilotRequest } | { ok: false; error: string } {
  const v = { name: clip(body.name, 80), contact: clip(body.contact, 120), group: clip(body.group, 120), kind: clip(body.kind, 60), place: clip(body.place, 80), size: clip(body.size, 30), use: clip(body.use, 1000) };
  if (!v.name || !v.group || !v.place) return { ok: false, error: "Please fill in your name, your group and where you are." };
  if (!isEmail(v.contact) && !isMobile(v.contact)) return { ok: false, error: "Please give an email address or a Philippine mobile number." };
  if (!KINDS.includes(v.kind) || !SIZES.includes(v.size)) return { ok: false, error: "Please choose your group's kind and size." };
  if (body.consent !== true) return { ok: false, error: "Please agree to be contacted about the pilot." };
  return { ok: true, value: { ...v, consent: true } };
}

/**
 * Where requests go. With PILOT_BUCKET set (on Vercel): one JSON object per request in S3, and emails through SES.
 * Without it (local review): a JSON-lines file in apps/site/.data, and emails printed to the server log.
 */
export async function store(r: PilotRequest, meta: { at: string; id: string }) {
  const record = { ...r, ...meta, source: "bayanihan.dasig.org/pilot" };
  const bucket = process.env.PILOT_BUCKET;
  if (!bucket) {
    const dir = join(process.cwd(), ".data"); await mkdir(dir, { recursive: true });
    await appendFile(join(dir, "pilot.jsonl"), JSON.stringify(record) + "\n");
    return;
  }
  const s3 = new S3Client({ region: process.env.PILOT_BUCKET_REGION ?? "ap-southeast-1", ...(credentials ? { credentials } : {}) });
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `pilot/${meta.at.slice(0, 10)}/${meta.id}.json`, Body: JSON.stringify(record), ContentType: "application/json" }));
}

const FROM = "Dasig <hello@dasig.org>";
type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };

/** The two emails a request sends: a notice to the team, and a confirmation to the person (when they gave an email). */
export function messages(r: PilotRequest): Mail[] {
  const rows: [string, string][] = [["Name", r.name], ["Contact", r.contact], ["Group", r.group], ["Kind", r.kind], ["Where", r.place], ["People", r.size]];
  const team: Mail = {
    to: "hello@dasig.org", subject: `Pilot request: ${r.group}`, replyTo: isEmail(r.contact) ? r.contact : undefined,
    html: layout({ preheader: `${r.name} wants to bring Dasig to ${r.group}`, title: "New pilot request",
      body: p(`<strong style="color:#0F172A">${esc(r.name)}</strong> wants to bring Dasig to <strong style="color:#0F172A">${esc(r.group)}</strong>.`) + facts(rows)
        + (r.use ? p(`<em>“${esc(r.use)}”</em>`) : "") + p(isEmail(r.contact) ? "Reply to this email to answer them directly." : "They gave a mobile number; reply by text or call.") }),
    text: text([`New pilot request`, ...rows.map(([k, v]) => `${k}: ${v}`), "", r.use || "(no note)"]),
  };
  if (!isEmail(r.contact)) return [team];
  const me: Mail = {
    to: r.contact, subject: "We got your Dasig pilot request",
    html: layout({ preheader: "We read every request and reply within a week.", title: `Salamat, ${r.name}!`,
      body: p(`Thanks for asking to bring Dasig to <strong style="color:#0F172A">${esc(r.group)}</strong>. We read every request ourselves and will reply within a week.`)
        + p("While you wait, here's how a group runs on Dasig: teams first, volunteers say “I'm in”, and finished work is recorded and signed by your group, even with no internet.")
        + facts([["Group", r.group], ["Where", r.place], ["People", r.size]]),
      cta: { label: "See how it works", href: "https://bayanihan.dasig.org/docs/start-a-group" },
      after: `<p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#94a3b8">If you didn't send this, you can ignore this email. We'll only use these details to reply about the pilot.</p>` }),
    text: text([`Salamat, ${r.name}!`, "", `Thanks for asking to bring Dasig to ${r.group}. We read every request ourselves and will reply within a week.`, "", "See how it works: https://bayanihan.dasig.org/docs/start-a-group", "", "If you didn't send this, you can ignore this email.", "", "Dasig", "https://bayanihan.dasig.org"]),
  };
  return [team, me];
}

export async function mail(r: PilotRequest) {
  const msgs = messages(r);
  if (!process.env.PILOT_BUCKET) { for (const m of msgs) console.log(`[pilot mail, not sent] to ${m.to}: ${m.subject}`); return; }
  const ses = new SESv2Client({ region: process.env.SES_REGION ?? "ap-southeast-2", ...(credentials ? { credentials } : {}) });
  for (const m of msgs) {
    await ses.send(new SendEmailCommand({ FromEmailAddress: FROM, Destination: { ToAddresses: [m.to] }, ReplyToAddresses: m.replyTo ? [m.replyTo] : undefined,
      ConfigurationSetName: process.env.SES_CONFIG_SET || undefined,
      Content: { Simple: { Subject: { Data: m.subject, Charset: "UTF-8" }, Body: { Html: { Data: m.html, Charset: "UTF-8" }, Text: { Data: m.text, Charset: "UTF-8" } } } } }));
  }
}
