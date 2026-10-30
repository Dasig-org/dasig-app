import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { Doc } from "@/components/Doc";
import { Markdown } from "@/lib/md";

export const metadata: Metadata = { title: "Host policy", description: "The Dasig Ecosystem's rules as a host: who can join, verification, what the server enforces, privacy, and promises about leaving." };

/** Rendered from content/HOST_POLICY.md, a copy of docs/network/HOST_POLICY.md made by `npm run sync` (Vercel builds only this folder). Internal status lines and open items are left out. */
function policy() {
  const md = readFileSync(join(process.cwd(), "content", "HOST_POLICY.md"), "utf8");
  const cut = md.indexOf("\n## Open items");
  return (cut >= 0 ? md.slice(0, cut) : md).split("\n").filter((l) => !l.startsWith("Status:")).join("\n").replace(/ · draft$/m, "").replace(/\(draft, for [^)]*\)/, "(draft)");
}

export default function HostPolicy() {
  return <Doc path="/trust/host-policy" section="/trust">
    <div className="note"><strong>Draft.</strong> This policy is still being reviewed, including by a privacy adviser. It isn't legal advice.</div>
    <Markdown source={policy()} />
  </Doc>;
}
