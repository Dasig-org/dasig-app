import { directoryPage } from "@/lib/directory";

/** The next page of the directory, for "Show more". Same data as the page itself; nothing private passes through. */
export async function GET(req: Request) {
  const offset = Math.max(0, Math.floor(Number(new URL(req.url).searchParams.get("offset") ?? 0)) || 0);
  const page = await directoryPage(offset);
  return page ? Response.json(page) : Response.json({ error: "The Dasig Ecosystem can't be reached right now." }, { status: 502 });
}
