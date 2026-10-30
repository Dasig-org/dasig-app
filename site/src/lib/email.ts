/**
 * Branded HTML for the Ecosystem's emails, matching Dasig Fundraising's (apps/web/src/lib/email/simple-wrapper.ts in the
 * dasig repo): orange header band with the white hands wordmark, white body, slate footer. Table layout and inline styles
 * so Gmail, Outlook and phone mail apps render it the same. The logo is a PNG hosted on dasig.org; mail apps strip SVG.
 */
const ORANGE = "#F47C26", INK = "#0F172A", SLATE = "#475569", S400 = "#94a3b8", WASH = "#f1f5f9", SAND = "#FFF6E9";
const LOGO = "https://dasig.org/images/email/dasig-hands-wordmark-white.png";
const SITE = "https://bayanihan.dasig.org";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function layout({ preheader, title, body, cta, after = "" }: { preheader: string; title: string; body: string; cta?: { label: string; href: string }; after?: string }) {
  const button = cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px"><tr><td style="border-radius:999px;background:${ORANGE}">
    <a href="${esc(cta.href)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">${esc(cta.label)}</a></td></tr></table>` : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${WASH};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WASH}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden">
    <tr><td bgcolor="${ORANGE}" style="background:${ORANGE};background-image:linear-gradient(135deg,${ORANGE} 0%,#E85C21 100%);padding:26px 24px;text-align:center">
      <img src="${LOGO}" alt="Dasig" width="140" style="max-width:140px;height:auto;display:inline-block;border:0">
    </td></tr>
    <tr><td style="padding:32px 28px 28px;font-size:16px;line-height:1.6;color:${SLATE}">
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:${INK};font-weight:800">${esc(title)}</h1>
      ${body}
      ${button}
      ${after}
    </td></tr>
    <tr><td style="background:#ffffff;padding:18px 24px 22px;text-align:center;border-top:1px solid #e2e8f0">
      <p style="margin:0 0 4px;font-size:13px;color:${SLATE}">The Dasig Ecosystem · <a href="${SITE}" style="color:${SLATE}">bayanihan.dasig.org</a></p>
      <p style="margin:0;font-size:11px;color:${S400}">Dasig Inc. · <a href="${SITE}/trust/privacy" style="color:${S400}">Privacy</a></p>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

export const p = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;

/** A sand-coloured box of label/value rows, for a summary of what someone sent. */
export function facts(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SAND};border-radius:16px;margin:8px 0 18px">
  ${rows.map(([k, v], i) => `<tr><td style="padding:${i ? 6 : 14}px 16px ${i === rows.length - 1 ? 14 : 6}px;font-size:13px;color:${S400};width:34%;vertical-align:top">${esc(k)}</td>
  <td style="padding:${i ? 6 : 14}px 16px ${i === rows.length - 1 ? 14 : 6}px 0;font-size:15px;color:${INK};font-weight:600;vertical-align:top">${esc(v) || "—"}</td></tr>`).join("")}
  </table>`;
}

/** Plain-text twin for the text part, so every email has both. */
export const text = (lines: string[]) => lines.join("\n");
