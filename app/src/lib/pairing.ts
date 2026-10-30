/** What a hub's QR carries: dasig://pair?hub=http://192.168.43.1:8787&code=…&link=… (link optional: join a team too). */
export type PairInfo = { hub: string; code: string; link?: string };
export function pairUrl(p: PairInfo) {
  return `dasig://pair?hub=${encodeURIComponent(p.hub)}&code=${encodeURIComponent(p.code)}${p.link ? `&link=${encodeURIComponent(p.link)}` : ""}`;
}
export function parsePair(text: string): PairInfo | null {
  try {
    const q = text.includes("?") ? text.slice(text.indexOf("?") + 1) : "";
    const params = Object.fromEntries(q.split("&").filter(Boolean).map((kv) => { const [k, v = ""] = kv.split("="); return [decodeURIComponent(k!), decodeURIComponent(v)]; }));
    if (!params.hub || !params.code) return null;
    return { hub: params.hub, code: params.code, ...(params.link ? { link: params.link } : {}) };
  } catch { return null; }
}
