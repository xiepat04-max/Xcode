import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { runDCF, ASX_EXAMPLES, type DCFInputs, type DCFOutputs } from "./lib/dcf";

const DEFAULT_INPUTS: DCFInputs = {
  companyName: "My ASX Company",
  ticker: "ASX",
  sharesOutstanding: 1000,
  currentFCF: 5000,
  revenue: 20000,
  ebitda: 7000,
  capex: 1500,
  workingCapitalChange: 200,
  growthRate1to5: 8,
  growthRate6to10: 5,
  terminalGrowthRate: 2.5,
  wacc: 9.5,
  corporateTaxRate: 30,
  frankingCreditRate: 100,
  dividendPayoutRatio: 65,
  currency: "AUD",
  usdAudRate: 1.55,
};

type InputField = keyof DCFInputs;

export default function App() {
  const [inputs, setInputs] = useState<DCFInputs>(DEFAULT_INPUTS);
  const [result, setResult] = useState<DCFOutputs | null>(null);

  function setField(field: InputField, value: string | number) {
    setInputs(prev => ({ ...prev, [field]: value }));
  }

  function calculate() {
    try { setResult(runDCF(inputs)); }
    catch (e) { alert(`Calculation error: ${(e as Error).message}`); }
  }

  function loadExample(key: string) {
    const ex = ASX_EXAMPLES[key];
    setInputs(prev => ({ ...prev, ...ex }));
    setResult(null);
  }

  const chartData = result
    ? result.years.map((y, i) => ({
        year: `Year ${y}`,
        fcf: Math.round(result.fcfProjections[i]),
        pv: Math.round(result.pvFCF[i]),
      }))
    : [];

  const r = result;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">🏦 DCF Valuation Calculator</h1>
        <p className="text-gray-400 text-sm mb-2">
          Australian edition · AUD · Franking credits · 30% corporate tax rate · ASX benchmark
        </p>

        {/* Load example */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-xs text-gray-500 self-center">Load example:</span>
          {Object.keys(ASX_EXAMPLES).map(k => (
            <button key={k} onClick={() => loadExample(k)}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 rounded-full transition-colors">
              {k}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-4">Company & Financials (A$ millions)</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Company Name", "companyName", "text"],
                  ["Ticker", "ticker", "text"],
                  ["Shares Outstanding (M)", "sharesOutstanding", "number"],
                  ["Current FCF (A$M)", "currentFCF", "number"],
                  ["Revenue (A$M)", "revenue", "number"],
                  ["EBITDA (A$M)", "ebitda", "number"],
                  ["CapEx (A$M)", "capex", "number"],
                  ["Working Capital Δ (A$M)", "workingCapitalChange", "number"],
                ] as [string, InputField, string][]).map(([label, field, type]) => (
                  <div key={field} className="col-span-1">
                    <label className="text-xs text-gray-400 block mb-1">{label}</label>
                    <input type={type}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={String(inputs[field])}
                      onChange={e => setField(field, type === "number" ? Number(e.target.value) : e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-4">Growth & Discount Assumptions (%)</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Growth Yr 1–5 (%)", "growthRate1to5"],
                  ["Growth Yr 6–10 (%)", "growthRate6to10"],
                  ["Terminal Growth (%)", "terminalGrowthRate"],
                  ["WACC (%)", "wacc"],
                ] as [string, InputField][]).map(([label, field]) => (
                  <div key={field}>
                    <label className="text-xs text-gray-400 block mb-1">{label}</label>
                    <input type="number" step="0.5"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={Number(inputs[field])}
                      onChange={e => setField(field, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-4">Australian-Specific Settings</h2>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Corporate Tax Rate (%)", "corporateTaxRate"],
                  ["Franking Credit Rate (%)", "frankingCreditRate"],
                  ["Dividend Payout Ratio (%)", "dividendPayoutRatio"],
                  ["AUD/USD Rate", "usdAudRate"],
                ] as [string, InputField][]).map(([label, field]) => (
                  <div key={field}>
                    <label className="text-xs text-gray-400 block mb-1">{label}</label>
                    <input type="number" step="0.5"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={Number(inputs[field])}
                      onChange={e => setField(field, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ASX companies typically pay 100% franked dividends, passing the 30% corporate tax credit to Australian tax residents.
              </p>
            </div>

            <button onClick={calculate}
              className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold transition-colors">
              Calculate Intrinsic Value
            </button>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {r ? (
              <>
                {/* Valuation summary */}
                <div className="bg-gradient-to-br from-blue-950 to-gray-900 border border-blue-800/50 rounded-xl p-6">
                  <h2 className="font-semibold text-blue-300 mb-4">Valuation Result</h2>
                  <div className="text-center mb-4">
                    <p className="text-5xl font-bold text-white">A${r.intrinsicValuePerShare.toFixed(2)}</p>
                    <p className="text-gray-400 text-sm mt-1">Intrinsic Value per Share</p>
                    {r.valueInUSD && (
                      <p className="text-gray-500 text-xs mt-1">≈ US${r.valueInUSD.toFixed(2)} at A$1 = US${(1 / inputs.usdAudRate).toFixed(3)}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Enterprise Value", value: `A$${(r.enterpriseValue / 1000).toFixed(1)}B` },
                      { label: "PV of FCF (10yr)", value: `A$${(r.pvFCFTotal / 1000).toFixed(1)}B` },
                      { label: "Terminal Value (PV)", value: `A$${(r.pvTerminalValue / 1000).toFixed(1)}B` },
                      { label: "TV as % of EV", value: `${((r.pvTerminalValue / r.enterpriseValue) * 100).toFixed(1)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="font-semibold mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Australian franking */}
                <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-4">
                  <h3 className="font-medium text-green-400 mb-2">🦘 Franking Credit Bonus</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Franking Credit / Share</p>
                      <p className="font-semibold">A${r.frankingCreditValue.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Grossed-Up Dividend Yield</p>
                      <p className="font-semibold text-green-400">{r.grossedUpDividendYield.toFixed(2)}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Franking credits allow Australian tax residents to offset tax already paid at the corporate level ({inputs.corporateTaxRate}%).
                  </p>
                </div>

                {/* FCF chart */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="font-semibold mb-4">FCF Projections vs Present Value</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}B`} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <Tooltip formatter={(v: number) => `A$${(v / 1000).toFixed(2)}B`} />
                      <Bar dataKey="fcf" fill="#60a5fa" name="FCF (nominal)" radius={[2,2,0,0]} />
                      <Bar dataKey="pv" fill="#34d399" name="PV of FCF" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Sensitivity table */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="font-semibold mb-3">Sensitivity: WACC vs Terminal Growth</h3>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left pb-2">WACC</th>
                          <th className="text-right pb-2">TG 1.5%</th>
                          <th className="text-right pb-2">TG 2.5%</th>
                          <th className="text-right pb-2">TG 3.5%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...new Set(r.sensitivityTable.map(r => r.wacc))].map(w => (
                          <tr key={w} className="border-t border-gray-800">
                            <td className="py-1.5 text-gray-400">{w}%</td>
                            {[1.5, 2.5, 3.5].map(tg => {
                              const row = r.sensitivityTable.find(r => r.wacc === w && r.terminalGrowth === tg);
                              const val = row?.intrinsicValue ?? "N/A";
                              const isBase = w === inputs.wacc && tg === inputs.terminalGrowthRate;
                              return (
                                <td key={tg} className={`py-1.5 text-right font-mono ${isBase ? "text-blue-400 font-bold" : "text-gray-300"}`}>
                                  {typeof val === "number" ? `A$${val.toFixed(2)}` : val}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
                <p className="text-4xl mb-4">📊</p>
                <p>Fill in the inputs and click Calculate to see the valuation.</p>
                <p className="text-xs mt-2">Try loading a preset: CBA, BHP, or CSL above.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
