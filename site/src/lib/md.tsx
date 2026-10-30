import { Fragment, type ReactNode } from "react";

/**
 * A small Markdown renderer for the policy pages, so the site shows the same file the team edits
 * (docs/network/*.md) instead of a copy that drifts. Handles headings, paragraphs, lists, tables, bold and code.
 */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else { const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!; out.push(<a key={k++} href={href}>{label}</a>); }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    if (!l.trim()) { i++; continue; }
    const h = /^(#{1,3}) (.*)$/.exec(l);
    if (h) { const T = (`h${h[1]!.length}`) as "h1" | "h2" | "h3"; blocks.push(<T key={k++}>{inline(h[2]!)}</T>); i++; continue; }
    if (l.startsWith("|")) {
      const rows: string[] = []; while (i < lines.length && lines[i]!.startsWith("|")) rows.push(lines[i++]!);
      const [head, , ...body] = rows;
      blocks.push(<table key={k++}><thead><tr>{cells(head!).map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
        <tbody>{body.map((r, n) => <tr key={n}>{cells(r).map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody></table>);
      continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ordered = /^\d+\. /.test(l); const items: string[] = [];
      while (i < lines.length && /^(- |\d+\. |  )/.test(lines[i]!) && lines[i]!.trim()) {
        const x = lines[i]!; if (/^(- |\d+\. )/.test(x)) items.push(x.replace(/^(- |\d+\. )/, "")); else items[items.length - 1] += " " + x.trim(); i++;
      }
      const L = ordered ? "ol" : "ul"; blocks.push(<L key={k++}>{items.map((t, n) => <li key={n}>{inline(t)}</li>)}</L>); continue;
    }
    const para: string[] = []; while (i < lines.length && lines[i]!.trim() && !/^(#|\||- |\d+\. )/.test(lines[i]!)) para.push(lines[i++]!);
    blocks.push(<p key={k++}>{inline(para.join(" "))}</p>);
  }
  return <Fragment>{blocks}</Fragment>;
}
