import { useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8005";
const COLORS = ["#60a5fa","#34d399","#f87171","#a78bfa","#fbbf24","#f97316","#ec4899","#14b8a6"];

const DEFAULT_PORTFOLIO = [
  { ticker: "CBA", value: 10000 },
  { ticker: "BHP", value: 8000 },
  { ticker: "CSL", value: 6000 },
  { ticker: "VGS", value: 5000 },
  { ticker: "NDQ", value: 3000 },
];

export default function App() {
  const [holdings, setHoldings] = useState(DEFAULT_PORTFOLIO.map(h => ({ ...h })));
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("2y");

  function addHolding() {
    setHoldings([...holdings, { ticker: "", value: 0 }]);
  }

  function updateHolding(i: number, field: string, val: string) {
    const updated = [...holdings];
    updated[i] = { ...updated[i], [field]: field === "value" ? Number(val) : val.toUpperCase() };
    setHoldings(updated);
  }

  function removeHolding(i: number) {
    setHoldings(holdings.filter((_, idx) => idx !== i));
  }

  async function analyse() {
    setLoading(true); setError(""); setResult(null);
    try {
      const { data } = await axios.post(`${API}/analyse`, {
        holdings: holdings.filter(h => h.ticker),
        period,
      });
      setResult(data);
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message);
    } finally { setLoading(false); }
  }

  const volData = result
    ? Object.entries(result.rolling_volatility).slice(-252).map(([date, vol]) => ({ date, vol }))
    : [];

  const pieData = result?.stocks?.map((s: any) => ({
    name: s.ticker, value: s.weight * 100,
  })) ?? [];

  const p = result?.portfolio;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">📊 Portfolio Risk Dashboard</h1>
        <p className="text-gray-400 text-sm mb-8">
          ASX + international · Sharpe ratio, beta vs ASX 200, VaR, drawdown · Benchmark: ^AXJO
        </p>

        {/* Holdings input */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <h2 className="font-semibold mb-4">Your Holdings (AUD)</h2>
          <div className="space-y-2 mb-4">
            {holdings.map((h, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ticker"
                  value={h.ticker}
                  onChange={e => updateHolding(i, "ticker", e.target.value)}
                />
                <span className="text-gray-500 text-sm">A$</span>
                <input type="number"
                  className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Value"
                  value={h.value}
                  onChange={e => updateHolding(i, "value", e.target.value)}
                />
                <button onClick={() => removeHolding(i)} className="text-gray-500 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={addHolding}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
              + Add Holding
            </button>
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              value={period} onChange={e => setPeriod(e.target.value)}>
              {["1y","2y","3y","5y"].map(p => <option key={p} value={p}>{p} history</option>)}
            </select>
            <button onClick={analyse} disabled={loading}
              className="ml-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2 rounded-lg font-semibold transition-colors">
              {loading ? "Analysing..." : "Analyse Risk"}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 mb-4">{error}</div>}

        {result && (
          <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Annual Return", value: `${p.annual_return_pct >= 0 ? "+" : ""}${p.annual_return_pct}%`, color: p.annual_return_pct >= 0 ? "text-green-400" : "text-red-400" },
                { label: "Annual Volatility", value: `${p.annual_volatility_pct}%`, color: "text-yellow-400" },
                { label: "Sharpe Ratio", value: p.sharpe_ratio.toFixed(3), color: p.sharpe_ratio > 1 ? "text-green-400" : "text-gray-300" },
                { label: "Max Drawdown", value: `${p.max_drawdown_pct.toFixed(1)}%`, color: "text-red-400" },
                { label: "Beta vs ASX 200", value: p.beta_vs_asx200?.toFixed(3) ?? "N/A", color: "text-gray-300" },
                { label: "VaR 95% (daily)", value: `${p.var_95_daily_pct.toFixed(3)}%`, color: "text-orange-400" },
                { label: "CVaR 95% (daily)", value: `${p.cvar_95_daily_pct.toFixed(3)}%`, color: "text-red-400" },
                { label: "RBA Cash Rate", value: `${(p.rba_cash_rate * 100).toFixed(2)}%`, color: "text-blue-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Diversification */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="font-semibold mb-4">Allocation</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      outerRadius={80} label={({ name, value }) => `${name} ${value.toFixed(1)}%`} labelLine={false}>
                      {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-between text-sm mt-2 text-gray-400">
                  <span>🇦🇺 ASX: <strong className="text-white">{result.diversification.asx_weight_pct}%</strong></span>
                  <span>🌍 International: <strong className="text-white">{result.diversification.international_weight_pct}%</strong></span>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="font-semibold mb-4">30-Day Rolling Volatility</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={volData.slice(-120)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" tick={false} />
                    <YAxis tickFormatter={v => `${v}%`} stroke="#6b7280" width={40} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                    <Line type="monotone" dataKey="vol" stroke="#60a5fa" dot={false} strokeWidth={2} name="Vol %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Per-stock table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-semibold">Holdings Analysis</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 text-gray-400">
                  <tr>
                    {["Ticker","Weight","Annual Return","Annual Vol","Beta vs ASX 200","Market"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.stocks.map((s: any) => (
                    <tr key={s.ticker} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-bold text-blue-400">{s.ticker}</td>
                      <td className="px-4 py-3">{(s.weight * 100).toFixed(1)}%</td>
                      <td className={`px-4 py-3 ${s.annual_return_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {s.annual_return_pct >= 0 ? "+" : ""}{s.annual_return_pct}%
                      </td>
                      <td className="px-4 py-3 text-yellow-400">{s.annual_vol_pct}%</td>
                      <td className="px-4 py-3">{s.beta_vs_asx200?.toFixed(3) ?? "N/A"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_asx ? "bg-green-900/50 text-green-400" : "bg-blue-900/50 text-blue-400"}`}>
                          {s.is_asx ? "ASX" : "Intl"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.diversification.note && (
              <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-3 text-blue-300 text-sm">
                💡 {result.diversification.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
