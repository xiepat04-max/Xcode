/**
 * ASX insider trading data via ASX announcement feeds.
 *
 * Australian law requires directors and substantial shareholders (>5%) to
 * notify ASX within 2 business days of a change in holdings:
 *  - Form 3Y / 3X (director interests / substantial holder)
 *  - ASIC notified simultaneously
 */

export interface InsiderTradeRaw {
  ticker: string;
  companyName: string;
  personName: string;
  personRole: string;
  tradeType: "buy" | "sell" | "acquisition" | "disposal";
  shares: number;
  pricePerShare: number;
  totalValue: number;
  tradeDate: string;
  noticeDate: string;
  noticeType: "3Y" | "3X" | "other";
  noticeUrl: string;
}

const ASX_API_BASE = "https://www.asx.com.au/asx/1/company";

/** Fetch recent announcements for a ticker and filter for director/holder notices */
export async function fetchInsiderAnnouncements(ticker: string): Promise<InsiderTradeRaw[]> {
  const url = `${ASX_API_BASE}/${ticker.toUpperCase()}/announcements?count=100&market_sensitive=false`;

  const res = await fetch(url, {
    headers: { "User-Agent": "ASX-Insider-Tracker/1.0" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`ASX API error: ${res.status}`);

  const json = await res.json();
  const announcements: any[] = json.data ?? [];

  // Filter for director interest / substantial holder notices
  const insiderKeywords = [
    "director", "change in director", "substantial holder",
    "becoming a substantial holder", "ceasing to be",
    "appendix 3y", "appendix 3x",
  ];

  const filtered = announcements.filter(a => {
    const title = (a.header ?? "").toLowerCase();
    return insiderKeywords.some(k => title.includes(k));
  });

  // Parse what we can from titles — full parsing requires downloading the PDF
  return filtered.map(a => {
    const title: string = a.header ?? "";
    const isBuy = /acquire|purchas|buy|on-market purchase/i.test(title);
    const isDirector = /director|3y/i.test(title);

    return {
      ticker: ticker.toUpperCase(),
      companyName: a.issuer_full_name ?? ticker,
      personName: extractPersonName(title),
      personRole: isDirector ? "Director" : "Substantial Holder",
      tradeType: isBuy ? "buy" : "sell",
      shares: 0,         // Requires PDF parsing for exact shares
      pricePerShare: 0,  // Requires PDF parsing
      totalValue: 0,     // Requires PDF parsing
      tradeDate: a.document_release_date ?? "",
      noticeDate: a.document_release_date ?? "",
      noticeType: /3y/i.test(title) ? "3Y" : /3x/i.test(title) ? "3X" : "other",
      noticeUrl: `https://www.asx.com.au${a.url ?? ""}`,
    } as InsiderTradeRaw;
  });
}

/** Fetch insider activity across multiple ASX 200 heavyweights */
export async function fetchMarketWideInsiders(tickers: string[]): Promise<InsiderTradeRaw[]> {
  const results = await Promise.allSettled(
    tickers.map(t => fetchInsiderAnnouncements(t))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<InsiderTradeRaw[]> => r.status === "fulfilled")
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.noticeDate).getTime() - new Date(a.noticeDate).getTime());
}

function extractPersonName(title: string): string {
  // Common patterns in ASX director notices
  const patterns = [
    /change in director'?s? interest\s*[-–]\s*(.+)/i,
    /director'?s? interest\s*[-–]\s*(.+)/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1].trim().split(" ").slice(0, 3).join(" ");
  }
  return "Director";
}

/** Top ASX 200 tickers to watch for insider activity */
export const ASX_WATCHLIST = [
  "CBA", "BHP", "CSL", "NAB", "WBC", "ANZ", "WES", "MQG", "WOW", "FMG",
  "RIO", "TLS", "GMG", "REA", "COL", "ALL", "QBE", "TCL", "STO", "WDS",
];
