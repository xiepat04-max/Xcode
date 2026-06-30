"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

interface Trade {
  ticker: string;
  companyName: string;
  personName: string;
  personRole: string;
  tradeType: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  noticeDate: string;
  noticeType: string;
  noticeUrl: string;
}

const QUICK_TICKERS = ["CBA", "BHP", "ANZ", "NAB", "WBC", "CSL", "FMG", "WES", "RIO", "TLS", "MQG", "WOW"];

export default function InsiderTracker() {
  const [ticker, setTicker] = useState("");
  const [mode, setMode] = useState<"single" | "market">("market");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchTrades(); }, []);

  async function fetchTrades(t?: string) {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (t ?? ticker) params.set("ticker", t ?? ticker);
      params.set("mode", t ?? ticker ? "single" : "market");

      const res = await fetch(`/api/insider-trades?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTrades(json.trades ?? []);
      setMeta(json);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span>🔍</span> ASX Insider Trading Tracker
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Director & substantial holder notices (Forms 3Y/3X) from the ASX announcement feed ·
            Required under Corporations Act 2001 s205G
          </p>
        </div>

        {/* Search */}
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 mb-6">
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
              placeholder="ASX ticker (leave blank for market-wide)"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && fetchTrades()}
            />
            <button onClick={() => fetchTrades()}
              className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg font-medium transition-colors">
              {loading ? "..." : "Search"}
            </button>
            <button onClick={() => { setTicker(""); fetchTrades(""); }}
              className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-lg font-medium transition-colors">
              Market Wide
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TICKERS.map(t => (
              <button key={t} onClick={() => { setTicker(t); fetchTrades(t); }}
                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 rounded-full transition-colors">
                {t}
              </button>
            ))}
          </div>
        </div>

        {meta?.regulation && (
          <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-3 mb-4 text-blue-300 text-xs">
            <span className="font-semibold">Australian Regulation: </span>{meta.regulation}
          </div>
        )}

        {error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 mb-4">{error}</div>}

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm mt-3">Fetching ASX announcements...</p>
          </div>
        ) : trades.length > 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold">{trades.length} Insider Notices Found</h2>
              <span className="text-xs text-gray-500">Source: ASX Announcements Feed</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr className="text-left text-gray-400">
                    {["Ticker", "Company", "Person", "Role", "Type", "Notice", "Date", "Link"].map(h => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-blue-400">{t.ticker}</td>
                      <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{t.companyName}</td>
                      <td className="px-4 py-3 text-gray-300">{t.personName}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">
                          {t.personRole}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          t.tradeType === "buy" || t.tradeType === "acquisition"
                            ? "bg-green-900/50 text-green-400"
                            : "bg-red-900/50 text-red-400"
                        }`}>
                          {t.tradeType === "buy" ? "BUY" : t.tradeType === "sell" ? "SELL" : t.tradeType.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-yellow-400">{t.noticeType}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {t.noticeDate ? format(parseISO(t.noticeDate), "d MMM yy") : "–"}
                      </td>
                      <td className="px-4 py-3">
                        {t.noticeUrl && (
                          <a href={t.noticeUrl} target="_blank" rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs">ASX →</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : !loading && (
          <div className="text-center py-16 text-gray-500">
            No insider notices found. Try searching for a specific ticker or selecting market-wide view.
          </div>
        )}

        <p className="text-xs text-gray-600 text-center mt-6">
          Data from ASX Announcements Feed · Not financial advice · For share count details, view the linked ASX notice PDF
        </p>
      </div>
    </main>
  );
}
