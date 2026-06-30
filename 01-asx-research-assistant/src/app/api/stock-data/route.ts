import { NextRequest, NextResponse } from "next/server";
import type { ASXStockData, EarningsRecord } from "@/lib/types";

// Yahoo Finance uses .AX suffix for ASX-listed stocks
function toYahooTicker(ticker: string): string {
  const upper = ticker.toUpperCase().trim();
  // Already has exchange suffix
  if (upper.includes(".")) return upper;
  // Well-known international tickers stay as-is
  const intlTickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA"];
  if (intlTickers.includes(upper)) return upper;
  return `${upper}.AX`;
}

async function fetchYahooData(yahooTicker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);
  return res.json();
}

async function fetchYahooSummary(yahooTicker: string) {
  const modules = "summaryDetail,financialData,defaultKeyStatistics,assetProfile,earnings";
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooTicker)}?modules=${modules}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  return res.json();
}

// ASX 200 constituent list (top 50 for quick lookup)
const ASX200_MEMBERS = new Set([
  "CBA","BHP","CSL","NAB","WBC","ANZ","WES","MQG","WOW","RIO","TLS",
  "GMG","FMG","REA","COL","ALL","QBE","TCL","STO","WDS","APA","IAG",
  "AMC","CPU","ASX","BXB","CWY","DXS","EDV","EVN","FPH","GQG","HVN",
  "IEL","IFL","JHX","LLC","LYC","MIN","MPL","NCM","NXT","ORI","PLS",
  "PMV","RHC","SEK","SGP","SHL","SKI","SOL","SUN","TAH","TLC","TPG",
]);

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) return NextResponse.json({ error: "ticker is required" }, { status: 400 });

  const yahooTicker = toYahooTicker(ticker);
  const isASX = yahooTicker.endsWith(".AX");
  const baseTicker = isASX ? yahooTicker.replace(".AX", "") : yahooTicker;

  try {
    const [chartData, summaryData] = await Promise.all([
      fetchYahooData(yahooTicker),
      fetchYahooSummary(yahooTicker),
    ]);

    const meta = chartData?.chart?.result?.[0]?.meta ?? {};
    const summary = summaryData?.quoteSummary?.result ?? {};
    const detail = summary?.summaryDetail ?? {};
    const financial = summary?.financialData ?? {};
    const keyStats = summary?.defaultKeyStatistics ?? {};
    const profile = summary?.assetProfile ?? {};
    const earningsData = summary?.earnings?.earningsChart?.quarterly ?? [];

    const earnings: EarningsRecord[] = earningsData.map((q: any) => ({
      date: q.date,
      epsEstimate: q.estimate?.raw ?? null,
      epsActual: q.actual?.raw ?? null,
      surprise: q.actual?.raw != null && q.estimate?.raw != null
        ? q.actual.raw - q.estimate.raw
        : null,
      surprisePercent: q.actual?.raw != null && q.estimate?.raw != null && q.estimate.raw !== 0
        ? ((q.actual.raw - q.estimate.raw) / Math.abs(q.estimate.raw)) * 100
        : null,
      reportType: "H1",  // ASX companies report half-yearly
    }));

    const stock: ASXStockData = {
      ticker: baseTicker,
      name: meta.longName ?? meta.shortName ?? baseTicker,
      exchange: isASX ? "ASX" : "NYSE",
      currency: isASX ? "AUD" : (meta.currency ?? "USD"),
      price: meta.regularMarketPrice ?? 0,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      marketCap: keyStats?.marketCap?.raw ?? null,
      peRatio: detail?.trailingPE?.raw ?? null,
      eps: keyStats?.trailingEps?.raw ?? null,
      dividendYield: detail?.dividendYield?.raw ? detail.dividendYield.raw * 100 : null,
      frankingPercent: isASX ? 100 : null, // Default ASX assumption; real data requires broker API
      revenue: financial?.totalRevenue?.raw ?? null,
      netIncome: financial?.netIncomeToCommon?.raw ?? null,
      debtToEquity: financial?.debtToEquity?.raw ?? null,
      roe: financial?.returnOnEquity?.raw ? financial.returnOnEquity.raw * 100 : null,
      week52High: meta.fiftyTwoWeekHigh ?? 0,
      week52Low: meta.fiftyTwoWeekLow ?? 0,
      sector: profile?.sector ?? "Unknown",
      industry: profile?.industry ?? "Unknown",
      asx200Member: ASX200_MEMBERS.has(baseTicker),
      description: profile?.longBusinessSummary ?? "",
    };

    return NextResponse.json({ stock, earnings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
