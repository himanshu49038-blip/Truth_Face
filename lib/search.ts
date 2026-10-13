export type Evidence = { title: string; url: string; content: string };

async function tavilySearch(query: string): Promise<Evidence[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    title: String(r.title ?? ""),
    url: String(r.url ?? ""),
    content: String(r.content ?? "").slice(0, 800), // keep prompts small
  }));
}

/** Runs all queries in parallel, dedupes by URL, caps total results. */
export async function searchEvidence(queries: string[]): Promise<Evidence[]> {
  const settled = await Promise.allSettled(queries.map(tavilySearch));
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    for (const e of s.value) {
      if (!e.url || seen.has(e.url)) continue;
      seen.add(e.url);
      out.push(e);
    }
  }
  return out.slice(0, 12);
}
