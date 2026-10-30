import { randomUUID } from "node:crypto";
import { mail, parse, store } from "@/lib/pilot";

/** Simple per-address limit; Cloudflare Turnstile will sit in front once the site is live. */
const seen = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), recent = (seen.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now); seen.set(ip, recent); return recent.length > 5;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "That didn't send. Please try again." }, { status: 400 }); }
  if (typeof body.website === "string" && body.website) return Response.json({ ok: true }); // honeypot: bots fill hidden fields
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return Response.json({ error: "Too many requests from here. Please try again in an hour." }, { status: 429 });
  const p = parse(body);
  if (!p.ok) return Response.json({ error: p.error }, { status: 422 });
  const meta = { at: new Date().toISOString(), id: randomUUID() };
  try { await store(p.value, meta); } catch (e) { console.error("pilot store failed", e); return Response.json({ error: "We couldn't save that. Please email hello@dasig.org instead." }, { status: 500 }); }
  try { await mail(p.value); } catch (e) { console.error("pilot mail failed", e); } // saved already; a failed email shouldn't lose the request
  return Response.json({ ok: true });
}
