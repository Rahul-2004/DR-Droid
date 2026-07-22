import { env } from "@/lib/env";
import { fetchWithTimeout, errorMessage } from "@/lib/http";
import { assertPublicHttpUrl } from "@/lib/safe-url";

export type SearchResult = { title: string; url: string; description: string };
type TavilyResult = { title?: string; url?: string; content?: string };

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const apiKey = env().TAVILY_API_KEY;
  if (!apiKey) throw new Error("Web research is unavailable: configure TAVILY_API_KEY.");

  const response = await fetchWithTimeout("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 5,
      include_raw_content: "text",
    }),
  }, 30_000);

  if (!response.ok) throw new Error(await errorMessage(response, "Search request failed"));
  const data = await response.json() as { results?: TavilyResult[] };
  return (data.results ?? [])
    .filter((item): item is TavilyResult & { title: string; url: string } => Boolean(item.title && item.url))
    .map((item) => ({ title: item.title, url: item.url, description: item.content ?? "" }));
}

export async function readPage(value: string) {
  let url = await assertPublicHttpUrl(value);

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetchWithTimeout(url, {
      headers: { "User-Agent": "MicroManus research bot/1.0" },
      redirect: "manual",
    }, 12_000);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Source redirect did not include a destination");
      url = await assertPublicHttpUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) throw new Error(`Could not read source (${response.status})`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("Source is not a readable web page");
    }

    const html = await response.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 12_000);
  }

  throw new Error("Source redirected too many times");
}