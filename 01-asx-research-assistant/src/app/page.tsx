"use client";

import { useState } from "react";
import type { ResearchReport } from "@/lib/types";

const POPULAR_ASX = ["CBA", "BHP", "CSL", "NAB", "WBC", "ANZ", "WES", "FMG", "RIO", "TLS"];
const POPULAR_INTL = ["AAPL", "NVDA", "MSFT", "TSLA", "GOOGL"];

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");

  async function research(t?: string) {
    const target = (t ?? ticker).trim().toUpperCase();
    if (!target) return;
    setLoading(true);
    setError("");
    setReport(null);

    try {
      setStep("Fetching market data from ASX / Yahoo Finance...");
      const dataRes = await fetch(`/api/stock-data?ticker=${target}`);
      const dataJson = await dataRes.json();
      if (!dataRes.ok) throw new Error(dataJson.error);

      setStep("Generating AI research note (bull & bear case)...");
      const reportRes = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataJson),
      });
      const reportJson = await reportRes.json();
      if (!reportRes.ok) throw new Error(reportJson.error);

      setReport(reportJson);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
      setStep("");
    }
  }

  const s = report?.stock;
  const isPositive = (s?.changePercent ?? 0) >= 0;
  const currency = s?.currency === "AUD" ? "A$" : "$";

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🦘</span>
            <h1 className="text-3xl font-bold tracking-tight">ASX Research Assistant</h1>
          </div>
          <p className="text-gray-400 text-sm">
            AI-powered equity research for Australian & international stocks · Data via Yahoo Finance · Analysis by GPT-4o
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-blue-500 placeholder-gray-500"
            placeholder="ASX ticker (e.g. CBA, BHP) or US ticker (AAPL)"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && research()}
          />
          <button
            onClick={() => research()}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            {loading ? "..." : "Research"}
          </button>
        </div>

        {/* Quick picks */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-xs text-gray-500 self-center">ASX:</span>
          {POPULAR_ASX.map(t => (
            <button key={t} onClick={() => { setTicker(t); research(t); }}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 rounded-full transition-colors">
              {t}
            </button>
          ))}
          <span className="text-xs text-gray-500 self-center ml-2">Global:</span>
          {POPULAR_INTL.map(t => (
            <button key={t} onClick={() => { setTicker(t); research(t); }}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-indigo-800 px-3 py-1 rounded-full transition-colors">
              {t}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400 text-sm">{step}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Report */}
        {report && s && (
          <div className="space-y-6">
            {/* Price card */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{s.ticker}</h2>
                    {s.asx200Member && (
                      <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">ASX 200</span>
                    )}
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{s.exchange}</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{s.name}</p>
                  <p className="text-gray-500 text-xs">{s.sector} · {s.industry}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{currency}{s.price.toFixed(2)}</p>
                  <p className={`text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                    {isPositive ? "+" : ""}{s.changePercent.toFixed(2)}% today
                  </p>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Market Cap", value: s.marketCap ? `${currency}${(s.marketCap / 1e9).toFixed(2)}B` : "N/A" },
                  { label: "P/E Ratio", value: s.peRatio?.toFixed(1) ?? "N/A" },
                  { label: "Div Yield", value: s.dividendYield ? `${s.dividendYield.toFixed(2)}%${s.frankingPercent != null ? ` (${s.frankingPercent}% franked)` : ""}` : "N/A" },
                  { label: "ROE", value: s.roe ? `${s.roe.toFixed(1)}%` : "N/A" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-semibold mt-0.5 text-sm">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <span>📋</span> Executive Summary
              </h3>
              <p className="text-gray-300 leading-relaxed">{report.summary}</p>
              <p className="mt-3 text-sm font-medium text-yellow-400">
                Analyst Consensus: {report.analystConsensus}
              </p>
            </div>

            {/* Bull / Bear */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-green-950/40 rounded-xl p-6 border border-green-900/50">
                <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <span>🐂</span> Bull Case
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">{report.bullCase}</p>
                <ul className="mt-4 space-y-1">
                  {report.keyOpportunities.map((o, i) => (
                    <li key={i} className="text-green-400 text-xs flex gap-2">
                      <span>+</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-950/40 rounded-xl p-6 border border-red-900/50">
                <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <span>🐻</span> Bear Case
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">{report.bearCase}</p>
                <ul className="mt-4 space-y-1">
                  {report.keyRisks.map((r, i) => (
                    <li key={i} className="text-red-400 text-xs flex gap-2">
                      <span>–</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Earnings history */}
            {report.earnings.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="font-semibold text-gray-300 mb-4">📊 Earnings History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="text-left pb-2">Period</th>
                        <th className="text-right pb-2">EPS Estimate</th>
                        <th className="text-right pb-2">EPS Actual</th>
                        <th className="text-right pb-2">Surprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.earnings.slice(-6).reverse().map((e, i) => (
                        <tr key={i} className="border-b border-gray-800/50">
                          <td className="py-2 text-gray-400">{e.date}</td>
                          <td className="py-2 text-right">{e.epsEstimate?.toFixed(3) ?? "–"}</td>
                          <td className="py-2 text-right">{e.epsActual?.toFixed(3) ?? "–"}</td>
                          <td className={`py-2 text-right ${(e.surprisePercent ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {e.surprisePercent != null ? `${e.surprisePercent >= 0 ? "+" : ""}${e.surprisePercent.toFixed(1)}%` : "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-600 text-center">
              Generated {new Date(report.generatedAt).toLocaleString("en-AU")} · Not financial advice
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
