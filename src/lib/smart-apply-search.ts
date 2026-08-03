export type JobHit = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  snippet: string;
  source: string;
};

export function hostnameOf(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function splitTitleCompany(raw: string, host: string): { title: string; company: string } {
  const cleaned = raw.replace(/\s+\|\s+(LinkedIn|Indeed|Glassdoor|Greenhouse|Lever|Workable).*$/i, "").trim();
  let m = cleaned.match(/^(.+?)\s+(?:at|@|-|—|·|\|)\s+(.+?)(?:\s+(?:in|-|—|·|\|)\s+.+)?$/i);
  if (m) return { title: m[1].trim(), company: m[2].trim() };
  return { title: cleaned, company: host.split(".")[0] || "Unknown" };
}

export async function searchJobsForQuery(opts: {
  role: string;
  location?: string;
  seniority?: string;
  limit?: number;
}): Promise<JobHit[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("Job search isn't configured. Please contact support.");

  const parts = [opts.seniority, opts.role, "jobs"].filter(Boolean);
  if (opts.location) parts.push(`in ${opts.location}`);
  const query = `${parts.join(" ")} site:linkedin.com/jobs OR site:indeed.com OR site:greenhouse.io OR site:lever.co OR site:workable.com OR site:glassdoor.com`;

  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: opts.limit ?? 20,
      tbs: "qdr:m",
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("Job search quota exhausted. Please try again later.");
    throw new Error(`Job search failed (${res.status}). ${txt.slice(0, 200)}`);
  }

  const json: any = await res.json().catch(() => ({}));
  const raw: any[] = json?.data?.web ?? json?.data ?? json?.web ?? [];

  return raw
    .filter((r) => r?.url && r?.title)
    .slice(0, opts.limit ?? 20)
    .map((r, i) => {
      const host = hostnameOf(r.url);
      const { title, company } = splitTitleCompany(String(r.title), host);
      return {
        id: `${i}-${r.url}`,
        title,
        company,
        location: opts.location || "",
        url: r.url,
        snippet: String(r.description || r.snippet || "").slice(0, 600),
        source: host,
      };
    });
}
