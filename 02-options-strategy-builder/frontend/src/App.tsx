import { useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8002";

const STRATEGY_LABELS: Record<string, string> = {
  long_call: "Long Call",
  long_put: "Long Put",
  covered_call: "Covered Call",
  protective_put: "Protective Put",
  bull_call_spread: "Bull Call Spread",
  bear_put_spread: "Bear Put Spread",
  long_straddle: "Long Straddle",
  iron_condor: "Iron Condor",
};

const POPULAR_ASX = ["CBA", "BHP", "ANZ", "NAB", "WBC", "CSL", "FMG", "WES", "RIO", "TLS"];

export default function App() {
  const [ticker, setTicker] = useState("CBA");
  const [outlook, setOutlook] = useState("bullish");
  const [risk, setRisk] = useState("medium");
  const [expiry, setExpiry] = useState(30);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function build() {
    setLoading(true); setError(""); setResult(null);
    try {
      const { data } = await axios.post(`${API}/recommend`, {
        ticker, outlook, risk_tolerance: risk, expiry_days: expiry,
      });
      setResult(data);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message);
    } finally { setLoading(false); }
  }

  const chartData = result
    ? result.payoff_x.map((x: number, i: number) => {
        const row: any = { price: x };
        Object.keys(result.payoffs).forEach(k => { row[k] = result.payoffs[k][i]; });
        return row;
      })
    : [];

  const currency = result?.currency === "AUD" ? "A$" : "$";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">🦘 Options Strategy Builder</h1>
        <p className="text-gray-400 text-sm mb-8">ASX equity options + international · Black-Scholes pricing · RBA risk-free rate</p>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">ASX or US Ticker</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {POPULAR_ASX.map(t => (
                  <button key={t} onClick={() => setTicker(t)}
                    className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-2 py-0.5 rounded transition-colors">
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Market Outlook</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                  value={outlook} onChange={e => setOutlook(e.target.value)}>
                  <option value="bullish">Bullish</option>
                  <option value="bearish">Bearish</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Risk Tolerance</label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    value={risk} onChange={e => setRisk(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Days to Expiry</label>
                  <input type="number" min={7} max={365}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    value={expiry} onChange={e => setExpiry(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <button onClick={build} disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 rounded-lg font-semibold transition-colors">
            {loading ? "Calculating..." : "Build Strategy"}
          </button>
        </div>

        {error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 mb-6">{error}</div>}

        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Spot Price", value: `${currency}${result.spot.toFixed(2)}` },
                { label: "30-day HV", value: `${result.hv_30_day_pct}%` },
                { label: "IV Rank", value: `${result.iv_rank_proxy.toFixed(0)}/100` },
                { label: "Expiry", value: result.expiry_date },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-xl font-bold mt-1">{value}</p>
                </div>
              ))}
            </div>

            {/* Recommended strategies */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Recommended Strategies</h2>
              <div className="flex flex-wrap gap-3">
                {result.recommended_strategies.map((s: string) => (
                  <div key={s} className="bg-blue-900/40 border border-blue-800 rounded-lg px-4 py-2 text-sm font-medium">
                    {STRATEGY_LABELS[s] ?? s}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">ATM Call Price</p>
                  <p className="font-semibold">{currency}{result.call_price.toFixed(3)}</p>
                  <p className="text-xs text-gray-500 mt-1">Δ {result.call_greeks.delta} | Θ {result.call_greeks.theta}/day</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">ATM Put Price</p>
                  <p className="font-semibold">{currency}{result.put_price.toFixed(3)}</p>
                  <p className="text-xs text-gray-500 mt-1">Δ {result.put_greeks.delta} | Θ {result.put_greeks.theta}/day</p>
                </div>
              </div>
            </div>

            {/* Payoff chart */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4">Payoff at Expiry</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="price" tickFormatter={v => `${currency}${v.toFixed(0)}`} stroke="#6b7280" />
                  <YAxis tickFormatter={v => `${currency}${v.toFixed(2)}`} stroke="#6b7280" />
                  <Tooltip formatter={(v: number) => `${currency}${v.toFixed(3)}`} labelFormatter={v => `Spot: ${currency}${Number(v).toFixed(2)}`} />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                  <ReferenceLine x={result.spot} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: "Current", fill: "#fbbf24", fontSize: 11 }} />
                  <Legend />
                  {Object.keys(result.payoffs).map((k, i) => (
                    <Line key={k} type="monotone" dataKey={k} name={STRATEGY_LABELS[k] ?? k}
                      stroke={["#60a5fa", "#34d399", "#f87171", "#a78bfa"][i % 4]}
                      dot={false} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {result.asx_market_note && (
              <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-4 text-yellow-200 text-sm">
                <span className="font-semibold">ASX Options Note: </span>{result.asx_market_note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
