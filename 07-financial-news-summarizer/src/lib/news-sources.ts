/**
 * Australian financial news sources.
 * Primary: NewsAPI (requires API key) + ASX announcement feed (free)
 * Topics: ASX markets, RBA decisions, Australian economy, mining, banking
 */

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  content?: string;
  sentiment?: "positive" | "negative" | "neutral";
  summary?: string;
  tickers?: string[];
}

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_BASE = "https://newsapi.org/v2";

// Australian financial news queries
const AU_FINANCE_QUERIES = [
  "ASX stock market",
  "Reserve Bank Australia interest rates",
  "Australian economy GDP",
  "iron ore BHP Rio Tinto",
  "CBA Westpac ANZ NAB bank results",
  "ASIC regulation",
  "Australian dollar AUD",
];

const AU_FINANCIAL_SOURCES = [
  "the-australian-financial-review",
  "abc-news-au",
  "reuters",
  "bloomberg",
  "the-wall-street-journal",
];

export async function fetchAustralianFinanceNews(
  query: string = "ASX Australian market",
  pageSize: number = 20
): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    return getMockNews();
  }

  const params = new URLSearchParams({
    q: query + " (ASX OR Australia OR RBA OR ASIC)",
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(pageSize),
    apiKey: NEWS_API_KEY,
  });

  const res = await fetch(`${NEWS_API_BASE}/everything?${params}`, {
    next: { revalidate: 900 }, // 15-min cache
  });

  if (!res.ok) {
    console.error("NewsAPI error:", res.status);
    return getMockNews();
  }

  const json = await res.json();
  return (json.articles ?? []).map((a: any) => ({
    title: a.title ?? "",
    description: a.description ?? "",
    url: a.url ?? "",
    source: a.source?.name ?? "Unknown",
    publishedAt: a.publishedAt ?? "",
    content: a.content ?? a.description ?? "",
  }));
}

export async function fetchASXAnnouncementNews(tickers: string[]): Promise<NewsArticle[]> {
  const results: NewsArticle[] = [];
  for (const ticker of tickers.slice(0, 5)) {
    try {
      const url = `https://www.asx.com.au/asx/1/company/${ticker.toUpperCase()}/announcements?count=5&market_sensitive=true`;
      const res = await fetch(url, {
        headers: { "User-Agent": "ASX-News-Tracker/1.0" },
        next: { revalidate: 600 },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const anns: any[] = json.data ?? [];
      for (const a of anns) {
        results.push({
          title: `${ticker.toUpperCase()}: ${a.header}`,
          description: `Market Sensitive ASX Announcement — ${a.type}`,
          url: `https://www.asx.com.au${a.url ?? ""}`,
          source: "ASX Announcements",
          publishedAt: a.document_release_date ?? "",
          tickers: [ticker.toUpperCase()],
        });
      }
    } catch {}
  }
  return results;
}

function getMockNews(): NewsArticle[] {
  return [
    {
      title: "RBA holds cash rate at 4.35% — Governor cites sticky inflation",
      description: "The Reserve Bank of Australia kept its benchmark rate unchanged, noting that services inflation remains above target despite goods deflation.",
      url: "#",
      source: "Mock — Add NEWS_API_KEY",
      publishedAt: new Date().toISOString(),
    },
    {
      title: "BHP lifts iron ore guidance on strong Chinese steel demand",
      description: "Australia's largest miner revised its FY guidance upward after port throughput at Port Hedland hit a record quarterly high.",
      url: "#",
      source: "Mock — Add NEWS_API_KEY",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      title: "CBA reports record H1 profit of A$5.0B — NIM compression concerns",
      description: "Commonwealth Bank delivered its highest ever half-year profit, but analysts flagged net interest margin pressure as competition for deposits intensifies.",
      url: "#",
      source: "Mock — Add NEWS_API_KEY",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      title: "ASX 200 falls 0.8% as US recession fears weigh on miners",
      description: "The Australian benchmark index retreated as weak US manufacturing data triggered a global risk-off move, with the materials sector down 2.1%.",
      url: "#",
      source: "Mock — Add NEWS_API_KEY",
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      title: "ASIC targets greenwashing in managed fund disclosures",
      description: "Australia's securities regulator announced new enforcement action against four fund managers for misleading ESG claims.",
      url: "#",
      source: "Mock — Add NEWS_API_KEY",
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
    },
  ];
}
