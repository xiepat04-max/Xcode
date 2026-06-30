import { NextRequest, NextResponse } from "next/server";
import { fetchInsiderAnnouncements, fetchMarketWideInsiders, ASX_WATCHLIST } from "@/lib/asx-announcements";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const mode = req.nextUrl.searchParams.get("mode") ?? "single";

  try {
    if (mode === "market" || !ticker) {
      // Return market-wide insider activity for the ASX watchlist
      const tickers = ticker
        ? ticker.split(",").map(t => t.trim().toUpperCase())
        : ASX_WATCHLIST.slice(0, 10);

      const trades = await fetchMarketWideInsiders(tickers);

      return NextResponse.json({
        source: "ASX Announcement Feed",
        note: "Director & substantial holder notices (3Y/3X forms). Share counts require PDF parsing.",
        regulation: "Corporations Act 2001 s205G requires directors to notify within 2 business days.",
        trades,
        total: trades.length,
      });
    }

    const trades = await fetchInsiderAnnouncements(ticker);

    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      source: "ASX Announcement Feed",
      regulation: "Corporations Act 2001 s205G — director notice within 2 business days.",
      trades,
      total: trades.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
