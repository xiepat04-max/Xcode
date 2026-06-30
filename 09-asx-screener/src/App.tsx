import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? "",
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
);

interface Stock {
  ticker: string; name: string; sector: string;
  market_cap: number; price: number; pe_ratio: number; pb_ratio: number;
  roe: number; roic: number; fcf_yield: number; fcf_growth_3y: number;
  div_yield: number; franking_pct: number; debt_equity: number;
  insider_pct: number; short_interest: number; asx200: boolean;
}

interface Filters {
  minROIC: number; maxPE: number; minFCFYield: number;
  minDivYield: number; sector: string; asx200Only: boolean;
  maxDebtEquity: number; minInsiderPct: number;
}

const DEFAULT_FILTERS: Filters = {
  minROIC: 10, maxPE: 30, minFCFYield: 3,
  minDivYield: 0, sector: "All", asx200Only: true,
  maxDebtEquity: 200, minInsiderPct: 0,
};

const SECTORS = ["All","Financials","Materials","Healthcare","Consumer Staples",
  "Consumer Discretionary","Communication","Real Estate","Energy","Industrials","Technology"];

// Preset hedge fund screens
const PRESETS = {
  "Quality Growth": { minROIC: 15, maxPE: 40, minFCFYield: 3, minDivYield: 0, sector: "All", asx200Only: true, maxDebtEquity: 100, minInsiderPct: 0 },
  "Deep Value": { minROIC: 5, maxPE: 12, minFCFYield: 7, minDivYield: 4, sector: "All", asx200Only: false, maxDebtEquity: 150, minInsiderPct: 0 },
  "Dividend + Franking": { minROIC: 8, maxPE: 25, minFCFYield: 4, minDivYield: 5, sector: "All", asx200Only: true, maxDebtEquity: 200, minInsiderPct: 0 },
  "Insider Conviction": { minROIC: 8, maxPE: 35, minFCFYield: 3, minDivYield: 0, sector: "All", asx200Only: false, maxDebtEquity: 150, minInsiderPct: 5 },
};

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<keyof Stock>("roic");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [supabaseReady, setSupabaseReady] = useState(!!import.meta.env.VITE_SUPABASE_URL);

  useEffect(() => { screen(); }, []);

  async function screen() {
    setLoading(true);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        setStocks(DEMO_STOCKS);
        return;
      }

      let q = supabase.from("asx_stocks").select("*");
      if (filters.sector !== "All") q = q.eq("sector", filters.sector);
      if (filters.asx200Only) q = q.eq("asx200", true);
      if (filters.minROIC > 0) q = q.gte("roic", filters.minROIC);
      if (filters.maxPE < 100) q = q.lte("pe_ratio", filters.maxPE);
      if (filters.minFCFYield > 0) q = q.gte("fcf_yield", filters.minFCFYield);
      if (filters.minDivYield > 0) q = q.gte("div_yield", filters.minDivYield);
      if (filters.maxDebtEquity < 500) q = q.lte("debt_equity", filters.maxDebtEquity);
      if (filters.minInsiderPct > 0) q = q.gte("insider_pct", filters.minInsiderPct);

      q = q.order(sortBy as string, { ascending: sortDir === "asc" }).limit(50);
      const { data, error } = await q;
      if (error) throw error;
      setStocks(data ?? []);
    } finally { setLoading(false); }
  }

  function setFilter<K extends keyof Filters>(k: K, v: Filters[K]) {
    setFilters(prev => ({ ...prev, [k]: v }));
  }

  function sort(col: keyof Stock) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">🦘 ASX Hedge Fund Screener</h1>
        <p className="text-gray-400 text-sm mb-6">
          Screen ASX stocks using hedge fund metrics: ROIC, FCF yield, insider ownership, valuation · Franking credits included
        </p>

        {!supabaseReady && (
          <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3 mb-4 text-yellow-300 text-xs">
            Demo mode — showing sample data. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then run the schema.sql in your Supabase project.
          </div>
        )}

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-gray-500 self-center">Preset screens:</span>
          {Object.entries(PRESETS).map(([name, preset]) => (
            <button key={name} onClick={() => { setFilters(preset); }}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-full transition-colors">
              {name}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              ["Min ROIC (%)", "minROIC"],
              ["Max P/E", "maxPE"],
              ["Min FCF Yield (%)", "minFCFYield"],
              ["Min Div Yield (%)", "minDivYield"],
              ["Max D/E", "maxDebtEquity"],
              ["Min Insider (%)", "minInsiderPct"],
            ] as [string, keyof Filters][]).map(([label, key]) => (
              <div key={key}>
                <label className="text-xs text-gray-400 block mb-1">{label}</label>
                <input type="number" step="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                  value={Number(filters[key])}
                  onChange={e => setFilter(key, Number(e.target.value) as any)}
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Sector</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                value={filters.sector} onChange={e => setFilter("sector", e.target.value)}>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.asx200Only}
                  onChange={e => setFilter("asx200Only", e.target.checked)}
                  className="w-4 h-4" />
                <span className="text-sm text-gray-300">ASX 200 only</span>
              </label>
            </div>
          </div>
          <button onClick={screen} disabled={loading}
            className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-8 py-2.5 rounded-lg font-semibold text-sm transition-colors">
            {loading ? "Screening..." : `Screen ASX Stocks`}
          </button>
        </div>

        {/* Results */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-semibold">{stocks.length} stocks match</h2>
            <span className="text-xs text-gray-500">Click column headers to sort</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-800/50 text-gray-400">
                <tr>
                  {([
                    ["Ticker", "ticker"], ["Company", "name"], ["Sector", "sector"],
                    ["Price", "price"], ["Mkt Cap", "market_cap"], ["P/E", "pe_ratio"],
                    ["ROIC %", "roic"], ["FCF Yield", "fcf_yield"], ["Div Yield", "div_yield"],
                    ["Franking", "franking_pct"], ["Insider %", "insider_pct"], ["D/E", "debt_equity"],
                  ] as [string, keyof Stock][]).map(([label, col]) => (
                    <th key={col} className="px-3 py-3 text-left font-medium cursor-pointer hover:text-white"
                      onClick={() => sort(col)}>
                      {label} {sortBy === col ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stocks.map(s => (
                  <tr key={s.ticker} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="px-3 py-3 font-bold text-blue-400">{s.ticker}</td>
                    <td className="px-3 py-3 text-gray-300 max-w-[150px] truncate">{s.name}</td>
                    <td className="px-3 py-3 text-gray-400">{s.sector}</td>
                    <td className="px-3 py-3">A${s.price?.toFixed(2) ?? "–"}</td>
                    <td className="px-3 py-3">A${s.market_cap ? `${(s.market_cap / 1e9).toFixed(1)}B` : "–"}</td>
                    <td className="px-3 py-3">{s.pe_ratio?.toFixed(1) ?? "–"}x</td>
                    <td className={`px-3 py-3 font-semibold ${(s.roic ?? 0) >= 15 ? "text-green-400" : "text-gray-300"}`}>
                      {s.roic?.toFixed(1) ?? "–"}%
                    </td>
                    <td className="px-3 py-3 text-yellow-400">{s.fcf_yield?.toFixed(1) ?? "–"}%</td>
                    <td className="px-3 py-3 text-green-400">{s.div_yield?.toFixed(1) ?? "–"}%</td>
                    <td className="px-3 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${(s.franking_pct ?? 0) === 100 ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                        {s.franking_pct ?? 0}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-purple-400">{s.insider_pct?.toFixed(1) ?? "–"}%</td>
                    <td className="px-3 py-3">{s.debt_equity?.toFixed(0) ?? "–"}</td>
                  </tr>
                ))}
                {stocks.length === 0 && !loading && (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      No stocks match your filters. Try relaxing the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-gray-600 text-center mt-4">Data: Supabase · Seed with schema.sql · ROIC = key hedge fund quality metric · Not financial advice</p>
      </div>
    </div>
  );
}

// Demo data if no Supabase configured
const DEMO_STOCKS: Stock[] = [
  { ticker:"CBA", name:"Commonwealth Bank", sector:"Financials", market_cap:190e9, price:130.50, pe_ratio:22.1, pb_ratio:2.8, roe:14.2, roic:12.1, fcf_yield:4.8, fcf_growth_3y:8.2, div_yield:4.2, franking_pct:100, debt_equity:0, insider_pct:0.1, short_interest:0.8, asx200:true },
  { ticker:"BHP", name:"BHP Group", sector:"Materials", market_cap:220e9, price:43.80, pe_ratio:12.5, pb_ratio:2.1, roe:25.1, roic:22.3, fcf_yield:8.5, fcf_growth_3y:5.1, div_yield:5.8, franking_pct:100, debt_equity:45.2, insider_pct:0.3, short_interest:2.1, asx200:true },
  { ticker:"CSL", name:"CSL Limited", sector:"Healthcare", market_cap:135e9, price:284.00, pe_ratio:35.2, pb_ratio:8.5, roe:24.3, roic:18.9, fcf_yield:3.2, fcf_growth_3y:14.5, div_yield:1.2, franking_pct:30, debt_equity:120.5, insider_pct:0.8, short_interest:1.5, asx200:true },
  { ticker:"FMG", name:"Fortescue Ltd", sector:"Materials", market_cap:55e9, price:17.80, pe_ratio:8.5, pb_ratio:2.2, roe:28.5, roic:25.1, fcf_yield:12.5, fcf_growth_3y:8.5, div_yield:8.2, franking_pct:100, debt_equity:38.5, insider_pct:2.5, short_interest:4.2, asx200:true },
  { ticker:"WES", name:"Wesfarmers", sector:"Consumer Discretionary", market_cap:72e9, price:64.80, pe_ratio:28.5, pb_ratio:7.2, roe:28.5, roic:22.1, fcf_yield:4.2, fcf_growth_3y:6.8, div_yield:3.8, franking_pct:100, debt_equity:55.2, insider_pct:1.2, short_interest:0.8, asx200:true },
];
