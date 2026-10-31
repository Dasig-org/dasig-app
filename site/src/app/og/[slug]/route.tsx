import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PAGES, ogSlug, pathForSlug, type PagePath } from "@/lib/seo";

/** Share images, 1200×630, one per page, made at build time. Brand sand and orange, the hands emblem, the page's own line. */
export const dynamic = "force-static";
export function generateStaticParams() { return (Object.keys(PAGES) as PagePath[]).map((p) => ({ slug: ogSlug(p) })); }

/** Pages whose share image shows a real screen from the app. The rest show the emblem large. */
const SCREEN: Partial<Record<PagePath, string>> = {
  "/": "volunteer-today", "/pilot": "coordinator-week", "/get": "volunteer-today", "/docs/hubs": "hub-qr",
  "/directory": "whos-working-here", "/docs/volunteering": "volunteer-story", "/docs/start-a-group": "start-from-teams",
};

const asset = (f: string) => readFile(join(process.cwd(), "og-assets", f));
const dataUrl = async (path: string, type: string) => `data:${type};base64,${(await readFile(path)).toString("base64")}`;

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const path = pathForSlug((await ctx.params).slug);
  if (!path) return new Response("not found", { status: 404 });
  const p = PAGES[path];
  const [bold, semi] = await Promise.all([asset("inter-800.woff"), asset("inter-600.woff")]);
  const emblem = await dataUrl(join(process.cwd(), "public", "emblem.png"), "image/png");
  const screen = SCREEN[path] ? await dataUrl(join(process.cwd(), "og-assets", "screens", `${SCREEN[path]}.png`), "image/png") : null;
  const big = p.og.length > 44 ? 62 : 72;

  return new ImageResponse(
    <div style={{ width: 1200, height: 630, display: "flex", background: "linear-gradient(135deg, #FFF6E9 0%, #FFEBD9 100%)", fontFamily: "Inter", color: "#0F172A", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -160, top: -160, width: 620, height: 620, borderRadius: 999, border: "2px solid rgba(244,124,38,.18)", display: "flex" }} />
      <div style={{ position: "absolute", right: -60, top: -60, width: 420, height: 420, borderRadius: 999, border: "2px solid rgba(244,124,38,.12)", display: "flex" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 60px 72px", width: 740 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={emblem} width={56} height={56} alt="" />
          <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>Bayanihan</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#E85C21" }}>{p.kicker}</span>
          <span style={{ fontSize: big, fontWeight: 800, lineHeight: 1.06, letterSpacing: -2, marginTop: 14 }}>{p.og}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 600, color: "#475569" }}>
          <span style={{ background: "#F47C26", color: "#fff", borderRadius: 999, padding: "8px 18px", fontSize: 21 }}>Free and open source</span>
          <span>bayanihan.dasig.org</span>
        </div>
      </div>
      {screen
        ? <div style={{ position: "absolute", right: 70, top: 70, width: 330, padding: 9, borderRadius: 52, background: "linear-gradient(135deg, #5b6372, #14171d 50%, #6b7382)", boxShadow: "0 30px 60px rgba(15,23,42,.30)", display: "flex", transform: "rotate(4deg)" }}>
            <img src={screen} width={312} height={675} alt="" style={{ borderRadius: 44 }} />
          </div>
        : <div style={{ position: "absolute", right: 96, top: 195, width: 240, height: 240, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 50px rgba(232,92,33,.18)" }}>
            <img src={emblem} width={160} height={160} alt="" />
          </div>}
    </div>,
    { width: 1200, height: 630, fonts: [{ name: "Inter", data: bold, weight: 800, style: "normal" }, { name: "Inter", data: semi, weight: 600, style: "normal" }] },
  );
}
