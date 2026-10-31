import { site } from "@/lib/site";

/** One listed group as the directory shows it. Only what the group chose to make public. */
export type Listed = {
  id: string; name: string; kind?: string; place?: string; about?: string; causes: string[]; logo?: string;
  projects: { title: string; status?: string; start?: string }[];
};
export type DirectoryPage = { total: number; offset: number; groups: Listed[] };

export const PAGE = 24;
/** The Ecosystem, or a local server for previews (DIRECTORY_API=http://localhost:8790). */
const API = (process.env.DIRECTORY_API ?? site.api).replace(/\/$/, "");

const CAUSES: Record<string, string> = { education: "Education", health: "Health", food: "Food", environment: "Environment", "disaster-readiness": "Disaster readiness",
  livelihood: "Livelihood", "youth-leadership": "Youth", "civic-participation": "Civic", "digital-skills": "Digital skills", "arts-culture": "Arts & culture",
  "faith-community": "Faith & community", "animal-welfare": "Animals" };
const KINDS: Record<string, string> = { "registered-npo": "Nonprofit", "faith-based": "Faith community", "civic-club": "Civic club", community: "Community",
  "event-team": "Event team", "sk-council": "SK council", "school-org": "School organization", school: "School", university: "University",
  cooperative: "Cooperative", informal: "Informal group", "lgu-unit": "LGU office", "national-agency": "National agency", foundation: "Foundation" };

type Raw = Record<string, any>;
/** Fetch one page. Returns null when the Ecosystem can't be reached, so the page can say so. Cached for 5 minutes. */
export async function directoryPage(offset = 0): Promise<DirectoryPage | null> {
  try {
    const r = await fetch(`${API}/$directory?offset=${offset}&count=${PAGE}`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    const d = (await r.json()) as { total?: number; offset?: number; groups?: Raw[]; projects?: Raw[] };
    const groups = (d.groups ?? []).map((g): Listed => ({
      id: String(g.id), name: String(g.name ?? ""),
      ...(g.kind && KINDS[g.kind] ? { kind: KINDS[g.kind] } : {}),
      ...(placeOf(g) ? { place: placeOf(g) } : {}),
      ...(typeof g.description === "string" && g.description.trim() ? { about: g.description.trim().slice(0, 400) } : {}),
      causes: ((g.cause ?? []) as Raw[]).map((c) => CAUSES[c.code] ?? c.display ?? c.code).filter(Boolean),
      ...(g.logo ? { logo: `${API}${g.logo}` } : {}),
      projects: (d.projects ?? []).filter((p) => p.organization?.reference === `Organization/${g.id}`).slice(0, 3)
        .map((p) => ({ title: String(p.title ?? ""), ...(p.status ? { status: String(p.status) } : {}), ...(p.period?.start ? { start: String(p.period.start) } : {}) })),
    }));
    return { total: d.total ?? groups.length, offset: d.offset ?? offset, groups };
  } catch { return null; }
}
const placeOf = (g: Raw) => String(((g.extension ?? []) as Raw[]).find((x) => x.url === "bayanihan:place-text")?.value ?? "");
