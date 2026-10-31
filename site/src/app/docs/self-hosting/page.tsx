import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = meta("/docs/self-hosting");

export default function SelfHosting() {
  return <Doc path="/docs/self-hosting" section="/docs">
    <h1>Run your own server</h1>
    <div className="note"><strong>Coming with the first open-source release.</strong> This is how it will work; the container image isn't published yet.</div>
    <p>An LGU, a federation, a school or a network of chapters can run its own Bayanihan Server, keep its records on its own machine, and still list its groups on the Dasig Ecosystem if it wants to.</p>
    <h2>What you need</h2>
    <ul><li>A small Linux server: 1 GB of memory is enough for many groups.</li><li>Docker.</li><li>Any S3-compatible storage for backups: AWS S3, Cloudflare R2, Backblaze B2, or MinIO on your own hardware.</li><li>A domain name.</li></ul>
    <h2>The stack</h2>
    <ul>
      <li><strong>Bayanihan Server</strong> on SQLite: one container, one database file. The same store runs inside every phone.</li>
      <li><strong>Litestream</strong> streams every change in the database to your storage within seconds. Restoring onto a new server is one command.</li>
      <li><strong>Caddy</strong> serves it over HTTPS with automatic certificates.</li>
    </ul>
    <pre><code>{`# docker-compose.yml (preview)
services:
  bayanihan:
    image: bayanihan/server:0.1
    environment:
      BIX_DB: /data/bix.db
    volumes: [ "data:/data" ]
  litestream:
    image: litestream/litestream
    command: replicate
    volumes: [ "data:/data", "./litestream.yml:/etc/litestream.yml" ]
  caddy:
    image: caddy:2
    ports: [ "80:80", "443:443" ]
    volumes: [ "./Caddyfile:/etc/caddy/Caddyfile" ]
volumes:
  data:`}</code></pre>
    <h2>Growing</h2>
    <p>When one server isn't enough, point Bayanihan Server at PostgreSQL instead. It supports both, and the records are the same BIX either way.</p>
    <h2>Your own policy</h2>
    <p>A host sets its own rules for who can join and what it checks. The Dasig Ecosystem's <a href="/trust/host-policy">host policy</a> is one example you can start from.</p>
  </Doc>;
}
